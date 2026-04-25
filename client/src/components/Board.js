import React from 'react';
import CoinCell from './CoinCell';
import './Board.css';

export default function Board({ board, selectedCoinIds, onCoinClick }) {
  const selectionOrder = {};
  selectedCoinIds.forEach((id, i) => {
    selectionOrder[id] = i + 1;
  });

  return (
    <div className="board">
      {board.map((coin) => (
        <CoinCell
          key={coin.id}
          coin={coin}
          selectionIndex={selectionOrder[coin.id] || null}
          isSelected={!!selectionOrder[coin.id]}
          onClick={onCoinClick ? () => onCoinClick(coin.id) : null}
          disabled={!onCoinClick}
        />
      ))}
    </div>
  );
}
