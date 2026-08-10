"use client";

import { useMemo, useState } from "react";
import { M, MB } from "./Math";
import { useLogicCore } from "@/lib/live";
import type { Minimisation } from "@/lib/types";

// Gray code: adjacent columns and rows differ in exactly one bit, which is the
// whole point of the map — physically adjacent cells can always be grouped.
const GRAY2 = [0, 1];
const GRAY4 = [0, 1, 3, 2];

const NAMES = ["A", "B", "C", "D"];

function bits(n: number, width: number) {
  return n.toString(2).padStart(width, "0");
}

type Cell = "0" | "1" | "x";

export default function KMap({ vars: initialVars = 3 }: { vars?: 2 | 3 | 4 }) {
  const core = useLogicCore();
  const [vars, setVars] = useState<2 | 3 | 4>(initialVars);
  const [cells, setCells] = useState<Record<number, Cell>>({});
  const [hover, setHover] = useState<number | null>(null);

  const size = 1 << vars;
  const get = (i: number): Cell => cells[i] ?? "0";

  const cycle = (i: number) =>
    setCells((c) => ({
      ...c,
      [i]: get(i) === "0" ? "1" : get(i) === "1" ? "x" : "0",
    }));

  const { minterms, dontCares } = useMemo(() => {
    const m: number[] = [];
    const d: number[] = [];
    for (let i = 0; i < size; i++) {
      const v = get(i);
      if (v === "1") m.push(i);
      else if (v === "x") d.push(i);
    }
    return { minterms: m, dontCares: d };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, size]);

  const result: Minimisation | null = useMemo(() => {
    if (!core) return null;
    return JSON.parse(
      core.minimise(
        vars,
        NAMES.slice(0, vars).join(","),
        minterms.join(","),
        dontCares.join(","),
      ),
    ) as Minimisation;
  }, [core, vars, minterms, dontCares]);

  // Row bits are the leading variables, column bits the trailing ones.
  const rowBitCount = vars <= 2 ? 1 : 2;
  const colBitCount = vars - rowBitCount;
  const rowOrder = rowBitCount === 1 ? GRAY2 : GRAY4;
  const colOrder = colBitCount === 1 ? GRAY2 : GRAY4;

  const highlighted = new Set(
    hover !== null && result ? (result.terms[hover]?.covers ?? []) : [],
  );

  if (!core) return <p className="annotation">Loading the simulation engine…</p>;

  return (
    <>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
        {([2, 3, 4] as const).map((v) => (
          <button
            key={v}
            className="paletteBtn"
            style={{
              width: "auto",
              margin: 0,
              borderColor: v === vars ? "var(--alarm)" : undefined,
              color: v === vars ? "var(--alarm)" : undefined,
            }}
            onClick={() => {
              setVars(v);
              setCells({});
            }}
          >
            {v} variables
          </button>
        ))}
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => setCells({})}
        >
          Clear
        </button>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "start" }}>
        <table className="kmap">
          <thead>
            <tr>
              <th>
                {NAMES.slice(0, rowBitCount).join("")}\
                {NAMES.slice(rowBitCount, vars).join("")}
              </th>
              {colOrder.map((c) => (
                <th key={c}>{bits(c, colBitCount)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowOrder.map((r) => (
              <tr key={r}>
                <th>{bits(r, rowBitCount)}</th>
                {colOrder.map((c) => {
                  const index = (r << colBitCount) | c;
                  return (
                    <td
                      key={c}
                      data-v={get(index)}
                      onClick={() => cycle(index)}
                      style={
                        highlighted.has(index)
                          ? { outline: "2px solid var(--teal)", outlineOffset: "-3px" }
                          : undefined
                      }
                    >
                      <span className="cellIndex">{index}</span>
                      {get(index)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ minWidth: "18rem", flex: 1 }}>
          <p className="mono" style={{ color: "var(--ink-faint)" }}>
            Click a cell: 0 → 1 → don&apos;t care → 0
          </p>

          {result && (
            <>
              <h3 className="display" style={{ marginTop: "1rem" }}>
                Simplified
              </h3>
              <MB>{result.sopLatex}</MB>

              {result.terms.length > 0 && (
                <>
                  <p className="mono" style={{ color: "var(--ink-faint)" }}>
                    Hover a term to ring its group
                  </p>
                  <ul className="prose" style={{ fontSize: "0.9rem" }}>
                    {result.terms.map((t, i) => (
                      <li
                        key={i}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <M>{t.latex}</M> — a group of {t.covers.length} covering
                        cells {t.covers.join(", ")}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className="prose" style={{ fontSize: "0.9rem" }}>
                Unsimplified this would take{" "}
                {result.canonicalLiteralCount} literals; the map gets it down to{" "}
                {result.literalCount}.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
