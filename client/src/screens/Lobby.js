import React, { useState } from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import PlayerIdentity from '../components/ui/PlayerIdentity';

export default function Lobby({ lobbyList, onCreate, onJoin, onQueue, onBack }) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="screen-grid two-col">
      <CelestialPanel title="Create or Join Match" subtitle="Ranked, casual, and practice modes">
        <div className="menu-grid">
          <button className="primary-btn" type="button" onClick={() => onCreate({ ranked: false })}>Create Casual Match</button>
          <button className="primary-btn" type="button" onClick={() => onCreate({ ranked: true })}>Create Ranked Match</button>
          <button className="secondary-btn" type="button" onClick={() => onCreate({ ranked: false, botDifficulty: 'easy' })}>Practice vs Easy Bot</button>
          <button className="secondary-btn" type="button" onClick={() => onCreate({ ranked: false, botDifficulty: 'normal' })}>Practice vs Normal Bot</button>
          <button className="secondary-btn" type="button" onClick={() => onCreate({ ranked: false, botDifficulty: 'hard' })}>Practice vs Hard Bot</button>
          <button className="secondary-btn" type="button" onClick={onQueue}>Join Quick Queue (casual preview)</button>
        </div>
        <p className="empty-state">Quick Queue currently pairs two casual players with default settings.</p>

        <label className="stack-field">
          Join by Match Code
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="Enter 6-character code"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
        </label>
        <button className="secondary-btn" type="button" onClick={() => onJoin(joinCode)} disabled={!joinCode.trim()}>Join Match</button>
        <button className="ghost-btn" type="button" onClick={onBack}>Back</button>
      </CelestialPanel>

      <CelestialPanel title="Open Lobbies" subtitle="Public waiting rooms">
        {lobbyList.length === 0 ? (
          <p className="empty-state">No open lobbies right now. Create a match or use Quick Queue.</p>
        ) : (
          <ul className="lobby-list">
            {lobbyList.map((match) => (
              <li key={match.id}>
                <div>
                  <strong>{match.code}</strong>
                  <small>{match.mode}</small>
                  <ul className="lobby-player-list" aria-label={`Players in lobby ${match.code}`}>
                    {match.players.map((player) => (
                      <li key={player.id}>
                        <PlayerIdentity
                          displayName={player.displayName}
                          playerRank={player.playerRank}
                          isBot={player.isBot}
                          meta={player.ready ? 'Ready' : 'Waiting'}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lobby-list__actions">
                  <div>{match.players.length}/{match.maxPlayers}</div>
                  <button type="button" className="secondary-btn" onClick={() => onJoin(match.code)}>Join</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CelestialPanel>
    </div>
  );
}
