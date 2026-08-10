import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SamplingLab from "@/components/labs/SamplingLab";

export const metadata: Metadata = { title: "Sampling lab" };

export default function Page() {
  return (
    <>
      <PageHead code="Lab · A1.2" title="Sampling lab" lede="How a continuous sound becomes a list of numbers, and what each extra bit costs you." />
      
      <SamplingLab />
    </>
  );
}
