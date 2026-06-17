'use strict';

const { enumerateValidMoves } = require('./rulesEngine');

function pickBotMove(board, difficulty = 'normal', random = Math.random) {
  const validMoves = enumerateValidMoves(board, difficulty === 'hard' ? 6 : 4);
  if (!validMoves.length) return null;

  if (difficulty === 'easy') {
    return validMoves[Math.floor(random() * validMoves.length)];
  }

  if (difficulty === 'normal') {
    validMoves.sort((a, b) => a.sum - b.sum);
    return validMoves[Math.floor(validMoves.length / 2)] || validMoves[0];
  }

  validMoves.sort((a, b) => b.sum - a.sum);
  return validMoves[0];
}

module.exports = { pickBotMove };
