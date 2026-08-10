"use client";

import { useEffect, useState } from "react";
import createLogicCore, { type LogicCore, type WasmCircuit } from "./wasm/logicCore.js";
import type { CircuitData } from "./types";

// One module instance for the whole tab; instantiating wasm per component
// would be wasteful and the engine holds no global state.
let pending: Promise<LogicCore> | null = null;

export function useLogicCore(): LogicCore | null {
  const [core, setCore] = useState<LogicCore | null>(null);
  useEffect(() => {
    let alive = true;
    if (!pending) pending = createLogicCore();
    pending.then((c) => {
      if (alive) setCore(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return core;
}

const MAX_TRACE_INPUTS = 4;

/** Reads a live wasm circuit into the same shape the static pages use, so the
 *  builder and the lessons share one renderer. */
export function snapshot(c: WasmCircuit, title: string): CircuitData {
  const described = JSON.parse(c.describe());
  const inputCount = c.inputCount();
  const traces: CircuitData["traces"] = {};
  const transitions: CircuitData["transitions"] = {};

  if (inputCount > 0 && inputCount <= MAX_TRACE_INPUTS) {
    for (let m = 0; m < 1 << inputCount; m++) {
      traces[String(m)] = JSON.parse(c.trace(m));
      for (let bit = 0; bit < inputCount; bit++) {
        const to = m ^ (1 << bit);
        transitions[`${m}>${to}`] = JSON.parse(c.traceFrom(m, to));
      }
    }
  }

  return {
    id: "live",
    title,
    caption: null,
    expr: null,
    cyclic: described.cyclic,
    nodes: described.nodes,
    geometry: JSON.parse(c.geometry(0)),
    geometryIec: null,
    truthTable: JSON.parse(c.truthTable()),
    traces,
    transitions,
  };
}
