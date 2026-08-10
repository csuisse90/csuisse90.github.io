"use client";

import { useEffect, useState } from "react";

type Instr = { op: string; arg: number; note: string };

const PROGRAM: Instr[] = [
  { op: "LDA", arg: 10, note: "load the value at address 10" },
  { op: "ADD", arg: 11, note: "add the value at address 11" },
  { op: "STA", arg: 12, note: "store the accumulator at address 12" },
  { op: "HLT", arg: 0, note: "stop" },
];

const INITIAL_DATA: Record<number, number> = { 10: 5, 11: 7, 12: 0 };

type State = {
  pc: number;
  mar: number | null;
  mdr: number | null;
  ir: string;
  ac: number;
  data: Record<number, number>;
  phase: "fetch" | "decode" | "execute" | "halted";
  log: string[];
};

const START: State = {
  pc: 0,
  mar: null,
  mdr: null,
  ir: "—",
  ac: 0,
  data: { ...INITIAL_DATA },
  phase: "fetch",
  log: [],
};

function step(s: State): State {
  if (s.phase === "halted") return s;
  const n = { ...s, data: { ...s.data }, log: [...s.log] };

  if (s.phase === "fetch") {
    const instr = PROGRAM[s.pc];
    n.mar = s.pc;
    n.mdr = null;
    n.ir = instr ? `${instr.op} ${instr.op === "HLT" ? "" : instr.arg}`.trim() : "—";
    n.pc = s.pc + 1;
    n.phase = "decode";
    n.log.push(`FETCH   PC ${s.pc} → MAR, instruction → IR, PC becomes ${n.pc}`);
    return n;
  }

  const instr = PROGRAM[s.pc - 1];
  if (s.phase === "decode") {
    n.phase = "execute";
    n.log.push(`DECODE  ${instr.op} — ${instr.note}`);
    return n;
  }

  switch (instr.op) {
    case "LDA":
      n.mar = instr.arg;
      n.mdr = s.data[instr.arg] ?? 0;
      n.ac = n.mdr;
      n.log.push(`EXECUTE address ${instr.arg} → MDR (${n.mdr}) → AC`);
      break;
    case "ADD":
      n.mar = instr.arg;
      n.mdr = s.data[instr.arg] ?? 0;
      n.ac = s.ac + n.mdr;
      n.log.push(`EXECUTE AC ${s.ac} + ${n.mdr} = ${n.ac}`);
      break;
    case "STA":
      n.mar = instr.arg;
      n.mdr = s.ac;
      n.data[instr.arg] = s.ac;
      n.log.push(`EXECUTE AC (${s.ac}) → address ${instr.arg}`);
      break;
    case "HLT":
      n.phase = "halted";
      n.log.push("EXECUTE halt");
      return n;
  }
  n.phase = "fetch";
  return n;
}

export default function CpuLab() {
  const [s, setS] = useState<State>(START);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || s.phase === "halted") {
      if (s.phase === "halted") setRunning(false);
      return;
    }
    const t = setTimeout(() => setS(step), 700);
    return () => clearTimeout(t);
  }, [running, s]);

  const reg = (name: string, value: string | number | null, hot: boolean) => (
    <div
      key={name}
      style={{
        border: `1px solid ${hot ? "var(--alarm)" : "var(--hairline)"}`,
        background: hot ? "rgba(211,58,28,0.06)" : "var(--paper-lift)",
        padding: "0.5rem 0.6rem",
        transition: "border-color 150ms linear, background 150ms linear",
      }}
    >
      <div className="mono" style={{ fontSize: "0.58rem", letterSpacing: "0.16em", color: "var(--ink-faint)" }}>
        {name}
      </div>
      <div className="mono" style={{ fontSize: "1.1rem", color: hot ? "var(--alarm)" : "var(--ink)" }}>
        {value === null ? "—" : value}
      </div>
    </div>
  );

  return (
    <>
      <div className="panel">
        <div className="panelHead">
          <span>Registers</span>
          <span>{s.phase === "halted" ? "halted" : `next: ${s.phase}`}</span>
        </div>
        <div className="panelBody">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(6rem, 1fr))", gap: "0.5rem" }}>
            {reg("PC", s.pc, s.phase === "fetch")}
            {reg("MAR", s.mar, s.phase !== "decode")}
            {reg("MDR", s.mdr, s.phase === "execute")}
            {reg("IR", s.ir, s.phase === "decode")}
            {reg("AC", s.ac, s.phase === "execute")}
          </div>
        </div>
        <div className="transport">
          <span className="clockDot" data-ticking={running} />
          <button className="paletteBtn" style={{ width: "auto", margin: 0 }}
            onClick={() => setS(step)} disabled={s.phase === "halted"}>
            Step
          </button>
          <button className="paletteBtn" style={{ width: "auto", margin: 0 }}
            onClick={() => setRunning((r) => !r)} disabled={s.phase === "halted"}>
            {running ? "Pause" : "Run"}
          </button>
          <button className="paletteBtn" style={{ width: "auto", margin: 0 }}
            onClick={() => { setRunning(false); setS(START); }}>
            Reset
          </button>
          <span>one click = one stage of the cycle</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: "1.25rem" }}>
        <div className="panel" style={{ margin: 0 }}>
          <div className="panelHead"><span>Program</span></div>
          <div className="panelBody" style={{ padding: 0 }}>
            <table className="tt" style={{ width: "100%" }}>
              <thead><tr><th>addr</th><th>instruction</th></tr></thead>
              <tbody>
                {PROGRAM.map((p, i) => (
                  <tr key={i} data-active={s.phase !== "halted" && (s.phase === "fetch" ? i === s.pc : i === s.pc - 1)}>
                    <td className="rowIndex">{i}</td>
                    <td style={{ textAlign: "left", paddingLeft: "0.8rem" }}>
                      {p.op} {p.op === "HLT" ? "" : p.arg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panelHead"><span>Memory</span></div>
          <div className="panelBody" style={{ padding: 0 }}>
            <table className="tt" style={{ width: "100%" }}>
              <thead><tr><th>addr</th><th>value</th></tr></thead>
              <tbody>
                {Object.entries(s.data).map(([addr, v]) => (
                  <tr key={addr} data-active={s.mar === Number(addr)}>
                    <td className="rowIndex">{addr}</td>
                    <td className={v ? "one" : "zero"}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {s.log.length > 0 && (
        <pre className="pyOut">{s.log.join("\n")}</pre>
      )}

      <p className="annotation">
        <b>Watch the PC.</b> It increments during <em>fetch</em>, not at the end
        — which is why a processor always knows where the next instruction is
        before it has worked out what the current one does.
      </p>
    </>
  );
}
