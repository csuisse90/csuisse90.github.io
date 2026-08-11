"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { useLogicCore } from "@/lib/live";
import { COMMANDS, COMMAND_NAMES, STARTER_FILES, type Context, type Line } from "@/lib/shell";
import {
  CAPTURE_PLOTS,
  HEADLESS_PLOTS,
  loadPython,
  MICROPIP_ONLY,
  type Pyodide,
} from "@/lib/python";
import type { WasmFs } from "@/lib/wasm/logicCore.js";

import type { Files } from "./VimEditor";

const VimEditor = dynamic(() => import("./VimEditor"), { ssr: false });

const DISK = "terminal.disk.v1";
const HISTORY = "terminal.history.v1";

// Plain ASCII on purpose. The block-drawing characters a figlet banner normally
// uses are missing from the site's mono webfont, so each one fell back to a
// different font with a different advance width and the letters came apart.
const BANNER = [
  "  ##### ####      ####  ####    #   # #",
  "    #   #   #    #     #        #   # #",
  "    #   ####     #      ###     ##### #",
  "    #   #   #    #         #    #   # #",
  "  ##### ####      #### ####     #   # #####",
];

export default function Terminal() {
  const core = useLogicCore();
  const fsRef = useRef<WasmFs | null>(null);
  const py = useRef<Pyodide | null>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [cwd, setCwd] = useState("~");
  const [editing, setEditing] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [at, setAt] = useState(-1);
  const [full, setFull] = useState(false);

  const view = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);

  const print = useCallback((text: string, kind: Line["kind"] = "out") => {
    // A multi-line string becomes multiple lines, so callers never have to
    // split output themselves.
    setLines((l) => [...l, ...text.split("\n").map((t) => ({ text: t, kind }))]);
  }, []);

  const shortCwd = (full: string) => full.replace(/^\/home\/student/, "~") || "/";

  // ---- boot: create the filesystem, restore the saved disk, seed the files
  useEffect(() => {
    if (!core || fsRef.current) return;
    const fs = new core.Fs();
    fsRef.current = fs;

    const saved = window.localStorage.getItem(DISK);
    const restored = saved ? fs.loadJson(saved) === "" : false;
    if (!restored) {
      for (const [path, content] of STARTER_FILES) {
        const dir = path.slice(0, path.lastIndexOf("/"));
        if (!fs.exists(dir)) fs.makeDirectory(dir, 0);
        fs.write(path, content, Math.floor(Date.now() / 1000));
      }
    }
    setCwd(shortCwd(fs.cwd()));
    setHistory(JSON.parse(window.localStorage.getItem(HISTORY) ?? "[]") as string[]);

    setLines([
      ...BANNER.map((text) => ({ text, kind: "note" as const })),
      { text: "", kind: "out" },
      { text: "  type `help` to begin, or `cat readme.txt`", kind: "note" },
      { text: "", kind: "out" },
    ]);
  }, [core]);

  const save = useCallback(() => {
    const fs = fsRef.current;
    if (fs) window.localStorage.setItem(DISK, fs.dumpJson());
  }, []);

  // What :w, :e and :saveas reach the disk through.
  const files = useRef<Files>({
    resolve: (p) => fsRef.current?.resolve(p) ?? p,
    exists: (p) => fsRef.current?.exists(p) ?? false,
    read: (p) => fsRef.current?.read(p) ?? "",
    write: (p, text) => fsRef.current?.write(p, text, Math.floor(Date.now() / 1000)),
  }).current;

  useEffect(() => {
    view.current?.scrollTo({ top: view.current.scrollHeight });
  }, [lines, busy]);

  const python = useCallback(async (source: string): Promise<string> => {
    let text = "";
    try {
      if (!py.current) {
        print("starting python…", "note");
        py.current = await loadPython();
        py.current.runPython(HEADLESS_PLOTS);
      }
      const p = py.current;
      await p.loadPackagesFromImports(source);
      const extra = MICROPIP_ONLY.filter((n) => new RegExp(`\\b${n}\\b`).test(source));
      if (extra.length) {
        await p.loadPackage(["micropip"]);
        await p.runPythonAsync(`import micropip\nawait micropip.install(${JSON.stringify(extra)})`);
      }
      p.setStdout({ batched: (s) => (text += `${s}\n`) });
      p.setStderr({ batched: (s) => (text += `${s}\n`) });
      await p.runPythonAsync(source);
      return text.trimEnd();
    } catch (e) {
      return `${text}${e instanceof Error ? e.message : String(e)}`.trim();
    }
  }, [print]);

  const edit = useCallback(
    (path: string) =>
      new Promise<void>((resolve) => {
        const fs = fsRef.current;
        if (!fs) return resolve();
        const full = fs.resolve(path);
        if (!fs.exists(full)) fs.write(full, "", Math.floor(Date.now() / 1000));
        setEditing(full);
        // Resolved by the editor's onClose, which clears `editing`.
        closeEditor.current = () => {
          setEditing(null);
          resolve();
        };
      }),
    [],
  );
  const closeEditor = useRef<() => void>(() => {});

  const run = useCallback(
    async (raw: string) => {
      const fs = fsRef.current;
      if (!core || !fs) return;

      print(`${cwd} $ ${raw}`, "cmd");
      const trimmed = raw.trim();
      if (!trimmed) return;

      setHistory((h) => {
        const next = [...h.filter((x) => x !== trimmed), trimmed].slice(-200);
        window.localStorage.setItem(HISTORY, JSON.stringify(next));
        return next;
      });

      const words = JSON.parse(core.shTokenise(trimmed)) as string[];
      const [name, ...args] = words;

      if (name === "reset" && args[0] === "--yes") {
        window.localStorage.removeItem(DISK);
        window.location.reload();
        return;
      }

      const command = COMMANDS.find((c) => c.name === name);
      if (!command) {
        const near = COMMAND_NAMES.filter((c) => c.startsWith(name.slice(0, 2)));
        print(`${name}: command not found`, "err");
        if (near.length) print(`did you mean: ${near.join(", ")}`, "note");
        return;
      }

      const ctx: Context = {
        core,
        fs,
        print,
        python,
        edit,
        clear: () => setLines([]),
        history,
      };

      setBusy(true);
      try {
        await command.run(args, ctx);
      } catch (e) {
        print(`${name}: ${e instanceof Error ? e.message : String(e)}`, "err");
      } finally {
        setBusy(false);
        setCwd(shortCwd(fs.cwd()));
        save();
      }
    },
    [core, cwd, print, python, edit, history, save],
  );

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const fs = fsRef.current;

    if (e.key === "Enter") {
      const line = input;
      setInput("");
      setAt(-1);
      void run(line);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (!core || !fs) return;
      const words = input.split(" ");
      const last = words[words.length - 1];

      // The first word completes against command names, later words against
      // paths — which is what makes tab useful rather than merely present.
      const options =
        words.length === 1
          ? COMMAND_NAMES.filter((c) => c.startsWith(last))
          : (JSON.parse(core.fsComplete(fs, last)) as string[]);

      if (options.length === 1) {
        words[words.length - 1] = options[0];
        setInput(words.join(" ") + (options[0].endsWith("/") ? "" : " "));
      } else if (options.length > 1) {
        print(`${cwd} $ ${input}`, "cmd");
        print(options.join("  "));
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = at < 0 ? history.length - 1 : Math.max(0, at - 1);
      if (history[next] !== undefined) {
        setAt(next);
        setInput(history[next]);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (at < 0) return;
      const next = at + 1;
      if (next >= history.length) {
        setAt(-1);
        setInput("");
      } else {
        setAt(next);
        setInput(history[next]);
      }
      return;
    }
    if (e.key === "Escape" && full) {
      e.preventDefault();
      setFull(false);
      return;
    }
    if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setLines([]);
      return;
    }
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      print(`${cwd} $ ${input}^C`, "cmd");
      setInput("");
    }
  }

  if (!core) {
    return <div className="term termLoading">starting the shell…</div>;
  }

  return (
    <>
      <div className="term" data-full={full} onClick={() => field.current?.focus()}>
        <div className="termBar">
          <span className="termDot" data-colour="red" />
          <span className="termDot" data-colour="amber" />
          <button
            className="termDot"
            data-colour="green"
            onClick={(e) => {
              e.stopPropagation();
              setFull((f) => !f);
            }}
            title={full ? "Leave full screen (esc)" : "Full screen"}
            aria-label={full ? "Leave full screen" : "Full screen"}
          />
          <span className="termTitle">student@ibcshl — {cwd}</span>
          <button className="termFull" onClick={(e) => { e.stopPropagation(); setFull((f) => !f); }}>
            {full ? "exit full screen · esc" : "full screen"}
          </button>
        </div>

        <div className="termView" ref={view}>
          {lines.map((line, i) => (
            <div key={i} className="termLine" data-kind={line.kind}>
              {line.text || " "}
            </div>
          ))}

          <div className="termPrompt">
            <span className="termCwd">{cwd}</span>
            <span className="termSigil">$</span>
            <input
              ref={field}
              className="termInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={busy || editing !== null}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="Shell input"
            />
            {busy && <span className="termBusy">working…</span>}
          </div>
        </div>
      </div>

      {editing && fsRef.current && (
        <VimEditor
          path={editing}
          initial={fsRef.current.read(editing)}
          files={files}
          onSave={save}
          onClose={() => {
            closeEditor.current();
            requestAnimationFrame(() => field.current?.focus());
          }}
        />
      )}
    </>
  );
}
