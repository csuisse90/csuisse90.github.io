"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; text: string; level: number };

/** Sticky in-page contents, read from the headings the MDX produced rather
 *  than declared by hand, so it cannot drift from the page. Highlights the
 *  section you are actually looking at. */
export default function Contents() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>(".mdx h2, .mdx h3"),
    );

    const found = headings.map((h, i) => {
      if (!h.id) h.id = `s${i}-${(h.textContent ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`;
      return { id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 };
    });
    setEntries(found);
    if (found.length === 0) return;

    // rootMargin pins the trigger line near the top of the viewport, so a
    // heading counts as current from the moment it reaches the top rather
    // than when it is centred.
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) seen.add(r.target.id);
          else seen.delete(r.target.id);
        }
        const first = found.find((e) => seen.has(e.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (entries.length < 3) return null;

  return (
    <aside className="contents" aria-label="On this page">
      <div className="contentsHead">On this page</div>
      <ol className="contentsList">
        {entries.map((e) => (
          <li key={e.id} data-level={e.level} data-active={e.id === active}>
            <a href={`#${e.id}`}>{e.text}</a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
