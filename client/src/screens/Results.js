import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

export default function Results({ state, onRematch, onExit }) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className="screen-center">
      <CelestialPanel title="Match Results" subtitle={`Winner: ${winner?.displayName || 'No winner'}`}>
        <ul className="leaderboard-list">
          {sorted.map((player, index) => (
            <li key={player.id}>
              <span>{index + 1}. {player.displayName}</span>
              <span>{player.score} pts</span>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button type="button" className="primary-btn" onClick={onRematch}>Request Rematch</button>
          <button type="button" className="ghost-btn" onClick={onExit}>Back to Main Menu</button>
        </div>
      </CelestialPanel>
    </div>
  );
}
