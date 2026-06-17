'use strict';

const { createBoard, validateMoveInput, calculateSelection, applyBoardMutation, enumerateValidMoves } = require('./src/domain/rulesEngine');
const { calculateScore } = require('./src/domain/scoring');

module.exports = {
  createBoard,
  validateMoveInput,
  calculateSelection,
  applyBoardMutation,
  enumerateValidMoves,
  calculateScore,
};
