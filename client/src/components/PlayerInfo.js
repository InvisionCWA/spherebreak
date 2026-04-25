import React from 'react';
import './PlayerInfo.css';

export default function PlayerInfo({ player, isActive, isMe }) {
  return (
    <div
      className={`player-info${isActive ? ' active' : ''}${isMe ? ' is-me' : ''}`}
    >
      <div className="player-name">
        {player.name}
        {isMe && <span className="you-badge">(You)</span>}
        {isActive && <span className="active-dot" />}
      </div>
      <div className="player-score">
        {player.score} <span>pts</span>
      </div>
      <div className="player-chain">
        Chain:{' '}
        <span className={`chain-value chain-${Math.min(player.chain, 5)}`}>
          {player.chain}
        </span>
      </div>
    </div>
  );
}
