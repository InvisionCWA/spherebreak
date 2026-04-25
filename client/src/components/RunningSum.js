import React from 'react';
import './RunningSum.css';

export default function RunningSum({ sum, core }) {
  const isMultiple = sum > 0 && sum % core === 0;
  const multiplier = isMultiple ? sum / core : null;

  return (
    <div className="running-sum">
      <span className="sum-label">Sum:</span>
      <span className={`sum-value${isMultiple ? ' is-multiple' : ''}`}>{sum}</span>
      {sum > 0 && (
        <span className="sum-matches">
          {isMultiple
            ? `✓ ${sum} = ${multiplier} × ${core}`
            : `Not a multiple of ${core}`}
        </span>
      )}
    </div>
  );
}
