"use client";

import { Fragment, type ReactNode } from "react";
import katex from "katex";

// Model replies are markdown that usually contains maths. Maths is pulled out
// first and stood in for by a sentinel, so markdown parsing can never see the
// backslashes and underscores inside a formula; it goes back in at the end.
const MATHS = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
const SENTINEL = /^\uE000(\d+)\uE000$/;

function tex(src: string, display: boolean) {
  return katex.renderToString(src, { displayMode: display, throwOnError: false, output: "html" });
}

/** Renders one extracted maths span. */
function maths(src: string, key: number) {
  if (src.startsWith("$$") || src.startsWith("\\[")) {
    return <div key={key} dangerouslySetInnerHTML={{ __html: tex(src.slice(2, -2), true) }} />;
  }
  const body = src.startsWith("\\(") ? src.slice(2, -2) : src.slice(1, -1);
  return <span key={key} dangerouslySetInnerHTML={{ __html: tex(body, false) }} />;
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)\s]+\)|\uE000\d+\uE000)/;

function inline(text: string, held: string[], keyBase: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    const sentinel = SENTINEL.exec(part);
    if (sentinel && part.length === sentinel[0].length) {
      return <Fragment key={key}>{maths(held[Number(sentinel[1])], i)}</Fragment>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (
      part.length > 2 &&
      ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noreferrer noopener">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const BULLET = /^\s*[-*+]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;
const HEADING = /^(#{1,6})\s+(.*)$/;

/** Groups lines into blocks and renders each. Streaming means the last block
 *  may still be half-written, so nothing here requires a closing marker. */
function blocks(src: string, held: string[]): ReactNode[] {
  const lines = src.split("\n");
  const out: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.trimStart().startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) body.push(lines[i++]);
      i++; // closing fence, if it has arrived
      out.push(
        <pre key={out.length}>
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Display maths standing on its own line is a block, not a paragraph.
    const alone = SENTINEL.exec(line.trim());
    if (alone && /^(\$\$|\\\[)/.test(held[Number(alone[1])])) {
      out.push(<Fragment key={out.length}>{maths(held[Number(alone[1])], out.length)}</Fragment>);
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      out.push(<p key={out.length} className="aiHeading">{inline(heading[2], held, `h${i}`)}</p>);
      i++;
      continue;
    }

    const ordered = NUMBER.test(line);
    if (ordered || BULLET.test(line)) {
      const items: ReactNode[] = [];
      const marker = ordered ? NUMBER : BULLET;
      while (i < lines.length && marker.test(lines[i])) {
        items.push(<li key={items.length}>{inline(lines[i].replace(marker, ""), held, `l${i}`)}</li>);
        i++;
      }
      out.push(
        ordered ? <ol key={out.length}>{items}</ol> : <ul key={out.length}>{items}</ul>,
      );
      continue;
    }

    // A paragraph runs until a blank line or the start of another block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith("```") &&
      !BULLET.test(lines[i]) &&
      !NUMBER.test(lines[i]) &&
      !HEADING.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    out.push(<p key={out.length}>{inline(para.join("\n"), held, `p${i}`)}</p>);
  }

  return out;
}

export default function RichText({ text }: { text: string }) {
  const held: string[] = [];
  const masked = text.replace(MATHS, (m) => `\uE000${held.push(m) - 1}\uE000`);
  return <>{blocks(masked, held)}</>;
}
