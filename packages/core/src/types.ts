import type { Point, Rect } from './geometry';
import type { MarkupStatus } from './status';

/**
 * The full markup vocabulary PlanMark targets for stage 1. The first
 * deliverable ships interactive tools for pen, cloud, and callout (plus a few
 * cheap extras), but the data model covers every type so files stay
 * forward-compatible as tools are added.
 */
export type MarkupType =
  | 'pen'
  | 'highlight'
  | 'line'
  | 'arrow'
  | 'polyline'
  | 'rect'
  | 'ellipse'
  | 'cloud'
  | 'callout'
  | 'text'
  | 'count'
  | 'photo';

/** Fields shared by every markup. Coordinates are in page space (see geometry.ts). */
export interface MarkupBase {
  id: string;
  type: MarkupType;
  /** 0-based page index. */
  page: number;
  author: string;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
  status: MarkupStatus;
  /** Optional short label shown in the markup list. */
  subject?: string;
  /** Stroke / primary color as a hex string. */
  color: string;
  /** 0..1 */
  opacity: number;
  /** Stroke width in page units (PDF points). */
  strokeWidth: number;
}

export interface PenMarkup extends MarkupBase {
  type: 'pen';
  points: Point[];
}

export interface HighlightMarkup extends MarkupBase {
  type: 'highlight';
  points: Point[];
}

export interface LineMarkup extends MarkupBase {
  type: 'line';
  start: Point;
  end: Point;
}

export interface ArrowMarkup extends MarkupBase {
  type: 'arrow';
  start: Point;
  end: Point;
}

export interface PolylineMarkup extends MarkupBase {
  type: 'polyline';
  points: Point[];
}

export interface RectMarkup extends MarkupBase {
  type: 'rect';
  rect: Rect;
  /** Optional fill color; undefined means no fill. */
  fill?: string;
}

export interface EllipseMarkup extends MarkupBase {
  type: 'ellipse';
  rect: Rect;
  fill?: string;
}

export interface CloudMarkup extends MarkupBase {
  type: 'cloud';
  rect: Rect;
  /** Bump radius in page units controlling the scallop size. */
  arc: number;
}

export interface CalloutMarkup extends MarkupBase {
  type: 'callout';
  /** Text box in page space. */
  rect: Rect;
  /** Point the leader line points at. */
  target: Point;
  text: string;
  fontSize: number;
  /** Box fill color. */
  fill: string;
}

export interface TextMarkup extends MarkupBase {
  type: 'text';
  rect: Rect;
  text: string;
  fontSize: number;
  fill?: string;
}

export interface CountMarkup extends MarkupBase {
  type: 'count';
  at: Point;
  /** Count group (e.g. "Outlets"); markups in a group share styling. */
  group: string;
  /** Sequence number within the group. */
  index: number;
}

export interface PhotoPinMarkup extends MarkupBase {
  type: 'photo';
  at: Point;
  /** Reference to a photo stored in the bundle's photos/ folder. */
  photoId: string;
  caption?: string;
}

export type Markup =
  | PenMarkup
  | HighlightMarkup
  | LineMarkup
  | ArrowMarkup
  | PolylineMarkup
  | RectMarkup
  | EllipseMarkup
  | CloudMarkup
  | CalloutMarkup
  | TextMarkup
  | CountMarkup
  | PhotoPinMarkup;
