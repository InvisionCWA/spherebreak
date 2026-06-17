'use strict';

const DEFAULT_SETTINGS = {
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
    comboRuleType: 'token-count',
  },
};

const MATCH_STATUS = {
  WAITING: 'waiting',
  STARTING: 'starting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

const BOT_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
};

function sanitizeDisplayName(name) {
  const input = String(name || 'Guest').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  if (!input) return 'Guest';
  return input.slice(0, 20);
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function normalizeSettings(input = {}) {
  const targetRange = Array.isArray(input.targetNumberRange) ? input.targetNumberRange : DEFAULT_SETTINGS.targetNumberRange;
  const minTarget = clamp(Number(targetRange[0]) || 1, 1, 9);
  const maxTarget = clamp(Number(targetRange[1]) || 9, minTarget, 9);

  const inner = clamp(Number(input?.boardSize?.inner) || DEFAULT_SETTINGS.boardSize.inner, 1, 5);
  const outer = clamp(Number(input?.boardSize?.outer) || DEFAULT_SETTINGS.boardSize.outer, 6, 24);

  const maxPlayers = clamp(Number(input.maxPlayers) || DEFAULT_SETTINGS.maxPlayers, 2, 4);

  return {
    turnLimit: clamp(Number(input.turnLimit) || DEFAULT_SETTINGS.turnLimit, 4, 60),
    secondsPerTurn: clamp(Number(input.secondsPerTurn) || DEFAULT_SETTINGS.secondsPerTurn, 8, 60),
    quotaToWin: clamp(Number(input.quotaToWin) || DEFAULT_SETTINGS.quotaToWin, 3, 60),
    beginnerHints: input.beginnerHints !== undefined ? Boolean(input.beginnerHints) : DEFAULT_SETTINGS.beginnerHints,
    targetNumberRange: [minTarget, maxTarget],
    boardSize: { inner, outer },
    maxPlayers,
    ranked: Boolean(input.ranked),
    tokenReplacementMode: input.tokenReplacementMode === 'random-refresh' ? 'random-refresh' : DEFAULT_SETTINGS.tokenReplacementMode,
    comboRules: {
      comboStep: clamp(Number(input?.comboRules?.comboStep) || DEFAULT_SETTINGS.comboRules.comboStep, 1, 5),
      comboBonusPerStack: clamp(Number(input?.comboRules?.comboBonusPerStack) || DEFAULT_SETTINGS.comboRules.comboBonusPerStack, 1, 25),
      streakBonusPerStack: clamp(Number(input?.comboRules?.streakBonusPerStack) || DEFAULT_SETTINGS.comboRules.streakBonusPerStack, 1, 25),
      comboRuleType: input?.comboRules?.comboRuleType === 'achieved-multiple' ? 'achieved-multiple' : 'token-count',
    },
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  MATCH_STATUS,
  BOT_DIFFICULTY,
  sanitizeDisplayName,
  normalizeSettings,
};
