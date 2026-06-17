import React from 'react';
import { render, screen } from '@testing-library/react';
import Leaderboard from './Leaderboard';
import Profile from './Profile';
import Lobby from './Lobby';
import MatchRoom from './MatchRoom';
import Results from './Results';
import GameScreen from './GameScreen';

const rank = {
  id: 'nova',
  displayName: 'Nova',
  shortLabel: 'NOV',
  level: 3,
  iconKey: 'nova',
  colors: {
    bg: 'rgba(111, 78, 213, 0.24)',
    accent: '#bea9ff',
    text: '#f7f2ff',
    border: 'rgba(190, 169, 255, 0.45)',
  },
  progressToNext: 0.4,
  nextRankName: 'Astral',
  isTopRank: false,
};

describe('rank display rollout', () => {
  test('leaderboard rows render player identity with rank', () => {
    render(
      <Leaderboard
        entries={[{ userId: 'p1', displayName: 'Alice', isBot: false, rating: 1210, wins: 3, losses: 1, playerRank: rank, rank: 1 }]}
        weeklyEntries={[{ userId: 'p1', displayName: 'Alice', weeklyScore: 400, matches: 2, playerRank: rank, rank: 1 }]}
        onRefresh={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getAllByText(/Nova/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('1. Alice').length).toBeGreaterThan(0);
  });

  test('profile summary renders progress-capable player identity', () => {
    const profile = {
      displayName: 'Alice',
      isBot: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      playerRank: rank,
      stats: {
        wins: 5,
        losses: 2,
        winRate: 0.714,
        bestScore: 999,
        bestCombo: 4,
        bestStreak: 6,
        fastestValidBreakMs: 800,
      },
    };

    const { container } = render(<Profile profile={profile} onLoad={() => {}} onBack={() => {}} />);

    expect(screen.getByText(/Next rank: Astral/i)).toBeTruthy();
    expect(container.querySelector('.rank-badge__progress-fill')).toBeTruthy();
  });

  test('lobby, match room, and results render cpu identity with rank', () => {
    const players = [{ id: 'cpu-1', displayName: 'NovaBot', ready: true, isBot: true, playerRank: rank, score: 500 }];
    const lobbyList = [{ id: 'm1', code: 'ABC123', mode: 'ranked', players, maxPlayers: 2 }];

    render(<Lobby lobbyList={lobbyList} onCreate={() => {}} onJoin={() => {}} onQueue={() => {}} onBack={() => {}} />);
    expect(screen.getByLabelText(/NovaBot, Nova rank, CPU player, Ready/i)).toBeTruthy();

    render(<MatchRoom state={{ code: 'ABC123', status: 'waiting', players, mode: 'ranked' }} onReady={() => {}} readySelf={false} onBack={() => {}} />);
    expect(screen.getAllByText(/CPU/i).length).toBeGreaterThan(0);

    render(<Results state={{ players, winnerId: 'cpu-1', mode: 'ranked' }} onRematch={() => {}} onExit={() => {}} />);
    expect(screen.getAllByText(/Winner/i).length).toBeGreaterThan(0);
  });

  test('game hud renders active player rank identity', () => {
    const state = {
      id: 'match-1',
      code: 'TEST01',
      mode: 'casual',
      status: 'active',
      settings: {
        turnLimit: 20,
        secondsPerTurn: 20,
        quotaToWin: 12,
        beginnerHints: true,
        targetNumberRange: [1, 9],
        boardSize: { inner: 2, outer: 4 },
        maxPlayers: 2,
        ranked: false,
        tokenReplacementMode: 'cycling-age',
        comboRules: { comboStep: 1, comboBonusPerStack: 8, streakBonusPerStack: 5, comboRuleType: 'token-count' },
      },
      turnCount: 3,
      turnsLeft: 18,
      currentTurnPlayerId: 'p1',
      turnEndsAt: Date.now() + 20000,
      board: {
        targetNumber: 7,
        version: 2,
        innerTokens: [{ id: 'i1', value: 3, zone: 'inner' }],
        outerTokens: [{ id: 'o1', value: 4, zone: 'outer' }],
      },
      players: [
        { id: 'p1', displayName: 'Alice', score: 140, combo: 2, streak: 2, quotaProgress: 2, ready: true, connected: true, isBot: false, isSelf: true, playerRank: rank },
        { id: 'p2', displayName: 'Bob', score: 80, combo: 0, streak: 0, quotaProgress: 1, ready: true, connected: true, isBot: false, isSelf: false, playerRank: null },
      ],
    };

    render(
      <GameScreen
        state={state}
        selfId="p1"
        selected={[]}
        onSelect={() => {}}
        movePreview={{ sum: 0, isValid: false, nearestMultiple: 7, includesInner: false, achievedMultiple: null, nextMultiples: [7, 14] }}
        onSubmit={() => {}}
        onClearSelection={() => {}}
        moveError=""
        lastMove={null}
        isSubmittingMove={false}
      />,
    );

    expect(screen.getByText(/Active pilot/i)).toBeTruthy();
    expect(screen.getAllByLabelText(/Alice Nova rank/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Bob, Unranked rank/i)).toBeTruthy();
  });
});
