import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import PlayerIdentity from '../components/ui/PlayerIdentity';

function getNextRankMessage(playerRank) {
  if (playerRank?.isTopRank) return 'Top celestial rank reached';
  return `Next rank: ${playerRank?.nextRankName || 'Pending'}`;
}

export default function Profile({ profile, onLoad, onBack }) {
  return (
    <div className="screen-center">
      <CelestialPanel title="Player Profile" subtitle="Server-trusted ranked summary">
        {profile ? (
          <>
            <PlayerIdentity
              displayName={profile.displayName}
              playerRank={profile.playerRank}
              isBot={profile.isBot}
              showProgress={!profile.playerRank?.isTopRank}
              meta={`Created ${new Date(profile.createdAt).toLocaleDateString()}`}
              className="profile-identity"
            />
            <div className="profile-grid">
              <p>Wins: {profile.stats.wins}</p>
              <p>Losses: {profile.stats.losses}</p>
              <p>Win rate: {(profile.stats.winRate * 100).toFixed(1)}%</p>
              <p>Best score: {profile.stats.bestScore}</p>
              <p>Best combo: {profile.stats.bestCombo}</p>
              <p>Best streak: {profile.stats.bestStreak}</p>
              <p>Fastest valid Break: {profile.stats.fastestValidBreakMs ?? 'n/a'} ms</p>
              <p>{getNextRankMessage(profile.playerRank)}</p>
            </div>
          </>
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
