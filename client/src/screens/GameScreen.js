import React, { useEffect, useState } from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import OrbToken from '../components/ui/OrbToken';

function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return secondsLeft;
}

export default function GameScreen({ state, selfId, selected, onSelect, movePreview, onSubmit, moveError, lastMove }) {
  const self = state.players.find((p) => p.id === selfId);
  const activeId = state.currentTurnPlayerId;
  const isMyTurn = activeId === selfId;
  const showHints = state.settings.beginnerHints !== false;
  const timerSeconds = useCountdown(state.turnEndsAt || Date.now());
  const timerUrgent = timerSeconds <= 5;

  const selectionOrder = Object.fromEntries(selected.map((id, index) => [id, index + 1]));
  const activePlayer = state.players.find((p) => p.id === activeId);

  return (
    <div className="screen-grid game-layout">
      <CelestialPanel title="Players" subtitle={`Turn ${state.turnCount} / ${state.settings.turnLimit}`}>
        <ul className="player-list" aria-label="Player scores">
          {state.players.map((player) => (
            <li key={player.id} className={player.id === activeId ? 'active-player' : ''}>
              <div>
                <strong>{player.displayName}</strong>
                <small>{player.isBot ? 'Bot' : 'Player'}{player.id === selfId ? ' (You)' : ''}</small>
              </div>
              <div className="score-block">
                <span>{player.score} pts</span>
                <small>quota {player.quotaProgress}/{state.settings.quotaToWin}</small>
              </div>
            </li>
          ))}
        </ul>
      </CelestialPanel>

      <CelestialPanel title="Board" subtitle={`Target ${state.board.targetNumber} | Board v${state.board.version}`} className="board-panel">
        <div className="core-orb" aria-label={`Target number ${state.board.targetNumber}`}>{state.board.targetNumber}</div>
        <h4>Inner Tokens <small>(at least one required)</small></h4>
        <div className="token-row">
          {state.board.innerTokens.map((token) => (
            <OrbToken
              key={token.id}
              token={token}
              selected={Boolean(selectionOrder[token.id])}
              selectionIndex={selectionOrder[token.id]}
              onClick={() => onSelect(token.id)}
              disabled={!isMyTurn}
            />
          ))}
        </div>

        <h4>Outer Tokens</h4>
        <div className="token-grid">
          {state.board.outerTokens.map((token) => (
            <OrbToken
              key={token.id}
              token={token}
              selected={Boolean(selectionOrder[token.id])}
              selectionIndex={selectionOrder[token.id]}
              onClick={() => onSelect(token.id)}
              disabled={!isMyTurn}
            />
          ))}
        </div>
      </CelestialPanel>

      <CelestialPanel title="Turn HUD" subtitle={isMyTurn ? 'Your turn' : `Waiting for ${activePlayer?.displayName || 'opponent'}`}>
        <p className={timerUrgent ? 'timer-urgent' : ''} aria-live="polite" aria-label={`Time remaining: ${timerSeconds} seconds`}>
          Time: {timerSeconds}s
        </p>
        {showHints && <p>Selected sum: {movePreview.sum}</p>}
        {showHints && <p>Includes inner token: {movePreview.includesInner ? 'Yes' : 'No'}</p>}
        {showHints && movePreview.sum > 0 && !movePreview.isValid && (
          <p>Nearest multiple: {movePreview.nearestMultiple || 0}</p>
        )}
        <p aria-live="polite">Selection: {movePreview.isValid ? 'Valid Break' : (selected.length > 0 ? 'Not valid yet' : 'No tokens selected')}</p>

        <button
          type="button"
          className="primary-btn"
          onClick={onSubmit}
          disabled={!isMyTurn || selected.length === 0 || !movePreview.includesInner}
          aria-disabled={!isMyTurn || selected.length === 0 || !movePreview.includesInner}
        >
          Submit Move
        </button>
        {moveError && <p className="error-text" role="alert">{moveError}</p>}
        {lastMove && (
          <div className="result-box" aria-label="Last move result">
            <p>Last: {state.players.find((p) => p.id === lastMove.playerId)?.displayName || 'player'}</p>
            <p>sum {lastMove.sum}, +{lastMove.scoreGain} pts</p>
            {lastMove.combo > 0 && <p>combo {lastMove.combo} / streak {lastMove.streak}</p>}
          </div>
        )}
        <p>Your score: {self?.score || 0} pts</p>
        {self && <p>Combo: {self.combo} / Streak: {self.streak}</p>}
      </CelestialPanel>
    </div>
  );
}
