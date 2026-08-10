// Runs every catalogue entry through the C++ engine and writes
// lib/generated/circuits.json. Run with:  bun run scripts/generate.ts
//
// The output is committed, so neither the Next build nor CI needs emscripten,
// and lesson pages ship as plain static HTML with no runtime WASM.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOGUE, type Builder, type Spec } from "../lib/catalogue";
import { kindIndex, type GateKind } from "../lib/kinds";
import type { WasmCircuit } from "../lib/wasm/logicCore.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

// Only these need the IEC comparison rendering; everywhere else the site uses
// the IEEE distinctive shapes the IB expects.
const IEC_ALSO = new Set(["and2", "or2", "not1", "xor2"]);

const MAX_TRACE_INPUTS = 4;

const { default: createLogicCore } = await import("../lib/wasm/logicCore.js");
const core = await createLogicCore();

function materialise(spec: Spec): WasmCircuit {
  const c = new core.Circuit();
  if (spec.expr) {
    const err = core.buildFromExpression(c, spec.expr);
    if (err) throw new Error(`${spec.id}: ${err}`);
    return c;
  }
  if (!spec.build) throw new Error(`${spec.id}: needs either expr or build`);
  const b: Builder = {
    add: (kind: GateKind, label = kind) => c.addNode(kindIndex(kind), label),
    wire: (from, to, pin) => {
      if (!c.connect(from, to, pin)) {
        throw new Error(`${spec.id}: cannot wire ${from} -> ${to} pin ${pin}`);
      }
    },
  };
  spec.build(b);
  return c;
}

const out: Record<string, unknown> = {};

for (const spec of CATALOGUE) {
  const c = materialise(spec);
  const truthTable = JSON.parse(c.truthTable());
  const described = JSON.parse(c.describe());
  const inputCount = c.inputCount();

  const traces: Record<string, unknown> = {};
  // Keyed "from>to". Only single-bit flips, because that is the only kind of
  // change a reader can make by clicking one switch, and it keeps this from
  // growing as 4^n.
  const transitions: Record<string, unknown> = {};
  if (inputCount > 0 && inputCount <= MAX_TRACE_INPUTS) {
    for (let m = 0; m < 1 << inputCount; m++) {
      traces[String(m)] = JSON.parse(c.trace(m));
      for (let bit = 0; bit < inputCount; bit++) {
        const to = m ^ (1 << bit);
        transitions[`${m}>${to}`] = JSON.parse(c.traceFrom(m, to));
      }
    }
  }

  out[spec.id] = {
    id: spec.id,
    title: spec.title,
    caption: spec.caption ?? null,
    expr: spec.expr ?? null,
    cyclic: described.cyclic,
    nodes: described.nodes,
    geometry: JSON.parse(c.geometry(0)),
    geometryIec: IEC_ALSO.has(spec.id) ? JSON.parse(c.geometry(1)) : null,
    truthTable,
    traces,
    transitions,
  };

  const gates = described.nodes.filter(
    (n: { kind: string }) => !["INPUT", "OUTPUT"].includes(n.kind),
  ).length;
  console.log(
    `${spec.id.padEnd(22)} ${String(inputCount)} in  ${String(gates).padStart(2)} gates` +
      `${described.cyclic ? "  cyclic" : ""}`,
  );

  c.delete();
}

const target = join(root, "lib", "generated", "circuits.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out));
console.log(
  `\nwrote ${target} (${(JSON.stringify(out).length / 1024).toFixed(1)} kB, ${CATALOGUE.length} circuits)`,
);
