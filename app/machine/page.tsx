import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { LazyMachine } from "@/components/LazyEngine";

export const metadata: Metadata = {
  title: "The machine",
  description:
    "Write Python and follow it all the way down: intermediate code, x86-64 assembly, machine code, registers, memory, and the register transfers a control unit sequences.",
};

export default function Page() {
  return (
    <>
      <PageHead
        code="A1.1 · A1.2 · A1.4 · B2"
        title="The machine"
        lede="Write Python and follow it down. Every pane shows the same instant of the same program: what you wrote, what it was translated into, and what the processor is doing about it."
      />

      <LazyMachine />

      <div className="prose" style={{ marginTop: "2.5rem" }}>
        <h2 className="display">What this actually is</h2>
        <p>
          The three topics this joins together are taught apart. A1.2 gives you
          gates and an adder. A1.1 gives you fetch, decode and execute. A1.4
          gives you translators. They are the same object seen from three
          distances, and the only way to believe that is to watch one program
          pass through all of them.
        </p>
        <p>
          The compiler here takes a subset of Python — integers, lists, strings,
          the arithmetic and comparison operators, <code>if</code>,{" "}
          <code>while</code>, <code>for</code>, functions and recursion — and
          produces genuine x86-64: real ModRM and SIB encoding, real RFLAGS, real
          machine-code bytes that any other disassembler will read back. It is
          not a teaching toy pretending to be a processor. Anything it cannot
          compile it refuses by name, with the line, rather than guessing.
        </p>
        <p>
          The register transfers are the honest version of the fetch–decode–execute
          cycle: each one names what moves where, and which control lines the
          control unit asserts to make it happen. That is the level A1.1.3 asks
          you to describe, and the level exam answers usually get vague about.
        </p>
      </div>
    </>
  );
}
