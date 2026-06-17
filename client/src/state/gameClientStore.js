export const DEFAULT_MATCH_SETTINGS = {
  turnLimit: 20,
  secondsPerTurn: 20,
  quotaToWin: 12,
  beginnerHints: true,
  targetNumberRange: [1, 9],
  boardSize: { inner: 3, outer: 12 },
  maxPlayers: 2,
  ranked: false,
  tokenReplacementMode: 'cycling-age',
  comboRules: {
    comboStep: 1,
    comboBonusPerStack: 8,
    streakBonusPerStack: 5,
  },
};

export function buildMovePreview(board, selectedTokenIds) {
  if (!board || !selectedTokenIds.length) {
    return {
      sum: 0,
      isValid: false,
      nearestMultiple: 0,
      includesInner: false,
    };
  }

  const tokenMap = new Map([
    ...board.innerTokens.map((token) => [token.id, token]),
    ...board.outerTokens.map((token) => [token.id, token]),
  ]);

  let sum = 0;
  let includesInner = false;

  for (const id of selectedTokenIds) {
    const token = tokenMap.get(id);
    if (!token) continue;
    sum += token.value;
    if (token.zone === 'inner') includesInner = true;
  }

  const nearestMultiple = board.targetNumber > 0
    ? Math.ceil(sum / board.targetNumber) * board.targetNumber
    : 0;

  const isValid = includesInner && sum > 0 && sum % board.targetNumber === 0;

  return {
    sum,
    includesInner,
    nearestMultiple,
    isValid,
  };
}

export function readSession() {
  try {
    const raw = localStorage.getItem('celestial-break-session');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSession(session) {
  localStorage.setItem('celestial-break-session', JSON.stringify(session));
}
