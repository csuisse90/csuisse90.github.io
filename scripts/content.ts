// Walks content/ and writes lib/generated/content.json: the navigation tree,
// page order for prev/next, every revision card and every practice question.
//
// Only frontmatter is read here, never the MDX body, so this stays fast as the
// course grows. Run with:  bun run scripts/content.ts
import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

import {
  compareCodes,
  UNIT_TITLES,
  type Frontmatter,
  type Manifest,
  type Page,
  type Unit,
} from "../lib/content";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const contentDir = join(root, "content");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".mdx")) out.push(full);
  }
  return out;
}

function fail(file: string, why: string): never {
  console.error(`${relative(root, file)}: ${why}`);
  process.exit(1);
}

const pages: Page[] = [];

// Prose in YAML has to be a block scalar. Markdown and LaTeX are full of
// characters YAML reads as syntax — a card starting "**Input**" parses as an
// alias, a point containing ": " parses as a mapping — and the failures are
// obscure. Requiring ">-" everywhere makes the whole class of problem go away.
const PLAIN_PROSE = /^\s*(?:- )?(?:q|a|lede):[ \t]+(?![>|])\S/m;

for (const file of walk(contentDir)) {
  const raw = readFileSync(file, "utf8");
  const front = raw.split(/^---$/m)[1] ?? "";
  if (PLAIN_PROSE.test(front)) {
    const line = front.split("\n").find((l) => PLAIN_PROSE.test(l))?.trim();
    fail(file, `frontmatter prose must use a ">-" block scalar — found: ${line}`);
  }
  for (const [i, line] of front.split("\n").entries()) {
    if (/^\s+- (?![>|])\S/.test(line) && /points:/.test(front.split("\n")[i - 1] ?? "")) {
      fail(file, `mark scheme points must use ">-" block scalars — found: ${line.trim()}`);
    }
  }

  // A double quote inside a double-quoted JSX attribute closes it early, and
  // MDX then reports a confusing error about attribute names. Catch it here,
  // pointing at the actual line.
  const body = raw.slice(raw.indexOf("---", 3) + 3);
  for (const line of body.split("\n")) {
    const attr = /\s\w+="([^"]*)"[^>]*>/.exec(line);
    if (attr && /\s\w+="[^"]*"[^=>]*"/.test(line) && !line.includes("={")) {
      fail(file, `nested double quote in a JSX attribute — use “ ” instead:\n  ${line.trim()}`);
    }
  }

  const { data } = matter(raw);
  const fm = data as Frontmatter;

  if (!fm.code) fail(file, "frontmatter needs a code");
  if (!fm.title) fail(file, "frontmatter needs a title");
  if (!fm.lede) fail(file, "frontmatter needs a lede");

  for (const q of fm.practice ?? []) {
    if (!q.points?.length) fail(file, `question "${q.q?.slice(0, 40)}" has no mark scheme`);
    if (q.points.length !== q.marks) {
      fail(
        file,
        `question "${q.q?.slice(0, 40)}" is worth ${q.marks} but the scheme has ` +
          `${q.points.length} points — one point per mark`,
      );
    }
  }

  const rel = relative(contentDir, file).replace(/\.mdx$/, "");
  const parts = rel.split(sep);
  if (parts.length < 3) fail(file, "expected content/<theme>/<unit>/<page>.mdx");

  const slug = parts.join("/");
  pages.push({
    ...fm,
    slug,
    href: `/${slug}/`,
    file: relative(contentDir, file),
    theme: parts[0],
    unit: parts[1],
  });
}

pages.sort((a, b) => compareCodes(a.code, b.code));

const seen = new Set<string>();
for (const p of pages) {
  if (seen.has(p.code)) fail(join(contentDir, p.file), `duplicate code ${p.code}`);
  seen.add(p.code);
}

const byCode = new Map(pages.map((p) => [p.code, p]));
for (const p of pages) {
  for (const need of p.prereqs ?? []) {
    if (!byCode.has(need)) fail(join(contentDir, p.file), `unknown prerequisite ${need}`);
  }
}

const units: Unit[] = [];
for (const p of pages) {
  let unit = units.find((u) => u.id === p.unit);
  if (!unit) {
    unit = {
      id: p.unit,
      code: p.unit.toUpperCase(),
      title: UNIT_TITLES[p.unit] ?? p.unit.toUpperCase(),
      pages: [],
    };
    units.push(unit);
  }
  unit.pages.push(p);
}

const manifest: Manifest = { units, pages };

const target = join(root, "lib", "generated", "content.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(manifest));

const cards = pages.reduce((n, p) => n + (p.cards?.length ?? 0), 0);
const questions = pages.reduce((n, p) => n + (p.practice?.length ?? 0), 0);
const marks = pages.reduce(
  (n, p) => n + (p.practice ?? []).reduce((m, q) => m + q.marks, 0),
  0,
);
for (const u of units) {
  console.log(`${u.code.padEnd(3)} ${String(u.pages.length).padStart(3)} pages  ${u.title}`);
}
console.log(
  `\n${pages.length} pages, ${cards} cards, ${questions} questions worth ${marks} marks`,
);
