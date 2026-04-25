import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import Board from './components/Board';
import CoreDisplay from './components/CoreDisplay';
import PlayerInfo from './components/PlayerInfo';
import RunningSum from './components/RunningSum';
import Timer from './components/Timer';

const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [selectedCoinIds, setSelectedCoinIds] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [turnTimer, setTurnTimer] = useState(120);
  const [moveResult, setMoveResult] = useState(null);
  const [moveError, setMoveError] = useState(null);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('JOINED_GAME', ({ playerIndex: idx, playerId: pid }) => {
      setPlayerIndex(idx);
      setPlayerId(pid);
      setJoined(true);
    });

    s.on('GAME_STATE_UPDATE', ({ state }) => {
      setGameState(state);
      setTurnTimer(state.turnTimer);
      if (state.lastMoveResult) {
        setMoveResult(state.lastMoveResult);
        setTimeout(() => setMoveResult(null), 2500);
      }
      setSelectedCoinIds([]);
    });

    s.on('TIMER_TICK', ({ turnTimer: t }) => {
      setTurnTimer(t);
    });

    s.on('MOVE_ERROR', ({ error }) => {
      setMoveError(error);
      setTimeout(() => setMoveError(null), 2000);
    });

    s.on('PLAYER_DISCONNECTED', () => {
      setDisconnected(true);
    });

    return () => s.disconnect();
  }, []);

  const joinGame = useCallback(() => {
    if (socket && playerName.trim()) {
      socket.emit('JOIN_GAME', { playerName: playerName.trim() });
    }
  }, [socket, playerName]);

  const toggleCoin = useCallback((coinId) => {
    setSelectedCoinIds((prev) => {
      if (prev.includes(coinId)) {
        return prev.filter((id) => id !== coinId);
      }
      return [...prev, coinId];
    });
  }, []);

  const submitMove = useCallback(() => {
    if (socket && selectedCoinIds.length > 0) {
      socket.emit('SUBMIT_MOVE', { selectedCoinIds });
    }
  }, [socket, selectedCoinIds]);

  const isMyTurn =
    gameState != null &&
    playerId != null &&
    gameState.status === 'playing' &&
    gameState.players[gameState.currentPlayerIndex].id === playerId;

  // Compute running sum from selected coins (mirrors server echo logic)
  const runningSum = useMemo(() => {
    if (!gameState) return 0;
    const boardMap = new Map(gameState.board.map((c) => [c.id, c]));
    let sum = 0;
    let lastValue = 0;
    for (const id of selectedCoinIds) {
      const coin = boardMap.get(id);
      if (!coin) continue;
      if (coin.type === 'echo') {
        sum += lastValue;
      } else {
        sum += coin.value;
        lastValue = coin.value;
      }
    }
    return sum;
  }, [gameState, selectedCoinIds]);

  if (disconnected) {
    return (
      <div className="App lobby">
        <div className="lobby-box">
          <h1>Sphere Break</h1>
          <p className="error">
            A player has disconnected. Please refresh to start a new game.
          </p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="App lobby">
        <div className="lobby-box">
          <h1>⬡ Sphere Break</h1>
          <p>A turn-based numerical puzzle game</p>
          <input
            className="name-input"
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinGame()}
            maxLength={20}
          />
          <button
            className="join-btn"
            onClick={joinGame}
            disabled={!playerName.trim()}
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (!gameState || gameState.status === 'waiting') {
    return (
      <div className="App lobby">
        <div className="lobby-box">
          <h1>⬡ Sphere Break</h1>
          <p>Waiting for another player to join…</p>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (gameState.status === 'finished') {
    const [p1, p2] = gameState.players;
    const winner =
      p1.score > p2.score ? p1 : p2.score > p1.score ? p2 : null;
    return (
      <div className="App lobby">
        <div className="lobby-box">
          <h1>Game Over!</h1>
          {winner ? (
            <p className="winner">
              {winner.name} wins with {winner.score} points!
            </p>
          ) : (
            <p className="winner">It&apos;s a tie!</p>
          )}
          <div className="final-scores">
            {gameState.players.map((p, i) => (
              <div key={i} className="final-score-row">
                <span>{p.name}</span>
                <span>{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App game">
      <header className="game-header">
        <h1>⬡ Sphere Break</h1>
        <Timer turnTimer={turnTimer} isMyTurn={isMyTurn} />
      </header>

      <div className="game-main">
        <div className="side-panel">
          <PlayerInfo
            player={gameState.players[0]}
            isActive={gameState.currentPlayerIndex === 0}
            isMe={playerIndex === 0}
          />
          <PlayerInfo
            player={gameState.players[1]}
            isActive={gameState.currentPlayerIndex === 1}
            isMe={playerIndex === 1}
          />
        </div>

        <div className="center-panel">
          <CoreDisplay
            core={gameState.core}
            quota={gameState.quota}
            sum={runningSum}
            moveResult={moveResult}
          />
          <Board
            board={gameState.board}
            selectedCoinIds={selectedCoinIds}
            onCoinClick={isMyTurn ? toggleCoin : null}
            moveResult={moveResult}
          />
          <RunningSum sum={runningSum} core={gameState.core} />
          {isMyTurn && (
            <button
              className="submit-btn"
              onClick={submitMove}
              disabled={selectedCoinIds.length === 0}
            >
              Submit ({selectedCoinIds.length} coin
              {selectedCoinIds.length !== 1 ? 's' : ''})
            </button>
          )}
          {!isMyTurn && gameState.status === 'playing' && (
            <p className="waiting-turn">
              Waiting for{' '}
              {gameState.players[gameState.currentPlayerIndex].name}…
            </p>
          )}
          {moveError && <p className="error">{moveError}</p>}
        </div>

        <div className="side-panel right-panel">
          {moveResult && (
            <div
              className={`move-result ${
                moveResult.moveSuccess
                  ? moveResult.isCoreBreak
                    ? 'core-break'
                    : 'success'
                  : 'failure'
              }`}
            >
              {moveResult.timerExpired ? (
                <span>⏱ Time&apos;s up!</span>
              ) : moveResult.isCoreBreak ? (
                <span>✨ CORE BREAK! +{moveResult.scoreGain}</span>
              ) : moveResult.moveSuccess ? (
                <span>✓ Success! +{moveResult.scoreGain}</span>
              ) : (
                <span>✗ Failure</span>
              )}
            </div>
          )}
          <div className="round-info">
            Round {Math.ceil(gameState.round / 2)} /{' '}
            {gameState.maxRounds}
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot normal" /> Normal
            </div>
            <div className="legend-item">
              <span className="legend-dot multiplier" /> Multiplier ×2
            </div>
            <div className="legend-item">
              <span className="legend-dot echo" /> Echo ↺
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
