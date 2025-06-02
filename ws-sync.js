// ws-sync.js — простой клиент для синхронизации состояния через WebSocket

// Автоматически определяет адрес ws/wss и порт (если работает через nginx — host будет minahor.ru)
const WS_URL = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;

// ws — глобальный WebSocket объект
let ws;
let reconnectTimeout = 1000;

/**
 * Подключает WebSocket и вызывает onSync при получении нового состояния
 * @param {function} onSync - функция, вызывается с новым состоянием (state)
 */
function connectWS(onSync) {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        reconnectTimeout = 1000;
        // console.log('WebSocket соединение установлено');
    };

    ws.onmessage = event => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'sync' && typeof onSync === "function") {
            onSync(data.state);
        }
    };

    ws.onclose = () => {
        // console.log('WebSocket закрыт, переподключение...');
        setTimeout(() => connectWS(onSync), reconnectTimeout);
        reconnectTimeout = Math.min(reconnectTimeout * 2, 15000);
    };
}

/**
 * Отправляет текущее состояние на сервер
 * @param {Object} state
 */
function sendState(state) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'update', state }));
    }
}
