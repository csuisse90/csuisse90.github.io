import type { Metadata } from "next";
import FramePage from "@/components/FramePage";

export const metadata: Metadata = { title: "Computational thinking" };

export default function Page() {
  return (
    <FramePage
      code="B1 · Computational thinking"
      title="Computational thinking"
      meta="B1"
      lede="The habits of mind that turn a messy real problem into something a machine can be told to do."
      intro="Before any code is written there is a way of thinking about the problem: breaking it apart, spotting what repeats, ignoring what does not matter, and writing down the steps precisely enough that they could be followed by something with no judgement at all."
      rows={[
        { term: "Decomposition", body: "Breaking a large problem into smaller sub-problems that can be solved and tested separately." },
        { term: "Pattern recognition", body: "Noticing where sub-problems repeat, so one solution can serve several places." },
        { term: "Abstraction", body: "Deciding what to ignore. Keeping the detail that matters for the problem and discarding the rest." },
        { term: "Algorithm design", body: "Setting out an unambiguous, finite sequence of steps, expressed as pseudocode or a flowchart before it becomes code." },
        { term: "Trace tables", body: "Following an algorithm by hand, recording every variable at every step, to find where it goes wrong." },
        { term: "Efficiency", body: "Comparing algorithms by how the work grows with the size of the input, rather than by how fast they feel." },
      ]}
    />
  );
}
