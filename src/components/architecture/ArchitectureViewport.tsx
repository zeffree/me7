import { Component, Suspense, lazy, useCallback, useState, type ErrorInfo, type ReactNode } from 'react';
import type { ArchitectureSceneProps } from '@/data/architectureTypes';
import { Button } from '@/components/ui/Primitives';
import { ArchitectureMap } from './ArchitectureMap';

const loadScene = () => import('./scene/ArchitectureScene');
export const MAX_GRAPHICS_RETRIES = 2;

interface SceneBoundaryProps { children: ReactNode; fallback: ReactNode; onError: (message: string) => void }

export class ArchitectureSceneBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError('The 3D renderer could not load or initialize. The interactive 2D view is available instead.');
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function ArchitectureGraphicsStatus({ failure, retries, onRetry }: { failure: string; retries: number; onRetry: () => void }) {
  return <div className="architecture-graphics-status">
    <div role="alert"><strong>3D graphics unavailable</strong><p>{failure}</p><p>Your mission, conditions and selection are preserved. Continue in the interactive 2D view.</p></div>
    {retries < MAX_GRAPHICS_RETRIES ? <Button variant="secondary" size="sm" onClick={onRetry}>Retry 3D ({MAX_GRAPHICS_RETRIES - retries} {MAX_GRAPHICS_RETRIES - retries === 1 ? 'attempt' : 'attempts'} left)</Button> :
      <p>Retry limit reached for this visit. Use 2D, or reload the page when your graphics connection is available.</p>}
  </div>;
}

type ViewportProps = Omit<ArchitectureSceneProps, 'onReady' | 'onContextLost'> & { onChoose3D: () => void };

export function ArchitectureViewport(props: ViewportProps) {
  const [Scene, setScene] = useState(() => lazy(loadScene));
  const [failure, setFailure] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onContextLost = useCallback((message: string) => {
    setFailure(message || 'The graphics context was interrupted.');
    setReady(false);
  }, []);
  const retry = () => {
    if (retries >= MAX_GRAPHICS_RETRIES) return;
    setRetries(value => value + 1);
    setFailure(null);
    setReady(false);
    setScene(() => lazy(loadScene));
    props.onChoose3D();
  };
  const map = <ArchitectureMap state={props.state} step={props.step} visitedEdgeIds={props.visitedEdgeIds} onSelect={props.onSelect} />;
  return <>
    {failure && <ArchitectureGraphicsStatus failure={failure} retries={retries} onRetry={retry} />}
    {props.state.view === '2d' ? <>
      <p className="architecture-view-note">Interactive 2D selected. The same mission and controls apply in both views.</p>{map}
    </> : failure ? map : <Suspense fallback={<><p className="architecture-view-note" role="status">Loading the 3D model. You can explore the interactive 2D view while it loads.</p>{map}</>}>
      <ArchitectureSceneBoundary key={retries} onError={onContextLost} fallback={map}>
        <div className="architecture-scene-host">
          <Scene {...props} onReady={onReady} onContextLost={onContextLost} />
          <p className="architecture-scene-hint">{ready ? 'Drag to orbit · use the camera presets or product index to focus' : 'Preparing the architecture model…'}</p>
        </div>
      </ArchitectureSceneBoundary>
    </Suspense>}
    <div className="architecture-print-map"><ArchitectureMap state={props.state} step={props.step} visitedEdgeIds={props.visitedEdgeIds} onSelect={props.onSelect} print /></div>
  </>;
}
