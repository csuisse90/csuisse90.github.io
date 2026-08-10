/** Shared SVG building blocks for the figures. Everything is server-rendered
 *  static SVG: these are diagrams, not simulations. */

export const INK = "var(--ink)";
export const SOFT = "var(--ink-soft)";
export const FAINT = "var(--ink-faint)";
export const LINE = "var(--ice-deep)";
export const FILL = "var(--paper-lift)";
export const ACCENT = "var(--alarm)";
export const TEAL = "var(--teal)";

/** Shared drawing width. Figures are authored at their natural width and then
 *  centred inside this, so text is never scaled differently between diagrams —
 *  which is what made the lettering look inconsistent. */
export const CANVAS = 620;

export function Figure({
  title,
  meta,
  caption,
  width,
  height,
  children,
}: {
  title: string;
  meta?: string;
  caption?: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panelHead">
        <span>{title}</span>
        {meta && <span>{meta}</span>}
      </div>
      <div className="panelBody figureZoom" style={{ padding: "0.75rem" }} data-zoomable>
        <svg
          viewBox={`0 0 ${CANVAS} ${height}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          role="img"
          aria-label={title}
        >
          <defs>
            <marker
              id="arrowEnd"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={LINE} />
            </marker>
            <marker
              id="arrowAccent"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
            </marker>
          </defs>
          <g transform={`translate(${(CANVAS - width) / 2} 0)`}>{children}</g>
        </svg>
      </div>
      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}

export function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  accent = false,
  dashed = false,
  fontSize = 12,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  sub?: string;
  accent?: boolean;
  dashed?: boolean;
  fontSize?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={FILL}
        stroke={accent ? ACCENT : INK}
        strokeWidth={1.8}
        strokeDasharray={dashed ? "5 3" : undefined}
      />
      {label && (
        <text
          x={x + w / 2}
          y={sub ? y + h / 2 - 7 : y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize={fontSize}
          fill={accent ? ACCENT : INK}
        >
          {label}
        </text>
      )}
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize={9}
          fill={FAINT}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  accent = false,
  dashed = false,
  label,
  labelSide = "above",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  accent?: boolean;
  dashed?: boolean;
  label?: string;
  labelSide?: "above" | "below";
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={accent ? ACCENT : LINE}
        strokeWidth={1.8}
        strokeDasharray={dashed ? "4 3" : undefined}
        markerEnd={`url(#${accent ? "arrowAccent" : "arrowEnd"})`}
      />
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 + (labelSide === "above" ? -6 : 14)}
          textAnchor="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize={9}
          fill={FAINT}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function Caption({
  x,
  y,
  children,
  anchor = "middle",
  size = 10,
  colour = FAINT,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  colour?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily="var(--font-mono), monospace"
      fontSize={size}
      fill={colour}
    >
      {children}
    </text>
  );
}

/** A vertical stack of labelled bands, used for layer models. */
export function Stack({
  x,
  y,
  w,
  rowH,
  rows,
  highlight,
}: {
  x: number;
  y: number;
  w: number;
  rowH: number;
  rows: { label: string; note?: string }[];
  highlight?: number;
}) {
  return (
    <g>
      {rows.map((r, i) => (
        <g key={r.label}>
          <rect
            x={x}
            y={y + i * rowH}
            width={w}
            height={rowH}
            fill={highlight === i ? "rgba(211,58,28,0.08)" : FILL}
            stroke={INK}
            strokeWidth={1.4}
          />
          <text
            x={x + 10}
            y={y + i * rowH + rowH / 2}
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={11}
            fill={INK}
          >
            {r.label}
          </text>
          {r.note && (
            <text
              x={x + w - 10}
              y={y + i * rowH + rowH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={9}
              fill={FAINT}
            >
              {r.note}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
