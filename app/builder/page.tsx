import type { Metadata } from "next";
import Builder from "@/components/Builder";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = { title: "Circuit builder" };

export default function BuilderPage() {
  return (
    <>
      <PageHead
        code="LAB · Sandbox"
        title="Circuit builder"
        lede="A blank canvas and the seven gates. Build anything, toggle the switches, and get the truth table back automatically."
      />

      <Builder />

      <div className="prose">
        <h2 className="display">Things worth building</h2>
        <ul>
          <li>
            <strong>An inverter out of a NAND.</strong> Place one INPUT and one
            NAND, and wire the input to <em>both</em> of the NAND&apos;s pins.
          </li>
          <li>
            <strong>XOR from AND, OR and NOT.</strong> Aim for the truth table
            0, 1, 1, 0. It takes five gates.
          </li>
          <li>
            <strong>A half adder.</strong> Two inputs, two outputs, one XOR and
            one AND. Check the carry only lights on 1 + 1.
          </li>
          <li>
            <strong>A majority voter.</strong> Three inputs, three ANDs, one OR.
            The output should be 1 on exactly four of the eight rows.
          </li>
          <li>
            <strong>Something that remembers.</strong> Two NOR gates, each
            feeding the other. Now the circuit has a past as well as a present.
          </li>
        </ul>

        <h2 className="display">If a wire refuses to connect</h2>
        <p>
          Connections run output to input. An INPUT switch has no input pin and
          an OUTPUT lamp has no output pin, so those directions are rejected.
          Each input pin also holds exactly one wire — connecting a second one
          replaces the first. To branch a signal to several gates, click the
          same output pin again and then the next destination.
        </p>
      </div>

      <p className="annotation">
        <b>Note on unknowns.</b> A dashed grey wire means the value is not
        determined yet — usually an unconnected pin, but in a feedback loop it
        can mean the circuit is genuinely holding a state it was never told.
        That is not a bug; it is what memory looks like before you write to it.
      </p>
    </>
  );
}
