variable "prefix" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "appgw_subnet_id" {
  type = string
}

variable "appgw_public_ip_id" {
  type = string
}

# ID TLS-сертификата в Azure Key Vault
variable "key_vault_cert_secret_id" {
  type        = string
  description = "Key Vault secret ID for the TLS certificate (burgergroup2-cert)"
}

# ID Managed Identity, у которого есть доступ к Key Vault
variable "appgw_identity_id" {
  type        = string
  description = "Resource ID of the User Assigned Identity for App Gateway"
}

