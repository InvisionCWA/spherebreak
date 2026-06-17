import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import RankBadge from '../components/ui/RankBadge';

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
                  <strong>{entry.rank}. {entry.displayName}</strong>
                  {entry.isBot && <small> (Bot)</small>}
                  <small>{entry.wins}W / {entry.losses}L</small>
                </div>
                <div>
                  <RankBadge rating={entry.rating} />
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
                <span>{entry.rank}. {entry.displayName}</span>
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
