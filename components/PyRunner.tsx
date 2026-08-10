"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HighlightedPython } from "./pyHighlight";

// Loaded from a CDN on first use rather than bundled: it is a large download
// and most readers never open a code cell.
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type Pyodide = {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>;
  }
}

let pyodidePromise: Promise<Pyodide> | null = null;

function loadPyodideOnce(): Promise<Pyodide> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_URL}pyodide.js`;
    script.onload = async () => {
      if (!window.loadPyodide) {
        reject(new Error("Pyodide failed to load"));
        return;
      }
      try {
        resolve(await window.loadPyodide({ indexURL: PYODIDE_URL }));
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("Could not reach the Pyodide CDN"));
    document.head.appendChild(script);
  });
  return pyodidePromise;
}

export default function PyRunner({
  code,
  caption,
  autoRun = false,
  rows,
  packages,
}: {
  code: string;
  caption?: string;
  /** Run as soon as the reader presses nothing — used for short demos. */
  autoRun?: boolean;
  rows?: number;
  /** Pyodide packages to fetch first. Parts of the standard library are
   *  unvendored in Pyodide and have to be requested by name — sqlite3 is one. */
  packages?: string[];
}) {
  const [source, setSource] = useState(code.trim());
  const [output, setOutput] = useState<string>("");
  const [state, setState] = useState<"idle" | "loading" | "running" | "error">("idle");
  const started = useRef(false);

  const run = useCallback(async () => {
    setState((s) => (s === "idle" ? "loading" : s));
    setOutput("");
    let buffer = "";
    try {
      const py = await loadPyodideOnce();
      if (packages?.length) await py.loadPackage(packages);
      setState("running");
      py.setStdout({ batched: (s) => { buffer += s + "\n"; } });
      py.setStderr({ batched: (s) => { buffer += s + "\n"; } });
      await py.runPythonAsync(source);
      setOutput(buffer.trimEnd() || "(no output)");
      setState("idle");
    } catch (e) {
      setOutput(`${buffer}${e instanceof Error ? e.message : String(e)}`.trim());
      setState("error");
    }
  }, [source, packages]);

  useEffect(() => {
    if (autoRun && !started.current) {
      started.current = true;
      void run();
    }
  }, [autoRun, run]);

  const lineCount = rows ?? Math.min(20, source.split("\n").length + 1);

  return (
    <div className="panel">
      <div className="panelHead">
        <span>Python</span>
        <span>{state === "loading" ? "loading" : state === "running" ? "running" : ""}</span>
      </div>
      <div className="panelBody" style={{ padding: 0 }}>
        {/* The coloured layer sits underneath a transparent textarea, both
            using identical metrics so the caret lands where it looks like it
            should. */}
        <div className="pyEditor" style={{ minHeight: `${lineCount * 1.62 + 1.6}rem` }}>
          <pre className="pyHighlight" aria-hidden>
            <HighlightedPython source={source + "\n"} />
          </pre>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onScroll={(e) => {
              const pre = e.currentTarget.previousElementSibling as HTMLElement | null;
              if (pre) {
                pre.scrollTop = e.currentTarget.scrollTop;
                pre.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
            spellCheck={false}
            rows={lineCount}
            aria-label="Python code"
            className="pyCode"
          />
        </div>
      </div>
      <div className="transport">
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => void run()}
          disabled={state === "loading" || state === "running"}
        >
          {state === "loading" || state === "running" ? "Working…" : "Run"}
        </button>
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => {
            setSource(code.trim());
            setOutput("");
            setState("idle");
          }}
        >
          Reset
        </button>

      </div>
      {output && (
        <pre className="pyOut" data-error={state === "error"}>
          {output}
        </pre>
      )}
      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}
