prefix   = "burger"
location = "UK South"

resource_group_name = "musa-project2-rg"

vnet_address_space  = "10.0.0.0/16"
appgw_subnet_prefix = "10.0.1.0/24"
fe_subnet_prefix    = "10.0.2.0/24"
be_subnet_prefix    = "10.0.3.0/24"
pep_subnet_prefix   = "10.0.4.0/24"
ops_subnet_prefix   = "10.0.5.0/24"

db_name           = "burgerbuilder-group22"
app_service_sku   = "P1v3"
vm_admin_username = "azureuser"

# NOTE: Sensitive variables like sql_admin_username, sql_admin_password, and vm_ssh_public_key 
# should be provided via environment variables (TF_VAR_...) in GitHub Actions 
# or via a secure terraform.tfvars that is NOT committed to git.
