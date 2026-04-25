import React from 'react';
import './PlayerInfo.css';

export default function PlayerInfo({ player, quota, isActive, isMe }) {
  const pct = quota > 0 ? Math.min(100, Math.round((player.coinsUsed / quota) * 100)) : 0;

  return (
    <div
      className={`player-info${isActive ? ' active' : ''}${isMe ? ' is-me' : ''}`}
    >
      <div className="player-name">
        {player.name}
        {isMe && <span className="you-badge">(You)</span>}
        {isActive && <span className="active-dot" />}
      </div>
      <div className="player-coins">
        {player.coinsUsed} / {quota}
        <span className="coins-label"> coins</span>
      </div>
      <div className="quota-bar-bg">
        <div className="quota-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {player.echoCount > 0 && (
        <div className="player-echo">
          Echo ×{player.echoCount}
        </div>
      )}
    </div>
  );
}
