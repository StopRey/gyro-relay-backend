'use strict';

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.get('/', (req, res) => res.type('text').send('OK'));
app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function normalizeRoomId(roomId) {
  if (roomId == null) return '';
  const s = String(roomId).trim();
  return s ? s.slice(0, 64) : '';
}

function relayToJoinedRooms(socket, eventName, data) {
  const rooms = [...socket.rooms].filter((r) => r !== socket.id);
  for (const room of rooms) {
    io.to(room).emit(eventName, data);
  }
}

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    const id = normalizeRoomId(roomId);
    if (!id) return;
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    socket.join(id);
    console.log('User joined room:', id);
  });

  socket.on('gyro-data', (data) => relayToJoinedRooms(socket, 'gyro-data', data));
  socket.on('gyro-calibrate', (data) => relayToJoinedRooms(socket, 'gyro-calibrate', data));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('listening on', PORT);
});
