import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_DIRECTION, fitCameraDistance, PILLAR_STAGES } from './layout';
import { layoutSceneLabels, showLabelDetails, type ProjectedLabel } from './labelLayout';

function overviewLabels(width: number, height: number): ProjectedLabel[] {
  const camera = new PerspectiveCamera(38, width / height, 0.1, 500);
  const target = new Vector3(-1, 0.6, -1.5);
  camera.position.set(...CAMERA_DIRECTION).normalize().multiplyScalar(fitCameraDistance([27, 4, 23], width / height)).add(target);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return PILLAR_STAGES.map(stage => {
    const point = new Vector3(stage.center[0], stage.center[1] + 0.25, stage.center[2] - stage.size[1] / 2 + 0.36).project(camera);
    return {
      id: stage.id, x: (point.x * 0.5 + 0.5) * width - 69, y: (-point.y * 0.5 + 0.5) * height - 21,
      width: 138, height: 42, priority: 20, required: true,
    };
  });
}

describe('scene overview label hierarchy', () => {
  it.each([[350, 400], [390, 440], [800, 480], [1000, 540]])(
    'keeps seven pillars and selected detail readable without overlap at %i × %i',
    (width, height) => {
      const labels = [
        ...overviewLabels(width, height),
        { id: 'selected', x: width / 2 - 86, y: height / 2 - 45, width: 172, height: 90, priority: 30, required: true },
      ];
      const placed = layoutSceneLabels(labels, width, height);
      for (const label of labels) {
        const result = placed.get(label.id)!;
        expect(result.visible, label.id).toBe(true);
        expect(result.x).toBeGreaterThanOrEqual(7);
        expect(result.x + label.width).toBeLessThanOrEqual(width - 7);
        expect(result.y).toBeGreaterThanOrEqual(7);
        expect(result.y + label.height).toBeLessThanOrEqual(height - 42);
      }
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = placed.get(labels[i].id)!;
          const b = placed.get(labels[j].id)!;
          const overlaps = a.x < b.x + labels[j].width && a.x + labels[i].width > b.x
            && a.y < b.y + labels[j].height && a.y + labels[i].height > b.y;
          expect(overlaps, `${labels[i].id} / ${labels[j].id}`).toBe(false);
        }
      }
    },
  );

  it('retains orientation and family names before lower-priority request labels', () => {
    const pillars = overviewLabels(350, 400);
    const request = { id: 'device', x: pillars[0].x, y: pillars[0].y, width: 72, height: 30, priority: 12, required: false };
    const result = layoutSceneLabels([...pillars, request], 350, 400);
    expect(pillars.every(label => result.get(label.id)?.visible)).toBe(true);
    const families = PILLAR_STAGES.map(stage => stage.family).join(' ');
    for (const family of ['Entra', 'Intune', 'Copilot', 'Agent 365', 'Purview', 'Defender']) expect(families).toContain(family);
  });

  it('expands metadata only for deliberate selection or close zoom, never merely mission highlighting', () => {
    expect(showLabelDetails(false, 55)).toBe(false);
    expect(showLabelDetails(false, 24)).toBe(false);
    expect(showLabelDetails(false, 18)).toBe(true);
    expect(showLabelDetails(true, 80)).toBe(true);
  });
});
