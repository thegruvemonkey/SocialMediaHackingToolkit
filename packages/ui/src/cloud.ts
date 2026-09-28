import type { Rect } from '@planmark/core';

/**
 * Build an SVG path for a revision cloud around a rectangle. Each edge is
 * split into scallops; a quadratic control point pushed outward from the edge
 * midpoint makes each bump bulge away from the rectangle center.
 */
export function revisionCloudPath(rect: Rect, radius: number): string {
  const r = Math.max(2, radius);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];

  const commands: string[] = [`M ${round(corners[0].x)} ${round(corners[0].y)}`];

  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const bumps = Math.max(1, Math.round(len / (r * 2)));
    for (let s = 1; s <= bumps; s++) {
      const t0 = (s - 1) / bumps;
      const t1 = s / bumps;
      const p0 = { x: lerp(a.x, b.x, t0), y: lerp(a.y, b.y, t0) };
      const p1 = { x: lerp(a.x, b.x, t1), y: lerp(a.y, b.y, t1) };
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      // Outward normal: perpendicular to the edge, pointing away from center.
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const nlen = Math.hypot(dx, dy) || 1;
      let nx = -dy / nlen;
      let ny = dx / nlen;
      if ((mid.x - cx) * nx + (mid.y - cy) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const ctrl = { x: mid.x + nx * r, y: mid.y + ny * r };
      commands.push(`Q ${round(ctrl.x)} ${round(ctrl.y)} ${round(p1.x)} ${round(p1.y)}`);
    }
  }
  commands.push('Z');
  return commands.join(' ');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
