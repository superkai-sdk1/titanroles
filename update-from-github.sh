#!/bin/bash

# Папка, где лежит твой проект
PROJECT_DIR="/path/to/titanroles"

# Имя ветки, если не main — укажи свою!
BRANCH="main"

# Если сервер стартует через pm2, укажи имя процесса.
PM2_NAME="server.js"

cd "$PROJECT_DIR" || exit 1

echo "Pulling latest changes from GitHub..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo "Installing dependencies (на всякий случай)..."
npm install

echo "Restarting server..."
if command -v pm2 &> /dev/null; then
    pm2 restart "$PM2_NAME"
else
    # Если без pm2 — убить старый процесс и заново запустить.
    pkill -f server.js
    nohup node server.js > log.txt 2>&1 &
fi

echo "Done!"
