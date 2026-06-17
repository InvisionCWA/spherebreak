import React from 'react';

export default function OrbToken({ token, selected, selectionIndex, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`orb-token zone-${token.zone}${selected ? ' selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${token.zone} token value ${token.value}`}
    >
      <span className="orb-value">{token.value}</span>
      <span className="orb-zone">{token.zone}</span>
      {selected && <span className="selection-index">{selectionIndex}</span>}
    </button>
  );
}
