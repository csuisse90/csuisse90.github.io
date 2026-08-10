import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = { title: "Labs" };

const LABS = [
  { href: "/labs/numbers/", title: "Number lab", code: "A1.2",
    body: "Slide a value and watch binary, hexadecimal and two's complement move together. Flip individual bits and see the place values add up." },
  { href: "/labs/cpu/", title: "CPU lab", code: "A1.1",
    body: "Step a tiny processor through fetch, decode and execute one stage at a time, watching every register and memory cell change." },
  { href: "/labs/scheduling/", title: "Scheduling lab", code: "A1.3",
    body: "Set your own processes, switch between three algorithms and compare the timelines and average waiting times." },
  { href: "/labs/sampling/", title: "Sampling lab", code: "A1.2",
    body: "Drag the sample rate and bit depth and watch a sound wave get more, or less, faithfully captured — and what it costs in megabytes." },
  { href: "/builder/", title: "Circuit builder", code: "A1.2.5",
    body: "A blank canvas. Place gates, wire them together, toggle the switches and get a truth table back automatically." },
  { href: "/expression/", title: "Expression lab", code: "A1.2.4",
    body: "Type a Boolean expression and get its diagram, truth table, minterms and simplest form at once." },
  { href: "/karnaugh-maps/", title: "Karnaugh lab", code: "A1.2.4",
    body: "Click cells on a live Karnaugh map and see the simplified expression and its groups recomputed as you go." },
  { href: "/labs/sql/", title: "SQL lab", code: "A3",
    body: "Write queries against a working database, join tables, and read the errors when you get it wrong." },
];

export default function LabsPage() {
  return (
    <>
      <PageHead
        code="Labs"
        title="Labs"
        lede="The parts of the course that are far quicker to understand by fiddling with them than by reading about them."
      />

      <div className="cardGrid">
        {LABS.map((l) => (
          <Link key={l.href} href={l.href} className="card">
            <div className="mono" style={{ fontSize: "0.6rem", letterSpacing: "0.16em", color: "var(--alarm)", marginBottom: "0.35rem" }}>
              {l.code}
            </div>
            <div className="cardTitle">{l.title}</div>
            <div className="cardBody">{l.body}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
