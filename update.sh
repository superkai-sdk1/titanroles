#!/bin/bash

REPO_URL="https://github.com/superkai-sdk1/titanroles.git"
TARGET_DIR="/root/titanroles"

if [ -d "$TARGET_DIR/.git" ]; then
    echo "Репозиторий уже существует. Обновляем..."
    cd "$TARGET_DIR"
    git pull
else
    echo "Клонируем репозиторий..."
    git clone "$REPO_URL" "$TARGET_DIR"
fi

echo "Готово! Все файлы из GitHub скопированы/обновлены в $TARGET_DIR"
