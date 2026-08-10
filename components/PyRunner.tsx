"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HighlightedPython } from "./pyHighlight";
import Stepper from "./Stepper";
import { loadPython } from "@/lib/python";

export default function PyRunner({
  code,
  caption,
  autoRun = false,
  rows,
  packages,
  /** Some snippets are demonstrations rather than algorithms and gain nothing
   *  from being stepped. */
  step = true,
}: {
  code: string;
  caption?: string;
  /** Run as soon as the reader presses nothing — used for short demos. */
  autoRun?: boolean;
  rows?: number;
  /** Pyodide packages to fetch first. Parts of the standard library are
   *  unvendored in Pyodide and have to be requested by name — sqlite3 is one. */
  packages?: string[];
  step?: boolean;
}) {
  const [source, setSource] = useState(code.trim());
  const [output, setOutput] = useState<string>("");
  const [state, setState] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [stepping, setStepping] = useState(false);
  const started = useRef(false);

  const run = useCallback(async () => {
    setState((s) => (s === "idle" ? "loading" : s));
    setOutput("");
    let buffer = "";
    try {
      const py = await loadPython();
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
  const working = state === "loading" || state === "running";

  return (
    <div className="panel">
      <div className="panelHead">
        <span>Python</span>
        <span>{state === "loading" ? "loading" : state === "running" ? "running" : ""}</span>
      </div>

      {stepping ? (
        <Stepper source={source} packages={packages} onClose={() => setStepping(false)} />
      ) : (
        <>
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
              disabled={working}
            >
              {working ? "Working…" : "Run"}
            </button>
            {step && (
              <button
                className="paletteBtn"
                style={{ width: "auto", margin: 0 }}
                onClick={() => setStepping(true)}
                disabled={working}
              >
                Step through it
              </button>
            )}
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
        </>
      )}

      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}
