import type { Markup } from '@planmark/core';
import { useCallback, useEffect, useRef, useState, type JSX, type WheelEvent } from 'react';
import { MarkupCanvas } from './MarkupCanvas';
import type { PdfDocument } from './pdf';
import { PdfPageCanvas } from './PdfPageCanvas';
import type { ToolId, ToolStyle } from './types';

interface PageSize {
  widthPts: number;
  heightPts: number;
}

export interface PdfViewerProps {
  doc: PdfDocument;
  /** 1-based current page. */
  currentPage: number;
  scale: number;
  onScaleChange: (scale: number) => void;
  /** Markups for all pages (viewer shows those on the current page). */
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

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;

export function PdfViewer(props: PdfViewerProps): JSX.Element {
  const { doc, currentPage, scale, onScaleChange } = props;
  const pageIndex = currentPage - 1;
  const sizeCache = useRef<Map<number, PageSize>>(new Map());
  const [size, setSize] = useState<PageSize | null>(sizeCache.current.get(currentPage) ?? null);

  useEffect(() => {
    setSize(sizeCache.current.get(currentPage) ?? null);
  }, [currentPage]);

  const handleRendered = useCallback(
    (s: PageSize) => {
      sizeCache.current.set(currentPage, s);
      setSize((prev) =>
        prev && prev.widthPts === s.widthPts && prev.heightPts === s.heightPts ? prev : s,
      );
    },
    [currentPage],
  );

  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY / 400);
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      onScaleChange(Math.round(next * 100) / 100);
    },
    [onScaleChange, scale],
  );

  const pageMarkups = props.markups.filter((m) => m.page === pageIndex);
  const cssWidth = size ? size.widthPts * scale : undefined;
  const cssHeight = size ? size.heightPts * scale : undefined;

  return (
    <div className="pm-viewer" onWheel={handleWheel}>
      <div className="pm-viewer-scroll">
        <div className="pm-page-stage" style={{ width: cssWidth, height: cssHeight }}>
          <PdfPageCanvas
            doc={doc}
            pageNumber={currentPage}
            scale={scale}
            onRendered={handleRendered}
          />
          {size ? (
            <MarkupCanvas
              page={pageIndex}
              widthPts={size.widthPts}
              heightPts={size.heightPts}
              scale={scale}
              markups={pageMarkups}
              tool={props.tool}
              style={props.style}
              author={props.author}
              selectedId={props.selectedId}
              onSelect={props.onSelect}
              onCreate={props.onCreate}
              onUpdate={props.onUpdate}
              onDelete={props.onDelete}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
