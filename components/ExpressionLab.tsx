"use client";

import { useEffect, useMemo, useState } from "react";
import CircuitFigure from "./CircuitFigure";
import TruthTable from "./TruthTable";
import { M, MB } from "./Math";
import { snapshot, useLogicCore } from "@/lib/live";
import type { CircuitData, ExpressionAnalysis } from "@/lib/types";

const EXAMPLES = [
  "A.B + C",
  "(A + B)'",
  "A'.B' ",
  "A xor B",
  "A.B + A'.C",
  "AB + BC + AC",
];

export default function ExpressionLab() {
  const core = useLogicCore();
  const [src, setSrc] = useState("A.B + C");

  const analysis: ExpressionAnalysis | null = useMemo(() => {
    if (!core) return null;
    return JSON.parse(core.analyseExpression(src)) as ExpressionAnalysis;
  }, [core, src]);

  const [diagram, setDiagram] = useState<CircuitData | null>(null);

  useEffect(() => {
    if (!core || !analysis?.ok) {
      setDiagram(null);
      return;
    }
    const c = new core.Circuit();
    const err = core.buildFromExpression(c, src);
    setDiagram(err ? null : snapshot(c, `Logic diagram for ${src}`));
    c.delete();
  }, [core, src, analysis?.ok]);

  if (!core) return <p className="annotation">Loading the simulation engine…</p>;

  return (
    <>
      <div className="panel">
        <div className="panelHead">
          <span>Boolean expression</span>
          <span>live</span>
        </div>
        <div className="panelBody">
          <input
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            spellCheck={false}
            aria-label="Boolean expression"
            style={{
              width: "100%",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "1.1rem",
              padding: "0.6rem 0.7rem",
              border: "1px solid var(--hairline)",
              background: "var(--paper)",
              color: "var(--ink)",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: "0.35rem",
              flexWrap: "wrap",
              marginTop: "0.6rem",
            }}
          >
            {EXAMPLES.map((e) => (
              <button
                key={e}
                className="paletteBtn"
                style={{ width: "auto", margin: 0 }}
                onClick={() => setSrc(e.trim())}
              >
                {e.trim()}
              </button>
            ))}
          </div>
          <p className="mono" style={{ color: "var(--ink-faint)", marginTop: "0.7rem" }}>
            Accepts A.B · A*B · AB · A+B · A^B · A′ · NOT A · A NAND B and brackets.
          </p>
        </div>
      </div>

      {!analysis?.ok && analysis && (
        <div className="callout warn">
          <div className="calloutHead">Cannot read that</div>
          <p style={{ margin: 0 }}>{analysis.error}</p>
        </div>
      )}

      {analysis?.ok && (
        <>
          <h3 className="display">Written properly</h3>
          <MB>{analysis.latex}</MB>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              gap: "1.5rem",
              alignItems: "start",
            }}
          >
            <div>
              <h3 className="display" style={{ marginTop: 0 }}>
                Truth table
              </h3>
              <TruthTable
                table={{
                  inputs: analysis.vars,
                  outputs: ["F"],
                  truncated: false,
                  rows: analysis.rows,
                }}
                showIndex
              />
            </div>
            <div>
              <h3 className="display" style={{ marginTop: 0 }}>
                Simplified
              </h3>
              <p className="prose" style={{ fontSize: "0.95rem" }}>
                Minterms where the output is 1:{" "}
                {analysis.minterms.length ? (
                  <M>{`\\Sigma(${analysis.minterms.join(", ")})`}</M>
                ) : (
                  <M>{"\\varnothing"}</M>
                )}
              </p>
              <MB>{analysis.minimised.sopLatex}</MB>
              <p className="prose" style={{ fontSize: "0.95rem" }}>
                Straight from the truth table this would need{" "}
                <strong>{analysis.minimised.canonicalLiteralCount} literals</strong>;
                simplified it needs{" "}
                <strong>{analysis.minimised.literalCount}</strong>. Your
                expression as written uses {analysis.gateCount} gate
                {analysis.gateCount === 1 ? "" : "s"}.
              </p>
              {analysis.minimised.terms.length > 0 && (
                <ul className="prose" style={{ fontSize: "0.9rem" }}>
                  {analysis.minimised.terms.map((t, i) => (
                    <li key={i}>
                      <M>{t.latex}</M> — covers rows {t.covers.join(", ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {diagram && (
            <>
              <h3 className="display">As a logic diagram</h3>
              <p className="prose">
                Built straight from the parse tree, so the shape of the diagram
                is the shape of the expression. Click a switch and watch the
                result travel to the output.
              </p>
              <CircuitFigure data={diagram} animate withTable showIndex />
            </>
          )}
        </>
      )}
    </>
  );
}
