"use client";

import { useEffect, useRef, useState } from "react";

/** Click any static diagram to see it full screen. Mounted once, it delegates
 *  from the document rather than wrapping every figure, so a new figure needs
 *  no wiring — only the `data-zoomable` marker its container already carries.
 *
 *  Interactive circuits are deliberately excluded: on those a click toggles a
 *  switch, and stealing it would break the thing the page is teaching. */
export default function DiagramZoom() {
  const [markup, setMarkup] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const holder = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const host = target?.closest<HTMLElement>("[data-zoomable]");
      if (!host) return;
      const svg = host.querySelector("svg");
      if (!svg) return;
      event.preventDefault();
      setScale(1);
      setMarkup(svg.outerHTML);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!markup) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMarkup(null);
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(6, s * 1.25));
      if (e.key === "-") setScale((s) => Math.max(1, s / 1.25));
      if (e.key === "0") setScale(1);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [markup]);

  if (!markup) return null;

  return (
    <div
      className="zoomOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Diagram, enlarged"
      onClick={() => setMarkup(null)}
    >
      <div className="zoomBar" onClick={(e) => e.stopPropagation()}>
        <button className="paletteBtn" onClick={() => setScale((s) => Math.max(1, s / 1.25))}>
          −
        </button>
        <span className="mono zoomLevel">{Math.round(scale * 100)}%</span>
        <button className="paletteBtn" onClick={() => setScale((s) => Math.min(6, s * 1.25))}>
          +
        </button>
        <button className="paletteBtn ghost" onClick={() => setScale(1)}>
          Fit
        </button>
        <button className="paletteBtn ghost" onClick={() => setMarkup(null)}>
          Close
          <span className="deckHint">esc</span>
        </button>
      </div>

      {/* Scrolls when zoomed past the viewport, so a large diagram can be
          read a piece at a time rather than shrunk to fit. */}
      <div className="zoomScroll" onClick={(e) => e.stopPropagation()}>
        <div
          ref={holder}
          className="zoomStage"
          style={{ width: `${scale * 100}%` }}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </div>
    </div>
  );
}
