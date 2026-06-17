'use strict';

const { pickBotMove } = require('../src/domain/botEngine');

describe('bot engine', () => {
  test('bot returns only valid moves', () => {
    const board = {
      targetNumber: 4,
      version: 1,
      innerTokens: [
        { id: 'i1', value: 3, zone: 'inner', age: 0 },
        { id: 'i2', value: 2, zone: 'inner', age: 0 },
      ],
      outerTokens: [
        { id: 'o1', value: 5, zone: 'outer', age: 0 },
        { id: 'o2', value: 1, zone: 'outer', age: 0 },
      ],
    };

    const move = pickBotMove(board, 'hard');
    expect(move).toBeTruthy();
    expect(move.sum % 4).toBe(0);
  });
});
