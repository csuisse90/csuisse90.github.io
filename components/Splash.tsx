"use client";

import { useEffect, useState } from "react";

// Shown once per browsing session: the title fades up, holds while the service
// worker takes its first copy of the site, then the whole overlay fades out.
const SEEN = "splashSeen";

export default function Splash() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SEEN)) return;
      window.sessionStorage.setItem(SEEN, "1");
    } catch {
      // A refused store means it shows every visit. Harmless.
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("in");
    const out = setTimeout(() => setPhase("out"), 1400);
    const gone = setTimeout(() => setPhase("hidden"), 2600);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className="splash" data-phase={phase} aria-hidden>
      <div className="splashMark">IB CS HL</div>
    </div>
  );
}
