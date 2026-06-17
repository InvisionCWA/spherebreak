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
  if (!board) {
    return {
      sum: 0,
      isValid: false,
      nearestMultiple: 0,
      includesInner: false,
      achievedMultiple: null,
      nextMultiples: [],
    };
  }

  if (!selectedTokenIds.length) {
    const target = board.targetNumber;
    return {
      sum: 0,
      isValid: false,
      nearestMultiple: target,
      includesInner: false,
      achievedMultiple: null,
      nextMultiples: Array.from({ length: 4 }, (_, i) => (i + 1) * target),
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

  const target = board.targetNumber;
  const nearestMultiple = sum > 0 && target > 0
    ? Math.ceil(sum / target) * target
    : target;

  const isValid = includesInner && sum > 0 && target > 0 && sum % target === 0;
  const achievedMultiple = isValid ? sum / target : null;

  // nextMultiples: upcoming valid totals above the current aim point.
  // When sum is already valid, show multiples starting after the current sum.
  // When sum is 0 or invalid, show multiples starting at or after nearestMultiple.
  let nextMultiples = [];
  if (target > 0) {
    const baseMultiplier = isValid
      ? Math.floor(sum / target)
      : Math.floor(nearestMultiple / target);
    // Show 4 multiples starting from the current aim (include current when valid)
    // or from the nearest target when not valid.
    const startOffset = isValid ? 1 : 0;
    nextMultiples = Array.from({ length: 4 }, (_, i) => (baseMultiplier + startOffset + i) * target);
  }

  return {
    sum,
    includesInner,
    nearestMultiple,
    isValid,
    achievedMultiple,
    nextMultiples,
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
