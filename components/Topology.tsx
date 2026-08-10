/** Small static SVG diagrams of the network topologies. Server-rendered, no
 *  interactivity — these are figures, not simulations. */

type Kind = "star" | "bus" | "ring" | "mesh";

const NODE_R = 11;

function nodesOnCircle(count: number, cx: number, cy: number, r: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

function Node({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={NODE_R}
        fill="var(--paper-lift)"
        stroke="var(--ink)"
        strokeWidth={1.8}
      />
      {label && (
        <text
          x={x}
          y={y + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize={9}
          fill="var(--ink)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

const LINE = {
  stroke: "var(--ice-deep)",
  strokeWidth: 1.8,
  fill: "none" as const,
};

export default function Topology({ kind }: { kind: Kind }) {
  const W = 220;
  const H = 170;
  let body: React.ReactNode = null;

  if (kind === "star") {
    const ring = nodesOnCircle(5, W / 2, H / 2, 58);
    body = (
      <>
        {ring.map((p, i) => (
          <line key={i} x1={W / 2} y1={H / 2} x2={p.x} y2={p.y} {...LINE} />
        ))}
        {ring.map((p, i) => (
          <Node key={i} x={p.x} y={p.y} />
        ))}
        <rect
          x={W / 2 - 18}
          y={H / 2 - 12}
          width={36}
          height={24}
          fill="var(--paper-lift)"
          stroke="var(--ink)"
          strokeWidth={1.8}
        />
        <text
          x={W / 2}
          y={H / 2 + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize={8}
          fill="var(--ink)"
        >
          SW
        </text>
      </>
    );
  }

  if (kind === "bus") {
    const xs = [34, 76, 118, 160, 196];
    body = (
      <>
        <line x1={20} y1={H / 2} x2={W - 14} y2={H / 2} {...LINE} />
        {xs.map((x, i) => (
          <g key={i}>
            <line
              x1={x}
              y1={H / 2}
              x2={x}
              y2={i % 2 ? H / 2 + 34 : H / 2 - 34}
              {...LINE}
            />
            <Node x={x} y={i % 2 ? H / 2 + 34 : H / 2 - 34} />
          </g>
        ))}
      </>
    );
  }

  if (kind === "ring") {
    const ring = nodesOnCircle(6, W / 2, H / 2, 58);
    body = (
      <>
        {ring.map((p, i) => {
          const q = ring[(i + 1) % ring.length];
          return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...LINE} />;
        })}
        {ring.map((p, i) => (
          <Node key={i} x={p.x} y={p.y} />
        ))}
      </>
    );
  }

  if (kind === "mesh") {
    const ring = nodesOnCircle(5, W / 2, H / 2, 58);
    body = (
      <>
        {ring.flatMap((p, i) =>
          ring.slice(i + 1).map((q, j) => (
            <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...LINE} />
          )),
        )}
        {ring.map((p, i) => (
          <Node key={i} x={p.x} y={p.y} />
        ))}
      </>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`${kind} topology`}
    >
      {body}
    </svg>
  );
}
