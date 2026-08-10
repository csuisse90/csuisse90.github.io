import type { Metadata } from "next";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { M, MB } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Timing & hazards" };

export default function TimingPage() {
  return (
    <>
      <PageHead
        code="EXT · Why speed has a limit"
        title="Timing and hazards"
        lede="Gates are not instant. Everything difficult about building fast computers follows from that one fact."
      />

      <div className="callout warn">
        <div className="calloutHead">Not examinable</div>
        <p style={{ margin: 0 }}>
          A1.2 treats gates as instantaneous, and for the exam you should too.
          This page exists because the simulator models real gate delays, which
          makes something visible here that a static truth table can never show.
        </p>
      </div>

      <div className="prose">
        <h2 className="display">Propagation delay</h2>
        <p>
          When a gate&apos;s input changes, its output does not change at the
          same instant. Charge has to move and transistors have to switch. The
          lag is called <strong>propagation delay</strong>, and in a modern chip
          it is a few tens of picoseconds — a few hundred-billionths of a
          second.
        </p>
        <p>
          Small, but it accumulates. A signal passing through four gates in
          series waits four times. The longest such path through a circuit is
          its <strong>critical path</strong>, and it sets the maximum clock
          speed:
        </p>
        <MB>{"f_{max} = \\frac{1}{t_{critical\\ path}}"}</MB>
        <p>
          That is the real reason simplifying a Boolean expression matters.
          Fewer gates in series is not merely tidier — it is a faster processor.
        </p>
        <p>
          The transport bar under every diagram counts in gate delays. Each
          click of <strong>Step</strong> advances the whole circuit by exactly
          one. Compare the XOR built from four NANDs with a single XOR gate: same
          truth table, three times the delay.
        </p>
      </div>

      <CircuitFigure data={circuit("xor-from-nand")} animate withTable />

      <div className="prose">
        <h2 className="display">Glitches, and how a correct circuit lies</h2>
        <p>
          Here is the unsettling part. A circuit can be logically perfect and
          still produce the wrong answer, briefly, on its way to the right one.
          Such a moment is called a <strong>hazard</strong>, and the false pulse
          is a <strong>glitch</strong>.
        </p>
        <p>
          Take <M>{"F = A \\cdot B + \\overline{A} \\cdot C"}</M>. Hold{" "}
          <M>{"B = 1"}</M> and <M>{"C = 1"}</M>. Now whatever A does, the answer
          should be 1: if A is 1 the first term fires, and if A is 0 the second
          does.
        </p>
        <p>
          But watch what happens the instant A falls from 1 to 0. The first term{" "}
          <M>{"A \\cdot B"}</M> switches off immediately. The second term{" "}
          <M>{"\\overline{A} \\cdot C"}</M> cannot switch on yet, because{" "}
          <M>{"\\overline{A}"}</M> has to get through the inverter first. For one
          gate delay <strong>neither term is holding the output up</strong>, and
          F dips to 0.
        </p>
        <p>
          Set the switches to A=1, B=1, C=1 below, drop the speed to 1/16×, then
          click A off and watch the output lamp. The simulator flags the glitch
          on the transport bar and outlines the offending gate in red.
        </p>
      </div>

      <CircuitFigure data={circuit("static-hazard")} animate withTable showIndex initialMask={7} />

      <div className="prose">
        <p>
          This is a <strong>static-1 hazard</strong>: the output should have
          stayed at 1 and momentarily did not. On a Karnaugh map the cause is
          visible — the two groups covering those cells are adjacent but do not
          overlap, and the glitch happens exactly when the signal crosses the
          gap between them. The fix is to add a redundant third term{" "}
          <M>{"B \\cdot C"}</M> that bridges the gap. It is logically
          unnecessary and electrically essential.
        </p>

        <h2 className="display">Why clocks exist</h2>
        <p>
          You cannot eliminate every glitch, so real designs stop trying. They
          use a <strong>clock</strong>: a signal that ticks steadily, and
          circuits only look at their inputs on the tick. As long as the clock
          period is longer than the critical path, everything has settled by the
          time anyone reads it, and the glitches in between are simply never
          observed.
        </p>
        <p>
          A 3 GHz processor is a machine that has agreed to look at its own
          working three billion times a second, and to ignore it the rest of the
          time.
        </p>
      </div>

      <p className="annotation">
        <b>How the simulation works.</b> Every gate reads the previous state of
        the circuit and writes the next one, so a single sweep is exactly one
        gate delay everywhere at once. That is what makes the wavefront in these
        animations real rather than decorative — and it is why the glitch above
        appears without anyone programming a glitch.
      </p>
    </>
  );
}
