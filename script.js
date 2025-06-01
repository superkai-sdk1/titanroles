const numPlayers = 10;
const playerTable = document.getElementById('player-rows');
const ps = new BroadcastChannel('panel_status');
const pl = new BroadcastChannel('player_list');
const cl = new BroadcastChannel('class_list');
const gi = new BroadcastChannel('game_info');
const mi = new BroadcastChannel('main_info');
let isFirstKill = true;

const nicknameList = [
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

// ============ СИНХРОНИЗАЦИЯ ПАНЕЛЕЙ ============

// ID для фильтрации своих событий
window.__titanPanelSyncId = window.__titanPanelSyncId || Math.random().toString(36).slice(2);

// Синхронизация состояния между всеми панелями
function syncPanelState(changeType, data) {
    const payload = {
        type: changeType,
        data: data,
        ts: Date.now(),
        sender: window.__titanPanelSyncId
    };
    localStorage.setItem('titanroles-panel-sync', JSON.stringify(payload));
}

window.addEventListener('storage', function(e) {
    if (e.key === 'titanroles-panel-sync' && e.newValue) {
        const payload = JSON.parse(e.newValue);
        if (payload.sender === window.__titanPanelSyncId) return; // свой ивент не слушаем

        switch(payload.type) {
            case 'changeRole':
                {
                    const {id, classes} = payload.data;
                    const el = document.getElementById(id);
                    if (el) el.className = classes;
                    cl.postMessage(`${id}|${classes}`);
                }
                break;
            case 'changeStatus':
                {
                    const {id, classes} = payload.data;
                    const el = document.getElementById(id);
                    if (el) el.className = classes;
                    cl.postMessage(`${id}|${classes}`);
                }
                break;
            case 'playerSelect':
                {
                    const {id, value} = payload.data;
                    const el = document.getElementById(id);
                    if (el) {
                        $(el).find('.player-select').val(value);
                        pl.postMessage(`${id}|${value}`);
                    }
                }
                break;
            case 'mainInfo':
                {
                    $('#main-info-input').val(payload.data.value);
                    mi.postMessage(payload.data.value);
                }
                break;
            case 'gameNumber':
                {
                    $('#game-number-input').val(payload.data.value);
                    gi.postMessage(payload.data.value);
                }
                break;
            case 'overlaySettings':
                {
                    Object.entries(payload.data).forEach(([k, v]) => {
                        const el = document.getElementById('toggle-' + k.replace(/([A-Z])/g, "-$1").toLowerCase());
                        if (el) el.checked = v;
                    });
                    sendOverlaySettings();
                }
                break;
            case 'reset':
                {
                    location.reload();
                }
                break;
            default: break;
        }
    }
});

// ============ КОД ПАНЕЛИ ============

function createPlayerRows(num) {
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

$(document).ready(function () {
    createPlayerRows(numPlayers);
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
});

// --- Ручной ввод никнеймов ---
$('#manual-entry-btn').on('click', function() {
    $('header').hide();
    $('#manual-entry-panel').show();

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

// Обработка сохранения ручного ввода
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
});

function loadFileAsText() {
    var fileToLoad = document.getElementById("fileToLoad").files[0];
    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        getPlayerList(textFromFileLoaded.split('\r\n'));
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
    cl.postMessage(`${element.id}|${element.classList.value}`);
    syncPanelState('changeStatus', {id: element.id, classes: element.classList.value});
}

function changeRole(object, role) {
    const element = object.parentElement.parentElement.parentElement.parentElement;
    if (element.classList.contains(role)) {
        element.classList.remove(role);
    } else {
        element.classList.remove('don', 'mafia', 'sheriff');
        element.classList.add(role);
    }
    cl.postMessage(`${element.id}|${element.classList.value}`);
    syncPanelState('changeRole', {id: element.id, classes: element.classList.value});
}

function clearStatus() {
    document.querySelectorAll('.killed, .voted, .deleted, .dead').forEach(item => {
        item.classList.remove('killed', 'voted', 'deleted', 'dead');
    });
    document.querySelectorAll('.best-move').forEach(item => {
        item.remove();
    });
    document.querySelectorAll('.player').forEach(element => {
        cl.postMessage(`${element.id}|${element.classList.value}`);
    });
    isFirstKill = true;
    syncPanelState('reset', {});
    console.log("Статусы и ЛХ сброшены");
}

function clearRole() {
    document.querySelectorAll('.don, .mafia, .sheriff').forEach(item => {
        item.classList.remove('don', 'mafia', 'sheriff');
    });
    document.querySelectorAll('.player').forEach(element => {
        cl.postMessage(`${element.id}|${element.classList.value}`);
    });
    syncPanelState('reset', {});
}

$('.player-list-panel').on('change', '.player-select', function () {
    const player = `${$(this).parents('.player')[0].id}|${$(this).find(":selected").val()}`;
    pl.postMessage(player);
    syncPanelState('playerSelect', {id: $(this).parents('.player')[0].id, value: $(this).find(":selected").val()});
});

function sendAllData() {
    document.querySelectorAll('.player').forEach(element => {
        const item = element.querySelector('.player-select');
        const player = `${element.id}|${$(item[item.selectedIndex]).text()}`;
        pl.postMessage(player);
    });
    console.log("Данные игроков отправлены.");
}

$('#main-info-input').on('input', function () {
    const mainInfo = $(this).val();
    mi.postMessage(mainInfo);
    syncPanelState('mainInfo', {value: mainInfo});
});

$('#game-number-input').on('input', function () {
    const gameNumber = $(this).val();
    gi.postMessage(gameNumber);
    syncPanelState('gameNumber', {value: gameNumber});
});

function highlightSpeaker(playerNumber) {
    ps.postMessage(`highlight|player_${playerNumber}`);
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
            cl.postMessage(`${playerId}|${document.getElementById(playerId).classList.value}|best-move|${bestMove}`);
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

const overlaySettings = new BroadcastChannel('overlay_settings');
function sendOverlaySettings() {
    overlaySettings.postMessage({
        hidePlayers: document.getElementById('toggle-hide-players').checked,
        showMainInfo: document.getElementById('toggle-main-info').checked,
        showAdditionalInfo: document.getElementById('toggle-additional-info').checked,
        showStatusPanel: document.getElementById('toggle-status-panel').checked,
        blur: document.getElementById('toggle-blur').checked,
    });
    syncPanelState('overlaySettings', {
        hidePlayers: document.getElementById('toggle-hide-players').checked,
        showMainInfo: document.getElementById('toggle-main-info').checked,
        showAdditionalInfo: document.getElementById('toggle-additional-info').checked,
        showStatusPanel: document.getElementById('toggle-status-panel').checked,
        blur: document.getElementById('toggle-blur').checked,
    });
}
$(function() {
    $('.overlay-toggles input[type="checkbox"]').on('change', sendOverlaySettings);
    sendOverlaySettings();
});

$('.reset-panel').on('click', function() {
    syncPanelState('reset', {});
});
