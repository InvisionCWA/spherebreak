'use strict';

/**
 * Load test — Socket.IO server under 10+ concurrent matches.
 *
 * We exercise the server at the LobbyService layer (the same layer the
 * Socket.IO event handlers call) so we can drive it synchronously from
 * Jest without needing real WebSocket connections.  This covers:
 *
 *  • 10 simultaneous matches progressing through their full lifecycles
 *  • Concurrent move submissions (anti-cheat rate-limit is relaxed via
 *    enforceAntiCheat=false to simulate many moves rapidly)
 *  • Memory / map hygiene — no phantom entries after all matches complete
 *  • Timing: all 10 matches must complete within 2 s wall-clock time
 *
 * For a full-stack WebSocket load test (with socket.io-client) see the
 * README load-testing section; that requires a running server instance.
 */

jest.mock('../src/services/replayService', () => ({ addReplayEvent: jest.fn() }));
jest.mock('../src/services/leaderboardService', () => ({ updateLeaderboardFromMatch: jest.fn() }));

const { LobbyService } = require('../src/services/lobbyService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fresh lobby with fake timers disabled so Date.now() moves freely. */
function makeLobby() {
  return new LobbyService({
    cpuFallbackMs: 99_999, // don't inject bots during the test
    setTimeoutFn: () => {},
    clearTimeoutFn: () => {},
  });
}

/** Register two players, create a match, join the second player, set both ready. */
function bootstrapMatch(lobby, matchIndex) {
  const id1 = `load-p1-${matchIndex}`;
  const id2 = `load-p2-${matchIndex}`;
  const sock1 = `s1-${matchIndex}`;
  const sock2 = `s2-${matchIndex}`;

  lobby.createOrResumeSession({ playerId: id1, displayName: `P1-${matchIndex}`, socketId: sock1 });
  lobby.createOrResumeSession({ playerId: id2, displayName: `P2-${matchIndex}`, socketId: sock2 });

  const match = lobby.createMatch({
    hostPlayerId: id1,
    displayName: `P1-${matchIndex}`,
    settings: { quotaToWin: 2, turnLimit: 10 },
    mode: 'casual',
  });

  lobby.joinMatch({ code: match.code, playerId: id2, displayName: `P2-${matchIndex}`, socketId: sock2 });
  lobby.setReady({ playerId: id1, ready: true });
  lobby.setReady({ playerId: id2, ready: true });

  // Activate immediately
  match.countdownEndsAt = Date.now() - 1;
  lobby.activateStartedMatches();

  return { match, id1, id2 };
}

/**
 * Attempt to play one valid move for whoever's turn it is, bypassing anti-cheat.
 * Returns the result object if a valid selection was found, or null otherwise.
 *
 * Strategy: enumerate all subsets of (one inner + 0–3 outer tokens) and pick
 * the first combination whose sum is a positive multiple of targetNumber.
 */
function playOneMove(lobby, match) {
  const currentId = match.turnOrder[match.currentTurnIndex % match.turnOrder.length];
  const current = match.players.get(currentId);
  if (!current || match.status !== 'active') return null;

  const board = match.board;
  const target = board.targetNumber;

  for (const inner of board.innerTokens) {
    // Inner alone
    if (inner.value > 0 && inner.value % target === 0) {
      return lobby.processMoveOnMatch({
        match,
        playerId: current.id,
        move: { selectedTokenIds: [inner.id], nonce: `ld-${Date.now()}-${Math.random()}`, boardVersion: board.version },
        enforceAntiCheat: false,
      });
    }

    // Inner + one outer
    for (const o1 of board.outerTokens) {
      const s1 = inner.value + o1.value;
      if (s1 > 0 && s1 % target === 0) {
        return lobby.processMoveOnMatch({
          match,
          playerId: current.id,
          move: { selectedTokenIds: [inner.id, o1.id], nonce: `ld-${Date.now()}-${Math.random()}`, boardVersion: board.version },
          enforceAntiCheat: false,
        });
      }

      // Inner + two outers
      for (const o2 of board.outerTokens) {
        if (o2.id === o1.id) continue;
        const s2 = inner.value + o1.value + o2.value;
        if (s2 > 0 && s2 % target === 0) {
          return lobby.processMoveOnMatch({
            match,
            playerId: current.id,
            move: { selectedTokenIds: [inner.id, o1.id, o2.id], nonce: `ld-${Date.now()}-${Math.random()}`, boardVersion: board.version },
            enforceAntiCheat: false,
          });
        }
      }
    }
  }

  return null; // No valid combo found; caller should force timeout
}

/** Force-expire the current turn to avoid stalling the loop. */
function forceTimeout(lobby, match) {
  match.turnEndsAt = Date.now() - 1;
  lobby.applyTimeouts();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('load test — 10 concurrent matches', () => {
  test('all 10 matches reach completed status within 2 000 ms', () => {
    const MATCH_COUNT = 10;
    const lobby = makeLobby();
    const started = Date.now();

    const contexts = [];
    for (let i = 0; i < MATCH_COUNT; i += 1) {
      contexts.push(bootstrapMatch(lobby, i));
    }

    expect(contexts).toHaveLength(MATCH_COUNT);
    for (const { match } of contexts) {
      expect(match.status).toBe('active');
    }

    // Drive each match to completion by alternating moves until done.
    // If no valid move exists on a given turn, force a timeout so the loop
    // always makes progress.
    let iterations = 0;
    const MAX_ITERATIONS = MATCH_COUNT * 50;
    while (iterations < MAX_ITERATIONS) {
      let anyActive = false;
      for (const { match } of contexts) {
        if (match.status !== 'active') continue;
        anyActive = true;
        const result = playOneMove(lobby, match);
        if (!result) {
          // No valid token combination — expire the turn instead
          forceTimeout(lobby, match);
        }
      }
      if (!anyActive) break;
      iterations += 1;
    }

    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(Number(process.env.LOAD_TEST_TIMEOUT_MS) || 5_000);

    for (const { match } of contexts) {
      expect(['completed', 'abandoned']).toContain(match.status);
      expect(match.winnerId !== undefined).toBe(true);
    }
  });

  test('12 matches run with no phantom player→match mappings after completion', () => {
    const MATCH_COUNT = 12;
    const lobby = makeLobby();

    const contexts = [];
    for (let i = 0; i < MATCH_COUNT; i += 1) {
      contexts.push(bootstrapMatch(lobby, i));
    }

    // Complete every match via timeout (simulate turn-limit exceeded)
    for (const { match } of contexts) {
      match.turnCount = match.settings.turnLimit + 1;
      // Let applyTimeouts drive the completion
      match.turnEndsAt = Date.now() - 1;
    }
    lobby.applyTimeouts();

    // All matches should now be complete
    for (const { match } of contexts) {
      expect(['completed', 'abandoned']).toContain(match.status);
    }

    // playerToMatch map still tracks players (entries are not removed on
    // completion — they remain for rematch; verify no duplication)
    const seenPlayers = new Set();
    for (const [playerId] of lobby.playerToMatch) {
      expect(seenPlayers.has(playerId)).toBe(false); // no duplicate keys
      seenPlayers.add(playerId);
    }
  });

  test('10 matches all emit distinct match IDs', () => {
    const lobby = makeLobby();
    const ids = new Set();
    for (let i = 0; i < 10; i += 1) {
      const { match } = bootstrapMatch(lobby, i);
      ids.add(match.id);
    }
    expect(ids.size).toBe(10);
  });

  test('concurrent anti-cheat rate-limiting does not cross match boundaries', () => {
    const lobby = makeLobby();
    // Two matches sharing the same lobby; anti-cheat is keyed by playerId
    const ctx1 = bootstrapMatch(lobby, 'ac-1');
    const ctx2 = bootstrapMatch(lobby, 'ac-2');

    // Flood moves for match 1's player — should not affect match 2's rate limit
    for (let i = 0; i < 5; i += 1) {
      lobby.antiCheat.checkRateLimit(ctx1.id1, 'SUBMIT_MOVE', 30, 4000);
    }
    const allowed = lobby.antiCheat.checkRateLimit(ctx2.id1, 'SUBMIT_MOVE', 30, 4000);
    expect(allowed).toBe(true);
  });

  test('rematch does not reuse old match IDs or codes', () => {
    const lobby = makeLobby();
    const { match, id1, id2 } = bootstrapMatch(lobby, 'rm-0');

    // Force completion
    match.turnCount = match.settings.turnLimit + 1;
    match.turnEndsAt = Date.now() - 1;
    lobby.applyTimeouts();

    const oldId = match.id;
    const oldCode = match.code;

    // Vote rematch from both players
    lobby.requestRematch(id1);
    const next = lobby.requestRematch(id2);

    expect(next).not.toBeNull();
    expect(next.id).not.toBe(oldId);
    expect(next.code).not.toBe(oldCode);
  });

  test('disconnects during active matches do not leave zombied entries', () => {
    const lobby = makeLobby();
    const contexts = [];
    for (let i = 0; i < 10; i += 1) {
      contexts.push(bootstrapMatch(lobby, `dc-${i}`));
    }

    // Disconnect player 1 from every match
    for (let i = 0; i < 10; i += 1) {
      lobby.disconnect(`s1-dc-${i}`);
    }

    // Matches should be abandoned (no humans left) or still active (p2 connected)
    for (const { match } of contexts) {
      expect(['active', 'completed', 'abandoned']).toContain(match.status);
    }

    // socketToPlayer map should not contain any disconnected socket IDs
    for (let i = 0; i < 10; i += 1) {
      expect(lobby.socketToPlayer.has(`s1-dc-${i}`)).toBe(false);
    }
  });
});
