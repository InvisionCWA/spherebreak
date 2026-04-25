import React from 'react';
import './CoreDisplay.css';

export default function CoreDisplay({ core, sum, moveResult }) {
  const displaySum = moveResult != null ? moveResult.sum : sum;
  const isMultiple = displaySum > 0 && displaySum % core === 0;
  const multiplier = isMultiple ? displaySum / core : null;

  return (
    <div className="core-display">
      <div className="core-label">Core Sphere</div>
      <div className={`core-number${isMultiple ? ' matched' : ''}`}>{core}</div>
      <div className="quota-label">
        Find a multiple of {core}
      </div>
      {isMultiple && multiplier !== null && (
        <div className="core-multiplier">× {multiplier}</div>
      )}
    </div>
  );
}
