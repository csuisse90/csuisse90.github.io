// Builds a compact map of the site for the assistant's system prompt, so it can
// point a reader at the right page. Teaching pages come from the content
// manifest; the remaining tool pages are read out of app/.
//
//   bun run scripts/siteContext.ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import type { Manifest } from "../lib/content";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const manifest = JSON.parse(
  readFileSync(join(root, "lib/generated/content.json"), "utf8"),
) as Manifest;

type Entry = { path: string; code: string; title: string; lede: string; headings: string[] };
const entries: Entry[] = [];

// Teaching pages: the manifest already holds everything except the headings,
// which come from the MDX body.
for (const page of manifest.pages) {
  const body = readFileSync(join(root, "content", page.file), "utf8");
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  entries.push({
    path: page.href,
    code: page.code + (page.hl ? " HL" : ""),
    title: page.title,
    lede: page.lede,
    headings,
  });
}

/** Every app/**\/page.tsx, without depending on a runtime-specific glob. */
function pageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) pageFiles(rel, acc);
    else if (entry.name === "page.tsx") acc.push(rel);
  }
  return acc;
}

const attr = (src: string, name: string) => src.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";

for (const file of pageFiles("app")) {
  const dir = dirname(relative("app", file));
  // The catch-all route renders the manifest pages, which are already listed.
  if (dir.includes("[")) continue;
  const path = dir === "." ? "/" : `/${dir}/`;

  const src = readFileSync(join(root, file), "utf8");
  const title =
    src.match(/<h1 className="display">([^<]+)<\/h1>/)?.[1]?.trim() ??
    attr(src, "title") ??
    path;
  const lede = src.match(/className="lede"[^>]*>\s*([^<]+)/)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  // Headings built from an expression are template text, not a real section
  // name, so they are dropped rather than shipped to the model as JSX.
  const headings = [...src.matchAll(/<h2 className="display">([^<]+)<\/h2>/g)]
    .map((m) => m[1].replace(/&amp;/g, "&").trim())
    .filter((h) => h && !h.includes("{"));

  entries.push({ path, code: attr(src, "code"), title, lede, headings });
}

entries.sort((a, b) => a.path.localeCompare(b.path));

const digest = entries
  .map((e) => {
    const head = `${e.path} — ${e.title}${e.code ? ` (${e.code})` : ""}`;
    const parts = [head];
    if (e.lede) parts.push(`  ${e.lede}`);
    if (e.headings.length) parts.push(`  sections: ${e.headings.join("; ")}`);
    return parts.join("\n");
  })
  .join("\n\n");

const target = join(root, "lib", "generated", "siteContext.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ digest }));
console.log(`wrote ${entries.length} pages, ${(digest.length / 1024).toFixed(1)} kB of context`);
