"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A small wireframe machine that checks in now and then. Deliberately drawn in
// the same hairline style as the logic gates, so it reads as part of the
// diagrams rather than as a chat widget bolted on.

const LINES = [
  "Still with me? Try toggling a switch — it explains more than reading does.",
  "Tip: if a simplification looks right, build its truth table. Takes a minute.",
  "You have been reading a while. Look at something twenty metres away.",
  "Stuck? The Ask Claude button will give you an analogy for this page.",
  "Nobody draws a good OR gate first time. Draw ten.",
  "Count in binary when you fill a truth table. Every single time.",
  "A group of three cells on a Karnaugh map is always wrong. Always.",
  "Halfway through a topic is the worst it ever feels. Keep going.",
  "Try the Python cell — change a number and see what breaks.",
  "Reminder: the exam wants your pencil diagram, not mine.",
];

const FIRST_DELAY = 45_000;
const REPEAT_DELAY = 150_000;
const VISIBLE_FOR = 18_000;

export default function Mascot() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [waving, setWaving] = useState(false);
  const seen = useRef(0);

  useEffect(() => {
    if (dismissed) return;
    let hideTimer: ReturnType<typeof setTimeout>;

    const show = () => {
      // Never interrupt someone who is mid-scroll.
      if (document.hidden) return;
      setLine(seen.current % LINES.length);
      seen.current += 1;
      setVisible(true);
      setWaving(true);
      setTimeout(() => setWaving(false), 1600);
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_FOR);
    };

    const first = setTimeout(show, FIRST_DELAY);
    const repeat = setInterval(show, REPEAT_DELAY);
    return () => {
      clearTimeout(first);
      clearTimeout(hideTimer);
      clearInterval(repeat);
    };
  }, [dismissed]);

  // A short greeting when the reader lands on a new page, after the first one.
  useEffect(() => {
    if (seen.current === 0 || dismissed) return;
    setWaving(true);
    const t = setTimeout(() => setWaving(false), 1200);
    return () => clearTimeout(t);
  }, [pathname, dismissed]);

  if (dismissed) return null;

  return (
    <div className="mascot" data-visible={visible} aria-live="polite">
      <div className="mascotBubble">
        <p>{LINES[line]}</p>
        <div className="mascotBtns">
          <button className="paletteBtn" onClick={() => setVisible(false)}>
            Thanks
          </button>
          <button
            className="paletteBtn"
            onClick={() => {
              setVisible(false);
              setDismissed(true);
            }}
          >
            Stop popping up
          </button>
        </div>
      </div>

      <button
        className="mascotBody"
        onClick={() => setVisible((v) => !v)}
        aria-label="Site mascot — click for a tip"
        data-waving={waving}
      >
        <svg viewBox="0 0 88 92" width="72" height="76" aria-hidden>
          {/* antenna */}
          <line x1="44" y1="6" x2="44" y2="18" stroke="var(--ink)" strokeWidth="2" />
          <circle className="mascotBlip" cx="44" cy="5" r="4" fill="var(--alarm)" />

          {/* head — an AND gate body, turned upright */}
          <path
            d="M14,18 H60 A22,22 0 0 1 60,62 H14 Z"
            fill="var(--paper-lift)"
            stroke="var(--ink)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* eyes */}
          <g className="mascotEyes">
            <circle cx="30" cy="36" r="4.2" fill="var(--ink)" />
            <circle cx="52" cy="36" r="4.2" fill="var(--ink)" />
          </g>

          {/* mouth: a tiny truth table */}
          <rect x="26" y="46" width="30" height="9" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
          <line x1="36" y1="46" x2="36" y2="55" stroke="var(--ink)" strokeWidth="1.2" />
          <line x1="46" y1="46" x2="46" y2="55" stroke="var(--ink)" strokeWidth="1.2" />

          {/* legs */}
          <line x1="28" y1="62" x2="28" y2="76" stroke="var(--ink)" strokeWidth="2" />
          <line x1="50" y1="62" x2="50" y2="76" stroke="var(--ink)" strokeWidth="2" />
          <line x1="20" y1="76" x2="36" y2="76" stroke="var(--ink)" strokeWidth="2" />
          <line x1="42" y1="76" x2="58" y2="76" stroke="var(--ink)" strokeWidth="2" />

          {/* waving arm */}
          <g className="mascotArm">
            <line x1="60" y1="34" x2="76" y2="26" stroke="var(--ink)" strokeWidth="2" />
          </g>
          <line x1="14" y1="34" x2="4" y2="44" stroke="var(--ink)" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
