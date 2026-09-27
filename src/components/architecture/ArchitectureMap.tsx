import { useId } from 'react';
import { ARCHITECTURE_EDGES, ARCHITECTURE_NODES, ARCHITECTURE_PILLARS, EDGE_KIND_LABELS, getArchitectureNode } from '@/data/architecture';
import type { ArchitectureEdge, ArchitecturePillarId, ArchitectureSceneProps } from '@/data/architectureTypes';

type MapProps = Pick<ArchitectureSceneProps, 'state' | 'step' | 'visitedEdgeIds' | 'onSelect'> & { print?: boolean };

const GRID: Record<ArchitecturePillarId, readonly [number, number]> = {
  identity: [0, 0], network: [1, 0], apps: [2, 0],
  endpoint: [0, 1], data: [2, 1],
  secops: [1, 2], infrastructure: [2, 2],
};
const DASHES = { access: '', signal: '3 6', policy: '10 4', data: '', governance: '10 4 2 4', response: '5 3' };
const WIDTH = 900;

export function getMapEdges({ state, step, visitedEdgeIds }: Pick<MapProps, 'state' | 'step' | 'visitedEdgeIds'>): ArchitectureEdge[] {
  const selection = state.selection;
  if (selection?.kind === 'edge') return ARCHITECTURE_EDGES.filter(edge => edge.id === selection.id);
  if (selection?.kind === 'node') return ARCHITECTURE_EDGES.filter(edge => edge.from === selection.id || edge.to === selection.id);
  if (state.pillar !== 'all') return ARCHITECTURE_EDGES.filter(edge =>
    getArchitectureNode(edge.from).pillar === state.pillar || getArchitectureNode(edge.to).pillar === state.pillar,
  );
  const visibleIds = new Set([...visitedEdgeIds, ...step.edgeIds]);
  return ARCHITECTURE_EDGES.filter(edge => visibleIds.has(edge.id));
}

export function ArchitectureMap({ state, step, visitedEdgeIds, onSelect, print = false }: MapProps) {
  const markerId = useId();
  const groups = ARCHITECTURE_PILLARS.map(pillar => ({ ...pillar, nodes: ARCHITECTURE_NODES.filter(node => node.pillar === pillar.id) }));
  const rowHeights = [0, 1, 2].map(row => Math.max(2, ...groups.filter(group => GRID[group.id][1] === row).map(group => group.nodes.length)) * 46 + 70);
  const height = rowHeights.reduce((sum, value) => sum + value, 0);
  const positions = new Map(groups.flatMap(group => {
    const [column, row] = GRID[group.id];
    const y = rowHeights.slice(0, row).reduce((sum, value) => sum + value, 0);
    return group.nodes.map((node, index) => [node.id, { x: column * 300 + 20, y: y + 48 + index * 46 }] as const);
  }));
  const edges = getMapEdges({ state, step, visitedEdgeIds });
  const emphasized = new Set([...step.nodeIds, ...edges.flatMap(edge => [edge.from, edge.to])]);
  return <div className={`architecture-map${print ? ' architecture-map-static' : ''}`}>
    <div className="architecture-map-diagram" style={{ aspectRatio: `${WIDTH} / ${height}` }}>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label="Logical architecture relationships; component and connection buttons provide the full explanation.">
        <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        {edges.map(edge => {
          const from = positions.get(edge.from)!;
          const to = positions.get(edge.to)!;
          const forward = to.x >= from.x;
          const x1 = from.x + (forward ? 256 : 0);
          const x2 = to.x + (forward ? 0 : 256);
          const path = from.x === to.x
            ? `M ${from.x + 256} ${from.y + 19} C ${from.x + 282} ${from.y + 19}, ${to.x + 282} ${to.y + 19}, ${to.x + 256} ${to.y + 19}`
            : `M ${x1} ${from.y + 19} C ${(x1 + x2) / 2} ${from.y + 19}, ${(x1 + x2) / 2} ${to.y + 19}, ${x2} ${to.y + 19}`;
          const active = step.edgeIds.includes(edge.id) || (state.selection?.kind === 'edge' && state.selection.id === edge.id);
          return <g key={edge.id} className={active ? 'architecture-map-edge is-active' : 'architecture-map-edge'}>
            <path d={path} strokeDasharray={DASHES[edge.kind]} markerEnd={`url(#${markerId})`} />
            {!print && <path className="architecture-map-edge-hit" d={path} onClick={() => onSelect({ kind: 'edge', id: edge.id })}><title>{edge.label}</title></path>}
          </g>;
        })}
      </svg>
      {groups.map(group => {
        const [column, row] = GRID[group.id];
        const y = rowHeights.slice(0, row).reduce((sum, value) => sum + value, 0);
        return <div key={group.id} className="architecture-map-group" style={{ left: `${(column * 300 + 20) / WIDTH * 100}%`, top: `${(y + 10) / height * 100}%`, width: `${256 / WIDTH * 100}%` }}>
          <h3>{group.label}</h3>
        </div>;
      })}
      <div className="architecture-map-center" style={{ left: '35%', top: `${(rowHeights[0] + 55) / height * 100}%`, width: '27%' }}>
        <strong>One request.<br />Connected decisions.</strong>
        <p>Lines show logical relationships, not a trusted inner perimeter.</p>
      </div>
      {ARCHITECTURE_NODES.map(node => {
        const position = positions.get(node.id)!;
        const selected = state.selection?.kind === 'node' && state.selection.id === node.id;
        const highlighted = emphasized.has(node.id) || (state.pillar !== 'all' && node.pillar === state.pillar);
        const props = {
          className: `architecture-map-node${highlighted ? ' is-relevant' : ''}${selected ? ' is-selected' : ''}`,
          style: { left: `${position.x / WIDTH * 100}%`, top: `${position.y / height * 100}%`, width: `${256 / WIDTH * 100}%` },
        };
        return print ? <span key={node.id} {...props}>{node.shortLabel}</span> : <button type="button" key={node.id} {...props}
          aria-label={`Inspect ${node.label}`} aria-pressed={selected} onClick={() => onSelect({ kind: 'node', id: node.id })}>{node.shortLabel}</button>;
      })}
    </div>
    <div className="architecture-map-mobile">
      {groups.map(group => <section key={group.id}><h3>{group.label}</h3>
        <div>{group.nodes.map(node => <button key={node.id} type="button"
          className={emphasized.has(node.id) ? 'is-relevant' : undefined}
          aria-pressed={state.selection?.kind === 'node' && state.selection.id === node.id}
          onClick={() => onSelect({ kind: 'node', id: node.id })}>{node.label}</button>)}</div>
      </section>)}
    </div>
    <section className="architecture-map-relationships" aria-label="Visible diagram connections">
      <h3>{state.selection ? 'Selected relationships' : 'Request connections'}</h3>
      {edges.length ? <ul>{edges.map(edge => <li key={edge.id}>
        {print ? <p><strong>{edge.label}</strong> · {getArchitectureNode(edge.from).shortLabel} → {getArchitectureNode(edge.to).shortLabel}</p> : <button type="button"
          aria-pressed={state.selection?.kind === 'edge' && state.selection.id === edge.id}
          onClick={() => onSelect({ kind: 'edge', id: edge.id })}>
          <span className={`architecture-line-key architecture-line-${edge.kind}`} aria-hidden="true" /><span><strong>{edge.label}</strong><small>{getArchitectureNode(edge.from).shortLabel} → {getArchitectureNode(edge.to).shortLabel} · {EDGE_KIND_LABELS[edge.kind]}</small></span>
        </button>}
      </li>)}</ul> : <p>Select a component to trace its relationships. The full connection index is below.</p>}
    </section>
  </div>;
}
