import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { SpecList } from "@/components/Spec";

export const metadata: Metadata = { title: "Translators" };

export default function TranslatorsPage() {
  return (
    <>
      <PageHead
        code="A1.4.1 · Interpreters and compilers"
        title="Translators"
        lede="A processor only understands binary machine code. Everything else has to be translated, and there are two ways to do it."
      />

      <div className="prose">
        <p>
          Source code is written for humans. The CPU executes{" "}
          <strong>machine code</strong> — binary instructions specific to its
          architecture. A <strong>translator</strong> bridges the two. The
          syllabus wants the two main kinds compared, with their consequences.
        </p>
      </div>

      <h2 className="display">The three kinds of translator</h2>
      <SpecList
        title="Translators"
        meta="A1.4.1"
        termWidth="9rem"
        rows={[
          {
            term: "Compiler",
            body: "Translates the entire program into machine code in one go, before it runs, producing an executable file that can be run repeatedly without the compiler present.",
          },
          {
            term: "Interpreter",
            body: "Translates and executes one statement at a time, every time the program runs. No executable is produced, and the interpreter must be installed to run the program at all.",
          },
          {
            term: "Assembler",
            body: "Translates assembly language — human-readable mnemonics like ADD and LDA — into machine code. The mapping is almost one instruction to one instruction, because assembly is machine code with names.",
          },
        ]}
      />

      <h2 className="display">Compiler against interpreter</h2>
      <SpecList
        title="The comparison"
        termWidth="10rem"
        rows={[
          {
            term: "Speed of execution",
            body: "Compiled code is faster, because translation already happened and the machine executes directly. An interpreter re-translates every time, including each pass through a loop.",
          },
          {
            term: "Speed of development",
            body: "Interpreters win. Change a line and run it immediately, with no wait for a build. This is why interpreted languages dominate scripting and teaching.",
          },
          {
            term: "Error reporting",
            body: "A compiler reports all the errors it can find before the program runs at all. An interpreter stops at the first error it reaches — so a mistake deep inside a rarely-used branch may go unnoticed for a long time.",
          },
          {
            term: "Portability",
            body: "Source code for an interpreter runs anywhere the interpreter exists. A compiled executable is tied to one processor architecture and operating system, and must be recompiled for each.",
          },
          {
            term: "Distribution",
            body: "A compiled executable can be shipped without the source, protecting the original code. Interpreted programs are normally distributed as readable source.",
          },
          {
            term: "Memory",
            body: "Running a compiled program needs only the executable. Interpreting needs the interpreter itself in memory alongside the source.",
          },
        ]}
      />

      <div className="callout">
        <div className="calloutHead">The usual exam framing</div>
        <p style={{ margin: 0 }}>
          &ldquo;A team is developing and frequently testing a program — which
          translator and why?&rdquo; The answer is an interpreter, for the fast
          edit-and-run cycle and immediate feedback. &ldquo;The finished program
          will be sold to customers&rdquo; flips it to a compiler, for execution
          speed and because the source stays hidden.
        </p>
      </div>

      <h2 className="display">The stages of compilation</h2>
      <div className="prose">
        <p>
          Worth knowing in outline, because it explains what compiler errors
          actually mean.
        </p>
        <ol>
          <li>
            <strong>Lexical analysis.</strong> The source text is broken into
            tokens — keywords, names, operators, literals — and whitespace and
            comments are discarded.
          </li>
          <li>
            <strong>Syntax analysis.</strong> The tokens are checked against the
            grammar of the language and assembled into a tree. A missing bracket
            is caught here.
          </li>
          <li>
            <strong>Semantic analysis.</strong> Checks that the program means
            something coherent: variables are declared before use, and types
            match.
          </li>
          <li>
            <strong>Optimisation.</strong> The compiler rewrites the code to be
            faster or smaller while preserving behaviour — the same instinct as
            simplifying a Boolean expression before building the circuit.
          </li>
          <li>
            <strong>Code generation.</strong> Machine code for the target
            architecture is produced.
          </li>
        </ol>
        <p>
          The first two stages are exactly what the{" "}
          <a href="/expression/">expression lab</a> on this site does: it
          tokenises what you type, parses it into a tree, and reports an error
          if the grammar does not hold.
        </p>
      </div>

      <h2 className="display">The middle ground</h2>
      <div className="prose">
        <p>
          Real languages blur the line. Java compiles to{" "}
          <strong>bytecode</strong>, an intermediate form that is not machine
          code for any real processor, and a virtual machine then interprets it
          — which is how one compiled file runs on any platform with a JVM. Many
          modern interpreters also use <strong>just-in-time</strong>{" "}
          compilation, translating hot sections to machine code while the
          program runs, to get interpreted flexibility with something closer to
          compiled speed.
        </p>
      </div>

      <p className="annotation">
        <b>Common mistake.</b> Writing that &ldquo;a compiler is faster&rdquo;
        without saying faster at <em>what</em>. Compiled code executes faster;
        compiling itself takes time that interpreting does not. Say which you
        mean and the mark is yours.
      </p>
    </>
  );
}
