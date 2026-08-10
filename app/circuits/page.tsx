import type { Metadata } from "next";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { M, MB } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Real circuits" };

export default function CircuitsPage() {
  return (
    <>
      <PageHead
        code="EXT · Beyond the syllabus"
        title="Real circuits"
        lede="What gates are actually assembled into: addition, selection, addressing, and memory."
      />

      <div className="callout warn">
        <div className="calloutHead">Not examinable</div>
        <p style={{ margin: 0 }}>
          Nothing on this page is required by A1.2. It is here because
          &ldquo;gates can do arithmetic&rdquo; is a claim the syllabus makes and
          never shows you, and because these five circuits are the bridge
          between logic gates and an actual processor.
        </p>
      </div>

      <h2 className="display">
        The half adder <span className="tag beyond">extension</span>
      </h2>
      <div className="prose">
        <p>
          Add two single bits. Nought plus nought is nought, nought plus one is
          one, and one plus one is <strong>two</strong> — which in binary is 10,
          a nought with a carry of one. So one bit of output is not enough. You
          need two: the <strong>sum</strong> and the <strong>carry</strong>.
        </p>
        <p>Look at the two output columns separately and each is a gate you know:</p>
        <MB>{"S = A \\oplus B \\qquad C = A \\cdot B"}</MB>
        <p>
          The sum is 1 when the inputs differ, which is XOR. The carry is 1 only
          when both are 1, which is AND. Two gates, and the machine can count.
        </p>
      </div>
      <CircuitFigure data={circuit("half-adder")} animate withTable showIndex />

      <h2 className="display">
        The full adder <span className="tag beyond">extension</span>
      </h2>
      <div className="prose">
        <p>
          A half adder cannot be chained, because it has nowhere to receive a
          carry <em>from</em> the column to its right. Adding a third input
          fixes that, and the result is the circuit that every processor uses to
          add.
        </p>
        <MB>
          {"S = A \\oplus B \\oplus C_{in} \\qquad C_{out} = A \\cdot B + C_{in} \\cdot (A \\oplus B)"}
        </MB>
        <p>
          The carry out says: carry if both inputs were 1, or if exactly one was
          1 and a carry arrived. Chain eight of these and you can add any two
          bytes. Chain sixty-four and you have the integer unit of a modern CPU.
        </p>
        <p>
          Slow this one right down. The carry has to travel through more gates
          than the sum, and in a chained adder that delay accumulates across
          every column — which is the reason a 64-bit addition is not simply 64
          times as parallel as a 1-bit one.
        </p>
      </div>
      <CircuitFigure data={circuit("full-adder")} animate withTable showIndex />

      <h2 className="display">
        The multiplexer <span className="tag beyond">extension</span>
      </h2>
      <div className="prose">
        <p>
          A multiplexer is a switch made of logic: it picks one of several
          inputs and passes it to the output. With one select line you choose
          between two data inputs.
        </p>
        <MB>{"Y = \\overline{S} \\cdot D_0 + S \\cdot D_1"}</MB>
        <p>
          Read it as: when S is 0 the first AND is open and the second is shut,
          so <M>{"D_0"}</M> gets through; when S is 1 the roles swap. This is how
          a processor chooses between &ldquo;the number in the instruction&rdquo;
          and &ldquo;the number in the register&rdquo; without moving anything.
        </p>
      </div>
      <CircuitFigure data={circuit("mux21")} animate withTable showIndex />

      <h2 className="display">
        The decoder <span className="tag beyond">extension</span>
      </h2>
      <div className="prose">
        <p>
          A decoder turns a binary number into a single active line. Two inputs
          give four outputs, and exactly one of them is 1 at any moment — the
          one whose number matches the input.
        </p>
        <p>
          This is how memory addressing works. Put an address on the input lines
          and the decoder activates precisely one row of the memory array.
          Twenty address lines select one row out of a million.
        </p>
      </div>
      <CircuitFigure data={circuit("decoder24")} animate withTable showIndex />

      <h2 className="display">
        The SR latch: a circuit that remembers{" "}
        <span className="tag beyond">extension</span>
      </h2>
      <div className="prose">
        <p>
          Every circuit so far has been <strong>combinational</strong>: the
          output depends only on the inputs right now. Feed a gate&apos;s output
          back into its own input and something different happens. The circuit
          gains a <strong>past</strong>.
        </p>
        <p>
          Two NOR gates, each feeding the other. Set S to 1 and Q goes high. Now
          put S back to 0 — and Q <em>stays</em> high, because it is being held
          up by the loop. That is one bit of memory, built from two gates.
        </p>
        <ul>
          <li>
            <strong>S=1, R=0</strong> — set. Q becomes 1.
          </li>
          <li>
            <strong>S=0, R=1</strong> — reset. Q becomes 0.
          </li>
          <li>
            <strong>S=0, R=0</strong> — hold. Q keeps whatever it had.
          </li>
          <li>
            <strong>S=1, R=1</strong> — forbidden. Both outputs go to 0, which
            contradicts Q and Q&apos; being opposites, and when you release it
            the result depends on which gate happens to be faster.
          </li>
        </ul>
        <p>
          In the diagram below the hold state shows as dashed grey wires marked{" "}
          <M>x</M>. That is not a failure of the simulator — it is the honest
          answer. Asked what a latch outputs with no history, there is no
          answer; it depends what happened before.
        </p>
      </div>
      <CircuitFigure data={circuit("sr-latch")} animate withTable showIndex />

      <p className="annotation">
        <b>Where this goes.</b> Add a clock input to a latch and you get a
        flip-flop. A row of flip-flops is a register. A grid of them is cache.
        Everything a computer remembers while it is switched on is this circuit,
        repeated.
      </p>
    </>
  );
}
