'use strict';

const { AntiCheat } = require('../src/domain/antiCheat');

describe('anti-cheat', () => {
  test('rejects duplicate nonce', () => {
    const ac = new AntiCheat();
    expect(ac.registerNonce('m1', 'p1', 'n1')).toBe(true);
    expect(ac.registerNonce('m1', 'p1', 'n1')).toBe(false);
  });

  test('rate limits flooding', () => {
    const ac = new AntiCheat();
    let allowed = true;
    for (let i = 0; i < 25; i += 1) {
      allowed = ac.checkRateLimit('p1', 'SUBMIT_MOVE', 20, 1000);
    }
    expect(allowed).toBe(false);
  });
});
