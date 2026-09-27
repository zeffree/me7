import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, TubeGeometry, Vector3 } from 'three';
import type { Line2, LineSegments2 } from 'three-stdlib';
import { EDGE_KIND_LABELS, getArchitectureNode, getNodeCoverage } from '@/data/architecture';
import type { ArchitectureEdge, ArchitectureSceneProps } from '@/data/architectureTypes';
import { edgeLane, edgePoint, placedPosition, type NodePlacement, type Point3 } from './layout';
import { SceneLabel } from './SceneLabels';
import type { ScenePalette } from './palette';
import type { SceneResources } from './SceneObjects';

const SAMPLES = 28;
const Y_AXIS = new Vector3(0, 1, 0);

export function SceneEdge({
  edge, from, to, state, explosion, flow, selected, current, visited, blocked, palette, resources, onSelect,
}: {
  edge: ArchitectureEdge;
  from: NodePlacement;
  to: NodePlacement;
  state: ArchitectureSceneProps['state'];
  explosion: MutableRefObject<number>;
  flow: MutableRefObject<number>;
  selected: boolean;
  current: boolean;
  visited: boolean;
  blocked: boolean;
  palette: ScenePalette;
  resources: SceneResources;
  onSelect: ArchitectureSceneProps['onSelect'];
}) {
  const line = useRef<Line2 | LineSegments2>(null);
  const arrow = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
  const label = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const previousExplosion = useRef(-1);
  const scratch = useMemo(() => ({ a: new Vector3(), b: new Vector3() }), []);
  const fromNode = getArchitectureNode(edge.from);
  const toNode = getArchitectureNode(edge.to);
  const fromCoverage = fromNode ? getNodeCoverage(fromNode, state.baseline).summary : 'context';
  const toCoverage = toNode ? getNodeCoverage(toNode, state.baseline).summary : 'context';
  const isAdded = (coverage: string) => coverage === 'unlocked' || coverage === 'upgrade' || coverage === 'mixed';
  const lane = edgeLane(edge.id);
  const points = useMemo(() => {
    const start = placedPosition(from, 0, isAdded(fromCoverage) ? 0.32 : 0.13);
    const end = placedPosition(to, 0, isAdded(toCoverage) ? 0.32 : 0.13);
    const base = Array.from({ length: SAMPLES + 1 }, (_, i) => edgePoint(start, end, i / SAMPLES, lane));
    const raised = base.map((point, i): Point3 => [
      point[0], point[1] + from.layer + (to.layer - from.layer) * (i / SAMPLES), point[2],
    ]);
    const hit = new TubeGeometry(new CatmullRomCurve3(base.map(point => new Vector3(...point))), SAMPLES, 0.17, 5, false);
    const raisedHit = new TubeGeometry(new CatmullRomCurve3(raised.map(point => new Vector3(...point))), SAMPLES, 0.17, 5, false);
    const baseVertices = new Float32Array(hit.attributes.position.array);
    const raisedVertices = new Float32Array(raisedHit.attributes.position.array);
    raisedHit.dispose();
    return { base, raised, hit, baseVertices, raisedVertices, lineVertices: new Float32Array((SAMPLES + 1) * 3) };
  }, [from, fromCoverage, lane, to, toCoverage]);
  const hitMaterial = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), []);
  const color = blocked && current ? palette.negative : current || selected || hovered ? palette.action
    : edge.kind === 'response' ? palette.positive : visited ? palette.muted : palette.rule;
  const dashed = edge.kind === 'signal' || edge.kind === 'policy' || edge.kind === 'governance' || edge.kind === 'response';

  useEffect(() => {
    previousExplosion.current = -1;
    return () => { points.hit.dispose(); };
  }, [points]);
  useEffect(() => () => { hitMaterial.dispose(); }, [hitMaterial]);

  useFrame(() => {
    const expanded = explosion.current;
    if (expanded !== previousExplosion.current) {
      previousExplosion.current = expanded;
      points.base.forEach((point, index) => {
        points.lineVertices[index * 3] = point[0];
        points.lineVertices[index * 3 + 1] = point[1] + (points.raised[index][1] - point[1]) * expanded;
        points.lineVertices[index * 3 + 2] = point[2];
      });
      if (line.current) {
        line.current.geometry.setPositions(points.lineVertices);
        line.current.computeLineDistances();
      }
      const vertices = points.hit.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        vertices.setXYZ(i,
          points.baseVertices[i * 3] + (points.raisedVertices[i * 3] - points.baseVertices[i * 3]) * expanded,
          points.baseVertices[i * 3 + 1] + (points.raisedVertices[i * 3 + 1] - points.baseVertices[i * 3 + 1]) * expanded,
          points.baseVertices[i * 3 + 2] + (points.raisedVertices[i * 3 + 2] - points.baseVertices[i * 3 + 2]) * expanded,
        );
      }
      vertices.needsUpdate = true;
      points.hit.computeBoundingSphere();
    }
    const at = (t: number, target: Vector3) => {
      const index = Math.min(SAMPLES - 1, Math.floor(t * SAMPLES));
      const fraction = t * SAMPLES - index;
      const a = points.base[index];
      const b = points.base[index + 1];
      target.set(
        a[0] + (b[0] - a[0]) * fraction,
        a[1] + (b[1] - a[1]) * fraction + (from.layer + (to.layer - from.layer) * t) * expanded,
        a[2] + (b[2] - a[2]) * fraction,
      );
    };
    if (arrow.current) {
      at(0.78, arrow.current.position);
      at(0.8, scratch.a);
      at(0.76, scratch.b);
      scratch.a.sub(scratch.b).normalize();
      arrow.current.quaternion.setFromUnitVectors(Y_AXIS, scratch.a);
    }
    if (marker.current) {
      const progress = 0.08 + ((flow.current + (Math.abs(lane) * 0.4)) % 1) * (blocked ? 0.47 : 0.83);
      at(progress, marker.current.position);
    }
    if (label.current) {
      at(0.5, label.current.position);
      label.current.position.y += 0.5;
    }
  }, -1);

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect({ kind: 'edge', id: edge.id });
  };
  return (
    <group>
      <Line
        ref={line}
        points={points.base}
        color={color}
        lineWidth={selected || hovered ? 3.2 : current ? 2.4 : 1.3}
        dashed={dashed}
        dashSize={edge.kind === 'signal' ? 0.18 : edge.kind === 'response' ? 0.65 : 0.38}
        gapSize={edge.kind === 'signal' ? 0.3 : 0.2}
        transparent
        opacity={selected || current || hovered ? 1 : visited ? 0.72 : 0.55}
      />
      <mesh
        geometry={points.hit}
        material={hitMaterial}
        dispose={null}
        onClick={select}
        onPointerOver={event => { event.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      />
      <mesh ref={arrow} material={current && blocked ? resources.material.negative : current || selected ? resources.material.action : resources.material.muted}>
        <coneGeometry args={[current || selected ? 0.13 : 0.1, 0.34, 6]} />
      </mesh>
      {current && <mesh ref={marker} geometry={resources.geometry.sphere} material={blocked ? resources.material.negative : resources.material.action} scale={0.2} dispose={null} />}
      {(selected || hovered) && (
        <group ref={label}>
          <SceneLabel position={[0, 0, 0]} priority={selected ? 31 : 15} required={selected} detail={selected ? 'selected' : 'none'} className="architecture-scene-edge-label">
            <button type="button" onClick={() => onSelect({ kind: 'edge', id: edge.id })} aria-label={`Inspect ${edge.label}`}>
              <strong>{EDGE_KIND_LABELS[edge.kind]}</strong>
              <span>{fromNode?.shortLabel ?? edge.from} → {toNode?.shortLabel ?? edge.to}</span>
            </button>
          </SceneLabel>
        </group>
      )}
    </group>
  );
}
