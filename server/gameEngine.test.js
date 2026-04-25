'use strict';

const {
  calculateSum,
  isCoreBreak,
  ageBorderCoins,
  createCenterCoins,
  generateBorderCoins,
  generateBorderCoin,
  generateCore,
  createGame,
  handleMove,
  handleTimerExpiry,
  getWinner,
  COIN_TYPE,
  BORDER_COIN_COUNT,
  GAME_QUOTA,
  GAME_TURNS,
  CENTER_COIN_VALUES,
} = require('./gameEngine');

// ─── calculateSum ─────────────────────────────────────────────────────────────

describe('calculateSum', () => {
  test('sums values of all coins', () => {
    const coins = [
      { value: 3 },
      { value: 5 },
      { value: 2 },
    ];
    expect(calculateSum(coins)).toBe(10);
  });

  test('returns 0 for empty array', () => {
    expect(calculateSum([])).toBe(0);
  });

  test('handles a single coin', () => {
    expect(calculateSum([{ value: 7 }])).toBe(7);
  });
});

// ─── isCoreBreak ──────────────────────────────────────────────────────────────

describe('isCoreBreak', () => {
  test('returns true when sum is a multiple of core', () => {
    expect(isCoreBreak(21, 7)).toBe(true);
    expect(isCoreBreak(14, 7)).toBe(true);
    expect(isCoreBreak(9, 3)).toBe(true);
  });

  test('returns false when sum is not a multiple of core', () => {
    expect(isCoreBreak(10, 7)).toBe(false);
    expect(isCoreBreak(11, 3)).toBe(false);
  });

  test('returns false for sum of 0', () => {
    expect(isCoreBreak(0, 5)).toBe(false);
  });

  test('works for core 1 (any positive sum is a multiple)', () => {
    expect(isCoreBreak(1, 1)).toBe(true);
    expect(isCoreBreak(9, 1)).toBe(true);
  });
});

// ─── ageBorderCoins ───────────────────────────────────────────────────────────

describe('ageBorderCoins', () => {
  test('increments every coin value by 1', () => {
    const coins = [
      { id: 'a', type: COIN_TYPE.BORDER, value: 3, isCenter: false },
      { id: 'b', type: COIN_TYPE.BORDER, value: 5, isCenter: false },
    ];
    const aged = ageBorderCoins(coins);
    expect(aged[0].value).toBe(4);
    expect(aged[1].value).toBe(6);
  });

  test('removes coins whose value was already 9', () => {
    const coins = [
      { id: 'keep', type: COIN_TYPE.BORDER, value: 8, isCenter: false },
      { id: 'remove', type: COIN_TYPE.BORDER, value: 9, isCenter: false },
    ];
    const aged = ageBorderCoins(coins);
    expect(aged).toHaveLength(1);
    expect(aged[0].id).toBe('keep');
    expect(aged[0].value).toBe(9);
  });

  test('handles empty array', () => {
    expect(ageBorderCoins([])).toEqual([]);
  });

  test('does not mutate original coins', () => {
    const coin = { id: 'x', type: COIN_TYPE.BORDER, value: 4, isCenter: false };
    ageBorderCoins([coin]);
    expect(coin.value).toBe(4);
  });
});

// ─── createCenterCoins ────────────────────────────────────────────────────────

describe('createCenterCoins', () => {
  test('creates 4 center coins with correct values', () => {
    const coins = createCenterCoins();
    expect(coins).toHaveLength(4);
    expect(coins.map(c => c.value)).toEqual(CENTER_COIN_VALUES);
  });

  test('all coins have isCenter = true', () => {
    const coins = createCenterCoins();
    expect(coins.every(c => c.isCenter)).toBe(true);
  });

  test('last coin (value 5) has CENTER_ECHO type', () => {
    const coins = createCenterCoins();
    expect(coins[coins.length - 1].type).toBe(COIN_TYPE.CENTER_ECHO);
    expect(coins[coins.length - 1].value).toBe(5);
  });

  test('other coins have CENTER type', () => {
    const coins = createCenterCoins();
    expect(coins.slice(0, -1).every(c => c.type === COIN_TYPE.CENTER)).toBe(true);
  });
});

// ─── generateCore ─────────────────────────────────────────────────────────────

describe('generateCore', () => {
  test('returns a value between 1 and 9 inclusive', () => {
    for (let i = 0; i < 20; i++) {
      const core = generateCore();
      expect(core).toBeGreaterThanOrEqual(1);
      expect(core).toBeLessThanOrEqual(9);
      expect(Number.isInteger(core)).toBe(true);
    }
  });
});

// ─── createGame ───────────────────────────────────────────────────────────────

describe('createGame', () => {
  test('creates a game with correct initial state', () => {
    const state = createGame();
    expect(state.centerCoins).toHaveLength(4);
    expect(state.borderCoins).toHaveLength(BORDER_COIN_COUNT);
    expect(state.players).toHaveLength(2);
    expect(state.status).toBe('waiting');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.core).toBeGreaterThanOrEqual(1);
    expect(state.core).toBeLessThanOrEqual(9);
    expect(state.quota).toBe(GAME_QUOTA);
    expect(state.maxTurns).toBe(GAME_TURNS);
    expect(state.turn).toBe(1);
  });

  test('each player starts with 0 coinsUsed and no echo state', () => {
    const state = createGame();
    for (const p of state.players) {
      expect(p.coinsUsed).toBe(0);
      expect(p.lastMultiplier).toBeNull();
      expect(p.echoCount).toBe(0);
    }
  });
});

// ─── handleMove ───────────────────────────────────────────────────────────────

describe('handleMove', () => {
  function makePlayingState() {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    return state;
  }

  /** Replace border coins with known coins and set the core. */
  function forceBoard(state, core, borderValues) {
    state.core = core;
    const newBorder = borderValues.map((v, i) => ({
      id: `b${i}`,
      type: COIN_TYPE.BORDER,
      value: v,
      isCenter: false,
    }));
    while (newBorder.length < BORDER_COIN_COUNT) {
      newBorder.push(generateBorderCoin());
    }
    state.borderCoins = newBorder;
  }

  test('rejects move from wrong player', () => {
    const state = makePlayingState();
    const result = handleMove(state, 'p2', [state.centerCoins[0].id]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  test('rejects move when game not playing', () => {
    const state = makePlayingState();
    state.status = 'waiting';
    const result = handleMove(state, 'p1', [state.centerCoins[0].id]);
    expect(result.success).toBe(false);
  });

  test('rejects empty coin selection', () => {
    const state = makePlayingState();
    const result = handleMove(state, 'p1', []);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No coins selected');
  });

  test('rejects invalid coin ID', () => {
    const state = makePlayingState();
    const result = handleMove(state, 'p1', ['nonexistent']);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid coin ID/);
  });

  test('rejects duplicate coin IDs', () => {
    const state = makePlayingState();
    const coinId = state.centerCoins[0].id;
    const result = handleMove(state, 'p1', [coinId, coinId]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Duplicate coin IDs');
  });

  test('rejects selection with no center coin', () => {
    const state = makePlayingState();
    forceBoard(state, 7, [7]);
    const result = handleMove(state, 'p1', ['b0']); // border coin only
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/center coin/);
  });

  test('rejects selection whose sum is not a multiple of the core', () => {
    const state = makePlayingState();
    // core=7, center[0] value=1, border value=2 → sum=3, not a multiple of 7
    forceBoard(state, 7, [2]);
    const result = handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/multiple/);
  });

  test('successful Core Break: removes used border coins and refills', () => {
    const state = makePlayingState();
    // core=7, center[0]=1, border=6 → sum=7 ✓
    forceBoard(state, 7, [6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const result = handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(result.success).toBe(true);
    expect(result.moveSuccess).toBe(true);
    expect(result.sum).toBe(7);
    expect(result.multiplier).toBe(1);
    // board should still have BORDER_COIN_COUNT border coins
    expect(state.borderCoins).toHaveLength(BORDER_COIN_COUNT);
    // used border coin b0 must be gone
    expect(state.borderCoins.map(c => c.id)).not.toContain('b0');
  });

  test('successful Core Break: counts border coins toward coinsUsed', () => {
    const state = makePlayingState();
    // core=7, center[0]=1, border b0=6 → sum=7 → 1 border coin used
    forceBoard(state, 7, [6]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(state.players[0].coinsUsed).toBe(1);
  });

  test('successful Core Break: turn switches to the other player', () => {
    const state = makePlayingState();
    forceBoard(state, 7, [6]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(state.currentPlayerIndex).toBe(1);
  });

  test('successful Core Break: new core is rolled', () => {
    const state = makePlayingState();
    state.core = 7;
    forceBoard(state, 7, [6]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    // new core must be 1-9 (may differ)
    expect(state.core).toBeGreaterThanOrEqual(1);
    expect(state.core).toBeLessThanOrEqual(9);
  });

  test('unused border coins are aged after a Core Break', () => {
    const state = makePlayingState();
    // core=7, center[0]=1, b0=6 used; b1=3 unused (should become 4)
    forceBoard(state, 7, [6, 3]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    const aged = state.borderCoins.find(c => c.id === 'b1');
    expect(aged).toBeDefined();
    expect(aged.value).toBe(4); // 3+1
  });

  test('border coin at value 9 is removed after aging', () => {
    const state = makePlayingState();
    // b0=6 used (core=7, center[0]=1); b1=9 unused → removed
    forceBoard(state, 7, [6, 9]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(state.borderCoins.map(c => c.id)).not.toContain('b1');
  });

  test('game finishes when a player reaches the quota', () => {
    const state = makePlayingState();
    state.players[0].coinsUsed = state.quota - 1;
    // core=7, center[0]=1, b0=6 → 1 border coin pushes coinsUsed to quota
    forceBoard(state, 7, [6]);
    const result = handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(result.isWin).toBe(true);
    expect(state.status).toBe('finished');
  });

  test('multiplier is computed as sum / core', () => {
    const state = makePlayingState();
    // core=7, center[0]=1, b0=6 → sum=7 → multiplier=1
    forceBoard(state, 7, [6]);
    const result = handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(result.multiplier).toBe(1);

    const state2 = makePlayingState();
    // core=7, center[1]=2, b0=5, b1=7 → sum=14 → multiplier=2
    forceBoard(state2, 7, [5, 7]);
    const result2 = handleMove(state2, 'p1', [state2.centerCoins[1].id, 'b0', 'b1']);
    expect(result2.multiplier).toBe(2);
  });

  test('multiplier-echo bonus: same multiplier on consecutive turns with echo coin', () => {
    const state = makePlayingState();
    // Turn 1 (p1): core=7, use echo-coin (center-3, value=5) + b0=2 → sum=7 → multiplier=1, 1 border coin
    forceBoard(state, 7, [2]);
    const echoCoinId = state.centerCoins[3].id; // the CENTER_ECHO coin (value 5)
    handleMove(state, 'p1', [echoCoinId, 'b0']);
    // After turn 1: p1.lastMultiplier=1, p1.echoCount=0 (first time no previous)

    // Turn 2 is p2's; skip by advancing manually via p2
    forceBoard(state, 7, [2]);
    handleMove(state, 'p2', [echoCoinId, 'b0']);

    // Turn 3 is p1's again: same core=7, echo coin + b0=2 → sum=7 → multiplier=1 again
    forceBoard(state, 7, [2]);
    const result = handleMove(state, 'p1', [echoCoinId, 'b0']);
    // echoCount should have incremented, giving bonus
    expect(result.echoBonus).toBeGreaterThan(0);
    expect(result.coinsGained).toBeGreaterThan(result.borderCoinsUsed);
  });

  test('no multiplier-echo bonus when echo coin is not selected', () => {
    const state = makePlayingState();
    // Use only a non-echo center coin
    // Turn 1: core=7, center[0]=1, b0=6 → multiplier=1
    forceBoard(state, 7, [6]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    // Turn 2 p2
    forceBoard(state, 7, [6]);
    handleMove(state, 'p2', [state.centerCoins[0].id, 'b0']);
    // Turn 3 p1: same multiplier but no echo coin
    forceBoard(state, 7, [6]);
    const result = handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(result.echoBonus).toBe(0);
  });

  test('game finishes when turns are exhausted', () => {
    const state = makePlayingState();
    // Max turns is GAME_TURNS; total turns = GAME_TURNS * 2 for 2 players
    // Fast-forward turn counter to one before the limit
    state.turn = state.maxTurns * 2;
    forceBoard(state, 7, [6]);
    handleMove(state, 'p1', [state.centerCoins[0].id, 'b0']);
    expect(state.status).toBe('finished');
  });
});

// ─── handleTimerExpiry ────────────────────────────────────────────────────────

describe('handleTimerExpiry', () => {
  test('resets echo state, switches player, increments turn', () => {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    state.players[0].echoCount = 3;
    state.players[0].lastMultiplier = 2;

    handleTimerExpiry(state);

    expect(state.players[0].echoCount).toBe(0);
    expect(state.players[0].lastMultiplier).toBeNull();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turn).toBe(2);
    expect(state.lastMoveResult.timerExpired).toBe(true);
    expect(state.lastMoveResult.moveSuccess).toBe(false);
  });

  test('ages border coins on timer expiry', () => {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    // Replace first border coin with value 4
    state.borderCoins[0] = { id: 'age_test', type: COIN_TYPE.BORDER, value: 4, isCenter: false };

    handleTimerExpiry(state);

    const coin = state.borderCoins.find(c => c.id === 'age_test');
    expect(coin).toBeDefined();
    expect(coin.value).toBe(5); // 4+1
  });

  test('removes border coins at value 9 on timer expiry', () => {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    state.borderCoins[0] = { id: 'nine_coin', type: COIN_TYPE.BORDER, value: 9, isCenter: false };

    handleTimerExpiry(state);

    expect(state.borderCoins.map(c => c.id)).not.toContain('nine_coin');
    // Board is refilled back to BORDER_COIN_COUNT
    expect(state.borderCoins).toHaveLength(BORDER_COIN_COUNT);
  });

  test('sets game to finished when turns are exhausted', () => {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    state.turn = state.maxTurns * 2; // next increment finishes game

    handleTimerExpiry(state);
    expect(state.status).toBe('finished');
  });
});

// ─── getWinner ────────────────────────────────────────────────────────────────

describe('getWinner', () => {
  test('returns null when game is not finished', () => {
    const state = createGame();
    state.status = 'playing';
    expect(getWinner(state)).toBeNull();
  });

  test('returns the player who reached the quota', () => {
    const state = createGame();
    state.status = 'finished';
    state.players[0].coinsUsed = state.quota;
    state.players[1].coinsUsed = 5;
    expect(getWinner(state)).toBe(state.players[0]);
  });

  test('returns the player with more coins used when neither reached quota', () => {
    const state = createGame();
    state.status = 'finished';
    state.players[0].coinsUsed = 15;
    state.players[1].coinsUsed = 20;
    expect(getWinner(state)).toBe(state.players[1]);
  });

  test('returns null on a tie', () => {
    const state = createGame();
    state.status = 'finished';
    state.players[0].coinsUsed = 10;
    state.players[1].coinsUsed = 10;
    expect(getWinner(state)).toBeNull();
  });
});
