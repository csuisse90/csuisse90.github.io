"use client";

import { useEffect, useMemo, useState } from "react";
import CircuitView from "./CircuitView";
import TruthTable from "./TruthTable";
import { snapshot, useLogicCore } from "@/lib/live";
import { kindIndex, type GateKind } from "@/lib/kinds";
import type { CircuitData } from "@/lib/types";

/** Wrong gates that are plausibly wrong — the substitutions a tired person
 *  actually makes, not random ones. */
const CONFUSABLE: Partial<Record<string, GateKind[]>> = {
  AND: ["OR", "NAND"],
  OR: ["AND", "NOR", "XOR"],
  NAND: ["NOR", "AND"],
  NOR: ["NAND", "OR"],
  XOR: ["OR", "XNOR"],
  XNOR: ["XOR", "AND"],
  NOT: ["BUFFER"],
};

type Fault = { node: number; was: string; now: GateKind };

/** Rebuilds a circuit in the live engine from its node list, optionally with
 *  one gate replaced. The node list is all that is needed — geometry and
 *  traces are recomputed, so a faulty circuit is a first-class circuit. */
function build(
  core: NonNullable<ReturnType<typeof useLogicCore>>,
  nodes: CircuitData["nodes"],
  fault: Fault | null,
) {
  const c = new core.Circuit();
  nodes.forEach((n, i) => {
    const kind = fault && fault.node === i ? fault.now : (n.kind as GateKind);
    c.addNode(kindIndex(kind), n.label);
  });
  nodes.forEach((n, i) => {
    n.src.forEach((from, pin) => {
      if (from >= 0) c.connect(from, i, pin);
    });
  });
  return c;
}

export default function FaultFinder({ data }: { data: CircuitData }) {
  const core = useLogicCore();
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [mask, setMask] = useState(0);

  // Every fault that actually changes the truth table. A "fault" that makes no
  // observable difference is not a fault the student could ever find, so those
  // are filtered out here rather than frustrating someone later.
  const faults = useMemo(() => {
    if (!core) return [];
    const clean = build(core, data.nodes, null);
    const want = clean.truthTable();
    clean.delete();

    const found: Fault[] = [];
    data.nodes.forEach((n, i) => {
      for (const now of CONFUSABLE[n.kind] ?? []) {
        const broken = build(core, data.nodes, { node: i, was: n.kind, now });
        if (broken.truthTable() !== want) found.push({ node: i, was: n.kind, now });
        broken.delete();
      }
    });
    return found;
  }, [core, data.nodes]);

  const fault = faults.length ? faults[round % faults.length] : null;

  const broken: CircuitData | null = useMemo(() => {
    if (!core || !fault) return null;
    const c = build(core, data.nodes, fault);
    const shot = snapshot(c, `${data.title} — with a fault`);
    c.delete();
    return shot;
  }, [core, data.nodes, data.title, fault]);

  useEffect(() => {
    setGuess(null);
    setRevealed(false);
  }, [round]);

  if (!core) return <p className="annotation">Loading the engine…</p>;
  if (!fault || !broken) {
    return <p className="annotation">This circuit has no fault that would show up in its output.</p>;
  }

  // Which rows of the truth table give the game away.
  const wrongRows = data.truthTable.rows.filter(
    (row, i) => row.out !== broken.truthTable.rows[i]?.out,
  ).length;

  const gates = broken.geometry.nodes.filter((n) => !["INPUT", "OUTPUT"].includes(n.kind));
  const correct = guess === fault.node;

  return (
    <div className="fault">
      <div className="panel">
        <div className="panelHead">
          <span>Fault finding</span>
          <span>
            {wrongRows} of {data.truthTable.rows.length} rows wrong
          </span>
        </div>
        <div className="panelBody">
          <p className="prose" style={{ maxWidth: "none", marginBottom: "0.9rem" }}>
            One gate in this circuit is the wrong type. The wiring is correct and every other
            gate is correct. Toggle the inputs, compare what you get against what you should
            get, and work out which gate is lying.
          </p>

          <CircuitView
            data={broken}
            animate
            interactive
            mask={mask}
            onMaskChange={setMask}
            maxHeight={300}
          />

          <div className="faultGuess">
            <span className="mono faultAsk">Which gate is wrong?</span>
            {gates.map((g) => (
              <button
                key={g.id}
                className="paletteBtn"
                style={{ width: "auto", margin: 0 }}
                data-picked={guess === g.id}
                onClick={() => {
                  setGuess(g.id);
                  setRevealed(true);
                }}
                disabled={revealed}
              >
                {g.label || g.kind}
              </button>
            ))}
          </div>

          {revealed && (
            <div className="faultVerdict" data-correct={correct}>
              {correct ? (
                <p>
                  Found it. That gate should be <strong>{fault.was}</strong> and this circuit has
                  a <strong>{fault.now}</strong> there — which is why {wrongRows} row
                  {wrongRows === 1 ? "" : "s"} of the truth table came out wrong.
                </p>
              ) : (
                <p>
                  Not that one. The fault is at{" "}
                  <strong>
                    {broken.geometry.nodes.find((n) => n.id === fault.node)?.label ?? fault.was}
                  </strong>
                  : it should be <strong>{fault.was}</strong> and it is a{" "}
                  <strong>{fault.now}</strong>.
                </p>
              )}
              <button
                className="paletteBtn"
                style={{ width: "auto", margin: 0 }}
                onClick={() => setRound((r) => r + 1)}
              >
                Another fault
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="faultTables">
        <div>
          <div className="faultTableHead">What it should do</div>
          <TruthTable table={data.truthTable} activeMask={mask} />
        </div>
        <div>
          <div className="faultTableHead" data-bad>
            What it actually does
          </div>
          <TruthTable table={broken.truthTable} activeMask={mask} />
        </div>
      </div>
    </div>
  );
}
