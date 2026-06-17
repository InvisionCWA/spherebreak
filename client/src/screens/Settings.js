import React from 'react';
import CelestialPanel from '../components/ui/CelestialPanel';

export default function Settings({ settings, onUpdate, onBack }) {
  return (
    <div className="screen-center">
      <CelestialPanel title="Settings" subtitle="Gameplay and accessibility options">
        <label className="stack-field">
          Turn limit
          <input type="number" min={4} max={60} value={settings.turnLimit} onChange={(e) => onUpdate('turnLimit', Number(e.target.value))} />
        </label>
        <label className="stack-field">
          Seconds per turn
          <input type="number" min={8} max={60} value={settings.secondsPerTurn} onChange={(e) => onUpdate('secondsPerTurn', Number(e.target.value))} />
        </label>
        <label className="stack-field">
          Quota to win
          <input type="number" min={3} max={60} value={settings.quotaToWin} onChange={(e) => onUpdate('quotaToWin', Number(e.target.value))} />
        </label>
        <label className="stack-field row-inline">
          Beginner hints
          <input type="checkbox" checked={Boolean(settings.beginnerHints)} onChange={(e) => onUpdate('beginnerHints', e.target.checked)} />
        </label>
        <button type="button" className="ghost-btn" onClick={onBack}>Back</button>
      </CelestialPanel>
    </div>
  );
}
