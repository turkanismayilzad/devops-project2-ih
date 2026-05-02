resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_public_ip" "appgw_pip" {
  name                = "${var.prefix}-appgw-pip"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

module "networking" {
  source              = "./modules/networking"
  prefix              = var.prefix
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  vnet_address_space  = var.vnet_address_space
  appgw_subnet_prefix = var.appgw_subnet_prefix
  fe_subnet_prefix    = var.fe_subnet_prefix
  be_subnet_prefix    = var.be_subnet_prefix
  pep_subnet_prefix   = var.pep_subnet_prefix
  ops_subnet_prefix   = var.ops_subnet_prefix
}

module "database" {
  source              = "./modules/database"
  prefix              = var.prefix
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  vnet_id             = module.networking.vnet_id
  pep_subnet_id       = module.networking.pep_subnet_id
  sql_admin_username  = var.sql_admin_username
  sql_admin_password  = var.sql_admin_password
  db_name             = var.db_name
}


module "app_gateway" {
  source              = "./modules/app_gateway"
  prefix              = var.prefix
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  appgw_subnet_id     = module.networking.appgw_subnet_id
  appgw_public_ip_id  = azurerm_public_ip.appgw_pip.id

  # TLS: Managed Identity для App Gateway — сделан через Azure CLI
  appgw_identity_id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.resource_group_name}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/burger-appgw-identity"

  # TLS: Secret ID сертификата в Key Vault (Let's Encrypt - действует до 30.07.2026)
  key_vault_cert_secret_id = "https://burger-keyvault-g2.vault.azure.net/secrets/burgergroup2-cert/8a4a802d17344c6e8749b41316738fd2"
}

module "vmss_fe" {
  source                 = "./modules/compute"
  prefix                 = var.prefix
  tier                   = "fe"
  location               = azurerm_resource_group.rg.location
  resource_group_name    = azurerm_resource_group.rg.name
  subnet_id              = module.networking.fe_subnet_id
  appgw_backend_pool_ids = [module.app_gateway.backend_address_pool_fe_id]
  ssh_public_key         = var.vm_ssh_public_key
  vm_size                = "Standard_D2ads_v7"

  # Minimal cloud-init to install node/npm for Vite frontend
  custom_data = base64encode(<<-EOF
    #!/bin/bash
    sudo apt-get update
    sudo apt-get install -y nodejs npm
  EOF
  )
}

module "vmss_be" {
  source                 = "./modules/compute"
  prefix                 = var.prefix
  tier                   = "be"
  location               = azurerm_resource_group.rg.location
  resource_group_name    = azurerm_resource_group.rg.name
  subnet_id              = module.networking.be_subnet_id
  appgw_backend_pool_ids = [module.app_gateway.backend_address_pool_be_id]
  ssh_public_key         = var.vm_ssh_public_key
  vm_size                = "Standard_D2ads_v7"

  # Minimal cloud-init to install Java/Maven for Backend
  custom_data = base64encode(<<-EOF
    #!/bin/bash
    sudo apt-get update
    sudo apt-get install -y openjdk-17-jdk maven
  EOF
  )
}

module "sonarqube_vm" {
  source              = "./modules/sonarqube_vm"
  prefix              = var.prefix
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  ops_subnet_id       = module.networking.ops_subnet_id
  vm_ssh_public_key   = var.vm_ssh_public_key
}

# (Application Insights и Log Analytics)
module "monitoring" {
  source              = "./modules/monitoring"
  prefix              = var.prefix
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  appgw_id            = module.app_gateway.appgw_id
  vmss_fe_id          = module.vmss_fe.vmss_id
  vmss_be_id          = module.vmss_be.vmss_id
  sql_server_id       = module.database.sql_server_id
  sql_database_id     = "${module.database.sql_server_id}/databases/${module.database.database_name}"
  alert_email         = var.alert_email
  telegram_bot_token  = var.telegram_bot_token
  telegram_chat_id    = var.telegram_chat_id
  subscription_id     = var.subscription_id
}
