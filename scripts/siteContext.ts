// Builds a compact map of the site for the assistant's system prompt: every
// page, its syllabus code, its one-line description and its section headings.
// Run: bun run scripts/siteContext.ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** Every app/**\/page.tsx, without depending on a runtime-specific glob. */
function pageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) pageFiles(rel, acc);
    else if (entry.name === "page.tsx") acc.push(rel);
  }
  return acc;
}

const attr = (src: string, name: string) => {
  const m = src.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : "";
};

type Page = { path: string; code: string; title: string; lede: string; sections: string[] };
const pages: Page[] = [];

for (const file of pageFiles("app")) {
  const src = readFileSync(join(root, file), "utf8");
  const dir = dirname(relative("app", file));
  const path = dir === "." ? "/" : `/${dir}/`;

  const head = src.slice(src.indexOf("<PageHead"), src.indexOf("/>", src.indexOf("<PageHead")) + 2);
  const sections = [...src.matchAll(/<h2 className="display">([\s\S]*?)<\/h2>/g)]
    .map((m) =>
      m[1]
        .replace(/\{[^}]*\}/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  pages.push({
    path,
    code: attr(head, "code"),
    title: attr(head, "title"),
    lede: attr(head, "lede"),
    sections,
  });
}

pages.sort((a, b) => a.path.localeCompare(b.path));

const lines = pages.map((p) => {
  const head = `${p.path} — ${p.title}${p.code ? ` [${p.code}]` : ""}`;
  const body = p.lede ? `\n    ${p.lede}` : "";
  const secs = p.sections.length ? `\n    Sections: ${p.sections.join("; ")}` : "";
  return `${head}${body}${secs}`;
});

const out = join(root, "lib", "generated", "siteContext.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ pages, digest: lines.join("\n") }, null, 0));
console.log(`${pages.length} pages, ${(lines.join("\n").length / 1024).toFixed(1)} kB digest`);
