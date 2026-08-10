"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import manifest from "@/lib/generated/content.json";
import { THEME_TITLES, type Manifest } from "@/lib/content";
import DeckButton from "./DeckButton";

const { units } = manifest as unknown as Manifest;

/** Sections that are tools rather than teaching, so they are not in the
 *  content manifest. */
const TOOLS = [
  { href: "/labs/", label: "All labs", code: "IDX" },
  { href: "/expression/", label: "Expression canvas", code: "A1.2" },
  { href: "/builder/", label: "Circuit builder", code: "A1.2" },
  { href: "/labs/numbers/", label: "Number lab", code: "A1.2" },
  { href: "/labs/cpu/", label: "CPU lab", code: "A1.1" },
  { href: "/labs/scheduling/", label: "Scheduling lab", code: "A1.3" },
  { href: "/labs/sampling/", label: "Sampling lab", code: "A1.2" },
  { href: "/labs/sql/", label: "SQL lab", code: "A3" },
  { href: "/python/", label: "Terminal", code: "SH" },
  { href: "/compare/", label: "Compare two things", code: "REV" },
  { href: "/revise/", label: "Revision deck", code: "REV" },
  { href: "/reference/", label: "Reference sheet", code: "REF" },
];

/** B3 and B4 have not been rewritten yet, so their original notes stay
 *  reachable, along with the two extension pages that belong to no unit. */
const LEGACY = [
  { href: "/oop/", label: "Object-oriented", code: "B3" },
  { href: "/abstract-data-types/", label: "Abstract data types", code: "B4" },
  { href: "/circuits/", label: "Real circuits", code: "EXT" },
  { href: "/timing/", label: "Timing & hazards", code: "EXT" },
];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const here = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const [open, setOpen] = useState(false);

  // Units come out of the manifest in code order, so grouping by theme keeps
  // Theme A and Theme B apart without a second list to maintain.
  const themes = [...new Set(units.map((u) => u.id[0]))];

  return (
    <div className="shell">
      <button
        className="navToggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="sidebar"
      >
        {open ? "Close" : "Contents"}
      </button>

      <nav className="sidebar" id="sidebar" data-open={open}>
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="name">
            IB CS
            <br />
            HL
          </span>
        </Link>

        <div className="navGroup">
          <Link
            href="/"
            className="navLink"
            data-active={here === "/"}
            onClick={() => setOpen(false)}
          >
            <span className="code">00</span>
            <span>Overview</span>
          </Link>
        </div>

        {themes.map((theme) => (
          <div className="navTheme" key={theme}>
            <div className="navThemeHead">{THEME_TITLES[theme] ?? theme.toUpperCase()}</div>
            {units
              .filter((u) => u.id[0] === theme)
              .map((unit) => (
                <div className="navGroup" key={unit.id}>
                  <div className="navHead">
                    {unit.code} · {unit.title}
                  </div>
                  {unit.pages.map((page) => (
                    <Link
                      key={page.code}
                      href={page.href}
                      className="navLink"
                      data-active={here === page.href}
                      data-hl={page.hl ? true : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <span className="code">{page.code}</span>
                      <span>{page.title}</span>
                      {page.hl && <span className="hlTag">HL</span>}
                    </Link>
                  ))}
                </div>
              ))}
          </div>
        ))}

        <div className="navTheme">
          <div className="navThemeHead">Still to come</div>
          <div className="navGroup">
            <div className="navHead">Not yet rewritten</div>
            {LEGACY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="navLink"
                data-active={here === item.href}
                onClick={() => setOpen(false)}
              >
                <span className="code">{item.code}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="navTheme">
          <div className="navThemeHead">Tools</div>
          <div className="navGroup">
            {TOOLS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="navLink"
                data-active={here === item.href}
                onClick={() => setOpen(false)}
              >
                <span className="code">{item.code}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="main">{children}</main>
      <DeckButton />
    </div>
  );
}
