import React from 'react';
import './Timer.css';

export default function Timer({ turnTimer, isMyTurn }) {
  const urgent = turnTimer <= 5;
  return (
    <div
      className={`timer${isMyTurn ? ' my-turn' : ''}${urgent ? ' urgent' : ''}`}
    >
      <span className="timer-icon">⏱</span>
      <span className="timer-value">{turnTimer}s</span>
    </div>
  );
}
