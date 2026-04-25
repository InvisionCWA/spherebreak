'use strict';

const BORDER_COIN_COUNT = 12;
const TURN_TIMER_SECONDS = 60;
const GAME_QUOTA = 30;
const GAME_TURNS = 20;
const CENTER_COIN_VALUES = [1, 2, 3, 5];

const COIN_TYPE = {
  CENTER: 'center',
  CENTER_ECHO: 'center_echo', // center coin with multiplier-echo attribute (the 5-value coin)
  BORDER: 'border',
};

let coinIdCounter = 0;

function generateCoinId() {
  return `c${++coinIdCounter}`;
}

/**
 * Create the 4 fixed center coins (values 1, 2, 3, 5).
 * The last coin (value 5) carries the multiplier-echo attribute.
 */
function createCenterCoins() {
  return CENTER_COIN_VALUES.map((value, i) => ({
    id: `center-${i}`,
    type: i === CENTER_COIN_VALUES.length - 1 ? COIN_TYPE.CENTER_ECHO : COIN_TYPE.CENTER,
    value,
    isCenter: true,
  }));
}

function generateBorderCoin() {
  return {
    id: generateCoinId(),
    type: COIN_TYPE.BORDER,
    value: Math.floor(Math.random() * 9) + 1,
    isCenter: false,
  };
}

function generateBorderCoins(count = BORDER_COIN_COUNT) {
  const coins = [];
  for (let i = 0; i < count; i++) {
    coins.push(generateBorderCoin());
  }
  return coins;
}

/**
 * Roll the Core Sphere: returns a random integer from 1–9.
 */
function generateCore() {
  return Math.floor(Math.random() * 9) + 1;
}

/**
 * Compute the plain sum of all selected coin values.
 * @param {Array} coins
 * @returns {number}
 */
function calculateSum(coins) {
  return coins.reduce((acc, c) => acc + c.value, 0);
}

/**
 * A Core Break occurs when the sum is a non-zero multiple of the core number.
 * @param {number} sum
 * @param {number} core
 * @returns {boolean}
 */
function isCoreBreak(sum, core) {
  return sum > 0 && sum % core === 0;
}

/**
 * Age all border coins by +1. Any coin whose value was already 9 is removed
 * (it would reach 10, which is invalid).
 * @param {Array} borderCoins
 * @returns {Array} surviving coins with incremented values
 */
function ageBorderCoins(borderCoins) {
  const surviving = [];
  for (const coin of borderCoins) {
    if (coin.value >= 9) {
      // Would become 10 – remove from play
      continue;
    }
    surviving.push({ ...coin, value: coin.value + 1 });
  }
  return surviving;
}

function createGame() {
  return {
    centerCoins: createCenterCoins(),
    borderCoins: generateBorderCoins(),
    core: generateCore(),
    quota: GAME_QUOTA,
    maxTurns: GAME_TURNS,
    players: [
      { id: null, name: 'Player 1', coinsUsed: 0, lastMultiplier: null, echoCount: 0 },
      { id: null, name: 'Player 2', coinsUsed: 0, lastMultiplier: null, echoCount: 0 },
    ],
    currentPlayerIndex: 0,
    turnTimer: TURN_TIMER_SECONDS,
    status: 'waiting', // 'waiting' | 'playing' | 'finished'
    turn: 1,
    lastMoveResult: null,
  };
}

/**
 * Process a player's move (Core Break attempt).
 *
 * Rules:
 *  - At least one center coin must be selected.
 *  - The sum of all selected coins must be a non-zero multiple of the core.
 *  - Border coins used are removed; unused border coins are aged (+1, removed if ≥9).
 *  - The multiplier-echo bonus activates when the echo-coin (center-3) is selected
 *    and the current multiplier equals the previous turn's multiplier for this player.
 *
 * @param {object} state - mutable game state
 * @param {string} playerId
 * @param {string[]} selectedCoinIds
 * @returns {{ success: boolean, error?: string, ... }}
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

  // Reject duplicate IDs
  const idSet = new Set(selectedCoinIds);
  if (idSet.size !== selectedCoinIds.length) {
    return { success: false, error: 'Duplicate coin IDs' };
  }

  // Build map of all available coins
  const allCoins = [...state.centerCoins, ...state.borderCoins];
  const coinMap = new Map(allCoins.map(c => [c.id, c]));

  const selectedCoins = [];
  for (const id of selectedCoinIds) {
    if (!coinMap.has(id)) {
      return { success: false, error: `Invalid coin ID: ${id}` };
    }
    selectedCoins.push(coinMap.get(id));
  }

  // Must include at least one center coin
  if (!selectedCoins.some(c => c.isCenter)) {
    return { success: false, error: 'Must select at least one center coin' };
  }

  const sum = calculateSum(selectedCoins);

  // Sum must be a multiple of the core
  if (!isCoreBreak(sum, state.core)) {
    return { success: false, error: `Sum ${sum} is not a multiple of core ${state.core}` };
  }

  // --- Valid Core Break ---
  const multiplier = sum / state.core;
  const borderCoinsUsed = selectedCoins.filter(c => !c.isCenter).length;
  const hasEchoCoin = selectedCoins.some(c => c.type === COIN_TYPE.CENTER_ECHO);

  // Multiplier-echo bonus: activates when the echo-attribute center coin is selected
  // and the multiplier equals the player's multiplier from the previous turn.
  let echoBonus = 0;
  if (hasEchoCoin && currentPlayer.lastMultiplier !== null && currentPlayer.lastMultiplier === multiplier) {
    currentPlayer.echoCount += 1;
    echoBonus = currentPlayer.echoCount * borderCoinsUsed;
  } else {
    currentPlayer.echoCount = 0;
  }
  currentPlayer.lastMultiplier = multiplier;

  const coinsGained = borderCoinsUsed + echoBonus;
  currentPlayer.coinsUsed += coinsGained;

  const isWin = currentPlayer.coinsUsed >= state.quota;

  const result = {
    success: true,
    moveSuccess: true,
    sum,
    multiplier,
    borderCoinsUsed,
    echoBonus,
    coinsGained,
    isWin,
    playerId,
    selectedCoinIds: [...selectedCoinIds],
  };

  if (isWin) {
    state.status = 'finished';
  } else {
    // Remove used border coins, age the rest, then refill
    const usedBorderIds = new Set(selectedCoins.filter(c => !c.isCenter).map(c => c.id));
    const unusedBorder = state.borderCoins.filter(c => !usedBorderIds.has(c.id));
    const aged = ageBorderCoins(unusedBorder);
    while (aged.length < BORDER_COIN_COUNT) {
      aged.push(generateBorderCoin());
    }
    state.borderCoins = aged;

    // Roll new core and advance turn
    state.core = generateCore();
    state.turn += 1;
    state.turnTimer = TURN_TIMER_SECONDS;

    // Alternate players
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;

    // Check whether all turns have been exhausted
    if (state.turn > state.maxTurns * 2) {
      state.status = 'finished';
    }
  }

  state.lastMoveResult = result;
  return result;
}

/**
 * Handle turn timer expiry.
 * No Core Break was made; coins age, the turn passes to the other player.
 */
function handleTimerExpiry(state) {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Timer expiry breaks the echo chain
  currentPlayer.lastMultiplier = null;
  currentPlayer.echoCount = 0;

  // Age all border coins (no Core Break was made this turn)
  const aged = ageBorderCoins(state.borderCoins);
  while (aged.length < BORDER_COIN_COUNT) {
    aged.push(generateBorderCoin());
  }
  state.borderCoins = aged;

  state.core = generateCore();
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;
  state.turn += 1;
  state.turnTimer = TURN_TIMER_SECONDS;

  if (state.turn > state.maxTurns * 2) {
    state.status = 'finished';
  }

  state.lastMoveResult = {
    success: true,
    moveSuccess: false,
    timerExpired: true,
    sum: 0,
    multiplier: 0,
    borderCoinsUsed: 0,
    echoBonus: 0,
    coinsGained: 0,
    isWin: false,
    playerId: currentPlayer.id,
    selectedCoinIds: [],
  };
}

/**
 * Determine the winner of a finished game.
 * A player who reached the quota wins outright.
 * Otherwise the player who used the most border coins wins.
 */
function getWinner(state) {
  if (state.status !== 'finished') return null;
  const [p1, p2] = state.players;
  if (p1.coinsUsed >= state.quota) return p1;
  if (p2.coinsUsed >= state.quota) return p2;
  if (p1.coinsUsed > p2.coinsUsed) return p1;
  if (p2.coinsUsed > p1.coinsUsed) return p2;
  return null; // tie
}

module.exports = {
  createGame,
  handleMove,
  handleTimerExpiry,
  createCenterCoins,
  generateBorderCoins,
  generateBorderCoin,
  generateCore,
  calculateSum,
  isCoreBreak,
  ageBorderCoins,
  getWinner,
  TURN_TIMER_SECONDS,
  BORDER_COIN_COUNT,
  GAME_QUOTA,
  GAME_TURNS,
  CENTER_COIN_VALUES,
  COIN_TYPE,
};
