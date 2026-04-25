'use strict';

const BOARD_SIZE = 16;
const CORE_MIN = 100;
const CORE_MAX = 999;
const TURN_TIMER_SECONDS = 15;
const MATCH_BONUS_PER_MATCH = 10;
const CORE_BREAK_BONUS = 50;
const CHAIN_MULTIPLIER_SCALING = 0.2;

const COIN_TYPE = {
  NORMAL: 'normal',
  MULTIPLIER: 'multiplier',
  ECHO: 'echo',
};

let coinIdCounter = 0;

function generateCoinId() {
  return `c${++coinIdCounter}`;
}

function generateCoin() {
  const roll = Math.random();
  if (roll < 0.75) {
    return {
      id: generateCoinId(),
      type: COIN_TYPE.NORMAL,
      value: Math.floor(Math.random() * 9) + 1,
      multiplier: 1,
    };
  } else if (roll < 0.90) {
    return {
      id: generateCoinId(),
      type: COIN_TYPE.MULTIPLIER,
      value: Math.floor(Math.random() * 9) + 1,
      multiplier: 2,
    };
  } else {
    return {
      id: generateCoinId(),
      type: COIN_TYPE.ECHO,
      value: 0,
      multiplier: 1,
    };
  }
}

function generateCore() {
  return Math.floor(Math.random() * (CORE_MAX - CORE_MIN + 1)) + CORE_MIN;
}

/**
 * Find the smallest sum in [1, BOARD_SIZE*9] that satisfies the given quota
 * against the core. Used by the board-generation fallback.
 */
function findValidTargetSum(core, quota) {
  const maxSum = BOARD_SIZE * 9;
  for (let s = 1; s <= maxSum; s++) {
    if (countMatches(s, core) >= quota) return s;
  }
  // Should never happen for quota ≤ 2 on any 3-digit core;
  // return 1 as a last resort (covers quota=1 if core ends in 1).
  return 1;
}

function generateQuota(core) {
  const numDigits = String(core).length;
  const roll = Math.random();
  if (numDigits === 1) return 1;
  if (numDigits === 2) return roll < 0.5 ? 1 : 2;
  // 3 digits: quota=3 (core break) is only achievable when the core itself
  // is reachable as a sum of at most BOARD_SIZE coins with max value 9.
  const maxAchievableSum = BOARD_SIZE * 9;
  if (roll < 0.25) return 1;
  if (core <= maxAchievableSum && roll >= 0.75) return 3;
  return 2;
}

/**
 * Compute sum of selected coins applying echo logic in order.
 * Echo coins repeat the value of the previous non-echo coin.
 * If an echo coin is first (no prior value), it contributes 0.
 * Multiplier coins add their face value and apply a score multiplier.
 * @param {Array} coins - ordered array of coin objects
 * @returns {{ sum: number, scoreMultiplier: number }}
 */
function calculateSumWithEcho(coins) {
  let sum = 0;
  let lastValue = 0;
  let scoreMultiplier = 1;

  for (const coin of coins) {
    if (coin.type === COIN_TYPE.ECHO) {
      sum += lastValue;
    } else if (coin.type === COIN_TYPE.MULTIPLIER) {
      sum += coin.value;
      lastValue = coin.value;
      scoreMultiplier *= coin.multiplier;
    } else {
      sum += coin.value;
      lastValue = coin.value;
    }
  }

  return { sum, scoreMultiplier };
}

/**
 * Count digit matches between sum and core from right to left (positional).
 * Only coreDigits.length digits are compared, starting from the least significant.
 * @param {number} sum
 * @param {number} core
 * @returns {number} number of matching digits
 */
function countMatches(sum, core) {
  const sumDigits = String(sum).split('').reverse();
  const coreDigits = String(core).split('').reverse();
  let matches = 0;

  for (let i = 0; i < coreDigits.length; i++) {
    if (sumDigits[i] !== undefined && sumDigits[i] === coreDigits[i]) {
      matches++;
    }
  }

  return matches;
}

/**
 * Brute-force check whether any subset of the board meets the quota.
 * Checks all 2^n non-empty subsets (n = min(board.length, 20)).
 */
function hasValidMove(board, core, quota) {
  const limit = Math.min(board.length, 20);
  const subsetCount = 1 << limit;

  for (let mask = 1; mask < subsetCount; mask++) {
    const selected = [];
    for (let i = 0; i < limit; i++) {
      if (mask & (1 << i)) selected.push(board[i]);
    }
    const { sum } = calculateSumWithEcho(selected);
    if (countMatches(sum, core) >= quota) return true;
  }
  return false;
}

/**
 * Generate a full 16-coin board that has at least one valid move.
 */
function generateBoard(core, quota, maxAttempts = 50) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      board.push(generateCoin());
    }
    if (hasValidMove(board, core, quota)) {
      return board;
    }
  }

  // Fallback: build forced normal coins that sum to a guaranteed valid target.
  // This ensures hasValidMove will always find at least one matching subset.
  const targetSum = findValidTargetSum(core, quota);
  const board = [];
  let remaining = targetSum;

  while (remaining > 0 && board.length < BOARD_SIZE) {
    const v = Math.min(9, remaining);
    board.push({
      id: generateCoinId(),
      type: COIN_TYPE.NORMAL,
      value: v,
      multiplier: 1,
    });
    remaining -= v;
  }

  // Fill remaining slots with random coins
  while (board.length < BOARD_SIZE) {
    board.push(generateCoin());
  }

  return board;
}

function createGame() {
  const core = generateCore();
  const quota = generateQuota(core);
  const board = generateBoard(core, quota);

  return {
    board,
    core,
    quota,
    players: [
      { id: null, score: 0, chain: 0, name: 'Player 1' },
      { id: null, score: 0, chain: 0, name: 'Player 2' },
    ],
    currentPlayerIndex: 0,
    turnTimer: TURN_TIMER_SECONDS,
    status: 'waiting', // 'waiting' | 'playing' | 'finished'
    round: 1,
    maxRounds: 10,
    lastMoveResult: null,
  };
}

/**
 * Process a player's move.
 * @param {object} state - mutable game state
 * @param {string} playerId - socket ID of the acting player
 * @param {string[]} selectedCoinIds - ordered array of coin IDs
 * @returns {{ success: boolean, error?: string, moveSuccess?: boolean, ... }}
 */
function handleMove(state, playerId, selectedCoinIds) {
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (currentPlayer.id !== playerId) {
    return { success: false, error: 'Not your turn' };
  }

  if (state.status !== 'playing') {
    return { success: false, error: 'Game not in progress' };
  }

  if (!Array.isArray(selectedCoinIds) || selectedCoinIds.length === 0) {
    return { success: false, error: 'No coins selected' };
  }

  // Check for duplicate IDs
  const idSet = new Set(selectedCoinIds);
  if (idSet.size !== selectedCoinIds.length) {
    return { success: false, error: 'Duplicate coin IDs' };
  }

  // Validate all coin IDs exist on the board
  const boardMap = new Map(state.board.map(c => [c.id, c]));
  const coins = [];
  for (const id of selectedCoinIds) {
    if (!boardMap.has(id)) {
      return { success: false, error: `Invalid coin ID: ${id}` };
    }
    coins.push(boardMap.get(id));
  }

  const { sum, scoreMultiplier } = calculateSumWithEcho(coins);
  const matches = countMatches(sum, state.core);
  const coreDigitCount = String(state.core).length;
  const isCoreBreak = matches === coreDigitCount;
  const isSuccess = matches >= state.quota;

  const result = {
    success: true,
    moveSuccess: isSuccess,
    sum,
    matches,
    isCoreBreak,
    playerId,
    selectedCoinIds: [...selectedCoinIds],
    scoreGain: 0,
  };

  if (isSuccess) {
    const base = sum;
    const matchBonus = matches * MATCH_BONUS_PER_MATCH;
    const coreBonus = isCoreBreak ? CORE_BREAK_BONUS : 0;
    currentPlayer.chain += 1;
    const chainMultiplier = 1 + currentPlayer.chain * CHAIN_MULTIPLIER_SCALING;
    const scoreGain = Math.round((base + matchBonus + coreBonus) * chainMultiplier * scoreMultiplier);
    currentPlayer.score += scoreGain;

    result.scoreGain = scoreGain;
    result.chainMultiplier = chainMultiplier;
    result.scoreMultiplier = scoreMultiplier;

    // Remove used coins
    const usedIds = new Set(selectedCoinIds);
    state.board = state.board.filter(c => !usedIds.has(c.id));

    // Generate new core and quota
    state.core = generateCore();
    state.quota = generateQuota(state.core);

    // Refill board to 16 coins
    while (state.board.length < BOARD_SIZE) {
      state.board.push(generateCoin());
    }

    // Validate solvability; regenerate if needed
    if (!hasValidMove(state.board, state.core, state.quota)) {
      state.board = generateBoard(state.core, state.quota);
    }

    state.turnTimer = TURN_TIMER_SECONDS;
    // Player continues their turn (no turn switch on success)
  } else {
    currentPlayer.chain = 0;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;
    state.round += 1;
    state.turnTimer = TURN_TIMER_SECONDS;
    // Board does NOT change on failure

    if (state.round > state.maxRounds * 2) {
      state.status = 'finished';
    }
  }

  state.lastMoveResult = result;
  return result;
}

/**
 * Handle turn timer expiry: treat as a failure for the current player.
 */
function handleTimerExpiry(state) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  currentPlayer.chain = 0;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;
  state.round += 1;
  state.turnTimer = TURN_TIMER_SECONDS;

  if (state.round > state.maxRounds * 2) {
    state.status = 'finished';
  }

  state.lastMoveResult = {
    success: true,
    moveSuccess: false,
    timerExpired: true,
    sum: 0,
    matches: 0,
    isCoreBreak: false,
    playerId: currentPlayer.id,
    selectedCoinIds: [],
    scoreGain: 0,
  };
}

function getWinner(state) {
  if (state.status !== 'finished') return null;
  const [p1, p2] = state.players;
  if (p1.score > p2.score) return p1;
  if (p2.score > p1.score) return p2;
  return null; // tie
}

module.exports = {
  createGame,
  handleMove,
  handleTimerExpiry,
  generateBoard,
  generateCoin,
  generateCore,
  generateQuota,
  calculateSumWithEcho,
  countMatches,
  hasValidMove,
  findValidTargetSum,
  getWinner,
  TURN_TIMER_SECONDS,
  BOARD_SIZE,
  COIN_TYPE,
};
