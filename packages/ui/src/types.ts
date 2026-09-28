import type { MarkupStatus } from '@planmark/core';

/** Tools available in the toolbar. */
export type ToolId =
  | 'select'
  | 'pen'
  | 'highlight'
  | 'cloud'
  | 'callout'
  | 'rect'
  | 'arrow'
  | 'text';

/** Style applied to newly created markups. */
export interface ToolStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
}

/** Active author/status filter. Empty sets mean "show all". */
export interface MarkupFilter {
  authors: Set<string>;
  statuses: Set<MarkupStatus>;
}

export function emptyFilter(): MarkupFilter {
  return { authors: new Set(), statuses: new Set() };
}
