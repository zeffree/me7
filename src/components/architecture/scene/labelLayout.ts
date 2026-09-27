export interface ProjectedLabel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  required: boolean;
}

export interface LabelPlacement { x: number; y: number; visible: boolean }

export function showLabelDetails(selected: boolean, distance: number): boolean {
  return selected || distance < 24;
}

export function layoutSceneLabels(labels: readonly ProjectedLabel[], width: number, height: number): Map<string, LabelPlacement> {
  const result = placeLabels(labels, width, height, false);
  return labels.some(label => label.required && !result.get(label.id)?.visible)
    ? placeLabels(labels, width, height, true)
    : result;
}

function placeLabels(labels: readonly ProjectedLabel[], width: number, height: number, compact: boolean): Map<string, LabelPlacement> {
  const result = new Map<string, LabelPlacement>();
  const occupied: ProjectedLabel[] = [];
  const margin = 7;
  const bottom = height - 42;
  const orientation = labels.filter(label => label.required && label.priority < 30);
  const columnWidth = Math.max(1, ...orientation.map(label => label.width));
  const rowHeight = Math.max(1, ...orientation.map(label => label.height)) + 6;
  const columns = Math.max(1, Math.floor((width - 2 * margin + 6) / (columnWidth + 6)));
  for (const label of [...labels].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
    const maxX = width - margin - label.width;
    const maxY = bottom - label.height;
    let best: LabelPlacement = { x: label.x, y: label.y, visible: false };
    let bestCost = Infinity;
    const consider = (x: number, y: number) => {
      if (x < margin || x > maxX || y < margin || y > maxY) return;
      const cost = (x - label.x) ** 2 + (y - label.y) ** 2;
      if (cost >= bestCost || occupied.some(rect =>
        x < rect.x + rect.width + 5 && x + label.width + 5 > rect.x
        && y < rect.y + rect.height + 5 && y + label.height + 5 > rect.y,
      )) return;
      best = { x, y, visible: true };
      bestCost = cost;
    };
    if (compact && label.required && label.priority < 30) {
      // A shared annotation rhythm avoids fragmented gaps on narrow viewports.
      for (let y = margin; y <= maxY; y += rowHeight) {
        for (let column = 0; column < columns; column++) {
          const x = columns === 1 ? (width - label.width) / 2 : margin + column * (width - 2 * margin - columnWidth) / (columns - 1);
          consider(x, y);
        }
      }
    } else consider(label.x, label.y);
    if (label.required && !best.visible && !(compact && label.priority < 30)) {
      const clampedX = Math.max(margin, Math.min(maxX, label.x));
      const clampedY = Math.max(margin, Math.min(maxY, label.y));
      consider(clampedX, clampedY);
      for (let y = margin; y <= maxY; y += 10) {
        consider(clampedX, y);
        for (let x = margin; x <= maxX; x += 10) consider(x, y);
      }
    } else if (!best.visible && label.priority >= 10) {
      for (const dx of [0, -18, 18]) {
        for (const dy of [-22, 22]) consider(label.x + dx, label.y + dy);
      }
    }
    result.set(label.id, best);
    if (best.visible) occupied.push({ ...label, x: best.x, y: best.y });
  }
  return result;
}
