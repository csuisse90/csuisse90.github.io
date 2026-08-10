"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CircuitData, Geometry, Trace } from "@/lib/types";

type Props = {
  data: CircuitData;
  /** Let the reader toggle the input switches. */
  interactive?: boolean;
  /** Show the transport bar and animate propagation one gate delay at a time. */
  animate?: boolean;
  initialMask?: number;
  /** Draw the IEC rectangular symbols instead of the IEEE shapes. */
  iec?: boolean;
  maxHeight?: number;
  /** Supply both to drive the input state from outside, e.g. from a truth table. */
  mask?: number;
  onMaskChange?: (mask: number) => void;

  /* ---- builder mode ---- */
  /** Show pin targets and allow gates to be dragged. */
  editable?: boolean;
  onNodeMove?: (id: number, x: number, y: number) => void;
  onPinClick?: (side: "out" | "in", nodeId: number, pin: number) => void;
  selected?: number | null;
  onSelect?: (id: number | null) => void;
  /** Pin currently waiting for its other end. */
  armed?: { side: "out" | "in"; nodeId: number; pin: number } | null;
};

const SPEEDS = [
  { label: "1×", ms: 90 },
  { label: "¼×", ms: 360 },
  { label: "1/16×", ms: 1400 },
];

export default function CircuitView({
  data,
  interactive = true,
  animate = false,
  initialMask = 0,
  iec = false,
  maxHeight = 320,
  mask: controlledMask,
  onMaskChange,
  editable = false,
  onNodeMove,
  onPinClick,
  selected = null,
  onSelect,
  armed = null,
}: Props) {
  const geo: Geometry = (iec && data.geometryIec) || data.geometry;
  const inputs = useMemo(
    () => geo.nodes.filter((n) => n.kind === "INPUT"),
    [geo],
  );

  const [ownMask, setOwnMask] = useState(initialMask);
  const [fromMask, setFromMask] = useState<number | null>(null);
  const mask = controlledMask ?? ownMask;
  const setMask = useCallback(
    (next: number | ((m: number) => number)) => {
      const value = typeof next === "function" ? next(mask) : next;
      setFromMask(mask);
      if (onMaskChange) onMaskChange(value);
      if (controlledMask === undefined) setOwnMask(value);
    },
    [mask, onMaskChange, controlledMask],
  );
  const [speedIdx, setSpeedIdx] = useState(1);
  const [step, setStep] = useState<number>(0);
  const [playing, setPlaying] = useState(false);

  // A recorded transition from the previous switch position shows signals
  // actually changing, hazards included; the cold trace only shows them
  // arriving out of the unknown state.
  const trace: Trace | undefined =
    (fromMask !== null && data.transitions?.[`${fromMask}>${mask}`]) ||
    data.traces[String(mask)];
  const lastStep = trace ? trace.steps.length - 1 : 0;

  // A figure loads showing its settled answer — starting mid-propagation just
  // looks broken. The wavefront plays only once the reader has actually
  // changed something.
  useEffect(() => {
    if (!animate || fromMask === null) {
      setStep(lastStep);
      setPlaying(false);
      return;
    }
    setStep(0);
    setPlaying(true);
  }, [mask, animate, lastStep, fromMask]);

  useEffect(() => {
    if (!playing || !trace) return;
    if (step >= lastStep) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), SPEEDS[speedIdx].ms);
    return () => clearTimeout(id);
  }, [playing, step, lastStep, speedIdx, trace]);

  const signals = trace?.steps[Math.min(step, lastStep)] ?? "";
  const prevSignals = trace?.steps[Math.max(0, Math.min(step, lastStep) - 1)] ?? signals;

  const levelOf = useCallback(
    (nodeId: number): "0" | "1" | "x" => {
      const n = geo.nodes[nodeId];
      if (n?.kind === "INPUT") {
        const i = inputs.findIndex((x) => x.id === nodeId);
        return ((mask >> (inputs.length - 1 - i)) & 1) === 1 ? "1" : "0";
      }
      const c = signals[nodeId];
      return c === "1" ? "1" : c === "0" ? "0" : "x";
    },
    [geo, inputs, mask, signals],
  );

  const toggle = (nodeId: number) => {
    if (!interactive) return;
    const i = inputs.findIndex((x) => x.id === nodeId);
    if (i < 0) return;
    setMask((m) => m ^ (1 << (inputs.length - 1 - i)));
  };

  const glitching = new Set(trace?.glitches ?? []);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  const beginDrag = (e: React.PointerEvent, id: number, nx: number, ny: number) => {
    if (!editable) return;
    e.stopPropagation();
    const p = toSvg(e);
    dragRef.current = { id, dx: p.x - nx, dy: p.y - ny };
    onSelect?.(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  return (
    <div className="panel">
      <div className="panelHead">
        <span>{data.title}</span>
        <span>
          {iec ? "IEC 60617-12" : "IEEE Std 91-1984"}
          {data.cyclic ? " · sequential" : ""}
        </span>
      </div>

      <div className="panelBody" style={{ padding: "0.5rem" }}>
        <svg
          ref={svgRef}
          className="circuit"
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          style={{ maxHeight }}
          role="img"
          aria-label={`Logic diagram: ${data.title}`}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d || !onNodeMove) return;
            const p = toSvg(e);
            onNodeMove(d.id, p.x - d.dx, p.y - d.dy);
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerLeave={() => {
            dragRef.current = null;
          }}
          onClick={() => editable && onSelect?.(null)}
        >
          {geo.wires.map((w, i) => {
            const level = levelOf(w.from);
            const pts = w.points.map((p) => p.join(",")).join(" ");
            const changed = signals[w.from] !== prevSignals[w.from];
            return (
              <g key={i}>
                <polyline
                  className={`wire${changed && animate ? " arrived" : ""}`}
                  key={`${i}-${changed ? step : "s"}`}
                  data-level={level}
                  points={pts}
                />
                {level === "1" && <polyline className="wireFlow" points={pts} />}
              </g>
            );
          })}

          {geo.nodes.map((n) => {
            const level = levelOf(n.id);

            if (n.kind === "INPUT" || n.kind === "OUTPUT") {
              return (
                <g
                  key={n.id}
                  className={`terminal${selected === n.id ? " selected" : ""}`}
                  data-level={level}
                  onPointerDown={(e) => beginDrag(e, n.id, n.x, n.y)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(n.id);
                  }}
                  role={n.kind === "INPUT" && interactive ? "button" : undefined}
                  tabIndex={n.kind === "INPUT" && interactive ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(n.id);
                    }
                  }}
                  aria-label={
                    n.kind === "INPUT"
                      ? `Input ${n.label}, currently ${level}`
                      : `Output ${n.label}, currently ${level}`
                  }
                >
                  <title>
                    {n.kind === "INPUT"
                      ? `${n.label} — click to toggle`
                      : `${n.label} = ${level}`}
                  </title>
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={0} />
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 0.5}>
                    {n.label}
                  </text>
                  <text
                    className="pinName"
                    x={n.kind === "INPUT" ? n.x - 8 : n.x + n.w + 8}
                    y={n.y + n.h / 2}
                    textAnchor={n.kind === "INPUT" ? "end" : "start"}
                  >
                    {level}
                  </text>
                </g>
              );
            }

            return (
              <g
                key={n.id}
                className={`node${glitching.has(n.id) ? " glitching" : ""}${
                  selected === n.id ? " selected" : ""
                }`}
                onPointerDown={(e) => beginDrag(e, n.id, n.x, n.y)}
              >
                <title>{`${n.kind} gate — output ${level}`}</title>
                <g transform={`translate(${n.x} ${n.y})`}>
                  <path className="gateBody" d={n.path} />
                  {n.extraArc && <path className="gateArc" d={n.extraArc} />}
                </g>
                {n.bubble && (
                  <circle
                    className="gateBubble"
                    cx={n.bubble.cx}
                    cy={n.bubble.cy}
                    r={n.bubble.r}
                  />
                )}
                {n.iecLabel && (
                  <text
                    className="iecName"
                    x={n.x + n.w / 2}
                    y={n.y + n.h / 2}
                  >
                    {n.iecLabel}
                  </text>
                )}
              </g>
            );
          })}

          {editable &&
            geo.nodes.map((n) => (
              <g key={`pins-${n.id}`}>
                {n.kind !== "OUTPUT" && (
                  <circle
                    className={`pinDot${
                      armed?.side === "out" && armed.nodeId === n.id ? " armed" : ""
                    }`}
                    cx={n.out.x}
                    cy={n.out.y}
                    r={4}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinClick?.("out", n.id, 0);
                    }}
                  >
                    <title>Output pin</title>
                  </circle>
                )}
                {n.in.map((p, pin) => (
                  <circle
                    key={pin}
                    className={`pinDot${
                      armed?.side === "in" &&
                      armed.nodeId === n.id &&
                      armed.pin === pin
                        ? " armed"
                        : ""
                    }`}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinClick?.("in", n.id, pin);
                    }}
                  >
                    <title>{`Input pin ${pin + 1}`}</title>
                  </circle>
                ))}
              </g>
            ))}
        </svg>
      </div>

      {animate && trace && (
        <div className="transport">
          <span className="clockDot" data-ticking={playing} />
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => {
              if (step >= lastStep) setStep(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : step >= lastStep ? "Replay" : "Run"}
          </button>
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            ◀ Step
          </button>
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.min(lastStep, s + 1));
            }}
          >
            Step ▶
          </button>

          <span>Speed</span>
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              className="paletteBtn"
              style={{
                width: "auto",
                margin: 0,
                borderColor: i === speedIdx ? "var(--alarm)" : undefined,
                color: i === speedIdx ? "var(--alarm)" : undefined,
              }}
              onClick={() => setSpeedIdx(i)}
            >
              {s.label}
            </button>
          ))}

          <span className="stepBar" aria-hidden>
            {trace.steps.map((_, i) => (
              <i key={i} data-done={i <= step} data-now={i === step} />
            ))}
          </span>

          <span>
            delay {step}/{trace.settled} · settles in {trace.settled} gate
            {trace.settled === 1 ? "" : "s"}
          </span>

          {trace.glitches.length > 0 && (
            <span style={{ color: "var(--alarm)" }}>
              glitch on {trace.glitches.length} node
              {trace.glitches.length === 1 ? "" : "s"}
            </span>
          )}
          {!trace.stable && (
            <span style={{ color: "var(--alarm)" }}>never settles</span>
          )}
        </div>
      )}

      {data.caption && <p className="caption">{data.caption}</p>}
    </div>
  );
}
