export type Point = [number, number];

export type GeoPin = { x: number; y: number; src: number };

export type GeoNode = {
  id: number;
  kind: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  path: string;
  extraArc?: string;
  iecLabel?: string;
  bubble: { cx: number; cy: number; r: number } | null;
  out: { x: number; y: number };
  in: GeoPin[];
};

export type Geometry = {
  width: number;
  height: number;
  bubbleR: number;
  nodes: GeoNode[];
  wires: { from: number; to: number; pin: number; points: Point[] }[];
};

export type TruthTable = {
  inputs: string[];
  outputs: string[];
  truncated: boolean;
  rows: { in: string; out: string }[];
};

/** One entry per unit gate delay: the whole propagation wavefront. */
export type Trace = {
  steps: string[];
  settled: number;
  stable: boolean;
  glitches: number[];
};

export type CircuitData = {
  id: string;
  title: string;
  caption: string | null;
  expr: string | null;
  cyclic: boolean;
  nodes: { kind: string; label: string; src: number[] }[];
  geometry: Geometry;
  geometryIec: Geometry | null;
  truthTable: TruthTable;
  traces: Record<string, Trace>;
  /** Keyed "from>to" for single-bit input flips. */
  transitions: Record<string, Trace>;
};

export type MinTerm = {
  latex: string;
  plain: string;
  literals: number;
  covers: number[];
};

export type Minimisation = {
  constantZero: boolean;
  constantOne: boolean;
  primes: MinTerm[];
  terms: MinTerm[];
  canonicalLatex: string;
  sopLatex: string;
  literalCount: number;
  canonicalLiteralCount: number;
};

export type ExpressionAnalysis =
  | { ok: false; error: string; errorPos: number }
  | {
      ok: true;
      latex: string;
      vars: string[];
      rows: { in: string; out: string }[];
      minterms: number[];
      minimised: Minimisation;
      gateCount: number;
    };
