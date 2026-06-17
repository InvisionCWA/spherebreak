import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

export default function MainMenu({ profile, onChangeName, onNavigate }) {
  return (
    <div className="screen-grid two-col">
      <CelestialPanel title="Player Session" subtitle="Guest profile for matchmaking">
        <label className="stack-field">
          Display Name
          <input value={profile.displayName} onChange={(e) => onChangeName(e.target.value)} maxLength={20} />
        </label>
        <div className="menu-grid">
          <button className="primary-btn" type="button" onClick={() => onNavigate('lobby')}>Multiplayer Lobby</button>
          <button className="secondary-btn" type="button" onClick={() => onNavigate('tutorial')}>Interactive Tutorial</button>
          <button className="secondary-btn" type="button" onClick={() => onNavigate('leaderboard')}>Leaderboards</button>
          <button className="secondary-btn" type="button" onClick={() => onNavigate('profile')}>Profile</button>
          <button className="secondary-btn" type="button" onClick={() => onNavigate('settings')}>Settings</button>
        </div>
      </CelestialPanel>
      <CelestialPanel title="Game Rules Preview" subtitle="Make valid Break moves">
        <ul className="list-block">
          <li>Select at least one inner token every move.</li>
          <li>Total selected sum must be a multiple of the target number.</li>
          <li>Server validates timing, score, RNG, and winner.</li>
          <li>Ranked mode writes leaderboard stats from trusted server results only.</li>
        </ul>
      </CelestialPanel>
    </div>
  );
}
