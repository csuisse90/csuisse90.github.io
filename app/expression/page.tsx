import type { Metadata } from "next";
import ExpressionLab from "@/components/ExpressionLab";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = { title: "Expression lab" };

export default function ExpressionPage() {
  return (
    <>
      <PageHead
        code="LAB · Expression to everything"
        title="Expression lab"
        lede="Type a Boolean expression. Get it typeset properly, its full truth table, its minterms, its simplest form and its logic diagram."
      />

      <div className="prose">
        <p>
          This is the fastest way to check your own work. Simplify an expression
          by hand, type both versions in, and compare the truth tables — if they
          differ anywhere, your simplification went wrong.
        </p>
      </div>

      <ExpressionLab />

      <div className="prose">
        <h2 className="display">Notation it understands</h2>
        <ul>
          <li>
            <strong>AND</strong>: <code>A.B</code>, <code>A*B</code>,{" "}
            <code>A&amp;B</code>, <code>A·B</code>, or just <code>AB</code>
          </li>
          <li>
            <strong>OR</strong>: <code>A+B</code> or <code>A|B</code>
          </li>
          <li>
            <strong>NOT</strong>: <code>A&apos;</code>, <code>!A</code>,{" "}
            <code>~A</code>, <code>¬A</code>, or <code>NOT A</code>
          </li>
          <li>
            <strong>XOR</strong>: <code>A^B</code>, <code>A⊕B</code>, or{" "}
            <code>A XOR B</code>
          </li>
          <li>
            <strong>NAND, NOR, XNOR</strong> as words between two terms
          </li>
          <li>Brackets, and the constants 0 and 1</li>
        </ul>
        <p>
          Variables are single letters, so <code>AB</code> is read as A AND B,
          the way it is written in a textbook. Precedence is NOT, then AND, then
          XOR, then OR.
        </p>
      </div>
    </>
  );
}
