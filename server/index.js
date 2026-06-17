'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { LobbyService } = require('./src/services/lobbyService');
const { getLeaderboard, getProfile } = require('./src/services/leaderboardService');
const { MATCH_STATUS } = require('./src/contracts/gameTypes');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;
const lobby = new LobbyService();

const httpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(httpLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'celestial-break-server' });
});

app.get('/api/leaderboard', async (req, res) => {
  const period = String(req.query.period || 'all-time');
  const rows = await getLeaderboard({ period });
  res.json({ period, entries: rows });
});

app.get('/api/profile/:id', async (req, res) => {
  const profile = await getProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
});

app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

function emitState(match) {
  for (const player of match.players.values()) {
    if (!player.socketId) continue;
    io.to(player.socketId).emit('GAME_STATE_UPDATE', {
      state: lobby.getPublicStateForPlayer(player.id),
      serverTime: Date.now(),
    });
  }
}

function emitLobbyList() {
  const open = [];
  for (const match of lobby.matches.values()) {
    if (match.status !== MATCH_STATUS.WAITING) continue;
    open.push({
      id: match.id,
      code: match.code,
      mode: match.mode,
      players: Array.from(match.players.values()).map((p) => ({ id: p.id, displayName: p.displayName, ready: p.ready })),
      maxPlayers: match.settings.maxPlayers,
      ranked: match.settings.ranked,
    });
  }
  io.emit('LOBBY_LIST_UPDATE', { matches: open });
}

io.on('connection', (socket) => {
  socket.on('CLIENT_HELLO', ({ playerId, displayName }) => {
    const session = lobby.createOrResumeSession({ playerId, displayName, socketId: socket.id });
    socket.data.playerId = session.playerId;
    socket.emit('SESSION_READY', session);

    const reconnection = lobby.reconnectPlayer({ playerId: session.playerId, socketId: socket.id });
    if (reconnection) {
      emitState(reconnection.match);
    }

    emitLobbyList();
  });

  socket.on('CREATE_MATCH', ({ displayName, settings, mode, botDifficulty }) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      socket.emit('REQUEST_ERROR', { error: 'Session required' });
      return;
    }

    try {
      const match = lobby.createMatch({
        hostPlayerId: playerId,
        displayName,
        settings,
        mode,
        botDifficulty,
      });
      lobby.joinMatch({ code: match.code, playerId, displayName, socketId: socket.id });
      emitState(match);
      emitLobbyList();
    } catch (error) {
      socket.emit('REQUEST_ERROR', { error: error.message });
    }
  });

  socket.on('QUEUE_MATCH', ({ displayName, settings, mode }) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      socket.emit('REQUEST_ERROR', { error: 'Session required' });
      return;
    }

    const result = lobby.queuePlayer({ playerId, displayName, settings, mode });
    if (result.matched) {
      emitState(result.match);
      emitLobbyList();
    } else {
      socket.emit('QUEUE_WAITING', { queued: true });
    }
  });

  socket.on('JOIN_MATCH', ({ code, displayName }) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      socket.emit('REQUEST_ERROR', { error: 'Session required' });
      return;
    }

    try {
      const { match } = lobby.joinMatch({ code, playerId, displayName, socketId: socket.id });
      emitState(match);
      emitLobbyList();
    } catch (error) {
      socket.emit('REQUEST_ERROR', { error: error.message });
    }
  });

  socket.on('TOGGLE_READY', ({ ready }) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const match = lobby.setReady({ playerId, ready });
    if (!match) return;
    emitState(match);
    emitLobbyList();
  });

  socket.on('SUBMIT_MOVE', (move) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const result = lobby.processMove({ playerId, move });
    if (!result.ok) {
      socket.emit('MOVE_REJECTED', { reason: result.reason, preview: result.preview || null });
      return;
    }

    emitState(result.match);

    void lobby.maybeRunBotTurn(result.match).then((botResult) => {
      if (botResult && botResult.match) {
        emitState(botResult.match);
      }
    });
  });

  socket.on('REQUEST_REMATCH', () => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const rematch = lobby.requestRematch(playerId);
    if (!rematch) return;
    emitState(rematch);
    emitLobbyList();
  });

  socket.on('disconnect', () => {
    const result = lobby.disconnect(socket.id);
    if (result?.match) {
      emitState(result.match);
      emitLobbyList();
    }
  });
});

setInterval(() => {
  const activated = lobby.activateStartedMatches();
  activated.forEach((match) => emitState(match));

  const timedOut = lobby.applyTimeouts();
  timedOut.forEach((match) => emitState(match));

  for (const match of lobby.matches.values()) {
    if (match.status === MATCH_STATUS.ACTIVE) {
      void lobby.maybeRunBotTurn(match).then((botResult) => {
        if (botResult?.match) emitState(botResult.match);
      });
    }
  }
}, 250);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Celestial Break server listening on ${PORT}`);
});

module.exports = { app, server, io };
