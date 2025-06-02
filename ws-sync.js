// ws-sync.js — простой клиент для синхронизации состояния через WebSocket

const WS_URL = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;

let ws;
let reconnectTimeout = 1000;

function connectWS(onSync) {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        reconnectTimeout = 1000;
    };

    ws.onmessage = event => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'sync' && typeof onSync === "function") {
            onSync(data.state);
        }
    };

    ws.onclose = () => {
        setTimeout(() => connectWS(onSync), reconnectTimeout);
        reconnectTimeout = Math.min(reconnectTimeout * 2, 15000);
    };
}

function sendState(state) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'update', state }));
    }
}

// Экспортируем методы для использования в других скриптах
window.connectWS = connectWS;
window.sendState = sendState;
