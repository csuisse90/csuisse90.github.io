import type { Metadata } from "next";
import FramePage from "@/components/FramePage";

export const metadata: Metadata = { title: "Abstract data types" };

export default function Page() {
  return (
    <FramePage
      code="B4 · Abstract data types · HL only"
      title="Abstract data types"
      meta="B4 · HL"
      lede="Structures defined by what you can do with them rather than by how they are stored — and the recursion that makes several of them tractable."
      intro="An abstract data type is a promise about behaviour. A stack promises that the last thing in is the first thing out; it says nothing about whether it is built from an array or a chain of nodes. HL only."
      rows={[
        { term: "Stacks", body: "Last in, first out. Push, pop and peek. Behind undo, call stacks and expression evaluation." },
        { term: "Queues", body: "First in, first out. Enqueue and dequeue. Behind print spoolers and process scheduling." },
        { term: "Linked lists", body: "Nodes each pointing to the next. Cheap insertion and deletion, no random access." },
        { term: "Binary trees", body: "Nodes with up to two children; binary search trees keep them ordered for fast lookup." },
        { term: "Tree traversal", body: "Pre-order, in-order and post-order, and what each is useful for." },
        { term: "Recursion", body: "A subprogram defined in terms of itself, with a base case that stops it. Natural for trees, and the source of a great many stack overflows." },
        { term: "Hash tables", body: "Mapping keys to positions by computation, giving near-constant lookup, and what to do about collisions." },
        { term: "Choosing a structure", body: "Matching the structure to the operations the problem performs most often." },
      ]}
    />
  );
}
