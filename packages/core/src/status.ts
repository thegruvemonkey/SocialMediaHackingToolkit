/** Markup review status. Drives the status chip and the author/status filter. */
export type MarkupStatus = 'none' | 'open' | 'in_progress' | 'done' | 'rejected';

export interface StatusDef {
  value: MarkupStatus;
  label: string;
  /** Hex color used for the status chip. */
  color: string;
}

export const MARKUP_STATUSES: readonly StatusDef[] = [
  { value: 'none', label: 'None', color: '#8a94a6' },
  { value: 'open', label: 'Open', color: '#f5a623' },
  { value: 'in_progress', label: 'In progress', color: '#4a90e2' },
  { value: 'done', label: 'Done', color: '#2ecc71' },
  { value: 'rejected', label: 'Rejected', color: '#e74c3c' },
];

export function statusDef(status: MarkupStatus): StatusDef {
  return MARKUP_STATUSES.find((s) => s.value === status) ?? MARKUP_STATUSES[0];
}

/** Cycle to the next status — used by the one-tap status control. */
export function nextStatus(status: MarkupStatus): MarkupStatus {
  const order = MARKUP_STATUSES.map((s) => s.value);
  const i = order.indexOf(status);
  return order[(i + 1) % order.length];
}
