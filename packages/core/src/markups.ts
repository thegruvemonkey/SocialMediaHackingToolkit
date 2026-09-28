import { boundingBox, distanceToSegment, pointInRect, type Point, type Rect } from './geometry';
import { createId } from './ids';
import type { MarkupStatus } from './status';
import type {
  ArrowMarkup,
  CalloutMarkup,
  CloudMarkup,
  EllipseMarkup,
  HighlightMarkup,
  LineMarkup,
  Markup,
  MarkupBase,
  MarkupType,
  PenMarkup,
  RectMarkup,
  TextMarkup,
} from './types';

/** A palette of markup colors that read well on both light and dark plans. */
export const DEFAULT_COLORS = [
  '#e53935', // red
  '#fb8c00', // orange
  '#fdd835', // yellow
  '#43a047', // green
  '#1e88e5', // blue
  '#8e24aa', // purple
  '#00acc1', // teal
  '#000000', // black
] as const;

export interface BaseInput {
  page: number;
  author: string;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  status?: MarkupStatus;
  subject?: string;
  /** Provide to reconstruct an existing markup (e.g. when loading a file). */
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

function base(input: BaseInput, type: MarkupType): MarkupBase {
  const now = new Date().toISOString();
  return {
    id: input.id ?? createId(),
    type,
    page: input.page,
    author: input.author,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    status: input.status ?? 'open',
    subject: input.subject,
    color: input.color ?? DEFAULT_COLORS[0],
    opacity: input.opacity ?? 1,
    strokeWidth: input.strokeWidth ?? 2,
  };
}

export function newPen(input: BaseInput & { points: Point[] }): PenMarkup {
  return { ...base(input, 'pen'), points: input.points } as PenMarkup;
}

export function newHighlight(input: BaseInput & { points: Point[] }): HighlightMarkup {
  return {
    ...base({ opacity: 0.4, strokeWidth: 10, ...input }, 'highlight'),
    points: input.points,
  } as HighlightMarkup;
}

export function newLine(input: BaseInput & { start: Point; end: Point }): LineMarkup {
  return { ...base(input, 'line'), start: input.start, end: input.end } as LineMarkup;
}

export function newArrow(input: BaseInput & { start: Point; end: Point }): ArrowMarkup {
  return { ...base(input, 'arrow'), start: input.start, end: input.end } as ArrowMarkup;
}

export function newRect(input: BaseInput & { rect: Rect; fill?: string }): RectMarkup {
  return { ...base(input, 'rect'), rect: input.rect, fill: input.fill } as RectMarkup;
}

export function newEllipse(input: BaseInput & { rect: Rect; fill?: string }): EllipseMarkup {
  return { ...base(input, 'ellipse'), rect: input.rect, fill: input.fill } as EllipseMarkup;
}

export function newCloud(input: BaseInput & { rect: Rect; arc?: number }): CloudMarkup {
  return { ...base(input, 'cloud'), rect: input.rect, arc: input.arc ?? 8 } as CloudMarkup;
}

export function newCallout(
  input: BaseInput & {
    rect: Rect;
    target: Point;
    text?: string;
    fontSize?: number;
    fill?: string;
  },
): CalloutMarkup {
  return {
    ...base(input, 'callout'),
    rect: input.rect,
    target: input.target,
    text: input.text ?? '',
    fontSize: input.fontSize ?? 14,
    fill: input.fill ?? '#fff8e1',
  } as CalloutMarkup;
}

export function newText(
  input: BaseInput & { rect: Rect; text?: string; fontSize?: number; fill?: string },
): TextMarkup {
  return {
    ...base(input, 'text'),
    rect: input.rect,
    text: input.text ?? '',
    fontSize: input.fontSize ?? 14,
    fill: input.fill,
  } as TextMarkup;
}

/** Axis-aligned bounding box of a markup in page space. */
export function getMarkupBounds(m: Markup): Rect {
  switch (m.type) {
    case 'pen':
    case 'highlight':
    case 'polyline':
      return boundingBox(m.points);
    case 'line':
    case 'arrow':
      return boundingBox([m.start, m.end]);
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'text':
      return m.rect;
    case 'callout':
      return boundingBox([
        { x: m.rect.x, y: m.rect.y },
        { x: m.rect.x + m.rect.width, y: m.rect.y + m.rect.height },
        m.target,
      ]);
    case 'count':
    case 'photo':
      return { x: m.at.x - 8, y: m.at.y - 8, width: 16, height: 16 };
  }
}

/**
 * Hit test for selection. `tolerance` is in page units and widens thin marks
 * so they stay easy to tap — important for the field/mobile targets.
 */
export function hitTestMarkup(m: Markup, p: Point, tolerance = 4): boolean {
  switch (m.type) {
    case 'pen':
    case 'highlight':
    case 'polyline': {
      const tol = Math.max(tolerance, m.strokeWidth / 2 + tolerance);
      for (let i = 1; i < m.points.length; i++) {
        if (distanceToSegment(p, m.points[i - 1], m.points[i]) <= tol) return true;
      }
      return m.points.length === 1 ? distanceToSegment(p, m.points[0], m.points[0]) <= tol : false;
    }
    case 'line':
    case 'arrow': {
      const tol = Math.max(tolerance, m.strokeWidth / 2 + tolerance);
      return distanceToSegment(p, m.start, m.end) <= tol;
    }
    default:
      return pointInRect(p, getMarkupBounds(m), tolerance);
  }
}

/** Distinct authors present in a set of markups, sorted alphabetically. */
export function authorsOf(markups: Markup[]): string[] {
  return Array.from(new Set(markups.map((m) => m.author))).sort((a, b) => a.localeCompare(b));
}

/** Short human label for a markup type. */
export function markupTypeLabel(type: MarkupType): string {
  const labels: Record<MarkupType, string> = {
    pen: 'Pen',
    highlight: 'Highlight',
    line: 'Line',
    arrow: 'Arrow',
    polyline: 'Polyline',
    rect: 'Rectangle',
    ellipse: 'Ellipse',
    cloud: 'Cloud',
    callout: 'Callout',
    text: 'Text',
    count: 'Count',
    photo: 'Photo',
  };
  return labels[type];
}
