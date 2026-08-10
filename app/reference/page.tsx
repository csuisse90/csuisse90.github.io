import type { Metadata } from "next";
import CircuitView from "@/components/CircuitView";
import PageHead from "@/components/PageHead";
import TruthTable from "@/components/TruthTable";
import { M } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Reference sheet" };

const SUMMARY: [string, string, string][] = [
  ["AND", "A \\cdot B", "1 only when all inputs are 1"],
  ["OR", "A + B", "1 when at least one input is 1"],
  ["NOT", "\\overline{A}", "output is the opposite of the input"],
  ["NAND", "\\overline{A \\cdot B}", "0 only when all inputs are 1"],
  ["NOR", "\\overline{A + B}", "1 only when all inputs are 0"],
  ["XOR", "A \\oplus B", "1 when the inputs differ"],
  ["XNOR", "\\overline{A \\oplus B}", "1 when the inputs match"],
];

const LAWS: [string, string][] = [
  ["Identity", "A + 0 = A \\quad A \\cdot 1 = A"],
  ["Null", "A + 1 = 1 \\quad A \\cdot 0 = 0"],
  ["Idempotent", "A + A = A \\quad A \\cdot A = A"],
  ["Complement", "A + \\overline{A} = 1 \\quad A \\cdot \\overline{A} = 0"],
  ["Double negation", "\\overline{\\overline{A}} = A"],
  ["Commutative", "A + B = B + A \\quad A \\cdot B = B \\cdot A"],
  ["Associative", "(A+B)+C = A+(B+C)"],
  ["Distributive", "A \\cdot (B + C) = A \\cdot B + A \\cdot C"],
  ["Absorption", "A + A \\cdot B = A"],
  ["Absorption (2)", "A + \\overline{A} \\cdot B = A + B"],
  ["De Morgan", "\\overline{A \\cdot B} = \\overline{A} + \\overline{B}"],
  ["De Morgan (2)", "\\overline{A + B} = \\overline{A} \\cdot \\overline{B}"],
];

export default function ReferencePage() {
  const gateIds = ["and2", "or2", "not1", "nand2", "nor2", "xor2", "xnor2"];

  return (
    <>
      <PageHead
        code="REF · One page, everything"
        title="Reference sheet"
        lede="Symbols, truth tables and laws, with nothing in between. Built for the night before."
      />

      <h2 className="display">The gates at a glance</h2>

      <div className="panel">
        <div className="panelHead">
          <span>Definitions</span>
          <span>A1.2.3</span>
        </div>
        <div className="panelBody">
          {SUMMARY.map(([name, latex, rule]) => (
            <div
              key={name}
              style={{
                display: "grid",
                gridTemplateColumns: "5rem 9rem minmax(0,1fr)",
                gap: "1rem",
                padding: "0.45rem 0",
                borderBottom: "1px solid var(--hairline)",
                alignItems: "baseline",
                fontSize: "0.92rem",
              }}
            >
              <span
                className="mono"
                style={{ letterSpacing: "0.14em", color: "var(--ink)" }}
              >
                {name}
              </span>
              <span>
                <M>{latex}</M>
              </span>
              <span style={{ color: "var(--ink-soft)" }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="display">Symbols and tables</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(19rem, 1fr))",
          gap: "1.25rem",
        }}
      >
        {gateIds.map((id) => {
          const data = circuit(id);
          return (
            <div key={id}>
              <CircuitView
                data={data}
                interactive={false}
                animate={false}
                maxHeight={150}
              />
              <div style={{ marginTop: "0.5rem" }}>
                <TruthTable table={data.truthTable} />
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="display">Boolean laws</h2>

      <div className="panel">
        <div className="panelHead">
          <span>Simplification</span>
          <span>A1.2.4</span>
        </div>
        <div className="panelBody">
          {LAWS.map(([name, latex]) => (
            <div
              key={name}
              style={{
                display: "grid",
                gridTemplateColumns: "10rem minmax(0,1fr)",
                gap: "1rem",
                padding: "0.4rem 0",
                borderBottom: "1px solid var(--hairline)",
                alignItems: "baseline",
              }}
            >
              <span
                className="mono"
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                {name}
              </span>
              <span>
                <M>{latex}</M>
              </span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="display">Method summaries</h2>
      <div className="prose">
        <h3 className="display">Truth table from an expression</h3>
        <ol>
          <li>
            Count the inputs. Draw <M>{"2^n"}</M> rows.
          </li>
          <li>Fill the input columns by counting up in binary.</li>
          <li>Add a working column for each intermediate signal.</li>
          <li>Evaluate innermost brackets first, output column last.</li>
        </ol>

        <h3 className="display">Expression from a truth table</h3>
        <ol>
          <li>Keep only the rows where the output is 1.</li>
          <li>
            Each becomes an AND of every input — plain if 1 in that row, barred
            if 0.
          </li>
          <li>OR those terms together.</li>
          <li>Simplify.</li>
        </ol>

        <h3 className="display">Karnaugh map</h3>
        <ol>
          <li>Label rows and columns in Gray code: 00, 01, 11, 10.</li>
          <li>Fill in the 1s and any don&apos;t cares.</li>
          <li>
            Circle groups of 1, 2, 4, 8 — as large as possible, as few as
            possible, wrapping around the edges, overlapping if useful.
          </li>
          <li>
            Each group gives one term: keep what stays constant, drop what
            changes.
          </li>
          <li>OR the terms.</li>
        </ol>

        <h3 className="display">Logic diagram</h3>
        <ol>
          <li>Inputs on the left, output on the right, labelled.</li>
          <li>Find the last operation — that gate goes furthest right.</li>
          <li>Work backwards through the brackets.</li>
          <li>Dot every junction where a signal branches.</li>
        </ol>
      </div>

      <p className="annotation">
        <b>Night-before checklist.</b> Can you draw all six required symbols
        from memory? Can you fill an eight-row table without dropping a row? Can
        you state both De Morgan laws? Can you group a Karnaugh map without
        circling three cells? That is the topic.
      </p>
    </>
  );
}
