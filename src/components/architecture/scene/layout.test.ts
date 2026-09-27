import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_DIRECTION, createNodeLayout, edgeLane, edgePoint, fitCameraDistance, placedPosition, PILLAR_STAGES, TABLE_BOUNDS } from './layout';

const nodes = PILLAR_STAGES.flatMap(stage =>
  Array.from({ length: 6 }, (_, index) => ({ id: `${stage.id}-${index}`, pillar: stage.id })),
);

describe('architecture table layout', () => {
  it('places every node uniquely and deterministically regardless of input ordering', () => {
    const layout = createNodeLayout(nodes);
    expect(layout.size).toBe(nodes.length);
    expect([...layout]).toEqual([...createNodeLayout([...nodes].reverse())]);
    expect(new Set([...layout.values()].map(item => item.position.join(','))).size).toBe(nodes.length);
  });

  it('keeps geometry inside its labeled district and the architecture table', () => {
    const layout = createNodeLayout(nodes);
    for (const node of nodes) {
      const stage = PILLAR_STAGES.find(item => item.id === node.pillar)!;
      const { position } = layout.get(node.id)!;
      expect(Math.abs(position[0] - stage.center[0])).toBeLessThan(stage.size[0] / 2 - 0.5);
      expect(Math.abs(position[2] - stage.center[2])).toBeLessThan(stage.size[1] / 2 - 0.5);
      expect(position[0]).toBeGreaterThan(TABLE_BOUNDS.min[0]);
      expect(position[0]).toBeLessThan(TABLE_BOUNDS.max[0]);
      expect(position[2]).toBeGreaterThan(TABLE_BOUNDS.min[2]);
      expect(position[2]).toBeLessThan(TABLE_BOUNDS.max[2]);
    }
  });

  it('explodes only the vertical control layers, reversibly, without mutating placements', () => {
    for (const item of createNodeLayout(nodes).values()) {
      const initial = [...item.position];
      const exploded = placedPosition(item, 1, 0.2);
      expect(exploded[0]).toBe(initial[0]);
      expect(exploded[2]).toBe(initial[2]);
      expect(exploded[1]).toBeCloseTo(initial[1] + item.layer + 0.2);
      expect(placedPosition(item, 0)).toEqual(initial);
      expect(item.position).toEqual(initial);
    }
  });

  it('keeps directed edge endpoints exact for every deterministic routing lane', () => {
    const from: [number, number, number] = [-6, 1, -2];
    const to: [number, number, number] = [4, 6, 5];
    for (const id of ['identity-access', 'signal', 'governance']) {
      const lane = edgeLane(id);
      expect(edgePoint(from, to, 0, lane)).toEqual(from);
      edgePoint(from, to, 1, lane).forEach((value, index) => expect(value).toBeCloseTo(to[index]));
      expect(edgeLane(id)).toBe(lane);
      expect(edgePoint(from, to, 0.5, lane).every(Number.isFinite)).toBe(true);
    }
  });

  it('fits narrow viewports further away while retaining bounded finite framing', () => {
    const size: [number, number, number] = [26, 9, 21];
    expect(fitCameraDistance(size, 0.5)).toBeGreaterThan(fitCameraDistance(size, 1.6));
    for (const aspect of [0, 0.3, 0.6, 1, 2, 4]) {
      const distance = fitCameraDistance(size, aspect);
      expect(Number.isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThan(20);
      expect(distance).toBeLessThan(300);
    }
  });

  it('keeps every bounding-box corner inside the camera at phone and desktop aspect ratios', () => {
    const dimensions: [number, number, number] = [27, 10, 23];
    for (const aspect of [0.35, 0.6, 1, 1.6, 2.5]) {
      const camera = new PerspectiveCamera(38, aspect, 0.1, 500);
      camera.position.set(...CAMERA_DIRECTION).normalize().multiplyScalar(fitCameraDistance(dimensions, aspect));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      for (const x of [-dimensions[0] / 2, dimensions[0] / 2]) {
        for (const y of [-dimensions[1] / 2, dimensions[1] / 2]) {
          for (const z of [-dimensions[2] / 2, dimensions[2] / 2]) {
            const projected = new Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(1);
            expect(Math.abs(projected.y)).toBeLessThan(1);
            expect(projected.z).toBeGreaterThan(-1);
            expect(projected.z).toBeLessThan(1);
          }
        }
      }
    }
  });
});
