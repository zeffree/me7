import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ARCHITECTURE_EDGES } from '@/data/architecture';
import type { ArchitectureSceneProps } from '@/data/architectureTypes';
import { CAMERA_DIRECTION, fitCameraDistance, placedPosition, PILLAR_STAGES, TABLE_BOUNDS, type NodePlacement, type Point3 } from './layout';

type CameraProps = Pick<ArchitectureSceneProps, 'state' | 'step' | 'active' | 'reducedMotion' | 'onCameraInteraction'> & {
  layout: ReadonlyMap<string, NodePlacement>;
};

export function CameraRig({ state, step, active, reducedMotion, onCameraInteraction, layout }: CameraProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, invalidate } = useThree();
  const destination = useMemo(() => ({ position: new Vector3(), target: new Vector3() }), []);
  const offset = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(...CAMERA_DIRECTION).normalize(), []);
  const moving = useRef(false);
  const manual = useRef(false);
  const previous = useRef({ revision: -1, selection: '', pillar: 'all', width: 0, height: 0, focus: '' });
  const overviewDistance = fitCameraDistance([27, state.camera === 'exploded' ? 10 : 4, 23], size.width / size.height);

  useEffect(() => {
    if (!active || !controls.current) return;
    const selectionKey = state.selection ? `${state.selection.kind}:${state.selection.id}` : '';
    const last = previous.current;
    const presetChanged = last.revision !== state.cameraRevision;
    const selectionChanged = last.selection !== selectionKey;
    const pillarChanged = last.pillar !== state.pillar;
    const resized = last.width !== size.width || last.height !== size.height;
    const focusChanged = last.focus !== step.focusNodeId;
    previous.current = {
      revision: state.cameraRevision, selection: selectionKey, pillar: state.pillar,
      width: size.width, height: size.height, focus: step.focusNodeId,
    };
    if (presetChanged) manual.current = false;
    const following = state.followCamera && !manual.current;
    if (!presetChanged && !selectionChanged && !pillarChanged && !(resized && !manual.current) && !(focusChanged && following)) return;

    const exploded = state.camera === 'exploded' ? 1 : 0;
    let target: Point3 = [-1, exploded ? 2.4 : 0.6, -1.5];
    let frameSize: Point3 = [27, exploded ? 10 : 4, 23];
    const selectedNode = state.selection?.kind === 'node' ? state.selection.id : undefined;
    const focusId = selectedNode ?? (following ? step.focusNodeId : undefined);
    if (focusId && layout.has(focusId)) {
      target = placedPosition(layout.get(focusId)!, exploded, 0.8);
      frameSize = [12, 7, 10];
    } else if (state.selection?.kind === 'edge') {
      const edge = ARCHITECTURE_EDGES.find(item => item.id === state.selection?.id);
      const from = edge && layout.get(edge.from);
      const to = edge && layout.get(edge.to);
      if (from && to) {
        const a = placedPosition(from, exploded);
        const b = placedPosition(to, exploded);
        target = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.6, (a[2] + b[2]) / 2];
        frameSize = [Math.max(10, Math.abs(a[0] - b[0]) + 5), Math.max(6, Math.abs(a[1] - b[1]) + 4), Math.max(9, Math.abs(a[2] - b[2]) + 5)];
      }
    } else if ((!presetChanged || pillarChanged) && state.pillar !== 'all') {
      const stage = PILLAR_STAGES.find(item => item.id === state.pillar)!;
      target = [stage.center[0], stage.center[1] + stage.layer * exploded + 0.6, stage.center[2]];
      frameSize = [stage.size[0] + 6, 7, stage.size[1] + 5];
    }
    destination.target.set(...target);
    destination.position.copy(direction).multiplyScalar(fitCameraDistance(frameSize, size.width / size.height)).add(destination.target);
    if (reducedMotion || last.revision === -1) {
      camera.position.copy(destination.position);
      controls.current.target.copy(destination.target);
      controls.current.update();
      moving.current = false;
    } else {
      moving.current = true;
    }
    invalidate();
  }, [active, camera, destination, direction, invalidate, layout, reducedMotion, size.height, size.width,
    state.camera, state.cameraRevision, state.followCamera, state.pillar, state.selection, step.focusNodeId]);

  useFrame((_, delta) => {
    if (!active || !moving.current || !controls.current) return;
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    camera.position.lerp(destination.position, alpha);
    controls.current.target.lerp(destination.target, alpha);
    controls.current.update();
    if (camera.position.distanceToSquared(destination.position) < 0.0004
      && controls.current.target.distanceToSquared(destination.target) < 0.0004) {
      camera.position.copy(destination.position);
      controls.current.target.copy(destination.target);
      controls.current.update();
      moving.current = false;
    } else invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={active}
      enableDamping={false}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI * 0.405}
      minDistance={8}
      maxDistance={Math.max(65, overviewDistance * 1.55)}
      zoomSpeed={0.75}
      rotateSpeed={0.55}
      panSpeed={0.7}
      keyEvents={false}
      onStart={() => {
        manual.current = true;
        moving.current = false;
        onCameraInteraction();
      }}
      onChange={() => {
        const orbit = controls.current;
        if (!orbit) return;
        offset.copy(orbit.target);
        orbit.target.x = Math.max(TABLE_BOUNDS.min[0] + 4, Math.min(TABLE_BOUNDS.max[0] - 4, orbit.target.x));
        orbit.target.y = Math.max(0, Math.min(7, orbit.target.y));
        orbit.target.z = Math.max(TABLE_BOUNDS.min[2] + 4, Math.min(TABLE_BOUNDS.max[2] - 4, orbit.target.z));
        offset.sub(orbit.target);
        camera.position.sub(offset);
        invalidate();
      }}
    />
  );
}
