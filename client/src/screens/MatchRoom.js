import React, { useEffect, useState } from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import PlayerIdentity from '../components/ui/PlayerIdentity';

function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil(((endsAt || 0) - Date.now()) / 1000)));

  useEffect(() => {
    if (!endsAt) return undefined;
    setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return secondsLeft;
}

export default function MatchRoom({ state, onReady, readySelf, onBack }) {
  const isStarting = state.status === 'starting';
  const countdown = useCountdown(state.countdownEndsAt);
  const canCopy = typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText;

  return (
    <div className="screen-center">
      <CelestialPanel
        title={`Match Room ${state.code}`}
        subtitle={isStarting ? `Match starting in ${countdown}s` : 'Set ready to begin countdown'}
      >
        <div className="match-code-row">
          <strong className="match-code-text">Code: {state.code}</strong>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => canCopy && navigator.clipboard.writeText(state.code)}
            disabled={!canCopy}
          >
            Copy Code
          </button>
        </div>
        {state.mode === 'ranked' && <p className="ranked-note">Ranked match. Results affect leaderboard.</p>}
        <ul className="player-list" aria-label="Players in match room">
          {state.players.map((player) => (
            <li key={player.id}>
              <PlayerIdentity
                displayName={player.displayName}
                playerRank={player.playerRank}
                isBot={player.isBot}
                meta={player.ready ? 'Ready' : 'Not ready'}
              />
              <span className={player.ready ? 'ready-yes' : 'ready-no'}>{player.ready ? 'Ready' : 'Not ready'}</span>
            </li>
          ))}
        </ul>
        {isStarting ? (
          <p aria-live="polite" aria-label={`Match starting in ${countdown} seconds`} className="countdown-text">Starting in {countdown}...</p>
        ) : (
          <div className="row-actions">
            <button type="button" className="primary-btn" onClick={() => onReady(!readySelf)}>
              {readySelf ? 'Unset Ready' : 'Set Ready'}
            </button>
            <button type="button" className="ghost-btn" onClick={onBack}>Leave</button>
          </div>
        )}
      </CelestialPanel>
    </div>
  );
}
