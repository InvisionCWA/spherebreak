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
}

module.exports = { AntiCheat };
