import type { Metadata } from "next";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { M, MB } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Logic gates" };

type GateEntry = {
  id: string;
  name: string;
  latex: string;
  spoken: string;
  rule: string;
  use: string;
};

const GATES: GateEntry[] = [
  {
    id: "and2",
    name: "AND",
    latex: "Q = A \\cdot B",
    spoken: "Q equals A and B",
    rule: "Output 1 only when every input is 1.",
    use: "Checking that several conditions hold at once. A microwave runs only when the door is shut AND the timer is going.",
  },
  {
    id: "or2",
    name: "OR",
    latex: "Q = A + B",
    spoken: "Q equals A or B",
    rule: "Output 1 when at least one input is 1.",
    use: "Any-of-these alarms. A car pings if the driver's belt is undone OR the passenger's is.",
  },
  {
    id: "not1",
    name: "NOT",
    latex: "Q = \\overline{A}",
    spoken: "Q equals not A",
    rule: "One input. The output is always the opposite.",
    use: "Turning an active-low signal into an active-high one, and building every other gate out of NANDs.",
  },
  {
    id: "nand2",
    name: "NAND",
    latex: "Q = \\overline{A \\cdot B}",
    spoken: "Q equals not, bracket, A and B",
    rule: "AND with the answer flipped. Output 0 only when every input is 1.",
    use: "The workhorse of real chips. Flash memory cells are named after it.",
  },
  {
    id: "nor2",
    name: "NOR",
    latex: "Q = \\overline{A + B}",
    spoken: "Q equals not, bracket, A or B",
    rule: "OR with the answer flipped. Output 1 only when every input is 0.",
    use: "Detecting that nothing at all is happening, and building latches that remember a bit.",
  },
  {
    id: "xor2",
    name: "XOR",
    latex: "Q = A \\oplus B",
    spoken: "Q equals A exclusive-or B",
    rule: "Output 1 when the inputs are different.",
    use: "Binary addition, parity checks, and the one-line trick behind simple encryption.",
  },
  {
    id: "xnor2",
    name: "XNOR",
    latex: "Q = \\overline{A \\oplus B}",
    spoken: "Q equals not, bracket, A exclusive-or B",
    rule: "Output 1 when the inputs are the same.",
    use: "Comparing two numbers bit by bit to see whether they are equal.",
  },
];

export default function GatesPage() {
  return (
    <>
      <PageHead
        code="A1.2.3 · Describe the purpose and use of logic gates"
        title="The seven gates"
        lede="Each gate is one rule about switches. Learn the seven rules and their symbols and the rest of the topic is bookkeeping."
      />

      <div className="prose">
        <p>
          A gate takes one or more inputs, each of which is a{" "}
          <strong>0</strong> or a <strong>1</strong>, and produces a single
          output that is also 0 or 1. There is nothing in between. In the real
          chip 0 is roughly zero volts and 1 is roughly the supply voltage, and
          the gate is a handful of transistors arranged so the output voltage
          follows the rule.
        </p>
        <p>
          The syllabus asks you to know six of these by name — AND, OR, NOT,
          NAND, NOR and XOR — and to work with circuits of up to three inputs.
          XNOR is included here because it costs you nothing once you know XOR,
          and it turns up constantly in comparators.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Reading the symbols</div>
        <p style={{ margin: 0 }}>
          The shape tells you the operation and a{" "}
          <strong>small circle on the nose</strong> tells you the answer is
          inverted. AND is flat-backed with a round front. OR is curved and
          comes to a point. XOR is OR with a second curved line behind it. NOT is
          a triangle with a circle. That circle is the whole difference between
          AND and NAND — miss it and you have drawn the wrong gate.
        </p>
      </div>

      {GATES.map((g) => (
        <section key={g.id}>
          <h2 className="display">{g.name}</h2>
          <div className="prose">
            <p>{g.rule}</p>
            <MB>{g.latex}</MB>
            <p>
              Read aloud: <em>{g.spoken}</em>.
            </p>
            <p>
              <strong>Where you meet it.</strong> {g.use}
            </p>
          </div>
          <CircuitFigure data={circuit(g.id)} animate withTable />
        </section>
      ))}

      <hr className="hr" />

      <h2 className="display">More than two inputs</h2>
      <div className="prose">
        <p>
          AND, OR, NAND, NOR and XOR all extend to three or more inputs. The
          rule generalises in the obvious way: a three-input AND wants all three
          to be 1, a three-input OR wants at least one. Adding an input{" "}
          <strong>doubles the number of rows</strong> in the truth table, which
          is why the syllabus stops at three: four inputs is sixteen rows and an
          exam question you cannot finish.
        </p>
      </div>
      <CircuitFigure data={circuit("and3")} animate withTable showIndex />
      <CircuitFigure data={circuit("or3")} animate withTable showIndex />

      <hr className="hr" />

      <h2 className="display">NAND and NOR can build anything</h2>
      <div className="prose">
        <p>
          Here is the fact that makes chip manufacturing possible. You do not
          need seven different kinds of gate. You need{" "}
          <strong>one</strong>. Every gate on this page can be built out of
          NANDs alone, or out of NORs alone. They are called{" "}
          <strong>universal gates</strong> for that reason.
        </p>
        <p>
          This matters commercially. A fabrication plant that only has to
          perfect one gate layout can make it smaller, faster and cheaper, and
          then stamp out billions of copies.
        </p>
        <p>
          Start with the inverter. Tie both inputs of a NAND together, so it
          sees the same value twice. <M>{"\\overline{A \\cdot A} = \\overline{A}"}</M>,
          because anything ANDed with itself is just itself.
        </p>
      </div>
      <CircuitFigure data={circuit("not-from-nand")} animate withTable />

      <div className="prose">
        <p>
          Once you have an inverter, AND is easy: NAND gives you the inverted
          answer, so invert it back.
        </p>
      </div>
      <CircuitFigure data={circuit("and-from-nand")} animate withTable />

      <div className="prose">
        <p>
          OR takes three NANDs, and the reason it works is De Morgan&apos;s law:{" "}
          <M>{"\\overline{\\overline{A} \\cdot \\overline{B}} = A + B"}</M>.
          Invert both inputs, NAND them, and an OR falls out.
        </p>
      </div>
      <CircuitFigure data={circuit("or-from-nand")} animate withTable />

      <div className="prose">
        <p>
          XOR is the expensive one — four NANDs. Slow this one down and watch
          it: the answer does not appear immediately, it ripples through three
          layers of gates before settling.
        </p>
      </div>
      <CircuitFigure data={circuit("xor-from-nand")} animate withTable />

      <div className="prose">
        <p>NOR is universal in exactly the same way.</p>
      </div>
      <CircuitFigure data={circuit("not-from-nor")} animate withTable />
      <CircuitFigure data={circuit("or-from-nor")} animate withTable />

      <p className="annotation">
        <b>Exam note.</b> A question that says &ldquo;using NAND gates
        only&rdquo; is testing exactly this. The method is always the same:
        write the expression, apply De Morgan until every operation is a NAND,
        then draw it.
      </p>
    </>
  );
}
