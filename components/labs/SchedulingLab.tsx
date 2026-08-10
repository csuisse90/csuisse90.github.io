"use client";

import { useMemo, useState } from "react";

type Proc = { name: string; burst: number; arrival: number };

const COLOURS = ["var(--alarm)", "var(--teal)", "var(--ice-deep)", "#8a6d3b", "#6b4c9a"];

type Algo = "fcfs" | "sjf" | "rr";

function schedule(procs: Proc[], algo: Algo, slice: number) {
  const order: string[] = [];
  const remaining = new Map(procs.map((p) => [p.name, p.burst]));
  const finish = new Map<string, number>();
  let time = 0;

  if (algo === "rr") {
    const queue = [...procs].sort((a, b) => a.arrival - b.arrival).map((p) => p.name);
    while (queue.length) {
      const name = queue.shift()!;
      const run = Math.min(slice, remaining.get(name)!);
      for (let i = 0; i < run; i++) order.push(name);
      time += run;
      remaining.set(name, remaining.get(name)! - run);
      if (remaining.get(name)! > 0) queue.push(name);
      else finish.set(name, time);
    }
  } else {
    const pending = [...procs];
    while (pending.length) {
      const available = pending.filter((p) => p.arrival <= time);
      const pool = available.length ? available : [pending[0]];
      const next =
        algo === "sjf"
          ? pool.reduce((a, b) => (b.burst < a.burst ? b : a))
          : pool.reduce((a, b) => (b.arrival < a.arrival ? b : a));
      time = Math.max(time, next.arrival);
      for (let i = 0; i < next.burst; i++) order.push(next.name);
      time += next.burst;
      finish.set(next.name, time);
      pending.splice(pending.indexOf(next), 1);
    }
  }

  const stats = procs.map((p) => {
    const done = finish.get(p.name) ?? 0;
    const turnaround = done - p.arrival;
    return { ...p, finish: done, turnaround, wait: turnaround - p.burst };
  });
  return { order, stats };
}

export default function SchedulingLab() {
  const [procs, setProcs] = useState<Proc[]>([
    { name: "P1", burst: 7, arrival: 0 },
    { name: "P2", burst: 3, arrival: 0 },
    { name: "P3", burst: 2, arrival: 0 },
  ]);
  const [algo, setAlgo] = useState<Algo>("rr");
  const [slice, setSlice] = useState(2);

  const { order, stats } = useMemo(() => schedule(procs, algo, slice), [procs, algo, slice]);
  const avgWait = stats.reduce((a, s) => a + s.wait, 0) / stats.length;
  const avgTurn = stats.reduce((a, s) => a + s.turnaround, 0) / stats.length;
  const colourOf = (name: string) => COLOURS[procs.findIndex((p) => p.name === name) % COLOURS.length];

  return (
    <>
      <div className="panel">
        <div className="panelHead">
          <span>Processes</span>
          <span>edit the burst times</span>
        </div>
        <div className="panelBody">
          <table className="tt">
            <thead><tr><th>process</th><th>burst</th><th>arrives</th><th /></tr></thead>
            <tbody>
              {procs.map((p, i) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  {(["burst", "arrival"] as const).map((field) => (
                    <td key={field}>
                      <input
                        type="number"
                        min={field === "burst" ? 1 : 0}
                        value={p[field]}
                        onChange={(e) => {
                          const v = Math.max(field === "burst" ? 1 : 0, Number(e.target.value) || 0);
                          setProcs((ps) => ps.map((q, j) => (j === i ? { ...q, [field]: v } : q)));
                        }}
                        style={{
                          width: "3.4rem", border: "1px solid var(--hairline)",
                          background: "var(--paper)", color: "var(--ink)",
                          fontFamily: "var(--font-mono), monospace", textAlign: "center",
                        }}
                      />
                    </td>
                  ))}
                  <td>
                    <button className="paletteBtn" style={{ width: "auto", margin: 0, padding: "0.1rem 0.35rem" }}
                      onClick={() => setProcs((ps) => ps.filter((_, j) => j !== i))}
                      disabled={procs.length <= 1}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="paletteBtn" style={{ width: "auto", margin: "0.7rem 0 0" }}
            onClick={() => setProcs((ps) => [...ps, { name: `P${ps.length + 1}`, burst: 4, arrival: 0 }])}>
            Add process
          </button>
        </div>
        <div className="transport">
          {(["fcfs", "sjf", "rr"] as const).map((a) => (
            <button key={a} className="paletteBtn"
              style={{ width: "auto", margin: 0,
                borderColor: a === algo ? "var(--alarm)" : undefined,
                color: a === algo ? "var(--alarm)" : undefined }}
              onClick={() => setAlgo(a)}>
              {a === "fcfs" ? "First come first served" : a === "sjf" ? "Shortest job first" : "Round robin"}
            </button>
          ))}
          {algo === "rr" && (
            <>
              <span>slice</span>
              <input type="number" min={1} value={slice}
                onChange={(e) => setSlice(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: "3rem", border: "1px solid var(--hairline)", background: "var(--paper)",
                  color: "var(--ink)", fontFamily: "var(--font-mono), monospace", textAlign: "center" }} />
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panelHead"><span>Timeline</span><span>{order.length} time units</span></div>
        <div className="panelBody">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
            {order.map((name, i) => (
              <div key={i} title={`t=${i}`}
                style={{ flex: "1 0 1.4rem", minWidth: "1.4rem", height: "2.2rem",
                  border: `2px solid ${colourOf(name)}`, background: "var(--paper-lift)",
                  color: colourOf(name), display: "grid", placeItems: "center",
                  fontFamily: "var(--font-mono), monospace", fontSize: "0.7rem" }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <table className="tt">
        <thead><tr><th>process</th><th>burst</th><th>finishes</th><th>turnaround</th><th>waited</th></tr></thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td><td>{s.burst}</td><td>{s.finish}</td>
              <td>{s.turnaround}</td><td className={s.wait ? "one" : "zero"}>{s.wait}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ textAlign: "right", color: "var(--ink-faint)" }}>average</td>
            <td>{avgTurn.toFixed(2)}</td>
            <td>{avgWait.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <p className="annotation">
        <b>Try this.</b> Keep the three defaults and switch between the three
        algorithms. Shortest job first gives the lowest average wait every time —
        and if you now set P1&apos;s burst to 40, watch what it does to a process
        that simply happened to be long.
      </p>
    </>
  );
}
