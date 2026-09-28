import { clampPointToRect, statusDef, type Markup, type Point } from '@planmark/core';
import type { JSX } from 'react';
import { revisionCloudPath } from './cloud';

function pointsAttr(points: Point[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Shared <defs> (arrow head). Rendered once by MarkupCanvas. */
export function MarkupDefs(): JSX.Element {
  return (
    <defs>
      <marker
        id="pm-arrow"
        viewBox="0 0 10 10"
        refX="8.5"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        {/* context-stroke makes the head inherit the line's color. */}
        <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
      </marker>
    </defs>
  );
}

/**
 * Render one markup as SVG in page space. All geometry is in PDF points; the
 * parent <svg> viewBox scales it to screen, so stroke widths and font sizes
 * stay correct at any zoom.
 */
export function MarkupShape({ markup }: { markup: Markup }): JSX.Element | null {
  const m = markup;
  const common = { opacity: m.opacity };

  switch (m.type) {
    case 'pen':
      return (
        <polyline
          {...common}
          points={pointsAttr(m.points)}
          fill="none"
          stroke={m.color}
          strokeWidth={m.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );

    case 'highlight':
      return (
        <polyline
          points={pointsAttr(m.points)}
          fill="none"
          stroke={m.color}
          strokeWidth={m.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={m.opacity}
          style={{ mixBlendMode: 'multiply' }}
        />
      );

    case 'polyline':
      return (
        <polyline
          {...common}
          points={pointsAttr(m.points)}
          fill="none"
          stroke={m.color}
          strokeWidth={m.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );

    case 'line':
      return (
        <line
          {...common}
          x1={m.start.x}
          y1={m.start.y}
          x2={m.end.x}
          y2={m.end.y}
          stroke={m.color}
          strokeWidth={m.strokeWidth}
          strokeLinecap="round"
        />
      );

    case 'arrow':
      return (
        <line
          {...common}
          x1={m.start.x}
          y1={m.start.y}
          x2={m.end.x}
          y2={m.end.y}
          stroke={m.color}
          strokeWidth={m.strokeWidth}
          strokeLinecap="round"
          markerEnd="url(#pm-arrow)"
        />
      );

    case 'rect':
      return (
        <rect
          {...common}
          x={m.rect.x}
          y={m.rect.y}
          width={m.rect.width}
          height={m.rect.height}
          fill={m.fill ?? 'none'}
          stroke={m.color}
          strokeWidth={m.strokeWidth}
        />
      );

    case 'ellipse':
      return (
        <ellipse
          {...common}
          cx={m.rect.x + m.rect.width / 2}
          cy={m.rect.y + m.rect.height / 2}
          rx={m.rect.width / 2}
          ry={m.rect.height / 2}
          fill={m.fill ?? 'none'}
          stroke={m.color}
          strokeWidth={m.strokeWidth}
        />
      );

    case 'cloud':
      return (
        <path
          {...common}
          d={revisionCloudPath(m.rect, m.arc)}
          fill="none"
          stroke={m.color}
          strokeWidth={m.strokeWidth}
          strokeLinejoin="round"
        />
      );

    case 'callout': {
      const start = clampPointToRect(m.rect, m.target);
      return (
        <g {...common}>
          <line
            x1={start.x}
            y1={start.y}
            x2={m.target.x}
            y2={m.target.y}
            stroke={m.color}
            strokeWidth={m.strokeWidth}
            markerEnd="url(#pm-arrow)"
          />
          <rect
            x={m.rect.x}
            y={m.rect.y}
            width={m.rect.width}
            height={m.rect.height}
            rx={2}
            fill={m.fill}
            stroke={m.color}
            strokeWidth={m.strokeWidth}
          />
          <TextBlock
            x={m.rect.x}
            y={m.rect.y}
            width={m.rect.width}
            height={m.rect.height}
            text={m.text}
            fontSize={m.fontSize}
            color="#1a1a1a"
          />
        </g>
      );
    }

    case 'text':
      return (
        <g {...common}>
          {m.fill ? (
            <rect
              x={m.rect.x}
              y={m.rect.y}
              width={m.rect.width}
              height={m.rect.height}
              fill={m.fill}
            />
          ) : null}
          <TextBlock
            x={m.rect.x}
            y={m.rect.y}
            width={m.rect.width}
            height={m.rect.height}
            text={m.text}
            fontSize={m.fontSize}
            color={m.color}
          />
        </g>
      );

    case 'count':
      return (
        <g {...common}>
          <circle cx={m.at.x} cy={m.at.y} r={9} fill={m.color} stroke="#fff" strokeWidth={1} />
          <text
            x={m.at.x}
            y={m.at.y}
            fontSize={10}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="sans-serif"
          >
            {m.index}
          </text>
        </g>
      );

    case 'photo':
      return (
        <g {...common}>
          <path
            d={pinPath(m.at)}
            fill={m.color}
            stroke="#fff"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <circle cx={m.at.x} cy={m.at.y - 12} r={3.5} fill="#fff" />
        </g>
      );
  }
}

function TextBlock(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
}): JSX.Element {
  return (
    <foreignObject x={props.x} y={props.y} width={props.width} height={props.height}>
      <div
        // XHTML namespace is required for HTML inside SVG foreignObject.
        // eslint-disable-next-line react/no-unknown-property
        {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          padding: `${Math.max(2, props.fontSize * 0.25)}px`,
          fontSize: `${props.fontSize}px`,
          lineHeight: 1.25,
          fontFamily: 'system-ui, sans-serif',
          color: props.color,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {props.text}
      </div>
    </foreignObject>
  );
}

function pinPath(at: Point): string {
  // Teardrop pin with tip at `at`.
  const tipX = at.x;
  const tipY = at.y;
  const r = 8;
  const cy = tipY - 12;
  return [
    `M ${tipX} ${tipY}`,
    `C ${tipX - r} ${cy + 4} ${tipX - r} ${cy - r} ${tipX} ${cy - r}`,
    `C ${tipX + r} ${cy - r} ${tipX + r} ${cy + 4} ${tipX} ${tipY}`,
    'Z',
  ].join(' ');
}

/** Small colored dot for the status chip used in overlays. */
export function statusColor(status: Markup['status']): string {
  return statusDef(status).color;
}
