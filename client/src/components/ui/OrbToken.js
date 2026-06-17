import React from 'react';

export default function OrbToken({ token, selected, selectionIndex, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`orb-token zone-${token.zone}${selected ? ' selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${token.zone} token, value ${token.value}${selected ? `, selected position ${selectionIndex}` : ''}`}
    >
      <span className="orb-value" aria-hidden="true">{token.value}</span>
      <span className="orb-zone" aria-hidden="true">{token.zone}</span>
      {selected && (
        <span className="selection-index" aria-hidden="true">{selectionIndex}</span>
      )}
    </button>
  );
}
