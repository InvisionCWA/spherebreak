import React from 'react';
import rankBadgeSprite from '../../assets/rank-badges.svg';

const FALLBACK_RANK = {
  id: 'unranked',
  displayName: 'Unranked',
  shortLabel: '---',
  level: 0,
  iconKey: 'comet',
  colors: {
    bg: 'rgba(140, 163, 255, 0.16)',
    accent: '#8ca3ff',
    text: '#e7ecff',
    border: 'rgba(165, 176, 255, 0.35)',
  },
  progressToNext: null,
  nextRankName: null,
  isTopRank: false,
};

function safeString(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeRank(playerRank) {
  const raw = playerRank && typeof playerRank === 'object' ? playerRank : {};
  const iconKey = safeString(raw.iconKey, FALLBACK_RANK.iconKey).toLowerCase();
  const progress = raw.progressToNext == null ? null : Math.max(0, Math.min(1, safeNumber(raw.progressToNext, 0)));

  return {
    id: safeString(raw.id, FALLBACK_RANK.id),
    displayName: safeString(raw.displayName, FALLBACK_RANK.displayName),
    shortLabel: safeString(raw.shortLabel, FALLBACK_RANK.shortLabel),
    level: Math.max(0, Math.round(safeNumber(raw.level, FALLBACK_RANK.level))),
    iconKey: ['comet', 'lumen', 'nova', 'astral'].includes(iconKey) ? iconKey : FALLBACK_RANK.iconKey,
    colors: {
      bg: safeString(raw?.colors?.bg, FALLBACK_RANK.colors.bg),
      accent: safeString(raw?.colors?.accent, FALLBACK_RANK.colors.accent),
      text: safeString(raw?.colors?.text, FALLBACK_RANK.colors.text),
      border: safeString(raw?.colors?.border, FALLBACK_RANK.colors.border),
    },
    progressToNext: progress,
    nextRankName: raw.nextRankName == null ? null : safeString(raw.nextRankName, null),
    isTopRank: Boolean(raw.isTopRank),
    isFallback: !playerRank,
  };
}

export default function RankBadge({ playerRank, showProgress = false, ariaLabel }) {
  const rank = normalizeRank(playerRank);
  const label = ariaLabel || `${rank.displayName} rank badge`;
  const progressPercent = rank.progressToNext == null ? null : Math.round(rank.progressToNext * 100);

  return (
    <span
      className={`rank-badge rank-badge--${rank.iconKey}${rank.isFallback ? ' rank-badge--fallback' : ''}`}
      style={{
        '--rank-bg': rank.colors.bg,
        '--rank-accent': rank.colors.accent,
        '--rank-text': rank.colors.text,
        '--rank-border': rank.colors.border,
        '--rank-sprite': `url(${rankBadgeSprite})`,
      }}
      aria-label={label}
    >
      <span className={`rank-badge__icon rank-badge__icon--${rank.iconKey}`} aria-hidden="true" />
      <span className="rank-badge__copy">
        <span className="rank-badge__label">{rank.displayName}</span>
        <span className="rank-badge__meta">{rank.shortLabel}{rank.level > 0 ? ` • L${rank.level}` : ''}</span>
      </span>
      {showProgress && progressPercent !== null && (
        <span className="rank-badge__progress" aria-hidden="true">
          <span className="rank-badge__progress-fill" style={{ width: `${progressPercent}%` }} />
        </span>
      )}
    </span>
  );
}
