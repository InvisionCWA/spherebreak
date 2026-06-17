'use strict';

const {
  BASE_RATING,
  MIN_MATCHES_FOR_CONFIDENT_FALLBACK,
  RANK_TIERS,
  calculateFallbackRating,
  buildRankDto,
} = require('../src/domain/rankDomain');

describe('rank domain', () => {
  test('calculates rank from trusted rating first', () => {
    const rank = buildRankDto({ rating: 1250, wins: 8, losses: 1 });

    expect(rank.displayName).toBe('Nova');
    expect(rank.shortLabel).toBe('NOV');
    expect(rank.level).toBe(3);
    expect(rank.nextRankName).toBe('Astral');
    expect(rank.progressToNext).toBeGreaterThan(0);
  });

  test('uses deterministic fallback when rating is missing', () => {
    const expected = BASE_RATING + (4 * 20) - (1 * 10);
    const rank = buildRankDto({ wins: 4, losses: 1 });

    expect(rank.rating).toBe(expected);
    expect(rank.displayName).toBe('Lumen');
  });

  test('fallback fairness caps promotion before minimum matches', () => {
    const rank = buildRankDto({ wins: MIN_MATCHES_FOR_CONFIDENT_FALLBACK - 1, losses: 0 });

    expect(calculateFallbackRating({ wins: MIN_MATCHES_FOR_CONFIDENT_FALLBACK - 1, losses: 0 })).toBeLessThan(RANK_TIERS[2].threshold);
    expect(rank.displayName).toBe('Lumen');
  });

  test('top rank omits next rank details', () => {
    const rank = buildRankDto({ rating: 1550 });

    expect(rank.displayName).toBe('Astral');
    expect(rank.nextThreshold).toBeNull();
    expect(rank.nextRankName).toBeNull();
    expect(rank.progressToNext).toBeNull();
    expect(rank.isTopRank).toBe(true);
  });

  test('malformed stats safely fall back to baseline rank', () => {
    const rank = buildRankDto({ rating: 'oops', wins: 'bad', losses: -10, bestScore: null });

    expect(rank.rating).toBe(BASE_RATING);
    expect(rank.displayName).toBe('Lumen');
    expect(rank.progressToNext).toBeGreaterThanOrEqual(0);
  });

  test('rank tiers remain in progression order', () => {
    const thresholds = RANK_TIERS.map((tier) => tier.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });
});
