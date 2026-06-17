import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameScreen from './GameScreen';

const BASE_STATE = {
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
    comboRules: {
      comboStep: 1,
      comboBonusPerStack: 8,
      streakBonusPerStack: 5,
      comboRuleType: 'token-count',
    },
  },
  turnCount: 3,
  turnsLeft: 18,
  currentTurnPlayerId: 'p1',
  turnEndsAt: Date.now() + 20000,
  countdownEndsAt: null,
  board: {
    targetNumber: 7,
    version: 2,
    innerTokens: [
      { id: 'i1', value: 3, zone: 'inner' },
      { id: 'i2', value: 4, zone: 'inner' },
    ],
    outerTokens: [
      { id: 'o1', value: 7, zone: 'outer' },
      { id: 'o2', value: 3, zone: 'outer' },
      { id: 'o3', value: 4, zone: 'outer' },
      { id: 'o4', value: 1, zone: 'outer' },
    ],
  },
  winnerId: null,
  players: [
    {
      id: 'p1',
      displayName: 'Alice',
      score: 140,
      combo: 2,
      streak: 2,
      quotaProgress: 2,
      ready: true,
      connected: true,
      isBot: false,
      isSelf: true,
    },
    {
      id: 'p2',
      displayName: 'Bob',
      score: 80,
      combo: 0,
      streak: 0,
      quotaProgress: 1,
      ready: true,
      connected: true,
      isBot: false,
      isSelf: false,
    },
  ],
};

const BASE_PREVIEW = {
  sum: 0,
  isValid: false,
  nearestMultiple: 7,
  includesInner: false,
  achievedMultiple: null,
  nextMultiples: [7, 14, 21, 28],
};

function renderGame(overrides = {}, previewOverrides = {}) {
  const props = {
    state: BASE_STATE,
    selfId: 'p1',
    selected: [],
    onSelect: jest.fn(),
    movePreview: { ...BASE_PREVIEW, ...previewOverrides },
    onSubmit: jest.fn(),
    onClearSelection: jest.fn(),
    moveError: '',
    lastMove: null,
    isSubmittingMove: false,
    ...overrides,
  };
  return render(<GameScreen {...props} />);
}

describe('GameScreen rendering', () => {
  test('renders the target number prominently', () => {
    renderGame();
    const orb = screen.getByLabelText(/Target number 7/i);
    expect(orb).toBeTruthy();
    expect(orb.textContent).toBe('7');
  });

  test('renders inner tokens with their values and zone labels', () => {
    renderGame();
    // inner tokens i1=3 and i2=4
    expect(screen.getByLabelText(/inner token value 3/i)).toBeTruthy();
    expect(screen.getByLabelText(/inner token value 4/i)).toBeTruthy();
  });

  test('renders outer tokens', () => {
    renderGame();
    expect(screen.getByLabelText(/outer token value 7/i)).toBeTruthy();
  });

  test('displays player scores and quota progress', () => {
    renderGame();
    const playerList = screen.getByRole('list', { name: /Player scores/i });
    expect(playerList.textContent).toMatch(/140 pts/i);
    expect(playerList.textContent).toMatch(/quota 2\/12/i);
    expect(playerList.textContent).toMatch(/80 pts/i);
  });

  test('displays turns left from state', () => {
    renderGame();
    expect(screen.getByLabelText(/18 turns remaining/i)).toBeTruthy();
  });

  test('shows turns-left warning when three or fewer turns remain', () => {
    const lowTurnsState = { ...BASE_STATE, turnsLeft: 2 };
    renderGame({ state: lowTurnsState });
    expect(screen.getByLabelText(/2 turns remaining/i)).toBeTruthy();
    expect(screen.getByText(/⚠/)).toBeTruthy();
  });

  test('shows valid multiple preview list when beginnerHints is on', () => {
    renderGame();
    // The multiples-preview aria-label exists
    expect(screen.getByLabelText(/Possible valid totals/i)).toBeTruthy();
    expect(screen.getByLabelText(/Possible valid totals/i).textContent).toMatch(/14/);
  });

  test('selected sum is displayed when tokens are selected', () => {
    renderGame({}, { sum: 10, isValid: false });
    expect(screen.getByText(/Selected sum: 10/i)).toBeTruthy();
  });

  test('shows achieved multiple when selection is a valid break', () => {
    renderGame({}, { sum: 14, isValid: true, achievedMultiple: 2, includesInner: true, nextMultiples: [21, 28, 35, 42] });
    expect(screen.getByText(/Target ×2 = 14/i)).toBeTruthy();
  });

  test('shows nearest multiple hint when sum is not valid', () => {
    renderGame({}, { sum: 5, isValid: false, nearestMultiple: 7, includesInner: true });
    expect(screen.getByText(/Nearest multiple: 7/i)).toBeTruthy();
  });

  test('inner token requirement warning shown when no inner token selected', () => {
    renderGame({}, { sum: 7, isValid: false, includesInner: false });
    expect(screen.getByText(/No — required/i)).toBeTruthy();
  });

  test('selected token count (Tokens used) is displayed', () => {
    renderGame({ selected: ['i1', 'o1'] });
    expect(screen.getByText(/Tokens used: 2/i)).toBeTruthy();
  });

  test('Submit Break button is disabled when not your turn', () => {
    renderGame({ selfId: 'p2' });
    const btn = screen.getByRole('button', { name: /Submit Break/i });
    expect(btn).toBeDisabled();
  });

  test('Submit Break button is disabled with no selection', () => {
    renderGame({ selected: [] });
    const btn = screen.getByRole('button', { name: /Submit Break/i });
    expect(btn).toBeDisabled();
  });

  test('Submit Break button is enabled when move is valid', () => {
    renderGame(
      { selected: ['i1', 'o2'] },
      { sum: 7, isValid: true, includesInner: true, achievedMultiple: 1, nextMultiples: [14, 21, 28, 35] },
    );
    const btn = screen.getByRole('button', { name: /Submit Break/i });
    expect(btn).not.toBeDisabled();
  });

  test('renders move error message when present', () => {
    renderGame({ moveError: 'Selection sum 5 is not a multiple of 7' });
    expect(screen.getByRole('alert')).toHaveTextContent(/not a multiple of 7/i);
  });

  test('renders last move result box when lastMove is provided', () => {
    const lastMove = {
      playerId: 'p1',
      sum: 7,
      tokenCount: 1,
      achievedMultiple: 1,
      scoreGain: 80,
      combo: 1,
      streak: 1,
      comboIncreased: false,
      comboContinued: false,
    };
    renderGame({ lastMove });
    expect(screen.getByLabelText(/Last move result/i)).toBeTruthy();
    expect(screen.getByText(/sum 7 \(×1\)/i)).toBeTruthy();
    expect(screen.getByText(/Tokens used: 1/i)).toBeTruthy();
    expect(screen.getByText(/\+80 pts/i)).toBeTruthy();
  });

  test('combo explanation shows Break Chain started on first valid break', () => {
    const lastMove = {
      playerId: 'p1',
      sum: 7,
      tokenCount: 1,
      achievedMultiple: 1,
      scoreGain: 80,
      combo: 1,
      streak: 1,
      comboIncreased: true,
      comboContinued: false,
    };
    renderGame({ lastMove });
    expect(screen.getByText(/Break Chain started/i)).toBeTruthy();
  });

  test('combo explanation shows Chain maintained when combo continues', () => {
    const lastMove = {
      playerId: 'p1',
      sum: 7,
      tokenCount: 2,
      achievedMultiple: 1,
      scoreGain: 90,
      combo: 2,
      streak: 2,
      comboIncreased: true,
      comboContinued: true,
    };
    renderGame({ lastMove });
    expect(screen.getByText(/Chain maintained/i)).toBeTruthy();
  });

  test('combo explanation shows Chain reset when token count changes', () => {
    const lastMove = {
      playerId: 'p1',
      sum: 7,
      tokenCount: 3,
      achievedMultiple: 1,
      scoreGain: 95,
      combo: 1,
      streak: 3,
      comboIncreased: false,
      comboContinued: true,
    };
    renderGame({ lastMove });
    expect(screen.getByText(/Chain reset/i)).toBeTruthy();
  });

  test('quota progress is shown in the HUD', () => {
    renderGame();
    expect(screen.getByText(/Quota: 2 \/ 12/i)).toBeTruthy();
  });

  test('self combo and streak are shown in the HUD', () => {
    renderGame();
    expect(screen.getByText(/Combo: 2 \/ Streak: 2/i)).toBeTruthy();
  });

  test('does not show hints panel when beginnerHints is false', () => {
    const state = {
      ...BASE_STATE,
      settings: { ...BASE_STATE.settings, beginnerHints: false },
    };
    renderGame({ state });
    expect(screen.queryByText(/Selected sum:/i)).toBeNull();
    expect(screen.queryByText(/Valid totals:/i)).toBeNull();
  });

  test('opponent info is shown in player list', () => {
    renderGame();
    expect(screen.getByText(/Bob/)).toBeTruthy();
    expect(screen.getByText(/80 pts/)).toBeTruthy();
  });

  test('bot player is labeled as Bot', () => {
    const state = {
      ...BASE_STATE,
      players: [
        { ...BASE_STATE.players[0] },
        { ...BASE_STATE.players[1], isBot: true, displayName: 'NovaRider' },
      ],
    };
    renderGame({ state });
    expect(screen.getByText(/Bot/)).toBeTruthy();
  });

  test('onSelect is called when a token is clicked on your turn', () => {
    const onSelect = jest.fn();
    renderGame({ onSelect });
    const innerToken = screen.getByLabelText(/inner token value 3/i);
    fireEvent.click(innerToken);
    expect(onSelect).toHaveBeenCalledWith('i1');
  });

  test('tokens are disabled when it is not your turn', () => {
    renderGame({ selfId: 'p2' });
    const innerToken = screen.getByLabelText(/inner token value 3/i);
    expect(innerToken).toBeDisabled();
  });
});
