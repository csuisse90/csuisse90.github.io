import type { Metadata } from "next";
import CircuitFigure from "@/components/CircuitFigure";
import PageHead from "@/components/PageHead";
import { M, MB } from "@/components/Math";
import { circuit } from "@/lib/circuits";

export const metadata: Metadata = { title: "Truth tables" };

export default function TruthTablesPage() {
  return (
    <>
      <PageHead
        code="A1.2.4 · Construct and analyse truth tables"
        title="Truth tables"
        lede="A truth table is a circuit with nothing left to the imagination: every possible input, and what comes out."
      />

      <div className="prose">
        <p>
          A gate has a rule. A truth table is that rule written out in full,
          with one row for every combination of inputs. There is no cleverness
          to it, which is precisely why it is trustworthy: if two circuits have
          the same truth table, they do the same job, whatever they look like.
        </p>

        <h2 className="display">How many rows?</h2>
        <p>
          With <M>n</M> inputs there are <M>{"2^n"}</M> rows, because each input
          independently doubles the possibilities.
        </p>
        <MB>{"\\text{rows} = 2^n"}</MB>
        <p>
          One input, two rows. Two inputs, four. Three inputs, eight. This
          doubling is the reason large circuits are never analysed by truth
          table — a 32-bit adder would need a table with more rows than there
          are grains of sand on Earth.
        </p>

        <h2 className="display">Getting the input columns right</h2>
        <p>
          Fill the input columns by <strong>counting in binary</strong>, from
          all zeros to all ones. For three inputs that is 000, 001, 010, 011,
          100, 101, 110, 111. Do it this way every time and you will never miss
          a row or write one twice.
        </p>
        <p>
          A neat check: the rightmost column alternates 0,1,0,1; the next
          alternates in pairs 0,0,1,1; the next in fours. If your columns do not
          look like that, a row is missing.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Row numbers matter later</div>
        <p style={{ margin: 0 }}>
          Read each input row as a binary number and you get the{" "}
          <strong>row index</strong>, shown in the # column below. Row 5 of a
          three-input table is 101. When a row&apos;s output is 1 that index is
          called a <strong>minterm</strong>, and minterms are how Karnaugh maps
          and simplification are described.
        </p>
      </div>

      <CircuitFigure data={circuit("and3")} animate withTable showIndex />

      <div className="prose">
        <h2 className="display">Working out a circuit&apos;s table</h2>
        <p>
          For a circuit with more than one gate, do not try to see the answer
          all at once. Add a column for each intermediate signal and fill them
          left to right, exactly in the order the electricity arrives.
        </p>
        <p>
          Take <M>{"F = A \\cdot B + C"}</M>. First work out{" "}
          <M>{"A \\cdot B"}</M> for all eight rows. Only then OR that column
          with C. Click through the rows in the table below and watch the
          diagram follow.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-ab-plus-c")} animate withTable showIndex />

      <div className="prose">
        <p>
          Now compare it with <M>{"F = (A + B) \\cdot \\overline{C}"}</M>. Same
          three inputs, completely different output column. The brackets change
          which operation happens first, and that changes everything.
        </p>
      </div>

      <CircuitFigure data={circuit("worked-brackets")} animate withTable showIndex />

      <div className="prose">
        <h2 className="display">Going the other way: table to expression</h2>
        <p>
          You will also be asked to read an expression <em>out</em> of a table.
          The method is mechanical and always works. It is called the{" "}
          <strong>sum of products</strong>.
        </p>
        <ol>
          <li>Look only at the rows where the output is 1.</li>
          <li>
            For each of those rows, write a product (an AND) of every input:
            plain if that input is 1 in the row, barred if it is 0.
          </li>
          <li>OR all those products together.</li>
        </ol>
        <p>
          For a two-input XOR the output is 1 on rows 01 and 10, so the two
          products are <M>{"\\overline{A} \\cdot B"}</M> and{" "}
          <M>{"A \\cdot \\overline{B}"}</M>, giving
        </p>
        <MB>{"Q = \\overline{A} \\cdot B + A \\cdot \\overline{B}"}</MB>
        <p>
          That expression is guaranteed correct but almost never the shortest.
          Cutting it down is what{" "}
          <a href="/boolean-algebra/">Boolean algebra</a> and{" "}
          <a href="/karnaugh-maps/">Karnaugh maps</a> are for.
        </p>

        <h2 className="display">Circuits with more than one output</h2>
        <p>
          Nothing changes except that you add a column per output. A half adder
          has two: the sum bit and the carry bit. Each is worked out
          independently from the same inputs.
        </p>
      </div>

      <CircuitFigure data={circuit("half-adder")} animate withTable showIndex />

      <p className="annotation">
        <b>Marks are lost here.</b> Most dropped marks on truth-table questions
        are not logic errors — they are missing rows, or input columns filled in
        a random order. Count in binary. Every time.
      </p>
    </>
  );
}
