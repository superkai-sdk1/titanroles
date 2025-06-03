// --- SESSION ID & ROOM LOGIC (универсально для panel и mobile) ---
function getRoomIdFromUrlOrStorage() {
    // Пробуем из URL hash (mobile)
    let hash = window.location.hash.replace(/^#/, '');
    if (/^\d{4}$/.test(hash)) {
        localStorage.setItem('sessionId', hash);
        localStorage.setItem('mobileRoomId', hash);
        return hash;
    }
    // Пробуем из localStorage (panel и mobile)
    let stored = localStorage.getItem('sessionId') || localStorage.getItem('mobileRoomId');
    if (/^\d{4}$/.test(stored)) return stored;
    // Генерируем новый для panel
    let roomId = (Math.floor(Math.random() * 9000) + 1000).toString();
    localStorage.setItem('sessionId', roomId);
    return roomId;
}
let sessionId = getRoomIdFromUrlOrStorage();
window.sessionId = sessionId;

// ---- Смена комнаты и сброс sessionId ----
window.changeSessionId = function(newId) {
    if (!/^\d{4}$/.test(newId)) return;
    window.sessionId = newId;
    localStorage.setItem('sessionId', newId);
    localStorage.setItem('mobileRoomId', newId);
    if (typeof updatePanelMenu === "function") updatePanelMenu(newId);
    $('.main').hide();
    $('.m3e-header').hide();
    $('#manual-entry-panel').hide();
    if ($('#panel-join-overlay').length) $('#panel-join-overlay').hide();
    // Очистить поля ввода
    $('#main-info-input').val('');
    $('#game-number-input').val('');
    // Очистим и перегенерируем игроков
    setTimeout(() => {
        $('.main').show();
        $('.m3e-header').show();
        createPlayerRows(numPlayers);
        socket.emit('getSessionState', { sessionId: newId });
        showRoomQRSection && showRoomQRSection();
    }, 200);
}

// --- QR/ID секция: показывать только после загрузки игроков (panel) или всегда (mobile) ---
function showRoomQRSection() {
    $('#sessionId').text(sessionId);
    $('#copySessionId').off('click').on('click', function () {
        const link = `${location.origin}/mobile.html#${sessionId}`;
        navigator.clipboard.writeText(link).then(() => {
            $(this).text('Скопировано!');
            setTimeout(() => $(this).text('Скопировать'), 1200);
        });
    });
    if (typeof QRious !== "undefined" && document.getElementById('qr')) {
        document.getElementById('qr').getContext('2d').clearRect(0, 0, 150, 150);
        new QRious({
            element: document.getElementById('qr'),
            size: 150,
            value: `${location.origin}/mobile.html#${sessionId}`
        });
    }
    $('#room-qr-section').slideDown();
}
function hideRoomQRSection() {
    $('#room-qr-section').hide();
}

// --- TITANROLES PANEL СИНХРОНИЗАЦИЯ через socket.io ---
const numPlayers = 10;
const playerTable = document.getElementById('player-rows');
window.socket = window.socket || io();
const socket = window.socket;

// --- Список никнеймов для ручного ввода ---
const nicknameList = [
    // ... (оставь как есть)
    "AMOR", "Asia", "Alien", "Alinellas", "Animag", "Bittir", "Black", "Black Jack", "DULASHA", "Dill",
    "Dizi", "Dushman", "EL", "Fox", "Gremlin", "Geralt", "Gestalter", "Hisoka", "Ivory", "Kai",
    "LIRICA", "Miamore", "Mulan", "Neo", "ProDoc", "Shinobi", "Soza", "Saul Goodman", "Scorpion",
    "TONI MONTANA", "Tam", "ZONDR", "evil", "finnick", "Йору", "Адвокат", "Альтман", "Альфа", "Асур",
    "Бес", "Биполярка", "Булочка", "Валькирия", "Великая", "228Данте69", "Даня", "Дита", "Добрый",
    "Дэва", "Ева", "Завклубом", "Зайка", "Зара", "Знаток", "Зёма", "Кари", "Кир", "Кира", "Кобра",
    "Кову", "Копибара", "Коссмос", "Красавчик", "Лазер", "Лестер", "Лимонная долька", "Белый склон",
    "Луи", "Мрак", "Маркетолог", "Марсело", "Мау", "Мафия", "Минахор", "Нафиля", "Окси", "Пантера",
    "Паранойа", "Подкова", "Подсолнух", "Психолог", "Рокфор", "Руди", "Скорпион", "Саид", "Саймон",
    "Салливан", "Сатору", "Светлячек", "Сирена", "Смурфик", "Статистика", "Темир", "Типсон",
    "Томас Шелби", "Учитель", "Феникс", "Физик", "Фил", "Хейтер", "Штиль", "Элис"
];

let isFirstKill = true;

// --- Генерация строк игроков ---
function createPlayerRows(num) {
    playerTable.innerHTML = '';
    for (let i = 1; i <= num; i++) {
        const row = document.createElement('div');
        row.className = 'player-row player';
        row.id = `player_${i}`;
        row.innerHTML = `
            <div class="player-row-content">
                <div class="player-number" tabindex="0" onclick="highlightSpeaker(${i})">${i}</div>
                <select class="player-select"></select>
                <div class="player-row-icons player-row-statuses">
                    <button class="s-button killed-button" title="Убит"><div onclick="changeStatus(this, 'killed')"></div></button>
                    <button class="s-button voted-button" title="Заголосован"><div onclick="changeStatus(this, 'voted')"></div></button>
                    <button class="s-button deleted-button" title="Удален"><div onclick="changeStatus(this, 'deleted')"></div></button>
                </div>
                <div class="player-row-icons player-row-roles">
                    <button class="s-button don-button" title="Дон"><div onclick="changeRole(this, 'don')"></div></button>
                    <button class="s-button mafia-button" title="Мафия"><div onclick="changeRole(this, 'mafia')"></div></button>
                    <button class="s-button sheriff-button" title="Шериф"><div onclick="changeRole(this, 'sheriff')"></div></button>
                </div>
            </div>
        `;
        playerTable.appendChild(row);
    }
}

// --- Универсальная инициализация для panel и mobile ---
function initPanelOrMobile() {
    // Если мы в panel.html — при отсутствии sessionId показать overlay для ввода
    if (window.location.pathname.includes('panel.html')) {
        let urlId = window.location.hash.replace(/^#/, '');
        let validId = /^\d{4}$/.test(urlId) ? urlId : false;
        if (!validId && !/^\d{4}$/.test(localStorage.getItem('sessionId'))) {
            setTimeout(() => window.showJoinOverlay && window.showJoinOverlay(), 80);
            $('.main').hide();
            $('.m3e-header').hide();
            $('#manual-entry-panel').hide();
            return;
        }
    }

    createPlayerRows(numPlayers);

    // MOBILE: Скрыть загрузку файла и ручной ввод, сразу показать панель
    if (window.location.pathname.includes('mobile.html')) {
        $('.main').show();
        $('header').hide();
        $('#manual-entry-panel').hide();
        showRoomQRSection && showRoomQRSection(); // QR всегда виден на mobile (через меню)
    } else {
        // PANEL
        $('.main').hide();
        getPlayerList(nicknameList);
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.style.display = 'block';
            $('#fileToLoad').on('change', function () {
                welcomeModal.style.display = 'none';
                $('.main').show();
            });
        } else {
            $('#fileToLoad').on('change', function () {
                $('.main').show();
                hideStatusesShowRoles();
            });
        }
        hideRoomQRSection(); // QR скрыт при загрузке
    }

    // После создания строк — запросить состояние комнаты с сервера
    socket.emit('getSessionState', { sessionId });

    // Обновить QR и номер комнаты в mobile-меню (если есть)
    if ($('#mobile-menu-roomid').length) {
        $('#mobile-menu-roomid').text(sessionId);
        const mobileLink = `${location.origin}/mobile.html#${sessionId}`;
        $('#mobile-copylink-btn').off('click').on('click', function () {
            navigator.clipboard.writeText(mobileLink).then(() => {
                $(this).text('Скопировано!');
                setTimeout(()=>$(this).html('<svg width="16" height="16"><use href="#copy-icon"></use></svg>'), 1200);
            });
        });
        if (typeof QRious !== "undefined" && document.getElementById('mobile-menu-qr')) {
            new QRious({
                element: document.getElementById('mobile-menu-qr'),
                size: 150,
                value: mobileLink
            });
        }
    }
}

$(document).ready(initPanelOrMobile);

// --- Ручной ввод никнеймов (panel only) ---
$('#manual-entry-btn').on('click', function() {
    $('header').hide();
    $('#manual-entry-panel').show();
    hideRoomQRSection();

    let html = '';
    for (let i = 1; i <= numPlayers; i++) {
        html += `
            <div style="margin-bottom: 8px;">
                <label style="display:inline-block;width:80px;">Игрок ${i}:</label>
                <input type="text" class="manual-nickname-input" data-index="${i-1}" autocomplete="off" style="width:220px;">
            </div>
        `;
    }
    $('#manual-players-list').html(html);

    $('.manual-nickname-input').autocomplete({
        source: nicknameList,
        minLength: 1
    });
});

$('#manual-entry-form').on('submit', function(e) {
    e.preventDefault();
    let selected = [];
    $('.manual-nickname-input').each(function(){ selected.push($(this).val().trim()); });

    let empty = selected.some(n=>!n);
    let dups = (new Set(selected)).size !== selected.length;
    if (empty) { alert('Заполните все поля!'); return; }
    if (dups) { alert('Никнеймы не должны повторяться!'); return; }
    let wrong = selected.find(n => !nicknameList.includes(n));
    if (wrong) { alert(`Ник "${wrong}" не найден в списке!`); return; }

    getPlayerList(selected);
    sendAllData();

    $('#manual-entry-panel').hide();
    $('.main').show();
    showRoomQRSection();
});

function loadFileAsText() {
    var fileToLoad = document.getElementById("fileToLoad").files[0];
    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        getPlayerList(textFromFileLoaded.split('\r\n'));
        sendAllData();
        showRoomQRSection();
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
    $('.main').show();
    $('header').hide();
    hideStatusesShowRoles();
}

function getPlayerList(playerArray) {
    document.querySelectorAll('.player-select').forEach((element, index) => {
        $(element).empty();
        playerArray.forEach(player => {
            element.add(new Option(player.trim()));
        });
        $(element).children('option').eq(index).attr('selected', 'selected');
    });
}

// --- Управление статусами и ролями, синхронизация через socket.io ---
function changeStatus(object, status) {
    const element = object.parentElement.parentElement.parentElement.parentElement;
    if (element.classList.contains(status)) {
        element.classList.remove(status);
        element.classList.remove('dead');
    } else {
        if (element.classList.contains('dead')) {
            element.classList.remove('killed', 'voted', 'deleted');
        } else {
            element.classList.add('dead');
        }
        element.classList.add(status);
        if (status === 'killed' && isFirstKill) {
            isFirstKill = false;
            showBestMoveModal(element.id);
        }
    }
    sendPanelEvent({ type: 'playerStatus', id: element.id, classList: element.classList.value });
}

function changeRole(object, role) {
    const element = object.parentElement.parentElement.parentElement.parentElement;
    if (element.classList.contains(role)) {
        element.classList.remove(role);
    } else {
        element.classList.remove('don', 'mafia', 'sheriff');
        element.classList.add(role);
    }
    sendPanelEvent({ type: 'playerRole', id: element.id, classList: element.classList.value });
}

function clearStatus() {
    document.querySelectorAll('.killed, .voted, .deleted, .dead').forEach(item => {
        item.classList.remove('killed', 'voted', 'deleted', 'dead');
    });
    document.querySelectorAll('.best-move').forEach(item => {
        item.remove();
    });
    document.querySelectorAll('.player').forEach(element => {
        sendPanelEvent({ type: 'playerStatus', id: element.id, classList: element.classList.value });
    });
    isFirstKill = true;
    console.log("Статусы и ЛХ сброшены");
}

function clearRole() {
    document.querySelectorAll('.don, .mafia, .sheriff').forEach(item => {
        item.classList.remove('don', 'mafia', 'sheriff');
    });
    document.querySelectorAll('.player').forEach(element => {
        sendPanelEvent({ type: 'playerRole', id: element.id, classList: element.classList.value });
    });
}

$('.player-list-panel').on('change', '.player-select', function () {
    const player = `${$(this).parents('.player')[0].id}|${$(this).find(":selected").val()}`;
    sendPanelEvent({ type: 'playerName', value: player });
});

function sendAllData() {
    document.querySelectorAll('.player').forEach(element => {
        const item = element.querySelector('.player-select');
        const player = `${element.id}|${$(item[item.selectedIndex]).text()}`;
        sendPanelEvent({ type: 'playerName', value: player });
    });
    console.log("Данные игроков отправлены.");
}

// --- Основная информация, отправка через socket.io
$('#main-info-input').on('input', function () {
    const mainInfo = $(this).val();
    sendPanelEvent({ type: 'mainInfo', value: mainInfo });
});

$('#game-number-input').on('input', function () {
    const gameNumber = $(this).val();
    sendPanelEvent({ type: 'gameInfo', value: gameNumber });
});

function highlightSpeaker(playerNumber) {
    sendPanelEvent({ type: 'highlight', value: `player_${playerNumber}` });
}

function showBestMoveModal(playerId) {
    const modal = document.getElementById('best-move-modal');
    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function () {
        modal.style.display = 'none';
        selectedNumbers = [];
        document.querySelectorAll('.number-button').forEach(button => button.classList.remove('selected-number'));
    };
    const saveBtn = modal.querySelector('#save-best-move');
    saveBtn.onclick = function () {
        if (selectedNumbers.length === 3) {
            const bestMove = selectedNumbers.join('');
            sendPanelEvent({ type: 'bestMove', id: playerId, classList: document.getElementById(playerId).classList.value, bestMove });
            modal.style.display = 'none';
            selectedNumbers = [];
            document.querySelectorAll('.number-button').forEach(button => button.classList.remove('selected-number'));
        } else {
            alert("Пожалуйста, выберите три цифры.");
        }
    };
}
let selectedNumbers = [];
function selectNumber(number) {
    const button = document.querySelector(`.number-button:nth-child(${number})`);
    if (!button.classList.contains('selected-number') && selectedNumbers.length < 3) {
        button.classList.add('selected-number');
        selectedNumbers.push(number);
    } else if (button.classList.contains('selected-number')) {
        button.classList.remove('selected-number');
        selectedNumbers = selectedNumbers.filter(n => n !== number);
    }
}

function hideStatusesShowRoles() {
    $('.main').removeClass('show-statuses-mode').addClass('show-roles-mode');
    $('.player-row-statuses').hide();
    $('.player-row-roles').show();
    $('#show-players-btn').show();
    $('#edit-roles-btn').hide();
    $('#clear-role-btn').show();
    $('#clear-status-btn').hide();
}

function showStatusesHideRoles() {
    $('.main').removeClass('show-roles-mode').addClass('show-statuses-mode');
    $('.player-row-statuses').show();
    $('.player-row-roles').hide();
    $('#show-players-btn').hide();
    $('#edit-roles-btn').show();
    $('#clear-role-btn').hide();
    $('#clear-status-btn').show();
}

function confirmRolesAndShowStatuses() {
    sendAllData();
    showStatusesHideRoles();
}

function editRoles() {
    hideStatusesShowRoles();
}

$(function () {
    hideStatusesShowRoles();
});

/* --- Overlay Settings через socket.io --- */
function collectOverlaySettings() {
    return {
        hidePlayers: document.getElementById('toggle-hide-players').checked,
        showMainInfo: document.getElementById('toggle-main-info').checked,
        showAdditionalInfo: document.getElementById('toggle-additional-info').checked,
        showStatusPanel: document.getElementById('toggle-status-panel').checked,
        blur: document.getElementById('toggle-blur').checked,
    };
}
function sendOverlaySettings() {
    sendPanelEvent({ type: 'overlaySettings', settings: collectOverlaySettings() });
}
$(function() {
    $('.overlay-toggles input[type="checkbox"]').on('change', sendOverlaySettings);
    sendOverlaySettings();
});

// --- Универсальная отправка событий панели ---
function sendPanelEvent(event) {
    socket.emit('panelEvent', { sessionId, event });
}

// --- Получение событий и восстановление состояния комнаты ---
socket.on('overlayEvent', (event) => {
    // Обработка событий overlay, если нужно
    console.log('overlayEvent', event);
});
socket.on('mobileEvent', (event) => {
    console.log('mobileEvent', event);
});
socket.on('sessionState', (state) => {
    // Применить state к UI панели (например, восстановить игроков/роли)
    if (!state) return;
    // state: {players: [{id, name, classList}], mainInfo, gameInfo, ...}
    if (Array.isArray(state.players)) {
        state.players.forEach(player => {
            let el = document.getElementById(player.id);
            if (el) {
                el.className = 'player-row player ' + (player.classList || '');
                let select = el.querySelector('.player-select');
                if (select && player.name) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].text === player.name) {
                            select.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        });
    }
    if (state.mainInfo !== undefined) $('#main-info-input').val(state.mainInfo);
    if (state.gameInfo !== undefined) $('#game-number-input').val(state.gameInfo);
    // режим отображения (ролей/статусов) можешь доработать по желанию
    console.log('Восстановлено состояние комнаты', state);
});

// ---- Сбросить панель (обнулить комнату и назначить новый sessionId) ----
$('#reset-panel-btn').on('click', function() {
    // 1. Отправить на сервер событие очистки комнаты
    if (window.sessionId) {
        socket.emit('panelEvent', { sessionId: window.sessionId, event: { type: 'resetSession' } });
    }
    // 2. Генерировать новый sessionId
    let newRoomId = (Math.floor(Math.random() * 9000) + 1000).toString();
    localStorage.setItem('sessionId', newRoomId);
    window.sessionId = newRoomId;
    setTimeout(() => {
        location.hash = '#' + newRoomId;
        location.reload();
    }, 200);
});
