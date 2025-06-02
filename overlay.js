// overlay.js — overlay теперь полностью работает через WebSocket (ws-sync.js)

function applyOverlayState(state) {
    if (!state) return;

    // --- Никнеймы, фото ---
    if (state.players && Array.isArray(state.players)) {
        state.players.forEach((nick, i) => {
            let id = 'player_' + (i + 1);
            let player = document.getElementById(id);
            if (player) {
                let nickDiv = player.querySelector('.nick');
                if (nickDiv) nickDiv.textContent = nick;
                let photo = player.querySelector('.photo');
                if (photo) photo.style.backgroundImage = 'url("content/photo/' + nick + '.png")';
            }
        });
    }

    // --- Классы, роли, статусы игроков ---
    let killedOrder = [];
    let votedOrder = [];
    if (state.playerStates) {
        Object.entries(state.playerStates).forEach(([id, data]) => {
            let el = document.getElementById(id);
            if (!el) return;
            el.className = data.classes || 'player-row player';

            // Обновление порядка killed/voted
            if (el.classList.contains('killed')) killedOrder.push(id);
            if (el.classList.contains('voted')) votedOrder.push(id);

            // Статус-блок
            let statusDiv = el.querySelector('.status');
            if (statusDiv) {
                if (el.classList.contains('killed')) {
                    statusDiv.innerText = "УБИТ";
                    statusDiv.style.visibility = "visible";
                } else if (el.classList.contains('voted')) {
                    statusDiv.innerText = "ЗАГОЛОСОВАН";
                    statusDiv.style.visibility = "visible";
                } else if (el.classList.contains('deleted')) {
                    statusDiv.innerText = "УДАЛЕН";
                    statusDiv.style.visibility = "visible";
                } else {
                    statusDiv.innerText = "";
                    statusDiv.style.visibility = "hidden";
                }
            }

            // ЛХ (best-move)
            // удаляем старый
            let oldBM = el.querySelector('.best-move');
            if (oldBM) oldBM.remove();
            if (data.bestMove && Array.isArray(data.bestMove) && data.bestMove.length) {
                let bestMoveElement = document.createElement('div');
                bestMoveElement.className = 'best-move';
                let bestMoveLabel = document.createElement('div');
                bestMoveLabel.className = 'best-move-label';
                bestMoveLabel.textContent = 'ЛХ';
                bestMoveElement.appendChild(bestMoveLabel);
                data.bestMove.forEach(num => {
                    const numElement = document.createElement('div');
                    numElement.className = 'best-move-number';
                    numElement.textContent = num;
                    bestMoveElement.appendChild(numElement);
                });
                el.appendChild(bestMoveElement);
            }
        });
    }

    // --- Порядок ухода (панель справа) ---
    let killedPlayersElement = document.getElementById('killed-players');
    let votedPlayersElement = document.getElementById('voted-players');
    if (killedPlayersElement) killedPlayersElement.textContent = killedOrder.map(id => id.replace('player_', '')).join(', ');
    if (votedPlayersElement) votedPlayersElement.textContent = votedOrder.map(id => id.replace('player_', '')).join(', ');

    // --- Основная/доп. информация ---
    if ('mainInfo' in state) {
        let mainInfoBlock = document.getElementById('main-info');
        if (mainInfoBlock) mainInfoBlock.innerText = state.mainInfo;
    }
    if ('gameNumber' in state) {
        let gameInfoBlock = document.getElementById('game-info');
        if (gameInfoBlock) gameInfoBlock.innerText = state.gameNumber;
    }

    // --- overlay-переключатели (скрыть игроков, блюр и т.д.) ---
    if (state.overlay) {
        // Игроки
        let footer = document.getElementById('footer-players');
        if (footer) footer.style.display = state.overlay.hidePlayers ? 'none' : '';
        // Основная инфа
        let mainInfoBlock = document.getElementById('main-info');
        if (mainInfoBlock) mainInfoBlock.style.display = state.overlay.showMainInfo ? '' : 'none';
        // Доп. инфа
        let overlayHeader = document.getElementById('overlay-header');
        if (overlayHeader) overlayHeader.style.display = state.overlay.showAdditionalInfo ? '' : 'none';
        // Статус-панель
        let statusPanel = document.getElementById('status-panel');
        if (statusPanel) statusPanel.style.display = state.overlay.showStatusPanel ? '' : 'none';
        // Блюр
        let blurDiv = document.getElementById('overlay-blur-el');
        if (blurDiv) {
            if (state.overlay.blur) {
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
    }
}

// ---- Подключение к WebSocket ----
$(function () {
    // ws-sync.js должен быть подключён ДО overlay.js
    if (typeof connectWS !== "function") {
        console.error("ws-sync.js is missing! Overlay will not update.");
        return;
    }
    connectWS(applyOverlayState);
});
