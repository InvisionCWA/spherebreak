import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import PlayerIdentity from '../components/ui/PlayerIdentity';

export default function Results({ state, onRematch, onExit }) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = state.winnerId
    ? (state.players.find((p) => p.id === state.winnerId) ?? sorted[0])
    : sorted[0];

  return (
    <div className="screen-center">
      <CelestialPanel title="Match Results" subtitle="Final standings">
        {winner && (
          <div className="results-winner">
            <span className="results-winner__label">Winner</span>
            <PlayerIdentity
              displayName={winner.displayName}
              playerRank={winner.playerRank}
              isBot={winner.isBot}
              meta={winner.id === state.winnerId ? 'Server verified' : 'Highest score'}
            />
          </div>
        )}
        <ul className="leaderboard-list" aria-label="Final standings">
          {sorted.map((player, index) => (
            <li key={player.id} className={player.id === state.winnerId ? 'winner-row' : ''}>
              <PlayerIdentity
                displayName={`${index + 1}. ${player.displayName}${player.id === state.winnerId ? ' - Winner' : ''}`}
                playerRank={player.playerRank}
                isBot={player.isBot}
                meta={player.id === state.winnerId ? 'Winner' : 'Final standing'}
              />
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
