import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

export default function Results({ state, onRematch, onExit }) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = state.winnerId
    ? state.players.find((p) => p.id === state.winnerId)
    : sorted[0];

  return (
    <div className="screen-center">
      <CelestialPanel title="Match Results" subtitle={winner ? `Winner: ${winner.displayName}` : 'Match ended'}>
        <ul className="leaderboard-list" aria-label="Final standings">
          {sorted.map((player, index) => (
            <li key={player.id} className={player.id === state.winnerId ? 'winner-row' : ''}>
              <span>{index + 1}. {player.displayName}{player.isBot ? ' (Bot)' : ''}{player.id === state.winnerId ? ' - Winner' : ''}</span>
              <span>{player.score} pts</span>
            </li>
          ))}
        </ul>
        {state.mode === 'ranked' && (
          <p className="ranked-note">Ranked match. Leaderboard updated by server.</p>
        )}
        <div className="row-actions">
          <button type="button" className="primary-btn" onClick={onRematch}>Request Rematch</button>
          <button type="button" className="ghost-btn" onClick={onExit}>Back to Main Menu</button>
        </div>
      </CelestialPanel>
    </div>
  );
}
