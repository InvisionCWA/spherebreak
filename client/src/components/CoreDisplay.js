import React from 'react';
import './CoreDisplay.css';

function getMatchState(sum, core) {
  const sumDigits = String(sum).split('').reverse();
  const coreDigits = String(core).split('').reverse();
  // matched[i] corresponds to coreDigits[i] (least-significant first)
  const matched = coreDigits.map((d, i) =>
    sumDigits[i] !== undefined && sumDigits[i] === d
  );
  return matched.reverse(); // back to display (most-significant first)
}

export default function CoreDisplay({ core, quota, sum, moveResult }) {
  const coreStr = String(core);

  // After a move show result-based matching; while selecting show live preview
  const displaySum = moveResult != null ? moveResult.sum : sum;
  const matched =
    displaySum > 0 ? getMatchState(displaySum, core) : null;

  return (
    <div className="core-display">
      <div className="core-label">Core Number</div>
      <div className="core-digits">
        {coreStr.split('').map((d, i) => (
          <span
            key={i}
            className={`core-digit${matched && matched[i] ? ' matched' : ''}`}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="quota-label">
        Match {quota} digit{quota !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
