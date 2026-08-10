import type { Metadata } from "next";
import FramePage from "@/components/FramePage";

export const metadata: Metadata = { title: "Programming" };

export default function Page() {
  return (
    <FramePage
      code="B2 · Programming"
      title="Programming"
      meta="B2"
      lede="The constructs every language shares, and the standard algorithms you are expected to know cold."
      intro="Every program you will write in this course is built from a small set of constructs. The languages differ in punctuation; the ideas do not. All examples on this site are in Python."
      rows={[
        { term: "Data types", body: "Integers, floats, strings, booleans, and the difference between mutable and immutable values." },
        { term: "Variables & constants", body: "Naming values, scope, and why a constant is worth declaring as one." },
        { term: "Sequence", body: "Statements executed in order — the default, and the easiest thing to get wrong when order matters." },
        { term: "Selection", body: "if, elif, else, and nested conditions." },
        { term: "Iteration", body: "Definite loops (for) and indefinite loops (while), with break and continue." },
        { term: "Collections", body: "Lists, dictionaries, sets and tuples: what each is good at and when to reach for which." },
        { term: "Subprograms", body: "Functions and procedures, parameters, return values, and why decomposition matters in code as well as in thought." },
        { term: "Searching", body: "Linear search, and binary search on sorted data." },
        { term: "Sorting", body: "Bubble, selection and insertion sort — how each works and how they compare." },
        { term: "File & error handling", body: "Reading and writing files, and handling exceptions rather than letting a program collapse." },
      ]}
    />
  );
}
