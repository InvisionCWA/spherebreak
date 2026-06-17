'use strict';

const {
  createBoard,
  validateMoveInput,
  calculateSelection,
  applyBoardMutation,
  enumerateValidMoves,
  calculateScore,
} = require('./gameEngine');

const settings = {
  turnLimit: 20,
  secondsPerTurn: 20,
  quotaToWin: 8,
  targetNumberRange: [1, 9],
  boardSize: { inner: 2, outer: 6 },
  maxPlayers: 2,
  ranked: false,
  tokenReplacementMode: 'cycling-age',
  comboRules: {
    comboStep: 1,
    comboBonusPerStack: 8,
    streakBonusPerStack: 5,
  },
};

describe('rules engine', () => {
  test('validates move payload shape', () => {
    expect(validateMoveInput({ selectedTokenIds: [], nonce: 'n', boardVersion: 1 })).toContain('At least one token');
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'n', boardVersion: 1 })).toBe(null);
    const oversizedSelection = Array.from({ length: 30 }, (_, index) => `token-${index}`);
    expect(validateMoveInput({ selectedTokenIds: oversizedSelection, nonce: 'n', boardVersion: 1 })).toBe('Too many tokens selected');
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'bad nonce', boardVersion: 1 })).toBe('Move nonce must contain only alphanumeric characters, colons, underscores, and hyphens');
    expect(validateMoveInput({ selectedTokenIds: ['a'], nonce: 'n'.repeat(65), boardVersion: 1 })).toBe('Move nonce too long');
  });

  test('requires inner token and multiple-of-target rule', () => {
    const board = {
      targetNumber: 4,
      version: 1,
      innerTokens: [{ id: 'i1', value: 3, zone: 'inner', age: 0 }],
      outerTokens: [{ id: 'o1', value: 5, zone: 'outer', age: 0 }, { id: 'o2', value: 2, zone: 'outer', age: 0 }],
    };

    const valid = calculateSelection(board, ['i1', 'o1']);
    expect(valid.error).toBeUndefined();
    expect(valid.sum).toBe(8);
    expect(valid.isValidBreak).toBe(true);

    const invalid = calculateSelection(board, ['o1', 'o2']);
    expect(invalid.error).toBe('At least one inner token is required');
  });

  test('board replacement preserves sizes and bumps version', () => {
    const board = createBoard(settings);
    const selectedTokens = [board.innerTokens[0], board.outerTokens[0]];
    const nextBoard = applyBoardMutation(board, selectedTokens, settings);

    expect(nextBoard.version).toBe(board.version + 1);
    expect(nextBoard.innerTokens).toHaveLength(settings.boardSize.inner);
    expect(nextBoard.outerTokens).toHaveLength(settings.boardSize.outer);
    expect(nextBoard.targetNumber).toBeGreaterThanOrEqual(1);
    expect(nextBoard.targetNumber).toBeLessThanOrEqual(9);
  });

  test('enumerates valid bot moves', () => {
    const board = {
      targetNumber: 3,
      version: 1,
      innerTokens: [{ id: 'i1', value: 1, zone: 'inner', age: 0 }],
      outerTokens: [
        { id: 'o1', value: 2, zone: 'outer', age: 0 },
        { id: 'o2', value: 5, zone: 'outer', age: 0 },
      ],
    };
    const moves = enumerateValidMoves(board, 3);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some((m) => m.sum % 3 === 0)).toBe(true);
  });

  test('scoring includes combo and streak', () => {
    const score = calculateScore({
      sum: 12,
      tokenCount: 3,
      combo: 2,
      streak: 2,
      secondsLeft: 10,
      settings,
    });

    expect(score.total).toBeGreaterThan(120);
    expect(score.breakdown.comboBonus).toBe(16);
    expect(score.breakdown.streakBonus).toBe(10);
  });
});
