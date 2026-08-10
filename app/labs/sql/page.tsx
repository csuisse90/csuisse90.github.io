import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SqlLab from "@/components/labs/SqlLab";

export const metadata: Metadata = { title: "SQL lab" };

export default function Page() {
  return (
    <>
      <PageHead code="Lab · A3" title="SQL lab" lede="A working relational database in the page. Write queries against it and see the rows come back." />
      
      <SqlLab />
    </>
  );
}
