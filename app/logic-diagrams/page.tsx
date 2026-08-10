import type { Metadata } from "next";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import Practice from "@/components/Practice";
import { M, MB } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Logic diagrams" };

export default function LogicDiagramsPage() {
  return (
    <>
      <PageHead
        code="A1.2.5 · Construct logic diagrams (up to three inputs)"
        title="Logic diagrams"
        lede="Turning an expression, or a sentence, into a drawing an examiner will accept."
      />

      <div className="prose">
        <p>
          A logic diagram is the circuit drawn with its proper symbols. The
          syllabus limits you to AND, OR, NOT, NAND, NOR and XOR, with outputs
          depending on no more than three inputs — which is generous enough for
          every question you will be asked and small enough to draw by hand.
        </p>

        <h2 className="display">Conventions that get you the marks</h2>
        <ul>
          <li>
            <strong>Signals flow left to right.</strong> Inputs down the left,
            output on the right. Never draw it backwards.
          </li>
          <li>
            <strong>Label every input and the output.</strong> An unlabelled
            diagram cannot be marked.
          </li>
          <li>
            <strong>Draw the correct shape.</strong> A flat-backed round-nosed
            body is AND; a curved body coming to a point is OR. Do not draw
            boxes with words in them.
          </li>
          <li>
            <strong>The bubble is not decoration.</strong> A small circle on the
            output means inverted. AND plus bubble is NAND.
          </li>
          <li>
            <strong>Show a junction dot</strong> where one signal splits to feed
            two gates. Wires that merely cross without a dot are not connected.
          </li>
          <li>
            <strong>One input, drawn once.</strong> If A feeds three gates, draw
            A once and branch it.
          </li>
        </ul>

        <h2 className="display">Expression to diagram</h2>
        <p>
          Work from the inside out, exactly as you would evaluate the
          expression. The gate that produces the final answer is the one
          furthest right.
        </p>
        <p>
          For <M>{"F = A \\cdot B + C"}</M>: the last operation is the OR, so an
          OR gate sits at the right. Its inputs are the result of{" "}
          <M>{"A \\cdot B"}</M> and the bare signal C. So an AND gate feeds the
          OR, and C runs straight past.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-ab-plus-c")} animate withTable />

      <div className="prose">
        <p>
          Now the same components arranged differently:{" "}
          <M>{"F = (A + B) \\cdot \\overline{C}"}</M>. The last operation is the
          AND. One of its inputs comes from an OR, the other from a NOT.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-brackets")} animate withTable />

      <div className="prose">
        <h2 className="display">Words to diagram</h2>
        <p>
          Exam questions usually arrive as a scenario rather than an expression.
          The method is to name the inputs first, then translate the sentence
          one clause at a time.
        </p>
        <div className="callout">
          <div className="calloutHead">Question</div>
          <p style={{ margin: 0 }}>
            A house alarm sounds when the system is armed{" "}
            <strong>and</strong> either the door sensor <strong>or</strong> the
            window sensor has been triggered. Draw the logic diagram.
          </p>
        </div>
        <p>
          Name them: <M>A</M> armed, <M>D</M> door, <M>W</M> window, output{" "}
          <M>S</M> siren. The word <em>and</em> joins &ldquo;armed&rdquo; to the
          whole sensor clause, and <em>or</em> joins the two sensors. The sensor
          clause must therefore be bracketed:
        </p>
        <MB>{"S = A \\cdot (D + W)"}</MB>
        <p>
          Note what happens without the brackets. <M>{"A \\cdot D + W"}</M> would
          let the siren sound from an open window while the alarm is switched
          off — a real bug, arrived at by a punctuation error.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-alarm")} animate withTable showIndex />

      <div className="prose">
        <h2 className="display">A three-input example</h2>
        <p>
          A majority voter outputs 1 when at least two of its three inputs are
          1. Written as a sum of products, that is every pair ANDed and the
          results ORed:
        </p>
        <MB>{"F = A \\cdot B + B \\cdot C + A \\cdot C"}</MB>
        <p>
          Three AND gates feeding one OR gate. Each input branches to two of the
          ANDs, which is where the junction dots matter.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-majority")} animate withTable showIndex />

      <div className="prose">
        <h2 className="display">Diagram back to expression</h2>
        <p>
          The reverse direction is just as examinable, and easier. Label the
          output of every gate as you go, starting from the inputs. When you
          reach the final gate you have the expression, already bracketed
          correctly.
        </p>
      </div>

      <p className="annotation">
        <b>Practise drawing by hand.</b> The exam wants your pencil version, not
        a neat one. The AND body should be a rectangle with a semicircular right
        end, and the OR should curve at the back and come to a point. Get those
        two right and the rest follow.
      </p>
      <Practice
        items={[
          {
            marks: 4,
            q: <p>A lift door closes only when the door button is pressed <strong>and</strong> neither the light beam nor the emergency stop is active. Define variables, write the Boolean expression and describe the diagram.</p>,
            a: (
              <>
                <p>Let <M>P</M> = button pressed, <M>L</M> = light beam broken, <M>E</M> = emergency stop active, <M>C</M> = door closes.</p>
                <p>&ldquo;Neither L nor E&rdquo; is <M>{"\\overline{L + E}"}</M>, so <M>{"C = P \\cdot \\overline{L + E}"}</M>.</p>
                <p>Diagram: L and E into an OR, the OR into a NOT — or a single NOR gate — and that result into an AND with P. Label all four signals. One mark for sensible definitions, one for the bracketing, two for a correctly drawn and labelled diagram.</p>
              </>
            ),
          },
          {
            marks: 6,
            q: <p>A drinks machine dispenses only when a coin is inserted and a drink is selected, unless the machine is in service mode. Write the truth table, give the simplified expression and describe the diagram.</p>,
            a: (
              <>
                <p>Let <M>C</M> = coin, <M>D</M> = drink selected, <M>S</M> = service mode, <M>V</M> = vend.</p>
                <p className="mono">CDS: 000→0 · 001→0 · 010→0 · 011→0 · 100→0 · 101→0 · 110→1 · 111→0</p>
                <p>Only one row gives 1, so the sum of products has a single term: <M>{"V = C \\cdot D \\cdot \\overline{S}"}</M>, which is already minimal.</p>
                <p>Diagram: S through a NOT, then a three-input AND taking C, D and <M>{"\\overline{S}"}</M>. A two-input AND of C and D feeding a second AND with <M>{"\\overline{S}"}</M> is equally acceptable.</p>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
