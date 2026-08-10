"use client";

import { useState, type ReactNode } from "react";

type Kind = "deeper" | "why" | "trap" | "history";

const LABEL: Record<Kind, string> = {
  deeper: "Beyond the syllabus",
  why: "Why is it like this?",
  trap: "Where people lose marks",
  history: "How it got this way",
};

/** A digression the page is complete without. The syllabus material reads
 *  straight through; this is for the reader who wants to know why, and it
 *  starts closed so the page never looks endless.
 *
 *  `trap` asides start open, because a warning nobody opens is not a warning. */
export default function Aside({
  kind = "deeper",
  title,
  children,
}: {
  kind?: Kind;
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(kind === "trap");

  return (
    <div className="aside" data-kind={kind} data-open={open}>
      <button className="asideHead" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="asideMark" aria-hidden>
          {open ? "−" : "+"}
        </span>
        <span className="asideKind">{LABEL[kind]}</span>
        {title && <span className="asideTitle">{title}</span>}
      </button>
      {open && <div className="asideBody">{children}</div>}
    </div>
  );
}
