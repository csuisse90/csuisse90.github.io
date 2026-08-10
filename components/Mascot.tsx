"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A Claude-style starburst that checks in now and then. Hand-drawn homage in
// Claude's orange rather than an official asset.

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
const JUMP_MIN = 12_000;
const JUMP_MAX = 34_000;

/** Eleven tapered rays, like the Claude mark. */
function Starburst() {
  const rays = Array.from({ length: 11 }, (_, i) => (i * 360) / 11);
  return (
    <svg viewBox="-50 -50 100 100" width="64" height="64" aria-hidden>
      <g className="burstSpin">
        {rays.map((angle) => (
          <path
            key={angle}
            d="M0,-6 C2.6,-6 3.4,-16 2.1,-40 C1.7,-45 -1.7,-45 -2.1,-40 C-3.4,-16 -2.6,-6 0,-6 Z"
            fill="var(--claude)"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="7.5" fill="var(--claude)" />
      </g>
      <g className="burstFace">
        <circle cx="-3" cy="-1" r="1.5" fill="#fff" />
        <circle cx="3" cy="-1" r="1.5" fill="#fff" />
      </g>
    </svg>
  );
}

export default function Mascot() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [jumping, setJumping] = useState(false);
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

  // A jump at unpredictable intervals, so it never settles into a rhythm.
  useEffect(() => {
    if (dismissed) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = JUMP_MIN + Math.random() * (JUMP_MAX - JUMP_MIN);
      timer = setTimeout(() => {
        if (!document.hidden) {
          setJumping(true);
          setTimeout(() => setJumping(false), 900);
        }
        schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [dismissed]);

  useEffect(() => {
    if (seen.current === 0 || dismissed) return;
    setJumping(true);
    const t = setTimeout(() => setJumping(false), 900);
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
        onClick={() => {
          setVisible((v) => !v);
          setJumping(true);
          setTimeout(() => setJumping(false), 900);
        }}
        aria-label="Site mascot — click for a tip"
        data-jumping={jumping}
      >
        <Starburst />
      </button>
    </div>
  );
}
