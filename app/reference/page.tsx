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
        lede="Every definition, formula and method across both themes, A1 to B4, with nothing in between. Built for the night before."
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

      <h2 className="display">B1 · Computational thinking</h2>

      <div className="prose">
        <p>
          <strong>Decomposition:</strong> break one problem into smaller ones
          that can be solved, tested and replaced separately.{" "}
          <strong>Abstraction:</strong> remove detail that does not matter, so
          what remains can be reasoned about. <strong>Pattern recognition:</strong>{" "}
          notice what repeats and write it once.
        </p>
        <p>
          An algorithm must be <strong>unambiguous</strong>, must{" "}
          <strong>terminate</strong>, and must be <strong>correct for every
          valid input</strong>.
        </p>
        <p>
          Flowchart shapes: oval start and stop, parallelogram input and output,
          rectangle process, diamond decision. Every decision has exactly two
          labelled exits.
        </p>
        <p>
          A <strong>trace table</strong> has one column per variable and one row
          per change. Write the value at the moment it changes, not at the end.
        </p>
      </div>

      <h2 className="display">B2 · Programming</h2>

      <SpecList
        title="Operators that cost marks"
        meta="B2.1.1"
        termWidth="7rem"
        rows={[
          { term: "/", body: "True division. 7 / 2 is 3.5, a real." },
          { term: "//", body: "Integer division, discarding the remainder. 7 // 2 is 3." },
          { term: "%", body: "Remainder. Tests divisibility, and wraps an index round a range." },
          { term: "=", body: "Assigns a value to a name." },
          { term: "==", body: "Compares two values and produces a boolean." },
          { term: "+", body: "On strings this concatenates: \"7\" + \"2\" is \"72\", not 9." },
        ]}
      />

      <div className="prose">
        <p>
          <strong>Static typing</strong> fixes the type of the variable and
          checks before running. <strong>Dynamic typing</strong> gives the type
          to the value and checks as each line executes.
        </p>
        <p>
          Never compare two reals with <code>==</code>. They are approximations,
          so compare the absolute difference against a small tolerance. Never
          store money as a real.
        </p>
        <p>
          <strong>Selection:</strong> an <code>if</code>/<code>elif</code> chain
          runs exactly one branch, so test the most restrictive condition first.
          Separate <code>if</code>s all run.
        </p>
        <p>
          <strong>Iteration:</strong> count-controlled when the number of
          repetitions is known, condition-controlled when it is not. Every path
          through a <code>while</code> body must move towards the condition
          becoming false.
        </p>
        <p>
          <strong>Short circuiting:</strong> <code>A and B</code> stops if{" "}
          <code>A</code> is false, which lets a guard protect the test after it.
        </p>
        <p>
          A <strong>parameter</strong> is the name in the definition; an{" "}
          <strong>argument</strong> is the value at the call. A{" "}
          <strong>side effect</strong> is anything a function does other than
          return a value.
        </p>
      </div>

      <SpecList
        title="The four collections"
        meta="B2.1.3"
        termWidth="7rem"
        rows={[
          { term: "List", body: "Ordered, changeable, duplicates allowed, reached by position." },
          { term: "Tuple", body: "Ordered and fixed. For a group of values that belongs together." },
          { term: "Dictionary", body: "Key to value, keys unique, reached by key in about constant time." },
          { term: "Set", body: "No order, no duplicates, fast at answering whether something is a member." },
        ]}
      />

      <h2 className="display">B3 · Object-oriented programming</h2>

      <SpecList
        title="The vocabulary, exactly"
        meta="B3.1"
        termWidth="9rem"
        rows={[
          { term: "Class", body: "A blueprint: what every object of this kind has and can do. Written once." },
          { term: "Object", body: "One instance, with its own memory holding its own attribute values." },
          { term: "Attribute", body: "A variable belonging to an object. Instance variables differ per object; class variables are shared." },
          { term: "Method", body: "A function belonging to a class, stored once and told which object to work on." },
          { term: "Constructor", body: "Runs on creation and sets the starting state, so no object exists half-built." },
          { term: "Encapsulation", body: "Data private, access through methods, so an invalid state cannot be reached." },
          { term: "Invariant", body: "Something true of every object at all times, established by the constructor and preserved by every method." },
          { term: "Inheritance", body: "A subclass gains the superclass's attributes and methods. Requires is-a." },
          { term: "Overriding", body: "A subclass replacing an inherited method with its own version." },
          { term: "Polymorphism", body: "The same call behaving differently per object, so no branch lists the types." },
          { term: "Abstract class", body: "Cannot be instantiated; defines an interface every subclass must implement." },
          { term: "Composition", body: "Building from other objects — has-a. Looser than inheritance and swappable at run time." },
        ]}
      />

      <div className="prose">
        <h3 className="display">UML in one paragraph</h3>
        <p>
          A box in three parts: name, attributes, methods. <code>+</code>{" "}
          public, <code>−</code> private, <code>#</code> protected. Plain line is
          association; open diamond is aggregation, where the parts outlive the
          whole; filled diamond is composition, where they do not; hollow
          triangle points at the superclass. Multiplicities on the ends:{" "}
          <code>1</code>, <code>0..1</code>, <code>1..*</code>, <code>*</code>.
        </p>
        <p>
          <strong>Cohesion</strong> high, <strong>coupling</strong> loose. A
          class should have one reason to change.
        </p>
      </div>

      <h2 className="display">B4 · Abstract data types and algorithms</h2>

      <SpecList
        title="Operations you may be asked to name"
        meta="B4.1"
        termWidth="9rem"
        rows={[
          { term: "Stack", body: "push · pop · peek · isEmpty. Last in, first out. Undo, the call stack, bracket matching." },
          { term: "Queue", body: "enqueue · dequeue · peek · isEmpty. First in, first out. Spoolers, buffers, scheduling." },
          { term: "Circular queue", body: "front and rear advance with (index + 1) mod size. Keep a count, or leave one slot spare, or full and empty look identical." },
          { term: "Linked list", body: "Nodes of value plus next, reached through a head pointer, ending at null." },
          { term: "Binary search tree", body: "At every node: smaller left, larger right. Insert as a leaf; search by comparing and descending." },
          { term: "Traversals", body: "In-order gives sorted output; pre-order rebuilds the tree; post-order finishes children before parents." },
        ]}
      />

      <div className="prose">
        <h3 className="display">Rewiring a linked list</h3>
        <p>
          Insert after <code>p</code>: <code>new.next ← p.next</code> first,
          then <code>p.next ← new</code>. Copy the old pointer out before
          overwriting it, or the rest of the list is lost. Delete: set{" "}
          <code>previous.next ← current.next</code>; deleting the head means
          moving the head pointer.
        </p>

        <h3 className="display">Recursion</h3>
        <p>
          A <strong>base case</strong> that returns without recursing, and a{" "}
          <strong>recursive case</strong> on a strictly smaller problem. Every
          unreturned call holds a stack frame, so depth <M>{"n"}</M> costs{" "}
          <M>{"n"}</M> frames — which is why deep recursion overflows where a
          loop would not.
        </p>
      </div>

      <SpecList
        title="Complexity, worst case"
        meta="B4.1.6"
        termWidth="11rem"
        rows={[
          { term: "Array index", body: "O(1). One calculation: base + index × size." },
          { term: "Linear search", body: "O(n). Any order. About n / 2 comparisons on average." },
          { term: "Binary search", body: "O(log n). Sorted only. About 20 comparisons for a million items." },
          { term: "Bubble sort", body: "O(n²), but O(n) on already-sorted data if a swap flag is used. Stable." },
          { term: "Selection sort", body: "O(n²) always, but at most n swaps. Not stable." },
          { term: "Insertion sort", body: "O(n²), but close to O(n) on nearly sorted data. Stable." },
          { term: "Merge sort", body: "O(n log n) always, at the cost of another array of size n. Stable." },
          { term: "Dictionary lookup", body: "About O(1). The size of the collection barely enters into it." },
        ]}
      />

      <div className="prose">
        <p>
          Big-O drops constants and keeps only the fastest-growing term, because
          the shape decides whether a program finishes and the constant does
          not. <M>{"n^2 + 500n + 9000"}</M> is <M>{"O(n^2)"}</M>.
        </p>
        <p>
          Sorting first only repays itself if the data will be searched many
          times: <M>{"n\\log n + k\\log n"}</M> against <M>{"k \\times n"}</M>.
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

        <h3 className="display">Trace table</h3>
        <ol>
          <li>One column per variable, plus one for any output.</li>
          <li>One row per change, in the order the lines execute.</li>
          <li>Write the value at the moment it changes, not at the end.</li>
          <li>
            Include the iteration that fails the loop condition — that is where
            off-by-one errors become visible.
          </li>
        </ol>

        <h3 className="display">Binary search by hand</h3>
        <ol>
          <li>
            Write <code>low</code>, <code>high</code> and{" "}
            <code>mid = (low + high) // 2</code> for each step.
          </li>
          <li>Compare the target with the value at <code>mid</code>.</li>
          <li>
            Smaller, so set <code>high = mid - 1</code>; larger, so set{" "}
            <code>low = mid + 1</code>.
          </li>
          <li>
            Stop when the values match, or when <code>low &gt; high</code>,
            which means it is not there.
          </li>
        </ol>

        <h3 className="display">Building a binary search tree</h3>
        <ol>
          <li>The first value becomes the root.</li>
          <li>
            For each later value, start at the root and go left if smaller,
            right if larger.
          </li>
          <li>Insert it at the first empty place you reach — always a leaf.</li>
          <li>
            State the traversal asked for by writing the rule at every node, not
            just the root.
          </li>
        </ol>

        <h3 className="display">Tracing a sort</h3>
        <ol>
          <li>Write the list after each complete pass, not after each swap.</li>
          <li>
            Bubble: the largest remaining value reaches the end on every pass.
          </li>
          <li>
            Selection: the smallest remaining value is swapped into the next
            position.
          </li>
          <li>
            Insertion: the left-hand part is always sorted; each new element
            slides back into it.
          </li>
        </ol>
      </div>

      <p className="annotation">
        <b>Night-before checklist.</b> Theme A: can you draw all six required
        symbols from memory, fill an eight-row table without dropping a row,
        state both De Morgan laws, and group a Karnaugh map without circling
        three cells? Theme B: can you say what a constructor guarantees, insert
        a node into a linked list in the right order, write out the three
        traversals, and give the complexity of all four sorts? That is the
        course.
      </p>
    </>
  );
}
