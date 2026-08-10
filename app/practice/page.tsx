import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { M, MB } from "@/components/Math";

export const metadata: Metadata = { title: "Exam practice" };

function Q({
  n,
  marks,
  code,
  question,
  answer,
}: {
  n: number;
  marks: number;
  code: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panelHead">
        <span>
          Question {n} · {code}
        </span>
        <span>
          [{marks} mark{marks === 1 ? "" : "s"}]
        </span>
      </div>
      <div className="panelBody">
        <div className="prose" style={{ maxWidth: "none" }}>
          {question}
        </div>
        <details style={{ marginTop: "1rem" }}>
          <summary
            className="mono"
            style={{
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--alarm)",
            }}
          >
            Show the answer
          </summary>
          <div
            className="prose"
            style={{
              maxWidth: "none",
              marginTop: "0.9rem",
              paddingTop: "0.9rem",
              borderTop: "1px dashed var(--hairline)",
            }}
          >
            {answer}
          </div>
        </details>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <>
      <PageHead
        code="Q · Exam-style questions"
        title="Practice"
        lede="Written in the style of the paper, with the marks shown and full worked answers. Try each one on paper before opening the answer."
      />

      <Q
        n={1}
        marks={2}
        code="A1.2.3"
        question={
          <p>
            State the output of a NAND gate for each of the four possible
            combinations of two inputs.
          </p>
        }
        answer={
          <>
            <p>
              NAND is AND with the output inverted, so it is 0 only when both
              inputs are 1.
            </p>
            <ul>
              <li>A=0, B=0 → Q=1</li>
              <li>A=0, B=1 → Q=1</li>
              <li>A=1, B=0 → Q=1</li>
              <li>A=1, B=1 → Q=0</li>
            </ul>
            <p>
              <em>Marking:</em> one mark for the three 1s, one for the single 0
              in the right place.
            </p>
          </>
        }
      />

      <Q
        n={2}
        marks={4}
        code="A1.2.4"
        question={
          <p>
            Construct a truth table for <M>{"F = A \\cdot B + \\overline{C}"}</M>.
          </p>
        }
        answer={
          <>
            <p>
              Eight rows. Work out <M>{"A \\cdot B"}</M> and{" "}
              <M>{"\\overline{C}"}</M> as separate columns first, then OR them.
            </p>
            <p className="mono">
              000→1 · 001→0 · 010→1 · 011→0 · 100→1 · 101→0 · 110→1 · 111→1
            </p>
            <p>
              The only row where the AND term rescues a 0 from{" "}
              <M>{"\\overline{C}"}</M> is 111. A common error is forgetting that{" "}
              <M>{"\\overline{C}"}</M> is 1 when C is 0.
            </p>
          </>
        }
      />

      <Q
        n={3}
        marks={3}
        code="A1.2.4"
        question={
          <p>
            Using De Morgan&apos;s theorem, show that{" "}
            <M>{"\\overline{A + B}"}</M> is equivalent to{" "}
            <M>{"\\overline{A} \\cdot \\overline{B}"}</M>.
          </p>
        }
        answer={
          <>
            <p>
              Build both truth tables and compare the output columns.
            </p>
            <p className="mono">
              A=0,B=0: NOT(0+0)=1 and 1·1=1 ✓<br />
              A=0,B=1: NOT(0+1)=0 and 1·0=0 ✓<br />
              A=1,B=0: NOT(1+0)=0 and 0·1=0 ✓<br />
              A=1,B=1: NOT(1+1)=0 and 0·0=0 ✓
            </p>
            <p>
              All four rows agree, so the expressions are equivalent. Stating
              the law alone earns nothing — the marks are for demonstrating it.
            </p>
          </>
        }
      />

      <Q
        n={4}
        marks={4}
        code="A1.2.5"
        question={
          <p>
            A lift door will close only when the door button is pressed{" "}
            <strong>and</strong> neither the light beam <strong>nor</strong> the
            emergency stop is active. Define suitable variables, write a Boolean
            expression, and draw the logic diagram.
          </p>
        }
        answer={
          <>
            <p>
              Let <M>P</M> = button pressed, <M>L</M> = light beam broken,{" "}
              <M>E</M> = emergency stop active, <M>C</M> = door closes.
            </p>
            <p>
              &ldquo;Neither L nor E&rdquo; is <M>{"\\overline{L + E}"}</M>, so
            </p>
            <MB>{"C = P \\cdot \\overline{L + E}"}</MB>
            <p>
              Diagram: L and E into an OR, the OR into a NOT (or use a NOR gate
              directly), and that result into an AND with P. Label all four
              signals.
            </p>
            <p>
              <em>Marking:</em> one for sensible variable definitions, one for
              the bracketing, two for a correctly drawn and labelled diagram.
            </p>
          </>
        }
      />

      <Q
        n={5}
        marks={5}
        code="A1.2.4"
        question={
          <p>
            Simplify{" "}
            <M>
              {"F = A \\cdot \\overline{B} + A \\cdot B + \\overline{A} \\cdot B"}
            </M>{" "}
            as far as possible, stating the law used at each step.
          </p>
        }
        answer={
          <>
            <p>
              Take the first two terms and factor out <M>A</M>:
            </p>
            <MB>{"A \\cdot \\overline{B} + A \\cdot B = A \\cdot (\\overline{B} + B)"}</MB>
            <p>
              By the complement law <M>{"\\overline{B} + B = 1"}</M>, and by
              identity <M>{"A \\cdot 1 = A"}</M>. So
            </p>
            <MB>{"F = A + \\overline{A} \\cdot B"}</MB>
            <p>
              That is the standard absorption pattern{" "}
              <M>{"X + \\overline{X} \\cdot Y = X + Y"}</M>, giving
            </p>
            <MB>{"F = A + B"}</MB>
            <p>
              Three AND terms and five gates reduce to a single OR gate. Check
              it: F should be 1 on every row except A=0, B=0 — which matches.
            </p>
          </>
        }
      />

      <Q
        n={6}
        marks={4}
        code="A1.2.4"
        question={
          <p>
            Use a Karnaugh map to simplify{" "}
            <M>{"F(A,B,C) = \\Sigma(1, 3, 5, 7)"}</M>.
          </p>
        }
        answer={
          <>
            <p>
              Those four minterms are 001, 011, 101 and 111 — every row where{" "}
              <M>C</M> is 1. On the map they form a single block of four filling
              the two columns where C=1.
            </p>
            <p>
              Across that block, A varies and B varies, but C is constantly 1.
              Everything that varies drops out:
            </p>
            <MB>{"F = C"}</MB>
            <p>
              The output ignores A and B entirely. Marks are for the correctly
              labelled Gray-code map, one maximal group of four, and the final
              answer.
            </p>
          </>
        }
      />

      <Q
        n={7}
        marks={3}
        code="A1.2.3"
        question={
          <p>
            Explain why NAND is described as a universal gate, and show how to
            build a NOT gate using only a NAND.
          </p>
        }
        answer={
          <>
            <p>
              A gate is universal if every other logic function can be built
              from copies of it alone. NAND qualifies, so a manufacturer can
              perfect one gate design and build an entire processor from it —
              cheaper to fabricate and easier to optimise.
            </p>
            <p>
              For NOT, connect the same signal to both NAND inputs. Then{" "}
              <M>{"Q = \\overline{A \\cdot A}"}</M>, and since{" "}
              <M>{"A \\cdot A = A"}</M> by the idempotent law, this is{" "}
              <M>{"Q = \\overline{A}"}</M>.
            </p>
          </>
        }
      />

      <Q
        n={8}
        marks={6}
        code="A1.2.4 / A1.2.5"
        question={
          <p>
            A drinks machine dispenses only when a coin is inserted and a drink
            is selected, unless the machine is in service mode, in which case it
            never dispenses. Write the truth table, give the simplified Boolean
            expression, and draw the logic diagram.
          </p>
        }
        answer={
          <>
            <p>
              Let <M>C</M> = coin, <M>D</M> = drink selected, <M>S</M> = service
              mode, output <M>V</M> = vend.
            </p>
            <p className="mono">
              Rows CDS: 000→0 · 001→0 · 010→0 · 011→0 · 100→0 · 101→0 · 110→1 ·
              111→0
            </p>
            <p>
              Only one row gives 1, so the sum of products has a single term:
            </p>
            <MB>{"V = C \\cdot D \\cdot \\overline{S}"}</MB>
            <p>
              Already minimal. Diagram: S through a NOT, then a three-input AND
              taking C, D and <M>{"\\overline{S}"}</M>. Alternatively a
              two-input AND of C and D feeding a second AND with{" "}
              <M>{"\\overline{S}"}</M> — both are acceptable.
            </p>
          </>
        }
      />

      <p className="annotation">
        <b>Technique.</b> When a question gives you a scenario, always define
        your variables in writing before doing anything else. It costs one line,
        it is frequently worth a mark on its own, and it stops you bracketing
        the wrong clause.
      </p>
    </>
  );
}
