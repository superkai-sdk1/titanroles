#!/bin/bash

# Папка проекта
PROJECT_DIR="/var/www/titanroles"
BRANCH="main"

cd "$PROJECT_DIR" || { echo "Не удалось перейти в $PROJECT_DIR"; exit 1; }

echo "Получаем последние изменения с GitHub..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo "Устанавливаем зависимости (на всякий случай)..."
npm install

echo "Перезапускаем node-сервер..."
# Если используешь pm2 — замени на pm2 restart server.js
if command -v pm2 &> /dev/null; then
    pm2 restart server.js
else
    pkill -f server.js
    nohup node server.js > log.txt 2>&1 &
fi

echo "✓ Проект успешно обновлен!"
