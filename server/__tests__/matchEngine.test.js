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
  comboRules: { comboStep: 1, comboBonusPerStack: 8, streakBonusPerStack: 5 },
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
    match.board.version = match.board.version;

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
});
