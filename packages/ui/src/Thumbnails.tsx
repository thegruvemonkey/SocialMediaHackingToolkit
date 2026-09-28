import { useEffect, useRef, useState, type JSX } from 'react';
import type { PdfDocument } from './pdf';

const THUMB_WIDTH = 120;

function PdfThumbnail({
  doc,
  pageNumber,
  active,
  onClick,
}: {
  doc: PdfDocument;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  const ref = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Only render the thumbnail once it scrolls into view (handles large PDFs).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || rendered) return;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = THUMB_WIDTH / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      try {
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setRendered(true);
      } catch {
        /* cancelled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, rendered, doc, pageNumber]);

  return (
    <button
      ref={ref}
      type="button"
      className={`pm-thumb${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-label={`Page ${pageNumber}`}
    >
      <canvas ref={canvasRef} className="pm-thumb-canvas" />
      <span className="pm-thumb-label">{pageNumber}</span>
    </button>
  );
}

export function Thumbnails({
  doc,
  pageCount,
  currentPage,
  onSelect,
}: {
  doc: PdfDocument;
  pageCount: number;
  currentPage: number;
  onSelect: (pageNumber: number) => void;
}): JSX.Element {
  return (
    <div className="pm-thumbs">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <PdfThumbnail
          key={n}
          doc={doc}
          pageNumber={n}
          active={n === currentPage}
          onClick={() => onSelect(n)}
        />
      ))}
    </div>
  );
}
