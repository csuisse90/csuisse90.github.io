"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CircuitView from "./CircuitView";
import TruthTable from "./TruthTable";
import { snapshot, useLogicCore } from "@/lib/live";
import { KIND_BLURB, PALETTE, kindIndex, type GateKind } from "@/lib/kinds";
import type { WasmCircuit } from "@/lib/wasm/logicCore.js";
import type { CircuitData } from "@/lib/types";

type Armed = { side: "out" | "in"; nodeId: number; pin: number } | null;

export default function Builder() {
  const core = useLogicCore();
  const circuit = useRef<WasmCircuit | null>(null);
  const [data, setData] = useState<CircuitData | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [armed, setArmed] = useState<Armed>(null);
  const [message, setMessage] = useState<string>("");

  const refresh = useCallback(() => {
    const c = circuit.current;
    if (!c) return;
    setData(c.nodeCount() ? snapshot(c, "Your circuit") : null);
  }, []);

  // Pin every node at its laid-out position, so adding a gate later never
  // shuffles the ones already on the canvas.
  const freezeLayout = useCallback(() => {
    const c = circuit.current;
    if (!c || !c.nodeCount()) return;
    const geo = JSON.parse(c.geometry(0));
    for (const n of geo.nodes) c.setPosition(n.id, n.x, n.y);
  }, []);

  useEffect(() => {
    if (!core || circuit.current) return;
    const c = new core.Circuit();
    circuit.current = c;
    // A starter circuit, so the canvas is never a blank stare.
    const a = c.addNode(kindIndex("INPUT"), "A");
    const b = c.addNode(kindIndex("INPUT"), "B");
    const g = c.addNode(kindIndex("AND"), "AND");
    const q = c.addNode(kindIndex("OUTPUT"), "Q");
    c.connect(a, g, 0);
    c.connect(b, g, 1);
    c.connect(g, q, 0);
    const geo = JSON.parse(c.geometry(0));
    for (const n of geo.nodes) c.setPosition(n.id, n.x, n.y);
    setData(snapshot(c, "Your circuit"));
  }, [core]);

  const nextLabel = (kind: GateKind) => {
    const c = circuit.current;
    if (!c) return kind;
    const described = JSON.parse(c.describe());
    const used = described.nodes.filter(
      (n: { kind: string }) => n.kind === kind,
    ).length;
    if (kind === "INPUT") return String.fromCharCode(65 + (used % 26));
    if (kind === "OUTPUT") return used === 0 ? "Q" : `Q${used}`;
    return kind;
  };

  const add = (kind: GateKind) => {
    const c = circuit.current;
    if (!c) return;
    if (kind === "INPUT" && c.inputCount() >= 4) {
      setMessage("Four inputs is the limit here — the truth table would get unreadable.");
      return;
    }
    setMessage("");
    c.addNode(kindIndex(kind), nextLabel(kind));
    freezeLayout();
    refresh();
  };

  const removeSelected = () => {
    const c = circuit.current;
    if (!c || selected === null) return;
    c.removeNode(selected);
    setSelected(null);
    setArmed(null);
    refresh();
  };

  const clearAll = () => {
    const c = circuit.current;
    if (!c) return;
    c.clear();
    setSelected(null);
    setArmed(null);
    setData(null);
    setMessage("");
  };

  const onPinClick = (side: "out" | "in", nodeId: number, pin: number) => {
    const c = circuit.current;
    if (!c) return;

    if (side === "in") {
      // Clicking a connected input pin with nothing armed detaches the wire.
      if (!armed) {
        c.disconnectPin(nodeId, pin);
        refresh();
        return;
      }
      if (armed.side !== "out") {
        setArmed({ side, nodeId, pin });
        return;
      }
      if (!c.connect(armed.nodeId, nodeId, pin)) {
        setMessage("That connection is not allowed.");
      } else {
        setMessage("");
      }
      setArmed(null);
      refresh();
      return;
    }

    if (armed?.side === "in") {
      if (!c.connect(nodeId, armed.nodeId, armed.pin)) {
        setMessage("That connection is not allowed.");
      } else {
        setMessage("");
      }
      setArmed(null);
      refresh();
      return;
    }
    setArmed({ side, nodeId, pin });
  };

  const move = (id: number, x: number, y: number) => {
    const c = circuit.current;
    if (!c) return;
    c.setPosition(id, Math.max(0, x), Math.max(0, y));
    refresh();
  };

  if (!core) {
    return (
      <p className="annotation">
        Loading the simulation engine…
      </p>
    );
  }

  return (
    <>
      <div className="builderShell">
        <div className="paletteCol">
          <div className="navHead" style={{ marginBottom: "0.4rem" }}>
            Place
          </div>
          {PALETTE.map((k) => (
            <button
              key={k}
              className="paletteBtn"
              onClick={() => add(k)}
              title={KIND_BLURB[k]}
            >
              {k}
            </button>
          ))}
          <div className="navHead" style={{ margin: "1rem 0 0.4rem" }}>
            Edit
          </div>
          <button
            className="paletteBtn"
            onClick={removeSelected}
            disabled={selected === null}
            style={{ opacity: selected === null ? 0.45 : 1 }}
          >
            Delete
          </button>
          <button className="paletteBtn" onClick={clearAll}>
            Clear all
          </button>
        </div>

        <div className="canvasWrap">
          {data ? (
            <CircuitView
              data={data}
              animate
              editable
              interactive
              maxHeight={460}
              selected={selected}
              onSelect={setSelected}
              onPinClick={onPinClick}
              onNodeMove={move}
              armed={armed}
            />
          ) : (
            <p className="annotation" style={{ margin: "2rem" }}>
              Empty canvas. Place an INPUT, a gate and an OUTPUT, then click an
              output pin followed by an input pin to wire them together.
            </p>
          )}
        </div>
      </div>

      <p className="annotation">
        <b>How to wire.</b> Click a small circle on the right of a gate, then a
        circle on the left of another. Click an input pin on its own to
        disconnect it. Drag any gate to move it. Click a switch to toggle it and
        watch the change travel through, one gate delay at a time.
        {armed && " — armed, now click the other end"}
        {message && ` — ${message}`}
      </p>

      {data && data.truthTable.rows.length > 0 && (
        <>
          <h3 className="display">The truth table your circuit produces</h3>
          <p className="prose">
            This is generated from the circuit itself, by running every possible
            input combination through it.
          </p>
          <TruthTable table={data.truthTable} showIndex />
        </>
      )}
    </>
  );
}
