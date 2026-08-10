import type { Metadata } from "next";
import Compare from "@/components/Compare";

export const metadata: Metadata = {
  title: "Compare two things",
  description:
    "The pairs of concepts students actually confuse, set against each other axis by axis.",
};

export default function ComparePage() {
  return (
    <>
      <header className="pageHead">
        <div className="kicker">Revision</div>
        <h1 className="display">Compare two things</h1>
        <p className="lede" style={{ marginTop: "1rem" }}>
          Almost nobody misunderstands a concept on its own. They misunderstand it next to the
          one it sounds like. Here are the pairs that actually cost marks.
        </p>
      </header>
      <Compare />
    </>
  );
}
