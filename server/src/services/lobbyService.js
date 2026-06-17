'use strict';

const crypto = require('crypto');
const {
  createMatch,
  addPlayer,
  setPlayerReady,
  canStart,
  startMatch,
  getPublicState,
  getCurrentPlayer,
  processMove,
  applyTurnTimeout,
  completeMatch,
} = require('../domain/matchEngine');
const { normalizeSettings, sanitizeDisplayName, MATCH_STATUS } = require('../contracts/gameTypes');
const { AntiCheat } = require('../domain/antiCheat');
const { pickBotMove } = require('../domain/botEngine');
const { updateLeaderboardFromMatch } = require('./leaderboardService');
const { addReplayEvent } = require('./replayService');

class LobbyService {
  constructor() {
    this.matches = new Map();
    this.playerToMatch = new Map();
    this.socketToPlayer = new Map();
    this.queue = [];
    this.antiCheat = new AntiCheat();
  }

  createOrResumeSession({ playerId, displayName, socketId }) {
    const safeId = (playerId && String(playerId)) || crypto.randomUUID();
    const safeName = sanitizeDisplayName(displayName);
    this.socketToPlayer.set(socketId, safeId);
    return { playerId: safeId, displayName: safeName };
  }

  createMatch({ hostPlayerId, displayName, settings, mode, botDifficulty }) {
    const code = this.generateCode();
    const normalized = normalizeSettings(settings);
    normalized.ranked = Boolean(mode === 'ranked' || normalized.ranked);

    const match = createMatch({
      code,
      hostPlayer: { id: hostPlayerId, displayName: sanitizeDisplayName(displayName), ready: false },
      settings: normalized,
      mode: normalized.ranked ? 'ranked' : (mode || 'casual'),
      botDifficulty,
    });

    this.matches.set(match.id, match);
    this.playerToMatch.set(hostPlayerId, match.id);
    return match;
  }

  queuePlayer({ playerId, displayName, settings, mode = 'casual' }) {
    const normalized = normalizeSettings(settings);
    this.queue.push({ playerId, displayName: sanitizeDisplayName(displayName), settings: normalized, mode, at: Date.now() });

    if (this.queue.length < 2) return { matched: false };

    const first = this.queue.shift();
    const second = this.queue.shift();
    const match = this.createMatch({
      hostPlayerId: first.playerId,
      displayName: first.displayName,
      settings: first.settings,
      mode,
    });

    this.joinMatch({ code: match.code, playerId: second.playerId, displayName: second.displayName });
    return { matched: true, match };
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let value = '';
    for (let i = 0; i < 6; i += 1) {
      value += chars[Math.floor(Math.random() * chars.length)];
    }
    return value;
  }

  findMatchByCode(code) {
    for (const match of this.matches.values()) {
      if (match.code === code) return match;
    }
    return null;
  }

  joinMatch({ code, playerId, displayName, socketId }) {
    const match = this.findMatchByCode(code);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== MATCH_STATUS.WAITING && !match.players.has(playerId)) {
      throw new Error('Match already started');
    }

    const player = addPlayer(match, {
      id: playerId,
      displayName: sanitizeDisplayName(displayName),
      socketId,
      connected: true,
      ready: false,
    });

    this.playerToMatch.set(playerId, match.id);
    return { match, player };
  }

  reconnectPlayer({ playerId, socketId }) {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return null;
    const match = this.matches.get(matchId);
    if (!match) return null;
    const player = match.players.get(playerId);
    if (!player) return null;

    player.socketId = socketId;
    player.connected = true;
    addReplayEvent(match, 'player_reconnected', { playerId });
    return { match, player };
  }

  setReady({ playerId, ready }) {
    const match = this.getMatchForPlayer(playerId);
    if (!match) return null;
    setPlayerReady(match, playerId, ready);

    if (canStart(match)) {
      match.status = MATCH_STATUS.STARTING;
      match.countdownEndsAt = Date.now() + 3000;
    }

    return match;
  }

  activateStartedMatches() {
    const now = Date.now();
    const started = [];

    for (const match of this.matches.values()) {
      if (match.status === MATCH_STATUS.STARTING && now >= match.countdownEndsAt) {
        startMatch(match);
        started.push(match);
      }
    }

    return started;
  }

  getMatchForPlayer(playerId) {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return null;
    return this.matches.get(matchId) || null;
  }

  getPublicStateForPlayer(playerId) {
    const match = this.getMatchForPlayer(playerId);
    if (!match) return null;
    return getPublicState(match, playerId);
  }

  processMove({ playerId, move }) {
    const match = this.getMatchForPlayer(playerId);
    if (!match) return { ok: false, reason: 'Match not found' };

    if (!this.antiCheat.checkRateLimit(playerId, 'SUBMIT_MOVE', 30, 4000)) {
      this.antiCheat.flag(match, playerId, 'request_flooding');
      return { ok: false, reason: 'Too many move requests', suspicious: true };
    }

    if (!this.antiCheat.registerNonce(match.id, playerId, move.nonce)) {
      this.antiCheat.flag(match, playerId, 'duplicate_nonce');
      return { ok: false, reason: 'Duplicate move nonce', suspicious: true };
    }

    const result = processMove(match, playerId, move);
    if (!result.ok && result.suspicious) {
      this.antiCheat.flag(match, playerId, result.reason.toLowerCase().replace(/\s+/g, '_'));
    }

    if (match.status === MATCH_STATUS.COMPLETED) {
      void updateLeaderboardFromMatch(match);
    }

    return { ...result, match };
  }

  applyTimeouts() {
    const now = Date.now();
    const changed = [];

    for (const match of this.matches.values()) {
      if (match.status !== MATCH_STATUS.ACTIVE) continue;
      if (!match.turnEndsAt || now < match.turnEndsAt) continue;
      const current = getCurrentPlayer(match);
      if (!current) continue;

      applyTurnTimeout(match, current.id);
      if (match.status === MATCH_STATUS.COMPLETED) {
        void updateLeaderboardFromMatch(match);
      }
      changed.push(match);
    }

    return changed;
  }

  async maybeRunBotTurn(match) {
    if (!match || match.status !== MATCH_STATUS.ACTIVE || !match.botDifficulty) return null;
    const current = getCurrentPlayer(match);
    if (!current || !current.isBot) return null;

    const botMove = pickBotMove(match.board, match.botDifficulty);
    if (!botMove) {
      applyTurnTimeout(match, current.id);
      return { timeout: true };
    }

    return this.processMove({
      playerId: current.id,
      move: {
        selectedTokenIds: botMove.selectedTokenIds,
        nonce: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        boardVersion: match.board.version,
      },
    });
  }

  requestRematch(playerId) {
    const match = this.getMatchForPlayer(playerId);
    if (!match || match.status !== MATCH_STATUS.COMPLETED) return null;
    match.rematchVotes.add(playerId);
    if (match.rematchVotes.size < 2) return match;

    const settings = match.settings;
    const mode = match.mode;
    const players = Array.from(match.players.values()).filter((p) => !p.isBot);
    const next = this.createMatch({
      hostPlayerId: players[0].id,
      displayName: players[0].displayName,
      settings,
      mode,
      botDifficulty: match.botDifficulty,
    });

    if (players[1]) {
      this.joinMatch({
        code: next.code,
        playerId: players[1].id,
        displayName: players[1].displayName,
      });
    }

    return next;
  }

  disconnect(socketId) {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return null;
    this.socketToPlayer.delete(socketId);

    const match = this.getMatchForPlayer(playerId);
    if (!match) return null;

    const player = match.players.get(playerId);
    if (!player) return null;

    player.connected = false;
    player.disconnectAbuseCount += 1;

    if (match.status === MATCH_STATUS.ACTIVE && player.disconnectAbuseCount > 2) {
      this.antiCheat.flag(match, playerId, 'disconnect_abuse');
    }

    const activeHumans = Array.from(match.players.values()).filter((p) => !p.isBot && p.connected);
    if (activeHumans.length === 0 && match.status !== MATCH_STATUS.COMPLETED) {
      completeMatch(match, 'abandoned');
    }

    return { match, playerId };
  }
}

module.exports = { LobbyService };
