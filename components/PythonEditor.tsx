"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { vscodeLight } from "@uiw/codemirror-theme-vscode";
import { vim } from "@replit/codemirror-vim";
import {
  CAPTURE_PLOTS,
  HEADLESS_PLOTS,
  LIBRARIES,
  loadPython,
  MICROPIP_ONLY,
  type Pyodide,
} from "@/lib/python";

// The editor is a large download and only this page uses it.
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="editorLoading">Loading the editor…</div>,
});

const STORAGE = "python.buffer.v1";
const VIM_KEY = "python.vim.v1";

const STARTER = `import numpy as np
import pandas as pd

# Everything runs in this tab. Nothing is sent anywhere.
marks = pd.DataFrame({
    "student": ["Ada", "Alan", "Grace", "Edsger", "Barbara"],
    "paper1":  [72, 55, 91, 64, 88],
    "paper2":  [68, 61, 85, 59, 94],
})

marks["total"] = marks.paper1 + marks.paper2
marks["grade"] = np.select(
    [marks.total >= 170, marks.total >= 140, marks.total >= 110],
    ["7", "6", "5"],
    default="4",
)

print(marks.sort_values("total", ascending=False).to_string(index=False))
print()
print("mean total:", marks.total.mean())
`;

type Run = { output: string; plots: string[]; failed: boolean };

export default function PythonEditor() {
  const [source, setSource] = useState(STARTER);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [vimOn, setVimOn] = useState(false);
  const [picker, setPicker] = useState(false);

  const py = useRef<Pyodide | null>(null);
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE);
    if (saved) setSource(saved);
    setVimOn(window.localStorage.getItem(VIM_KEY) === "true");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => window.localStorage.setItem(STORAGE, source), 400);
    return () => clearTimeout(t);
  }, [source]);

  const ready = useCallback(async () => {
    if (py.current) return py.current;
    setStatus("Starting Python…");
    const p = await loadPython();
    p.runPython(HEADLESS_PLOTS);
    py.current = p;
    return p;
  }, []);

  const execute = useCallback(async () => {
    setBusy(true);
    setRun(null);
    let text = "";
    try {
      const p = await ready();
      setStatus("Fetching libraries…");
      await p.loadPackagesFromImports(source);

      // Pure-Python packages have no prebuilt wheel here, so they come from
      // PyPI through micropip instead.
      const wanted = MICROPIP_ONLY.filter((n) => new RegExp(`\\b${n}\\b`).test(source));
      if (wanted.length) {
        await p.loadPackage(["micropip"]);
        await p.runPythonAsync(
          `import micropip\nawait micropip.install(${JSON.stringify(wanted)})`,
        );
      }

      const now = [...LIBRARIES.map((l) => l.name), ...MICROPIP_ONLY].filter((n) =>
        new RegExp(`\\b${n.replace(/-/g, "_")}\\b|\\b${n}\\b`).test(source),
      );
      setLoaded((prev) => [...new Set([...prev, ...now])]);

      setStatus("Running…");
      p.setStdout({ batched: (s) => (text += `${s}\n`) });
      p.setStderr({ batched: (s) => (text += `${s}\n`) });
      await p.runPythonAsync(source);

      const plots = (p.runPython(CAPTURE_PLOTS) as { toJs?: () => string[] } | string[]) ?? [];
      const asArray = Array.isArray(plots) ? plots : (plots.toJs?.() ?? []);
      setRun({ output: text.trimEnd(), plots: asArray, failed: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setRun({ output: `${text}${message}`.trim(), plots: [], failed: true });
    } finally {
      setStatus("");
      setBusy(false);
    }
  }, [source, ready]);

  // The key binding is created once, so it would close over a stale `execute`.
  // Calling through a ref keeps it pointed at the current one.
  runRef.current = () => {
    if (!busy) void execute();
  };

  useEffect(() => {
    window.localStorage.setItem(VIM_KEY, String(vimOn));
  }, [vimOn]);

  function preload(name: string) {
    setSource((s) => (s.includes(`import ${name}`) ? s : `import ${name}\n${s}`));
  }

  return (
    <div className="editor">
      <div className="editorBar">
        <button className="paletteBtn" onClick={() => execute()} disabled={busy}>
          {busy ? status || "Working…" : "Run"}
          <span className="deckHint">⌘↵</span>
        </button>
        <button className="paletteBtn ghost" onClick={() => setVimOn(!vimOn)} data-on={vimOn}>
          Vim {vimOn ? "on" : "off"}
        </button>
        <button className="paletteBtn ghost" onClick={() => setPicker(!picker)}>
          Libraries
        </button>
        <button
          className="paletteBtn ghost"
          onClick={() => {
            setSource(STARTER);
            setRun(null);
          }}
          disabled={busy}
        >
          Reset
        </button>
        <span className="mono editorMeta">
          {loaded.length > 0 ? `${loaded.join(", ")} loaded` : "python 3.12"}
        </span>
      </div>

      {picker && (
        <div className="libPicker">
          {LIBRARIES.map((l) => (
            <button key={l.name} className="libChip" onClick={() => preload(l.name)}>
              <code>{l.name}</code>
              <span>{l.about}</span>
            </button>
          ))}
          <p className="markNote">
            Clicking one adds the import at the top; the library itself is fetched the first
            time you run. Anything on PyPI that is pure Python can also be installed with{" "}
            <code>micropip</code>.
          </p>
        </div>
      )}

      <div className="cmWrap" data-vim={vimOn}>
        <CodeMirror
          value={source}
          height="30rem"
          theme={vscodeLight}
          onChange={setSource}
          extensions={[
            ...(vimOn ? [vim({ status: true })] : []),
            python(),
            EditorView.lineWrapping,
            // Precedence.highest so Vim's own bindings do not swallow it.
            Prec.highest(
              keymap.of([
                { key: "Mod-Enter", run: () => (runRef.current(), true) },
              ]),
            ),
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            indentOnInput: true,
            searchKeymap: true,
            tabSize: 4,
          }}
        />
      </div>

      {run && (
        <div className="editorOut" data-failed={run.failed}>
          {run.output && <pre>{run.output}</pre>}
          {run.plots.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`Plot ${i + 1}`} className="editorPlot" />
          ))}
          {!run.output && run.plots.length === 0 && (
            <pre className="editorQuiet">Ran without printing anything.</pre>
          )}
        </div>
      )}
    </div>
  );
}
