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

function normalizeRole(role) {
  if (role == null) return 'unknown';
  const s = String(role).trim().toLowerCase();
  if (s === 'controller' || s === 'unity') return s;
  return 'unknown';
}

function parseJoinRoomPayload(payload) {
  // Backward compatible:
  // - "1234"
  // - { roomId: "1234", role: "controller" }
  // - { room: "1234", role: "unity" }
  // - ["1234"] or other accidental shapes
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload)) {
      return { roomId: normalizeRoomId(payload[0]), role: 'unknown' };
    }
    const roomId = normalizeRoomId(payload.roomId ?? payload.room ?? payload.id);
    const role = normalizeRole(payload.role);
    return { roomId, role };
  }
  return { roomId: normalizeRoomId(payload), role: 'unknown' };
}

function relayToJoinedRooms(socket, eventName, data) {
  const rooms = [...socket.rooms].filter((r) => r !== socket.id);
  for (const room of rooms) {
    io.to(room).emit(eventName, data);
  }
}

// Single controller per room: roomId -> socket.id (controller)
const controllerByRoom = new Map();

function kickExistingController(roomId, newControllerSocket) {
  const prevId = controllerByRoom.get(roomId);
  if (!prevId || prevId === newControllerSocket.id) return;

  const prevSocket = io.sockets.sockets.get(prevId);
  if (!prevSocket) {
    controllerByRoom.delete(roomId);
    return;
  }

  try {
    prevSocket.emit('kicked', { reason: 'replaced' });
  } catch {}

  // Give the message a moment; then disconnect.
  setTimeout(() => {
    try { prevSocket.disconnect(true); } catch {}
  }, 50);
}

io.on('connection', (socket) => {
  socket.on('join-room', (payload) => {
    const { roomId, role } = parseJoinRoomPayload(payload);
    if (!roomId) return;

    socket.data.role = role;
    socket.data.roomId = roomId;

    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    socket.join(roomId);

    if (role === 'controller') {
      kickExistingController(roomId, socket);
      controllerByRoom.set(roomId, socket.id);
    }

    console.log('User joined room:', roomId, 'role:', role);
  });

  socket.on('gyro-data', (data) => relayToJoinedRooms(socket, 'gyro-data', data));
  socket.on('gyro-calibrate', (data) => relayToJoinedRooms(socket, 'gyro-calibrate', data));
  socket.on('gyro-zoom', (data) => relayToJoinedRooms(socket, 'gyro-zoom', data));

  socket.on('disconnect', () => {
    const role = socket.data && socket.data.role;
    const roomId = socket.data && socket.data.roomId;
    if (role === 'controller' && roomId && controllerByRoom.get(roomId) === socket.id) {
      controllerByRoom.delete(roomId);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('listening on', PORT);
});
