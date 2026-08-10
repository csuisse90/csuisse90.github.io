import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SchedulingLab from "@/components/labs/SchedulingLab";

export const metadata: Metadata = { title: "Scheduling lab" };

export default function Page() {
  return (
    <>
      <PageHead code="Lab · A1.3" title="Scheduling lab" lede="Give the scheduler some processes and see which algorithm treats them best — and which one starves them." />
      
      <SchedulingLab />
    </>
  );
}
