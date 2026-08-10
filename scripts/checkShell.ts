// Drives the shell's command layer against the real wasm filesystem, so the
// terminal is verified without a browser. Run:  bun run scripts/checkShell.ts
import createLogicCore from "../lib/wasm/logicCore.js";
import { COMMANDS, STARTER_FILES, type Context } from "../lib/shell";

const core = await createLogicCore();
const fs = new core.Fs();
for (const [path, content] of STARTER_FILES) {
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (!fs.exists(dir)) fs.makeDirectory(dir, 0);
  fs.write(path, content, 1);
}

let out: string[] = [];
const ctx: Context = {
  core,
  fs,
  print: (text) => out.push(...text.split("\n")),
  python: async (source) => `[python ran ${source.length} chars]`,
  edit: async () => {},
  clear: () => (out = []),
  history: [],
};

async function run(line: string): Promise<string> {
  out = [];
  const words = JSON.parse(core.shTokenise(line)) as string[];
  const command = COMMANDS.find((c) => c.name === words[0]);
  if (!command) return `no such command: ${words[0]}`;
  await command.run(words.slice(1), ctx);
  return out.join("\n");
}

let failures = 0;
async function check(line: string, what: string, test: (output: string) => boolean) {
  const output = await run(line);
  if (test(output)) {
    console.log(`ok    ${what}`);
  } else {
    failures++;
    console.log(`FAIL  ${what}\n      $ ${line}\n${output.replace(/^/gm, "      | ")}`);
  }
}

await check("pwd", "pwd prints the home directory", (o) => o === "/home/student");
await check("ls", "ls lists the starter files", (o) => o.includes("hello.py") && o.includes("code/"));
await check("ls -l", "ls -l shows a size column", (o) => /rw-r--r--/.test(o));
await check("cd code", "cd descends", () => fs.cwd() === "/home/student/code");
await check("cd ..", "cd .. climbs", () => fs.cwd() === "/home/student");
await check("cd /nowhere", "cd reports a bad path", (o) => o.includes("no such"));
await check("cat hello.py", "cat prints a file", (o) => o.includes("squared"));
await check("cat missing", "cat reports a missing file", (o) => o.includes("no such"));

await check("echo hello there", "echo prints its arguments", (o) => o === "hello there");
await check("echo written > new.txt", "echo redirects into a file", () => fs.read("new.txt") === "written\n");
await check("echo more >> new.txt", "echo appends", () => fs.read("new.txt") === "written\nmore\n");

await check("mkdir -p a/b/c", "mkdir -p builds every level", () => fs.isDirectory("/home/student/a/b/c"));
await check("touch a/b/c/file.txt", "touch creates a file", () => fs.exists("/home/student/a/b/c/file.txt"));
await check("cp new.txt copy.txt", "cp duplicates", () => fs.read("copy.txt") === "written\nmore\n");
await check("mv copy.txt moved.txt", "mv renames", () => !fs.exists("copy.txt") && fs.exists("moved.txt"));
await check("rm moved.txt", "rm removes a file", () => !fs.exists("moved.txt"));
await check("rm a", "rm refuses a full directory", (o) => o.includes("not empty"));
await check("rm -r a", "rm -r removes a tree", () => !fs.exists("/home/student/a"));

await check("tree", "tree draws branches", (o) => o.includes("├─") || o.includes("└─"));
await check("tree", "tree counts what it found", (o) => /\d+ directories, \d+ files/.test(o));
await check("find . -name *.py", "find matches a glob", (o) => o.includes("hello.py"));
await check("find . -name *.rs", "find says when nothing matched", (o) => o.includes("nothing matched"));
await check("grep -i LOOP notes/loops.md", "grep -i ignores case", (o) => o.includes("loops.md:"));
await check("grep zzz notes/loops.md", "grep says when there are no matches", (o) => o.includes("no matches"));
await check("wc hello.py", "wc reports three counts", (o) => /\d+\s+\d+\s+\d+\s+hello\.py/.test(o));
await check("head -n 2 code/primes.py", "head takes the first lines", (o) => o.split("\n").length === 2);
await check("tail -n 1 code/primes.py", "tail takes the last line", (o) => o.includes("print"));
await check("stat hello.py", "stat describes a file", (o) => o.includes("type      file"));

await check("cat *.py", "a glob expands before the command runs", (o) => o.includes("squared"));
await check("which ls", "which finds a command", (o) => o.includes("/usr/bin/ls"));
await check("which zzz", "which reports an unknown command", (o) => o.includes("no zzz"));
await check("help", "help lists every command", (o) => o.includes("nvim") && o.includes("python"));
await check("help grep", "help explains one command", (o) => o.includes("grep [-iv]"));
await check("python -c print(1)", "python -c runs code", (o) => o.includes("[python ran"));
await check("python missing.py", "python reports a missing file", (o) => o.includes("no such file"));
await check("du", "du totals the tree", (o) => o.includes("total"));
await check("whoami", "whoami answers", (o) => o === "student");

// The disk survives a save and reload, which is what keeps work between visits.
const image = fs.dumpJson();
const second = new core.Fs();
const error = second.loadJson(image);
if (!error && second.read("/home/student/hello.py").includes("squared")) {
  console.log("ok    the disk round-trips through save and restore");
} else {
  failures++;
  console.log(`FAIL  the disk round-trips through save and restore (${error})`);
}

console.log(`\n${failures ? `${failures} FAILURES` : "all shell checks passed"}`);
process.exit(failures ? 1 : 0);
