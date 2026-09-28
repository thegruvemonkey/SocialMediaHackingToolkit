import type { JSX } from 'react';

export type IconName =
  | 'select'
  | 'pen'
  | 'highlight'
  | 'cloud'
  | 'callout'
  | 'rect'
  | 'arrow'
  | 'text'
  | 'undo'
  | 'redo'
  | 'open'
  | 'openFile'
  | 'save'
  | 'prev'
  | 'next'
  | 'zoomIn'
  | 'zoomOut'
  | 'trash'
  | 'panel';

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function body(name: IconName): JSX.Element {
  switch (name) {
    case 'select':
      return <path {...S} d="M5 3l6 15 2-6 6-2z" />;
    case 'pen':
      return <path {...S} d="M4 20l4-1L19 8l-3-3L5 16z" />;
    case 'highlight':
      return (
        <>
          <path {...S} d="M4 19h16" />
          <path {...S} d="M6 15l7-9 5 3-7 9-5 1z" />
        </>
      );
    case 'cloud':
      return (
        <path
          {...S}
          d="M6 15a2.2 2.2 0 01-.2-4.3 3 3 0 015.6-1.4A2.6 2.6 0 0116 9a2.5 2.5 0 010 5z"
        />
      );
    case 'callout':
      return (
        <>
          <rect {...S} x="9" y="4" width="11" height="8" rx="1.5" />
          <path {...S} d="M11 12l-6 6 5-2" />
        </>
      );
    case 'rect':
      return <rect {...S} x="4" y="6" width="16" height="12" rx="1" />;
    case 'arrow':
      return (
        <>
          <path {...S} d="M4 20L20 4" />
          <path {...S} d="M13 4h7v7" />
        </>
      );
    case 'text':
      return (
        <>
          <path {...S} d="M5 6h14" />
          <path {...S} d="M12 6v13" />
        </>
      );
    case 'undo':
      return (
        <>
          <path {...S} d="M9 7L4 12l5 5" />
          <path {...S} d="M4 12h11a5 5 0 010 10h-2" />
        </>
      );
    case 'redo':
      return (
        <>
          <path {...S} d="M15 7l5 5-5 5" />
          <path {...S} d="M20 12H9a5 5 0 000 10h2" />
        </>
      );
    case 'open':
      return <path {...S} d="M3 7h6l2 2h10v9a2 2 0 01-2 2H3z" />;
    case 'openFile':
      return (
        <>
          <path {...S} d="M6 3h8l4 4v14H6z" />
          <path {...S} d="M14 3v4h4" />
        </>
      );
    case 'save':
      return (
        <>
          <path {...S} d="M5 3h11l3 3v15H5z" />
          <path {...S} d="M8 3v6h7V3" />
          <rect {...S} x="8" y="13" width="8" height="6" />
        </>
      );
    case 'prev':
      return <path {...S} d="M15 5l-7 7 7 7" />;
    case 'next':
      return <path {...S} d="M9 5l7 7-7 7" />;
    case 'zoomIn':
      return (
        <>
          <circle {...S} cx="11" cy="11" r="6" />
          <path {...S} d="M20 20l-4-4M11 8v6M8 11h6" />
        </>
      );
    case 'zoomOut':
      return (
        <>
          <circle {...S} cx="11" cy="11" r="6" />
          <path {...S} d="M20 20l-4-4M8 11h6" />
        </>
      );
    case 'trash':
      return (
        <>
          <path {...S} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </>
      );
    case 'panel':
      return (
        <>
          <rect {...S} x="4" y="5" width="16" height="14" rx="1" />
          <path {...S} d="M14 5v14" />
        </>
      );
  }
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {body(name)}
    </svg>
  );
}
