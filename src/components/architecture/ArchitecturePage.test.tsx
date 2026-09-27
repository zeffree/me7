import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARCHITECTURE_EDGES, ARCHITECTURE_NODES, ARCHITECTURE_PILLARS, getArchitectureNode, getNodeCoverage } from '@/data/architecture';
import { ARCHITECTURE_SCENARIOS } from '@/data/architectureScenarios';
import { BASELINE_SKUS } from '@/data/skus';
import { architectureReducer, createArchitectureState, getActiveStep, getScenarioBranch, getVisitedEdgeIds } from '@/lib/architectureSimulation';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { ArchitectureLens, ArchitectureMissions, ArchitecturePlayButton, ArchitectureTimeline, ArchitectureWhatIf } from './ArchitectureControls';
import { ArchitectureIndex, ArchitectureInspector } from './ArchitectureInspector';
import { ArchitectureMap, getMapEdges } from './ArchitectureMap';
import { ArchitectureGraphicsStatus, ArchitectureViewport, MAX_GRAPHICS_RETRIES } from './ArchitectureViewport';
import { ArchitecturePage } from './ArchitecturePage';

const dispatch = vi.fn();
const onSelect = vi.fn();
const text = (value: string) => renderToStaticMarkup(<span>{value}</span>).slice(6, -7);

describe('architecture DOM interface', () => {
  it('opens paused with its own E5 lens, three missions and the full illustrative disclaimer', () => {
    const before = toAssessment(useAssessment.getState());
    const html = renderToStaticMarkup(<ArchitecturePage onBack={() => {}} />);
    expect(html).toContain('E7 in action');
    expect(html).toContain('<!-- THESIS: A mission replay, not a product-logo map.');
    expect(html).toContain('grounded structural candidate 5, seed 5ec8a798.');
    expect(html).toContain('Illustrative scenario. No tenant connection. Policies are examples, not a deployment assessment.');
    expect(html).toContain('Start mission');
    expect(html).not.toContain('Pause mission');
    expect(html).toContain('<option value="m365e5" selected="">Microsoft 365 E5</option>');
    expect(html).toContain('Exploration mode');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Find a product or connection');
    expect(toAssessment(useAssessment.getState())).toEqual(before);
  });

  it('keeps mission tabs compact and puts each full goal in the active inspector', () => {
    const html = renderToStaticMarkup(<ArchitectureMissions state={createArchitectureState()} dispatch={dispatch} />);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    for (const scenario of ARCHITECTURE_SCENARIOS) {
      expect(html).not.toContain(text(scenario.goal));
      expect(html).toContain(text(scenario.principle));
      expect(html).toContain(text(scenario.shortTitle));
      const inspector = renderToStaticMarkup(<ArchitectureInspector state={createArchitectureState(scenario.id)} dispatch={dispatch} />);
      expect(inspector).toContain(text(scenario.goal));
      expect(inspector).toContain(text(scenario.assumption));
    }
  });

  it('uses registry baseline labels without prices, costs or assessment controls', () => {
    const html = renderToStaticMarkup(<ArchitectureLens state={createArchitectureState()} dispatch={dispatch} />);
    for (const sku of BASELINE_SKUS) expect(html).toContain(sku.name);
    expect(html).toContain('A local coverage lens');
    expect(html).not.toMatch(/price|saving|cost|reset assessment/i);
    expect(html).toContain('<details class="architecture-lens">');
    expect(html).toContain('Compare: <strong>M365 E5</strong>');
    expect(html).toContain('aria-describedby="architecture-lens-help"');
  });

  it('places the actual mission action before the model and collapses secondary browsing by default', () => {
    const html = renderToStaticMarkup(<ArchitecturePage onBack={() => {}} />);
    expect(html.indexOf('Start mission')).toBeLessThan(html.indexOf('class="architecture-viewport"'));
    expect(html).toContain('<details class="architecture-tools"><summary>View &amp; camera</summary>');
    expect(html).toContain('aria-controls="architecture-index-disclosure" aria-expanded="false"');
    expect(html).toContain('<details id="architecture-index-disclosure" class="architecture-index-disclosure">');
    expect(html).toContain('Camera presets');
    expect(html).toContain('Interactive 2D');
  });

  it('uses the same play action labels above the model and in the timeline', () => {
    const state = architectureReducer(createArchitectureState(), { type: 'play' });
    expect(renderToStaticMarkup(<ArchitecturePlayButton state={state} dispatch={dispatch} />)).toContain('Pause mission');
    expect(renderToStaticMarkup(<ArchitectureTimeline state={state} dispatch={dispatch} />)).toContain('Pause mission');
  });

  it.each(ARCHITECTURE_SCENARIOS)('labels and bounds every checkpoint of $id', scenario => {
    const initial = createArchitectureState(scenario.id);
    const branch = getScenarioBranch(initial);
    for (let checkpoint = 0; checkpoint < branch.steps.length; checkpoint++) {
      const state = architectureReducer(initial, { type: 'seek', checkpoint });
      const html = renderToStaticMarkup(<ArchitectureTimeline state={state} dispatch={dispatch} />);
      expect(html).toContain(`min="0" max="${branch.steps.length - 1}" step="1"`);
      expect(html).toContain(`value="${checkpoint}"`);
      expect(html).toContain(`aria-valuetext="Checkpoint ${checkpoint + 1} of ${branch.steps.length}: ${text(branch.steps[checkpoint].title)}"`);
      expect(html).toContain('aria-current="step"');
      expect(html).toContain(checkpoint === branch.steps.length - 1 ? 'Replay mission' : checkpoint === 0 ? 'Start mission' : 'Continue mission');
    }
  });

  it.each(ARCHITECTURE_SCENARIOS)('shows reversible what-if inputs for $id', scenario => {
    let state = createArchitectureState(scenario.id);
    for (const control of scenario.controls) {
      const html = renderToStaticMarkup(<ArchitectureWhatIf state={state} dispatch={dispatch} />);
      expect(html).toContain(text(control.label));
      expect(html).toContain(text(control.description));
      expect(html).toContain(text(state.inputs[control.id] ? control.onLabel : control.offLabel));
      state = architectureReducer(state, { type: 'input', id: control.id, value: !state.inputs[control.id] });
      const changed = renderToStaticMarkup(<ArchitectureWhatIf state={state} dispatch={dispatch} />);
      expect(changed).toContain(text(state.inputs[control.id] ? control.onLabel : control.offLabel));
    }
  });

  it('renders business, technical, prerequisite and constituent coverage detail for every node and baseline', () => {
    for (const node of ARCHITECTURE_NODES) {
      for (const sku of BASELINE_SKUS) {
        const state = { ...createArchitectureState(), baseline: sku.id, selection: { kind: 'node' as const, id: node.id } };
        const coverage = getNodeCoverage(node, sku.id);
        const html = renderToStaticMarkup(<ArchitectureInspector state={state} dispatch={dispatch} />);
        expect(html).toContain(text(node.label));
        expect(html).toContain(text(node.description));
        expect(html).toContain(text(node.technical));
        expect(html).toContain(text(coverage.label));
        for (const item of coverage.items) expect(html).toContain(text(item.label));
        for (const prerequisite of node.prerequisites) expect(html).toContain(text(prerequisite));
        expect(html).not.toMatch(/Conditional evidence|Unverified assumption/);
      }
    }
  });

  it('explains each directed edge and lets readers focus either endpoint', () => {
    for (const edge of ARCHITECTURE_EDGES) {
      const state = { ...createArchitectureState(), selection: { kind: 'edge' as const, id: edge.id } };
      const html = renderToStaticMarkup(<ArchitectureInspector state={state} dispatch={dispatch} />);
      expect(html).toContain(text(edge.description));
      expect(html).toContain(text(`Focus ${getArchitectureNode(edge.from).label}`));
      expect(html).toContain(text(`Focus ${getArchitectureNode(edge.to).label}`));
    }
  });

  it('provides all pillars and products in the semantic index', () => {
    const html = renderToStaticMarkup(<ArchitectureIndex state={createArchitectureState()} dispatch={dispatch} />);
    expect(html).toContain('type="search"');
    expect(html).toContain('Connections');
    for (const pillar of ARCHITECTURE_PILLARS) expect(html).toContain(text(pillar.label));
    for (const node of ARCHITECTURE_NODES) expect(html).toContain(text(node.label));
  });

  it('filters the product index by architecture pillar rather than spending domain', () => {
    for (const pillar of ARCHITECTURE_PILLARS) {
      const state = architectureReducer(createArchitectureState(), { type: 'pillar', pillar: pillar.id });
      const html = renderToStaticMarkup(<ArchitectureIndex state={state} dispatch={dispatch} />);
      const expected = ARCHITECTURE_NODES.filter(node => node.pillar === pillar.id).length;
      expect(html).toContain(`${expected} components shown`);
    }
  });

  it('keeps useful mission or exploration content after selection is cleared', () => {
    const state = architectureReducer(createArchitectureState(), { type: 'mode', mode: 'explore' });
    const html = renderToStaticMarkup(<ArchitectureInspector state={state} dispatch={dispatch} />);
    expect(html).toContain('Follow a connection');
    expect(html).toContain('It is not a fifth SKU');
    expect(html).toContain('Return to the mission');
  });
});

describe('interactive 2D and graphics recovery', () => {
  it('clearly labels chosen 2D and retains the active mission and selection', () => {
    const selected = architectureReducer(createArchitectureState(), { type: 'select', selection: { kind: 'node', id: ARCHITECTURE_NODES[0].id } });
    const state = architectureReducer(selected, { type: 'view', view: '2d' });
    const html = renderToStaticMarkup(<ArchitectureViewport state={state} step={getActiveStep(state)} visitedEdgeIds={getVisitedEdgeIds(state)}
      onSelect={onSelect} onCameraInteraction={() => {}} onChoose3D={() => {}} active reducedMotion theme="light" />);
    expect(html).toContain('Interactive 2D selected');
    expect(html).not.toContain('3D graphics unavailable');
    expect(html).not.toContain('Loading the 3D model');
    expect(html).toContain('aria-pressed="true"');
    expect(state.selection).toEqual(selected.selection);
    expect(state.inputs).toEqual(selected.inputs);
    expect(state.checkpoint).toBe(selected.checkpoint);
  });

  it('keeps the 2D model usable while the separate renderer chunk loads', () => {
    const state = createArchitectureState();
    const html = renderToStaticMarkup(<ArchitectureViewport state={state} step={getActiveStep(state)} visitedEdgeIds={getVisitedEdgeIds(state)}
      onSelect={onSelect} onCameraInteraction={() => {}} onChoose3D={() => {}} active reducedMotion={false} theme="light" />);
    expect(html).toContain('Loading the 3D model');
    expect(html).toContain(text(`Inspect ${ARCHITECTURE_NODES[0].label}`));
    expect(html).toContain('Request connections');
  });

  it('uses the same active step and visited edge IDs without a second simulation', () => {
    const state = architectureReducer(createArchitectureState(), { type: 'seek', checkpoint: 2 });
    const step = getActiveStep(state);
    const visitedEdgeIds = getVisitedEdgeIds(state);
    expect(getMapEdges({ state, step, visitedEdgeIds }).map(edge => edge.id).sort()).toEqual([...new Set([...step.edgeIds, ...visitedEdgeIds])].sort());
    const html = renderToStaticMarkup(<ArchitectureMap state={state} step={step} visitedEdgeIds={visitedEdgeIds} onSelect={onSelect} />);
    expect(html).toContain('<svg');
    for (const node of ARCHITECTURE_NODES) expect(html).toContain(text(`Inspect ${node.label}`));
    for (const id of step.edgeIds) expect(html).toContain(text(ARCHITECTURE_EDGES.find(edge => edge.id === id)!.label));
  });

  it('isolates a selected edge and preserves its selected semantic button', () => {
    const edge = ARCHITECTURE_EDGES[0];
    const state = architectureReducer(createArchitectureState(), { type: 'select', selection: { kind: 'edge', id: edge.id } });
    const props = { state, step: getActiveStep(state), visitedEdgeIds: getVisitedEdgeIds(state) };
    expect(getMapEdges(props)).toEqual([edge]);
    const html = renderToStaticMarkup(<ArchitectureMap {...props} onSelect={onSelect} />);
    expect(html).toContain('Selected relationships');
    expect(html).toContain('aria-pressed="true"');
  });

  it('offers a finite, explicit recovery path and distinguishes failure from choosing 2D', () => {
    const retry = renderToStaticMarkup(<ArchitectureGraphicsStatus failure="The graphics context was interrupted." retries={0} onRetry={() => {}} />);
    expect(retry).toContain('role="alert"');
    expect(retry).toContain('3D graphics unavailable');
    expect(retry).toContain('Your mission, conditions and selection are preserved.');
    expect(retry).toContain(`Retry 3D (${MAX_GRAPHICS_RETRIES} attempts left)`);
    const exhausted = renderToStaticMarkup(<ArchitectureGraphicsStatus failure="The graphics context was interrupted." retries={MAX_GRAPHICS_RETRIES} onRetry={() => {}} />);
    expect(exhausted).not.toContain('<button');
    expect(exhausted).toContain('Retry limit reached');
  });

  it('prints a real diagram and textual relationships instead of relying on a canvas', () => {
    const state = createArchitectureState();
    const html = renderToStaticMarkup(<ArchitectureMap state={state} step={getActiveStep(state)} visitedEdgeIds={getVisitedEdgeIds(state)} onSelect={onSelect} print />);
    expect(html).toContain('<svg');
    expect(html).toContain('architecture-map-static');
    expect(html).not.toContain('<canvas');
    expect(html).toContain('Request connections');
  });
});
