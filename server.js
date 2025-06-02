const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let state = null; // Общее состояние панели (players, overlay и др.)

wss.on('connection', ws => {
    if (state) ws.send(JSON.stringify({ type: 'sync', state }));

    ws.on('message', msg => {
        let data;
        try { data = JSON.parse(msg); } catch { return; }
        if (data.type === 'update') {
            state = data.state;
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'sync', state }));
                }
            });
        }
    });
});

// Раздаём всю статику из текущей папки
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Сервер запущен на http://localhost:' + PORT);
});