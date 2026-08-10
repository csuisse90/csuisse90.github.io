import type { Metadata } from "next";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { M, MB } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Boolean algebra" };

const LAWS: { name: string; rules: string[]; note: string }[] = [
  {
    name: "Identity",
    rules: ["A + 0 = A", "A \\cdot 1 = A"],
    note: "ORing with 0, or ANDing with 1, changes nothing.",
  },
  {
    name: "Null",
    rules: ["A + 1 = 1", "A \\cdot 0 = 0"],
    note: "ORing with 1 forces 1; ANDing with 0 forces 0. The other input stops mattering.",
  },
  {
    name: "Idempotent",
    rules: ["A + A = A", "A \\cdot A = A"],
    note: "Repeating an input tells you nothing new.",
  },
  {
    name: "Complement",
    rules: ["A + \\overline{A} = 1", "A \\cdot \\overline{A} = 0"],
    note: "Something is always either true or false, and never both at once.",
  },
  {
    name: "Double negation",
    rules: ["\\overline{\\overline{A}} = A"],
    note: "Two inversions cancel.",
  },
  {
    name: "Commutative",
    rules: ["A + B = B + A", "A \\cdot B = B \\cdot A"],
    note: "Order does not matter.",
  },
  {
    name: "Associative",
    rules: [
      "(A + B) + C = A + (B + C)",
      "(A \\cdot B) \\cdot C = A \\cdot (B \\cdot C)",
    ],
    note: "Grouping does not matter, as long as the operation is the same throughout.",
  },
  {
    name: "Distributive",
    rules: [
      "A \\cdot (B + C) = A \\cdot B + A \\cdot C",
      "A + B \\cdot C = (A + B) \\cdot (A + C)",
    ],
    note: "The first looks like ordinary algebra. The second does not, and is the one people forget.",
  },
  {
    name: "Absorption",
    rules: ["A + A \\cdot B = A", "A \\cdot (A + B) = A"],
    note: "If A alone already decides it, B is dead weight. The biggest single source of easy simplification marks.",
  },
  {
    name: "De Morgan",
    rules: [
      "\\overline{A \\cdot B} = \\overline{A} + \\overline{B}",
      "\\overline{A + B} = \\overline{A} \\cdot \\overline{B}",
    ],
    note: "Break the bar, change the sign.",
  },
];

export default function BooleanAlgebraPage() {
  return (
    <>
      <PageHead
        code="A1.2.4 · Simplify Boolean expressions"
        title="Boolean algebra"
        lede="Ordinary algebra with only two numbers in it. Learn a dozen rules and you can shrink a circuit on paper before it is ever built."
      />

      <div className="prose">
        <p>
          Boolean algebra is arithmetic where the only values are 0 and 1, the
          plus sign means OR, the dot means AND, and a bar over something means
          NOT. It exists because a circuit that has been simplified is a circuit
          that costs less, draws less power and answers faster.
        </p>
        <p>
          Three notations mean the same thing and all appear in exam papers:
        </p>
        <ul>
          <li>
            AND: <M>{"A \\cdot B"}</M>, <M>{"AB"}</M>, or <M>{"A \\land B"}</M>
          </li>
          <li>
            OR: <M>{"A + B"}</M> or <M>{"A \\lor B"}</M>
          </li>
          <li>
            NOT: <M>{"\\overline{A}"}</M>, <M>{"A'"}</M>, or <M>{"\\lnot A"}</M>
          </li>
        </ul>
        <p>
          <strong>Precedence:</strong> NOT first, then AND, then OR — the same
          shape as &ldquo;powers, then times, then plus&rdquo;. So{" "}
          <M>{"A + B \\cdot C"}</M> means <M>{"A + (B \\cdot C)"}</M>, not{" "}
          <M>{"(A + B) \\cdot C"}</M>.
        </p>
      </div>

      <h2 className="display">The laws</h2>

      <div className="panel">
        <div className="panelHead">
          <span>Learn these</span>
          <span>ten rules</span>
        </div>
        <div className="panelBody">
          {LAWS.map((law) => (
            <div
              key={law.name}
              style={{
                display: "grid",
                gridTemplateColumns: "9rem minmax(0,1fr)",
                gap: "1rem",
                padding: "0.7rem 0",
                borderBottom: "1px solid var(--hairline)",
                alignItems: "baseline",
              }}
            >
              <div
                className="mono"
                style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
              >
                {law.name}
              </div>
              <div>
                {law.rules.map((r) => (
                  <div key={r} style={{ marginBottom: "0.3rem" }}>
                    <M>{r}</M>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--ink-soft)",
                    marginTop: "0.35rem",
                  }}
                >
                  {law.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="display">De Morgan&apos;s theorems, properly</h2>
      <div className="prose">
        <p>
          These two are worth more marks than everything else on this page
          combined, so it is worth being slow about them.
        </p>
        <MB>{"\\overline{A \\cdot B} = \\overline{A} + \\overline{B}"}</MB>
        <MB>{"\\overline{A + B} = \\overline{A} \\cdot \\overline{B}"}</MB>
        <p>
          In words: <strong>&ldquo;not (both)&rdquo;</strong> is the same as{" "}
          <strong>&ldquo;either one is missing&rdquo;</strong>, and{" "}
          <strong>&ldquo;not (either)&rdquo;</strong> is the same as{" "}
          <strong>&ldquo;both are missing&rdquo;</strong>.
        </p>
        <p>
          Take the everyday version. &ldquo;It is not true that I have my keys
          and my wallet&rdquo; means &ldquo;either I have lost my keys, or I have
          lost my wallet&rdquo;. That is the first law. &ldquo;It is not true
          that I have keys or wallet&rdquo; means &ldquo;I have no keys and no
          wallet&rdquo;. That is the second.
        </p>
        <p>
          The mechanical version students remember in the exam:{" "}
          <strong>break the bar and change the sign</strong>. Split the long
          overbar into one bar per term, and swap AND for OR as you do it.
        </p>
        <p>
          You do not have to take it on trust. Two circuits are identical if and
          only if their output columns match, so here are both sides of the
          first law. Compare the Q columns.
        </p>
      </div>

      <CircuitFigure data={circuit("demorgan-nand")} animate withTable />
      <CircuitFigure data={circuit("demorgan-orNots")} animate withTable />

      <div className="prose">
        <p>And both sides of the second law.</p>
      </div>

      <CircuitFigure data={circuit("demorgan-nor")} animate withTable />
      <CircuitFigure data={circuit("demorgan-andNots")} animate withTable />

      <hr className="hr" />

      <h2 className="display">A worked simplification</h2>
      <div className="prose">
        <p>
          Read straight off a truth table, a function might come out as this
          three-term monster:
        </p>
        <MB>
          {"F = A \\cdot B \\cdot C + A \\cdot B \\cdot \\overline{C} + A \\cdot \\overline{B} \\cdot C"}
        </MB>
        <p>Take the first two terms and factor out what they share:</p>
        <MB>
          {"A \\cdot B \\cdot C + A \\cdot B \\cdot \\overline{C} = A \\cdot B \\cdot (C + \\overline{C})"}
        </MB>
        <p>
          By the complement law <M>{"C + \\overline{C} = 1"}</M>, and by identity{" "}
          <M>{"A \\cdot B \\cdot 1 = A \\cdot B"}</M>. So those two terms collapse
          into one:
        </p>
        <MB>{"F = A \\cdot B + A \\cdot \\overline{B} \\cdot C"}</MB>
        <p>
          Now factor <M>A</M> out of both remaining terms:{" "}
          <M>{"F = A \\cdot (B + \\overline{B} \\cdot C)"}</M>. The bracket is a
          standard pattern — <M>{"B + \\overline{B} \\cdot C = B + C"}</M>,
          because if B is false the only way to succeed is C, and if B is true
          you are done anyway. That leaves
        </p>
        <MB>{"F = A \\cdot B + A \\cdot C"}</MB>
        <p>
          Nine literals down to four, and five gates down to three. Here are the
          two circuits. The output columns are identical; the second is simply
          cheaper.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-unsimplified")} animate withTable showIndex />
      <CircuitFigure data={circuit("worked-simplified")} animate withTable showIndex />

      <div className="callout warn">
        <div className="calloutHead">Always check your simplification</div>
        <p style={{ margin: 0 }}>
          Build the truth table of your simplified answer and compare it with
          the original. If a single row differs, the simplification is wrong.
          This takes a minute and catches almost every algebra slip.
        </p>
      </div>
    </>
  );
}
