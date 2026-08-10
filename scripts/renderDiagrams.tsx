// Renders every figure component to a standalone SVG in diagrams/, so each one
// can be looked at on its own rather than hunted for inside a page.
//
//   bun run scripts/renderDiagrams.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import * as systems from "../components/figures/systems";
import * as dataNet from "../components/figures/dataNet";
import * as dbMl from "../components/figures/dbMl";
import * as foundations from "../components/figures/foundations";

const SKIP = new Set(["Figure", "Box", "Arrow", "Caption", "Stack"]);
const all = { ...systems, ...dataNet, ...dbMl, ...foundations } as Record<string, unknown>;

mkdirSync("diagrams", { recursive: true });

// The panel chrome and captions are HTML around the SVG, so the markup is
// unwrapped to the <svg> element and given the site's palette as literals.
const PALETTE: Record<string, string> = {
  "--ink": "#0f1413",
  "--ink-soft": "#5c6462",
  "--ink-faint": "#949b99",
  "--ice": "#d6e4ea",
  "--ice-line": "#b3ccd6",
  "--ice-deep": "#6f9dad",
  "--teal": "#2c5b67",
  "--alarm": "#d33a1c",
  "--hairline": "#d7d7d1",
  "--paper": "#f3f3f0",
  "--paper-lift": "#fbfbf9",
  "--font-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
  "--font-archivo": "system-ui, sans-serif",
};

function resolve(markup: string): string {
  return markup.replace(/var\((--[\w-]+)\)(?:,\s*[^)"';]+)?/g, (whole, name) => PALETTE[name] ?? whole);
}

let count = 0;
for (const [name, Component] of Object.entries(all)) {
  if (SKIP.has(name) || typeof Component !== "function") continue;
  const html = renderToStaticMarkup(<>{(Component as () => JSX.Element)()}</>);
  const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
  if (!svg) {
    console.error(`${name}: no svg found`);
    continue;
  }
  const caption = html.match(/class="caption">([\s\S]*?)<\/p>/)?.[1] ?? "";
  // Wrapped in HTML rather than written as a bare SVG: the component already
  // sets a style attribute, and adding a second one makes the file invalid XML.
  writeFileSync(
    `diagrams/${name}.html`,
    `<!doctype html><meta charset="utf-8"><title>${name}</title>` +
      `<style>body{margin:0;background:#fbfbf9;padding:24px;` +
      `font-family:ui-monospace,SFMono-Regular,Menlo,monospace}` +
      `svg{width:1100px;height:auto;display:block}</style>` +
      resolve(svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')),
  );
  writeFileSync(`diagrams/${name}.txt`, caption.replace(/<[^>]+>/g, "").trim());
  count++;
}
console.log(`wrote ${count} diagrams to diagrams/`);
