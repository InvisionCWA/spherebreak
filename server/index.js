'use strict';

// Validate required environment variables before anything else initialises.
const REQUIRED_ENV = ['DATABASE_URL'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(
    `[server] Warning: missing environment variable(s): ${missingEnv.join(', ')}. ` +
    'Copy server/.env.example to server/.env and set the required values.',
  );
}

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

// Per-player cooldown for rematch requests (prevents spam-clicking)
const rematchLastAt = new Map();
const REMATCH_COOLDOWN_MS = 5000;

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

app.use('/marketing', express.static(path.join(__dirname, '..', 'marketing')));

app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// Generic error handler — must have 4 parameters so Express recognises it as an
// error-handling middleware and never expose internal stack traces to clients.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

async function emitState(match) {
  const players = Array.from(match.players.values()).filter((player) => player.socketId);
  const rankMap = await lobby.getRankMapForPlayers(players);
  const states = await Promise.all(players.map((player) => lobby.getPublicStateForPlayer(player.id, rankMap)));

  players.forEach((player, index) => {
    io.to(player.socketId).emit('GAME_STATE_UPDATE', {
      state: states[index],
      serverTime: Date.now(),
    });
  });
}

async function emitLobbyList() {
  const open = await lobby.buildLobbyList();
  io.emit('LOBBY_LIST_UPDATE', { matches: open });
}

io.on('connection', (socket) => {
  socket.on('CLIENT_HELLO', ({ playerId, displayName }) => {
    const session = lobby.createOrResumeSession({ playerId, displayName, socketId: socket.id });
    socket.data.playerId = session.playerId;
    socket.emit('SESSION_READY', session);

    const reconnection = lobby.reconnectPlayer({ playerId: session.playerId, socketId: socket.id });
    if (reconnection) {
      void emitState(reconnection.match);
    }

    void emitLobbyList();
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
      void emitState(match);
      void emitLobbyList();
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
      void emitState(result.match);
      void emitLobbyList();
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
      void emitState(match);
      void emitLobbyList();
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
    void emitLobbyList();
  });

  socket.on('SUBMIT_MOVE', (move) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const result = lobby.processMove({ playerId, move });
    if (!result.ok) {
      socket.emit('MOVE_REJECTED', { reason: result.reason, preview: result.preview || null });
      return;
    }

    // Send the actual score breakdown back to the submitting player immediately
    // so the lastMove display is never zeroed out.
    socket.emit('MOVE_ACCEPTED', { moveResult: result.moveResult });

    emitState(result.match);

    void lobby.maybeRunBotTurn(result.match).then((botResult) => {
      if (botResult && botResult.match) {
        void emitState(botResult.match);
      }
    });
  });

  socket.on('REQUEST_REMATCH', () => {
    const playerId = socket.data.playerId;
    if (!playerId) return;

    const now = Date.now();
    const lastAt = rematchLastAt.get(playerId) || 0;
    if (now - lastAt < REMATCH_COOLDOWN_MS) {
      socket.emit('REQUEST_ERROR', { error: 'Rematch requested too soon. Please wait a moment.' });
      return;
    }
    rematchLastAt.set(playerId, now);

    const rematch = lobby.requestRematch(playerId);
    if (!rematch) return;
    void emitState(rematch);
    void emitLobbyList();
  });

  socket.on('disconnect', () => {
    const result = lobby.disconnect(socket.id);
    if (result?.playerId) rematchLastAt.delete(result.playerId);
    if (result?.match) {
      void emitState(result.match);
      void emitLobbyList();
    }
  });
});

setInterval(() => {
  const activated = lobby.activateStartedMatches();
  activated.forEach((match) => void emitState(match));

  const timedOut = lobby.applyTimeouts();
  timedOut.forEach((match) => void emitState(match));

  for (const match of lobby.matches.values()) {
    if (match.status === MATCH_STATUS.ACTIVE) {
      void lobby.maybeRunBotTurn(match).then((botResult) => {
        if (botResult?.match) void emitState(botResult.match);
      });
    }
  }
}, 250);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Celestial Break server listening on ${PORT}`);
});

module.exports = { app, server, io };
