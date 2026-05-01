
locals {
  backend_address_pool_name_fe    = "${var.prefix}-beap-fe"
  backend_address_pool_name_be    = "${var.prefix}-beap-be"
  frontend_port_name              = "${var.prefix}-feport"
  frontend_port_name_https        = "${var.prefix}-feport-https"
  frontend_ip_configuration_name  = "${var.prefix}-feip"
  http_setting_name_fe            = "${var.prefix}-be-htst-fe"
  http_setting_name_be            = "${var.prefix}-be-htst-be"
  listener_name                   = "${var.prefix}-httplstn"
  listener_name_https             = "${var.prefix}-httpslstn"
  request_routing_rule_name       = "${var.prefix}-rqrt"
  request_routing_rule_name_https = "${var.prefix}-rqrt-https"
  url_path_map_name               = "${var.prefix}-urlpathmap"
  redirect_config_name            = "${var.prefix}-http-to-https"
}

resource "azurerm_application_gateway" "appgw" {
  name                = "${var.prefix}-appgw"
  resource_group_name = var.resource_group_name
  location            = var.location

  # Managed Identity — позволяет App Gateway читать TLS-сертификат из Key Vault
  # без хранения паролей или файлов на сервере
  identity {
    type         = "UserAssigned"
    identity_ids = [var.appgw_identity_id]
  }

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "my-gateway-ip-configuration"
    subnet_id = var.appgw_subnet_id
  }

  # HTTP порт 80 — используется только для редиректа на HTTPS
  frontend_port {
    name = local.frontend_port_name
    port = 80
  }

  # HTTPS порт 443 — основной защищённый порт
  frontend_port {
    name = local.frontend_port_name_https
    port = 443
  }

  # TLS-сертификат из Azure Key Vault — ключ никогда не хранится на сервере!
  # App Gateway получает его через Managed Identity напрямую из Key Vault
  ssl_certificate {
    name                = "burgergroup2-cert"
    key_vault_secret_id = var.key_vault_cert_secret_id
  }

  frontend_ip_configuration {
    name                 = local.frontend_ip_configuration_name
    public_ip_address_id = var.appgw_public_ip_id
  }

  backend_address_pool {
    name = local.backend_address_pool_name_fe
  }

  backend_address_pool {
    name = local.backend_address_pool_name_be
  }

  probe {
    name                                      = "probe-fe"
    protocol                                  = "Http"
    path                                      = "/"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
    match {
      status_code = ["200-399", "401", "403"]
    }
  }

  probe {
    name                                      = "probe-be"
    protocol                                  = "Http"
    path                                      = "/api/ingredients" # Assuming this is a health check endpoint or valid api path
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
    match {
      status_code = ["200-399", "401", "403", "404"]
    }
  }

  backend_http_settings {
    name                                = local.http_setting_name_fe
    cookie_based_affinity               = "Disabled" # Отключаем привязку сессии
    port                                = 80         # Идем к FE VMSS по HTTP порту 80
    protocol                            = "Http"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "probe-fe"
  }

  backend_http_settings {
    name                                = local.http_setting_name_be
    cookie_based_affinity               = "Disabled"
    port                                = 8080 # Идем к BE VMSS по HTTP порту 8080
    protocol                            = "Http"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "probe-be"
  }

  # HTTP listener — только принимает незащищённые запросы для редиректа
  http_listener {
    name                           = local.listener_name
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
  }

  # HTTPS listener — основной слушатель, использует TLS сертификат из Key Vault
  http_listener {
    name                           = local.listener_name_https
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name_https
    protocol                       = "Https"
    ssl_certificate_name           = "burgergroup2-cert"
  }

  # Редирект HTTP → HTTPS: когда пользователь вводит http://, автоматически переходит на https://
  redirect_configuration {
    name                 = local.redirect_config_name
    redirect_type        = "Permanent"
    target_listener_name = local.listener_name_https
    include_path         = true
    include_query_string = true
  }

  url_path_map {
    name                               = local.url_path_map_name
    default_backend_address_pool_name  = local.backend_address_pool_name_fe
    default_backend_http_settings_name = local.http_setting_name_fe

    path_rule {
      name                       = "api-rule"
      paths                      = ["/api/*"]
      backend_address_pool_name  = local.backend_address_pool_name_be
      backend_http_settings_name = local.http_setting_name_be
    }
  }

  # HTTPS маршрутизация — приоритет 90 (выше значит обрабатывается первым)
  request_routing_rule {
    name               = local.request_routing_rule_name_https
    rule_type          = "PathBasedRouting"
    http_listener_name = local.listener_name_https
    url_path_map_name  = local.url_path_map_name
    priority           = 90
  }

  # HTTP перенаправляет на HTTPS (301 Permanent Redirect)
  request_routing_rule {
    name                        = local.request_routing_rule_name
    rule_type                   = "Basic"
    http_listener_name          = local.listener_name
    redirect_configuration_name = local.redirect_config_name
    priority                    = 100
  }

  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101"
  }

  firewall_policy_id                = azurerm_web_application_firewall_policy.waf.id
  force_firewall_policy_association = true
}

resource "azurerm_web_application_firewall_policy" "waf" {
  name                = "${var.prefix}-wafpolicy"
  resource_group_name = var.resource_group_name
  location            = var.location

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    max_request_body_size_in_kb = 128
    file_upload_limit_in_mb     = 100
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }
}
