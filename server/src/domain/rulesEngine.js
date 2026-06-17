'use strict';

const crypto = require('crypto');

function randomInt(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function tokenId() {
  return crypto.randomUUID();
}

function createToken(zone, random = Math.random) {
  return {
    id: tokenId(),
    value: randomInt(1, 9, random),
    zone,
    age: 0,
  };
}

function createBoard(settings, random = Math.random) {
  const innerTokens = Array.from({ length: settings.boardSize.inner }, () => createToken('inner', random));
  const outerTokens = Array.from({ length: settings.boardSize.outer }, () => createToken('outer', random));

  return {
    targetNumber: randomInt(settings.targetNumberRange[0], settings.targetNumberRange[1], random),
    innerTokens,
    outerTokens,
    version: 1,
  };
}

function listAllTokens(board) {
  return [...board.innerTokens, ...board.outerTokens];
}

function validateMoveInput(move) {
  if (!move || typeof move !== 'object') return 'Invalid move payload';
  if (!Array.isArray(move.selectedTokenIds) || move.selectedTokenIds.length === 0) return 'At least one token is required';
  if (new Set(move.selectedTokenIds).size !== move.selectedTokenIds.length) return 'Duplicate token selections are not allowed';
  if (!move.nonce || typeof move.nonce !== 'string') return 'Move nonce required';
  if (!Number.isInteger(move.boardVersion)) return 'Board version required';
  return null;
}

function calculateSelection(board, selectedTokenIds) {
  const tokenMap = new Map(listAllTokens(board).map((token) => [token.id, token]));
  const selectedTokens = [];
  for (const id of selectedTokenIds) {
    const token = tokenMap.get(id);
    if (!token) return { error: `Unknown token id: ${id}` };
    selectedTokens.push(token);
  }

  const includesInner = selectedTokens.some((token) => token.zone === 'inner');
  if (!includesInner) return { error: 'At least one inner token is required' };

  const sum = selectedTokens.reduce((acc, token) => acc + token.value, 0);
  if (sum <= 0) return { error: 'Selection sum must be positive' };

  return {
    selectedTokens,
    sum,
    isValidBreak: sum % board.targetNumber === 0,
    nearestMultiple: Math.ceil(sum / board.targetNumber) * board.targetNumber,
  };
}

function applyBoardMutation(board, selectedTokens, settings, random = Math.random) {
  const selectedIds = new Set(selectedTokens.map((token) => token.id));

  const newInner = board.innerTokens.map((token) => {
    if (selectedIds.has(token.id)) {
      return createToken('inner', random);
    }
    return token;
  });

  const remainingOuter = board.outerTokens.filter((token) => !selectedIds.has(token.id));
  const refreshedOuter = remainingOuter.map((token) => {
    const aged = { ...token, age: token.age + 1 };
    if (settings.tokenReplacementMode === 'cycling-age' && aged.age >= 2) {
      return {
        ...aged,
        value: ((aged.value % 9) || 0) + 1,
        age: 0,
      };
    }
    if (settings.tokenReplacementMode === 'random-refresh' && aged.age >= 3) {
      return createToken('outer', random);
    }
    return aged;
  });

  while (refreshedOuter.length < settings.boardSize.outer) {
    refreshedOuter.push(createToken('outer', random));
  }

  return {
    targetNumber: randomInt(settings.targetNumberRange[0], settings.targetNumberRange[1], random),
    innerTokens: newInner,
    outerTokens: refreshedOuter,
    version: board.version + 1,
  };
}

function enumerateValidMoves(board, maxDepth = 4) {
  const all = listAllTokens(board);
  const result = [];

  function helper(start, picked) {
    if (picked.length > 0) {
      const selectedTokens = picked.map((idx) => all[idx]);
      const includesInner = selectedTokens.some((token) => token.zone === 'inner');
      if (includesInner) {
        const sum = selectedTokens.reduce((acc, token) => acc + token.value, 0);
        if (sum > 0 && sum % board.targetNumber === 0) {
          result.push({
            selectedTokenIds: selectedTokens.map((token) => token.id),
            sum,
          });
        }
      }
    }

    if (picked.length >= maxDepth) return;

    for (let i = start; i < all.length; i += 1) {
      picked.push(i);
      helper(i + 1, picked);
      picked.pop();
    }
  }

  helper(0, []);
  return result;
}

module.exports = {
  createBoard,
  validateMoveInput,
  calculateSelection,
  applyBoardMutation,
  enumerateValidMoves,
  listAllTokens,
};
