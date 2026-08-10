// Mirrors lg::GateKind in core/logic.hpp. The order is part of the ABI.
export const GATE_KINDS = [
  "INPUT",
  "OUTPUT",
  "AND",
  "OR",
  "NOT",
  "NAND",
  "NOR",
  "XOR",
  "XNOR",
  "BUFFER",
  "CONST0",
  "CONST1",
] as const;

export type GateKind = (typeof GATE_KINDS)[number];

export function kindIndex(kind: GateKind): number {
  return GATE_KINDS.indexOf(kind);
}

/** Gates a student may place in the builder, in palette order. */
export const PALETTE: GateKind[] = [
  "INPUT",
  "OUTPUT",
  "AND",
  "OR",
  "NOT",
  "NAND",
  "NOR",
  "XOR",
  "XNOR",
];

export const KIND_BLURB: Record<string, string> = {
  AND: "1 only when every input is 1",
  OR: "1 when at least one input is 1",
  NOT: "inverts its single input",
  NAND: "AND followed by inversion",
  NOR: "OR followed by inversion",
  XOR: "1 when the inputs differ",
  XNOR: "1 when the inputs match",
  BUFFER: "passes its input through unchanged",
  INPUT: "a switch you can toggle",
  OUTPUT: "a lamp showing the result",
};
