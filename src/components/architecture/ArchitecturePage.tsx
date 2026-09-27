import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAssessment } from '@/store/useAssessment';
import { EDGE_KIND_LABELS } from '@/data/architecture';
import { getArchitectureScenario } from '@/data/architectureScenarios';
import type { ArchitectureEdgeKind, ArchitectureSelection } from '@/data/architectureTypes';
import { architectureReducer, createArchitectureState, getActiveStep, getScenarioBranch, getVisitedEdgeIds, SCENARIO_STATUS_LABELS } from '@/lib/architectureSimulation';
import { Button } from '@/components/ui/Primitives';
import { ArchitectureLens, ArchitectureMissions, ArchitecturePlayButton, ArchitectureTimeline } from './ArchitectureControls';
import { ArchitectureIndex, ArchitectureInspector } from './ArchitectureInspector';
import { ArchitectureViewport } from './ArchitectureViewport';
import { useArchitectureActivity, useArchitecturePlayback } from './useArchitectureActivity';
import './architecture.css';

const CONTRACT = '<!-- THESIS: A mission replay, not a product-logo map. OWN-WORLD: Inherited paper and slate surfaces, cobalt controls, yellow explanatory notes, Public Sans. STORY: Follow a request, inspect a relationship, change a condition, replay the decision. FIRST VIEWPORT: A big spatial model with compact mission controls, an inspector and a timeline; no giant hero or autoplay. FORM: Mission replay, grounded structural candidate 5, seed 5ec8a798. -->';

export function ArchitecturePage({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [state, dispatch] = useReducer(architectureReducer, undefined, () => createArchitectureState());
  const [indexOpen, setIndexOpen] = useState(false);
  const theme = useAssessment(store => store.theme);
  const { viewportRef, active, reducedMotion } = useArchitectureActivity();
  useArchitecturePlayback(state.playing, active, dispatch);
  const scenario = getArchitectureScenario(state.scenarioId);
  const step = getActiveStep(state);
  const branch = getScenarioBranch(state);
  const visitedEdgeIds = getVisitedEdgeIds(state);
  const onSelect = useCallback((selection: ArchitectureSelection | null) => dispatch({ type: 'select', selection }), []);
  const onCameraInteraction = useCallback(() => dispatch({ type: 'camera-interacted' }), []);
  const onChoose3D = useCallback(() => dispatch({ type: 'view', view: '3d' }), []);
  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => { setIndexOpen(state.mode === 'explore'); }, [state.mode]);
  const openIndex = () => {
    setIndexOpen(true);
    requestAnimationFrame(() => {
      const heading = document.getElementById('architecture-index-title');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start' });
    });
  };

  return <div className="architecture-page">
    <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
    <header className="architecture-heading">
      <div className="architecture-title-line"><h1 ref={headingRef} tabIndex={-1}>E7 in action</h1><Button className="architecture-back" variant="ghost" size="sm" onClick={onBack}><ArrowLeft aria-hidden="true" />Assessment</Button></div>
      <ArchitectureLens state={state} dispatch={dispatch} />
    </header>
    <p className="architecture-disclaimer">Illustrative scenario. No tenant connection. Policies are examples, not a deployment assessment.</p>
    <ArchitectureMissions state={state} dispatch={dispatch} />
    <div className="architecture-workbench">
      <div className="architecture-model">
        <div className="architecture-toolbar">
          <ArchitecturePlayButton state={state} dispatch={dispatch} />
          <div className="segmented" role="group" aria-label="Exploration mode">
            <button type="button" aria-label="Guided mission" aria-pressed={state.mode === 'guided'} onClick={() => dispatch({ type: 'mode', mode: 'guided' })}>Guided<span className="architecture-mode-detail"> mission</span></button>
            <button type="button" aria-label="Free exploration" aria-pressed={state.mode === 'explore'} onClick={() => dispatch({ type: 'mode', mode: 'explore' })}>Explore<span className="architecture-mode-detail"> freely</span></button>
          </div>
          <details className="architecture-tools">
            <summary>{state.camera === 'follow' && !state.followCamera ? 'Resume following / view' : 'View & camera'}</summary>
            <div className="architecture-tools-content">
              <div className="segmented" role="group" aria-label="Architecture view">
                <button type="button" aria-pressed={state.view === '3d'} onClick={onChoose3D}>3D model</button>
                <button type="button" aria-pressed={state.view === '2d'} onClick={() => dispatch({ type: 'view', view: '2d' })}>Interactive 2D</button>
              </div>
              <div className="button-row" role="group" aria-label="Camera presets">
                <Button variant="ghost" size="sm" aria-pressed={state.camera === 'overview'} onClick={() => dispatch({ type: 'camera', camera: 'overview' })}>Cinematic overview</Button>
                <Button variant="ghost" size="sm" aria-pressed={state.camera === 'exploded'} onClick={() => dispatch({ type: 'camera', camera: 'exploded' })}>Exploded layers</Button>
                <Button variant="ghost" size="sm" aria-pressed={state.camera === 'follow' && state.followCamera} onClick={() => dispatch({ type: 'camera', camera: 'follow' })}>{state.camera === 'follow' && !state.followCamera ? 'Resume following' : 'Follow request'}</Button>
              </div>
            </div>
          </details>
          <button type="button" className="architecture-index-jump" aria-label="Find a product or connection" aria-controls="architecture-index-disclosure" aria-expanded={indexOpen} onClick={openIndex}>Find a product ↓</button>
        </div>
        <div ref={viewportRef} className="architecture-viewport">
          <ArchitectureViewport state={state} step={step} visitedEdgeIds={visitedEdgeIds} theme={theme} active={active}
            reducedMotion={reducedMotion} onSelect={onSelect} onCameraInteraction={onCameraInteraction} onChoose3D={onChoose3D} />
        </div>
        <div className="architecture-model-caption">
          <p><strong>E7 = E5 + Copilot + Entra Suite + Agent 365</strong><span>Work IQ is work context for Copilot, not an additional SKU.</span></p>
          <details className="architecture-legend"><summary>Read the connections</summary><ul>
            {(Object.keys(EDGE_KIND_LABELS) as ArchitectureEdgeKind[]).map(kind => <li key={kind}><span className={`architecture-line-key architecture-line-${kind}`} aria-hidden="true" />{EDGE_KIND_LABELS[kind]}</li>)}
          </ul><p>Arrows show direction. These are logical relationships, not literal network routes.</p></details>
        </div>
        <ArchitectureTimeline state={state} dispatch={dispatch} />
      </div>
      <ArchitectureInspector state={state} dispatch={dispatch} />
    </div>
    <section className="architecture-print-summary">
      <h2>{scenario.title}</h2><p>{scenario.goal}</p>
      <p><strong>Checkpoint {state.checkpoint + 1}: {step.title}.</strong> {step.summary}</p>
      <p>{step.detail}</p><p><strong>Example policy:</strong> {scenario.assumption}</p>
    </section>
    <div className="architecture-announcement" role="status" aria-live="polite" aria-atomic="true">
      {state.message || `${scenario.shortTitle} · Checkpoint ${state.checkpoint + 1} of ${branch.steps.length}: ${step.title}. ${SCENARIO_STATUS_LABELS[step.status]}.`}
      {state.playing && !active && ' Playback is waiting while the model is out of view or this tab is hidden.'}
    </div>
    {reducedMotion && <p className="architecture-motion-note">Reduced motion is on. Deliberate playback advances stationary checkpoints; camera and flow animation stay off.</p>}
    <details id="architecture-index-disclosure" className="architecture-index-disclosure" open={indexOpen} onToggle={event => setIndexOpen(event.currentTarget.open)}>
      <summary>Explore products &amp; connections</summary>
      <ArchitectureIndex state={state} dispatch={dispatch} />
    </details>
    <details className="architecture-scope"><summary>A connected example, not a configured tenant</summary><p>{scenario.description}</p><p>Licensing does not configure a policy or grant access. Connected services, permissions, eligible capacity and deployment prerequisites still matter. <a href="#audit">Review sources and applicability.</a></p></details>
  </div>;
}
