import React from 'react';
import './CoinCell.css';

const COIN_COLORS = {
  center: '#4488dd',
  center_echo: '#cc8822',
  border: '#4466cc',
};

export default function CoinCell({ coin, selectionIndex, isSelected, onClick, disabled }) {
  const color = COIN_COLORS[coin.type] || '#4466cc';

  const title =
    coin.type === 'center_echo'
      ? `Center (Echo) – value ${coin.value}; multiplier-echo bonus when same multiplier repeats`
      : coin.type === 'center'
      ? `Center – value ${coin.value}`
      : `Border – value ${coin.value}`;

  return (
    <div
      className={`coin-cell coin-${coin.type}${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      style={{ '--coin-color': color }}
      onClick={!disabled && onClick ? onClick : undefined}
      title={title}
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
      <span className="coin-value">{coin.value}</span>
      {coin.type === 'center_echo' && (
        <span className="coin-echo-badge">↺</span>
      )}
    </div>
  );
}
