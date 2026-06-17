import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

export default function Landing({ onStart }) {
  return (
    <div className="screen-center">
      <CelestialPanel title="Welcome Challenger" subtitle="A competitive number-orb strategy game">
        <p className="legal-note">
          Inspired by number puzzle mechanics. This is an original game and does not use copyrighted assets from other titles.
        </p>
        <button type="button" className="primary-btn" onClick={onStart}>Start Game</button>
      </CelestialPanel>
    </div>
  );
}
