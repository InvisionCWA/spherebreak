'use strict';

jest.mock('../src/services/replayService', () => ({
  addReplayEvent: jest.fn(),
}));

const { addReplayEvent } = require('../src/services/replayService');

const {
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
} = require('../src/domain/matchEngine');

const BASE_SETTINGS = {
  turnLimit: 20,
  secondsPerTurn: 20,
  quotaToWin: 3,
  beginnerHints: true,
  targetNumberRange: [4, 4],
  boardSize: { inner: 2, outer: 4 },
  maxPlayers: 2,
  ranked: false,
  tokenReplacementMode: 'cycling-age',
  comboRules: { comboStep: 1, comboBonusPerStack: 8, streakBonusPerStack: 5, comboRuleType: 'token-count' },
};

function makeActiveMatch(settings = {}) {
  const merged = { ...BASE_SETTINGS, ...settings };
  const match = createMatch({
    code: 'TEST01',
    hostPlayer: { id: 'p1', displayName: 'One', ready: false },
    settings: merged,
    mode: 'casual',
  });
  addPlayer(match, { id: 'p2', displayName: 'Two', ready: false });
  setPlayerReady(match, 'p1', true);
  setPlayerReady(match, 'p2', true);
  startMatch(match);
  match.board = {
    targetNumber: 4,
    version: 1,
    innerTokens: [
      { id: 'i1', value: 3, zone: 'inner', age: 0 },
      { id: 'i2', value: 4, zone: 'inner', age: 0 },
    ],
    outerTokens: [
      { id: 'o1', value: 1, zone: 'outer', age: 0 },
      { id: 'o2', value: 5, zone: 'outer', age: 0 },
      { id: 'o3', value: 3, zone: 'outer', age: 0 },
      { id: 'o4', value: 2, zone: 'outer', age: 0 },
    ],
  };
  match.turnEndsAt = Date.now() + 20000;
  match.turnStartedAt = Date.now();
  return match;
}

beforeEach(() => {
  addReplayEvent.mockClear();
});

describe('matchEngine: valid move', () => {
  test('accepted when inner token included and sum is multiple of target', () => {
    const match = makeActiveMatch();
    const current = getCurrentPlayer(match);
    const result = processMove(match, current.id, {
      selectedTokenIds: ['i1', 'o1'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.moveResult.sum).toBe(4);
    expect(result.moveResult.scoreGain).toBeGreaterThan(0);
  });

  test('updates score, combo, streak, and quota correctly', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const p1 = match.players.get(p1Id);
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'n1', boardVersion: 1 });
    match.board.targetNumber = 4;

    expect(p1.score).toBeGreaterThan(0);
    expect(p1.combo).toBeGreaterThanOrEqual(1);
    expect(p1.streak).toBe(1);
    expect(p1.quotaProgress).toBe(1);
  });

  test('board version is incremented after valid move', () => {
    const match = makeActiveMatch();
    const current = getCurrentPlayer(match);
    const oldVersion = match.board.version;
    processMove(match, current.id, { selectedTokenIds: ['i1', 'o1'], nonce: 'n1', boardVersion: oldVersion });
    expect(match.board.version).toBe(oldVersion + 1);
  });

  test('turn advances after valid move', () => {
    const match = makeActiveMatch();
    const firstId = match.turnOrder[0];
    const secondId = match.turnOrder[1];
    processMove(match, firstId, { selectedTokenIds: ['i2'], nonce: 'n1', boardVersion: 1 });
    expect(getCurrentPlayer(match).id).toBe(secondId);
  });
});

describe('matchEngine: invalid move rejections', () => {
  test('rejected when no inner token is selected', () => {
    const match = makeActiveMatch();
    const current = getCurrentPlayer(match);
    const result = processMove(match, current.id, {
      selectedTokenIds: ['o1', 'o4'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/inner token/i);
  });

  test('rejected when token ids are unknown', () => {
    const match = makeActiveMatch();
    const current = getCurrentPlayer(match);
    const result = processMove(match, current.id, {
      selectedTokenIds: ['nonexistent-token'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Unknown token/i);
  });

  test('rejected when board version is stale', () => {
    const match = makeActiveMatch();
    const current = getCurrentPlayer(match);
    const result = processMove(match, current.id, {
      selectedTokenIds: ['i1'],
      nonce: 'n1',
      boardVersion: 999,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Stale board version/i);
    expect(result.suspicious).toBe(true);
  });

  test('rejected when sum is not a multiple of target', () => {
    const match = makeActiveMatch();
    const current = getCurrentPlayer(match);
    // i1=3, o3=3 => sum=6, target=4: 6 is not a multiple of 4
    const result = processMove(match, current.id, {
      selectedTokenIds: ['i1', 'o3'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not a multiple/i);
    expect(result.preview).toBeDefined();
    expect(result.preview.sum).toBe(6);
  });

  test('invalid move resets combo and streak but does not change score or quota', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const p1 = match.players.get(p1Id);
    p1.combo = 3;
    p1.streak = 2;
    const scoreBefore = p1.score;
    const quotaBefore = p1.quotaProgress;
    // i1=3, o3=3 => sum=6, target=4: not a multiple of 4 => invalid break
    processMove(match, p1Id, { selectedTokenIds: ['i1', 'o3'], nonce: 'n1', boardVersion: 1 });
    expect(p1.combo).toBe(0);
    expect(p1.streak).toBe(0);
    expect(p1.score).toBe(scoreBefore);
    expect(p1.quotaProgress).toBe(quotaBefore);
  });

  test('rejected from inactive player (not their turn)', () => {
    const match = makeActiveMatch();
    const inactiveId = match.turnOrder[1];
    const result = processMove(match, inactiveId, {
      selectedTokenIds: ['i1'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Not your turn');
    expect(result.suspicious).toBe(true);
  });

  test('rejected when match is not active', () => {
    const match = makeActiveMatch();
    match.status = 'waiting';
    const current = match.turnOrder[0];
    const result = processMove(match, current, {
      selectedTokenIds: ['i1'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Match not active');
    expect(result.suspicious).toBe(true);
  });

  test('rejected when turn window has expired', () => {
    const match = makeActiveMatch();
    match.turnEndsAt = Date.now() - 1;
    const current = getCurrentPlayer(match);
    const result = processMove(match, current.id, {
      selectedTokenIds: ['i1'],
      nonce: 'n1',
      boardVersion: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Turn window expired');
    expect(result.suspicious).toBe(true);
  });
});

describe('matchEngine: match completion', () => {
  test('match completes when quota is reached', () => {
    const match = makeActiveMatch({ quotaToWin: 1 });
    const p1Id = match.turnOrder[0];
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'n1', boardVersion: 1 });
    expect(match.status).toBe('completed');
    expect(match.winnerId).toBe(p1Id);
    expect(match.completedByServer).toBe(true);
  });

  test('match completes when turn limit ends and highest score wins', () => {
    const match = makeActiveMatch({ turnLimit: 2 });
    const p1Id = match.turnOrder[0];
    const p2Id = match.turnOrder[1];
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'n1', boardVersion: 1 });
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'ii1', value: 4, zone: 'inner', age: 0 },
      { id: 'ii2', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oo1', value: 4, zone: 'outer', age: 0 },
      { id: 'oo2', value: 4, zone: 'outer', age: 0 },
      { id: 'oo3', value: 4, zone: 'outer', age: 0 },
      { id: 'oo4', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    processMove(match, p2Id, { selectedTokenIds: ['ii1'], nonce: 'n2', boardVersion: match.board.version });
    expect(match.status).toBe('completed');
    expect(match.winnerId).toBe(p1Id);
  });

  test('completeMatch with abandoned reason sets abandoned status', () => {
    const match = makeActiveMatch();
    completeMatch(match, 'abandoned');
    expect(match.status).toBe('abandoned');
    expect(match.completedByServer).toBe(false);
  });
});

describe('matchEngine: turn timeout', () => {
  test('applyTurnTimeout resets combo and streak, advances turn', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const p1 = match.players.get(p1Id);
    p1.combo = 5;
    p1.streak = 3;
    applyTurnTimeout(match, p1Id);
    expect(p1.combo).toBe(0);
    expect(p1.streak).toBe(0);
    expect(getCurrentPlayer(match).id).toBe(match.turnOrder[1]);
  });

  test('applyTurnTimeout ignores call for wrong player', () => {
    const match = makeActiveMatch();
    const p2Id = match.turnOrder[1];
    const result = applyTurnTimeout(match, p2Id);
    expect(result).toBeNull();
    expect(getCurrentPlayer(match).id).toBe(match.turnOrder[0]);
  });
});

describe('matchEngine: player management', () => {
  test('addPlayer rejects when match is full', () => {
    const match = makeActiveMatch();
    expect(() => addPlayer(match, { id: 'p3', displayName: 'Three' })).toThrow('Match full');
  });

  test('addPlayer updates existing player socketId and connected on duplicate id', () => {
    const match = makeActiveMatch();
    const result = addPlayer(match, { id: 'p1', displayName: 'One', socketId: 'new-socket', connected: true });
    expect(result.socketId).toBe('new-socket');
    expect(match.players.size).toBe(2);
  });

  test('canStart requires all players ready', () => {
    const match = createMatch({
      code: 'T2',
      hostPlayer: { id: 'p1', displayName: 'One', ready: false },
      settings: BASE_SETTINGS,
      mode: 'casual',
    });
    addPlayer(match, { id: 'p2', displayName: 'Two', ready: false });
    expect(canStart(match)).toBe(false);
    setPlayerReady(match, 'p1', true);
    expect(canStart(match)).toBe(false);
    setPlayerReady(match, 'p2', true);
    expect(canStart(match)).toBe(true);
  });
});

describe('matchEngine: getPublicState', () => {
  test('exposes countdownEndsAt in public state', () => {
    const match = createMatch({
      code: 'T3',
      hostPlayer: { id: 'p1', displayName: 'One', ready: false },
      settings: BASE_SETTINGS,
      mode: 'casual',
    });
    match.countdownEndsAt = Date.now() + 3000;
    const state = getPublicState(match, 'p1');
    expect(state.countdownEndsAt).toBeDefined();
    expect(state.countdownEndsAt).toBeGreaterThan(Date.now());
  });

  test('marks isSelf correctly for the viewing player', () => {
    const match = makeActiveMatch();
    const state = getPublicState(match, 'p1');
    const selfEntry = state.players.find((p) => p.id === 'p1');
    const otherEntry = state.players.find((p) => p.id === 'p2');
    expect(selfEntry.isSelf).toBe(true);
    expect(otherEntry.isSelf).toBe(false);
  });

  test('does not expose internal fields like socketId or disconnectAbuseCount', () => {
    const match = makeActiveMatch();
    const state = getPublicState(match, 'p1');
    for (const player of state.players) {
      expect(player.socketId).toBeUndefined();
      expect(player.disconnectAbuseCount).toBeUndefined();
      expect(player.fastestBreakMs).toBeUndefined();
    }
  });

  test('turnsLeft decreases correctly after valid moves', () => {
    const match = makeActiveMatch({ turnLimit: 10 });
    const stateAtStart = getPublicState(match, 'p1');
    expect(stateAtStart.turnsLeft).toBe(10);

    const p1Id = match.turnOrder[0];
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'nl1', boardVersion: 1 });
    const stateAfter = getPublicState(match, 'p1');
    expect(stateAfter.turnsLeft).toBe(9);
  });

  test('turnsLeft reaches zero when turnLimit is exhausted', () => {
    const match = makeActiveMatch({ turnLimit: 2, quotaToWin: 99 });
    const p1Id = match.turnOrder[0];
    const p2Id = match.turnOrder[1];
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'tl1', boardVersion: 1 });
    // reset board for p2
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'ii1', value: 4, zone: 'inner', age: 0 },
      { id: 'ii2', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oo1', value: 4, zone: 'outer', age: 0 },
      { id: 'oo2', value: 4, zone: 'outer', age: 0 },
      { id: 'oo3', value: 4, zone: 'outer', age: 0 },
      { id: 'oo4', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    processMove(match, p2Id, { selectedTokenIds: ['ii1'], nonce: 'tl2', boardVersion: match.board.version });
    expect(match.status).toBe('completed');
    const state = getPublicState(match, 'p1');
    expect(state.turnsLeft).toBe(0);
  });
});

describe('matchEngine: combo and chain rules', () => {
  test('first valid move starts combo at comboStep', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const p1 = match.players.get(p1Id);
    expect(p1.combo).toBe(0);
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'c1', boardVersion: 1 });
    expect(p1.combo).toBe(1);
  });

  test('same token count on consecutive valid breaks increases combo (token-count rule)', () => {
    const match = makeActiveMatch({ quotaToWin: 99 });
    const p1Id = match.turnOrder[0];
    const p2Id = match.turnOrder[1];
    const p1 = match.players.get(p1Id);

    // p1 first break: 1 token (i2 value=4, target=4)
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'c1', boardVersion: 1 });
    expect(p1.combo).toBe(1);

    // advance: p2 pass by timeout
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'ia', value: 4, zone: 'inner', age: 0 },
      { id: 'ib', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oa', value: 4, zone: 'outer', age: 0 },
      { id: 'ob', value: 4, zone: 'outer', age: 0 },
      { id: 'oc', value: 4, zone: 'outer', age: 0 },
      { id: 'od', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;

    // p2 uses 1 token too (so p2 combo increments, but we care about p1)
    processMove(match, p2Id, { selectedTokenIds: ['ia'], nonce: 'c2', boardVersion: match.board.version });

    // reset board for p1's second turn
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'ic', value: 4, zone: 'inner', age: 0 },
      { id: 'id', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oe', value: 4, zone: 'outer', age: 0 },
      { id: 'of', value: 4, zone: 'outer', age: 0 },
      { id: 'og', value: 4, zone: 'outer', age: 0 },
      { id: 'oh', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;

    // p1 second break: 1 token again → same count → combo should increase
    processMove(match, p1Id, { selectedTokenIds: ['ic'], nonce: 'c3', boardVersion: match.board.version });
    expect(p1.combo).toBe(2);
  });

  test('different token count on consecutive valid breaks resets combo (token-count rule)', () => {
    const match = makeActiveMatch({ quotaToWin: 99 });
    const p1Id = match.turnOrder[0];
    const p2Id = match.turnOrder[1];
    const p1 = match.players.get(p1Id);

    // p1 first break: 1 token (i2 value=4, target=4)
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'd1', boardVersion: 1 });
    expect(p1.combo).toBe(1);
    expect(p1.lastBreakTokenCount).toBe(1);

    // p2 pass
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'ia2', value: 3, zone: 'inner', age: 0 },
      { id: 'ib2', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oa2', value: 1, zone: 'outer', age: 0 },
      { id: 'ob2', value: 4, zone: 'outer', age: 0 },
      { id: 'oc2', value: 4, zone: 'outer', age: 0 },
      { id: 'od2', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    processMove(match, p2Id, { selectedTokenIds: ['ib2'], nonce: 'd2', boardVersion: match.board.version });

    // reset board for p1's second turn: use 2 tokens (different count)
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'ic2', value: 3, zone: 'inner', age: 0 },
      { id: 'id2', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oe2', value: 1, zone: 'outer', age: 0 },
      { id: 'of2', value: 4, zone: 'outer', age: 0 },
      { id: 'og2', value: 4, zone: 'outer', age: 0 },
      { id: 'oh2', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;

    // p1 second break: 2 tokens (i c2=3 + oe2=1 = 4, multiple of 4) → different count → combo resets
    processMove(match, p1Id, { selectedTokenIds: ['ic2', 'oe2'], nonce: 'd3', boardVersion: match.board.version });
    expect(p1.combo).toBe(1); // reset to comboStep
    expect(p1.lastBreakTokenCount).toBe(2);
  });

  test('combo increases with same achievedMultiple under achieved-multiple rule', () => {
    const settings = {
      ...BASE_SETTINGS,
      comboRules: { comboStep: 1, comboBonusPerStack: 8, streakBonusPerStack: 5, comboRuleType: 'achieved-multiple' },
      quotaToWin: 99,
    };
    const match = makeActiveMatch(settings);
    const p1Id = match.turnOrder[0];
    const p2Id = match.turnOrder[1];
    const p1 = match.players.get(p1Id);

    // p1 first break: i2=4, sum=4, achievedMultiple=1
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'am1', boardVersion: 1 });
    expect(p1.combo).toBe(1);
    expect(p1.lastBreakAchievedMultiple).toBe(1);

    // p2 turn
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'iamA', value: 4, zone: 'inner', age: 0 },
      { id: 'iamB', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oamA', value: 4, zone: 'outer', age: 0 },
      { id: 'oamB', value: 4, zone: 'outer', age: 0 },
      { id: 'oamC', value: 4, zone: 'outer', age: 0 },
      { id: 'oamD', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    processMove(match, p2Id, { selectedTokenIds: ['iamA'], nonce: 'am2', boardVersion: match.board.version });

    // p1 second break: also achievedMultiple=1 → combo increases
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'iamC', value: 4, zone: 'inner', age: 0 },
      { id: 'iamD', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oamE', value: 4, zone: 'outer', age: 0 },
      { id: 'oamF', value: 4, zone: 'outer', age: 0 },
      { id: 'oamG', value: 4, zone: 'outer', age: 0 },
      { id: 'oamH', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    processMove(match, p1Id, { selectedTokenIds: ['iamC'], nonce: 'am3', boardVersion: match.board.version });
    expect(p1.combo).toBe(2);
    expect(p1.lastBreakAchievedMultiple).toBe(1);
  });

  test('different achievedMultiple resets combo under achieved-multiple rule', () => {
    const settings = {
      ...BASE_SETTINGS,
      comboRules: { comboStep: 1, comboBonusPerStack: 8, streakBonusPerStack: 5, comboRuleType: 'achieved-multiple' },
      quotaToWin: 99,
    };
    const match = makeActiveMatch(settings);
    const p1Id = match.turnOrder[0];
    const p2Id = match.turnOrder[1];
    const p1 = match.players.get(p1Id);

    // p1 first break: achievedMultiple=1
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'ar1', boardVersion: 1 });
    expect(p1.lastBreakAchievedMultiple).toBe(1);

    // p2 turn
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'iarA', value: 4, zone: 'inner', age: 0 },
      { id: 'iarB', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oarA', value: 4, zone: 'outer', age: 0 },
      { id: 'oarB', value: 4, zone: 'outer', age: 0 },
      { id: 'oarC', value: 4, zone: 'outer', age: 0 },
      { id: 'oarD', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    processMove(match, p2Id, { selectedTokenIds: ['iarA'], nonce: 'ar2', boardVersion: match.board.version });

    // p1 second break: achievedMultiple=2 (different) → combo resets to comboStep
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'iarC', value: 4, zone: 'inner', age: 0 },
      { id: 'iarD', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'oarE', value: 4, zone: 'outer', age: 0 },
      { id: 'oarF', value: 4, zone: 'outer', age: 0 },
      { id: 'oarG', value: 4, zone: 'outer', age: 0 },
      { id: 'oarH', value: 4, zone: 'outer', age: 0 },
    ];
    match.turnEndsAt = Date.now() + 20000;
    // achievedMultiple = 8/4 = 2
    processMove(match, p1Id, { selectedTokenIds: ['iarC', 'oarE'], nonce: 'ar3', boardVersion: match.board.version });
    expect(p1.combo).toBe(1); // reset to comboStep
    expect(p1.lastBreakAchievedMultiple).toBe(2);
  });

  test('invalid move does not update combo or lastBreakTokenCount', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const p1 = match.players.get(p1Id);

    // First, make a valid break to set lastBreakTokenCount
    processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'cv1', boardVersion: 1 });
    expect(p1.lastBreakTokenCount).toBe(1);

    // Advance to p1's next turn by resetting board and setting it as p1's turn
    // (p2's turn comes next; we'll just force it to be p1's turn for test isolation)
    match.currentTurnIndex = 0;
    match.board.targetNumber = 4;
    match.board.innerTokens = [
      { id: 'icv1', value: 3, zone: 'inner', age: 0 },
      { id: 'icv2', value: 4, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'ocv1', value: 1, zone: 'outer', age: 0 },
      { id: 'ocv2', value: 2, zone: 'outer', age: 0 },
      { id: 'ocv3', value: 3, zone: 'outer', age: 0 },
      { id: 'ocv4', value: 4, zone: 'outer', age: 0 },
    ];
    match.board.version = 2;
    match.turnEndsAt = Date.now() + 20000;

    // icv1=3, ocv2=2 → sum=5, not a multiple of 4 → invalid
    processMove(match, p1Id, { selectedTokenIds: ['icv1', 'ocv2'], nonce: 'cv2', boardVersion: 2 });

    // combo should be reset to 0 (invalid move resets); lastBreakTokenCount unchanged
    expect(p1.combo).toBe(0);
    expect(p1.lastBreakTokenCount).toBe(1); // unchanged from last valid break
  });

  test('moveResult includes achievedMultiple and tokenCount', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const result = processMove(match, p1Id, { selectedTokenIds: ['i2'], nonce: 'mr1', boardVersion: 1 });
    expect(result.ok).toBe(true);
    expect(result.moveResult.achievedMultiple).toBe(1); // 4 / 4 = 1
    expect(result.moveResult.tokenCount).toBe(1);
  });

  test('moveResult achievedMultiple reflects multi-multiple break', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    // i1=3, o1=1 → sum=4, achievedMultiple=1; but i2=4 alone → achievedMultiple=1
    // Use i1=3 + o1=1 for sum=4 (achievedMultiple=1), then test a sum=8 break
    match.board.innerTokens = [
      { id: 'im1', value: 5, zone: 'inner', age: 0 },
      { id: 'im2', value: 3, zone: 'inner', age: 0 },
    ];
    match.board.outerTokens = [
      { id: 'om1', value: 3, zone: 'outer', age: 0 },
      { id: 'om2', value: 5, zone: 'outer', age: 0 },
      { id: 'om3', value: 4, zone: 'outer', age: 0 },
      { id: 'om4', value: 4, zone: 'outer', age: 0 },
    ];
    // im1=5 + om1=3 = 8 = 2×4
    const result = processMove(match, p1Id, { selectedTokenIds: ['im1', 'om1'], nonce: 'mr2', boardVersion: 1 });
    expect(result.ok).toBe(true);
    expect(result.moveResult.achievedMultiple).toBe(2);
    expect(result.moveResult.tokenCount).toBe(2);
  });

  test('client-provided score, combo, and turnsLeft in move payload are ignored', () => {
    const match = makeActiveMatch();
    const p1Id = match.turnOrder[0];
    const p1 = match.players.get(p1Id);
    // Attempt to inject extra trusted fields in the move payload
    const result = processMove(match, p1Id, {
      selectedTokenIds: ['i2'],
      nonce: 'spoof1',
      boardVersion: 1,
      score: 99999,
      combo: 9999,
      turnsLeft: -1,
      quotaProgress: 999,
      achievedMultiple: 99,
      selectedSum: 999,
    });
    expect(result.ok).toBe(true);
    // Server must compute score from the valid selection, not from payload
    expect(p1.score).toBeLessThan(99999);
    expect(p1.combo).toBeLessThan(9999);
    expect(p1.quotaProgress).toBe(1); // only incremented by 1
  });
});
