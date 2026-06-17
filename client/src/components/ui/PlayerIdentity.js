import React from 'react';
import RankBadge, { normalizeRank } from './RankBadge';

export default function PlayerIdentity({
  displayName,
  playerRank,
  isBot = false,
  showProgress = false,
  meta,
  className = '',
}) {
  const safeName = typeof displayName === 'string' && displayName.trim() ? displayName : 'Unknown Pilot';
  const rank = normalizeRank(playerRank);
  const pieces = [safeName, `${rank.displayName} rank`];
  if (isBot) pieces.push('CPU player');
  if (meta) pieces.push(meta);

  return (
    <div className={`player-identity${className ? ` ${className}` : ''}`} aria-label={pieces.join(', ')}>
      <RankBadge playerRank={rank} showProgress={showProgress} ariaLabel={`${safeName} ${rank.displayName} rank`} />
      <div className="player-identity__text">
        <span className="player-identity__name" title={safeName}>{safeName}</span>
        <span className="player-identity__meta">
          {isBot ? 'CPU' : 'Pilot'}
          {meta ? ` • ${meta}` : ''}
        </span>
      </div>
    </div>
  );
}
