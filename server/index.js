'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const {
  createGame,
  handleMove,
  handleTimerExpiry,
  TURN_TIMER_SECONDS,
} = require('./gameEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Serve static React build
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// rooms: Map<roomId, { state, players: string[], timerInterval }>
const rooms = new Map();

function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('GAME_STATE_UPDATE', { state: room.state });
}

function startTurnTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  clearInterval(room.timerInterval);
  room.state.turnTimer = TURN_TIMER_SECONDS;

  room.timerInterval = setInterval(() => {
    const r = rooms.get(roomId);
    if (!r || r.state.status !== 'playing') {
      clearInterval(r && r.timerInterval);
      return;
    }

    r.state.turnTimer -= 1;

    if (r.state.turnTimer <= 0) {
      clearInterval(r.timerInterval);
      r.timerInterval = null;
      handleTimerExpiry(r.state);
      broadcastState(roomId);
      if (r.state.status === 'playing') {
        startTurnTimer(roomId);
      }
    } else {
      io.to(roomId).emit('TIMER_TICK', { turnTimer: r.state.turnTimer });
    }
  }, 1000);
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('JOIN_GAME', ({ playerName }) => {
    let joinedRoomId = null;

    // Find a room waiting for a second player
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.length === 1 && room.state.status === 'waiting') {
        joinedRoomId = roomId;
        break;
      }
    }

    if (!joinedRoomId) {
      // Create new room
      joinedRoomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const state = createGame();
      rooms.set(joinedRoomId, {
        state,
        players: [],
        timerInterval: null,
      });
    }

    const room = rooms.get(joinedRoomId);
    const playerIndex = room.players.length;
    room.players.push(socket.id);
    room.state.players[playerIndex].id = socket.id;
    room.state.players[playerIndex].name = (playerName && playerName.trim()) || `Player ${playerIndex + 1}`;

    socket.join(joinedRoomId);
    socket.data.roomId = joinedRoomId;
    socket.data.playerIndex = playerIndex;

    socket.emit('JOINED_GAME', {
      roomId: joinedRoomId,
      playerIndex,
      playerId: socket.id,
    });

    if (room.players.length === 2) {
      room.state.status = 'playing';
      broadcastState(joinedRoomId);
      startTurnTimer(joinedRoomId);
    } else {
      broadcastState(joinedRoomId);
    }
  });

  socket.on('SUBMIT_MOVE', ({ selectedCoinIds }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const result = handleMove(room.state, socket.id, selectedCoinIds || []);

    if (result.success) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      broadcastState(roomId);
      if (room.state.status === 'playing') {
        startTurnTimer(roomId);
      }
    } else {
      socket.emit('MOVE_ERROR', { error: result.error });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    clearInterval(room.timerInterval);
    io.to(roomId).emit('PLAYER_DISCONNECTED', { playerId: socket.id });
    rooms.delete(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`Sphere Break server running on port ${PORT}`);
});

module.exports = { app, server, io };
