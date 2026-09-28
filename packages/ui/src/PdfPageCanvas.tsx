import { useEffect, useRef, type JSX } from 'react';
import type { PdfDocument } from './pdf';

export interface PdfPageCanvasProps {
  doc: PdfDocument;
  /** 1-based page number. */
  pageNumber: number;
  scale: number;
  onRendered?: (size: { widthPts: number; heightPts: number }) => void;
}

/** Renders a single PDF page onto a canvas, cancelling stale renders on change. */
export function PdfPageCanvas({ doc, pageNumber, scale, onRendered }: PdfPageCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    // pdf.js render task; typed loosely to avoid importing internal types.
    let task: { promise: Promise<void>; cancel: () => void } | null = null;

    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      onRendered?.({ widthPts: viewport.width / scale, heightPts: viewport.height / scale });

      task = page.render({ canvasContext: ctx, viewport });
      try {
        await task!.promise;
      } catch {
        // RenderingCancelledException when scale/page changes mid-render — ignore.
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, scale, onRendered]);

  return <canvas ref={canvasRef} className="pm-page-canvas" />;
}
