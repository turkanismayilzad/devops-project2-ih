resource "azurerm_log_analytics_workspace" "law" {
  name                = "${var.prefix}-law"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "appinsights" {
  name                = "${var.prefix}-appinsights"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
}

# Logic App для пересылки алертов в Telegram
# Это Serverless компонент, который будет дергать Telegram API
resource "azurerm_logic_app_workflow" "telegram_forwarder" {
  name                = "${var.prefix}-telegram-forwarder"
  location            = var.location
  resource_group_name = var.resource_group_name
}

#webhook url(azure send it to logic app)
resource "azurerm_logic_app_trigger_http_request" "http_trigger" {
  name         = "AlertTrigger"
  logic_app_id = azurerm_logic_app_workflow.telegram_forwarder.id
  schema       = <<SCHEMA
{
    "type": "object",
    "properties": {
        "schemaId": { "type": "string" },
        "data": {
            "type": "object",
            "properties": {
                "status": { "type": "string" },
                "context": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "description": { "type": "string" },
                        "severity": { "type": "string" }
                    }
                }
            }
        }
    }
}
SCHEMA
}

# Экшн для отправки в Telegram через HTTP POST
resource "azurerm_logic_app_action_http" "telegram_post" {
  name         = "SendToTelegram"
  logic_app_id = azurerm_logic_app_workflow.telegram_forwarder.id
  method       = "POST"
  uri          = "https://api.telegram.org/bot${var.telegram_bot_token}/sendMessage"
  body         = <<BODY
{
  "chat_id": "${var.telegram_chat_id}",
  "text": "🚀 *Group2's Infra Shield - MONITORING REPORT* 🚀\n\n📡 *STATUS:* @{triggerBody()?['data']?['status']}\n🔥 *SEVERITY:* @{triggerBody()?['data']?['context']?['severity']}\n\n📝 *INCIDENT DETAILS:*\n> *Alert:* @{triggerBody()?['data']?['context']?['name']}\n> *Description:* @{triggerBody()?['data']?['context']?['description']}\n\n🔗 *VIEW ON AZURE PORTAL:*\n[Click here to verify incident](https://portal.azure.com/#resource/subscriptions/${var.subscription_id}/resourceGroups/${var.resource_group_name}/alerts)\n\n⏰ *Timestamp:* @{utcNow('yyyy-MM-dd HH:mm:ss')} UTC\n━━━━━━━━━━━━━━━━━━━━\n✅ *Everything else is under control.*",
  "parse_mode": "Markdown"
}
BODY
}

resource "azurerm_monitor_action_group" "ag" {
  name                = "${var.prefix}-actiongroup"
  resource_group_name = var.resource_group_name
  short_name          = "MusaShield"

  # 1. Уведомление на Email
  email_receiver {
    name                    = "EmailAlert"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  # 2. Уведомление в Telegram (через наш Logic App)
  logic_app_receiver {
    name                    = "TelegramAlert"
    resource_id             = azurerm_logic_app_workflow.telegram_forwarder.id
    callback_url            = azurerm_logic_app_trigger_http_request.http_trigger.callback_url
    use_common_alert_schema = true
  }
}

# --- Alerts (оставляем те же, но они теперь используют обновленную Action Group) ---

resource "azurerm_monitor_metric_alert" "appgw_health" {
  name                = "${var.prefix}-alert-appgw-health"
  resource_group_name = var.resource_group_name
  scopes              = [var.appgw_id]
  description         = "Unhealthy Host Count > 0 on Application Gateway"
  severity            = 1
  window_size         = "PT1M"
  frequency           = "PT1M"

  criteria {
    metric_namespace = "Microsoft.Network/applicationGateways"
    metric_name      = "UnhealthyHostCount"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.ag.id
  }
}

resource "azurerm_monitor_metric_alert" "vmss_fe_cpu" {
  name                = "${var.prefix}-alert-vmss-fe-cpu-musa"
  resource_group_name = var.resource_group_name
  scopes              = [var.vmss_fe_id]
  description         = "CPU Percentage > 70% on Frontend VMSS"
  severity            = 2
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachineScaleSets"
    metric_name      = "Percentage CPU"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 70
  }

  action {
    action_group_id = azurerm_monitor_action_group.ag.id
  }
}

resource "azurerm_monitor_metric_alert" "vmss_be_cpu" {
  name                = "${var.prefix}-alert-vmss-be-cpu-musa"
  resource_group_name = var.resource_group_name
  scopes              = [var.vmss_be_id]
  description         = "CPU Percentage > 70% on Backend VMSS"
  severity            = 2
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachineScaleSets"
    metric_name      = "Percentage CPU"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 70
  }

  action {
    action_group_id = azurerm_monitor_action_group.ag.id
  }
}

resource "azurerm_monitor_metric_alert" "sql_cpu" {
  name                = "${var.prefix}-alert-sql-cpu"
  resource_group_name = var.resource_group_name
  scopes              = [var.sql_database_id]
  description         = "SQL Database CPU Usage > 80%"
  severity            = 2
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.ag.id
  }
}
