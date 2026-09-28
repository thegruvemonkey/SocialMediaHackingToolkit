import { authorsOf, MARKUP_STATUSES, markupTypeLabel, statusDef, type Markup } from '@planmark/core';
import type { JSX } from 'react';
import { Icon } from './icons';
import type { MarkupFilter } from './types';

export interface MarkupListProps {
  markups: Markup[];
  filter: MarkupFilter;
  onFilterChange: (filter: MarkupFilter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onGoToPage: (pageIndex: number) => void;
}

function preview(m: Markup): string {
  if ((m.type === 'callout' || m.type === 'text') && m.text.trim()) return m.text.trim();
  if (m.subject) return m.subject;
  return markupTypeLabel(m.type);
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function matches(m: Markup, filter: MarkupFilter): boolean {
  if (filter.authors.size > 0 && !filter.authors.has(m.author)) return false;
  if (filter.statuses.size > 0 && !filter.statuses.has(m.status)) return false;
  return true;
}

export function MarkupList(props: MarkupListProps): JSX.Element {
  const { markups, filter } = props;
  const authors = authorsOf(markups);
  const visible = markups.filter((m) => matches(m, filter));

  return (
    <div className="pm-list">
      <div className="pm-list-header">
        <span className="pm-list-title">Markups</span>
        <span className="pm-list-count">
          {visible.length}
          {visible.length !== markups.length ? ` / ${markups.length}` : ''}
        </span>
      </div>

      <div className="pm-filters">
        <div className="pm-filter-row" aria-label="Filter by status">
          {MARKUP_STATUSES.map((s) => {
            const active = filter.statuses.has(s.value);
            return (
              <button
                key={s.value}
                className={`pm-chip${active ? ' is-active' : ''}`}
                style={active ? { background: s.color, borderColor: s.color, color: '#0b0f14' } : undefined}
                onClick={() =>
                  props.onFilterChange({ ...filter, statuses: toggle(filter.statuses, s.value) })
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {authors.length > 1 ? (
          <div className="pm-filter-row" aria-label="Filter by author">
            {authors.map((a) => {
              const active = filter.authors.has(a);
              return (
                <button
                  key={a}
                  className={`pm-chip${active ? ' is-active' : ''}`}
                  onClick={() =>
                    props.onFilterChange({ ...filter, authors: toggle(filter.authors, a) })
                  }
                >
                  {a}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="pm-list-scroll">
        {visible.length === 0 ? (
          <p className="pm-side-empty">No markups match.</p>
        ) : (
          visible.map((m) => {
            const st = statusDef(m.status);
            return (
              <div
                key={m.id}
                className={`pm-list-item${props.selectedId === m.id ? ' is-selected' : ''}`}
                onClick={() => {
                  props.onSelect(m.id);
                  props.onGoToPage(m.page);
                }}
              >
                <span className="pm-list-dot" style={{ background: m.color }} />
                <div className="pm-list-body">
                  <span className="pm-list-preview">{preview(m)}</span>
                  <span className="pm-list-meta">
                    {markupTypeLabel(m.type)} · p.{m.page + 1} · {m.author}
                  </span>
                </div>
                <button
                  className="pm-status-chip"
                  style={{ background: st.color }}
                  title="Cycle status"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onCycleStatus(m.id);
                  }}
                >
                  {st.label}
                </button>
                <button
                  className="pm-btn pm-btn-icon pm-list-delete"
                  title="Delete markup"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(m.id);
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
