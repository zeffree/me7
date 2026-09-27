import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { WebGLRenderer } from 'three';
import { ARCHITECTURE_EDGES, ARCHITECTURE_NODES } from '@/data/architecture';
import type { ArchitectureSceneProps } from '@/data/architectureTypes';
import { ArchitectureObject, ArchitectureTable, useSceneResources } from './SceneObjects';
import { CameraRig } from './CameraRig';
import { SceneEdge } from './SceneEdges';
import { SceneLabels } from './SceneLabels';
import { createNodeLayout } from './layout';
import { observeScenePalette, type ScenePalette } from './palette';
import { bindContextLifecycle } from './webglLifetime';
import './scene.css';

const LAYOUT = createNodeLayout(ARCHITECTURE_NODES);
const BACKBONE = new Set([
  'employee-device', 'employee-entra', 'intune-access-policy', 'access-work-apps',
  'apps-sharepoint', 'private-infrastructure', 'context-copilot',
]);

const UNAVAILABLE = '3D could not start because WebGL 2 is unavailable. The interactive 2D architecture has the same scenarios and controls.';

function UnsupportedCanvas({ onFailure }: { onFailure: (message: string) => void }) {
  // Native canvas fallback children also mount in browsers that support canvas.
  useEffect(() => {
    if (typeof WebGL2RenderingContext === 'undefined') onFailure(UNAVAILABLE);
  }, [onFailure]);
  return <p role="status">{UNAVAILABLE}</p>;
}

function WebGLLifetime({ callbacks }: { callbacks: MutableRefObject<ArchitectureSceneProps> }) {
  const gl = useThree(state => state.gl);
  const ready = useRef(false);
  useEffect(() => {
    const cleanup = bindContextLifecycle(gl.domElement, message => callbacks.current.onContextLost(message));
    if (!ready.current) {
      ready.current = true;
      callbacks.current.onReady();
    }
    return cleanup;
  }, [callbacks, gl]);
  return null;
}

function SceneContent({ props, palette, callbacks }: {
  props: ArchitectureSceneProps;
  palette: ScenePalette;
  callbacks: MutableRefObject<ArchitectureSceneProps>;
}) {
  const { state, step, visitedEdgeIds, active, reducedMotion, onSelect, onCameraInteraction } = props;
  const resources = useSceneResources(palette);
  const explosion = useRef(state.camera === 'exploded' ? 1 : 0);
  const flow = useRef(0.32);
  const invalidate = useThree(root => root.invalidate);
  const currentNodes = useMemo(() => new Set(step.nodeIds), [step.nodeIds]);
  const currentEdges = useMemo(() => new Set(step.edgeIds), [step.edgeIds]);
  const visited = useMemo(() => new Set(visitedEdgeIds), [visitedEdgeIds]);
  const selectedNodeId = state.selection?.kind === 'node' ? state.selection.id : undefined;
  const selectedEdge = state.selection?.kind === 'edge' ? ARCHITECTURE_EDGES.find(edge => edge.id === state.selection?.id) : undefined;
  const neighborhood = useMemo(() => {
    const nodes = new Set<string>();
    if (selectedNodeId) {
      nodes.add(selectedNodeId);
      for (const edge of ARCHITECTURE_EDGES) {
        if (edge.from === selectedNodeId || edge.to === selectedNodeId) {
          nodes.add(edge.from);
          nodes.add(edge.to);
        }
      }
    }
    if (selectedEdge) {
      nodes.add(selectedEdge.from);
      nodes.add(selectedEdge.to);
    }
    return nodes;
  }, [selectedEdge, selectedNodeId]);
  const shownEdges = useMemo(() => ARCHITECTURE_EDGES.filter(edge => {
    if (currentEdges.has(edge.id) || visited.has(edge.id) || selectedEdge?.id === edge.id) return true;
    if (selectedNodeId) return edge.from === selectedNodeId || edge.to === selectedNodeId;
    if (state.pillar !== 'all') {
      return ARCHITECTURE_NODES.some(node => node.pillar === state.pillar && (node.id === edge.from || node.id === edge.to));
    }
    return BACKBONE.has(edge.id);
  }), [currentEdges, selectedEdge, selectedNodeId, state.pillar, visited]);
  const blocked = step.status === 'blocked' || step.status === 'challenged';

  useEffect(() => { invalidate(); }, [active, reducedMotion, state.camera, state.playing, invalidate]);
  useFrame((_, delta) => {
    if (!active) return;
    const target = state.camera === 'exploded' ? 1 : 0;
    if (Math.abs(explosion.current - target) > 0.0005) {
      explosion.current = reducedMotion ? target : explosion.current + (target - explosion.current) * (1 - Math.exp(-Math.min(delta, 0.05) * 7));
      invalidate();
    } else if (explosion.current !== target) {
      explosion.current = target;
      invalidate();
    }
    if (state.playing && !reducedMotion && currentEdges.size > 0) {
      flow.current = (flow.current + Math.min(delta, 0.05) * 0.24) % 1;
      invalidate();
    }
  }, -4);

  return (
    <>
      <color attach="background" args={[palette.ground]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[-8, 18, 12]} intensity={1.7} />
      <directionalLight position={[12, 8, -8]} intensity={0.5} />
      <WebGLLifetime callbacks={callbacks} />
      <CameraRig state={state} step={step} active={active} reducedMotion={reducedMotion} onCameraInteraction={onCameraInteraction} layout={LAYOUT} />
      <SceneLabels>
        <ArchitectureTable resources={resources} explosion={explosion} pillar={state.pillar} />
        {shownEdges.map(edge => {
          const from = LAYOUT.get(edge.from);
          const to = LAYOUT.get(edge.to);
          return from && to ? (
            <SceneEdge
              key={edge.id}
              edge={edge} from={from} to={to} state={state} explosion={explosion} flow={flow}
              selected={selectedEdge?.id === edge.id} current={currentEdges.has(edge.id)} visited={visited.has(edge.id)}
              blocked={blocked} palette={palette} resources={resources} onSelect={onSelect}
            />
          ) : null;
        })}
        {ARCHITECTURE_NODES.map(node => {
          const placement = LAYOUT.get(node.id);
          return placement ? (
            <ArchitectureObject
              key={node.id} node={node} placement={placement} explosion={explosion} resources={resources} state={state}
              selected={selectedNodeId === node.id} highlighted={currentNodes.has(node.id)}
              relevant={neighborhood.has(node.id) || state.pillar === node.pillar}
              blocked={blocked} onSelect={onSelect}
            />
          ) : null;
        })}
      </SceneLabels>
    </>
  );
}

export default function ArchitectureScene(props: ArchitectureSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  const [palette, setPalette] = useState<ScenePalette | null>(null);
  useLayoutEffect(() => { callbacks.current = props; });
  useLayoutEffect(() => {
    if (host.current) return observeScenePalette(host.current, setPalette);
  }, []);

  const onFailure = useCallback((message: string) => callbacks.current.onContextLost(message), []);
  const createRenderer = useCallback((defaults: { canvas: EventTarget }) => {
    try {
      if (!(defaults.canvas instanceof HTMLCanvasElement)) throw new Error('An HTML canvas is required.');
      const renderer = new WebGLRenderer({
        canvas: defaults.canvas, antialias: true, alpha: false,
        powerPreference: 'default', preserveDrawingBuffer: false,
      });
      let shaderFailed = false;
      renderer.debug.onShaderError = () => {
        if (shaderFailed) return;
        shaderFailed = true;
        onFailure('Your graphics driver could not render the architecture materials. The interactive 2D architecture is available instead; retry 3D after checking graphics support.');
      };
      return renderer;
    } catch (error) {
      onFailure(UNAVAILABLE);
      throw error;
    }
  }, [onFailure]);

  return (
    <div ref={host} className="architecture-scene" aria-label="Interactive three-dimensional Zero Trust architecture table">
      {palette && (
        <Canvas
          gl={createRenderer}
          frameloop="demand"
          dpr={[1, 1.6]}
          flat
          camera={{ fov: 38, near: 0.1, far: 500, position: [24, 35, 32] }}
          fallback={<UnsupportedCanvas onFailure={onFailure} />}
          onPointerMissed={event => { if (event.type === 'click') props.onSelect(null); }}
        >
          <SceneContent props={props} palette={palette} callbacks={callbacks} />
        </Canvas>
      )}
    </div>
  );
}
