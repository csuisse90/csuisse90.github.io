import Link from "next/link";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { circuit } from "@/lib/circuits";

export default function Home() {
  return (
    <>
      <PageHead
        title="Computer science, explained until it actually makes sense"
        lede="A full written course for IB Computer Science HL, with a logic simulator you can slow down, Python you can run in the page, and diagrams for everything."
      />

      <div className="prose">
        <p>
          Most revision material tells you what is true. It rarely tells you{" "}
          <em>why anyone decided it should be</em>. Why two&apos;s complement is
          the awkward shape it is, why a Karnaugh map&apos;s columns run 00, 01,
          11, 10, why databases are cut into so many tables when one would do.
          Every one of those has a reason, and the reason is nearly always more
          memorable than the rule.
        </p>
        <p>
          So this site is built around showing things working rather than
          asserting them. The logic diagrams are a real simulator — click a
          switch and the change travels through the gates one delay at a time,
          slowly enough that you can watch a circuit briefly give the wrong
          answer. The Python is genuinely executable, in the page, so you can
          break it and see what happens. The database example is a real
          database.
        </p>
        <p>
          Anything that goes beyond the syllabus is labelled as such, so you
          always know what you are actually accountable for.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Three things to try</div>
        <p style={{ margin: 0 }}>
          Click a switch on the gate below and press <strong>Run</strong> at
          1/16× speed. Open <strong>Ask Claude</strong> for an analogy for
          whatever page you are on. And on any Python block, change a number and
          run it again.
        </p>
      </div>

      <CircuitFigure data={circuit("and2")} animate withTable />

      <div className="scanline">
        fitter · happier · more productive · comfortable · not drinking too much
        · regular exercise at the gym · three days a week
      </div>

      <h2 className="display">A1 · Computer fundamentals</h2>

      <div className="cardGrid">
        <Link href="/hardware/" className="card">
          <div className="cardTitle">Hardware &amp; operation</div>
          <div className="cardBody">
            Inside the CPU, the fetch–decode–execute cycle, memory, storage,
            compression and cloud. A1.1.
          </div>
        </Link>
        <Link href="/data-representation/" className="card">
          <div className="cardTitle">Data representation</div>
          <div className="cardBody">
            Binary, hexadecimal, two&apos;s complement, and how text, images and
            sound become numbers. A1.2.1–A1.2.2.
          </div>
        </Link>
        <Link href="/gates/" className="card">
          <div className="cardTitle">Logic gates</div>
          <div className="cardBody">
            All seven gates, each with its proper symbol, its truth table and
            what it is actually for. A1.2.3.
          </div>
        </Link>
        <Link href="/truth-tables/" className="card">
          <div className="cardTitle">Truth tables</div>
          <div className="cardBody">
            Building them, reading them, and turning them into Boolean
            expressions. A1.2.4.
          </div>
        </Link>
        <Link href="/boolean-algebra/" className="card">
          <div className="cardTitle">Boolean algebra</div>
          <div className="cardBody">
            The laws, De Morgan&apos;s theorems, and simplifying by hand.
            A1.2.4.
          </div>
        </Link>
        <Link href="/karnaugh-maps/" className="card">
          <div className="cardTitle">Karnaugh maps</div>
          <div className="cardBody">
            The picture that makes simplification obvious, with an interactive
            map. A1.2.4.
          </div>
        </Link>
        <Link href="/logic-diagrams/" className="card">
          <div className="cardTitle">Logic diagrams</div>
          <div className="cardBody">
            Drawing circuits the way an examiner expects to see them. A1.2.5.
          </div>
        </Link>
        <Link href="/operating-systems/" className="card">
          <div className="cardTitle">Operating systems</div>
          <div className="cardBody">
            Scheduling, interrupts, multitasking, and the control systems that
            run lifts and greenhouses. A1.3.
          </div>
        </Link>
        <Link href="/translators/" className="card">
          <div className="cardTitle">Translators</div>
          <div className="cardBody">
            Compilers against interpreters, and what actually happens during
            compilation. A1.4.
          </div>
        </Link>
      </div>

      <h2 className="display">A2 · Networks</h2>

      <div className="cardGrid">
        <Link href="/networks/" className="card">
          <div className="cardTitle">Network fundamentals</div>
          <div className="cardBody">
            Network types, hardware, the OSI layers, protocols, addressing and
            VPNs. A2.1.
          </div>
        </Link>
        <Link href="/network-architecture/" className="card">
          <div className="cardTitle">Network architecture</div>
          <div className="cardBody">
            Topologies, servers, client–server against peer-to-peer, and
            segmentation. A2.2.
          </div>
        </Link>
        <Link href="/data-transmission/" className="card">
          <div className="cardTitle">Data transmission</div>
          <div className="cardBody">
            Wired and wireless media, packet switching, error checking and
            encryption. A2.3.
          </div>
        </Link>
      </div>

      <h2 className="display">A3 &amp; A4</h2>

      <div className="cardGrid">
        <Link href="/databases/" className="card">
          <div className="cardTitle">Databases</div>
          <div className="cardBody">
            Tables, keys, normalisation, SQL and ACID, with a database you can
            query. A3.
          </div>
        </Link>
        <Link href="/machine-learning/" className="card">
          <div className="cardTitle">Machine learning</div>
          <div className="cardBody">
            Supervised, unsupervised and reinforcement learning, training,
            overfitting, and bias. A4.
          </div>
        </Link>
      </div>

      <h2 className="display">Labs, extras and revision</h2>

      <div className="cardGrid">
        <Link href="/labs/" className="card">
          <div className="cardTitle">All labs</div>
          <div className="cardBody">
            Eight interactive labs — numbers, a CPU you can step, scheduling,
            sampling, circuits, expressions, Karnaugh maps and SQL.
          </div>
        </Link>
        <Link href="/builder/" className="card">
          <div className="cardTitle">Circuit builder</div>
          <div className="cardBody">
            A blank canvas. Place gates, wire them up, and get a truth table
            back automatically.
          </div>
        </Link>
        <Link href="/expression/" className="card">
          <div className="cardTitle">Expression lab</div>
          <div className="cardBody">
            Type a Boolean expression, get its diagram, its truth table and its
            simplest form.
          </div>
        </Link>
        <Link href="/circuits/" className="card">
          <div className="cardTitle">Real circuits</div>
          <div className="cardBody">
            Adders, multiplexers, decoders and a latch that remembers. Beyond
            the syllabus.
          </div>
        </Link>
        <Link href="/timing/" className="card">
          <div className="cardTitle">Timing &amp; hazards</div>
          <div className="cardBody">
            Why a circuit can give the wrong answer for a billionth of a second.
          </div>
        </Link>
        <Link href="/reference/" className="card">
          <div className="cardTitle">Reference sheet</div>
          <div className="cardBody">
            Every symbol, every law, every truth table on one page.
          </div>
        </Link>
      </div>

      <h2 className="display">B · Computational thinking and programming</h2>

      <div className="cardGrid">
        <Link href="/computational-thinking/" className="card">
          <div className="cardTitle">Computational thinking</div>
          <div className="cardBody">Decomposition, abstraction, algorithm design. B1.</div>
        </Link>
        <Link href="/programming/" className="card">
          <div className="cardTitle">Programming</div>
          <div className="cardBody">Constructs, collections, searching and sorting. B2.</div>
        </Link>
        <Link href="/oop/" className="card">
          <div className="cardTitle">Object-oriented</div>
          <div className="cardBody">Classes, encapsulation, inheritance, polymorphism. B3.</div>
        </Link>
        <Link href="/abstract-data-types/" className="card">
          <div className="cardTitle">Abstract data types</div>
          <div className="cardBody">Stacks, queues, trees, recursion. B4, HL only.</div>
        </Link>
      </div>

      <h2 className="display">How to use this</h2>
      <div className="prose">
        <p>
          Read the syllabus pages in order. Within A1.2 they build on each
          other: gates give you the vocabulary, truth tables give you the
          method, Boolean algebra and Karnaugh maps give you the shortcut, and
          logic diagrams put it back together as something you can draw in an
          exam.
        </p>
        <p>
          Code examples are Python, and most of them are{" "}
          <strong>editable and runnable</strong> right in the page. Change a
          number, run it again, see what breaks.
        </p>
        <p>
          The <strong>Ask Claude</strong> button will explain whatever page you
          are on as an analogy, or answer a question.
        </p>
      </div>
    </>
  );
}
