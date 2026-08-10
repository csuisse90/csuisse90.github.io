import Link from "next/link";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { circuit } from "@/lib/circuits";

export default function Home() {
  return (
    <>
      <PageHead
        code="IB Computer Science HL · First assessment 2027 · Theme A"
        title="Computer fundamentals and networks, written out properly"
        lede="The whole of A1 and A2, from one switch to a working adder to a packet crossing an ocean — with a simulator you can slow down until you can see the electricity think."
      />

      <div className="prose">
        <p>
          A computer has no idea what a number is. It has switches, and each
          switch is either on or off. Every photograph, every song, every game
          you have ever loaded is that, underneath: a very large number of
          switches, arranged so that the pattern of on and off means something.
        </p>
        <p>
          A <strong>logic gate</strong> is the piece that makes those switches
          useful. It is a tiny circuit that looks at one or two switches and
          decides what a third one should do. On its own a gate is almost
          insultingly simple. Put a few billion of them together and you have
          something that can run a browser.
        </p>
        <p>
          This site covers <strong>Theme A</strong> in full —{" "}
          <strong>A1 Computer fundamentals</strong> and{" "}
          <strong>A2 Networks</strong> — and then keeps going a little further
          in places, because the point where it gets interesting is often just
          past the edge of the syllabus. Anything beyond the syllabus is
          labelled as such, so you always know what you are accountable for.
        </p>
        <p>
          The logic sections are the ones with the simulator attached. Start
          anywhere, but the A1.2 pages build on each other in order.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Try it now</div>
        <p style={{ margin: 0 }}>
          Below is an AND gate. Click either switch to flip it between 0 and 1.
          Press <strong>Run</strong>, and drop the speed to 1/16× to watch the
          signal actually travel.
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

      <h2 className="display">Tools, extras and revision</h2>

      <div className="cardGrid">
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
        <Link href="/practice/" className="card">
          <div className="cardTitle">Exam practice</div>
          <div className="cardBody">
            Questions in the style of the paper, with worked answers.
          </div>
        </Link>
        <Link href="/reference/" className="card">
          <div className="cardTitle">Reference sheet</div>
          <div className="cardBody">
            Every symbol, every law, every truth table on one page.
          </div>
        </Link>
      </div>

      <h2 className="display">How to use this</h2>
      <div className="prose">
        <p>
          Read the syllabus pages in order. They build on each other: gates give
          you the vocabulary, truth tables give you the method, Boolean algebra
          and Karnaugh maps give you the shortcut, and logic diagrams put it
          back together as something you can draw in an exam.
        </p>
      </div>
    </>
  );
}
