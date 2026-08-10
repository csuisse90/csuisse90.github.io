"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; code: string };
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
    head: "Tools",
    items: [
      { href: "/builder/", label: "Circuit builder", code: "LAB" },
      { href: "/expression/", label: "Expression lab", code: "LAB" },
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
    items: [
      { href: "/practice/", label: "Exam practice", code: "Q" },
      { href: "/reference/", label: "Reference sheet", code: "REF" },
    ],
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
            eeshaan
            <br />
            teaches cs
          </span>
          <span className="sub">Theme A · IB CS HL · 2027</span>
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
              >
                <span className="code">{item.code}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}

        <div className="navGroup">
          <div className="navHead">Colophon</div>
          <p
            className="mono"
            style={{ color: "var(--ink-faint)", padding: "0 0.4rem", lineHeight: 1.6 }}
          >
            Simulation engine written in C++, compiled to WebAssembly. Gate
            symbols drawn to IEEE Std 91-1984.
          </p>
        </div>
      </nav>

      <main className="main">{children}</main>
    </div>
  );
}
