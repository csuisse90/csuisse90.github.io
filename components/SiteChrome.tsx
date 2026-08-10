"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; code: string; hl?: boolean };
type Group = { head: string; items: Item[] };

export const NAV: Group[] = [
  {
    head: "Start",
    items: [{ href: "/", label: "Overview", code: "00" }],
  },
  {
    head: "A1 · Computer fundamentals",
    items: [
      { href: "/hardware/", label: "Hardware & operation", code: "A1.1" },
      { href: "/data-representation/", label: "Data representation", code: "A1.2" },
      { href: "/gates/", label: "Logic gates", code: "A1.2.3" },
      { href: "/truth-tables/", label: "Truth tables", code: "A1.2.4" },
      { href: "/boolean-algebra/", label: "Boolean algebra", code: "A1.2.4" },
      { href: "/karnaugh-maps/", label: "Karnaugh maps", code: "A1.2.4" },
      { href: "/logic-diagrams/", label: "Logic diagrams", code: "A1.2.5" },
      { href: "/operating-systems/", label: "Operating systems", code: "A1.3" },
      { href: "/translators/", label: "Translators", code: "A1.4" },
    ],
  },
  {
    head: "A2 · Networks",
    items: [
      { href: "/networks/", label: "Network fundamentals", code: "A2.1" },
      { href: "/network-architecture/", label: "Network architecture", code: "A2.2" },
      { href: "/data-transmission/", label: "Data transmission", code: "A2.3" },
    ],
  },
  {
    head: "A3 · Databases",
    items: [{ href: "/databases/", label: "Databases", code: "A3" }],
  },
  {
    head: "A4 · Machine learning",
    items: [{ href: "/machine-learning/", label: "Machine learning", code: "A4" }],
  },
  {
    head: "B · Computational thinking",
    items: [
      { href: "/computational-thinking/", label: "Computational thinking", code: "B1" },
      { href: "/programming/", label: "Programming", code: "B2" },
      { href: "/oop/", label: "Object-oriented", code: "B3" },
      { href: "/abstract-data-types/", label: "Abstract data types", code: "B4", hl: true },
    ],
  },
  {
    head: "Labs",
    items: [
      { href: "/labs/", label: "All labs", code: "IDX" },
      { href: "/labs/numbers/", label: "Number lab", code: "A1.2" },
      { href: "/labs/cpu/", label: "CPU lab", code: "A1.1" },
      { href: "/labs/scheduling/", label: "Scheduling lab", code: "A1.3" },
      { href: "/labs/sampling/", label: "Sampling lab", code: "A1.2" },
      { href: "/builder/", label: "Circuit builder", code: "A1.2" },
      { href: "/expression/", label: "Expression lab", code: "A1.2" },
      { href: "/labs/sql/", label: "SQL lab", code: "A3" },
    ],
  },
  {
    head: "Going further",
    items: [
      { href: "/circuits/", label: "Real circuits", code: "EXT" },
      { href: "/timing/", label: "Timing & hazards", code: "EXT" },
    ],
  },
  {
    head: "Revision",
    items: [{ href: "/reference/", label: "Reference sheet", code: "REF" }],
  },
];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const here = pathname.endsWith("/") ? pathname : `${pathname}/`;

  return (
    <div className="shell">
      <nav className="sidebar">
        <Link href="/" className="brand">
          <span className="name">
            IB CS
            <br />
            HL
          </span>
        </Link>

        {NAV.map((group) => (
          <div className="navGroup" key={group.head}>
            <div className="navHead">{group.head}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="navLink"
                data-active={here === item.href}
                data-hl={item.hl ? true : undefined}
              >
                <span className="code">{item.code}</span>
                <span>{item.label}</span>
                {item.hl && <span className="hlTag">HL</span>}
              </Link>
            ))}
          </div>
        ))}

      </nav>

      <main className="main">{children}</main>
    </div>
  );
}
