import type { Metadata } from "next";

import PageHead from "@/components/PageHead";
import { LazyDiagramExam } from "@/components/LazyEngine";

export const metadata: Metadata = { title: "Marked diagram questions" };

export default function DiagramsPage() {
  return (
    <>
      <PageHead
        code="LAB · Assessment"
        title="Marked diagram questions"
        lede="Draw the circuit the question asks for and have it marked — not by comparing pictures, but by running your diagram and comparing it with a model built from the expression."
      />

      <LazyDiagramExam />

      <div className="prose">
        <h2 className="display">How the marking works</h2>
        <p>
          A diagram is not marked by looking at it. Your circuit is run against
          every possible combination of its inputs, and the answers are compared
          with a model built from the expression in the question. That is the
          bulk of the marks, and it is awarded row by row: a diagram that is
          right for six rows of eight gets credit for six.
        </p>
        <p>
          The last mark is for the shape. Two diagrams that compute the same
          thing can still be different drawings, so each node is given a
          canonical name made from its gate and the sorted names of whatever
          feeds it. Sorting is the important part — it is what makes{" "}
          <em>A AND B</em> and <em>B AND A</em> the same answer, which on paper
          they obviously are. When every name matches the model, you drew the
          model answer exactly, and it says so.
        </p>
        <p>
          Because the model is built from the expression at the moment you press
          the button, a question can never disagree with its own mark scheme.
        </p>

        <h2 className="display">What it will not do</h2>
        <p>
          It marks what the circuit does, not how neatly it is laid out, and it
          has no opinion about crossing wires. A real examiner marks the drawing
          too. Treat a full score here as &ldquo;this works&rdquo;, not as
          &ldquo;this would be presented well&rdquo;.
        </p>
      </div>
    </>
  );
}
