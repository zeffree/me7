import { useState } from 'react';
import { ARCHITECTURE_EDGES, ARCHITECTURE_NODES, ARCHITECTURE_PILLARS, BUNDLE_LABELS, EDGE_KIND_LABELS, getArchitectureEdge, getArchitectureNode, getNodeCoverage } from '@/data/architecture';
import { getArchitectureScenario } from '@/data/architectureScenarios';
import type { ArchitecturePillarId } from '@/data/architectureTypes';
import type { Coverage } from '@/data/categories';
import { getSource } from '@/data/sources';
import { getBaseline } from '@/data/skus';
import { getActiveStep, getScenarioBranch, SCENARIO_STATUS_LABELS } from '@/lib/architectureSimulation';
import { Button } from '@/components/ui/Primitives';
import { ArchitectureWhatIf, type ArchitectureControlProps } from './ArchitectureControls';

const COVERAGE_LABELS: Record<Coverage, string> = {
  already: 'Relevant capability in this baseline',
  unlocked: 'Added entitlement with E7',
  upgrade: 'Higher-tier capability with E7',
  'not-covered': 'Not included in E7',
};

export function ArchitectureSources({ sourceIds }: { sourceIds: readonly string[] }) {
  return <details className="disclosure architecture-sources">
    <summary>Sources &amp; prerequisites</summary>
    <ul>{[...new Set(sourceIds)].map(id => {
      const source = getSource(id);
      return source && <li key={id}>
        {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : <strong>{source.title}</strong>}
        <small>{source.publisher} · reviewed {source.reviewedAt}</small>
        {source.conditions.length > 0 && <ul>{source.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul>}
      </li>;
    })}</ul>
    <p><a href="#audit">Open the audit &amp; review reference</a> for the evidence record.</p>
  </details>;
}

export function ArchitectureInspector({ state, dispatch }: ArchitectureControlProps) {
  const scenario = getArchitectureScenario(state.scenarioId);
  const step = getActiveStep(state);
  const branch = getScenarioBranch(state);
  const node = state.selection?.kind === 'node' ? getArchitectureNode(state.selection.id) : null;
  const edge = state.selection?.kind === 'edge' ? getArchitectureEdge(state.selection.id) : null;
  const coverage = node ? getNodeCoverage(node, state.baseline) : null;
  return <aside className="architecture-inspector" aria-label="Story and component inspector">
    {state.selection && <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'select', selection: null })}>← Back to {state.mode === 'guided' ? 'the mission' : 'exploration'}</Button>}
    {node && coverage ? <section className="architecture-inspector-content">
      <h2 id="architecture-inspector-title" tabIndex={-1}>{node.label}</h2>
      <p className="architecture-component-bundle">{BUNDLE_LABELS[node.bundle]} · {ARCHITECTURE_PILLARS.find(pillar => pillar.id === node.pillar)?.label}</p>
      <p>{node.description}</p>
      <section className="architecture-coverage" aria-label="Comparison coverage">
        <h3>Compared with {getBaseline(state.baseline).name}</h3>
        <p><strong>{coverage.label}</strong></p>
        <ul>{coverage.items.map(item => <li key={item.label}><span>{item.label}</span><strong>{COVERAGE_LABELS[item.coverage]}</strong></li>)}</ul>
        <p>{coverage.note}</p>
        <p>Entitlement is not deployment, permission, or proof of protection.</p>
      </section>
      <details className="disclosure"><summary>Technical detail &amp; setup</summary>
        <div className="detail-copy"><p>{node.technical}</p>
          {node.prerequisites.length > 0 && <><h3>For this to work</h3><ul>{node.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></>}
        </div>
      </details>
      <section className="architecture-connections"><h3>Connected relationships</h3>
        <ul>{ARCHITECTURE_EDGES.filter(item => item.from === node.id || item.to === node.id).map(item => <li key={item.id}>
          <button type="button" onClick={() => dispatch({ type: 'select', selection: { kind: 'edge', id: item.id } })}>
            <span>{item.label}</span><small>{getArchitectureNode(item.from).shortLabel} → {getArchitectureNode(item.to).shortLabel} · {EDGE_KIND_LABELS[item.kind]}</small>
          </button>
        </li>)}</ul>
      </section>
      <ArchitectureSources sourceIds={node.sourceIds} />
    </section> : edge ? <section className="architecture-inspector-content">
      <h2 id="architecture-inspector-title" tabIndex={-1}>{edge.label}</h2>
      <p className="architecture-component-bundle">{EDGE_KIND_LABELS[edge.kind]} relationship</p>
      <p>{edge.description}</p>
      <div className="architecture-edge-direction">
        <span>From</span><Button variant="secondary" onClick={() => dispatch({ type: 'select', selection: { kind: 'node', id: edge.from } })}>Focus {getArchitectureNode(edge.from).label}</Button>
        <span>To ↓</span><Button variant="secondary" onClick={() => dispatch({ type: 'select', selection: { kind: 'node', id: edge.to } })}>Focus {getArchitectureNode(edge.to).label}</Button>
      </div>
      <p className="muted">A logical direction, not a literal network packet route or a permanently trusted path.</p>
      <ArchitectureSources sourceIds={edge.sourceIds} />
    </section> : state.mode === 'explore' ? <section className="architecture-inspector-content">
      <h2 id="architecture-inspector-title" tabIndex={-1}>Follow a connection</h2>
      <p>Choose a product in the model or use the searchable index below. Its explanation, coverage and relationships appear here.</p>
      <p>Identity, endpoints, network, apps, data, infrastructure and SecOps are architectural roles — not seven new products.</p>
      <div className="architecture-story-note"><strong>Four parts of E7</strong><p>Microsoft 365 E5 + Microsoft 365 Copilot + Microsoft Entra Suite + Microsoft Agent 365.</p><p>Work IQ provides context for Copilot. It is not a fifth SKU. Complementary services remain separately licensed.</p></div>
      <Button variant="secondary" onClick={() => dispatch({ type: 'mode', mode: 'guided' })}>Return to the mission</Button>
    </section> : <section className="architecture-inspector-content architecture-story">
      <div className="architecture-story-position"><span>Checkpoint {state.checkpoint + 1} / {branch.steps.length}</span><span>{SCENARIO_STATUS_LABELS[step.status]}</span></div>
      <h2 id="architecture-inspector-title" tabIndex={-1}>{step.title}</h2>
      <p>{step.summary}</p>
      <details className="disclosure"><summary>Behind this checkpoint</summary><div className="detail-copy"><p>{step.detail}</p></div></details>
      <div className="architecture-story-products" aria-label="Components in this checkpoint">
        {step.nodeIds.map(id => <Button key={id} variant="secondary" size="sm" onClick={() => dispatch({ type: 'select', selection: { kind: 'node', id } })}>{getArchitectureNode(id).shortLabel}</Button>)}
      </div>
      {state.checkpoint === branch.steps.length - 1 && <div className="architecture-story-outcome">
        <h3>{branch.outcomeTitle}</h3><p>{branch.outcomeSummary}</p>
      </div>}
      <details className="disclosure"><summary>Mission goal &amp; example policy</summary><div className="detail-copy"><p>{scenario.goal}</p><p>{scenario.assumption}</p></div></details>
    </section>}
    <ArchitectureWhatIf state={state} dispatch={dispatch} />
  </aside>;
}

export function ArchitectureIndex({ state, dispatch }: ArchitectureControlProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'nodes' | 'edges'>('nodes');
  const inspect = (kind: 'node' | 'edge', id: string) => {
    dispatch({ type: 'select', selection: { kind, id } });
    requestAnimationFrame(() => {
      const heading = document.getElementById('architecture-inspector-title');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'nearest' });
    });
  };
  const search = query.trim().toLocaleLowerCase();
  const nodes = ARCHITECTURE_NODES.filter(node => (state.pillar === 'all' || node.pillar === state.pillar) &&
    `${node.label} ${node.description} ${BUNDLE_LABELS[node.bundle]}`.toLocaleLowerCase().includes(search));
  const edges = ARCHITECTURE_EDGES.filter(edge => {
    const from = getArchitectureNode(edge.from);
    const to = getArchitectureNode(edge.to);
    return (state.pillar === 'all' || from.pillar === state.pillar || to.pillar === state.pillar) &&
      `${edge.label} ${edge.description} ${from.label} ${to.label}`.toLocaleLowerCase().includes(search);
  });
  return <section className="architecture-index" aria-labelledby="architecture-index-title">
    <div className="architecture-index-heading"><div><h2 id="architecture-index-title" tabIndex={-1}>Explore the architecture</h2><p>Every component and connection, without needing to move the camera.</p></div>
      <div className="segmented" role="group" aria-label="Index entries">
        <button type="button" aria-pressed={tab === 'nodes'} onClick={() => setTab('nodes')}>Products &amp; context</button>
        <button type="button" aria-pressed={tab === 'edges'} onClick={() => setTab('edges')}>Connections</button>
      </div>
    </div>
    <div className="architecture-index-filters">
      <label className="field"><span className="field-label">Search products or connections</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Entra, permissions or response" /></label>
      <label className="field"><span className="field-label">Architecture pillar</span><select value={state.pillar} onChange={event => dispatch({ type: 'pillar', pillar: event.target.value as ArchitecturePillarId | 'all' })}>
        <option value="all">All pillars</option>{ARCHITECTURE_PILLARS.map(pillar => <option key={pillar.id} value={pillar.id}>{pillar.label}</option>)}
      </select></label>
    </div>
    <p className="architecture-index-count" role="status">{tab === 'nodes' ? `${nodes.length} components` : `${edges.length} connections`} shown</p>
    {((tab === 'nodes' && !nodes.length) || (tab === 'edges' && !edges.length)) && <div className="architecture-empty"><p>No matches. Try a product name or choose all pillars.</p><Button variant="ghost" onClick={() => { setQuery(''); dispatch({ type: 'pillar', pillar: 'all' }); }}>Clear search and filters</Button></div>}
    <ul className="architecture-index-list">{tab === 'nodes' ? nodes.map(node => <li key={node.id}>
      <button type="button" aria-pressed={state.selection?.kind === 'node' && state.selection.id === node.id}
        onClick={() => inspect('node', node.id)}>
        <strong>{node.label}</strong><span>{BUNDLE_LABELS[node.bundle]}</span><small>{getNodeCoverage(node, state.baseline).label}</small>
      </button>
    </li>) : edges.map(edge => <li key={edge.id}>
      <button type="button" aria-pressed={state.selection?.kind === 'edge' && state.selection.id === edge.id}
        onClick={() => inspect('edge', edge.id)}>
        <strong>{edge.label}</strong><span>{getArchitectureNode(edge.from).shortLabel} → {getArchitectureNode(edge.to).shortLabel}</span><small>{EDGE_KIND_LABELS[edge.kind]}</small>
      </button>
    </li>)}</ul>
  </section>;
}
