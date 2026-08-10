import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import NumberLab from "@/components/labs/NumberLab";

export const metadata: Metadata = { title: "Number lab" };

export default function Page() {
  return (
    <>
      <PageHead code="Lab · A1.2" title="Number lab" lede="Denary, binary, hexadecimal and two's complement, all showing the same value at once." />
      
      <NumberLab />
    </>
  );
}
