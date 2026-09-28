import { describe, expect, it } from 'vitest';
import {
  MarkupStore,
  newCallout,
  newCloud,
  newPen,
  openPlanmark,
  PlanmarkError,
  savePlanmark,
  type Markup,
} from '../src/index';

function sampleMarkups(): Markup[] {
  return [
    newPen({
      page: 0,
      author: 'Sam',
      color: '#e53935',
      strokeWidth: 2,
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 25 },
        { x: 70, y: 12 },
      ],
    }),
    newCloud({
      page: 0,
      author: 'Sam',
      color: '#1e88e5',
      rect: { x: 100, y: 100, width: 120, height: 80 },
      arc: 8,
      status: 'open',
    }),
    newCallout({
      page: 1,
      author: 'Riya',
      color: '#43a047',
      rect: { x: 200, y: 60, width: 160, height: 60 },
      target: { x: 150, y: 140 },
      text: 'Check dimension here',
      status: 'in_progress',
    }),
  ];
}

// A .planmark bundle does not parse the PDF, so any bytes stand in for one.
const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"

describe('.planmark round-trip', () => {
  it('saves and reopens a bundle without losing markups', async () => {
    const markups = sampleMarkups();
    const bytes = await savePlanmark({
      pdfBytes: fakePdf,
      documentName: 'Level 1 - Floor Plan.pdf',
      pageCount: 2,
      markups,
    });

    expect(bytes.byteLength).toBeGreaterThan(0);

    const reopened = await openPlanmark(bytes);
    expect(reopened.documentName).toBe('Level 1 - Floor Plan.pdf');
    expect(reopened.pageCount).toBe(2);
    expect(Array.from(reopened.pdfBytes)).toEqual(Array.from(fakePdf));
    expect(reopened.markups).toHaveLength(3);
    expect(reopened.markups).toEqual(markups);
  });

  it('preserves callout geometry and text exactly', async () => {
    const markups = sampleMarkups();
    const bytes = await savePlanmark({
      pdfBytes: fakePdf,
      documentName: 'doc.pdf',
      pageCount: 2,
      markups,
    });
    const reopened = await openPlanmark(bytes);
    const callout = reopened.markups.find((m) => m.type === 'callout');
    expect(callout).toBeDefined();
    if (callout?.type === 'callout') {
      expect(callout.text).toBe('Check dimension here');
      expect(callout.target).toEqual({ x: 150, y: 140 });
      expect(callout.page).toBe(1);
    }
  });

  it('rejects bytes that are not a zip', async () => {
    await expect(openPlanmark(new Uint8Array([1, 2, 3, 4]))).rejects.toBeInstanceOf(PlanmarkError);
  });
});

describe('MarkupStore undo/redo', () => {
  it('tracks add, update, remove with undo and redo', () => {
    const store = new MarkupStore();
    const pen = sampleMarkups()[0];

    store.add(pen);
    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.canUndo).toBe(true);

    store.setStatus(pen.id, 'done');
    expect(store.get(pen.id)?.status).toBe('done');

    store.undo();
    expect(store.get(pen.id)?.status).toBe('open');

    store.redo();
    expect(store.get(pen.id)?.status).toBe('done');

    store.remove(pen.id);
    expect(store.getSnapshot()).toHaveLength(0);

    store.undo();
    expect(store.getSnapshot()).toHaveLength(1);
  });

  it('keeps a stable snapshot reference until a mutation happens', () => {
    const store = new MarkupStore();
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    store.add(sampleMarkups()[0]);
    expect(store.getSnapshot()).not.toBe(before);
  });

  it('clears history on replaceAll by default', () => {
    const store = new MarkupStore(sampleMarkups());
    store.add(sampleMarkups()[1]);
    store.replaceAll([]);
    expect(store.canUndo).toBe(false);
    expect(store.getSnapshot()).toHaveLength(0);
  });
});
