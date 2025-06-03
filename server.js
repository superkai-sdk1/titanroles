const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const sessions = {}; // { sessionId: { ...state } }

app.use(express.static('public'));

io.on('connection', (socket) => {
  // Отправка состояния комнаты по запросу getSessionState
  socket.on('getSessionState', ({ sessionId }) => {
    if (sessions[sessionId]) {
      socket.emit('sessionState', sessions[sessionId]);
    } else {
      // Можно отправить пустое состояние или null
      socket.emit('sessionState', null);
    }
  });

  socket.on('joinSession', (sessionId) => {
    socket.join(sessionId);
    if (sessions[sessionId]) {
      socket.emit('sessionState', sessions[sessionId]);
    }
  });

  // Обработка событий панели — сохраняем state по sessionId
  socket.on('panelEvent', ({ sessionId, event }) => {
    // Для хранения полного состояния комнаты
    if (!sessions[sessionId]) sessions[sessionId] = {};
    // --- Обработка разных типов событий ---
    if (event.type === 'playerName') {
      // event.value = "player_N|Имя"
      const [id, name] = event.value.split('|');
      sessions[sessionId].players = sessions[sessionId].players || [];
      let pl = sessions[sessionId].players.find(p => p.id === id);
      if (!pl) {
        pl = { id, name: name || '', classList: '' };
        sessions[sessionId].players.push(pl);
      } else {
        pl.name = name || '';
      }
    } else if (event.type === 'playerStatus' || event.type === 'playerRole') {
      // event.id = "player_N", event.classList = "player-row player ...roles/statuses..."
      sessions[sessionId].players = sessions[sessionId].players || [];
      let pl = sessions[sessionId].players.find(p => p.id === event.id);
      if (!pl) {
        pl = { id: event.id, name: '', classList: event.classList || '' };
        sessions[sessionId].players.push(pl);
      } else {
        pl.classList = event.classList || '';
      }
    } else if (event.type === 'mainInfo') {
      sessions[sessionId].mainInfo = event.value;
    } else if (event.type === 'gameInfo') {
      sessions[sessionId].gameInfo = event.value;
    } else if (event.type === 'overlaySettings') {
      sessions[sessionId].overlaySettings = event.settings;
    } else if (event.type === 'bestMove') {
      // Можно добавить bestMove к игроку
      sessions[sessionId].players = sessions[sessionId].players || [];
      let pl = sessions[sessionId].players.find(p => p.id === event.id);
      if (pl) pl.bestMove = event.bestMove;
    }
    // Можно добавить другие типы событий аналогично

    // Перезаписываем полное состояние (players, info, settings и т.д.)
    socket.to(sessionId).emit('panelEvent', event);
  });

  socket.on('overlayEvent', ({ sessionId, event }) => {
    socket.to(sessionId).emit('overlayEvent', event);
  });

  socket.on('mobileEvent', ({ sessionId, event }) => {
    socket.to(sessionId).emit('mobileEvent', event);
  });
});

server.listen(3000, () => {
  console.log('titanroles server listening on http://minahor.ru:3000');
  console.log('Place your HTML files in the "public/" directory.');
});
