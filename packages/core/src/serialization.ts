import JSZip from 'jszip';
import { DEFAULT_COLORS } from './markups';
import type { MarkupStatus } from './status';
import type { Markup, MarkupType } from './types';

export const PLANMARK_FORMAT_VERSION = 1;
export const PLANMARK_APP_ID = 'PlanMark';

/** File names inside a .planmark bundle (a zip archive). */
const FILE = {
  manifest: 'manifest.json',
  markups: 'markups.json',
  pdf: 'document.pdf',
} as const;

export interface PlanmarkManifest {
  format: typeof PLANMARK_APP_ID;
  version: number;
  documentName: string;
  pageCount: number;
  createdAt: string;
  modifiedAt: string;
  /** App/version string that last wrote the file. */
  generator?: string;
}

export interface PlanmarkBundle {
  pdfBytes: Uint8Array;
  documentName: string;
  pageCount: number;
  markups: Markup[];
  manifest: PlanmarkManifest;
}

export interface SaveInput {
  pdfBytes: Uint8Array;
  documentName: string;
  pageCount: number;
  markups: Markup[];
  createdAt?: string;
  generator?: string;
}

export class PlanmarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanmarkError';
  }
}

const MARKUP_TYPES: ReadonlySet<string> = new Set<MarkupType>([
  'pen',
  'highlight',
  'line',
  'arrow',
  'polyline',
  'rect',
  'ellipse',
  'cloud',
  'callout',
  'text',
  'count',
  'photo',
]);

const STATUSES: ReadonlySet<string> = new Set<MarkupStatus>([
  'none',
  'open',
  'in_progress',
  'done',
  'rejected',
]);

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Fill in / coerce fields on markups read from disk so hand-edited or
 * older-version files still load. Unknown markup types are dropped.
 */
export function sanitizeMarkups(raw: unknown): Markup[] {
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();
  const out: Markup[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const type = asString(r.type, '');
    if (!MARKUP_TYPES.has(type)) continue;
    const status = STATUSES.has(asString(r.status, '')) ? (r.status as MarkupStatus) : 'open';
    const common = {
      id: asString(r.id, `mk_${Math.random().toString(36).slice(2)}`),
      type: type as MarkupType,
      page: Math.max(0, Math.floor(asNumber(r.page, 0))),
      author: asString(r.author, 'Unknown'),
      createdAt: asString(r.createdAt, now),
      updatedAt: asString(r.updatedAt, now),
      status,
      subject: typeof r.subject === 'string' ? r.subject : undefined,
      color: asString(r.color, DEFAULT_COLORS[0]),
      opacity: asNumber(r.opacity, 1),
      strokeWidth: asNumber(r.strokeWidth, 2),
    };
    // Geometry fields are passed through as-is; they were produced by us.
    out.push({ ...r, ...common } as Markup);
  }
  return out;
}

/** Serialize a document + markups into .planmark bytes (a zip). */
export async function savePlanmark(input: SaveInput): Promise<Uint8Array> {
  const now = new Date().toISOString();
  const manifest: PlanmarkManifest = {
    format: PLANMARK_APP_ID,
    version: PLANMARK_FORMAT_VERSION,
    documentName: input.documentName,
    pageCount: input.pageCount,
    createdAt: input.createdAt ?? now,
    modifiedAt: now,
    generator: input.generator ?? `${PLANMARK_APP_ID}/0.1.0`,
  };

  const zip = new JSZip();
  zip.file(FILE.manifest, JSON.stringify(manifest, null, 2));
  zip.file(
    FILE.markups,
    JSON.stringify({ version: PLANMARK_FORMAT_VERSION, markups: input.markups }, null, 2),
  );
  zip.file(FILE.pdf, input.pdfBytes);

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/** Parse .planmark bytes back into a bundle. Throws PlanmarkError on bad input. */
export async function openPlanmark(bytes: Uint8Array): Promise<PlanmarkBundle> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (err) {
    throw new PlanmarkError(`Not a valid .planmark file: ${(err as Error).message}`);
  }

  const pdfEntry = zip.file(FILE.pdf);
  if (!pdfEntry) {
    throw new PlanmarkError(`Missing ${FILE.pdf} in .planmark bundle`);
  }
  const pdfBytes = await pdfEntry.async('uint8array');

  let manifest: Partial<PlanmarkManifest> = {};
  const manifestEntry = zip.file(FILE.manifest);
  if (manifestEntry) {
    try {
      manifest = JSON.parse(await manifestEntry.async('string')) as PlanmarkManifest;
    } catch {
      manifest = {};
    }
  }

  let markups: Markup[] = [];
  const markupsEntry = zip.file(FILE.markups);
  if (markupsEntry) {
    try {
      const parsed = JSON.parse(await markupsEntry.async('string')) as {
        markups?: unknown;
      };
      markups = sanitizeMarkups(parsed?.markups);
    } catch (err) {
      throw new PlanmarkError(`Corrupt ${FILE.markups}: ${(err as Error).message}`);
    }
  }

  const now = new Date().toISOString();
  const resolvedManifest: PlanmarkManifest = {
    format: PLANMARK_APP_ID,
    version: asNumber(manifest.version, PLANMARK_FORMAT_VERSION),
    documentName: asString(manifest.documentName, 'Document'),
    pageCount: asNumber(manifest.pageCount, 0),
    createdAt: asString(manifest.createdAt, now),
    modifiedAt: asString(manifest.modifiedAt, now),
    generator: manifest.generator,
  };

  return {
    pdfBytes,
    documentName: resolvedManifest.documentName,
    pageCount: resolvedManifest.pageCount,
    markups,
    manifest: resolvedManifest,
  };
}
