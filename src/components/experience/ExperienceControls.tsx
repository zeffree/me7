import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import type { Dispatch } from 'react';
import type { ExperienceAction, ExperienceMission, ExperienceState, LabRole, LabSuite } from '@/data/experience/types';
import { getRolePath, ROLE_PATHS } from '@/data/experience/roles';
import { getCurrentRun } from '@/lib/experienceEngine';

const SUITE_LABELS: Record<LabSuite, string> = { o365e3: 'Office 365 E3', m365e7: 'Microsoft 365 E7' };
export { SUITE_LABELS };

export function SuiteSwitch({ suite, onChange }: { suite: LabSuite; onChange: (suite: LabSuite) => void }) {
  return <div className="lab-suite-control">
    <div className="lab-suite-switch" role="group" aria-label="Experience suite">
      <button type="button" aria-pressed={suite === 'o365e3'} onClick={() => onChange('o365e3')}><span>Office 365</span><strong>E3</strong>{suite === 'o365e3' && <Check aria-hidden="true" />}</button>
      <button type="button" aria-pressed={suite === 'm365e7'} onClick={() => onChange('m365e7')}><span>Microsoft 365</span><strong>E7</strong>{suite === 'm365e7' && <Check aria-hidden="true" />}</button>
    </div>
    <small>Same sample case. A separate, resumable run for each suite.</small>
  </div>;
}

export function RunSuiteSelect({ id, suite, onChange }: { id: string; suite: LabSuite; onChange: (suite: LabSuite) => void }) {
  return <label className="lab-compact-suite" htmlFor={id}><span>Run this setup with</span>
    <select id={id} value={suite} onChange={event => {
      const value = event.target.value;
      if (value === 'o365e3' || value === 'm365e7') onChange(value);
    }}><option value="o365e3">O365 E3</option><option value="m365e7">M365 E7</option></select>
  </label>;
}

export function RolePaths({ role, onChange }: { role: LabRole; onChange: (role: LabRole) => void }) {
  const selected = getRolePath(role);
  return <details className="lab-path-disclosure"><summary>Pick a role-based path<span>{selected.label}</span></summary><div className="lab-role-path">
    <label htmlFor="lab-role">Follow your curiosity, or pick a path</label>
    <select id="lab-role" value={role} onChange={event => {
      const next = ROLE_PATHS.find(path => path.id === event.target.value);
      if (next) onChange(next.id);
    }}>{ROLE_PATHS.map(path => <option value={path.id} key={path.id}>{path.label}</option>)}</select>
    <p>{selected.description} All spaces stay open.</p>
  </div></details>;
}

export function ReplayControls({ state, dispatch, onReset }: {
  state: ExperienceState; dispatch: Dispatch<ExperienceAction>; onReset: () => void;
}) {
  const run = getCurrentRun(state);
  return <div className="lab-replay">
    <button type="button" className="lab-button lab-button-quiet" disabled={run.cursor === 0} onClick={() => dispatch({ type: 'seek', cursor: run.cursor - 1 })}><ArrowLeft aria-hidden="true" />Undo</button>
    <label className="lab-replay-track">
      <span>{run.cursor === 0 ? 'Starting setup' : `Your move ${run.cursor} of ${run.history.length - 1}`}</span>
      <input type="range" min={0} max={Math.max(0, run.history.length - 1)} step={1} value={run.cursor}
        disabled={run.history.length === 1} aria-label="Rewind your decisions"
        aria-valuetext={run.cursor === 0 ? 'Starting setup' : `Move ${run.cursor} of ${run.history.length - 1}`}
        onChange={event => dispatch({ type: 'seek', cursor: Number(event.target.value) })} />
    </label>
    <button type="button" className="lab-button lab-button-quiet" disabled={run.cursor === run.history.length - 1} onClick={() => dispatch({ type: 'seek', cursor: run.cursor + 1 })}>Redo<ArrowRight aria-hidden="true" /></button>
    <button type="button" className="lab-button lab-button-quiet" onClick={onReset}><RotateCcw aria-hidden="true" />Restart</button>
  </div>;
}

export function CaseSelector({ mission, state, dispatch }: {
  mission: ExperienceMission; state: ExperienceState; dispatch: Dispatch<ExperienceAction>;
}) {
  const variant = state.missions[mission.id].variant;
  return <div className="lab-case-selector">
    <div role="group" aria-label="Sample case">
      <button type="button" aria-pressed={variant === 'everyday'} onClick={() => dispatch({ type: 'case', variant: 'everyday' })}>{mission.variants.everyday.label}</button>
      <button type="button" aria-pressed={variant === 'curveball'} onClick={() => dispatch({ type: 'case', variant: 'curveball' })}>{mission.variants.curveball.label}</button>
    </div>
    <p>{mission.variants[variant].description}</p>
    <small>Changing the case restarts both suite runs, not your assessment.</small>
  </div>;
}
