import React from 'react';
import CoinCell from './CoinCell';
import './Board.css';

export default function Board({ centerCoins, borderCoins, selectedCoinIds, onCoinClick }) {
  const selectionOrder = {};
  selectedCoinIds.forEach((id, i) => {
    selectionOrder[id] = i + 1;
  });

  const renderCoin = (coin) => (
    <CoinCell
      key={coin.id}
      coin={coin}
      selectionIndex={selectionOrder[coin.id] || null}
      isSelected={!!selectionOrder[coin.id]}
      onClick={onCoinClick ? () => onCoinClick(coin.id) : null}
      disabled={!onCoinClick}
    />
  );

  return (
    <div className="board">
      <div className="border-coins">
        {(borderCoins || []).map(renderCoin)}
      </div>
      <div className="center-coins">
        {(centerCoins || []).map(renderCoin)}
      </div>
    </div>
  );
}
