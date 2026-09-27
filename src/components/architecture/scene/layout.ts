import type { ArchitecturePillarId } from '@/data/architectureTypes';

export type Point3 = [number, number, number];
export interface PillarStage {
  id: ArchitecturePillarId;
  center: Point3;
  size: [number, number];
  layer: number;
  role: string;
  label: string;
  family: string;
}

// Districts follow the request path; cross-cutting operations sit behind it.
export const PILLAR_STAGES: readonly PillarStage[] = [
  { id: 'identity', center: [-3.6, 0.3, -2.1], size: [7, 5.2], layer: 2.8, role: 'Verify identity', label: 'Identities', family: 'Entra' },
  { id: 'endpoint', center: [-10, 0.12, 4.5], size: [5.2, 6.4], layer: 0.5, role: 'People & devices', label: 'Endpoints', family: 'Intune · Defender' },
  { id: 'network', center: [-3.4, 0.16, 5], size: [6, 5.4], layer: 1.5, role: 'Connect securely', label: 'Network', family: 'Entra Access' },
  { id: 'apps', center: [3.7, 0.22, 3.7], size: [6.4, 6.2], layer: 1, role: 'Work & agents', label: 'Apps & agents', family: 'Copilot · Agent 365' },
  { id: 'data', center: [7.4, 0.38, -3.7], size: [5.8, 6], layer: 3.1, role: 'Protect information', label: 'Data', family: 'Purview · work files' },
  { id: 'infrastructure', center: [0.5, 0.16, -8.1], size: [6.4, 4.4], layer: 0.3, role: 'Resources', label: 'Infrastructure', family: 'Private apps & compute' },
  { id: 'secops', center: [-8.3, 0.56, -7.5], size: [6.4, 5.4], layer: 5.2, role: 'Detect & respond', label: 'SecOps', family: 'Defender XDR' },
];

export const CAMERA_DIRECTION: Point3 = [0.24, 0.79, 0.56];
export const TABLE_BOUNDS = { min: [-14, -0.5, -12] as Point3, max: [12, 2.5, 9] as Point3 };

export interface LayoutNode {
  id: string;
  pillar: ArchitecturePillarId;
}

export interface NodePlacement {
  position: Point3;
  layer: number;
  index: number;
}

export function createNodeLayout(nodes: readonly LayoutNode[]): ReadonlyMap<string, NodePlacement> {
  const positions = new Map<string, NodePlacement>();
  for (const stage of PILLAR_STAGES) {
    const members = nodes.filter(node => node.pillar === stage.id).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const columns = members.length > 4 ? 3 : Math.min(2, members.length);
    const rows = Math.ceil(members.length / Math.max(columns, 1));
    members.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, members.length - row * columns);
      const spacingX = (stage.size[0] - 1.8) / Math.max(columns, 1);
      const spacingZ = (stage.size[1] - 1.7) / Math.max(rows, 1);
      positions.set(node.id, {
        position: [
          stage.center[0] + (index % columns - (rowCount - 1) / 2) * spacingX,
          stage.center[1] + 0.16,
          stage.center[2] + (row - (rows - 1) / 2) * spacingZ + 0.2,
        ],
        layer: stage.layer,
        index,
      });
    });
  }
  return positions;
}

export function placedPosition(placement: NodePlacement, exploded: number, lift = 0): Point3 {
  return [
    placement.position[0],
    placement.position[1] + placement.layer * exploded + lift,
    placement.position[2],
  ];
}

export function edgePoint(from: Point3, to: Point3, t: number, lane = 0): Point3 {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz) || 1;
  const bend = Math.sin(Math.PI * t);
  return [
    from[0] + dx * t - (dz / length) * bend * lane,
    from[1] + (to[1] - from[1]) * t + bend * Math.min(1.1, length * 0.075),
    from[2] + dz * t + (dx / length) * bend * lane,
  ];
}

export function edgeLane(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 5) - 2) * 0.19;
}

export function fitCameraDistance(
  size: Point3,
  aspect: number,
  verticalFov = 38,
  direction: Point3 = CAMERA_DIRECTION,
): number {
  const magnitude = Math.hypot(...direction);
  const forward = direction.map(value => value / magnitude);
  const rightLength = Math.hypot(forward[0], forward[2]);
  const right = [forward[2] / rightLength, 0, -forward[0] / rightLength];
  const up = [
    forward[1] * right[2],
    forward[2] * right[0] - forward[0] * right[2],
    -forward[1] * right[0],
  ];
  const tanV = Math.tan((verticalFov * Math.PI) / 360);
  const tanH = tanV * Math.max(0.2, aspect);
  let distance = 1;
  for (const x of [-size[0] / 2, size[0] / 2]) {
    for (const y of [-size[1] / 2, size[1] / 2]) {
      for (const z of [-size[2] / 2, size[2] / 2]) {
        const depth = x * forward[0] + y * forward[1] + z * forward[2];
        const horizontal = Math.abs(x * right[0] + z * right[2]);
        const vertical = Math.abs(x * up[0] + y * up[1] + z * up[2]);
        distance = Math.max(distance, depth + horizontal / tanH, depth + vertical / tanV);
      }
    }
  }
  return distance * 1.08;
}
