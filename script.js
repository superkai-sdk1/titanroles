// === SUPABASE INIT ===
const SUPABASE_URL = "https://axdbxcumaeaoyuyfdpid.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZGJ4Y3VtYWVhb3l1eWZkcGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTIwODcsImV4cCI6MjA2NDM2ODA4N30.KmDBIfByq_JRqIVpEdZ-lUgcV5QOOPqKP1GYklfFSu0";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const numPlayers = 10;
const playerTable = document.getElementById('player-rows');
let isFirstKill = true;

let panelState = {
    players: [],
    playerStates: {},
    mainInfo: "",
    gameNumber: "",
    overlay: {
        hidePlayers: false,
        showMainInfo: true,
        showAdditionalInfo: true,
        showStatusPanel: true,
        blur: false
    }
};

// Заполни список никнеймов (пример)
const nicknameList = [/* ... */"Элис"];

// ========== SUPABASE SYNC ==========
async function savePanelStateToSupabase() {
    await supabase
        .from('panel_state')
        .update({ state: panelState })
        .eq('id', 1);
}
async function subscribeToPanelState() {
    // Получить начальное состояние
    let { data } = await supabase
        .from('panel_state')
        .select('state')
        .eq('id', 1)
        .single();
    if (data && data.state) {
        panelState = data.state;
        applyPanelState();
    }
    // Подписка на realtime
    supabase
        .channel('public:panel_state')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'panel_state', filter: 'id=eq.1' },
            payload => {
                if (payload.new && payload.new.state) {
                    if (JSON.stringify(payload.new.state) !== JSON.stringify(panelState)) {
                        panelState = payload.new.state;
                        applyPanelState();
                    }
                }
            }
        )
        .subscribe();
}
subscribeToPanelState();

// ====== ПРИМЕНИТЬ СОСТОЯНИЕ ИЗ SUPABASE ======
function applyPanelState() {
    if (panelState.players && panelState.players.length === numPlayers) {
        getPlayerList(panelState.players);
    }
    if (panelState.playerStates) {
        Object.entries(panelState.playerStates).forEach(([id, data]) => {
            const el = document.getElementById(id);
            if (el) {
                el.className = data.classes;
                $(el).find('.player-select').val(data.selected);
            }
        });
    }
    $('#main-info-input').val(panelState.mainInfo || "");
    $('#game-number-input').val(panelState.gameNumber || "");
    if (panelState.overlay) {
        Object.entries(panelState.overlay).forEach(([k, v]) => {
            const el = document.getElementById('toggle-' + k.replace(/([A-Z])/g, "-$1").toLowerCase());
            if (el) el.checked = v;
        });
    }
}

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
    $('#fileToLoad').on('change', function () {
        $('.main').show();
        hideStatusesShowRoles();
    });
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

    panelState.players = selected;
    panelState.playerStates = {};
    for (let i = 1; i <= numPlayers; i++) {
        panelState.playerStates[`player_${i}`] = {
            classes: 'player-row player',
            selected: selected[i-1]
        };
    }
    savePanelStateToSupabase();

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
        const arr = textFromFileLoaded.split('\r\n');
        panelState.players = arr;
        panelState.playerStates = {};
        for (let i = 1; i <= numPlayers; i++) {
            panelState.playerStates[`player_${i}`] = {
                classes: 'player-row player',
                selected: arr[i-1]
            };
        }
        savePanelStateToSupabase();
        getPlayerList(arr);
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
    if (panelState.playerStates[element.id]) {
        panelState.playerStates[element.id].classes = element.className;
    }
    savePanelStateToSupabase();
}

function changeRole(object, role) {
    const element = object.parentElement.parentElement.parentElement.parentElement;
    if (element.classList.contains(role)) {
        element.classList.remove(role);
    } else {
        element.classList.remove('don', 'mafia', 'sheriff');
        element.classList.add(role);
    }
    if (panelState.playerStates[element.id]) {
        panelState.playerStates[element.id].classes = element.className;
    }
    savePanelStateToSupabase();
}

function clearStatus() {
    document.querySelectorAll('.killed, .voted, .deleted, .dead').forEach(item => {
        item.classList.remove('killed', 'voted', 'deleted', 'dead');
    });
    document.querySelectorAll('.best-move').forEach(item => {
        item.remove();
    });
    Object.keys(panelState.playerStates).forEach(id => {
        panelState.playerStates[id].classes = 'player-row player';
    });
    savePanelStateToSupabase();
    isFirstKill = true;
    console.log("Статусы и ЛХ сброшены");
}

function clearRole() {
    document.querySelectorAll('.don, .mafia, .sheriff').forEach(item => {
        item.classList.remove('don', 'mafia', 'sheriff');
    });
    Object.keys(panelState.playerStates).forEach(id => {
        let c = panelState.playerStates[id].classes.split(' ').filter(cls => cls !== 'don' && cls !== 'mafia' && cls !== 'sheriff');
        panelState.playerStates[id].classes = c.join(' ');
    });
    savePanelStateToSupabase();
}

$('.player-list-panel').on('change', '.player-select', function () {
    const id = $(this).parents('.player')[0].id;
    const value = $(this).find(":selected").val();
    if (panelState.playerStates[id]) {
        panelState.playerStates[id].selected = value;
    }
    savePanelStateToSupabase();
});

function sendAllData() {
    document.querySelectorAll('.player').forEach(element => {
        const item = element.querySelector('.player-select');
        const player = `${element.id}|${$(item[item.selectedIndex]).text()}`;
    });
    console.log("Данные игроков отправлены.");
}

$('#main-info-input').on('input', function () {
    panelState.mainInfo = $(this).val();
    savePanelStateToSupabase();
});

$('#game-number-input').on('input', function () {
    panelState.gameNumber = $(this).val();
    savePanelStateToSupabase();
});

function highlightSpeaker(playerNumber) {}

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

// Overlay switches
function sendOverlaySettings() {
    panelState.overlay = {
        hidePlayers: document.getElementById('toggle-hide-players').checked,
        showMainInfo: document.getElementById('toggle-main-info').checked,
        showAdditionalInfo: document.getElementById('toggle-additional-info').checked,
        showStatusPanel: document.getElementById('toggle-status-panel').checked,
        blur: document.getElementById('toggle-blur').checked
    };
    savePanelStateToSupabase();
}
$(function() {
    $('.overlay-toggles input[type="checkbox"]').on('change', sendOverlaySettings);
    sendOverlaySettings();
});

$('#reset-panel-btn').on('click', function() {
    panelState = {
        players: [],
        playerStates: {},
        mainInfo: "",
        gameNumber: "",
        overlay: {
            hidePlayers: false,
            showMainInfo: true,
            showAdditionalInfo: true,
            showStatusPanel: true,
            blur: false
        }
    };
    savePanelStateToSupabase();
    applyPanelState();
});
