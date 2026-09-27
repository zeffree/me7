import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry, CylinderGeometry, Group, MeshStandardMaterial, OctahedronGeometry,
  SphereGeometry, TorusGeometry,
} from 'three';
import { BUNDLE_LABELS, getNodeCoverage } from '@/data/architecture';
import type { ArchitectureNode, ArchitectureSceneProps } from '@/data/architectureTypes';
import type { ScenePalette } from './palette';
import { PILLAR_STAGES, type NodePlacement } from './layout';
import { SceneLabel } from './SceneLabels';

export function useSceneResources(palette: ScenePalette) {
  const geometry = useMemo(() => ({
    box: new BoxGeometry(1, 1, 1),
    cylinder: new CylinderGeometry(0.5, 0.5, 1, 20),
    tapered: new CylinderGeometry(0.34, 0.5, 1, 16),
    sphere: new SphereGeometry(0.5, 16, 12),
    agent: new OctahedronGeometry(0.5, 0),
    ring: new TorusGeometry(0.72, 0.024, 5, 36),
  }), []);
  const material = useMemo(() => {
    const surface = (color: string, roughness = 0.8) => new MeshStandardMaterial({ color, roughness, metalness: 0.06 });
    return {
      paper: surface(palette.paper), wash: surface(palette.wash), ground: surface(palette.ground),
      slate: surface(palette.ledger), ink: surface(palette.ink), muted: surface(palette.muted),
      rule: surface(palette.rule), action: surface(palette.action, 0.52), actionWash: surface(palette.actionWash),
      note: surface(palette.note), noteInk: surface(palette.noteInk), negative: surface(palette.negative),
      external: new MeshStandardMaterial({ color: palette.muted, roughness: 1, wireframe: true }),
    };
  }, [palette]);

  useEffect(() => () => { Object.values(geometry).forEach(item => item.dispose()); }, [geometry]);
  useEffect(() => () => { Object.values(material).forEach(item => item.dispose()); }, [material]);
  return { geometry, material };
}

export type SceneResources = ReturnType<typeof useSceneResources>;
const FAMILY_NODES = new Set(['entra-id', 'intune', 'copilot', 'agent365', 'purview', 'defender-xdr']);

function NodeSculpture({ node, resources }: { node: ArchitectureNode; resources: SceneResources }) {
  const { geometry: g, material: m } = resources;
  const body = node.bundle === 'external' ? m.external : node.bundle === 'copilot' || node.bundle === 'agent365' ? m.actionWash : m.paper;
  const trim = node.bundle === 'entra-suite' ? m.noteInk : node.bundle === 'e5' ? m.slate : m.action;

  if (node.kind === 'person') return (
    <group>
      <mesh geometry={g.sphere} material={body} position={[0, 1.15, 0]} scale={0.46} />
      <mesh geometry={g.tapered} material={m.slate} position={[0, 0.65, 0]} scale={[0.6, 0.62, 0.48]} />
      <mesh geometry={g.cylinder} material={m.slate} position={[-0.13, 0.22, 0]} scale={[0.16, 0.42, 0.16]} />
      <mesh geometry={g.cylinder} material={m.slate} position={[0.13, 0.22, 0]} scale={[0.16, 0.42, 0.16]} />
      <mesh geometry={g.box} material={m.action} position={[0.14, 0.78, 0.23]} scale={[0.13, 0.18, 0.03]} />
    </group>
  );
  if (node.kind === 'device') return (
    <group rotation={[0, -0.15, 0]}>
      <group position={[0, 0.68, -0.14]} rotation={[-0.12, 0, 0]}>
        <mesh geometry={g.box} material={body} scale={[1.12, 0.8, 0.1]} />
        <mesh geometry={g.box} material={m.slate} position={[0, 0.01, 0.06]} scale={[0.96, 0.63, 0.035]} />
        <mesh geometry={g.box} material={m.action} position={[-0.23, -0.17, 0.085]} scale={[0.37, 0.035, 0.01]} />
      </group>
      <mesh geometry={g.box} material={body} position={[0, 0.16, 0.13]} scale={[1.22, 0.1, 0.87]} />
      <mesh geometry={g.box} material={m.rule} position={[0, 0.218, 0.13]} scale={[0.83, 0.012, 0.38]} />
    </group>
  );
  if (node.kind === 'agent') return (
    <group>
      <mesh geometry={g.agent} material={body} position={[0, 0.94, 0]} scale={[1.02, 0.9, 0.9]} />
      <mesh geometry={g.cylinder} material={trim} position={[0, 0.4, 0]} scale={[0.48, 0.45, 0.48]} />
      <mesh geometry={g.sphere} material={m.action} position={[-0.12, 0.96, 0.3]} scale={0.12} />
      <mesh geometry={g.sphere} material={m.action} position={[0.12, 0.96, 0.3]} scale={0.12} />
      <mesh geometry={g.cylinder} material={m.muted} position={[0, 1.48, 0]} scale={[0.05, 0.26, 0.05]} />
      <mesh geometry={g.sphere} material={m.noteInk} position={[0, 1.63, 0]} scale={0.12} />
      <mesh geometry={g.ring} material={trim} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.6} />
    </group>
  );
  if (node.kind === 'resource' && node.pillar === 'data') return (
    <group>
      {[0.28, 0.63, 0.98].map((y, index) => (
        <group key={y} position={[0, y, 0]}>
          <mesh geometry={g.cylinder} material={body} scale={[0.97, 0.3, 0.97]} />
          <mesh geometry={g.cylinder} material={index === 2 ? trim : m.rule} position={[0, 0.16, 0]} scale={[0.9, 0.022, 0.9]} />
        </group>
      ))}
    </group>
  );
  if (node.kind === 'resource') return (
    <group>
      <mesh geometry={g.box} material={body} position={[-0.2, 0.45, 0.15]} scale={[0.8, 0.7, 0.8]} />
      <mesh geometry={g.box} material={body} position={[0.27, 0.78, -0.2]} scale={[0.65, 1.2, 0.65]} />
      <mesh geometry={g.box} material={trim} position={[0.27, 1.395, -0.2]} scale={[0.65, 0.04, 0.65]} />
    </group>
  );
  return (
    <group>
      {[0.28, 0.62, 0.96].map((y, index) => (
        <group key={y} position={[0, y, 0]}>
          <mesh geometry={g.box} material={body} scale={[0.96, 0.29, 0.72]} />
          <mesh geometry={g.box} material={m.rule} position={[0.09, 0, 0.37]} scale={[0.5, 0.04, 0.015]} />
          <mesh geometry={g.sphere} material={index === 2 ? trim : m.muted} position={[-0.31, 0, 0.375]} scale={0.065} />
        </group>
      ))}
      <mesh geometry={g.box} material={trim} position={[0, 1.125, 0]} scale={[0.96, 0.028, 0.72]} />
    </group>
  );
}

export function ArchitectureObject({
  node, placement, explosion, resources, state, selected, highlighted, relevant, blocked, onSelect,
}: {
  node: ArchitectureNode;
  placement: NodePlacement;
  explosion: MutableRefObject<number>;
  resources: SceneResources;
  state: ArchitectureSceneProps['state'];
  selected: boolean;
  highlighted: boolean;
  relevant: boolean;
  blocked: boolean;
  onSelect: ArchitectureSceneProps['onSelect'];
}) {
  const group = useRef<Group>(null);
  const coverage = getNodeCoverage(node, state.baseline);
  const added = coverage.summary === 'unlocked' || coverage.summary === 'upgrade' || coverage.summary === 'mixed';
  const lift = added ? 0.19 : 0;
  const { geometry: g, material: m } = resources;
  const marker = blocked && highlighted ? m.negative : selected || highlighted ? m.action : added ? m.noteInk : m.rule;
  useFrame(() => {
    if (group.current) group.current.position.y = placement.position[1] + placement.layer * explosion.current + lift;
  }, -2);
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect({ kind: 'node', id: node.id });
  };

  return (
    <group ref={group} position={placement.position} dispose={null} onClick={select}>
      {added && <mesh geometry={g.cylinder} material={m.note} position={[0, -0.08, 0]} scale={[1.48, 0.16, 1.48]} />}
      <mesh geometry={g.cylinder} material={node.bundle === 'external' ? m.ground : m.wash} scale={[1.35, 0.08, 1.35]} />
      <mesh geometry={g.ring} material={marker} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={selected ? 1.15 : 1} />
      <group scale={1.12}><NodeSculpture node={node} resources={resources} /></group>
      <SceneLabel
        position={[0, node.kind === 'agent' ? 2.3 : 1.9, 0]}
        priority={selected ? 30 : FAMILY_NODES.has(node.id) ? 16 : highlighted ? 12 : relevant ? 10 : 1}
        required={selected}
        detail={selected ? 'selected' : 'zoom'}
        className={`architecture-scene-node-label${selected ? ' is-selected' : ''}${highlighted ? ' is-active' : ''}${node.bundle === 'external' ? ' is-external' : ''}`}
      >
        <button
          type="button"
          onClick={event => { event.stopPropagation(); onSelect({ kind: 'node', id: node.id }); }}
          aria-label={`Inspect ${node.label}`}
          aria-pressed={selected}
          title={`${node.label} · ${BUNDLE_LABELS[node.bundle]} · ${coverage.label}`}
        >
          <span>{node.shortLabel}</span>
          <small>{node.bundle === 'external' ? 'Separate from E7' : node.bundle === 'context' ? 'Architecture context' : BUNDLE_LABELS[node.bundle]}</small>
          {node.bundle !== 'context' && node.bundle !== 'external' && <em>{coverage.label}</em>}
        </button>
      </SceneLabel>
    </group>
  );
}

export function ArchitectureTable({ resources, explosion, pillar }: {
  resources: SceneResources;
  explosion: MutableRefObject<number>;
  pillar: ArchitectureSceneProps['state']['pillar'];
}) {
  const { geometry: g, material: m } = resources;
  return (
    <group dispose={null}>
      <mesh geometry={g.box} material={m.slate} position={[-1, -0.42, -1.5]} scale={[27.2, 0.48, 22.3]} />
      <mesh geometry={g.box} material={m.paper} position={[-1, -0.12, -1.5]} scale={[27.2, 0.12, 22.3]} />
      <mesh geometry={g.box} material={m.rule} position={[-1, -0.043, 8.55]} scale={[25.1, 0.02, 0.025]} />
      {PILLAR_STAGES.map(stage => (
        <PillarDistrict key={stage.id} stage={stage} explosion={explosion} resources={resources} focused={pillar === stage.id} />
      ))}
    </group>
  );
}

function PillarDistrict({ stage, explosion, resources, focused }: {
  stage: typeof PILLAR_STAGES[number];
  explosion: MutableRefObject<number>;
  resources: SceneResources;
  focused: boolean;
}) {
  const group = useRef<Group>(null);
  const stem = useRef<Group>(null);
  const { geometry: g, material: m } = resources;
  useFrame(() => {
    const height = stage.center[1] + stage.layer * explosion.current;
    if (group.current) group.current.position.y = height;
    if (stem.current) {
      stem.current.visible = explosion.current > 0.01;
      stem.current.scale.y = Math.max(0.01, height);
    }
  }, -2);
  return (
    <>
      <group ref={stem} position={[stage.center[0], 0, stage.center[2]]}>
        <mesh geometry={g.cylinder} material={m.rule} position={[0, 0.5, 0]} scale={[0.055, 1, 0.055]} />
      </group>
      <group ref={group} position={stage.center}>
        <mesh geometry={g.box} material={focused ? m.actionWash : m.wash} scale={[stage.size[0], 0.2, stage.size[1]]} />
        <mesh geometry={g.box} material={focused ? m.action : m.rule} position={[0, 0.11, -stage.size[1] / 2 + 0.12]} scale={[stage.size[0] - 0.3, 0.018, 0.035]} />
        <SceneLabel position={[0, 0.25, -stage.size[1] / 2 + 0.36]} priority={20} required className="architecture-scene-pillar-label">
          <strong title={stage.role}>{stage.label}</strong>
          <span>{stage.family}</span>
        </SceneLabel>
      </group>
    </>
  );
}
