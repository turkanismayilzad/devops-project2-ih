#!/bin/bash
# Запустить этой командой: bash start_backend.sh group2_sql 'BurgerApp2026!Secure'

SQL_USER=$1
SQL_PASS=$2

if [ -z "$SQL_PASS" ]; then
    echo "Ошибка: Не забудь указать логин и пароль в кавычках!"
    echo "Пример: bash start_backend.sh group2_sql 'BurgerApp2026!Secure'"
    exit 1
fi

echo "Getting VMSS instance IDs..."
# Получаем список ID всех экземпляров в наборе
INSTANCE_IDS=$(az vmss list-instances -g musa-project2-rg -n burger-vmss-be-musa --query "[].instanceId" -o tsv)

for ID in $INSTANCE_IDS; do
    echo "Starting backend on instance $ID..."
    az vmss run-command invoke \
      -g musa-project2-rg \
      -n burger-vmss-be-musa \
      --instance-id $ID \
      --command-id RunShellScript \
      --scripts "
        sudo pkill -f 'java -jar' || true
        sleep 2
        nohup java -jar /home/azureuser/app.jar \
          --spring.datasource.url='jdbc:sqlserver://burger-sqlserver.database.windows.net:1433;database=burgerbuilder-group22;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30;' \
          --spring.datasource.username='${SQL_USER}' \
          --spring.datasource.password='${SQL_PASS}' \
          --server.port=8080 \
          > /home/azureuser/app.log 2>&1 < /dev/null &
        sleep 5
      "
done

echo "Done! Check your website in 15 seconds."
