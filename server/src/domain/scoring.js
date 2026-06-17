'use strict';

function calculateScore({ sum, tokenCount, combo, streak, secondsLeft, settings }) {
  const difficultyScale = settings.ranked ? 1.2 : 1;
  const speedBonus = Math.max(0, Math.floor(secondsLeft / 2));
  const comboBonus = combo * settings.comboRules.comboBonusPerStack;
  const streakBonus = streak * settings.comboRules.streakBonusPerStack;
  const tokenBonus = tokenCount * 3;

  const total = Math.floor((sum * 10 + speedBonus + comboBonus + streakBonus + tokenBonus) * difficultyScale);

  return {
    total,
    breakdown: {
      base: sum * 10,
      speedBonus,
      comboBonus,
      streakBonus,
      tokenBonus,
      difficultyScale,
    },
  };
}

module.exports = { calculateScore };
