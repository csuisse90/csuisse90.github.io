"use client";

import katex from "katex";

// Model replies are plain prose that sometimes contain maths. Anything between
// $…$ or $$…$$, or \( … \), is rendered rather than shown as source.
const SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;

function render(tex: string, display: boolean) {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
  });
}

export default function RichText({ text }: { text: string }) {
  const parts = text.split(SPLIT);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: render(part.slice(2, -2), true) }}
            />
          );
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: render(part.slice(2, -2), true) }}
            />
          );
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: render(part.slice(1, -1), false) }}
            />
          );
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: render(part.slice(2, -2), false) }}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
