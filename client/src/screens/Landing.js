import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';
import celestialOrb from '../assets/celestial-orb.svg';

export default function Landing({ onStart }) {
  return (
    <div className="screen-center">
      <CelestialPanel>
        <div className="landing-hero">
          <img
            src={celestialOrb}
            alt="Celestial orb"
            className="landing-hero-orb"
            aria-hidden="true"
          />
          <h1 className="landing-hero-title">Celestial Break</h1>
          <p className="landing-hero-sub">
            Break the target. Build the combo. Race the quota.
          </p>
          <button type="button" className="primary-btn landing-hero-btn" onClick={onStart}>
            Start Game
          </button>
        </div>
        <p className="legal-note landing-legal">
          An original competitive number-puzzle game. No third-party copyrighted assets are used.
        </p>
      </CelestialPanel>
    </div>
  );
}
