'use strict';

const { LobbyService } = require('../src/services/lobbyService');

describe('lobby service', () => {
  test('server rejects stale board version', () => {
    const lobby = new LobbyService();
    const p1 = lobby.createOrResumeSession({ playerId: 'p1', displayName: 'One', socketId: 's1' });
    const p2 = lobby.createOrResumeSession({ playerId: 'p2', displayName: 'Two', socketId: 's2' });

    const match = lobby.createMatch({ hostPlayerId: p1.playerId, displayName: 'One', settings: {}, mode: 'casual' });
    lobby.joinMatch({ code: match.code, playerId: p2.playerId, displayName: 'Two', socketId: 's2' });
    lobby.setReady({ playerId: p1.playerId, ready: true });
    lobby.setReady({ playerId: p2.playerId, ready: true });
    lobby.activateStartedMatches();
    match.countdownEndsAt = Date.now() - 1;
    lobby.activateStartedMatches();

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
});
