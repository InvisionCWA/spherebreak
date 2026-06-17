import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

export default function MatchRoom({ state, onReady, readySelf, onBack }) {
  return (
    <div className="screen-center">
      <CelestialPanel title={`Match Room ${state.code}`} subtitle="Set ready to begin countdown">
        <ul className="player-list">
          {state.players.map((player) => (
            <li key={player.id}>
              <span>{player.displayName}</span>
              <span>{player.ready ? 'Ready' : 'Not ready'}</span>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button type="button" className="primary-btn" onClick={() => onReady(!readySelf)}>{readySelf ? 'Unset Ready' : 'Set Ready'}</button>
          <button type="button" className="ghost-btn" onClick={onBack}>Leave</button>
        </div>
      </CelestialPanel>
    </div>
  );
}
