"use client";

// The command set. Path handling, globbing, listing, searching and the
// filesystem itself are all in the C++ core; this file is the part that decides
// what each command name means.

import type { LogicCore, WasmFs } from "./wasm/logicCore.js";

export type Line = { text: string; kind?: "out" | "err" | "cmd" | "note" | "banner" };

export type Context = {
  core: LogicCore;
  fs: WasmFs;
  /** Prints a line to the terminal as the command runs. */
  print: (text: string, kind?: Line["kind"]) => void;
  /** Runs Python and returns whatever it printed. */
  python: (source: string) => Promise<string>;
  /** Opens the editor on a file and resolves when it is closed. */
  edit: (path: string) => Promise<void>;
  /** Opens the system monitor and resolves when it is closed. */
  monitor: () => Promise<void>;
  clear: () => void;
  history: string[];
  /** Runs another command line, so `time` can measure one. */
  exec?: (line: string) => Promise<void>;
};

export type Command = {
  name: string;
  summary: string;
  usage: string;
  run: (args: string[], ctx: Context) => void | Promise<void>;
};

const now = () => Math.floor(Date.now() / 1000);

function human(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

/** Splits flags from operands. Flags are bundled, so -la is -l and -a. */
function parse(args: string[]): { flags: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const arg of args) {
    if (arg.length > 1 && arg[0] === "-" && arg !== "--") {
      for (const c of arg.slice(1)) flags.add(c);
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}

/** Applies glob expansion to every operand, the way a shell does before the
 *  command ever sees them. */
function expandAll(ctx: Context, args: string[]): string[] {
  return args.flatMap((a) => JSON.parse(ctx.core.fsExpand(ctx.fs, a)) as string[]);
}

type Entry = { name: string; directory: boolean; size: number; modified: number };

export const COMMANDS: Command[] = [
  {
    name: "help",
    summary: "list the commands",
    usage: "help [command]",
    run(args, ctx) {
      if (args[0]) {
        const found = COMMANDS.find((c) => c.name === args[0]);
        if (!found) return ctx.print(`help: no such command: ${args[0]}`, "err");
        ctx.print(found.usage, "note");
        ctx.print(`  ${found.summary}`);
        return;
      }
      ctx.print("Commands — try `help <name>` for usage.", "note");
      const width = Math.max(...COMMANDS.map((c) => c.name.length)) + 2;
      for (const c of COMMANDS) {
        ctx.print(`  ${c.name.padEnd(width)}${c.summary}`);
      }
      ctx.print("");
      ctx.print("Tab completes paths, ↑ and ↓ walk history, Ctrl+L clears.", "note");
    },
  },
  {
    name: "ls",
    summary: "list directory contents",
    usage: "ls [-la] [path...]",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      const targets = rest.length ? expandAll(ctx, rest) : ["."];
      for (const target of targets) {
        if (targets.length > 1) ctx.print(`${target}:`, "note");
        if (!ctx.fs.exists(target)) {
          ctx.print(`ls: ${target}: no such file or directory`, "err");
          continue;
        }
        if (!ctx.fs.isDirectory(target)) {
          ctx.print(target);
          continue;
        }
        const { entries } = JSON.parse(ctx.fs.listJson(target)) as { entries: Entry[] };
        const shown = flags.has("a") ? entries : entries.filter((e) => !e.name.startsWith("."));
        if (!shown.length) continue;

        if (flags.has("l")) {
          const width = Math.max(...shown.map((e) => human(e.size).length));
          for (const e of shown) {
            const kind = e.directory ? "d" : "-";
            const when = e.modified
              ? new Date(e.modified * 1000).toISOString().slice(0, 16).replace("T", " ")
              : "               -";
            ctx.print(
              `${kind}rw-r--r--  ${human(e.size).padStart(width)}  ${when}  ${e.name}${e.directory ? "/" : ""}`,
            );
          }
        } else {
          ctx.print(shown.map((e) => (e.directory ? `${e.name}/` : e.name)).join("  "));
        }
      }
    },
  },
  {
    name: "cd",
    summary: "change directory",
    usage: "cd [path]",
    run(args, ctx) {
      const error = ctx.fs.chdir(args[0] ?? "~");
      if (error) ctx.print(error, "err");
    },
  },
  { name: "pwd", summary: "print the working directory", usage: "pwd", run: (_a, ctx) => ctx.print(ctx.fs.cwd()) },
  {
    name: "cat",
    summary: "print a file",
    usage: "cat <path...>",
    run(args, ctx) {
      if (!args.length) return ctx.print("cat: needs a path", "err");
      for (const path of expandAll(ctx, args)) {
        if (!ctx.fs.exists(path)) ctx.print(`cat: ${path}: no such file or directory`, "err");
        else if (ctx.fs.isDirectory(path)) ctx.print(`cat: ${path}: is a directory`, "err");
        else ctx.print(ctx.fs.read(path).replace(/\n$/, ""));
      }
    },
  },
  {
    name: "echo",
    summary: "print text, optionally into a file",
    usage: "echo <text...> [> file | >> file]",
    run(args, ctx) {
      const at = args.findIndex((a) => a === ">" || a === ">>");
      if (at === -1) return ctx.print(args.join(" "));
      const text = `${args.slice(0, at).join(" ")}\n`;
      const target = args[at + 1];
      if (!target) return ctx.print("echo: redirect needs a filename", "err");
      const error =
        args[at] === ">" ? ctx.fs.write(target, text, now()) : ctx.fs.append(target, text, now());
      if (error) ctx.print(error, "err");
    },
  },
  {
    name: "touch",
    summary: "create an empty file, or update its time",
    usage: "touch <path...>",
    run(args, ctx) {
      for (const path of args) {
        const error = ctx.fs.exists(path)
          ? ctx.fs.write(path, ctx.fs.read(path), now())
          : ctx.fs.write(path, "", now());
        if (error) ctx.print(error, "err");
      }
    },
  },
  {
    name: "mkdir",
    summary: "create a directory",
    usage: "mkdir [-p] <path...>",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      for (const path of rest) {
        if (flags.has("p")) {
          // Build each missing level in turn, ignoring the ones already there.
          const parts = ctx.fs.resolve(path).split("/").filter(Boolean);
          let sofar = "";
          for (const part of parts) {
            sofar += `/${part}`;
            if (!ctx.fs.exists(sofar)) ctx.fs.makeDirectory(sofar, now());
          }
          continue;
        }
        const error = ctx.fs.makeDirectory(path, now());
        if (error) ctx.print(`mkdir: ${error}`, "err");
      }
    },
  },
  {
    name: "rm",
    summary: "remove files or directories",
    usage: "rm [-rf] <path...>",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      for (const path of expandAll(ctx, rest)) {
        const error = ctx.fs.remove(path, flags.has("r"));
        if (error && !flags.has("f")) ctx.print(`rm: ${error}`, "err");
      }
    },
  },
  {
    name: "cp",
    summary: "copy a file or directory",
    usage: "cp <from> <to>",
    run(args, ctx) {
      if (args.length !== 2) return ctx.print("cp: needs a source and a destination", "err");
      const error = ctx.fs.copy(args[0], args[1], now());
      if (error) ctx.print(`cp: ${error}`, "err");
    },
  },
  {
    name: "mv",
    summary: "move or rename",
    usage: "mv <from> <to>",
    run(args, ctx) {
      if (args.length !== 2) return ctx.print("mv: needs a source and a destination", "err");
      const error = ctx.fs.move(args[0], args[1], now());
      if (error) ctx.print(`mv: ${error}`, "err");
    },
  },
  {
    name: "tree",
    summary: "show the directory tree",
    usage: "tree [path]",
    run(args, ctx) {
      const root = args[0] ?? ".";
      type Row = { name: string; depth: number; directory: boolean };
      const rows = JSON.parse(ctx.fs.treeJson(root)) as Row[];
      ctx.print(ctx.fs.resolve(root), "note");
      rows.forEach((row, i) => {
        const last = !rows.slice(i + 1).some((r) => r.depth === row.depth);
        const branch = "│  ".repeat(row.depth) + (last ? "└─ " : "├─ ");
        ctx.print(`${branch}${row.name}${row.directory ? "/" : ""}`);
      });
      const dirs = rows.filter((r) => r.directory).length;
      ctx.print(`${dirs} directories, ${rows.length - dirs} files`, "note");
    },
  },
  {
    name: "find",
    summary: "find paths by name",
    usage: "find [path] [-name pattern]",
    run(args, ctx) {
      const nameAt = args.indexOf("-name");
      const root = args[0] && args[0] !== "-name" ? args[0] : ".";
      const pattern = nameAt === -1 ? "*" : (args[nameAt + 1] ?? "*");
      const rows = JSON.parse(ctx.fs.treeJson(root)) as { path: string; name: string }[];
      const hits = rows.filter((r) => ctx.core.globMatch(pattern, r.name));
      for (const hit of hits) ctx.print(hit.path);
      if (!hits.length) ctx.print("nothing matched", "note");
    },
  },
  {
    name: "grep",
    summary: "search files for a pattern",
    usage: "grep [-iv] <pattern> <path...>",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      const [pattern, ...paths] = rest;
      if (!pattern || !paths.length) return ctx.print("grep: needs a pattern and a path", "err");
      const expanded = expandAll(ctx, paths);
      const hits = JSON.parse(
        ctx.core.fsGrep(ctx.fs, pattern, expanded.join("\n"), flags.has("i"), flags.has("v")),
      ) as string[];
      for (const hit of hits) ctx.print(hit);
      if (!hits.length) ctx.print("no matches", "note");
    },
  },
  {
    name: "wc",
    summary: "count lines, words and characters",
    usage: "wc <path...>",
    run(args, ctx) {
      for (const path of expandAll(ctx, args)) {
        const c = JSON.parse(ctx.core.shCount(ctx.fs.read(path))) as {
          lines: number;
          words: number;
          chars: number;
        };
        ctx.print(`${String(c.lines).padStart(6)} ${String(c.words).padStart(6)} ${String(c.chars).padStart(7)}  ${path}`);
      }
    },
  },
  {
    name: "head",
    summary: "print the first lines of a file",
    usage: "head [-n count] <path>",
    run: (args, ctx) => firstOrLast(args, ctx, "head"),
  },
  {
    name: "tail",
    summary: "print the last lines of a file",
    usage: "tail [-n count] <path>",
    run: (args, ctx) => firstOrLast(args, ctx, "tail"),
  },
  {
    name: "stat",
    summary: "show details of a path",
    usage: "stat <path>",
    run(args, ctx) {
      if (!args[0]) return ctx.print("stat: needs a path", "err");
      const s = JSON.parse(ctx.fs.statJson(args[0])) as {
        path: string;
        exists: boolean;
        directory: boolean;
        size: number;
        modified: number;
      };
      if (!s.exists) return ctx.print(`stat: ${args[0]}: no such file or directory`, "err");
      ctx.print(`  path      ${s.path}`);
      ctx.print(`  type      ${s.directory ? "directory" : "file"}`);
      ctx.print(`  size      ${s.size} bytes`);
      ctx.print(`  modified  ${s.modified ? new Date(s.modified * 1000).toISOString() : "—"}`);
    },
  },
  {
    name: "nvim",
    summary: "edit a file with vim keys",
    usage: "nvim <path>   :w :wq :q! :e :sav :s/a/b/g and the rest",
    async run(args, ctx) {
      if (!args[0]) return ctx.print("nvim: needs a filename", "err");
      await ctx.edit(args[0]);
    },
  },
  {
    name: "python",
    summary: "run a Python file, or start a one-liner",
    usage: "python <file.py> | python -c '<code>'",
    async run(args, ctx) {
      if (args[0] === "-c") {
        const code = args.slice(1).join(" ");
        if (!code) return ctx.print("python: -c needs some code", "err");
        ctx.print(await ctx.python(code));
        return;
      }
      const path = args[0];
      if (!path) {
        ctx.print("python: give a file, or -c with some code", "err");
        ctx.print("try: nvim hello.py, then python hello.py", "note");
        return;
      }
      if (!ctx.fs.exists(path)) return ctx.print(`python: ${path}: no such file`, "err");
      ctx.print(await ctx.python(ctx.fs.read(path)));
    },
  },
  {
    name: "pip",
    summary: "list the libraries available to python",
    usage: "pip list",
    run(_args, ctx) {
      ctx.print("Libraries are fetched on first import — no install step.", "note");
      ctx.print("numpy  pandas  matplotlib  scipy  sympy  scikit-learn  statsmodels");
      ctx.print("networkx  pillow  opencv-python  scikit-image  bokeh  altair");
      ctx.print("beautifulsoup4  lxml  regex  pyyaml  sqlalchemy  sqlite3  cryptography");
      ctx.print("biopython  astropy  shapely  xarray  micropip");
    },
  },
  { name: "clear", summary: "clear the screen", usage: "clear", run: (_a, ctx) => ctx.clear() },
  {
    name: "history",
    summary: "show the commands you have run",
    usage: "history",
    run: (_a, ctx) => ctx.history.forEach((h, i) => ctx.print(`${String(i + 1).padStart(4)}  ${h}`)),
  },
  {
    name: "which",
    summary: "say whether a command exists",
    usage: "which <name>",
    run(args, ctx) {
      const found = COMMANDS.find((c) => c.name === args[0]);
      ctx.print(found ? `/usr/bin/${found.name}` : `which: no ${args[0] ?? ""} in path`, found ? "out" : "err");
    },
  },
  { name: "whoami", summary: "print the current user", usage: "whoami", run: (_a, ctx) => ctx.print("student") },
  {
    name: "date",
    summary: "print the date and time",
    usage: "date",
    run: (_a, ctx) => ctx.print(new Date().toString()),
  },
  {
    name: "du",
    summary: "show how much space is used",
    usage: "du [path]",
    run(args, ctx) {
      const rows = JSON.parse(ctx.fs.treeJson(args[0] ?? ".")) as {
        path: string;
        directory: boolean;
      }[];
      let total = 0;
      for (const row of rows) {
        if (row.directory) continue;
        const size = ctx.fs.read(row.path).length;
        total += size;
        ctx.print(`${human(size).padStart(7)}  ${row.path}`);
      }
      ctx.print(`${human(total).padStart(7)}  total`, "note");
    },
  },
  {
    name: "sort",
    summary: "sort the lines of a file",
    usage: "sort [-r] [-n] <file>",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      const path = rest[0];
      if (!path) return ctx.print("sort: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`sort: ${path}: no such file`, "err");
      const out = JSON.parse(
        ctx.core.textSort(ctx.fs.read(path), flags.has("r"), flags.has("n")),
      ) as string[];
      ctx.print(out.join("\n"));
    },
  },
  {
    name: "uniq",
    summary: "collapse repeated adjacent lines",
    usage: "uniq [-c] <file>   (sort it first — uniq only sees neighbours)",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      const path = rest[0];
      if (!path) return ctx.print("uniq: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`uniq: ${path}: no such file`, "err");
      const out = JSON.parse(ctx.core.textUniq(ctx.fs.read(path), flags.has("c"))) as string[];
      ctx.print(out.join("\n"));
    },
  },
  {
    name: "nl",
    summary: "number the lines of a file",
    usage: "nl <file>",
    run(args, ctx) {
      const path = args[0];
      if (!path) return ctx.print("nl: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`nl: ${path}: no such file`, "err");
      ctx.print((JSON.parse(ctx.core.textNumber(ctx.fs.read(path))) as string[]).join("\n"));
    },
  },
  {
    name: "rev",
    summary: "reverse each line",
    usage: "rev <file>",
    run(args, ctx) {
      const path = args[0];
      if (!path) return ctx.print("rev: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`rev: ${path}: no such file`, "err");
      ctx.print((JSON.parse(ctx.core.textReverse(ctx.fs.read(path))) as string[]).join("\n"));
    },
  },
  {
    name: "cut",
    summary: "take one field from each line",
    usage: "cut -d<char> -f<n> <file>",
    run(args, ctx) {
      let delimiter = "\t";
      let field = 1;
      const rest: string[] = [];
      for (const arg of args) {
        if (arg.startsWith("-d")) delimiter = arg.slice(2) || "\t";
        else if (arg.startsWith("-f")) field = Number(arg.slice(2)) || 1;
        else rest.push(arg);
      }
      const path = rest[0];
      if (!path) return ctx.print("cut: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`cut: ${path}: no such file`, "err");
      const out = JSON.parse(
        ctx.core.textCut(ctx.fs.read(path), delimiter[0], field),
      ) as string[];
      ctx.print(out.join("\n"));
    },
  },
  {
    name: "xxd",
    summary: "show a file as hexadecimal — see A1.2.3",
    usage: "xxd <file>",
    run(args, ctx) {
      const path = args[0];
      if (!path) return ctx.print("xxd: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`xxd: ${path}: no such file`, "err");
      ctx.print((JSON.parse(ctx.core.textHexDump(ctx.fs.read(path))) as string[]).join("\n"));
    },
  },
  {
    name: "base64",
    summary: "encode or decode base64 — see A1.2.3",
    usage: "base64 [-d] <file>",
    run(args, ctx) {
      const { flags, rest } = parse(args);
      const path = rest[0];
      if (!path) return ctx.print("base64: needs a file", "err");
      if (!ctx.fs.exists(path)) return ctx.print(`base64: ${path}: no such file`, "err");
      const text = ctx.fs.read(path);
      if (!flags.has("d")) return ctx.print(ctx.core.base64Encode(text));
      const decoded = ctx.core.base64Decode(text);
      if (!decoded && text.trim()) return ctx.print("base64: not valid base64", "err");
      ctx.print(decoded);
    },
  },
  {
    name: "btop",
    summary: "live system monitor — what the browser will admit about this machine",
    usage: "btop        q or esc to quit",
    async run(_args, ctx) {
      await ctx.monitor();
    },
  },
  {
    name: "htop",
    summary: "the same monitor btop opens",
    usage: "htop",
    async run(_args, ctx) {
      await ctx.monitor();
    },
  },
  {
    name: "neofetch",
    summary: "the machine, in one screenful",
    usage: "neofetch",
    async run(_args, ctx) {
      const { collect } = await import("./systemInfo");
      const art = [
        "  █████ ████      ████  ████    █   █ █",
        "    █   █   █    █     █        █   █ █",
        "    █   ████     █      ███     █████ █",
        "    █   █   █    █         █    █   █ █",
        "  █████ ████      ████ ████     █   █ █████",
      ];
      art.forEach((line) => ctx.print(line, "banner"));
      ctx.print("");
      for (const reading of await collect()) {
        ctx.print(`  ${reading.label.padEnd(12)}${reading.value}`, "note");
      }
      ctx.print("");
      ctx.print("  `btop` for the live version, with graphs.", "note");
    },
  },
  {
    name: "uname",
    summary: "the environment this shell is running in",
    usage: "uname [-a]",
    run(args, ctx) {
      if (!args.includes("-a")) return ctx.print("IBCSHL");
      const cores = navigator.hardwareConcurrency ?? "?";
      ctx.print(
        `IBCSHL ibcshl wasm32 ${cores} cores ${navigator.language} — a C++ core compiled to WebAssembly, running in your browser`,
      );
    },
  },
  {
    name: "free",
    summary: "memory this tab is using",
    usage: "free",
    run(_args, ctx) {
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      if (!memory) {
        ctx.print("free: this browser does not expose heap size", "err");
        return ctx.print("Only Chromium does. Try `btop` for what is available.", "note");
      }
      ctx.print("              used       allocated        limit");
      ctx.print(
        `heap    ${human(memory.usedJSHeapSize).padStart(10)}${human(memory.totalJSHeapSize).padStart(16)}${human(memory.jsHeapSizeLimit).padStart(13)}`,
      );
      ctx.print("This is the tab's JavaScript heap, not the machine's RAM.", "note");
    },
  },
  {
    name: "df",
    summary: "how much of the filesystem is used",
    usage: "df",
    async run(_args, ctx) {
      const image = ctx.fs.dumpJson().length;
      const entries = JSON.parse(ctx.fs.treeJson("/")) as { directory: boolean }[];
      ctx.print("filesystem            size   files   directories");
      ctx.print(
        `wasm-disk       ${human(image).padStart(12)}${String(entries.filter((e) => !e.directory).length).padStart(8)}${String(entries.filter((e) => e.directory).length).padStart(14)}`,
      );
      const quota = await navigator.storage?.estimate?.().catch(() => undefined);
      if (quota?.quota) {
        ctx.print(
          `origin quota    ${human(quota.quota).padStart(12)}   ${human(quota.usage ?? 0)} used`,
        );
      }
    },
  },
  {
    name: "ps",
    summary: "what is actually running in this tab",
    usage: "ps",
    run(_args, ctx) {
      ctx.print("NAME              STATE       WHAT IT IS");
      ctx.print("logicCore.wasm    running     C++ shell, filesystem and logic engine");
      ctx.print(
        `service-worker    ${(navigator.serviceWorker?.controller ? "running" : "idle").padEnd(12)}serves this site with no network`,
      );
      ctx.print("Use `btop` for live figures.", "note");
    },
  },
  {
    name: "time",
    summary: "measure how long another command takes",
    usage: "time <command...>",
    async run(args, ctx) {
      if (!args.length) return ctx.print("time: needs a command", "err");
      if (!ctx.exec) return ctx.print("time: not available here", "err");
      const start = performance.now();
      await ctx.exec(args.join(" "));
      ctx.print(`\nreal  ${(performance.now() - start).toFixed(1)} ms`, "note");
    },
  },
  {
    name: "man",
    summary: "the same as help",
    usage: "man <command>",
    run(args, ctx) {
      const target = COMMANDS.find((c) => c.name === args[0]);
      if (!target) return ctx.print(`man: no entry for ${args[0] ?? ""}`, "err");
      ctx.print(`${target.name} — ${target.summary}`);
      ctx.print(`  ${target.usage}`, "note");
    },
  },
  {
    name: "diag",
    summary: "check that the shell, the core and the browser agree",
    usage: "diag",
    run(_args, ctx) {
      // A page kept open across a deploy can end up running new command code
      // against an older core. That shows up as an unhelpful error somewhere
      // far away, so this names the mismatch directly.
      const wanted = [
        "shTokenise",
        "fsExpand",
        "fsComplete",
        "fsGrep",
        "textSort",
        "textUniq",
        "textNumber",
        "textReverse",
        "textCut",
        "textHexDump",
        "base64Encode",
        "base64Decode",
      ] as const;
      const methods = [
        "exists",
        "isDirectory",
        "listJson",
        "treeJson",
        "statJson",
        "dumpJson",
        "loadJson",
        "read",
        "write",
      ] as const;

      const missingFunctions = wanted.filter(
        (n) => typeof (ctx.core as unknown as Record<string, unknown>)[n] !== "function",
      );
      const missingMethods = methods.filter(
        (n) => typeof (ctx.fs as unknown as Record<string, unknown>)[n] !== "function",
      );

      ctx.print(`commands       ${COMMANDS.length}`);
      ctx.print(`core functions ${wanted.length - missingFunctions.length} of ${wanted.length}`);
      ctx.print(`fs methods     ${methods.length - missingMethods.length} of ${methods.length}`);

      if (missingFunctions.length || missingMethods.length) {
        ctx.print("", "out");
        ctx.print(`missing: ${[...missingFunctions, ...missingMethods].join(", ")}`, "err");
        ctx.print("This page is older than the engine it loaded. Reload it.", "err");
        return;
      }

      // Exercise the calls the shell actually depends on, so a broken one is
      // named here rather than surfacing later as a mystery.
      const probes: [string, () => unknown][] = [
        ["fs.exists", () => ctx.fs.exists(".")],
        ["fs.isDirectory", () => ctx.fs.isDirectory(".")],
        ["fs.listJson", () => JSON.parse(ctx.fs.listJson("."))],
        ["fs.treeJson", () => JSON.parse(ctx.fs.treeJson("."))],
        ["fs.dumpJson", () => ctx.fs.dumpJson().length],
        ["core.shTokenise", () => JSON.parse(ctx.core.shTokenise("a b"))],
        ["core.textSort", () => JSON.parse(ctx.core.textSort("b\na\n", false, false))],
      ];
      ctx.print("");
      for (const [label, probe] of probes) {
        try {
          probe();
          ctx.print(`ok    ${label}`);
        } catch (e) {
          const error = e as Error;
          ctx.print(`FAIL  ${label}: ${error?.name}: ${error?.message || String(e)}`, "err");
        }
      }
    },
  },
  {
    name: "reset",
    summary: "empty the filesystem and start again",
    usage: "reset",
    run(_args, ctx) {
      ctx.print("Type `reset --yes` to confirm. Everything in the filesystem goes.", "note");
    },
  },
];

function firstOrLast(args: string[], ctx: Context, which: "head" | "tail") {
  let count = 10;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") count = Number(args[++i]) || 10;
    else rest.push(args[i]);
  }
  for (const path of expandAll(ctx, rest)) {
    if (!ctx.fs.exists(path)) {
      ctx.print(`${which}: ${path}: no such file or directory`, "err");
      continue;
    }
    const lines = ctx.fs.read(path).split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    const shown = which === "head" ? lines.slice(0, count) : lines.slice(-count);
    for (const line of shown) ctx.print(line);
  }
}

export const COMMAND_NAMES = COMMANDS.map((c) => c.name).sort();

/** The files a fresh terminal starts with, so it is never an empty prompt. */
export const STARTER_FILES: [string, string][] = [
  [
    "/home/student/readme.txt",
    `This is a real shell, running in your browser.

Nothing here touches your computer. The filesystem lives in this tab
and is saved between visits.

Try:
  ls -la
  tree
  nvim hello.py        vim keys; :w :wq :q! :e :sav all work
  python hello.py
  python code/bst.py
  grep -i loop notes/*.md
  help                 everything else
`,
  ],
  [
    "/home/student/hello.py",
    `# Edit me with: nvim hello.py
for i in range(1, 6):
    print(i, "squared is", i * i)
`,
  ],
  [
    "/home/student/code/primes.py",
    `def primes_below(limit):
    sieve = [True] * limit
    sieve[0] = sieve[1] = False
    for n in range(2, int(limit ** 0.5) + 1):
        if sieve[n]:
            for multiple in range(n * n, limit, n):
                sieve[multiple] = False
    return [n for n, prime in enumerate(sieve) if prime]

print(primes_below(60))
`,
  ],
  [
    "/home/student/code/stack.py",
    `# B4.1.2 — a stack, built from the operations rather than borrowed.
class Stack:
    def __init__(self):
        self._items = []

    def push(self, value):
        self._items.append(value)

    def pop(self):
        if self.is_empty():
            raise IndexError("stack underflow")
        return self._items.pop()

    def peek(self):
        return self._items[-1]

    def is_empty(self):
        return not self._items


def brackets_match(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = Stack()
    for character in text:
        if character in "([{":
            stack.push(character)
        elif character in pairs:
            if stack.is_empty() or stack.pop() != pairs[character]:
                return False
    return stack.is_empty()


for expression in ("(a[b]{c})", "(a[b)c]", "((a)"):
    print(f"{expression:12} {brackets_match(expression)}")
`,
  ],
  [
    "/home/student/code/bst.py",
    `# B4.1.4 — insert, search and the three traversals.
class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


def insert(node, value):
    if node is None:
        return Node(value)
    if value < node.value:
        node.left = insert(node.left, value)
    elif value > node.value:
        node.right = insert(node.right, value)
    return node


def walk(node, order, out=None):
    out = [] if out is None else out
    if node is None:
        return out
    if order == "pre":
        out.append(node.value)
    walk(node.left, order, out)
    if order == "in":
        out.append(node.value)
    walk(node.right, order, out)
    if order == "post":
        out.append(node.value)
    return out


root = None
for v in (50, 30, 70, 20, 40, 60, 85):
    root = insert(root, v)

print("in-order  ", walk(root, "in"), "<- sorted, for free")
print("pre-order ", walk(root, "pre"))
print("post-order", walk(root, "post"))
`,
  ],
  [
    "/home/student/code/sorts.py",
    `# B4.1.6 — the same data through two sorts, counting comparisons.
def bubble_sort(data):
    items, comparisons = list(data), 0
    for end in range(len(items) - 1, 0, -1):
        swapped = False
        for i in range(end):
            comparisons += 1
            if items[i] > items[i + 1]:
                items[i], items[i + 1] = items[i + 1], items[i]
                swapped = True
        if not swapped:
            break
    return items, comparisons


def merge_sort(data, counter=None):
    counter = [0] if counter is None else counter
    if len(data) <= 1:
        return data, counter[0]
    middle = len(data) // 2
    left, _ = merge_sort(data[:middle], counter)
    right, _ = merge_sort(data[middle:], counter)
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        counter[0] += 1
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:]); out.extend(right[j:])
    return out, counter[0]


import random
random.seed(1)
sample = random.sample(range(1000), 64)

print("bubble:", bubble_sort(sample)[1], "comparisons")
print("merge :", merge_sort(sample)[1], "comparisons")
print("sorted the same?", bubble_sort(sample)[0] == merge_sort(sample)[0])
`,
  ],
  [
    "/home/student/notes/complexity.md",
    `# Complexity, the short version

Big-O says how the work grows with n. Drop the constants; keep the
fastest-growing term.

  array index      O(1)
  linear search    O(n)
  binary search    O(log n)     sorted data only
  bubble sort      O(n^2)
  merge sort       O(n log n)   extra memory O(n)

A thousand times more data adds ten comparisons to a binary search and
makes bubble sort a million times slower. The shape decides whether the
program finishes; the constant only decides how fast it feels.
`,
  ],
  [
    "/home/student/notes/loops.md",
    `# Loops

A loop repeats a block. Two kinds matter:

- a count-controlled loop runs a known number of times
- a condition-controlled loop runs until something becomes false

The bug to watch for is the off-by-one: range(1, 5) gives 1 2 3 4.
`,
  ],
];
