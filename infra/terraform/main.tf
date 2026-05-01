resource "azurerm_resource_group" "rg" {
  name     = "musa-project2-rg"
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

# Identity для App Gateway
resource "azurerm_user_assigned_identity" "appgw_identity" {
  name                = "${var.prefix}-appgw-identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

data "azurerm_client_config" "current" {}

# Key Vault
resource "azurerm_key_vault" "kv" {
  name                        = "${var.prefix}-kv-musa"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
}

# Права для самого Terraform (Service Principal)
resource "azurerm_key_vault_access_policy" "sp_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions      = ["Get", "List", "Set", "Delete", "Purge"]
  certificate_permissions = ["Get", "List", "Create", "Import", "Update", "Delete", "Purge"]
}

# Права для App Gateway
resource "azurerm_key_vault_access_policy" "appgw_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.appgw_identity.principal_id

  secret_permissions      = ["Get"]
  certificate_permissions = ["Get"]
}

resource "azurerm_key_vault_certificate" "cert" {
  name         = "burgergroup2-com-cert"
  key_vault_id = azurerm_key_vault.kv.id

  certificate_policy {
    issuer_parameters {
      name = "Self"
    }
    key_properties {
      exportable = true
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = true
    }
    secret_properties {
      content_type = "application/x-pkcs12"
    }
  }
}

module "app_gateway" {
  source              = "./modules/app_gateway"
  prefix              = var.prefix
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  appgw_subnet_id     = module.networking.appgw_subnet_id
  appgw_public_ip_id  = azurerm_public_ip.appgw_pip.id
  
  key_vault_cert_secret_id = azurerm_key_vault_certificate.cert.secret_id
  appgw_identity_id        = azurerm_user_assigned_identity.appgw_identity.id
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

  custom_data = base64encode(<<-EOF
    #!/bin/bash
    sudo apt-get update
    sudo apt-get install -y openjdk-21-jdk maven
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
}
