import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import RankBadge from '../components/ui/RankBadge';

export default function Leaderboard({ entries, weeklyEntries, onRefresh, onBack }) {
  return (
    <div className="screen-grid two-col">
      <CelestialPanel title="All-Time Ranked Leaderboard" subtitle="Server-trusted completed ranked matches only">
        <ul className="leaderboard-list">
          {entries.map((entry) => (
            <li key={entry.userId}>
              <div>
                <strong>{entry.rank}. {entry.displayName}</strong>
                <small>{entry.wins}W / {entry.losses}L</small>
              </div>
              <div>
                <RankBadge rating={entry.rating} />
              </div>
            </li>
          ))}
        </ul>
      </CelestialPanel>
      <CelestialPanel title="Weekly Ranked Leaderboard" subtitle="Last 7 days">
        <ul className="leaderboard-list">
          {weeklyEntries.map((entry) => (
            <li key={entry.userId}>
              <span>{entry.rank}. {entry.displayName}</span>
              <span>{entry.weeklyScore}</span>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button type="button" className="secondary-btn" onClick={onRefresh}>Refresh</button>
          <button type="button" className="ghost-btn" onClick={onBack}>Back</button>
        </div>
      </CelestialPanel>
    </div>
  );
}
