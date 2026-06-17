'use strict';

class AntiCheat {
  constructor() {
    this.nonces = new Map();
    this.eventWindows = new Map();
  }

  registerNonce(matchId, playerId, nonce) {
    const key = `${matchId}:${playerId}`;
    if (!this.nonces.has(key)) this.nonces.set(key, new Set());
    const set = this.nonces.get(key);
    if (set.has(nonce)) return false;
    set.add(nonce);
    if (set.size > 300) {
      const first = set.values().next().value;
      set.delete(first);
    }
    return true;
  }

  checkRateLimit(playerId, eventName, limit = 20, windowMs = 5000) {
    const key = `${playerId}:${eventName}`;
    const now = Date.now();
    if (!this.eventWindows.has(key)) this.eventWindows.set(key, []);
    const list = this.eventWindows.get(key);
    while (list.length && now - list[0] > windowMs) list.shift();
    list.push(now);
    return list.length <= limit;
  }

  flag(match, playerId, reason) {
    match.suspiciousFlags.push({
      playerId,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Release all anti-cheat state for a finished match.
   * Removes nonce sets for every player in the match and evicts any
   * now-empty rate-limit windows belonging to those players.
   */
  cleanupMatch(matchId, playerIds) {
    const now = Date.now();
    for (const playerId of playerIds) {
      this.nonces.delete(`${matchId}:${playerId}`);
      for (const [key, timestamps] of this.eventWindows) {
        if (!key.startsWith(`${playerId}:`)) continue;
        const fresh = timestamps.filter((t) => now - t <= 60_000);
        if (fresh.length === 0) {
          this.eventWindows.delete(key);
        } else {
          this.eventWindows.set(key, fresh);
        }
      }
    }
  }
}

module.exports = { AntiCheat };
