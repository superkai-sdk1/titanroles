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
  socket.on('joinSession', (sessionId) => {
    socket.join(sessionId);
    if (sessions[sessionId]) {
      socket.emit('sessionState', sessions[sessionId]);
    }
  });

  socket.on('panelEvent', ({ sessionId, event }) => {
    sessions[sessionId] = { ...sessions[sessionId], ...event };
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
