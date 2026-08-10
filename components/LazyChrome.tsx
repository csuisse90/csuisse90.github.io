"use client";

import dynamic from "next/dynamic";

// KaTeX's runtime is only needed for text rendered in the browser — assistant
// replies, mark schemes and revision cards. Maths in the prose of a page is
// already rendered to HTML at build time, so none of this belongs in the
// bundle a reader downloads to read a page.
export const LazyAiPanel = dynamic(() => import("./AiPanel"), { ssr: false });
export const LazyPagePractice = dynamic(() => import("./PagePractice"), {
  ssr: false,
  loading: () => <p className="annotation">Loading the practice questions…</p>,
});
export const LazyDeckSession = dynamic(() => import("./DeckSession"), { ssr: false });
