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
const { pickBotMove, getBotThinkDelayMs, generateBotHandle } = require('../domain/botEngine');
const { updateLeaderboardFromMatch } = require('./leaderboardService');
const { addReplayEvent } = require('./replayService');
const { getRanksForUsers } = require('./rankService');

class LobbyService {
  constructor(options = {}) {
    this.matches = new Map();
    this.playerToMatch = new Map();
    this.socketToPlayer = new Map();
    this.queue = [];
    this.antiCheat = new AntiCheat();
    this.random = typeof options.random === 'function' ? options.random : Math.random;
    this.cpuFallbackMs = Number.isFinite(options.cpuFallbackMs) ? options.cpuFallbackMs : 60000;
    this.setTimeoutFn = options.setTimeoutFn || setTimeout;
    this.clearTimeoutFn = options.clearTimeoutFn || clearTimeout;
    this.waitingCpuTimers = new Map();
    this.pendingBotTurns = new Map();
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
    this.refreshWaitingCpuFallback(match);
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
    this.refreshWaitingCpuFallback(match);
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

    this.refreshWaitingCpuFallback(match);
    return match;
  }

  activateStartedMatches() {
    const now = Date.now();
    const started = [];

    for (const match of this.matches.values()) {
      if (match.status === MATCH_STATUS.STARTING && now >= match.countdownEndsAt) {
        startMatch(match);
        this.refreshWaitingCpuFallback(match);
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

  async getPublicStateForPlayer(playerId, rankByPlayerId = null) {
    const match = this.getMatchForPlayer(playerId);
    if (!match) return null;
    const resolvedRanks = rankByPlayerId || await this.getRankMapForPlayers(Array.from(match.players.values()));
    return getPublicState(match, playerId, resolvedRanks);
  }

  async getRankMapForPlayers(players = []) {
    return getRanksForUsers(players.map((player) => ({ id: player.id })));
  }

  async buildLobbyList() {
    const openMatches = Array.from(this.matches.values()).filter((match) => match.status === MATCH_STATUS.WAITING);
    const rankMap = await this.getRankMapForPlayers(openMatches.flatMap((match) => Array.from(match.players.values())));

    return openMatches.map((match) => ({
      id: match.id,
      code: match.code,
      mode: match.mode,
      players: Array.from(match.players.values()).map((player) => ({
        id: player.id,
        displayName: player.displayName,
        ready: player.ready,
        isBot: player.isBot,
        playerRank: rankMap[player.id] || null,
      })),
      maxPlayers: match.settings.maxPlayers,
      ranked: match.settings.ranked,
    }));
  }

  processMove({ playerId, move }) {
    const match = this.getMatchForPlayer(playerId);
    if (!match) return { ok: false, reason: 'Match not found' };
    return this.processMoveOnMatch({ match, playerId, move, enforceAntiCheat: true });
  }

  processMoveOnMatch({ match, playerId, move, enforceAntiCheat }) {
    if (enforceAntiCheat) {
      if (!this.antiCheat.checkRateLimit(playerId, 'SUBMIT_MOVE', 30, 4000)) {
        this.antiCheat.flag(match, playerId, 'request_flooding');
        return { ok: false, reason: 'Too many move requests', suspicious: true, match };
      }

      if (!this.antiCheat.registerNonce(match.id, playerId, move.nonce)) {
        this.antiCheat.flag(match, playerId, 'duplicate_nonce');
        return { ok: false, reason: 'Duplicate move nonce', suspicious: true, match };
      }
    }

    const result = processMove(match, playerId, move);
    if (!result.ok && result.suspicious && enforceAntiCheat) {
      this.antiCheat.flag(match, playerId, result.reason.toLowerCase().replace(/\s+/g, '_'));
    }

    if (match.status === MATCH_STATUS.COMPLETED) {
      void updateLeaderboardFromMatch(match);
      this.antiCheat.cleanupMatch(match.id, Array.from(match.players.keys()));
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
        this.antiCheat.cleanupMatch(match.id, Array.from(match.players.keys()));
      }
      changed.push(match);
    }

    return changed;
  }

  async maybeRunBotTurn(match) {
    if (!match || match.status !== MATCH_STATUS.ACTIVE) {
      if (match) this.pendingBotTurns.delete(match.id);
      return null;
    }
    const current = getCurrentPlayer(match);
    if (!current || !current.isBot) return null;

    const turnKey = `${match.id}:${match.turnCount}:${current.id}:${match.board.version}`;
    const botDifficulty = current.botDifficulty || match.botDifficulty || 'normal';
    const pending = this.pendingBotTurns.get(match.id);
    if (!pending || pending.turnKey !== turnKey) {
      this.pendingBotTurns.set(match.id, {
        turnKey,
        executeAt: Date.now() + getBotThinkDelayMs({
          secondsPerTurn: match.settings.secondsPerTurn,
          difficulty: botDifficulty,
          random: this.random,
        }),
      });
      return null;
    }

    if (Date.now() < pending.executeAt) {
      return null;
    }

    this.pendingBotTurns.delete(match.id);

    const botMove = pickBotMove(match.board, botDifficulty, this.random);
    if (!botMove) {
      applyTurnTimeout(match, current.id);
      return { timeout: true, match };
    }

    return this.processMoveOnMatch({
      match,
      playerId: current.id,
      move: {
        selectedTokenIds: botMove.selectedTokenIds,
        nonce: `bot-${Date.now()}-${this.random().toString(36).slice(2, 8)}`,
        boardVersion: match.board.version,
      },
      enforceAntiCheat: false,
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
      this.antiCheat.cleanupMatch(match.id, Array.from(match.players.keys()));
    }

    this.refreshWaitingCpuFallback(match);
    return { match, playerId };
  }

  countHumans(match) {
    return Array.from(match.players.values()).filter((player) => !player.isBot).length;
  }

  needsWaitingCpuFallback(match) {
    if (!match || match.status !== MATCH_STATUS.WAITING) return false;
    if (this.countHumans(match) !== 1) return false;
    if (match.players.size >= match.settings.maxPlayers) return false;
    return !Array.from(match.players.values()).some((player) => player.isBot);
  }

  refreshWaitingCpuFallback(match) {
    if (!match) return;
    const existing = this.waitingCpuTimers.get(match.id);

    if (this.needsWaitingCpuFallback(match)) {
      if (existing) return;
      const timer = this.setTimeoutFn(() => {
        this.waitingCpuTimers.delete(match.id);
        this.injectCpuFallback(match.id);
      }, this.cpuFallbackMs);
      this.waitingCpuTimers.set(match.id, timer);
      return;
    }

    if (existing) {
      this.clearTimeoutFn(existing);
      this.waitingCpuTimers.delete(match.id);
    }
  }

  injectCpuFallback(matchId) {
    const match = this.matches.get(matchId);
    if (!match || !this.needsWaitingCpuFallback(match)) return null;

    const profile = this.generateCpuProfile();
    const botPlayer = addPlayer(match, {
      id: profile.id,
      displayName: profile.displayName,
      isBot: true,
      ready: true,
      connected: true,
      botDifficulty: 'normal',
    });

    this.playerToMatch.set(botPlayer.id, match.id);
    addReplayEvent(match, 'cpu_fallback_joined', { playerId: botPlayer.id, displayName: botPlayer.displayName });

    if (canStart(match)) {
      match.status = MATCH_STATUS.STARTING;
      match.countdownEndsAt = Date.now() + 3000;
    }

    this.refreshWaitingCpuFallback(match);
    return botPlayer;
  }

  generateCpuProfile() {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const displayName = generateBotHandle(this.random);
      const id = `cpu-${displayName.toLowerCase()}`;
      const existingMatchId = this.playerToMatch.get(id);
      if (!existingMatchId) return { id, displayName };
      const existingMatch = this.matches.get(existingMatchId);
      if (!existingMatch || existingMatch.status === MATCH_STATUS.COMPLETED || existingMatch.status === MATCH_STATUS.ABANDONED) {
        return { id, displayName };
      }
    }

    const fallback = generateBotHandle(this.random);
    return {
      id: `cpu-${fallback.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
      displayName: fallback,
    };
  }
}

module.exports = { LobbyService };
