import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SortingLab from "@/components/labs/SortingLab";

export const metadata: Metadata = { title: "Sorting lab" };

export default function Page() {
  return (
    <>
      <PageHead
        code="Lab · B4.1.6"
        title="Sorting lab"
        lede="Step four sorting algorithms through the same data one comparison at a time, and watch the counts diverge."
      />

      <SortingLab />
    </>
  );
}
