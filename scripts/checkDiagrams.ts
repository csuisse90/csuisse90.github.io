// Parses each rendered diagram and reports geometric defects: text colliding
// with a box it does not belong to, text overlapping other text, and anything
// outside the viewBox. Eyeballing 33 figures misses things; this does not.
//
//   bun run scripts/renderDiagrams.tsx && bun run scripts/checkDiagrams.ts
import { readdirSync, readFileSync } from "node:fs";

type Rect = { x: number; y: number; w: number; h: number };
type Text = Rect & { content: string };

// Monospace at these sizes is close to 0.60 em per character, with a cap
// height near 0.72 em. Both are deliberate slight over-estimates, so a near
// miss gets reported rather than ignored.
const CHAR_W = 0.6;
const CAP_H = 0.72;

function attr(tag: string, name: string): number {
  const m = new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(tag);
  return m ? Number(m[1]) : NaN;
}

function overlap(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x < b.x + b.w - pad && a.x + a.w > b.x + pad && a.y < b.y + b.h - pad && a.y + a.h > b.y + pad
  );
}

let problems = 0;

for (const file of readdirSync("diagrams").filter((f) => f.endsWith(".html")).sort()) {
  const svg = readFileSync(`diagrams/${file}`, "utf8");
  const name = file.replace(".html", "");
  // Contact sheets hold many diagrams in one file, each with its own
  // coordinate space, so they cannot be checked as a single drawing.
  if ((svg.match(/<svg/g) ?? []).length !== 1) continue;
  const view = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!view) continue;
  const vw = Number(view[1]);
  const vh = Number(view[2]);

  // Everything is drawn inside one translate(dx 0) centring group.
  const shift = Number(/translate\((-?[\d.]+) 0\)/.exec(svg)?.[1] ?? 0);

  const rects: Rect[] = [];
  for (const tag of svg.match(/<rect[^>]*>/g) ?? []) {
    const r = {
      x: attr(tag, "x") + shift,
      y: attr(tag, "y"),
      w: attr(tag, "width"),
      h: attr(tag, "height"),
    };
    if (Number.isFinite(r.x) && Number.isFinite(r.w)) rects.push(r);
  }

  const texts: Text[] = [];
  for (const m of svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const tag = `<text${m[1]}>`;
    const content = m[2].replace(/<[^>]+>/g, "").trim();
    if (!content) continue;
    const size = attr(tag, "font-size") || 12;
    const anchor = /text-anchor="(\w+)"/.exec(tag)?.[1] ?? "start";
    const w = content.length * size * CHAR_W;
    const cx = attr(tag, "x") + shift;
    const x = anchor === "middle" ? cx - w / 2 : anchor === "end" ? cx - w : cx;
    const baseline = attr(tag, "y");
    const middle = /dominant-baseline="middle"/.test(tag);
    const y = middle ? baseline - (size * CAP_H) / 2 : baseline - size * CAP_H;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      texts.push({ x, y, w, h: size * CAP_H, content });
    }
  }

  const found: string[] = [];

  for (const t of texts) {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    for (const r of rects) {
      // Only a label wholly inside a box is that box's own label. Testing the
      // centre alone hid a caption that was half over a box and half below it.
      const inside =
        t.x >= r.x - 0.5 &&
        t.x + t.w <= r.x + r.w + 0.5 &&
        t.y >= r.y - 0.5 &&
        t.y + t.h <= r.y + r.h + 0.5;
      if (!inside && overlap(t, r, 1.5)) {
        found.push(`"${t.content}" runs into a box at x=${r.x.toFixed(0)} y=${r.y.toFixed(0)}`);
        break;
      }
    }
  }

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (overlap(texts[i], texts[j], 1)) {
        found.push(`"${texts[i].content}" overlaps "${texts[j].content}"`);
      }
    }
  }

  for (const t of texts) {
    if (t.x < -1 || t.x + t.w > vw + 1 || t.y < -1 || t.y + t.h > vh + 1) {
      found.push(`"${t.content}" falls outside the viewBox`);
    }
  }

  const unique = [...new Set(found)];
  if (unique.length) {
    problems += unique.length;
    console.log(`\n${name}`);
    for (const f of unique) console.log(`   ${f}`);
  }
}

console.log(`\n${problems} problems`);
process.exit(problems ? 1 : 0);
