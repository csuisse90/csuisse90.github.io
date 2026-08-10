import type { Metadata } from "next";
import CircuitView from "@/components/CircuitView";
import PageHead from "@/components/PageHead";
import TruthTable from "@/components/TruthTable";
import { SpecList } from "@/components/Spec";
import { M, MB } from "@/components/Math";
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
        lede="Every definition, formula and method across A1 to A4, with nothing in between. Built for the night before."
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


      <h2 className="display">A1.1 · Hardware</h2>

      <SpecList
        title="CPU registers"
        meta="A1.1.1"
        termWidth="6rem"
        rows={[
          { term: "ALU", body: "Performs arithmetic and logic operations." },
          { term: "CU", body: "Decodes instructions and sends the control signals. Does no arithmetic itself." },
          { term: "PC", body: "Address of the next instruction. Increments during fetch; a jump writes to it." },
          { term: "MAR", body: "The address being accessed — where." },
          { term: "MDR", body: "The data travelling to or from it — what. Always paired with MAR." },
          { term: "IR", body: "The instruction currently being decoded and executed." },
          { term: "AC", body: "Holds the result the ALU just produced." },
        ]}
      />

      <div className="prose">
        <h3 className="display">Fetch–decode–execute</h3>
        <ol>
          <li>Fetch: PC → MAR; memory → MDR → IR; PC incremented.</li>
          <li>Decode: CU reads IR, works out the operation and the data needed.</li>
          <li>Execute: ALU computes or memory is accessed; result → AC.</li>
        </ol>

        <h3 className="display">Memory hierarchy</h3>
        <p>
          Registers → cache → RAM → secondary storage. Down the list: bigger and
          cheaper per byte, but slower. RAM is volatile; ROM is not.
        </p>

        <h3 className="display">Compression</h3>
        <p>
          Lossless recovers the original exactly (text, code). Lossy discards
          detail permanently for much smaller files (audio, video, photos).
        </p>
        <MB>{"\\text{ratio} = \\frac{\\text{original size}}{\\text{compressed size}}"}</MB>
      </div>

      <h2 className="display">A1.2 · Data representation</h2>

      <div className="prose">
        <p>
          Binary place values: <M>{"128, 64, 32, 16, 8, 4, 2, 1"}</M>. In
          two&apos;s complement the leading column becomes{" "}
          <M>{"-128"}</M>. To negate: flip every bit, then add one. An{" "}
          <M>n</M>-bit two&apos;s complement number covers{" "}
          <M>{"-2^{n-1}"}</M> to <M>{"2^{n-1} - 1"}</M>.
        </p>
        <p>Each hexadecimal digit is exactly four bits.</p>
        <MB>{"\\text{image bits} = \\text{width} \\times \\text{height} \\times \\text{colour depth}"}</MB>
        <MB>{"\\text{sound bits} = \\text{sample rate} \\times \\text{bit depth} \\times \\text{seconds} \\times \\text{channels}"}</MB>
      </div>

      <h2 className="display">A1.3 · Operating systems</h2>

      <SpecList
        title="Scheduling"
        meta="A1.3.3"
        termWidth="11rem"
        rows={[
          { term: "First come first served", body: "Arrival order, run to completion. Simple; one long job blocks everything." },
          { term: "Shortest job first", body: "Best average waiting time; long jobs can starve, and burst times must be known." },
          { term: "Round robin", body: "Fixed slice each, in turn. Nothing starves; context switching costs time." },
          { term: "Priority", body: "Highest priority first. Important work served promptly; low priority can starve." },
          { term: "Multilevel queue", body: "Several queues with their own rules, processes moved between them." },
        ]}
      />

      <div className="prose">
        <h3 className="display">Interrupt sequence</h3>
        <ol>
          <li>Request raised; CPU checks at the end of the cycle.</li>
          <li>Current instruction finishes.</li>
          <li>State saved to the stack.</li>
          <li>Interrupt service routine found via the vector table, and runs.</li>
          <li>State restored; the program resumes.</li>
        </ol>

        <h3 className="display">Control systems</h3>
        <p>
          Sensor → processor → actuator → feedback. Real-time: a late answer is
          a wrong answer.
        </p>
      </div>

      <h2 className="display">A1.4 · Translators</h2>

      <div className="prose">
        <p>
          <strong>Compiler:</strong> translates the whole program first, so
          execution is fast, all errors are reported up front, and the source
          can stay hidden. Tied to one architecture.
        </p>
        <p>
          <strong>Interpreter:</strong> translates statement by statement, every
          run. Slower execution, faster development, stops at the first error,
          and runs anywhere the interpreter exists.
        </p>
        <p>
          Compilation stages: lexical → syntax → semantic → optimisation → code
          generation.
        </p>
      </div>

      <h2 className="display">A2 · Networks</h2>

      <SpecList
        title="Protocols and devices"
        meta="A2.1"
        termWidth="7rem"
        rows={[
          { term: "TCP", body: "Reliable, connection-oriented, retransmits and reorders. Layer 4." },
          { term: "UDP", body: "Connectionless, no checking, low overhead. Layer 4. For live audio and video." },
          { term: "HTTP / HTTPS", body: "Web request and response; HTTPS adds encryption and identity. Layer 7." },
          { term: "DHCP", body: "Issues IP address, mask, gateway and DNS automatically." },
          { term: "DNS", body: "Domain name to IP address." },
          { term: "Switch", body: "Within one network, using MAC addresses. Layer 2." },
          { term: "Router", body: "Between networks, using IP addresses. Layer 3." },
        ]}
      />

      <div className="prose">
        <h3 className="display">OSI, bottom to top</h3>
        <p>
          Physical, Data link, Network, Transport, Session, Presentation,
          Application. <em>Please Do Not Throw Sausage Pizza Away.</em>
        </p>

        <h3 className="display">Topologies</h3>
        <p>
          Star: fast, resilient to one cable failing, but the switch is a single
          point of failure. Bus: cheapest, shared bandwidth, one break kills it.
          Ring: predictable, one break can sever it. Mesh: most reliable, most
          expensive.
        </p>

        <h3 className="display">Transmission</h3>
        <p>
          Compare media on bandwidth, installation, cost, range, interference,
          attenuation, reliability and security. Fibre wins on all but cost and
          fragility.
        </p>
        <MB>{"\\text{time} = \\frac{\\text{file size}}{\\text{bandwidth}}"}</MB>
        <p>
          Watch bits against bytes. Error detection: parity misses two flipped
          bits; checksums are better; cyclic redundancy checks better still.
        </p>
      </div>

      <h2 className="display">A3 · Databases</h2>

      <div className="prose">
        <p>
          <strong>Primary key</strong> uniquely identifies a row.{" "}
          <strong>Foreign key</strong> holds another table&apos;s primary key
          and expresses the relationship. Referential integrity keeps them
          honest.
        </p>
        <p>
          <strong>1NF:</strong> single values, no repeating groups.{" "}
          <strong>2NF:</strong> in 1NF, and no partial dependency on part of a
          composite key. <strong>3NF:</strong> in 2NF, and no non-key column
          depending on another non-key column.
        </p>
        <p>
          The whole of it: every non-key column depends on{" "}
          <strong>the key, the whole key, and nothing but the key</strong>.
        </p>
        <p>
          Anomalies avoided: update, insertion, deletion.{" "}
          <strong>ACID:</strong> atomic, consistent, isolated, durable.
        </p>
        <p>
          SQL order: SELECT · FROM · JOIN · WHERE · GROUP BY · HAVING · ORDER
          BY.
        </p>
      </div>

      <h2 className="display">A4 · Machine learning</h2>

      <div className="prose">
        <p>
          <strong>Supervised:</strong> labelled data; classification or
          regression. <strong>Unsupervised:</strong> no labels; clustering or
          dimensionality reduction. <strong>Reinforcement:</strong> rewards from
          acting in an environment.
        </p>
        <p>
          Training loop: predict, compare with the label, measure loss, adjust
          the weights, repeat. The step size is the learning rate.
        </p>
        <p>
          <strong>Overfitting:</strong> excellent on training data, poor on new
          data. Split into training, validation and test sets, and use the test
          set once.
        </p>
        <MB>{"\\text{precision} = \\frac{TP}{TP + FP} \\qquad \\text{recall} = \\frac{TP}{TP + FN}"}</MB>
        <p>
          Accuracy misleads on rare cases. Bias enters through the sample, the
          labels, the historical record and feedback loops.
        </p>
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
