import React, { useMemo, useState } from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

const STEPS = [
  {
    title: 'Core target number',
    text: 'The center target sets the divisor. All selected token sums must be a multiple of this number.',
  },
  {
    title: 'Valid and invalid examples',
    text: 'Target 4: selecting 3 + 5 = 8 is valid. Selecting 2 + 5 = 7 is invalid.',
  },
  {
    title: 'Required inner token',
    text: 'Every move must include at least one inner token. Outer-only selection is rejected.',
  },
  {
    title: 'Quota and combo',
    text: 'Each valid Break increases quota progress. Consecutive successful turns build combo and streak bonuses.',
  },
  {
    title: 'Multiplayer turn flow',
    text: 'Turn timer is server-authoritative. Moves outside turn windows are rejected and flagged.',
  },
];

export default function Tutorial({ onBack }) {
  const [idx, setIdx] = useState(0);
  const step = useMemo(() => STEPS[idx], [idx]);

  return (
    <div className="screen-center">
      <CelestialPanel title="How to Play" subtitle={`Step ${idx + 1} of ${STEPS.length}`}>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="row-actions">
          <button className="secondary-btn" type="button" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>Previous</button>
          <button className="secondary-btn" type="button" onClick={() => setIdx(Math.min(STEPS.length - 1, idx + 1))} disabled={idx === STEPS.length - 1}>Next</button>
        </div>
        <button className="primary-btn" type="button" onClick={onBack}>Return to Main Menu</button>
      </CelestialPanel>
    </div>
  );
}
