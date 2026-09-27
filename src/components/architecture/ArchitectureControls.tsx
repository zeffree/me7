import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { Dispatch } from 'react';
import { ARCHITECTURE_SCENARIOS, getArchitectureScenario } from '@/data/architectureScenarios';
import type { ArchitectureAction, ArchitectureState } from '@/data/architectureTypes';
import { BASELINE_SKUS, getBaseline, type BaselineSkuId } from '@/data/skus';
import { getActiveStep, getScenarioBranch } from '@/lib/architectureSimulation';
import { Button } from '@/components/ui/Primitives';

export interface ArchitectureControlProps {
  state: ArchitectureState;
  dispatch: Dispatch<ArchitectureAction>;
}

export function ArchitectureMissions({ state, dispatch }: ArchitectureControlProps) {
  return <nav className="architecture-missions" aria-label="Choose a mission">
    {ARCHITECTURE_SCENARIOS.map(scenario => <button
      type="button" key={scenario.id}
      aria-pressed={state.scenarioId === scenario.id}
      onClick={() => dispatch({ type: 'scenario', id: scenario.id })}
    >
      <strong>{scenario.shortTitle}</strong><small>{scenario.principle}</small>
    </button>)}
  </nav>;
}

export function ArchitectureLens({ state, dispatch }: ArchitectureControlProps) {
  return <details className="architecture-lens">
    <summary aria-describedby="architecture-lens-help">Compare: <strong>{getBaseline(state.baseline).shortName}</strong></summary>
    <div className="architecture-lens-content">
      <label className="field">
        <span className="field-label">Compare E7 with</span>
        <select value={state.baseline} aria-describedby="architecture-lens-help" onChange={event => dispatch({ type: 'baseline', baseline: event.target.value as BaselineSkuId })}>
          {BASELINE_SKUS.map(sku => <option key={sku.id} value={sku.id}>{sku.name}</option>)}
        </select>
      </label>
      <p className="field-hint" id="architecture-lens-help">A local coverage lens. Your assessment and this example setup stay unchanged.</p>
    </div>
  </details>;
}

export function ArchitecturePlayButton({ state, dispatch }: ArchitectureControlProps) {
  const last = getScenarioBranch(state).steps.length - 1;
  return <Button className="architecture-play-button" onClick={() => dispatch({ type: state.playing ? 'pause' : 'play' })}>
    {state.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
    {state.playing ? 'Pause mission' : state.checkpoint === last ? 'Replay mission' : state.checkpoint === 0 ? 'Start mission' : 'Continue mission'}
  </Button>;
}

export function ArchitectureWhatIf({ state, dispatch }: ArchitectureControlProps) {
  const scenario = getArchitectureScenario(state.scenarioId);
  return <section className="architecture-what-if" aria-labelledby="architecture-what-if-title">
    <h3 id="architecture-what-if-title">What if…</h3>
    <p>Change one condition, then replay. Each change returns to the first checkpoint.</p>
    <div className="architecture-conditions">
      {scenario.controls.map(control => <label className="check-field" key={control.id}>
        <input type="checkbox" checked={state.inputs[control.id]}
          onChange={event => dispatch({ type: 'input', id: control.id, value: event.target.checked })}
          aria-describedby={`architecture-condition-${control.id}`} />
        <span><strong>{control.label}</strong>
          <span className="architecture-condition-value">{state.inputs[control.id] ? control.onLabel : control.offLabel}</span>
          <small id={`architecture-condition-${control.id}`}>{control.description}</small>
        </span>
      </label>)}
    </div>
    <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'reset' })}>Restore mission defaults</Button>
  </section>;
}

export function ArchitectureTimeline({ state, dispatch }: ArchitectureControlProps) {
  const branch = getScenarioBranch(state);
  const step = getActiveStep(state);
  const last = branch.steps.length - 1;
  return <section className="architecture-timeline" aria-label="Mission replay controls">
    <div className="architecture-playback-buttons">
      <ArchitecturePlayButton state={state} dispatch={dispatch} />
      <Button variant="secondary" disabled={state.checkpoint === 0} onClick={() => dispatch({ type: 'seek', checkpoint: state.checkpoint - 1 })}><ArrowLeft aria-hidden="true" />Previous</Button>
      <Button variant="secondary" disabled={state.checkpoint === last} onClick={() => dispatch({ type: 'seek', checkpoint: state.checkpoint + 1 })}>Next<ArrowRight aria-hidden="true" /></Button>
      <Button variant="ghost" onClick={() => dispatch({ type: 'restart' })}><RotateCcw aria-hidden="true" />Restart</Button>
    </div>
    <label className="field architecture-scrubber">
      <span className="architecture-scrubber-label"><span className="field-label">Mission checkpoint</span><span className="numeric">{state.checkpoint + 1} of {branch.steps.length} · {step.title}</span></span>
      <input type="range" min={0} max={last} step={1} value={state.checkpoint}
        aria-valuetext={`Checkpoint ${state.checkpoint + 1} of ${branch.steps.length}: ${step.title}`}
        onChange={event => dispatch({ type: 'seek', checkpoint: Number(event.target.value) })} />
    </label>
    <ol className="architecture-checkpoints">
      {branch.steps.map((checkpoint, index) => <li key={checkpoint.id}>
        <button type="button" aria-current={state.checkpoint === index ? 'step' : undefined}
          className={index < state.checkpoint ? 'is-visited' : undefined}
          onClick={() => dispatch({ type: 'seek', checkpoint: index })}>
          <span aria-hidden="true">{index + 1}</span><span>{checkpoint.title}</span>
        </button>
      </li>)}
    </ol>
    <p className="architecture-restart-note">Restart keeps your what-if conditions. Restore mission defaults resets them.</p>
  </section>;
}
