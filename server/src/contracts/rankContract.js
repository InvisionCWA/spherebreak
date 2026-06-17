'use strict';

const DEFAULT_RANK_COLORS = Object.freeze({
  bg: 'rgba(140, 163, 255, 0.16)',
  accent: '#8ca3ff',
  text: '#e7ecff',
  border: 'rgba(165, 176, 255, 0.35)',
});

function sanitizeString(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function sanitizeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeColors(colors = {}) {
  return {
    bg: sanitizeString(colors.bg, DEFAULT_RANK_COLORS.bg),
    accent: sanitizeString(colors.accent, DEFAULT_RANK_COLORS.accent),
    text: sanitizeString(colors.text, DEFAULT_RANK_COLORS.text),
    border: sanitizeString(colors.border, DEFAULT_RANK_COLORS.border),
  };
}

function toPublicRankDto(rank = {}) {
  return {
    id: sanitizeString(rank.id, 'comet'),
    displayName: sanitizeString(rank.displayName, 'Comet'),
    shortLabel: sanitizeString(rank.shortLabel, 'COM'),
    level: Math.max(1, Math.floor(sanitizeNumber(rank.level, 1))),
    iconKey: sanitizeString(rank.iconKey, 'comet'),
    colors: sanitizeColors(rank.colors),
    rating: Math.max(0, Math.round(sanitizeNumber(rank.rating, 1000))),
    threshold: Math.max(0, Math.round(sanitizeNumber(rank.threshold, 0))),
    nextThreshold: rank.nextThreshold === null || rank.nextThreshold === undefined ? null : Math.max(0, Math.round(sanitizeNumber(rank.nextThreshold, 0))),
    progressToNext: rank.progressToNext === null || rank.progressToNext === undefined ? null : Math.max(0, Math.min(1, sanitizeNumber(rank.progressToNext, 0))),
    nextRankName: rank.nextRankName === null || rank.nextRankName === undefined ? null : sanitizeString(rank.nextRankName, null),
    isTopRank: Boolean(rank.isTopRank),
  };
}

module.exports = {
  DEFAULT_RANK_COLORS,
  toPublicRankDto,
};
