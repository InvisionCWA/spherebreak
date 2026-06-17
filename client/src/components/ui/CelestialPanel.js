import React from 'react';

export default function CelestialPanel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`celestial-panel ${className}`.trim()}>
      {(title || subtitle) && (
        <header className="panel-header">
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
