import sprite from "@/lib/generated/sprite.json";

type Rect = { x: number; y: number; w: number; h: number };
const geo = sprite as { width: number; height: number; body: Rect[]; eyes: Rect[] };

/** The mascot. Geometry comes from the C++ core, so it is vector at any size. */
export default function Sprite({
  width,
  className,
}: {
  width: number;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      width={width}
      height={(width * geo.height) / geo.width}
      className={className}
      aria-hidden
      shapeRendering="crispEdges"
    >
      <g fill="var(--claude)">
        {geo.body.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />
        ))}
      </g>
      <g className="spriteEyes" fill="var(--ink)">
        {geo.eyes.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />
        ))}
      </g>
    </svg>
  );
}
