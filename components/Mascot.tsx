"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const LINES = [
  "Still with me? Try toggling a switch — it explains more than reading does.",
  "Tip: if a simplification looks right, build its truth table. Takes a minute.",
  "You have been reading a while. Look at something twenty metres away.",
  "Stuck? Ask me for an analogy — the button is in the corner.",
  "Nobody draws a good OR gate first time. Draw ten.",
  "Count in binary when you fill a truth table. Every single time.",
  "A group of three cells on a Karnaugh map is always wrong. Always.",
  "Halfway through a topic is the worst it ever feels. Keep going.",
  "Try a Python cell — change a number and see what breaks.",
  "Reminder: the exam wants your pencil diagram, not mine.",
  "The labs are quicker than re-reading. Go and break something.",
];

const FIRST_DELAY = 45_000;
const REPEAT_DELAY = 150_000;
const VISIBLE_FOR = 18_000;

/** Drawn on a 100 × 81 grid: a body, two side nubs, four legs, two eyes. */
function Sprite() {
  return (
    <svg viewBox="0 0 100 81" width="44" height="36" aria-hidden shapeRendering="crispEdges">
      <g fill="var(--claude)">
        <rect x="10" y="0" width="80" height="60" />
        <rect x="0" y="19" width="10" height="21" />
        <rect x="90" y="19" width="10" height="21" />
        <rect x="10" y="60" width="9" height="21" />
        <rect x="29" y="60" width="10" height="21" />
        <rect x="61" y="60" width="10" height="21" />
        <rect x="81" y="60" width="9" height="21" />
      </g>
      <g className="spriteEyes" fill="var(--ink)">
        <rect x="19" y="21" width="10" height="10" />
        <rect x="71" y="21" width="10" height="10" />
      </g>
    </svg>
  );
}

export default function Mascot() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const seen = useRef(0);

  useEffect(() => {
    if (dismissed) return;
    let hideTimer: ReturnType<typeof setTimeout>;

    const show = () => {
      if (document.hidden) return;
      setLine(seen.current % LINES.length);
      seen.current += 1;
      setVisible(true);
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

  // Navigating away closes whatever it was saying, rather than following you.
  useEffect(() => setVisible(false), [pathname]);

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
        aria-label="Study tip"
      >
        <Sprite />
      </button>
    </div>
  );
}
