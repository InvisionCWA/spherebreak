'use strict';

const {
  calculateSumWithEcho,
  countMatches,
  hasValidMove,
  generateBoard,
  generateCore,
  generateQuota,
  createGame,
  handleMove,
  handleTimerExpiry,
  COIN_TYPE,
  BOARD_SIZE,
} = require('./gameEngine');

describe('calculateSumWithEcho', () => {
  test('sums normal coins', () => {
    const coins = [
      { type: 'normal', value: 3, multiplier: 1 },
      { type: 'normal', value: 5, multiplier: 1 },
    ];
    expect(calculateSumWithEcho(coins).sum).toBe(8);
  });

  test('echo coin repeats last non-echo value', () => {
    const coins = [
      { type: 'normal', value: 5, multiplier: 1 },
      { type: 'echo', value: 0, multiplier: 1 },
    ];
    expect(calculateSumWithEcho(coins).sum).toBe(10);
  });

  test('echo coin at start contributes 0', () => {
    const coins = [
      { type: 'echo', value: 0, multiplier: 1 },
      { type: 'normal', value: 3, multiplier: 1 },
    ];
    expect(calculateSumWithEcho(coins).sum).toBe(3);
  });

  test('multiplier coin adds its value and sets scoreMultiplier', () => {
    const coins = [
      { type: 'multiplier', value: 4, multiplier: 2 },
      { type: 'normal', value: 3, multiplier: 1 },
    ];
    const result = calculateSumWithEcho(coins);
    expect(result.sum).toBe(7);
    expect(result.scoreMultiplier).toBe(2);
  });

  test('multiple multiplier coins stack multiplicatively', () => {
    const coins = [
      { type: 'multiplier', value: 2, multiplier: 2 },
      { type: 'multiplier', value: 3, multiplier: 3 },
    ];
    const result = calculateSumWithEcho(coins);
    expect(result.sum).toBe(5);
    expect(result.scoreMultiplier).toBe(6);
  });

  test('multiple echo coins chain last non-echo value', () => {
    const coins = [
      { type: 'normal', value: 3, multiplier: 1 },
      { type: 'echo', value: 0, multiplier: 1 },
      { type: 'echo', value: 0, multiplier: 1 },
    ];
    expect(calculateSumWithEcho(coins).sum).toBe(9);
  });

  test('echo after multiplier repeats multiplier value', () => {
    const coins = [
      { type: 'multiplier', value: 5, multiplier: 2 },
      { type: 'echo', value: 0, multiplier: 1 },
    ];
    const result = calculateSumWithEcho(coins);
    expect(result.sum).toBe(10);
    expect(result.scoreMultiplier).toBe(2);
  });

  test('returns scoreMultiplier of 1 with only normal coins', () => {
    const coins = [{ type: 'normal', value: 7, multiplier: 1 }];
    expect(calculateSumWithEcho(coins).scoreMultiplier).toBe(1);
  });
});

describe('countMatches', () => {
  test('example from spec: core 143, sum 163 -> 2 matches', () => {
    expect(countMatches(163, 143)).toBe(2);
  });

  test('all digits match is a core break (3 matches for 3-digit core)', () => {
    expect(countMatches(143, 143)).toBe(3);
  });

  test('no match', () => {
    expect(countMatches(222, 111)).toBe(0);
  });

  test('sum shorter than core: compare only existing digits from right', () => {
    // core 143, sum 3: units 3==3 only -> 1 match
    expect(countMatches(3, 143)).toBe(1);
  });

  test('sum longer than core: compare rightmost core-length digits', () => {
    // core 43, sum 143: units 3==3, tens 4==4 -> 2 matches
    expect(countMatches(143, 43)).toBe(2);
  });

  test('units digit mismatch only', () => {
    // core 143, sum 144 -> units 4!=3 -> only hundreds 1==1, tens 4==4 -> 2 matches
    expect(countMatches(144, 143)).toBe(2);
  });
});

describe('hasValidMove', () => {
  test('returns true when a valid combination exists', () => {
    // Board with a coin of value matching the units digit of core 100
    const board = [];
    for (let i = 0; i < 15; i++) {
      board.push({ id: `c${i}`, type: 'normal', value: 2, multiplier: 1 });
    }
    // Add coin with value 0 -> actually sum of two 5s = 10, units=0 matches core 100 units=0
    board.push({ id: 'c15', type: 'normal', value: 5, multiplier: 1 });
    // core=100, quota=1: 5+5=10, units 0==0 -> match
    const core = 100;
    const quota = 1;
    expect(hasValidMove(board, core, quota)).toBe(true);
  });

  test('returns false when no valid combination exists', () => {
    // All coins sum to values whose units digit never matches core
    const board = [];
    for (let i = 0; i < 16; i++) {
      board.push({ id: `c${i}`, type: 'normal', value: 1, multiplier: 1 });
    }
    // Core 555, quota 3: need all digits to match
    // Any subset of 1s gives sum=k, digits never all match 555
    // With quota=3 and all-1 board, we can get sum=5 (5 coins)
    // sum=5: units 5==5 (match), tens 0!=5, hundreds 0!=5 -> only 1 match, fails quota=3
    const core = 555;
    const quota = 3;
    expect(hasValidMove(board, core, quota)).toBe(false);
  });
});

describe('generateBoard', () => {
  test('returns exactly 16 coins', () => {
    const core = generateCore();
    const quota = generateQuota(core);
    const board = generateBoard(core, quota);
    expect(board).toHaveLength(BOARD_SIZE);
  });

  test('generated board always has a valid move', () => {
    for (let i = 0; i < 5; i++) {
      const core = generateCore();
      const quota = generateQuota(core);
      const board = generateBoard(core, quota);
      expect(hasValidMove(board, core, quota)).toBe(true);
    }
  });
});

describe('createGame', () => {
  test('creates a game with correct initial state', () => {
    const state = createGame();
    expect(state.board).toHaveLength(BOARD_SIZE);
    expect(state.players).toHaveLength(2);
    expect(state.status).toBe('waiting');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.core).toBeGreaterThanOrEqual(100);
    expect(state.core).toBeLessThanOrEqual(999);
    expect(state.quota).toBeGreaterThanOrEqual(1);
    expect(state.quota).toBeLessThanOrEqual(3);
  });
});

describe('handleMove', () => {
  function makePlayingState() {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    return state;
  }

  test('rejects move from wrong player', () => {
    const state = makePlayingState();
    const result = handleMove(state, 'p2', [state.board[0].id]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  test('rejects move when game not playing', () => {
    const state = makePlayingState();
    state.status = 'waiting';
    const result = handleMove(state, 'p1', [state.board[0].id]);
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
    const coinId = state.board[0].id;
    const result = handleMove(state, 'p1', [coinId, coinId]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Duplicate coin IDs');
  });

  test('successful move removes coins and refills board', () => {
    const state = makePlayingState();
    // Force a specific core and a guaranteed matching selection
    // Build coins that sum to core exactly
    const core = 300;
    state.core = core;
    state.quota = 1;
    // Replace all coins with known values; ensure sum=300 is achievable
    // Put a coin with value 3 and arrange so sum can be 300... actually
    // easier: just use a coin whose value creates a match at units digit
    // Core 300: units=0. We need sum with units digit 0.
    // Replace board[0] with value 5, board[1] with value 5 (sum=10, units=0)
    state.board[0] = { id: 'test1', type: 'normal', value: 5, multiplier: 1 };
    state.board[1] = { id: 'test2', type: 'normal', value: 5, multiplier: 1 };
    const boardSizeBefore = state.board.length;

    const result = handleMove(state, 'p1', ['test1', 'test2']);
    expect(result.success).toBe(true);
    expect(result.moveSuccess).toBe(true);
    // Board should still be 16 coins (removed 2, added 2)
    expect(state.board).toHaveLength(BOARD_SIZE);
    // Used coins should be gone
    const ids = state.board.map(c => c.id);
    expect(ids).not.toContain('test1');
    expect(ids).not.toContain('test2');
  });

  test('successful move increments player chain and score', () => {
    const state = makePlayingState();
    state.core = 300;
    state.quota = 1;
    state.board[0] = { id: 'a', type: 'normal', value: 5, multiplier: 1 };
    state.board[1] = { id: 'b', type: 'normal', value: 5, multiplier: 1 };

    const result = handleMove(state, 'p1', ['a', 'b']);
    expect(result.moveSuccess).toBe(true);
    expect(state.players[0].chain).toBe(1);
    expect(state.players[0].score).toBeGreaterThan(0);
    // Turn does NOT switch on success
    expect(state.currentPlayerIndex).toBe(0);
  });

  test('failed move resets chain and switches turn', () => {
    const state = makePlayingState();
    // Core where no single coin matches quota=3
    state.core = 777;
    state.quota = 3;
    state.players[0].chain = 3;
    // Use a coin that won't match all 3 digits of 777
    state.board[0] = { id: 'x', type: 'normal', value: 1, multiplier: 1 };

    const result = handleMove(state, 'p1', ['x']);
    expect(result.success).toBe(true);
    expect(result.moveSuccess).toBe(false);
    expect(state.players[0].chain).toBe(0);
    expect(state.currentPlayerIndex).toBe(1);
  });

  test('failed move does not mutate the board', () => {
    const state = makePlayingState();
    state.core = 777;
    state.quota = 3;
    const boardSnapshot = state.board.map(c => c.id);
    state.board[0] = { id: 'fail_coin', type: 'normal', value: 1, multiplier: 1 };

    handleMove(state, 'p1', ['fail_coin']);
    // Board should contain same coins (failure doesn't remove coins)
    expect(state.board.map(c => c.id)).toContain('fail_coin');
  });

  test('core break gives bonus points', () => {
    const state = makePlayingState();
    // Core 143, find coins summing to 143
    state.core = 143;
    state.quota = 1;
    // Build coins: 100 + 40 + 3 = 143... but coins are 1-9
    // 1+4+3+5+... easier: just sum them. 9+9+9+9+9+9+9+9+9+9+9+9+9+9+9+8 = too much
    // Actually 1*100+4*10+3 -- we can't do that with 1-9 coins normally
    // Instead: use a large number approach: 9*15+8 = 143
    const coinIds = [];
    for (let i = 0; i < 15; i++) {
      state.board[i] = { id: `cb${i}`, type: 'normal', value: 9, multiplier: 1 };
      coinIds.push(`cb${i}`);
    }
    state.board[15] = { id: 'cb15', type: 'normal', value: 8, multiplier: 1 };
    coinIds.push('cb15');
    // 9*15 + 8 = 135 + 8 = 143 -- exact core break
    const result = handleMove(state, 'p1', coinIds);
    expect(result.success).toBe(true);
    expect(result.moveSuccess).toBe(true);
    expect(result.isCoreBreak).toBe(true);
    expect(result.sum).toBe(143);
    expect(result.matches).toBe(3);
    // Score should include core break bonus
    expect(state.players[0].score).toBeGreaterThan(143 + 30 + 50); // base + matchBonus + coreBonus
  });
});

describe('handleTimerExpiry', () => {
  test('resets chain, switches turn, increments round', () => {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    state.players[0].chain = 5;

    handleTimerExpiry(state);
    expect(state.players[0].chain).toBe(0);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.round).toBe(2);
    expect(state.lastMoveResult.timerExpired).toBe(true);
    expect(state.lastMoveResult.moveSuccess).toBe(false);
  });

  test('sets game to finished when round exceeds maxRounds*2', () => {
    const state = createGame();
    state.status = 'playing';
    state.players[0].id = 'p1';
    state.players[1].id = 'p2';
    state.round = state.maxRounds * 2; // next increment finishes game

    handleTimerExpiry(state);
    expect(state.status).toBe('finished');
  });
});
