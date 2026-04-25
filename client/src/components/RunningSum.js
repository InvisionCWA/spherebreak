import React from 'react';
import './RunningSum.css';

function countMatchedDigits(sum, core) {
  const sumDigits = String(sum).split('').reverse();
  const coreDigits = String(core).split('').reverse();
  let matches = 0;
  for (let i = 0; i < coreDigits.length; i++) {
    if (sumDigits[i] !== undefined && sumDigits[i] === coreDigits[i]) matches++;
  }
  return matches;
}

export default function RunningSum({ sum, core }) {
  const matches = sum > 0 ? countMatchedDigits(sum, core) : 0;
  return (
    <div className="running-sum">
      <span className="sum-label">Sum:</span>
      <span className="sum-value">{sum}</span>
      {sum > 0 && (
        <span className="sum-matches">
          ({matches} match{matches !== 1 ? 'es' : ''})
        </span>
      )}
    </div>
  );
}
