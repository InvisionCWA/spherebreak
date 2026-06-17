'use strict';

const {
  createBoard,
  validateMoveInput,
  calculateSelection,
  applyBoardMutation,
  enumerateValidMoves,
} = require('../src/domain/rulesEngine');

const SETTINGS = {
  turnLimit: 20,
  secondsPerTurn: 20,
  quotaToWin: 8,
  targetNumberRange: [1, 9],
  boardSize: { inner: 2, outer: 6 },
  maxPlayers: 2,
  ranked: false,
  tokenReplacementMode: 'cycling-age',
  comboRules: { comboStep: 1, comboBonusPerStack: 8, streakBonusPerStack: 5 },
};

describe('rulesEngine: validateMoveInput', () => {
  test('accepts a valid payload', () => {
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'abc123', boardVersion: 1 })).toBeNull();
  });

  test('rejects empty token selection', () => {
    expect(validateMoveInput({ selectedTokenIds: [], nonce: 'n', boardVersion: 1 })).toMatch(/At least one token/);
  });

  test('rejects more than 29 tokens', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `t${i}`);
    expect(validateMoveInput({ selectedTokenIds: ids, nonce: 'n', boardVersion: 1 })).toBe('Too many tokens selected');
  });

  test('rejects duplicate token ids in selection', () => {
    expect(validateMoveInput({ selectedTokenIds: ['a', 'a'], nonce: 'n', boardVersion: 1 })).toMatch(/Duplicate/);
  });

  test('rejects non-string token ids', () => {
    expect(validateMoveInput({ selectedTokenIds: [123], nonce: 'n', boardVersion: 1 })).toMatch(/must be strings/i);
  });

  test('rejects token id exceeding max length', () => {
    const longId = 'x'.repeat(81);
    expect(validateMoveInput({ selectedTokenIds: [longId], nonce: 'n', boardVersion: 1 })).toMatch(/exceeds maximum/i);
  });

  test('rejects missing nonce', () => {
    expect(validateMoveInput({ selectedTokenIds: ['a'], boardVersion: 1 })).toMatch(/nonce/i);
  });

  test('rejects nonce with invalid characters', () => {
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'bad nonce!', boardVersion: 1 })).toMatch(/Invalid move nonce format/);
  });

  test('rejects nonce exceeding max length', () => {
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'n'.repeat(65), boardVersion: 1 })).toMatch(/too long/i);
  });

  test('rejects non-integer boardVersion', () => {
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'n', boardVersion: '1' })).toMatch(/Board version/);
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'n', boardVersion: 1.5 })).toMatch(/Board version/);
  });

  test('rejects null payload', () => {
    expect(validateMoveInput(null)).toMatch(/Invalid move payload/);
  });
});

describe('rulesEngine: calculateSelection', () => {
  const board = {
    targetNumber: 4,
    version: 1,
    innerTokens: [
      { id: 'i1', value: 3, zone: 'inner', age: 0 },
      { id: 'i2', value: 1, zone: 'inner', age: 0 },
    ],
    outerTokens: [
      { id: 'o1', value: 5, zone: 'outer', age: 0 },
      { id: 'o2', value: 2, zone: 'outer', age: 0 },
    ],
  };

  test('valid break: inner token and sum is multiple of target', () => {
    const result = calculateSelection(board, ['i1', 'o1']);
    expect(result.error).toBeUndefined();
    expect(result.sum).toBe(8);
    expect(result.isValidBreak).toBe(true);
  });

  test('not a valid break when sum is not a multiple', () => {
    const result = calculateSelection(board, ['i1']);
    expect(result.error).toBeUndefined();
    expect(result.isValidBreak).toBe(false);
    expect(result.nearestMultiple).toBe(4);
  });

  test('rejects outer-only selection', () => {
    const result = calculateSelection(board, ['o1', 'o2']);
    expect(result.error).toBe('At least one inner token is required');
  });

  test('rejects unknown token id', () => {
    const result = calculateSelection(board, ['unknown-id']);
    expect(result.error).toMatch(/Unknown token id/);
  });

  test('provides nearestMultiple hint for invalid sums', () => {
    const result = calculateSelection(board, ['i1', 'o2']);
    expect(result.isValidBreak).toBe(false);
    expect(result.nearestMultiple).toBe(8);
  });
});

describe('rulesEngine: createBoard', () => {
  test('creates board with correct token counts', () => {
    const board = createBoard(SETTINGS);
    expect(board.innerTokens).toHaveLength(SETTINGS.boardSize.inner);
    expect(board.outerTokens).toHaveLength(SETTINGS.boardSize.outer);
    expect(board.version).toBe(1);
  });

  test('target number is within configured range', () => {
    const settings = { ...SETTINGS, targetNumberRange: [3, 6] };
    for (let i = 0; i < 20; i += 1) {
      const board = createBoard(settings);
      expect(board.targetNumber).toBeGreaterThanOrEqual(3);
      expect(board.targetNumber).toBeLessThanOrEqual(6);
    }
  });

  test('token values are between 1 and 9', () => {
    const board = createBoard(SETTINGS);
    for (const token of [...board.innerTokens, ...board.outerTokens]) {
      expect(token.value).toBeGreaterThanOrEqual(1);
      expect(token.value).toBeLessThanOrEqual(9);
    }
  });
});

describe('rulesEngine: applyBoardMutation', () => {
  test('replaces selected inner tokens with new ones', () => {
    const board = createBoard(SETTINGS);
    const selectedInner = [board.innerTokens[0]];
    const oldId = board.innerTokens[0].id;
    const next = applyBoardMutation(board, selectedInner, SETTINGS);
    const newIds = next.innerTokens.map((t) => t.id);
    expect(newIds).not.toContain(oldId);
    expect(next.innerTokens).toHaveLength(SETTINGS.boardSize.inner);
  });

  test('removes selected outer tokens and refills to boardSize.outer', () => {
    const board = createBoard(SETTINGS);
    const selectedOuter = [board.outerTokens[0]];
    const next = applyBoardMutation(board, selectedOuter, SETTINGS);
    expect(next.outerTokens).toHaveLength(SETTINGS.boardSize.outer);
  });

  test('bumps board version by 1', () => {
    const board = createBoard(SETTINGS);
    const next = applyBoardMutation(board, [board.innerTokens[0]], SETTINGS);
    expect(next.version).toBe(board.version + 1);
  });

  test('cycling-age mode changes token value after 2 turns without selection', () => {
    const board = createBoard({ ...SETTINGS, tokenReplacementMode: 'cycling-age' });
    const outerWithAge1 = board.outerTokens.map((t) => ({ ...t, age: 1 }));
    const boardWithAged = { ...board, outerTokens: outerWithAge1 };
    const next = applyBoardMutation(boardWithAged, [boardWithAged.innerTokens[0]], SETTINGS);
    for (const token of next.outerTokens) {
      expect(token.age).toBe(0);
    }
  });
});

describe('rulesEngine: enumerateValidMoves', () => {
  test('returns only moves including inner tokens', () => {
    const board = {
      targetNumber: 3,
      version: 1,
      innerTokens: [{ id: 'i1', value: 1, zone: 'inner', age: 0 }],
      outerTokens: [
        { id: 'o1', value: 2, zone: 'outer', age: 0 },
        { id: 'o2', value: 5, zone: 'outer', age: 0 },
      ],
    };
    const moves = enumerateValidMoves(board);
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      expect(move.sum % 3).toBe(0);
    }
  });

  test('returns empty array when no valid moves exist', () => {
    const board = {
      targetNumber: 7,
      version: 1,
      innerTokens: [{ id: 'i1', value: 1, zone: 'inner', age: 0 }],
      outerTokens: [{ id: 'o1', value: 1, zone: 'outer', age: 0 }],
    };
    const moves = enumerateValidMoves(board, 2);
    expect(moves).toHaveLength(0);
  });
});
