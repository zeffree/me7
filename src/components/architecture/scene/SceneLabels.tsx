import { createContext, useCallback, useContext, useId, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import type { Point3 } from './layout';
import { layoutSceneLabels, showLabelDetails, type ProjectedLabel } from './labelLayout';

interface LabelEntry {
  id: string;
  anchor: Group;
  element: HTMLDivElement;
  priority: number;
  required: boolean;
  detail: 'selected' | 'zoom' | 'none';
}

const LabelsContext = createContext<Set<LabelEntry> | null>(null);

export function SceneLabels({ children }: { children: ReactNode }) {
  const labels = useMemo(() => new Set<LabelEntry>(), []);
  const point = useMemo(() => new Vector3(), []);
  const lastLayout = useRef('');

  useFrame(({ camera, size }) => {
    const projected: ProjectedLabel[] = [];
    for (const entry of labels) {
      const { anchor, element, priority, detail } = entry;
      anchor.getWorldPosition(point);
      const distance = camera.position.distanceTo(point);
      point.project(camera);
      element.dataset.detailed = String(detail !== 'none' && showLabelDetails(detail === 'selected', distance));
      if (point.z <= -1 || point.z >= 1) {
        element.style.visibility = 'hidden';
        continue;
      }
      const width = element.offsetWidth || 108;
      const height = element.offsetHeight || 30;
      const x = (point.x * 0.5 + 0.5) * size.width - width / 2;
      const y = (-point.y * 0.5 + 0.5) * size.height - height / 2;
      const inView = x + width > 0 && x < size.width && y + height > 0 && y < size.height;
      projected.push({ id: entry.id, x, y, width, height, priority, required: entry.required && (inView || detail === 'selected') });
    }
    const signature = `${size.width}:${size.height}:${projected.map(label =>
      `${label.id},${label.x.toFixed(1)},${label.y.toFixed(1)},${label.width},${label.height},${label.priority},${label.required}`,
    ).join(';')}`;
    if (signature === lastLayout.current) return;
    lastLayout.current = signature;
    const positions = layoutSceneLabels(projected, size.width, size.height);
    for (const entry of labels) {
      const placement = positions.get(entry.id);
      const origin = projected.find(item => item.id === entry.id);
      if (!placement || !origin) continue;
      const dx = placement.x - origin.x;
      const dy = placement.y - origin.y;
      entry.element.style.visibility = placement.visible ? 'visible' : 'hidden';
      entry.element.style.transform = `translate(${dx}px, ${dy}px)`;
      entry.element.style.setProperty('--leader-length', `${Math.hypot(dx, dy)}px`);
      entry.element.style.setProperty('--leader-angle', `${Math.atan2(-dy, -dx)}rad`);
      entry.element.dataset.shifted = String(Math.hypot(dx, dy) > 16);
    }
  });

  return <LabelsContext.Provider value={labels}>{children}</LabelsContext.Provider>;
}

export function SceneLabel({
  children, position, priority = 1, className, required = false, detail = 'none',
}: {
  children: ReactNode;
  position: Point3;
  priority?: number;
  className: string;
  required?: boolean;
  detail?: LabelEntry['detail'];
}) {
  const id = useId();
  const registry = useContext(LabelsContext);
  const anchor = useRef<Group>(null);
  const entryRef = useRef<LabelEntry | null>(null);
  const invalidate = useThree(state => state.invalidate);

  const register = useCallback((element: HTMLDivElement | null) => {
    if (entryRef.current) registry?.delete(entryRef.current);
    entryRef.current = null;
    if (element && anchor.current && registry) {
      const entry = { id, anchor: anchor.current, element, priority, required, detail };
      registry.add(entry);
      entryRef.current = entry;
      invalidate();
    }
  }, [detail, id, invalidate, priority, registry, required]);

  return (
    <group ref={anchor} position={position}>
      <Html center zIndexRange={detail === 'selected' ? [40, 35] : [30, 10]} className="architecture-scene-label-anchor">
        <div ref={register} className={className}><i className="architecture-scene-label-leader" aria-hidden="true" />{children}</div>
      </Html>
    </group>
  );
}
