import { useEffect, useState, type JSX } from 'react';
import { getOutline, type OutlineNode, type PdfDocument } from './pdf';

function OutlineList({
  nodes,
  onNavigate,
  depth = 0,
}: {
  nodes: OutlineNode[];
  onNavigate: (pageNumber: number) => void;
  depth?: number;
}): JSX.Element {
  return (
    <ul className="pm-outline-list">
      {nodes.map((node, i) => (
        <li key={`${depth}-${i}`}>
          <button
            type="button"
            className="pm-outline-item"
            style={{ paddingLeft: 8 + depth * 12 }}
            disabled={node.pageNumber == null}
            onClick={() => node.pageNumber != null && onNavigate(node.pageNumber)}
          >
            {node.title || '(untitled)'}
          </button>
          {node.children.length > 0 ? (
            <OutlineList nodes={node.children} onNavigate={onNavigate} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Outline({
  doc,
  onNavigate,
}: {
  doc: PdfDocument;
  onNavigate: (pageNumber: number) => void;
}): JSX.Element {
  const [nodes, setNodes] = useState<OutlineNode[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutline(doc).then((n) => {
      if (!cancelled) setNodes(n);
    });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  if (nodes == null) return <p className="pm-side-empty">Loading bookmarks…</p>;
  if (nodes.length === 0) return <p className="pm-side-empty">No bookmarks in this PDF.</p>;
  return <OutlineList nodes={nodes} onNavigate={onNavigate} />;
}
