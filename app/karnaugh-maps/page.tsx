import type { Metadata } from "next";
import KMap from "@/components/KMap";
import PageHead from "@/components/PageHead";
import Practice from "@/components/Practice";
import { M, MB } from "@/components/Math";

export const metadata: Metadata = { title: "Karnaugh maps" };

export default function KarnaughPage() {
  return (
    <>
      <PageHead
        code="A1.2.4 · Simplify using Karnaugh maps"
        title="Karnaugh maps"
        lede="The same simplification as Boolean algebra, except you can see it. Rearrange the truth table so that neighbours differ by one bit, and the answer becomes a shape."
      />

      <div className="prose">
        <p>
          Algebraic simplification works, but it needs you to spot which law to
          apply and in what order. A Karnaugh map removes the guesswork. It is
          the same truth table, laid out in a grid chosen so that{" "}
          <strong>any two cells sharing an edge differ in exactly one
          input</strong>. Once that is true, simplification becomes: circle the
          blocks of 1s.
        </p>
        <p>
          Why does circling work? Two adjacent 1s differ in one variable, which
          means that variable is 1 in one cell and 0 in the other, and the
          output is 1 either way. That variable cannot matter, so it drops out —
          exactly the <M>{"C + \\overline{C} = 1"}</M> step from the algebra
          page, done by eye.
        </p>

        <h2 className="display">Gray code, and why the order looks wrong</h2>
        <p>
          The column headings do not run 00, 01, 10, 11. They run{" "}
          <strong>00, 01, 11, 10</strong>. That is Gray code, and it is the
          whole trick: in the natural order, 01 and 10 sit next to each other
          but differ in two bits, which would make the grouping rule false.
        </p>
        <p>
          The map also <strong>wraps around</strong>. The leftmost column is
          adjacent to the rightmost, and the top row to the bottom, because
          those also differ by a single bit. Groups may run off one edge and
          come back on the other.
        </p>

        <h2 className="display">The rules for grouping</h2>
        <ol>
          <li>
            Groups must contain <strong>1, 2, 4, 8, 16…</strong> cells — a power
            of two. A group of three is not allowed.
          </li>
          <li>
            Groups must be rectangles, counting the wrap-around edges.
          </li>
          <li>
            Make every group <strong>as large as possible</strong>. A bigger
            group means fewer variables in the term.
          </li>
          <li>
            Use <strong>as few groups as possible</strong>, but every 1 must be
            covered by at least one group.
          </li>
          <li>
            Groups may overlap. Reusing a 1 costs nothing.
          </li>
          <li>
            A <strong>don&apos;t care</strong> may be included if it lets you
            make a group bigger, and ignored otherwise. It is free real estate.
          </li>
        </ol>
        <p>
          Each finished group becomes one AND term: keep the variables that stay
          constant across the whole group, drop the ones that change. OR the
          terms together and you have the simplified expression.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Group size and term size</div>
        <p style={{ margin: 0 }}>
          Doubling the group removes one variable. On a four-variable map, a
          group of 1 gives a four-literal term, a group of 2 gives three, a
          group of 4 gives two, a group of 8 gives one, and a group of all 16
          means the output is simply 1.
        </p>
      </div>

      <h2 className="display">Try it</h2>
      <div className="prose">
        <p>
          Click cells to set them to 1, then again for don&apos;t care. The
          simplified expression is recomputed as you go — the same answer a
          perfect grouping by hand would give. Hover a term to see which cells
          it covers.
        </p>
      </div>

      <KMap vars={3} />

      <hr className="hr" />

      <h2 className="display">A worked four-variable example</h2>
      <div className="prose">
        <p>
          Suppose <M>{"F(A,B,C,D) = \\Sigma(0, 1, 2, 3, 8, 9, 10, 11)"}</M>. Set
          those eight cells to 1 on a four-variable map above and you will see
          them form two blocks of four, one at the top-left and one at the
          bottom-left, which together make a single block of eight.
        </p>
        <p>
          Across all eight cells, only <M>B</M> stays constant, and it stays at
          0. Everything else varies. So the entire function collapses to
        </p>
        <MB>{"F = \\overline{B}"}</MB>
        <p>
          Eight minterms, thirty-two literals written out longhand, and the
          answer is a single inverter. That is the case for learning this
          technique.
        </p>

        <h2 className="display">When not to use a map</h2>
        <p>
          Karnaugh maps are comfortable up to four variables and awkward at
          five. Beyond that the adjacency stops being visible and you are better
          off with algebra or, in industry, with software. For the exam, four is
          the most you will meet.
        </p>
      </div>

      <p className="annotation">
        <b>Common mistake.</b> Circling a group of three cells. It feels
        reasonable and it is always wrong — the algebra only cancels for powers
        of two. Take two, or take four and include a don&apos;t care.
      </p>
      <Practice
        items={[
          {
            marks: 4,
            q: <p>Use a Karnaugh map to simplify <M>{"F(A,B,C) = \\Sigma(1, 3, 5, 7)"}</M>.</p>,
            a: (
              <>
                <p>Those minterms are 001, 011, 101 and 111 — every row where <M>C</M> is 1. On the map they form a single block of four filling the columns where C = 1.</p>
                <p>Across that block A varies and B varies, but C is constantly 1, so everything that varies drops out: <M>{"F = C"}</M>.</p>
                <p>Marks are for a correctly labelled Gray-code map, one maximal group of four, and the final answer.</p>
              </>
            ),
          },
          {
            marks: 3,
            q: <p>Explain why a group of three adjacent 1s is never valid on a Karnaugh map.</p>,
            a: (
              <p>Grouping works because pairing two cells that differ in one variable lets that variable cancel, by <M>{"X + \\overline{X} = 1"}</M>. The cancellation only works for groups whose size is a power of two, because each doubling eliminates exactly one further variable. A group of three does not correspond to any such cancellation, so no valid term can be read from it.</p>
            ),
          },
        ]}
      />
    </>
  );
}
