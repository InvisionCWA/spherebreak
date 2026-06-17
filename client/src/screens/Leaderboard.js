import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import PlayerIdentity from '../components/ui/PlayerIdentity';

export default function Leaderboard({ entries, weeklyEntries, onRefresh, onBack }) {
  return (
    <div className="screen-grid two-col">
      <CelestialPanel title="All-Time Ranked Leaderboard" subtitle="Server-trusted completed ranked matches only">
        {entries.length === 0 ? (
          <p className="empty-state">No ranked matches recorded yet. Complete a ranked match to appear here.</p>
        ) : (
          <ul className="leaderboard-list" aria-label="All-time leaderboard">
            {entries.map((entry) => (
              <li key={entry.userId}>
                <div>
                  <PlayerIdentity
                    displayName={`${entry.rank}. ${entry.displayName}`}
                    playerRank={entry.playerRank}
                    isBot={entry.isBot}
                    meta={`${entry.wins}W / ${entry.losses}L`}
                  />
                </div>
                <div className="leaderboard-points">
                  <strong>{entry.rating}</strong>
                  <small>rating</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CelestialPanel>
      <CelestialPanel title="Weekly Ranked Leaderboard" subtitle="Last 7 days">
        {weeklyEntries.length === 0 ? (
          <p className="empty-state">No ranked activity in the last 7 days.</p>
        ) : (
          <ul className="leaderboard-list" aria-label="Weekly leaderboard">
            {weeklyEntries.map((entry) => (
              <li key={entry.userId}>
                <PlayerIdentity
                  displayName={`${entry.rank}. ${entry.displayName}`}
                  playerRank={entry.playerRank}
                  meta={`${entry.matches} ranked matches`}
                />
                <span>{entry.weeklyScore} pts</span>
              </li>
            ))}
          </ul>
        )}
        <div className="row-actions">
          <button type="button" className="secondary-btn" onClick={onRefresh}>Refresh</button>
          <button type="button" className="ghost-btn" onClick={onBack}>Back</button>
        </div>
      </CelestialPanel>
    </div>
  );
}
