import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import Landing from './screens/Landing';
import MainMenu from './screens/MainMenu';
import Tutorial from './screens/Tutorial';
import Lobby from './screens/Lobby';
import MatchRoom from './screens/MatchRoom';
import GameScreen from './screens/GameScreen';
import Results from './screens/Results';
import Leaderboard from './screens/Leaderboard';
import Profile from './screens/Profile';
import Settings from './screens/Settings';
import {
  DEFAULT_MATCH_SETTINGS,
  buildMovePreview,
  readSession,
  writeSession,
} from './state/gameClientStore';

const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export default function App() {
  const [socket, setSocket] = useState(null);
  const [session, setSession] = useState(() => {
    const existing = readSession();
    return existing || { playerId: null, displayName: 'GuestPilot' };
  });

  const [screen, setScreen] = useState('landing');
  const [settings, setSettings] = useState({ ...DEFAULT_MATCH_SETTINGS });
  const [lobbyList, setLobbyList] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [selectedTokenIds, setSelectedTokenIds] = useState([]);
  const [moveError, setMoveError] = useState('');
  const [lastMove, setLastMove] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const client = io(SERVER_URL);
    setSocket(client);

    client.on('connect', () => {
      client.emit('CLIENT_HELLO', {
        playerId: session.playerId,
        displayName: session.displayName,
      });
    });

    client.on('SESSION_READY', (payload) => {
      setSession((prev) => {
        const next = {
          ...prev,
          playerId: payload.playerId,
          displayName: payload.displayName || prev.displayName,
        };
        writeSession(next);
        return next;
      });
    });

    client.on('LOBBY_LIST_UPDATE', ({ matches }) => {
      setLobbyList(matches || []);
    });

    client.on('GAME_STATE_UPDATE', ({ state }) => {
      setGameState(state);
      setSelectedTokenIds([]);
      setMoveError('');

      if (state.status === 'waiting' || state.status === 'starting') {
        setScreen('matchroom');
      } else if (state.status === 'active') {
        setScreen('game');
      } else if (state.status === 'completed') {
        setScreen('results');
      }
    });

    client.on('REQUEST_ERROR', ({ error }) => {
      setNotice(error);
      setTimeout(() => setNotice(''), 2500);
    });

    client.on('QUEUE_WAITING', () => setNotice('Queued for matchmaking.'));

    return () => {
      client.disconnect();
    };
  }, [session.playerId, session.displayName]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleMoveRejected = ({ reason, preview }) => {
      const showHints = settings.beginnerHints ?? true;
      setMoveError(preview && showHints ? `${reason}. nearest multiple ${preview.nearestMultiple}` : reason);
    };
    socket.on('MOVE_REJECTED', handleMoveRejected);
    return () => {
      socket.off('MOVE_REJECTED', handleMoveRejected);
    };
  }, [socket, settings.beginnerHints]);

  const movePreview = useMemo(() => buildMovePreview(gameState?.board, selectedTokenIds), [gameState, selectedTokenIds]);

  async function loadLeaderboards() {
    const [allRes, weekRes] = await Promise.all([
      fetch(`${SERVER_URL}/api/leaderboard?period=all-time`),
      fetch(`${SERVER_URL}/api/leaderboard?period=weekly`),
    ]);
    const all = await allRes.json();
    const week = await weekRes.json();
    setLeaderboard(all.entries || []);
    setWeeklyLeaderboard(week.entries || []);
  }

  async function loadProfile() {
    if (!session.playerId) return;
    const res = await fetch(`${SERVER_URL}/api/profile/${session.playerId}`);
    if (!res.ok) {
      setProfile(null);
      return;
    }
    setProfile(await res.json());
  }

  function updateDisplayName(name) {
    const safe = name.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 20);
    const next = { ...session, displayName: safe || 'GuestPilot' };
    setSession(next);
    writeSession(next);
  }

  function createMatch({ ranked, botDifficulty = null }) {
    if (!socket) return;
    socket.emit('CREATE_MATCH', {
      displayName: session.displayName,
      mode: ranked ? 'ranked' : 'casual',
      botDifficulty,
      settings: {
        ...settings,
        ranked,
      },
    });
  }

  function joinMatch(code) {
    if (!socket || !code) return;
    socket.emit('JOIN_MATCH', {
      code: code.trim().toUpperCase(),
      displayName: session.displayName,
    });
  }

  function queueMatch() {
    if (!socket) return;
    socket.emit('QUEUE_MATCH', {
      displayName: session.displayName,
      mode: 'casual',
      settings,
    });
  }

  function toggleReady(ready) {
    if (!socket) return;
    socket.emit('TOGGLE_READY', { ready });
  }

  function submitMove() {
    if (!socket || !gameState || !selectedTokenIds.length) return;

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    socket.emit('SUBMIT_MOVE', {
      selectedTokenIds,
      nonce,
      boardVersion: gameState.board.version,
    });

    setLastMove({
      playerId: session.playerId,
      sum: movePreview.sum,
      scoreGain: 0,
      combo: 0,
      streak: 0,
    });
  }

  function toggleToken(tokenId) {
    setSelectedTokenIds((prev) => {
      if (prev.includes(tokenId)) return prev.filter((id) => id !== tokenId);
      return [...prev, tokenId];
    });
  }

  function updateSettings(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function backToMain() {
    setScreen('main');
    setGameState(null);
    setSelectedTokenIds([]);
  }

  const readySelf = Boolean(gameState?.players.find((p) => p.id === session.playerId)?.ready);

  return (
    <div className="app-shell">
      <div className="bg-stars" />
      <header className="top-bar">
        <h1>Celestial Break</h1>
        <nav>
          <button type="button" className="nav-btn" onClick={() => setScreen('main')}>Menu</button>
          <button type="button" className="nav-btn" onClick={() => setScreen('tutorial')}>Tutorial</button>
          <button type="button" className="nav-btn" onClick={() => { setScreen('leaderboard'); loadLeaderboards(); }}>Leaderboard</button>
        </nav>
      </header>

      {notice && <div className="notice-banner">{notice}</div>}

      <main className="app-main">
        {screen === 'landing' && <Landing onStart={() => setScreen('main')} />}
        {screen === 'main' && <MainMenu profile={session} onChangeName={updateDisplayName} onNavigate={(next) => {
          if (next === 'leaderboard') loadLeaderboards();
          if (next === 'profile') loadProfile();
          setScreen(next);
        }} />}
        {screen === 'tutorial' && <Tutorial onBack={() => setScreen('main')} />}
        {screen === 'lobby' && <Lobby lobbyList={lobbyList} onCreate={createMatch} onJoin={joinMatch} onQueue={queueMatch} onBack={() => setScreen('main')} />}
        {screen === 'matchroom' && gameState && <MatchRoom state={gameState} readySelf={readySelf} onReady={toggleReady} onBack={backToMain} />}
        {screen === 'game' && gameState && (
          <GameScreen
            state={gameState}
            selfId={session.playerId}
            selected={selectedTokenIds}
            onSelect={toggleToken}
            movePreview={movePreview}
            onSubmit={submitMove}
            moveError={moveError}
            lastMove={lastMove}
          />
        )}
        {screen === 'results' && gameState && <Results state={gameState} onRematch={() => socket?.emit('REQUEST_REMATCH')} onExit={backToMain} />}
        {screen === 'leaderboard' && <Leaderboard entries={leaderboard} weeklyEntries={weeklyLeaderboard} onRefresh={loadLeaderboards} onBack={() => setScreen('main')} />}
        {screen === 'profile' && <Profile profile={profile} onLoad={loadProfile} onBack={() => setScreen('main')} />}
        {screen === 'settings' && <Settings settings={settings} onUpdate={updateSettings} onBack={() => setScreen('main')} />}
      </main>
    </div>
  );
}
