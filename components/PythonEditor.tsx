"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HighlightedPython } from "./pyHighlight";
import { CAPTURE_PLOTS, HEADLESS_PLOTS, LIBRARIES, loadPython, type Pyodide } from "@/lib/python";

const STORAGE = "python.buffer.v1";

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
  const py = useRef<Pyodide | null>(null);
  const box = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE);
    if (saved) setSource(saved);
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

      // Fetch whatever the code imports before running it, so a first
      // `import pandas` works without the reader installing anything.
      setStatus("Fetching libraries…");
      await p.loadPackagesFromImports(source);
      const now = LIBRARIES.map((l) => l.name).filter((n) =>
        new RegExp(`\\b${n.replace("-", "_")}\\b|\\b${n}\\b`).test(source),
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

  // Ctrl/Cmd+Enter runs, Tab indents rather than leaving the box.
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!busy) execute();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: a, selectionEnd: b } = el;
      const next = `${source.slice(0, a)}    ${source.slice(b)}`;
      setSource(next);
      requestAnimationFrame(() => el.setSelectionRange(a + 4, a + 4));
    }
  }

  const lines = source.split("\n").length;

  return (
    <div className="editor">
      <div className="editorBar">
        <button className="paletteBtn" onClick={execute} disabled={busy}>
          {busy ? status || "Working…" : "Run"}
          <span className="deckHint">⌘↵</span>
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
          {lines} line{lines === 1 ? "" : "s"}
          {loaded.length > 0 && ` · ${loaded.join(", ")} loaded`}
        </span>
      </div>

      <div className="editorPane">
        <div className="editorGutter" aria-hidden>
          {Array.from({ length: lines }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className="editorCode">
          <pre className="editorUnder" aria-hidden>
            <HighlightedPython source={source} />
          </pre>
          <textarea
            ref={box}
            className="editorInput"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Python source"
          />
        </div>
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

      <details className="editorLibs">
        <summary className="mono">Libraries available</summary>
        <ul>
          {LIBRARIES.map((l) => (
            <li key={l.name}>
              <code>{l.name}</code> — {l.about}
            </li>
          ))}
        </ul>
        <p>
          Import one and it is fetched automatically the first time you run. The first import of
          a large library takes a few seconds; after that it is cached.
        </p>
      </details>
    </div>
  );
}
