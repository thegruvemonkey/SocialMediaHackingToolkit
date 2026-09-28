import {
  DEFAULT_COLORS,
  MarkupStore,
  nextStatus,
  openPlanmark as parsePlanmark,
  savePlanmark,
  type Markup,
  type MarkupStatus,
} from '@planmark/core';
import {
  emptyFilter,
  loadPdf,
  MarkupList,
  Outline,
  PdfViewer,
  Thumbnails,
  Toolbar,
  useMarkups,
  type MarkupFilter,
  type PdfDocument,
  type SaveState,
  type ToolId,
  type ToolStyle,
} from '@planmark/ui';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';

function defaultSaveName(docName: string): string {
  return docName.replace(/\.pdf$/i, '') + '.planmark';
}

function filterMarkups(markups: Markup[], filter: MarkupFilter): Markup[] {
  if (filter.authors.size === 0 && filter.statuses.size === 0) return markups;
  return markups.filter(
    (m) =>
      (filter.authors.size === 0 || filter.authors.has(m.author)) &&
      (filter.statuses.size === 0 || filter.statuses.has(m.status)),
  );
}

export function App(): JSX.Element {
  const storeRef = useRef<MarkupStore | null>(null);
  if (!storeRef.current) storeRef.current = new MarkupStore();
  const store = storeRef.current;
  const markups = useMarkups(store);

  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [docName, setDocName] = useState('Document.pdf');
  const [pageCount, setPageCount] = useState(0);
  const [filePath, setFilePath] = useState<string | null>(null);
  const createdAtRef = useRef<string>(new Date().toISOString());

  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<ToolId>('select');
  const [style, setStyle] = useState<ToolStyle>({
    color: DEFAULT_COLORS[0],
    strokeWidth: 2,
    opacity: 1,
    fontSize: 14,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MarkupFilter>(emptyFilter());
  const [author, setAuthor] = useState('You');
  const [saveState, setSaveState] = useState<SaveState>('no-file');
  const [leftTab, setLeftTab] = useState<'pages' | 'bookmarks'>('pages');

  useEffect(() => {
    window.planmark
      ?.getUser?.()
      .then((u) => {
        if (u) setAuthor(u);
      })
      .catch(() => undefined);
  }, []);

  const loadDoc = useCallback(
    async (
      bytes: Uint8Array,
      name: string,
      path: string | null,
      initialMarkups: Markup[],
      createdAt?: string,
    ) => {
      const pdf = await loadPdf(bytes);
      setDoc(pdf);
      setPdfBytes(bytes);
      setDocName(name);
      setPageCount(pdf.numPages);
      setFilePath(path);
      createdAtRef.current = createdAt ?? new Date().toISOString();
      store.replaceAll(initialMarkups);
      setCurrentPage(1);
      setSelectedId(null);
      setScale(1);
      setTool('select');
      setFilter(emptyFilter());
      setSaveState(path ? 'saved' : 'no-file');
    },
    [store],
  );

  const handleOpenPdf = useCallback(async () => {
    const f = await window.planmark.openPdf();
    if (!f) return;
    await loadDoc(f.bytes, f.name, null, []);
  }, [loadDoc]);

  const handleOpenPlanmark = useCallback(async () => {
    const f = await window.planmark.openPlanmark();
    if (!f) return;
    const bundle = await parsePlanmark(f.bytes);
    await loadDoc(
      bundle.pdfBytes,
      bundle.documentName || f.name,
      f.path,
      bundle.markups,
      bundle.manifest.createdAt,
    );
  }, [loadDoc]);

  const saveNow = useCallback(async () => {
    if (!pdfBytes) return;
    setSaveState('saving');
    const bytes = await savePlanmark({
      pdfBytes,
      documentName: docName,
      pageCount,
      markups: store.getSnapshot(),
      createdAt: createdAtRef.current,
    });
    if (filePath) {
      await window.planmark.writePlanmark(filePath, bytes);
      setSaveState('saved');
    } else {
      const res = await window.planmark.savePlanmarkAs(defaultSaveName(docName), bytes);
      if (res) {
        setFilePath(res.path);
        setSaveState('saved');
      } else {
        setSaveState('no-file');
      }
    }
  }, [pdfBytes, docName, pageCount, filePath, store]);

  // Autosave to the current file, debounced, once a file path exists.
  useEffect(() => {
    if (!filePath || !pdfBytes) return;
    setSaveState('dirty');
    const t = setTimeout(() => {
      void saveNow();
    }, 800);
    return () => clearTimeout(t);
  }, [markups, filePath, pdfBytes, saveNow]);

  // Keyboard: undo/redo, save, delete selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      const typing = tag === 'textarea' || tag === 'input';
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        store.redo();
      } else if (mod && key === 's') {
        e.preventDefault();
        void saveNow();
      } else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        store.remove(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, selectedId, saveNow]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.min(Math.max(1, page), Math.max(1, pageCount)));
    },
    [pageCount],
  );

  const handleCreate = useCallback(
    (m: Markup) => {
      store.add(m);
    },
    [store],
  );

  const handleUpdate = useCallback(
    (id: string, patch: Partial<Markup>) => {
      store.update(id, patch);
    },
    [store],
  );

  const handleDelete = useCallback(
    (id: string) => {
      store.remove(id);
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [store],
  );

  const handleCycleStatus = useCallback(
    (id: string) => {
      const m = store.get(id);
      if (m) store.setStatus(id, nextStatus(m.status) as MarkupStatus);
    },
    [store],
  );

  const visibleMarkups = filterMarkups(markups, filter);

  return (
    <div className="pm-app">
      <Toolbar
        hasDoc={!!doc}
        tool={tool}
        onToolChange={setTool}
        style={style}
        onStyleChange={(patch) => setStyle((s) => ({ ...s, ...patch }))}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={() => store.undo()}
        onRedo={() => store.redo()}
        onOpenPdf={handleOpenPdf}
        onOpenPlanmark={handleOpenPlanmark}
        onSave={() => void saveNow()}
        page={currentPage}
        pageCount={pageCount}
        onPageChange={goToPage}
        scale={scale}
        onScaleChange={setScale}
        saveState={saveState}
      />

      {doc ? (
        <div className="pm-main">
          <aside className="pm-sidebar-left">
            <div className="pm-tabs">
              <button
                className={`pm-tab${leftTab === 'pages' ? ' is-active' : ''}`}
                onClick={() => setLeftTab('pages')}
              >
                Pages
              </button>
              <button
                className={`pm-tab${leftTab === 'bookmarks' ? ' is-active' : ''}`}
                onClick={() => setLeftTab('bookmarks')}
              >
                Bookmarks
              </button>
            </div>
            <div className="pm-side-scroll">
              {leftTab === 'pages' ? (
                <Thumbnails
                  doc={doc}
                  pageCount={pageCount}
                  currentPage={currentPage}
                  onSelect={goToPage}
                />
              ) : (
                <Outline doc={doc} onNavigate={goToPage} />
              )}
            </div>
          </aside>

          <PdfViewer
            doc={doc}
            currentPage={currentPage}
            scale={scale}
            onScaleChange={setScale}
            markups={visibleMarkups}
            tool={tool}
            style={style}
            author={author}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />

          <aside className="pm-sidebar-right">
            <MarkupList
              markups={markups}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={handleDelete}
              onCycleStatus={handleCycleStatus}
              onGoToPage={(pageIndex) => goToPage(pageIndex + 1)}
            />
          </aside>
        </div>
      ) : (
        <div className="pm-viewer">
          <div className="pm-empty">
            <h1>PlanMark</h1>
            <p>Open a PDF to start marking up, or reopen a .planmark file.</p>
            <button className="pm-btn pm-empty-open" onClick={handleOpenPdf}>
              Open PDF
            </button>
            <button className="pm-btn" onClick={handleOpenPlanmark}>
              Open .planmark
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
