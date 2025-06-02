// overlay.js — синхронизация overlay через socket.io, без BroadcastChannel

// Получаем sessionId из overlay.html (глобальная переменная, см. overlay.html)
const sessionId = window.overlaySessionId;

// Подключаемся к socket.io, если не подключились раньше
window.socket = window.socket || io();
const socket = window.socket;

// --- Хранилища для порядка убийств/голосов ---
let killedOrder = [];
let votedOrder = [];

// --- Слушаем события panelEvent от панели управления ---
window.handlePanelEvent = function(event) {
    // --- Список игроков и их ники/фото ---
    if (event.type === 'playerName') {
        const player_list = event.value.split('|');
        document.getElementById(player_list[0]).querySelector('.nick').innerHTML = player_list[1];
        document.getElementById(player_list[0]).querySelector('.photo').style.backgroundImage = 'url("content/photo/' + player_list[1] + '.png")';
        return;
    }

    // --- Изменение классов (статусы и роли) ---
    if (event.type === 'playerStatus' || event.type === 'playerRole') {
        const { id, classList } = event;
        const playerId = id;
        const playerClasses = classList.split(' ');

        // Обновление классов игрока
        document.getElementById(playerId).setAttribute('class', classList);

        // Обновление порядка нажатий для killed, voted и deleted
        const statusElement = document.getElementById(playerId).querySelector('.status');
        if (playerClasses.includes('killed')) {
            if (!killedOrder.includes(playerId)) {
                killedOrder.push(playerId);
            }
            // Добавляем надпись "УБИТ"
            statusElement.innerText = "УБИТ";
            statusElement.style.visibility = "visible";
        } else {
            killedOrder = killedOrder.filter(id => id !== playerId);
            if (statusElement.innerText === "УБИТ") {
                statusElement.innerText = "";
                statusElement.style.visibility = "hidden";
            }
        }
        if (playerClasses.includes('voted')) {
            if (!votedOrder.includes(playerId)) {
                votedOrder.push(playerId);
            }
            statusElement.innerText = "ЗАГОЛОСОВАН";
            statusElement.style.visibility = "visible";
        } else {
            votedOrder = votedOrder.filter(id => id !== playerId);
            if (statusElement.innerText === "ЗАГОЛОСОВАН") {
                statusElement.innerText = "";
                statusElement.style.visibility = "hidden";
            }
        }
        if (playerClasses.includes('deleted')) {
            statusElement.innerText = "УДАЛЕН";
            statusElement.style.visibility = "visible";
        } else {
            if (statusElement.innerText === "УДАЛЕН") {
                statusElement.innerText = "";
                statusElement.style.visibility = "hidden";
            }
        }
        updateStatusOrder();
    }

    // --- Лучший ход (ЛХ) ---
    if (event.type === 'bestMove') {
        const { id, classList, bestMove } = event;
        const playerElement = document.getElementById(id);
        const oldBestMoveElement = playerElement.querySelector('.best-move');
        if (oldBestMoveElement) oldBestMoveElement.remove();
        const bestMoveElement = document.createElement('div');
        bestMoveElement.className = 'best-move';
        const bestMoveLabel = document.createElement('div');
        bestMoveLabel.className = 'best-move-label';
        bestMoveLabel.textContent = 'ЛХ';
        bestMoveElement.appendChild(bestMoveLabel);
        (bestMove.match(/10|[1-9]/g) || []).forEach(num => {
            const numElement = document.createElement('div');
            numElement.className = 'best-move-number';
            numElement.textContent = num;
            bestMoveElement.appendChild(numElement);
        });
        playerElement.appendChild(bestMoveElement);
    }
    if (event.type === 'removeBestMove') {
        const playerElement = document.getElementById(event.id);
        const bestMoveElement = playerElement.querySelector('.best-move');
        if (bestMoveElement) bestMoveElement.remove();
    }

    // --- Highlight speaker (выделение игрока) ---
    if (event.type === 'highlight') {
        const elementId = event.value;
        const element = document.getElementById(elementId);
        if (element.classList.contains('highlight')) {
            element.classList.remove('highlight');
            element.classList.remove('speaker');
        } else {
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            document.querySelectorAll('.speaker').forEach(el => el.classList.remove('speaker'));
            element.classList.add('highlight');
            element.classList.add('speaker');
        }
    }

    // --- Game Info ---
    if (event.type === 'gameInfo') {
        document.getElementById('game-info').innerText = event.value;
    }

    // --- Основная информация ---
    if (event.type === 'mainInfo') {
        const mainInfoBlock = document.getElementById('main-info');
        if (mainInfoBlock) mainInfoBlock.innerText = event.value;
    }

    // --- Game Phase (если потребуется) ---
    if (event.type === 'gamePhase') {
        const phasePanel = document.getElementById('game-phase-panel');
        if (phasePanel) {
            phasePanel.innerText = event.value;
            phasePanel.classList.add('animate-phase');
            setTimeout(() => phasePanel.classList.remove('animate-phase'), 1000);
        }
    }

    // --- Overlay Settings ---
    if (event.type === 'overlaySettings' && event.settings) {
        setOverlayState(event.settings);
    }
};

// --- Функция для обновления порядка статусов ---
function updateStatusOrder() {
    const killedPlayersElement = document.getElementById('killed-players');
    killedPlayersElement.textContent = killedOrder.map(id => id.replace('player_', '')).join(', ');
    const votedPlayersElement = document.getElementById('voted-players');
    votedPlayersElement.textContent = votedOrder.map(id => id.replace('player_', '')).join(', ');
}

// --- Логика setOverlayState (аналогично вашей реализации) ---
function setOverlayState(settings) {
    document.getElementById('footer-players').style.display = settings.hidePlayers ? 'none' : '';
    document.getElementById('main-info').style.display = settings.showMainInfo ? '' : 'none';
    document.getElementById('overlay-header').style.display = settings.showAdditionalInfo ? '' : 'none';
    document.getElementById('status-panel').style.display = settings.showStatusPanel ? '' : 'none';
    const blurDiv = document.getElementById('overlay-blur-el');
    if (settings.blur) {
        blurDiv.classList.add('active');
        document.body.classList.add('overlay-blur-bg');
    } else {
        blurDiv.classList.remove('active');
        document.body.classList.remove('overlay-blur-bg');
    }
    blurDiv.style.position = 'fixed';
    blurDiv.style.top = 0;
    blurDiv.style.left = 0;
    blurDiv.style.width = '100vw';
    blurDiv.style.height = '100vh';
    blurDiv.style.zIndex = 9998;
    blurDiv.style.pointerEvents = 'none';
}

// --- Если overlay должен отправлять события панели (например, обратная связь) ---
function sendOverlayEvent(event) {
    socket.emit('overlayEvent', { sessionId, event });
}

// --- Инициализация по готовности DOM (можно оставить для обратной совместимости) ---
$(document).ready(function () {
    // Можно что-то инициализировать, если нужно
});
