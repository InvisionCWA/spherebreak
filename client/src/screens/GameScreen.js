import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import OrbToken from '../components/ui/OrbToken';

export default function GameScreen({ state, selfId, selected, onSelect, movePreview, onSubmit, moveError, lastMove }) {
  const self = state.players.find((p) => p.id === selfId);
  const activeId = state.currentTurnPlayerId;
  const isMyTurn = activeId === selfId;
  const showHints = state.settings.beginnerHints !== false;

  const selectionOrder = Object.fromEntries(selected.map((id, index) => [id, index + 1]));

  return (
    <div className="screen-grid game-layout">
      <CelestialPanel title="Players" subtitle={`Turn ${state.turnCount} / ${state.settings.turnLimit}`}>
        <ul className="player-list">
          {state.players.map((player) => (
            <li key={player.id} className={player.id === activeId ? 'active-player' : ''}>
              <div>
                <strong>{player.displayName}</strong>
                <small>{player.isBot ? 'Bot' : 'Player'}</small>
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
        <div className="core-orb">{state.board.targetNumber}</div>
        <h4>Inner Tokens (must include at least one)</h4>
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

      <CelestialPanel title="Turn HUD" subtitle={isMyTurn ? 'Your turn' : `Waiting for ${state.players.find((p) => p.id === activeId)?.displayName || 'player'}`}>
        <p>Timer: {Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000))}s</p>
        {showHints && <p>Selected sum: {movePreview.sum}</p>}
        {showHints && <p>Includes inner token: {movePreview.includesInner ? 'Yes' : 'No'}</p>}
        {showHints && <p>Nearest multiple: {movePreview.nearestMultiple || 0}</p>}
        <p>Selection status: {movePreview.isValid ? 'Valid Break' : 'Not valid yet'}</p>

        <button type="button" className="primary-btn" onClick={onSubmit} disabled={!isMyTurn || selected.length === 0}>Submit Move</button>
        {moveError && <p className="error-text">{moveError}</p>}
        {lastMove && (
          <div className="result-box">
            <p>Last move by {state.players.find((p) => p.id === lastMove.playerId)?.displayName || 'player'}</p>
            <p>sum {lastMove.sum}, gain {lastMove.scoreGain}</p>
            <p>combo {lastMove.combo}, streak {lastMove.streak}</p>
          </div>
        )}
        <p>Self score: {self?.score || 0}</p>
      </CelestialPanel>
    </div>
  );
}
