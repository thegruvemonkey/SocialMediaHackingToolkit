import * as pdfjs from 'pdfjs-dist';
// Vite resolves this to a hashed URL for the worker bundle.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };

export type PdfDocument = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
export type PdfPage = Awaited<ReturnType<PdfDocument['getPage']>>;

/**
 * Load a PDF from bytes. A copy is passed to pdf.js because it transfers the
 * buffer to its worker, which would detach the caller's Uint8Array otherwise
 * (we still need the original bytes to save the .planmark bundle).
 */
export function loadPdf(bytes: Uint8Array): Promise<PdfDocument> {
  const copy = bytes.slice();
  return pdfjs.getDocument({ data: copy }).promise;
}

export interface PageSize {
  /** Width in PDF points (page space units). */
  widthPts: number;
  heightPts: number;
}

export async function getPageSize(doc: PdfDocument, pageNumber: number): Promise<PageSize> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  return { widthPts: viewport.width, heightPts: viewport.height };
}

export interface OutlineNode {
  title: string;
  pageNumber: number | null;
  children: OutlineNode[];
}

/** Read the PDF bookmarks/outline and resolve each entry to a 1-based page number. */
export async function getOutline(doc: PdfDocument): Promise<OutlineNode[]> {
  const raw = await doc.getOutline().catch(() => null);
  if (!raw) return [];

  async function resolve(dest: unknown): Promise<number | null> {
    try {
      const explicit =
        typeof dest === 'string' ? await doc.getDestination(dest) : (dest as unknown[] | null);
      if (!Array.isArray(explicit) || explicit.length === 0) return null;
      const ref = explicit[0];
      const index = await doc.getPageIndex(ref as Parameters<typeof doc.getPageIndex>[0]);
      return index + 1;
    } catch {
      return null;
    }
  }

  async function walk(items: NonNullable<typeof raw>): Promise<OutlineNode[]> {
    const nodes: OutlineNode[] = [];
    for (const item of items) {
      nodes.push({
        title: item.title,
        pageNumber: await resolve(item.dest),
        children: item.items ? await walk(item.items) : [],
      });
    }
    return nodes;
  }

  return walk(raw);
}
