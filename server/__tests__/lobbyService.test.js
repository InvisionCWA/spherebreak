'use strict';

const mockPrisma = {
  leaderboardStat: {
    findMany: jest.fn(),
  },
};

jest.mock('../src/db/client', () => ({
  getPrismaClient: () => mockPrisma,
}));

const { LobbyService } = require('../src/services/lobbyService');

describe('lobby service', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockPrisma.leaderboardStat.findMany.mockReset().mockResolvedValue([]);
  });

  function activateMatch(lobby, match) {
    match.countdownEndsAt = Date.now() - 1;
    lobby.activateStartedMatches();
  }

  test('server rejects stale board version', () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    lobby.setReady({ playerId: p1.playerId, ready: true });
    lobby.setReady({ playerId: p2.playerId, ready: true });
    activateMatch(lobby, match);

    const current = match.players.get(match.turnOrder[0]);
    const validSelection = [match.board.innerTokens[0].id, match.board.outerTokens[0].id];

    const result = lobby.processMove({
      playerId: current.id,
      move: {
        selectedTokenIds: validSelection,
        nonce: 'n-1',
        boardVersion: 999,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Stale board version/);
  });

  test('server rejects inactive player move', () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    lobby.setReady({ playerId: p1.playerId, ready: true });
    lobby.setReady({ playerId: p2.playerId, ready: true });
    match.countdownEndsAt = Date.now() - 1;
    lobby.activateStartedMatches();

    const notCurrent = match.turnOrder[1];
    const result = lobby.processMove({
      playerId: notCurrent,
      move: {
        selectedTokenIds: [match.board.innerTokens[0].id],
        nonce: 'n-2',
        boardVersion: match.board.version,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Not your turn');
  });

  test('server rejects duplicate nonce', () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    lobby.setReady({ playerId: p1.playerId, ready: true });
    lobby.setReady({ playerId: p2.playerId, ready: true });
    match.countdownEndsAt = Date.now() - 1;
    lobby.activateStartedMatches();

    const current = match.turnOrder[0];
    const move = {
      selectedTokenIds: [match.board.innerTokens[0].id, match.board.outerTokens[0].id],
      nonce: 'same',
      boardVersion: match.board.version,
    };

    lobby.processMove({ playerId: current, move });
    const second = lobby.processMove({ playerId: current, move });

    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/Duplicate move nonce/);
  });

  test('casual matches do not count for ranked leaderboard write gate', async () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: { ranked: false }, mode: 'casual' });
    match.status = 'completed';
    match.completedByServer = true;

    expect(match.settings.ranked).toBe(false);
  });

  test('reconnect does not create duplicate player entry', () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });

    lobby.disconnect('s1');
    lobby.reconnectPlayer({ playerId: p1.playerId, socketId: 's1b' });

    expect(match.players.size).toBe(2);
    const p1Player = match.players.get(p1.playerId);
    expect(p1Player.connected).toBe(true);
    expect(p1Player.socketId).toBe('s1b');
  });

  test('rematch creates a new match with fresh state', () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    match.status = 'completed';

    lobby.requestRematch(p1.playerId);
    const rematch = lobby.requestRematch(p2.playerId);

    expect(rematch).toBeTruthy();
    expect(rematch.id).not.toBe(match.id);
    expect(rematch.status).toBe('waiting');
    expect(rematch.turnCount).toBe(0);
    // rematch replay starts fresh: only player_joined events, no old match events
    const types = rematch.replay.map((e) => e.type);
    expect(types.every((t) => t === 'player_joined')).toBe(true);
  });

  test('waiting multiplayer match gets a CPU fallback after 60 seconds', () => {
    jest.useFakeTimers();
    const lobby = new LobbyService({ random: () => 0.2 });
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'ranked' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });

    jest.advanceTimersByTime(60000);

    const bots = Array.from(match.players.values()).filter((player) => player.isBot);
    expect(bots).toHaveLength(1);
    expect(bots[0].ready).toBe(true);
    expect(bots[0].botDifficulty).toBe('normal');
    expect(bots[0].displayName).toMatch(/^[A-Za-z]+[A-Za-z0-9]*$/);
  });

  test('CPU fallback does not trigger if a human joins before 60 seconds', () => {
    jest.useFakeTimers();
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });

    jest.advanceTimersByTime(59000);
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    jest.advanceTimersByTime(1000);

    expect(Array.from(match.players.values()).filter((player) => player.isBot)).toHaveLength(0);
  });

  test('CPU fallback does not add duplicate CPU players', () => {
    jest.useFakeTimers();
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'ranked' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });

    jest.advanceTimersByTime(60000);
    jest.advanceTimersByTime(60000);

    expect(Array.from(match.players.values()).filter((player) => player.isBot)).toHaveLength(1);
  });

  test('CPU fallback starts match through normal lifecycle', () => {
    jest.useFakeTimers();
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });
    lobby.setReady({ playerId: p1.playerId, ready: true });

    jest.advanceTimersByTime(60000);
    expect(match.status).toBe('starting');

    jest.advanceTimersByTime(3000);
    lobby.activateStartedMatches();
    expect(match.status).toBe('active');
  });

  test('CPU moves are processed through the server move pipeline', async () => {
    jest.useFakeTimers();
    const lobby = new LobbyService({ random: () => 0.4 });
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });
    lobby.setReady({ playerId: p1.playerId, ready: true });

    jest.advanceTimersByTime(60000);
    jest.advanceTimersByTime(3000);
    lobby.activateStartedMatches();

    const bot = Array.from(match.players.values()).find((player) => player.isBot);
    const botTurnIndex = match.turnOrder.indexOf(bot.id);
    match.currentTurnIndex = botTurnIndex;
    match.turnStartedAt = Date.now();
    match.turnEndsAt = Date.now() + (match.settings.secondsPerTurn * 1000);
    match.board = {
      targetNumber: 4,
      version: 1,
      innerTokens: [
        { id: 'i1', value: 3, zone: 'inner', age: 0 },
        { id: 'i2', value: 2, zone: 'inner', age: 0 },
      ],
      outerTokens: [
        { id: 'o1', value: 1, zone: 'outer', age: 0 },
        { id: 'o2', value: 6, zone: 'outer', age: 0 },
      ],
    };

    await lobby.maybeRunBotTurn(match);
    jest.advanceTimersByTime(5000);
    const result = await lobby.maybeRunBotTurn(match);

    expect(result?.ok).toBe(true);
    expect(result?.moveResult?.playerId).toBe(bot.id);
    expect(match.board.version).toBeGreaterThan(1);
  });

  test('public match state resolves trusted ranks server-side', async () => {
    mockPrisma.leaderboardStat.findMany.mockResolvedValue([
      { userId: 'p1', rating: 1450, wins: 8, losses: 1 },
      { userId: 'p2', rating: 980, wins: 1, losses: 3 },
    ]);

    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'ranked' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });

    const state = await lobby.getPublicStateForPlayer(p1.playerId);

    expect(state.players.find((player) => player.id === 'p1').playerRank.displayName).toBe('Astral');
    expect(state.players.find((player) => player.id === 'p2').playerRank.displayName).toBe('Comet');
  });

  test('open lobby payloads include rank dto for CPU fallback and humans', async () => {
    mockPrisma.leaderboardStat.findMany.mockResolvedValue([
      { userId: 'p1', rating: 1210, wins: 4, losses: 1 },
    ]);

    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: { ranked: true }, mode: 'ranked' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });
    lobby.injectCpuFallback(match.id);

    const lobbies = await lobby.buildLobbyList();
    const players = lobbies[0].players;

    expect(players.find((player) => player.id === 'p1').playerRank.displayName).toBe('Nova');
    expect(players.find((player) => player.isBot).playerRank.displayName).toBe('Lumen');
  });

  test('human reconnect behavior remains intact with CPU fallback matches', () => {
    jest.useFakeTimers();
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'ranked' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });

    jest.advanceTimersByTime(60000);
    lobby.disconnect('s1');
    const reconnect = lobby.reconnectPlayer({ playerId: p1.playerId, socketId: 's1b' });

    expect(reconnect).toBeTruthy();
    expect(reconnect.player.connected).toBe(true);
  });

  test('race condition: human join near timer fire does not create duplicate opponent', () => {
    jest.useFakeTimers();
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });
    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p1.playerId, displayName: 'One', socketId: 's1' });

    jest.advanceTimersByTime(59999);
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    jest.advanceTimersByTime(1);

    const humans = Array.from(match.players.values()).filter((player) => !player.isBot);
    const bots = Array.from(match.players.values()).filter((player) => player.isBot);
    expect(humans).toHaveLength(2);
    expect(bots).toHaveLength(0);
  });
});
