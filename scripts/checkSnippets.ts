// Executes every Python snippet in content/ and fails if any raises.
// A snippet that crashes on the page is worse than no snippet, and this is
// the only check that would notice.
//
//   bun run scripts/checkSnippets.ts
import { readdirSync, statSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".mdx") ? [full] : [];
  });
}

const scratch = mkdtempSync(join(tmpdir(), "snippets-"));
let ran = 0;
let failed = 0;

for (const file of walk("content")) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/<Py[^>]*>\{`\n([\s\S]*?)\n`\}<\/Py>/g)) {
    // The browser sees the template literal after JavaScript has unescaped it.
    const code = match[1].replace(/\\\\/g, "\\").replace(/\\`/g, "`").replace(/\\\$/g, "$");
    const path = join(scratch, `s${ran}.py`);
    writeFileSync(path, code);
    const result = spawnSync("python3", [path], { encoding: "utf8" });
    ran++;
    if (result.status !== 0) {
      failed++;
      console.error(`${file}\n${result.stderr.trim().split("\n").slice(-3).join("\n")}\n`);
    }
  }
}

console.log(`${ran} snippets, ${failed} failed`);
process.exit(failed ? 1 : 0);
