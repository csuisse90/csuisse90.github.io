import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import CpuLab from "@/components/labs/CpuLab";

export const metadata: Metadata = { title: "CPU lab" };

export default function Page() {
  return (
    <>
      <PageHead code="Lab · A1.1" title="CPU lab" lede="A processor small enough to follow by eye. Step it through the cycle and watch every register." />
      
      <CpuLab />
    </>
  );
}
