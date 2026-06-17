import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import RankBadge from '../components/ui/RankBadge';

export default function Profile({ profile, onLoad, onBack }) {
  return (
    <div className="screen-center">
      <CelestialPanel title="Player Profile" subtitle={profile?.displayName || 'Not loaded'}>
        {profile ? (
          <div className="profile-grid">
            <RankBadge rating={profile.stats.rating} />
            <p>Wins: {profile.stats.wins}</p>
            <p>Losses: {profile.stats.losses}</p>
            <p>Win rate: {(profile.stats.winRate * 100).toFixed(1)}%</p>
            <p>Best score: {profile.stats.bestScore}</p>
            <p>Best combo: {profile.stats.bestCombo}</p>
            <p>Best streak: {profile.stats.bestStreak}</p>
            <p>Fastest valid Break: {profile.stats.fastestValidBreakMs ?? 'n/a'} ms</p>
          </div>
        ) : (
          <p>Profile data not available yet.</p>
        )}
        <div className="row-actions">
          <button type="button" className="secondary-btn" onClick={onLoad}>Load Profile</button>
          <button type="button" className="ghost-btn" onClick={onBack}>Back</button>
        </div>
      </CelestialPanel>
    </div>
  );
}
