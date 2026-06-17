import React from 'react';

export default function GameLogo({ size = 28, showText = true }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
      }}
      aria-label="Celestial Break"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 128 128"
        aria-hidden="true"
        focusable="false"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(155,109,255,0.60))' }}
      >
        <defs>
          <radialGradient id="logo-orb" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffe8ff" />
            <stop offset="30%" stopColor="#4dddff" />
            <stop offset="62%" stopColor="#9b6dff" />
            <stop offset="100%" stopColor="#06091e" />
          </radialGradient>
        </defs>
        <circle cx="64" cy="64" r="46" fill="none" stroke="#2c4a8c" strokeWidth="2.5" opacity="0.7" />
        <circle cx="64" cy="64" r="30" fill="none" stroke="#9b6dff" strokeWidth="2" opacity="0.75" />
        <circle cx="64" cy="64" r="20" fill="url(#logo-orb)" />
        <circle cx="27" cy="64" r="7" fill="#4dddff" opacity="0.92" />
        <circle cx="101" cy="64" r="7" fill="#ffd166" opacity="0.92" />
      </svg>
      {showText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '0.07em',
            background: 'linear-gradient(90deg, #4dddff 0%, #9b6dff 55%, #ffd166 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Celestial Break
        </span>
      )}
    </span>
  );
}
