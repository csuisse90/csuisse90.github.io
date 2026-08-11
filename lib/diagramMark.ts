// Marking a logic diagram the way a human would: does it do the right thing,
// and is it built the right way?
//
// Both questions are answered from the circuit itself, never from a picture.
// The first is a truth-table comparison. The second is a graph isomorphism
// test, which sounds heavier than it is: a combinational circuit is a DAG whose
// leaves are named inputs, so giving every node a canonical signature built
// from its kind and its sorted children decides isomorphism outright. Sorting
// is what makes "A AND B" and "B AND A" the same diagram, which they are.

import type { CircuitData } from "./types";

export type DiagramTask = {
  id: string;
  /** What the student is asked to draw. */
  prompt: string;
  /** The Boolean expression the diagram must implement. */
  expression: string;
  /** The inputs it must use, in the order the truth table should show them. */
  inputs: string[];
  marks: number;
  /** Shown only after marking, so it cannot be copied first. */
  modelNote?: string;
};

export type Mark = {
  awarded: number;
  outOf: number;
  /** One line per mark point, the way an examiner's scheme reads. */
  points: { got: boolean; text: string }[];
  /** Longer feedback, when there is something worth explaining. */
  notes: string[];
};

type Nodes = CircuitData["nodes"];

/** A canonical name for what a node computes, structurally. Two diagrams that
 *  produce the same set of output signatures are the same diagram drawn twice.
 *  Cycles cannot appear in the questions here, but a depth bound keeps a
 *  student's accidental loop from hanging the page. */
function signature(nodes: Nodes, id: number, depth = 0): string {
  const node = nodes[id];
  if (!node || depth > 64) return "?";
  if (node.kind === "INPUT") return node.label || "?";
  const parts = node.src.map((s) => (s < 0 ? "-" : signature(nodes, s, depth + 1)));
  if (node.kind === "OUTPUT" || node.kind === "NOT") return `${node.kind}(${parts.join(",")})`;
  // Commutative gates: order the operands so that swapping two wires does not
  // make it a different answer, because on paper it would not.
  return `${node.kind}(${[...parts].sort().join(",")})`;
}

/** The signatures of the circuit's outputs, sorted. */
export function structureOf(data: CircuitData): string[] {
  return data.nodes
    .map((n, i) => (n.kind === "OUTPUT" ? signature(data.nodes, i) : null))
    .filter((s): s is string => s !== null)
    .sort();
}

/** Every gate used, counted by kind. Inputs and outputs are not gates. */
export function gateCounts(data: CircuitData): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of data.nodes) {
    if (n.kind === "INPUT" || n.kind === "OUTPUT") continue;
    out.set(n.kind, (out.get(n.kind) ?? 0) + 1);
  }
  return out;
}

function describeGates(counts: Map<string, number>): string {
  if (!counts.size) return "no gates";
  return [...counts.entries()]
    .sort()
    .map(([kind, n]) => `${n} ${kind}`)
    .join(", ");
}

/** Reads a truth table into a map from the input pattern to the output bits,
 *  keyed by input name so a different column order is not a different answer. */
function rowsOf(data: CircuitData, inputs: string[]): Map<string, string> | null {
  const table = data.truthTable;
  const order = inputs.map((name) => table.inputs.indexOf(name));
  if (order.some((i) => i < 0)) return null;

  const out = new Map<string, string>();
  for (const row of table.rows) {
    const key = order.map((i) => row.in[i]).join("");
    out.set(key, row.out);
  }
  return out;
}

/** Marks a student's circuit against the model, and says why. */
export function markDiagram(task: DiagramTask, student: CircuitData, model: CircuitData): Mark {
  const points: { got: boolean; text: string }[] = [];
  const notes: string[] = [];

  // One mark for the shape of the thing: the right inputs, and an output.
  const studentInputs = student.nodes.filter((n) => n.kind === "INPUT").map((n) => n.label).sort();
  const wanted = [...task.inputs].sort();
  const hasInputs =
    studentInputs.length === wanted.length && studentInputs.every((n, i) => n === wanted[i]);
  const hasOutput = student.nodes.some((n) => n.kind === "OUTPUT");
  points.push({
    got: hasInputs && hasOutput,
    text: `inputs ${task.inputs.join(", ")} and one output, all connected`,
  });
  if (!hasInputs) {
    notes.push(
      `The question asks for ${task.inputs.join(" and ")}. Your diagram has ` +
        (studentInputs.length ? studentInputs.join(", ") : "no inputs") + ".",
    );
  }

  // The function. Rows are compared one at a time so partial work can be given
  // partial credit, which is what a mark scheme does.
  const studentRows = rowsOf(student, task.inputs);
  const modelRows = rowsOf(model, task.inputs);
  let correctRows = 0;
  let totalRows = 0;
  if (studentRows && modelRows) {
    for (const [key, expected] of modelRows) {
      totalRows++;
      if (studentRows.get(key) === expected) correctRows++;
    }
  }
  const functionRight = totalRows > 0 && correctRows === totalRows;

  const functionMarks = Math.max(1, task.marks - 2);
  const earnedFunction = totalRows
    ? Math.round((correctRows / totalRows) * functionMarks)
    : 0;
  points.push({
    got: functionRight,
    text: `the output is right for all ${totalRows || "the"} input combinations`,
  });
  if (totalRows && !functionRight) {
    const wrong: string[] = [];
    for (const [key, expected] of modelRows!) {
      const got = studentRows!.get(key);
      if (got !== expected) wrong.push(`${key} → ${got ?? "?"}, should be ${expected}`);
    }
    notes.push(
      `${correctRows} of ${totalRows} rows are right. Wrong: ${wrong.slice(0, 4).join("; ")}` +
        (wrong.length > 4 ? `, and ${wrong.length - 4} more.` : "."),
    );
  }

  // The structure. Same function, different drawing, is still worth something —
  // and a diagram identical to the model is worth saying so.
  const same = structureOf(student);
  const target = structureOf(model);
  const isomorphic = same.length === target.length && same.every((s, i) => s === target[i]);

  const studentGates = gateCounts(student);
  const modelGates = gateCounts(model);
  const studentTotal = [...studentGates.values()].reduce((a, b) => a + b, 0);
  const modelTotal = [...modelGates.values()].reduce((a, b) => a + b, 0);

  const structureMarks = task.marks >= 3 ? 1 : 0;
  let earnedStructure = 0;
  if (structureMarks) {
    // The mark is for a diagram that is no more complicated than the model, and
    // is only given when the thing actually works.
    const lean = functionRight && studentTotal <= modelTotal;
    earnedStructure = lean ? structureMarks : 0;
    points.push({
      got: lean,
      text: `drawn with no more gates than it needs (${modelTotal})`,
    });
  }

  if (isomorphic) {
    notes.push("This is the model answer, gate for gate — including where the wires go.");
  } else if (functionRight) {
    notes.push(
      `Correct, and drawn differently from the model: you used ${describeGates(studentGates)}, ` +
        `the model uses ${describeGates(modelGates)}. Both are right; the smaller one is what a ` +
        `Karnaugh map would give you.`,
    );
  }

  const shapeMark = hasInputs && hasOutput ? 1 : 0;
  const awarded = Math.min(task.marks, shapeMark + earnedFunction + earnedStructure);
  return { awarded, outOf: task.marks, points, notes };
}
