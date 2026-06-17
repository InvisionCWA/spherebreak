'use strict';

const crypto = require('crypto');
const { createBoard, validateMoveInput, calculateSelection, applyBoardMutation } = require('./rulesEngine');
const { calculateScore } = require('./scoring');
const { addReplayEvent } = require('../services/replayService');
const { MATCH_STATUS } = require('../contracts/gameTypes');

function createMatch({ code, hostPlayer, settings, mode = 'casual', botDifficulty = null, random = Math.random }) {
  const board = createBoard(settings, random);
  const match = {
    id: crypto.randomUUID(),
    code,
    mode,
    settings,
    status: MATCH_STATUS.WAITING,
    createdAt: Date.now(),
    completedByServer: false,
    players: new Map(),
    turnOrder: [],
    currentTurnIndex: 0,
    turnStartedAt: null,
    turnEndsAt: null,
    turnCount: 0,
    board,
    winnerId: null,
    replay: [],
    suspiciousFlags: [],
    rematchVotes: new Set(),
    botDifficulty,
    seed: crypto.randomUUID(),
  };

  addPlayer(match, hostPlayer);
  if (botDifficulty) {
    const { generateBotHandle } = require('./botEngine');
    addPlayer(match, {
      id: `bot-${match.id}`,
      displayName: generateBotHandle(),
      socketId: null,
      isBot: true,
      ready: true,
      connected: true,
      botDifficulty,
    });
  }

  return match;
}

function addPlayer(match, { id, displayName, socketId, isBot = false, ready = false, connected = true, botDifficulty = null }) {
  if (match.players.has(id)) {
    const existing = match.players.get(id);
    existing.socketId = socketId || existing.socketId;
    existing.connected = connected;
    return existing;
  }
  if (match.players.size >= match.settings.maxPlayers) {
    throw new Error('Match full');
  }

  const player = {
    id,
    displayName,
    socketId,
    isBot,
    ready,
    connected,
    botDifficulty,
    score: 0,
    combo: 0,
    streak: 0,
    bestCombo: 0,
    bestStreak: 0,
    quotaProgress: 0,
    invalidMoves: 0,
    fastestBreakMs: null,
    disconnectAbuseCount: 0,
    lastBreakTokenCount: null,
    lastBreakAchievedMultiple: null,
  };

  match.players.set(id, player);
  match.turnOrder.push(id);
  addReplayEvent(match, 'player_joined', { playerId: id, displayName });
  return player;
}

function setPlayerReady(match, playerId, ready) {
  const player = match.players.get(playerId);
  if (!player) return false;
  player.ready = Boolean(ready);
  addReplayEvent(match, 'player_ready', { playerId, ready: player.ready });
  return true;
}

function canStart(match) {
  if (match.status !== MATCH_STATUS.WAITING) return false;
  if (match.players.size < 2) return false;
  for (const player of match.players.values()) {
    if (!player.ready) return false;
  }
  return true;
}

function startMatch(match) {
  match.status = MATCH_STATUS.ACTIVE;
  match.turnCount = 1;
  match.turnStartedAt = Date.now();
  match.turnEndsAt = match.turnStartedAt + match.settings.secondsPerTurn * 1000;
  addReplayEvent(match, 'match_started', {});
}

function getCurrentPlayer(match) {
  const id = match.turnOrder[match.currentTurnIndex % match.turnOrder.length];
  return match.players.get(id);
}

function getPublicState(match, viewerId = null, rankByPlayerId = {}) {
  const currentPlayer = getCurrentPlayer(match);
  const turnsLeft = Math.max(0, match.settings.turnLimit - match.turnCount + 1);
  return {
    id: match.id,
    code: match.code,
    mode: match.mode,
    status: match.status,
    settings: match.settings,
    turnCount: match.turnCount,
    turnsLeft,
    currentTurnPlayerId: currentPlayer?.id || null,
    turnEndsAt: match.turnEndsAt,
    countdownEndsAt: match.countdownEndsAt || null,
    board: match.board,
    winnerId: match.winnerId,
    players: Array.from(match.players.values()).map((player) => ({
      id: player.id,
      displayName: player.displayName,
      score: player.score,
      combo: player.combo,
      streak: player.streak,
      quotaProgress: player.quotaProgress,
      ready: player.ready,
      connected: player.connected,
      isBot: player.isBot,
      isSelf: player.id === viewerId,
      playerRank: rankByPlayerId[player.id] || null,
    })),
  };
}

function passTurn(match) {
  match.currentTurnIndex = (match.currentTurnIndex + 1) % match.turnOrder.length;
  match.turnCount += 1;
  const now = Date.now();
  match.turnStartedAt = now;
  match.turnEndsAt = now + match.settings.secondsPerTurn * 1000;
}

function shouldComplete(match) {
  const quotaMet = Array.from(match.players.values()).find((p) => p.quotaProgress >= match.settings.quotaToWin);
  if (quotaMet) {
    match.winnerId = quotaMet.id;
    return true;
  }

  if (match.turnCount > match.settings.turnLimit) {
    const sorted = Array.from(match.players.values()).sort((a, b) => b.score - a.score);
    match.winnerId = sorted[0]?.id || null;
    return true;
  }

  return false;
}

function completeMatch(match, reason = 'completed') {
  match.status = reason === 'abandoned' ? MATCH_STATUS.ABANDONED : MATCH_STATUS.COMPLETED;
  match.completedByServer = reason !== 'abandoned';
  addReplayEvent(match, 'match_completed', {
    reason,
    winnerId: match.winnerId,
  });
}

function applyTurnTimeout(match, playerId) {
  const current = getCurrentPlayer(match);
  if (!current || current.id !== playerId) return null;

  current.combo = 0;
  current.streak = 0;
  addReplayEvent(match, 'turn_timeout', { playerId });

  passTurn(match);
  if (shouldComplete(match)) completeMatch(match);

  return {
    ok: true,
    timeout: true,
    playerId,
  };
}

function processMove(match, playerId, move) {
  const validationError = validateMoveInput(move);
  if (validationError) return { ok: false, reason: validationError, suspicious: false };

  if (match.status !== MATCH_STATUS.ACTIVE) {
    return { ok: false, reason: 'Match not active', suspicious: true };
  }

  const currentPlayer = getCurrentPlayer(match);
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { ok: false, reason: 'Not your turn', suspicious: true };
  }

  const now = Date.now();
  if (now > match.turnEndsAt) {
    return { ok: false, reason: 'Turn window expired', suspicious: true };
  }

  if (move.boardVersion !== match.board.version) {
    return { ok: false, reason: 'Stale board version', suspicious: true };
  }

  const selection = calculateSelection(match.board, move.selectedTokenIds);
  if (selection.error) {
    return { ok: false, reason: selection.error, suspicious: false };
  }

  if (!selection.isValidBreak) {
    currentPlayer.invalidMoves += 1;
    currentPlayer.combo = 0;
    currentPlayer.streak = 0;
    return {
      ok: false,
      reason: `Selection sum ${selection.sum} is not a multiple of ${match.board.targetNumber}`,
      suspicious: false,
      preview: {
        sum: selection.sum,
        nearestMultiple: selection.nearestMultiple,
      },
    };
  }

  const reactionMs = now - match.turnStartedAt;
  currentPlayer.fastestBreakMs = currentPlayer.fastestBreakMs == null
    ? reactionMs
    : Math.min(currentPlayer.fastestBreakMs, reactionMs);

  const tokenCount = selection.selectedTokens.length;
  const achievedMultiple = selection.achievedMultiple;

  // Combo rule: server determines whether combo increases or resets based on
  // the configured comboRuleType.  Invalid moves and timeouts reset combo to 0;
  // a valid break either continues the existing combo (same pattern) or starts
  // a fresh one at comboStep (pattern changed).
  const { comboRuleType, comboStep } = match.settings.comboRules;
  let comboIncreased = false;
  let comboContinued = false;

  if (comboRuleType === 'achieved-multiple') {
    if (currentPlayer.combo === 0 || (currentPlayer.lastBreakAchievedMultiple !== null && currentPlayer.lastBreakAchievedMultiple === achievedMultiple)) {
      currentPlayer.combo += comboStep;
      comboIncreased = true;
      comboContinued = currentPlayer.lastBreakAchievedMultiple !== null;
    } else {
      currentPlayer.combo = comboStep;
      comboIncreased = false;
      comboContinued = false;
    }
    currentPlayer.lastBreakAchievedMultiple = achievedMultiple;
  } else {
    // Default: 'token-count' rule — same number of tokens used as previous
    // valid Break continues the chain.
    if (currentPlayer.combo === 0 || (currentPlayer.lastBreakTokenCount !== null && currentPlayer.lastBreakTokenCount === tokenCount)) {
      currentPlayer.combo += comboStep;
      comboIncreased = true;
      comboContinued = currentPlayer.lastBreakTokenCount !== null;
    } else {
      currentPlayer.combo = comboStep;
      comboIncreased = false;
      comboContinued = false;
    }
    currentPlayer.lastBreakTokenCount = tokenCount;
  }

  currentPlayer.streak += 1;
  currentPlayer.bestCombo = Math.max(currentPlayer.bestCombo, currentPlayer.combo);
  currentPlayer.bestStreak = Math.max(currentPlayer.bestStreak, currentPlayer.streak);

  const scoring = calculateScore({
    sum: selection.sum,
    tokenCount: selection.selectedTokens.length,
    combo: currentPlayer.combo,
    streak: currentPlayer.streak,
    secondsLeft: Math.floor((match.turnEndsAt - now) / 1000),
    settings: match.settings,
  });

  currentPlayer.score += scoring.total;
  currentPlayer.quotaProgress += 1;

  match.board = applyBoardMutation(match.board, selection.selectedTokens, match.settings);

  addReplayEvent(match, 'valid_break', {
    playerId,
    selectedTokenIds: move.selectedTokenIds,
    sum: selection.sum,
    tokenCount,
    achievedMultiple,
    targetNumber: match.board.targetNumber,
    scoreGain: scoring.total,
    boardVersion: match.board.version,
    comboIncreased,
  });

  passTurn(match);
  if (shouldComplete(match)) completeMatch(match);

  return {
    ok: true,
    moveResult: {
      playerId,
      sum: selection.sum,
      tokenCount,
      achievedMultiple,
      scoreGain: scoring.total,
      combo: currentPlayer.combo,
      streak: currentPlayer.streak,
      comboIncreased,
      comboContinued,
      quotaProgress: currentPlayer.quotaProgress,
      breakdown: scoring.breakdown,
      reactionMs,
    },
  };
}

module.exports = {
  createMatch,
  addPlayer,
  setPlayerReady,
  canStart,
  startMatch,
  getCurrentPlayer,
  getPublicState,
  processMove,
  applyTurnTimeout,
  completeMatch,
};
