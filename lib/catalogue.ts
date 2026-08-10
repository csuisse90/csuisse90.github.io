// Build-time only. Every fixed diagram on the site is declared here once, then
// scripts/generate.ts runs each one through the C++ engine and writes
// lib/generated/circuits.json. Pages read that JSON; they never build circuits
// themselves, so lesson figures need no WASM at runtime.
import type { GateKind } from "./kinds";

export type Builder = {
  add: (kind: GateKind, label?: string) => number;
  wire: (from: number, to: number, pin: number) => void;
};

export type Spec = {
  id: string;
  title: string;
  /** Shown under the figure. Plain prose; no LaTeX. */
  caption?: string;
  /** Either an expression to compile, or an explicit gate-level build. */
  expr?: string;
  build?: (b: Builder) => void;
  /** Output column headings, when the defaults are not wanted. */
  note?: string;
};

const gate =
  (kind: GateKind, aLabel = "A", bLabel = "B"): Spec["build"] =>
  (b) => {
    const a = b.add("INPUT", aLabel);
    const bb = b.add("INPUT", bLabel);
    const g = b.add(kind, kind);
    const q = b.add("OUTPUT", "Q");
    b.wire(a, g, 0);
    b.wire(bb, g, 1);
    b.wire(g, q, 0);
  };

export const CATALOGUE: Spec[] = [
  // ---- the seven gates -------------------------------------------------
  {
    id: "and2",
    title: "AND",
    build: gate("AND"),
    caption:
      "The output is 1 only when both inputs are 1. Think of two switches in series: the current gets through only if both are closed.",
  },
  {
    id: "or2",
    title: "OR",
    build: gate("OR"),
    caption:
      "The output is 1 when at least one input is 1. Two switches in parallel: either one on its own is enough.",
  },
  {
    id: "not1",
    title: "NOT",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const g = b.add("NOT", "NOT");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g, 0);
      b.wire(g, q, 0);
    },
    caption:
      "One input, one output, and the output is always the opposite. Also called an inverter.",
  },
  {
    id: "nand2",
    title: "NAND",
    build: gate("NAND"),
    caption:
      "AND with the answer flipped. Note the bubble on the nose of the symbol: that bubble is the inversion.",
  },
  {
    id: "nor2",
    title: "NOR",
    build: gate("NOR"),
    caption: "OR with the answer flipped. Output is 1 only when both inputs are 0.",
  },
  {
    id: "xor2",
    title: "XOR",
    build: gate("XOR"),
    caption:
      "Exclusive OR: 1 when the inputs are different. The extra curved line at the back is what separates it from OR.",
  },
  {
    id: "xnor2",
    title: "XNOR",
    build: gate("XNOR"),
    caption:
      "XOR with the answer flipped, so it is 1 when the inputs are the same. A one-bit equality test.",
  },
  {
    id: "and3",
    title: "Three-input AND",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const c = b.add("INPUT", "C");
      const g = b.add("AND", "AND");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g, 0);
      b.wire(bb, g, 1);
      b.wire(c, g, 2);
      b.wire(g, q, 0);
    },
    caption:
      "Three inputs means eight rows, and only the very last one gives a 1. Three inputs is the most the syllabus asks for.",
  },
  {
    id: "or3",
    title: "Three-input OR",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const c = b.add("INPUT", "C");
      const g = b.add("OR", "OR");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g, 0);
      b.wire(bb, g, 1);
      b.wire(c, g, 2);
      b.wire(g, q, 0);
    },
    caption: "Only the all-zeros row gives a 0. Every other row gives a 1.",
  },

  // ---- De Morgan -------------------------------------------------------
  {
    id: "demorgan-nand",
    title: "NOT (A AND B)",
    expr: "(A.B)'",
    caption: "Invert the result of the AND.",
  },
  {
    id: "demorgan-orNots",
    title: "(NOT A) OR (NOT B)",
    expr: "A' + B'",
    caption:
      "Invert each input first, then OR them. Compare the output column with the one above: they are identical.",
  },
  {
    id: "demorgan-nor",
    title: "NOT (A OR B)",
    expr: "(A+B)'",
    caption: "Invert the result of the OR.",
  },
  {
    id: "demorgan-andNots",
    title: "(NOT A) AND (NOT B)",
    expr: "A'.B'",
    caption:
      "Invert each input first, then AND them. Again the output column matches the one above.",
  },

  // ---- universality of NAND and NOR -----------------------------------
  {
    id: "not-from-nand",
    title: "NOT built from NAND",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const g = b.add("NAND", "NAND");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g, 0);
      b.wire(a, g, 1);
      b.wire(g, q, 0);
    },
    caption: "Tie both inputs of a NAND together and it behaves as an inverter.",
  },
  {
    id: "and-from-nand",
    title: "AND built from NAND",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const g1 = b.add("NAND", "NAND");
      const g2 = b.add("NAND", "NAND");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g1, 0);
      b.wire(bb, g1, 1);
      b.wire(g1, g2, 0);
      b.wire(g1, g2, 1);
      b.wire(g2, q, 0);
    },
    caption: "NAND then invert. The second NAND is wired as an inverter.",
  },
  {
    id: "or-from-nand",
    title: "OR built from NAND",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const na = b.add("NAND", "NAND");
      const nb = b.add("NAND", "NAND");
      const g = b.add("NAND", "NAND");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, na, 0);
      b.wire(a, na, 1);
      b.wire(bb, nb, 0);
      b.wire(bb, nb, 1);
      b.wire(na, g, 0);
      b.wire(nb, g, 1);
      b.wire(g, q, 0);
    },
    caption:
      "Invert both inputs, then NAND them. This is De Morgan's law turned into hardware.",
  },
  {
    id: "not-from-nor",
    title: "NOT built from NOR",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const g = b.add("NOR", "NOR");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g, 0);
      b.wire(a, g, 1);
      b.wire(g, q, 0);
    },
    caption: "The same trick works for NOR.",
  },
  {
    id: "or-from-nor",
    title: "OR built from NOR",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const g1 = b.add("NOR", "NOR");
      const g2 = b.add("NOR", "NOR");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g1, 0);
      b.wire(bb, g1, 1);
      b.wire(g1, g2, 0);
      b.wire(g1, g2, 1);
      b.wire(g2, q, 0);
    },
    caption: "NOR then invert.",
  },
  {
    id: "xor-from-nand",
    title: "XOR built from four NANDs",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const g1 = b.add("NAND", "NAND");
      const g2 = b.add("NAND", "NAND");
      const g3 = b.add("NAND", "NAND");
      const g4 = b.add("NAND", "NAND");
      const q = b.add("OUTPUT", "Q");
      b.wire(a, g1, 0);
      b.wire(bb, g1, 1);
      b.wire(a, g2, 0);
      b.wire(g1, g2, 1);
      b.wire(g1, g3, 0);
      b.wire(bb, g3, 1);
      b.wire(g2, g4, 0);
      b.wire(g3, g4, 1);
      b.wire(g4, q, 0);
    },
    caption:
      "Four NANDs and nothing else. Watch the propagation: the answer arrives three gate delays after the inputs change.",
  },

  // ---- worked examples -------------------------------------------------
  {
    id: "worked-ab-plus-c",
    title: "F = A·B + C",
    expr: "A.B + C",
    caption:
      "Read it inside out: AND first, then OR. The diagram has the same shape as the expression.",
  },
  {
    id: "worked-brackets",
    title: "F = (A + B)·NOT C",
    expr: "(A+B).C'",
    caption:
      "Brackets change the order, so the OR happens before the AND. Compare this with the diagram above.",
  },
  {
    id: "worked-alarm",
    title: "House alarm",
    expr: "A.(D + W)",
    caption:
      "A is the alarm being armed, D the door sensor, W the window sensor. The siren sounds only when the alarm is armed and at least one sensor has tripped.",
  },
  {
    id: "worked-majority",
    title: "Majority vote of three",
    expr: "A.B + B.C + A.C",
    caption:
      "Output is 1 when two or more inputs are 1. Used in safety-critical systems that run three copies of a computation and take the majority answer.",
  },
  {
    id: "worked-unsimplified",
    title: "Before simplification",
    expr: "A.B.C + A.B.C' + A.B'.C",
    caption: "Five gates and nine literals, straight from the truth table.",
  },
  {
    id: "worked-simplified",
    title: "After simplification",
    expr: "A.B + A.C",
    caption:
      "The same output column from four literals. Fewer gates means less silicon, less power and a shorter propagation delay.",
  },

  // ---- beyond the syllabus --------------------------------------------
  {
    id: "half-adder",
    title: "Half adder",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const x = b.add("XOR", "XOR");
      const n = b.add("AND", "AND");
      const s = b.add("OUTPUT", "S");
      const c = b.add("OUTPUT", "C");
      b.wire(a, x, 0);
      b.wire(bb, x, 1);
      b.wire(a, n, 0);
      b.wire(bb, n, 1);
      b.wire(x, s, 0);
      b.wire(n, c, 0);
    },
    caption:
      "Adds two single bits. S is the sum bit, C is the carry. 1 + 1 = 10 in binary, which is S=0 with C=1.",
  },
  {
    id: "full-adder",
    title: "Full adder",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const cin = b.add("INPUT", "Cin");
      const x1 = b.add("XOR", "XOR");
      const x2 = b.add("XOR", "XOR");
      const a1 = b.add("AND", "AND");
      const a2 = b.add("AND", "AND");
      const o1 = b.add("OR", "OR");
      const s = b.add("OUTPUT", "S");
      const co = b.add("OUTPUT", "Cout");
      b.wire(a, x1, 0);
      b.wire(bb, x1, 1);
      b.wire(x1, x2, 0);
      b.wire(cin, x2, 1);
      b.wire(x1, a1, 0);
      b.wire(cin, a1, 1);
      b.wire(a, a2, 0);
      b.wire(bb, a2, 1);
      b.wire(a1, o1, 0);
      b.wire(a2, o1, 1);
      b.wire(x2, s, 0);
      b.wire(o1, co, 0);
    },
    caption:
      "Two half adders plus an OR. The third input is the carry coming in from the column to the right, which is what lets these chain together into a full adder chain.",
  },
  {
    id: "mux21",
    title: "2-to-1 multiplexer",
    build: (b) => {
      const d0 = b.add("INPUT", "D0");
      const d1 = b.add("INPUT", "D1");
      const sel = b.add("INPUT", "S");
      const inv = b.add("NOT", "NOT");
      const a0 = b.add("AND", "AND");
      const a1 = b.add("AND", "AND");
      const o = b.add("OR", "OR");
      const q = b.add("OUTPUT", "Y");
      b.wire(sel, inv, 0);
      b.wire(d0, a0, 0);
      b.wire(inv, a0, 1);
      b.wire(d1, a1, 0);
      b.wire(sel, a1, 1);
      b.wire(a0, o, 0);
      b.wire(a1, o, 1);
      b.wire(o, q, 0);
    },
    caption:
      "A selector. S picks which of the two data inputs reaches the output, like a railway points switch.",
  },
  {
    id: "decoder24",
    title: "2-to-4 decoder",
    build: (b) => {
      const a = b.add("INPUT", "A");
      const bb = b.add("INPUT", "B");
      const na = b.add("NOT", "NOT");
      const nb = b.add("NOT", "NOT");
      const g0 = b.add("AND", "AND");
      const g1 = b.add("AND", "AND");
      const g2 = b.add("AND", "AND");
      const g3 = b.add("AND", "AND");
      const y0 = b.add("OUTPUT", "Y0");
      const y1 = b.add("OUTPUT", "Y1");
      const y2 = b.add("OUTPUT", "Y2");
      const y3 = b.add("OUTPUT", "Y3");
      b.wire(a, na, 0);
      b.wire(bb, nb, 0);
      b.wire(na, g0, 0);
      b.wire(nb, g0, 1);
      b.wire(na, g1, 0);
      b.wire(bb, g1, 1);
      b.wire(a, g2, 0);
      b.wire(nb, g2, 1);
      b.wire(a, g3, 0);
      b.wire(bb, g3, 1);
      b.wire(g0, y0, 0);
      b.wire(g1, y1, 0);
      b.wire(g2, y2, 0);
      b.wire(g3, y3, 0);
    },
    caption:
      "Exactly one output is 1 at a time, chosen by the two-bit number on A and B. This is how an address selects one memory row.",
  },
  {
    id: "sr-latch",
    title: "SR latch (NOR)",
    build: (b) => {
      const s = b.add("INPUT", "S");
      const r = b.add("INPUT", "R");
      const n1 = b.add("NOR", "NOR");
      const n2 = b.add("NOR", "NOR");
      const q = b.add("OUTPUT", "Q");
      const qn = b.add("OUTPUT", "Q'");
      b.wire(r, n1, 0);
      b.wire(n2, n1, 1);
      b.wire(n1, n2, 0);
      b.wire(s, n2, 1);
      b.wire(n1, q, 0);
      b.wire(n2, qn, 0);
    },
    caption:
      "Each gate feeds the other, so the circuit remembers. With S=R=0 the output stays where it was, which is why 'x' appears rather than a fixed 0 or 1.",
    note: "cyclic",
  },

  // ---- hazards ---------------------------------------------------------
  {
    id: "static-hazard",
    title: "A static-1 hazard",
    expr: "A.B + A'.C",
    caption:
      "With B=1 and C=1 the output should stay at 1 whatever A does. Slow the clock right down and step through: the output dips to 0 for one gate delay as A falls, because the inverter arrives late.",
  },
];
