'use strict';

const { toPublicRankDto } = require('../contracts/rankContract');

const MIN_MATCHES_FOR_CONFIDENT_FALLBACK = 3;
const BASE_RATING = 1000;
const MAX_FALLBACK_BEFORE_MIN_MATCHES = 1199;

const RANK_TIERS = Object.freeze([
  Object.freeze({
    id: 'comet',
    displayName: 'Comet',
    shortLabel: 'COM',
    level: 1,
    iconKey: 'comet',
    threshold: 0,
    colors: Object.freeze({
      bg: 'rgba(64, 88, 184, 0.24)',
      accent: '#8ca3ff',
      text: '#e7ecff',
      border: 'rgba(140, 163, 255, 0.45)',
    }),
  }),
  Object.freeze({
    id: 'lumen',
    displayName: 'Lumen',
    shortLabel: 'LUM',
    level: 2,
    iconKey: 'lumen',
    threshold: 1000,
    colors: Object.freeze({
      bg: 'rgba(44, 144, 201, 0.24)',
      accent: '#76d4ff',
      text: '#f1fbff',
      border: 'rgba(118, 212, 255, 0.45)',
    }),
  }),
  Object.freeze({
    id: 'nova',
    displayName: 'Nova',
    shortLabel: 'NOV',
    level: 3,
    iconKey: 'nova',
    threshold: 1200,
    colors: Object.freeze({
      bg: 'rgba(111, 78, 213, 0.24)',
      accent: '#bea9ff',
      text: '#f7f2ff',
      border: 'rgba(190, 169, 255, 0.45)',
    }),
  }),
  Object.freeze({
    id: 'astral',
    displayName: 'Astral',
    shortLabel: 'AST',
    level: 4,
    iconKey: 'astral',
    threshold: 1400,
    colors: Object.freeze({
      bg: 'rgba(200, 116, 53, 0.24)',
      accent: '#ffd2af',
      text: '#fff7f0',
      border: 'rgba(255, 210, 175, 0.45)',
    }),
  }),
]);

function sanitizeCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function sanitizeRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

function normalizeStats(stats = {}) {
  const wins = sanitizeCount(stats.wins);
  const losses = sanitizeCount(stats.losses);
  const bestScore = sanitizeCount(stats.bestScore);
  const bestCombo = sanitizeCount(stats.bestCombo);
  const bestStreak = sanitizeCount(stats.bestStreak);
  const fastestValidBreakMs = Number.isFinite(Number(stats.fastestValidBreakMs))
    ? Math.max(0, Math.round(Number(stats.fastestValidBreakMs)))
    : null;

  return {
    rating: sanitizeRating(stats.rating),
    wins,
    losses,
    bestScore,
    bestCombo,
    bestStreak,
    fastestValidBreakMs,
    totalMatches: wins + losses,
  };
}

function calculateFallbackRating(stats = {}) {
  const normalized = normalizeStats(stats);
  const estimate = BASE_RATING + (normalized.wins * 20) - (normalized.losses * 10);
  if (normalized.totalMatches < MIN_MATCHES_FOR_CONFIDENT_FALLBACK) {
    return Math.min(estimate, MAX_FALLBACK_BEFORE_MIN_MATCHES);
  }
  return Math.max(0, estimate);
}

function resolveRating(stats = {}) {
  const normalized = normalizeStats(stats);
  return normalized.rating == null ? calculateFallbackRating(normalized) : normalized.rating;
}

function getRankTierForRating(rating) {
  const safeRating = Math.max(0, Math.round(Number.isFinite(rating) ? rating : BASE_RATING));
  let tier = RANK_TIERS[0];
  for (const candidate of RANK_TIERS) {
    if (safeRating >= candidate.threshold) {
      tier = candidate;
    }
  }
  return tier;
}

function getNextRankTier(tierId) {
  const index = RANK_TIERS.findIndex((tier) => tier.id === tierId);
  if (index < 0 || index >= RANK_TIERS.length - 1) return null;
  return RANK_TIERS[index + 1];
}

function calculateProgressToNext(rating, tier, nextTier) {
  if (!nextTier) return null;
  const span = Math.max(1, nextTier.threshold - tier.threshold);
  const bounded = Math.max(0, Math.min(span, rating - tier.threshold));
  return Number((bounded / span).toFixed(4));
}

function buildRankDto(stats = {}) {
  const rating = resolveRating(stats);
  const tier = getRankTierForRating(rating);
  const nextTier = getNextRankTier(tier.id);
  return toPublicRankDto({
    ...tier,
    rating,
    threshold: tier.threshold,
    nextThreshold: nextTier?.threshold ?? null,
    progressToNext: calculateProgressToNext(rating, tier, nextTier),
    nextRankName: nextTier?.displayName ?? null,
    isTopRank: !nextTier,
  });
}

module.exports = {
  BASE_RATING,
  MIN_MATCHES_FOR_CONFIDENT_FALLBACK,
  RANK_TIERS,
  normalizeStats,
  calculateFallbackRating,
  resolveRating,
  getRankTierForRating,
  buildRankDto,
};
