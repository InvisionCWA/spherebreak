'use strict';

function addReplayEvent(match, type, payload) {
  match.replay.push({
    type,
    payload,
    timestamp: Date.now(),
  });

  if (match.replay.length > 500) {
    match.replay.shift();
  }
}

module.exports = { addReplayEvent };
