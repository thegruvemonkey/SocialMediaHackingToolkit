# PlanMark

An original **AEC PDF markup app** for desktop and the field — pen, cloud, callout
and more on top of construction drawings, saved as a portable `.planmark` bundle.
Inspired by the Bluebeam Revu *workflows*, built with our own UX and code. No
Bluebeam names, assets, or binaries are used.

> **Design goals**
> - Desktop = power. Mobile = field: offline-first, fat targets, dark UI.
> - Open a PDF in 2 taps. One toolbar. Autosave. Undo always visible.
> - Markup statuses, filter by author/status. No account for local files.

## First deliverable (this repo)

A runnable **desktop viewer** that:

- opens large PDFs with pan/zoom, page thumbnails, and bookmarks,
- places **pen, cloud, and callout** markups (plus highlight, box, arrow, text) as an
  **overlay** (markups are stored as JSON, the PDF is never flattened),
- shows a filterable **markup list** with per-markup **status** (author/status filter),
- **autosaves** to a `.planmark` file (a zip of the original PDF + `markups.json`) and
  reopens it losslessly, with **undo/redo** always available.

## Monorepo layout

```
packages/
  core/     # framework-agnostic: markup model, undo history, .planmark format
  ui/       # React components: PDF viewer + SVG markup layer, toolbar, list
apps/
  desktop/  # Electron + Vite + React shell
  mobile/   # (planned) React Native field app
  api/       # (planned) sync service
```

The `.planmark` file is a zip archive:

| Entry           | Contents                                              |
| --------------- | ----------------------------------------------------- |
| `document.pdf`  | the original PDF bytes (unmodified)                   |
| `markups.json`  | `{ version, markups: Markup[] }` overlay data         |
| `manifest.json` | format version, document name, page count, timestamps |

Markup coordinates are stored in **page space** (PDF points, top-left origin), so
they stay aligned at any zoom and on any device.

## Getting started

Requires Node 18.18+.

```bash
npm install
npm run dev          # launches the Electron desktop app (Vite dev server + Electron)
```

Then **Open PDF**, pick the Pen / Cloud / Callout tool, draw, and use **Save**
(`Ctrl/Cmd+S`). After the first save, edits autosave to the same `.planmark` file.
Reopen it any time with **Open .planmark**.

### Useful scripts

```bash
npm run typecheck                       # typecheck every workspace
npm run test --workspace @planmark/core # .planmark round-trip + undo/redo tests
npm run build --workspace @planmark/desktop  # production build (renderer + electron)
```

## Keyboard

| Shortcut              | Action            |
| --------------------- | ----------------- |
| `Ctrl/Cmd + S`        | Save `.planmark`  |
| `Ctrl/Cmd + Z`        | Undo              |
| `Ctrl/Cmd + Shift + Z`| Redo              |
| `Delete` / `Backspace`| Delete selection  |
| `Ctrl/Cmd + wheel`    | Zoom              |

## Roadmap

Built in order (this repo delivers stage 0–1 on desktop):

0. **Viewer** — large PDFs, pan/zoom, bookmarks, thumbnails. ✅
1. **Markups** — pen, highlight, arrow, line, polyline, rect, ellipse, cloud, callout,
   text, count, photo pin; overlay JSON; markup list. *(core model complete; pen,
   highlight, cloud, callout, box, arrow, text tools shipped)*
2. **Scale** — calibrate; length/area/perimeter/count; imperial + metric.
3. **Pages** — combine/extract/rotate/reorder; export flattened PDF + CSV summary.
4. **Tool sets** — My Tools; import/export JSON.
5. **Sync** — projects check-in/out; live sessions; offline queue.
6. **Field** — camera; offline checkout; one-tap status.

Out of MVP: CAD plugins, Batch Link, Dynamic Fill, Excel Quantity Link, OCR, 3D.

## License

MIT
