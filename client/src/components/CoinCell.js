import React from 'react';
import './CoinCell.css';

const COIN_COLORS = {
  normal: '#4466cc',
  multiplier: '#cc6644',
  echo: '#44cc88',
};

export default function CoinCell({ coin, selectionIndex, isSelected, onClick, disabled }) {
  const color = COIN_COLORS[coin.type] || '#4466cc';

  return (
    <div
      className={`coin-cell coin-${coin.type}${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      style={{ '--coin-color': color }}
      onClick={!disabled && onClick ? onClick : undefined}
      title={
        coin.type === 'multiplier'
          ? `Multiplier ×${coin.multiplier} (value ${coin.value})`
          : coin.type === 'echo'
          ? 'Echo – repeats last coin value'
          : `Value: ${coin.value}`
      }
      role={!disabled && onClick ? 'button' : undefined}
      tabIndex={!disabled && onClick ? 0 : undefined}
      onKeyDown={
        !disabled && onClick
          ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick()
          : undefined
      }
    >
      {isSelected && (
        <span className="selection-index">{selectionIndex}</span>
      )}
      <span className="coin-value">
        {coin.type === 'echo' ? '↺' : coin.value}
      </span>
      {coin.type === 'multiplier' && (
        <span className="coin-mult">×{coin.multiplier}</span>
      )}
    </div>
  );
}
