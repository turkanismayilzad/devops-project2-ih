# 🍔 Burger Builder: Secure 3-Tier Scalable Azure Architecture

Этот проект представляет собой современное, масштабируемое и безопасное 3-уровневое веб-приложение, развернутое в Microsoft Azure с использованием принципа Infrastructure as Code (Terraform) и CI/CD (GitHub Actions).

## 🏗 Архитектура

-   **Frontend**: React-приложение, развернутое на Virtual Machine Scale Set (VMSS).
-   **Backend**: Java Spring Boot API, развернутый на VMSS с доступом к Azure SQL.
-   **Database**: Azure SQL Server с Private Endpoint (доступен только внутри сети).
-   **Security**: Traffic Manager + Application Gateway (WAF) с TLS-терминацией (HTTPS).
-   **Networking**: Изолированные подсети, NSG и ProxyJump через SonarQube сервер.

---

## 📋 Предварительные требования (Prereqs)

1.  **Azure CLI**: Установлен локально и выполнен вход (`az login`).
2.  **Аккаунт Azure**: Активная подписка с правами `Owner` или `Contributor`.
3.  **Квоты**: Убедитесь, что в вашем регионе (например, UK South) доступны квоты для семейств VM `Standard_D2ads_v7` и `Standard_B2s`.
4.  **GitHub Secrets**: В репозитории должны быть настроены следующие секреты:
    -   `AZURE_CREDENTIALS`: Вывод команды `az ad sp create-for-rbac`.
    -   `VM_SSH_PRIVATE_KEY` / `VM_SSH_PUBLIC_KEY`: Твоя пара ключей.
    -   `SQL_ADMIN_USERNAME` / `SQL_ADMIN_PASSWORD`: Данные для базы.
    -   `SONAR_TOKEN_BACKEND` / `SONAR_TOKEN_FRONTEND`: Для анализа кода.

---

## 🚀 Как запустить (Step-by-Step)

### 1. Развертывание инфраструктуры (Terraform)
Вся инфраструктура описывается кодом. Пайплайн `Infra` автоматически запускает:
```bash
terraform init
terraform plan
terraform apply -auto-approve
```
**Результат**: Будут созданы сети, база данных, Application Gateway и VMSS.

### 2. Конфигурация и Деплой (GitHub Actions)
Вместо ручного Ansible мы используем автоматизацию через GitHub Actions и Cloud-init:
-   **Frontend Pipeline**: Собирает React-код, копирует его на VMSS и настраивает Nginx.
-   **Backend Pipeline**: Собирает JAR-файл, копирует его на VMSS через ProxyJump и запускает Java-сервис на порту 8080.

---

## 🔍 Проверка и Валидация (Validation)

### 1. Доступность через браузер
Основной URL проекта: **[https://burgergroup2.com](https://burgergroup2.com)**
-   Проверьте наличие иконки "Замочек" (HTTPS).
-   Убедитесь, что ингредиенты загружаются (это значит, что связь BE -> DB работает).

### 2. Тестирование API (Curl / Postman)
Проверка работоспособности бэкенда напрямую через шлюз:
```bash
# Получить список ингредиентов
curl -X GET https://burgergroup2.com/api/ingredients

# Проверка истории заказов
curl -X GET https://burgergroup2.com/api/orders/history?email=test@example.com
```

### 3. Проверка здоровья (Health Probes)
В панели Azure перейдите в **Application Gateway -> Backend Health**. Все инстансы (FE и BE) должны иметь статус `Healthy`.

---

## 💸 Бюджет и Квоты
-   Используется **Standard_D2ads_v7** для VMSS (высокая производительность).
-   **Application Gateway WAF v2** — основной элемент затрат, не забудьте удалить группу ресурсов `musa-project2-rg` после завершения тестов, чтобы не тратить баланс.

---
*Проект выполнен Мусой в рамках Project 2.*
