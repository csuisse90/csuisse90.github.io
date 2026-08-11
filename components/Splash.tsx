"use client";

import { useEffect, useState } from "react";

// Shown once per browsing session: the mark fades up and grows, then the whole
// overlay fades out onto the page underneath.
const SEEN = "splashSeen";

export default function Splash() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    if (window.sessionStorage.getItem(SEEN)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem(SEEN, "1");
      return;
    }
    window.sessionStorage.setItem(SEEN, "1");
    setPhase("in");
    const out = setTimeout(() => setPhase("out"), 1900);
    const gone = setTimeout(() => setPhase("hidden"), 3200);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className="splash" data-phase={phase} aria-hidden>
      {/* Anthropic's own Claude mark, rather than a hand-drawn approximation. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/claude.png" alt="" width={150} height={150} className="splashSprite" />
    </div>
  );
}
