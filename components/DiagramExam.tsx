"use client";

import { useState } from "react";

import Builder from "./Builder";
import type { DiagramTask } from "@/lib/diagramMark";

/** The questions. Each one states an expression, and the marker builds the
 *  model answer from that expression at marking time — so a question can never
 *  disagree with its own mark scheme. */
export const TASKS: DiagramTask[] = [
  {
    id: "and-or",
    prompt:
      "An alarm sounds when the door is open (A) and the system is armed (B), or when the panic button (C) is pressed. Draw the logic diagram.",
    expression: "(A AND B) OR C",
    inputs: ["A", "B", "C"],
    marks: 4,
    modelNote: "Two gates is the minimum here: nothing about this expression can be shared.",
  },
  {
    id: "nand-only",
    prompt:
      "Draw a circuit whose output is 1 exactly when A and B are different. Any gates you like.",
    expression: "A XOR B",
    inputs: ["A", "B"],
    marks: 3,
    modelNote:
      "One XOR is the tidy answer. Building it from AND, OR and NOT is also right and takes five gates — the marker accepts both, and tells you which you drew.",
  },
  {
    id: "de-morgan",
    prompt:
      "A pump runs unless both float switches (A and B) are high. Draw it, then check your truth table against NOT (A AND B).",
    expression: "NOT (A AND B)",
    inputs: ["A", "B"],
    marks: 3,
    modelNote:
      "A single NAND does it. If you drew NOT A OR NOT B you have just proved De Morgan's law by hand.",
  },
  {
    id: "majority",
    prompt:
      "Three sensors, A, B and C. The output is 1 when at least two of them are 1. Draw the diagram.",
    expression: "(A AND B) OR (A AND C) OR (B AND C)",
    inputs: ["A", "B", "C"],
    marks: 5,
    modelNote:
      "Three ANDs and two ORs. There is no smaller sum-of-products form — a Karnaugh map gives you exactly these three pairs.",
  },
  {
    id: "carry",
    prompt:
      "The carry-out of a full adder. It is 1 when at least two of A, B and the carry-in C are 1. Draw it with the fewest gates you can.",
    expression: "(A AND B) OR (C AND (A XOR B))",
    inputs: ["A", "B", "C"],
    marks: 5,
    modelNote:
      "This is the shape real adders use, because the A XOR B is already computed for the sum — the carry logic gets it for free.",
  },
];

export default function DiagramExam() {
  const [at, setAt] = useState(0);
  const task = TASKS[at];

  return (
    <>
      <div className="machineBar">
        {TASKS.map((t, i) => (
          <button
            key={t.id}
            className="paletteBtn"
            style={{ width: "auto", margin: 0, opacity: i === at ? 1 : 0.55 }}
            onClick={() => setAt(i)}
          >
            {i + 1}
          </button>
        ))}
        <span className="machineCount">
          question {at + 1} of {TASKS.length} · {task.marks} marks
        </span>
      </div>

      {/* Keyed on the task, so switching questions gives a fresh canvas rather
          than the previous answer with the wrong prompt above it. */}
      <Builder key={task.id} task={task} />
    </>
  );
}
