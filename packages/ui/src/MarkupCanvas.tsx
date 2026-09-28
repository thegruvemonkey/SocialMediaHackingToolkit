import {
  distance,
  getMarkupBounds,
  hitTestMarkup,
  newArrow,
  newCallout,
  newCloud,
  newHighlight,
  newPen,
  newRect,
  newText,
  normalizeRect,
  padRect,
  translatePoint,
  translateRect,
  type Markup,
  type Point,
} from '@planmark/core';
import { useCallback, useMemo, useRef, useState, type JSX, type PointerEvent } from 'react';
import { MarkupDefs, MarkupShape } from './MarkupShapes';
import type { ToolId, ToolStyle } from './types';

export interface MarkupCanvasProps {
  page: number;
  widthPts: number;
  heightPts: number;
  scale: number;
  markups: Markup[];
  tool: ToolId;
  style: ToolStyle;
  author: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (markup: Markup) => void;
  onUpdate: (id: string, patch: Partial<Markup>) => void;
  onDelete: (id: string) => void;
}

type Draft =
  | { kind: 'path'; points: Point[] }
  | { kind: 'box'; start: Point; end: Point }
  | { kind: 'segment'; start: Point; end: Point }
  | null;

type DragState = { id: string; start: Point; origin: Markup } | null;

const MIN_DRAG = 3; // page units below which a drag counts as a click

/** Geometry-only patch that translates a markup by (dx, dy) in page space. */
function translateGeometry(m: Markup, dx: number, dy: number): Partial<Markup> {
  switch (m.type) {
    case 'pen':
    case 'highlight':
    case 'polyline':
      return { points: m.points.map((p) => translatePoint(p, dx, dy)) } as Partial<Markup>;
    case 'line':
    case 'arrow':
      return {
        start: translatePoint(m.start, dx, dy),
        end: translatePoint(m.end, dx, dy),
      } as Partial<Markup>;
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'text':
      return { rect: translateRect(m.rect, dx, dy) } as Partial<Markup>;
    case 'callout':
      return {
        rect: translateRect(m.rect, dx, dy),
        target: translatePoint(m.target, dx, dy),
      } as Partial<Markup>;
    case 'count':
    case 'photo':
      return { at: translatePoint(m.at, dx, dy) } as Partial<Markup>;
  }
}

export function MarkupCanvas(props: MarkupCanvasProps): JSX.Element {
  const {
    page,
    widthPts,
    heightPts,
    scale,
    markups,
    tool,
    style,
    author,
    selectedId,
    onSelect,
    onCreate,
    onUpdate,
    onDelete,
  } = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const dragCurrent = useRef<Point | null>(null);
  const [dragTick, setDragTick] = useState(0);
  const [draft, setDraft] = useState<Draft>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [editing, setEditing] = useState<{ id: string; value: string; isNew: boolean } | null>(
    null,
  );

  const cssWidth = widthPts * scale;
  const cssHeight = heightPts * scale;

  const toPage = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const rect = svgRef.current!.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
    },
    [scale],
  );

  const topMarkupAt = useCallback(
    (p: Point): Markup | null => {
      for (let i = markups.length - 1; i >= 0; i--) {
        if (hitTestMarkup(markups[i], p)) return markups[i];
      }
      return null;
    },
    [markups],
  );

  const baseInput = useMemo(
    () => ({
      page,
      author,
      color: style.color,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
    }),
    [page, author, style.color, style.strokeWidth, style.opacity],
  );

  const startEditingCallout = useCallback(
    (target: Point) => {
      const rect = {
        x: Math.min(target.x + 24, Math.max(4, widthPts - 170)),
        y: Math.max(target.y - 80, 4),
        width: 160,
        height: 64,
      };
      const markup = newCallout({ ...baseInput, rect, target, text: '', fontSize: style.fontSize });
      onCreate(markup);
      onSelect(markup.id);
      setEditing({ id: markup.id, value: '', isNew: true });
    },
    [baseInput, onCreate, onSelect, style.fontSize, widthPts],
  );

  const startEditingText = useCallback(
    (at: Point) => {
      const rect = { x: at.x, y: at.y, width: 160, height: 48 };
      const markup = newText({ ...baseInput, rect, text: '', fontSize: style.fontSize });
      onCreate(markup);
      onSelect(markup.id);
      setEditing({ id: markup.id, value: '', isNew: true });
    },
    [baseInput, onCreate, onSelect, style.fontSize],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 || editing) return;
      const p = toPage(e);
      svgRef.current?.setPointerCapture(e.pointerId);

      switch (tool) {
        case 'select': {
          const hit = topMarkupAt(p);
          onSelect(hit ? hit.id : null);
          if (hit) {
            dragCurrent.current = p;
            setDrag({ id: hit.id, start: p, origin: hit });
          }
          break;
        }
        case 'pen':
        case 'highlight':
          setDraft({ kind: 'path', points: [p] });
          break;
        case 'cloud':
        case 'rect':
          setDraft({ kind: 'box', start: p, end: p });
          break;
        case 'arrow':
          setDraft({ kind: 'segment', start: p, end: p });
          break;
        case 'callout':
          startEditingCallout(p);
          break;
        case 'text':
          startEditingText(p);
          break;
      }
    },
    [editing, onSelect, startEditingCallout, startEditingText, toPage, tool, topMarkupAt],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (drag) {
        dragCurrent.current = toPage(e);
        setDragTick((n) => n + 1);
        return;
      }
      if (!draft) return;
      const p = toPage(e);
      if (draft.kind === 'path') {
        const last = draft.points[draft.points.length - 1];
        if (!last || distance(last, p) >= 0.75) {
          setDraft({ kind: 'path', points: [...draft.points, p] });
        }
      } else {
        setDraft({ ...draft, end: p });
      }
    },
    [draft, drag, toPage],
  );

  const finishDrag = useCallback(() => {
    if (!drag) return;
    const cur = dragCurrent.current;
    if (cur) {
      const dx = cur.x - drag.start.x;
      const dy = cur.y - drag.start.y;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        onUpdate(drag.id, translateGeometry(drag.origin, dx, dy));
      }
    }
    dragCurrent.current = null;
    setDrag(null);
  }, [drag, onUpdate]);

  const finishDraft = useCallback(() => {
    if (!draft) return;
    if (draft.kind === 'path') {
      if (draft.points.length >= 2) {
        const markup =
          tool === 'highlight'
            ? newHighlight({ ...baseInput, opacity: style.opacity, points: draft.points })
            : newPen({ ...baseInput, points: draft.points });
        onCreate(markup);
      }
    } else if (draft.kind === 'box') {
      const rect = normalizeRect(draft.start, draft.end);
      if (rect.width >= MIN_DRAG && rect.height >= MIN_DRAG) {
        const markup =
          tool === 'cloud' ? newCloud({ ...baseInput, rect }) : newRect({ ...baseInput, rect });
        onCreate(markup);
      }
    } else if (draft.kind === 'segment') {
      if (distance(draft.start, draft.end) >= MIN_DRAG) {
        onCreate(newArrow({ ...baseInput, start: draft.start, end: draft.end }));
      }
    }
    setDraft(null);
  }, [baseInput, draft, onCreate, style.opacity, tool]);

  const handlePointerUp = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      svgRef.current?.releasePointerCapture(e.pointerId);
      if (drag) finishDrag();
      else finishDraft();
    },
    [drag, finishDraft, finishDrag],
  );

  const handleDoubleClick = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const p = toPage(e);
      const hit = topMarkupAt(p);
      if (hit && (hit.type === 'callout' || hit.type === 'text')) {
        onSelect(hit.id);
        setEditing({ id: hit.id, value: hit.text, isNew: false });
      }
    },
    [onSelect, toPage, topMarkupAt],
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    if (editing.value.trim() === '' && editing.isNew) {
      onDelete(editing.id);
    } else {
      onUpdate(editing.id, { text: editing.value } as Partial<Markup>);
    }
    setEditing(null);
  }, [editing, onDelete, onUpdate]);

  const cancelEdit = useCallback(() => {
    if (!editing) return;
    if (editing.isNew) onDelete(editing.id);
    setEditing(null);
  }, [editing, onDelete]);

  // Ephemeral preview markup for the in-progress draft.
  const draftMarkup: Markup | null = useMemo(() => {
    if (!draft) return null;
    if (draft.kind === 'path') {
      if (draft.points.length < 1) return null;
      return tool === 'highlight'
        ? newHighlight({ ...baseInput, opacity: style.opacity, points: draft.points })
        : newPen({ ...baseInput, points: draft.points });
    }
    if (draft.kind === 'box') {
      const rect = normalizeRect(draft.start, draft.end);
      return tool === 'cloud' ? newCloud({ ...baseInput, rect }) : newRect({ ...baseInput, rect });
    }
    return newArrow({ ...baseInput, start: draft.start, end: draft.end });
  }, [baseInput, draft, style.opacity, tool]);

  // Markups to render, applying the live drag translation to the dragged one.
  const rendered: Markup[] = useMemo(() => {
    const cur = dragCurrent.current;
    if (!drag || !cur) return markups;
    const dx = cur.x - drag.start.x;
    const dy = cur.y - drag.start.y;
    return markups.map((m) =>
      m.id === drag.id ? ({ ...m, ...translateGeometry(drag.origin, dx, dy) } as Markup) : m,
    );
    // dragTick forces recompute while dragCurrent (a ref) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markups, drag, dragTick]);

  const selected = selectedId ? rendered.find((m) => m.id === selectedId) : undefined;
  const selBounds = selected ? padRect(getMarkupBounds(selected), 4) : null;

  const editingMarkup = editing ? rendered.find((m) => m.id === editing.id) : undefined;
  const editRect =
    editingMarkup && (editingMarkup.type === 'callout' || editingMarkup.type === 'text')
      ? editingMarkup.rect
      : null;

  const cursor = tool === 'select' ? 'default' : 'crosshair';

  return (
    <div
      className="pm-markup-layer"
      style={{ position: 'absolute', inset: 0, width: cssWidth, height: cssHeight }}
    >
      <svg
        ref={svgRef}
        width={cssWidth}
        height={cssHeight}
        viewBox={`0 0 ${widthPts} ${heightPts}`}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <MarkupDefs />
        {rendered.map((m) => (
          <MarkupShape key={m.id} markup={m} />
        ))}
        {draftMarkup ? <MarkupShape markup={draftMarkup} /> : null}
        {selBounds ? (
          <rect
            x={selBounds.x}
            y={selBounds.y}
            width={selBounds.width}
            height={selBounds.height}
            fill="none"
            stroke="#4a90e2"
            strokeWidth={1 / scale}
            strokeDasharray={`${4 / scale} ${3 / scale}`}
            pointerEvents="none"
          />
        ) : null}
      </svg>

      {editRect ? (
        <textarea
          autoFocus
          value={editing?.value ?? ''}
          onChange={(e) => setEditing((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelEdit();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commitEdit();
            }
          }}
          className="pm-text-editor"
          style={{
            position: 'absolute',
            left: editRect.x * scale,
            top: editRect.y * scale,
            width: editRect.width * scale,
            height: editRect.height * scale,
            fontSize: style.fontSize * scale,
          }}
          placeholder="Type… (Esc to cancel)"
        />
      ) : null}
    </div>
  );
}
