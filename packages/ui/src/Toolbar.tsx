import { DEFAULT_COLORS } from '@planmark/core';
import type { JSX } from 'react';
import { Icon, type IconName } from './icons';
import type { ToolId, ToolStyle } from './types';

export type SaveState = 'no-file' | 'idle' | 'dirty' | 'saving' | 'saved';

const TOOLS: { id: ToolId; icon: IconName; label: string }[] = [
  { id: 'select', icon: 'select', label: 'Select' },
  { id: 'pen', icon: 'pen', label: 'Pen' },
  { id: 'highlight', icon: 'highlight', label: 'Highlight' },
  { id: 'cloud', icon: 'cloud', label: 'Cloud' },
  { id: 'callout', icon: 'callout', label: 'Callout' },
  { id: 'rect', icon: 'rect', label: 'Box' },
  { id: 'arrow', icon: 'arrow', label: 'Arrow' },
  { id: 'text', icon: 'text', label: 'Text' },
];

const STROKE_WIDTHS = [1, 2, 4, 8];

export interface ToolbarProps {
  hasDoc: boolean;
  tool: ToolId;
  onToolChange: (t: ToolId) => void;
  style: ToolStyle;
  onStyleChange: (patch: Partial<ToolStyle>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenPdf: () => void;
  onOpenPlanmark: () => void;
  onSave: () => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  saveState: SaveState;
}

function saveLabel(state: SaveState): string {
  switch (state) {
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved ✓';
    case 'dirty':
      return 'Unsaved';
    case 'no-file':
      return 'Not saved';
    default:
      return '';
  }
}

export function Toolbar(props: ToolbarProps): JSX.Element {
  const { style, onStyleChange, page, pageCount, scale } = props;

  return (
    <div className="pm-toolbar" role="toolbar" aria-label="PlanMark tools">
      <div className="pm-toolbar-group">
        <button className="pm-btn" onClick={props.onOpenPdf} title="Open a PDF">
          <Icon name="openFile" />
          <span>Open PDF</span>
        </button>
        <button
          className="pm-btn pm-btn-icon"
          onClick={props.onOpenPlanmark}
          title="Open a .planmark file"
        >
          <Icon name="open" />
        </button>
        <button
          className="pm-btn pm-btn-icon"
          onClick={props.onSave}
          disabled={!props.hasDoc}
          title="Save .planmark (Ctrl/Cmd+S)"
        >
          <Icon name="save" />
        </button>
        <span className={`pm-save-state pm-save-${props.saveState}`}>
          {saveLabel(props.saveState)}
        </span>
      </div>

      <div className="pm-toolbar-sep" />

      <div className="pm-toolbar-group">
        <button
          className="pm-btn pm-btn-icon"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title="Undo (Ctrl/Cmd+Z)"
        >
          <Icon name="undo" />
        </button>
        <button
          className="pm-btn pm-btn-icon"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          <Icon name="redo" />
        </button>
      </div>

      <div className="pm-toolbar-sep" />

      <div className="pm-toolbar-group pm-tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`pm-tool${props.tool === t.id ? ' is-active' : ''}`}
            onClick={() => props.onToolChange(t.id)}
            disabled={!props.hasDoc}
            title={t.label}
            aria-pressed={props.tool === t.id}
          >
            <Icon name={t.icon} />
            <span className="pm-tool-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="pm-toolbar-sep" />

      <div className="pm-toolbar-group">
        <div className="pm-swatches">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              className={`pm-swatch${style.color === c ? ' is-active' : ''}`}
              style={{ background: c }}
              onClick={() => onStyleChange({ color: c })}
              title={c}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <select
          className="pm-select"
          value={style.strokeWidth}
          onChange={(e) => onStyleChange({ strokeWidth: Number(e.target.value) })}
          title="Stroke width"
          aria-label="Stroke width"
        >
          {STROKE_WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>
      </div>

      <div className="pm-toolbar-spacer" />

      <div className="pm-toolbar-group">
        <button
          className="pm-btn pm-btn-icon"
          onClick={() => props.onPageChange(page - 1)}
          disabled={!props.hasDoc || page <= 1}
          title="Previous page"
        >
          <Icon name="prev" />
        </button>
        <span className="pm-page-indicator">
          {props.hasDoc ? `${page} / ${pageCount}` : '– / –'}
        </span>
        <button
          className="pm-btn pm-btn-icon"
          onClick={() => props.onPageChange(page + 1)}
          disabled={!props.hasDoc || page >= pageCount}
          title="Next page"
        >
          <Icon name="next" />
        </button>
      </div>

      <div className="pm-toolbar-sep" />

      <div className="pm-toolbar-group">
        <button
          className="pm-btn pm-btn-icon"
          onClick={() => props.onScaleChange(Math.max(0.2, Math.round((scale - 0.2) * 100) / 100))}
          disabled={!props.hasDoc}
          title="Zoom out"
        >
          <Icon name="zoomOut" />
        </button>
        <span className="pm-zoom-indicator">{Math.round(scale * 100)}%</span>
        <button
          className="pm-btn pm-btn-icon"
          onClick={() => props.onScaleChange(Math.min(6, Math.round((scale + 0.2) * 100) / 100))}
          disabled={!props.hasDoc}
          title="Zoom in"
        >
          <Icon name="zoomIn" />
        </button>
      </div>
    </div>
  );
}
