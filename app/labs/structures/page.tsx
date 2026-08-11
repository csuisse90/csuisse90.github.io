import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import StructuresLab from "@/components/labs/StructuresLab";

export const metadata: Metadata = { title: "Data structures lab" };

export default function Page() {
  return (
    <>
      <PageHead
        code="Lab · B4.1"
        title="Data structures lab"
        lede="Drive a stack, a circular queue, a linked list and a binary search tree by their own operations, and see what each call costs."
      />

      <StructuresLab />
    </>
  );
}
