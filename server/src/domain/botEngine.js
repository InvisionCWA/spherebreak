'use strict';

const { enumerateValidMoves } = require('./rulesEngine');

function pickBotMove(board, difficulty = 'normal', random = Math.random) {
  const validMoves = enumerateValidMoves(board, difficulty === 'hard' ? 6 : 4);
  if (!validMoves.length) return null;

  const strongestFirst = [...validMoves].sort((a, b) => b.sum - a.sum);

  if (difficulty === 'easy') {
    return validMoves[Math.floor(random() * validMoves.length)];
  }

  if (difficulty === 'normal') {
    if (random() < 0.3) {
      const weakerPool = strongestFirst.slice(Math.ceil(strongestFirst.length / 2));
      if (weakerPool.length) {
        return weakerPool[Math.floor(random() * weakerPool.length)];
      }
    }

    const preferredPool = strongestFirst.slice(0, Math.max(1, Math.ceil(strongestFirst.length * 0.6)));
    return preferredPool[Math.floor(random() * preferredPool.length)] || strongestFirst[0];
  }

  if (random() < 0.15) {
    const nearBest = strongestFirst.slice(0, Math.max(1, Math.min(3, strongestFirst.length)));
    return nearBest[Math.floor(random() * nearBest.length)];
  }

  return strongestFirst[0];
}

function getBotThinkDelayMs({ secondsPerTurn = 20, difficulty = 'normal', random = Math.random } = {}) {
  const windows = {
    easy: [1400, 4200],
    normal: [900, 3200],
    hard: [500, 2200],
  };

  const [minDelay, maxDelay] = windows[difficulty] || windows.normal;
  const delay = minDelay + Math.floor(random() * (maxDelay - minDelay + 1));
  const maxAllowed = Math.max(500, (secondsPerTurn * 1000) - 400);
  return Math.min(delay, maxAllowed);
}

function generateBotHandle(random = Math.random) {
  const first = ['Nova', 'Mason', 'Lena', 'Kai', 'Theo', 'Ava', 'Milo', 'Iris', 'Orion', 'Skye', 'Nora', 'Eli'];
  const second = ['Rider', 'Pixel', 'Orbit', 'Breaker', 'Starfall', 'Numbers', 'Arcade', 'Token', 'Vector', 'Drift', 'Pulse', 'Cipher'];
  const suffix = random() < 0.35 ? String(10 + Math.floor(random() * 90)) : '';
  const handle = `${first[Math.floor(random() * first.length)]}${second[Math.floor(random() * second.length)]}${suffix}`;
  return handle;
}

module.exports = { pickBotMove, getBotThinkDelayMs, generateBotHandle };
