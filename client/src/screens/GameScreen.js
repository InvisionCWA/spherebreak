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

function ComboExplanation({ lastMove, comboRuleType }) {
  if (!lastMove) return null;
  const { combo, comboIncreased, comboContinued, tokenCount, achievedMultiple } = lastMove;

  if (combo <= 0) return null;

  let detail = '';
  if (comboRuleType === 'achieved-multiple') {
    if (comboContinued && comboIncreased) {
      detail = `Chain maintained — same multiple (×${achievedMultiple})`;
    } else if (!comboContinued) {
      detail = `Break Chain started (×${achievedMultiple})`;
    } else {
      detail = `Break Chain reset — multiple changed (×${achievedMultiple})`;
    }
  } else {
    if (comboContinued && comboIncreased) {
      detail = `Chain maintained — same token count (${tokenCount})`;
    } else if (!comboContinued) {
      detail = `Break Chain started (${tokenCount} token${tokenCount !== 1 ? 's' : ''})`;
    } else {
      detail = `Chain reset — token count changed (${tokenCount})`;
    }
  }

  return (
    <p className="combo-explanation" aria-live="polite">
      {detail}
    </p>
  );
}

export default function GameScreen({
  state,
  selfId,
  selected,
  onSelect,
  movePreview,
  onSubmit,
  onClearSelection,
  moveError,
  lastMove,
  isSubmittingMove,
}) {
  const self = state.players.find((p) => p.id === selfId);
  const activeId = state.currentTurnPlayerId;
  const isMyTurn = activeId === selfId;
  const showHints = state.settings.beginnerHints !== false;
  const timerSeconds = useCountdown(state.turnEndsAt || Date.now());
  const timerUrgent = timerSeconds <= 5;
  const turnsLeft = state.turnsLeft ?? Math.max(0, state.settings.turnLimit - state.turnCount + 1);
  const turnsLowWarn = turnsLeft <= 3 && turnsLeft > 0;
  const comboRuleType = state.settings.comboRules?.comboRuleType || 'token-count';

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
                {player.combo > 0 && <small>combo {player.combo}</small>}
              </div>
            </li>
          ))}
        </ul>
        <p
          className={turnsLowWarn ? 'turns-left-warning' : 'turns-left'}
          aria-live="polite"
          aria-label={`${turnsLeft} turns remaining`}
        >
          Turns left: {turnsLeft}
          {turnsLowWarn && ' ⚠'}
        </p>
      </CelestialPanel>

      <CelestialPanel title="Board" subtitle={`Target ${state.board.targetNumber} | Board v${state.board.version}`} className="board-panel">
        <p className="target-help">Pick tokens that add up to a positive multiple of {state.board.targetNumber}.</p>
        <div className="core-orb" aria-label={`Target number ${state.board.targetNumber}`}>{state.board.targetNumber}</div>

        {showHints && (
          <div className="multiples-preview" aria-label="Possible valid totals">
            <small>
              Valid totals:&nbsp;
              {movePreview.nextMultiples.map((m, i) => (
                <span
                  key={m}
                  className={movePreview.isValid && m === movePreview.sum ? 'multiple-current' : 'multiple-upcoming'}
                >
                  {i > 0 ? ', ' : ''}{m}
                </span>
              ))}
            </small>
          </div>
        )}

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
        <p>Tokens used: {selected.length}</p>
        {showHints && <p>Selected sum: {movePreview.sum}</p>}
        {showHints && movePreview.isValid && (
          <p className="valid-break-label" aria-live="polite">
            Target ×{movePreview.achievedMultiple} = {movePreview.sum} ✓
          </p>
        )}
        {showHints && <p>Includes inner token: {movePreview.includesInner ? 'Yes' : <span className="hint-warning">No — required</span>}</p>}
        {showHints && movePreview.sum > 0 && !movePreview.isValid && (
          <p>Nearest multiple: {movePreview.nearestMultiple}</p>
        )}
        <p aria-live="polite">Selection: {movePreview.isValid ? '✓ Valid Break' : (selected.length > 0 ? 'Not valid yet' : 'No tokens selected')}</p>

        <button
          type="button"
          className="primary-btn"
          onClick={onSubmit}
          disabled={!isMyTurn || selected.length === 0 || !movePreview.includesInner || isSubmittingMove}
          aria-disabled={!isMyTurn || selected.length === 0 || !movePreview.includesInner || isSubmittingMove}
        >
          {isSubmittingMove ? 'Submitting...' : 'Submit Break'}
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={onClearSelection}
          disabled={selected.length === 0 || isSubmittingMove}
        >
          Clear Selection
        </button>
        {moveError && <p className="error-text" role="alert">{moveError}</p>}
        {lastMove && (
          <div className="result-box" aria-label="Last move result">
            <p>Last: {state.players.find((p) => p.id === lastMove.playerId)?.displayName || 'player'}</p>
            <p>sum {lastMove.sum}{lastMove.achievedMultiple ? ` (×${lastMove.achievedMultiple})` : ''}, +{lastMove.scoreGain} pts</p>
            {lastMove.tokenCount !== null && lastMove.tokenCount !== undefined && <p>Tokens used: {lastMove.tokenCount}</p>}
            {lastMove.combo > 0 && <p>Combo {lastMove.combo} / Streak {lastMove.streak}</p>}
            <ComboExplanation lastMove={lastMove} comboRuleType={comboRuleType} />
          </div>
        )}
        <p>Your score: {self?.score || 0} pts</p>
        <p>Quota: {self?.quotaProgress || 0} / {state.settings.quotaToWin}</p>
        {self && <p>Combo: {self.combo} / Streak: {self.streak}</p>}
      </CelestialPanel>
    </div>
  );
}
