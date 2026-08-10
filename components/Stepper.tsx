"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HighlightedPython } from "./pyHighlight";
import { loadPython, TRACE_HARNESS, type Trace } from "@/lib/python";

/** Runs the code once under a tracer, then lets the reader move through the
 *  recording. Stepping a recording rather than pausing a live interpreter is
 *  what makes going *backwards* possible, which is most of the value: the
 *  question is nearly always "what was that variable a moment ago?". */
export default function Stepper({
  source,
  packages,
  onClose,
}: {
  source: string;
  packages?: string[];
  onClose: () => void;
}) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState("");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [asTable, setAsTable] = useState(false);
  const codeBox = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const py = await loadPython();
        if (packages?.length) await py.loadPackage(packages);
        py.globals.set("_src", source);
        const raw = (await py.runPythonAsync(TRACE_HARNESS)) as string;
        if (!cancelled) setTrace(JSON.parse(raw) as Trace);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, packages]);

  const steps = trace?.steps ?? [];
  const step = steps[at];

  useEffect(() => {
    if (!playing || !steps.length) return;
    if (at >= steps.length - 1) return setPlaying(false);
    const t = setTimeout(() => setAt((n) => n + 1), 320);
    return () => clearTimeout(t);
  }, [playing, at, steps.length]);

  // Keep the current line in view without yanking the whole page around.
  useEffect(() => {
    const line = codeBox.current?.querySelector<HTMLElement>('[data-current="true"]');
    line?.scrollIntoView({ block: "nearest" });
  }, [at]);

  // The columns of an exam trace table are the variables, in the order they
  // first appear — not alphabetical, which would scramble the reading order.
  const columns = useMemo(() => {
    const order: string[] = [];
    for (const s of steps) {
      for (const name of Object.keys(s.vars)) if (!order.includes(name)) order.push(name);
    }
    return order;
  }, [steps]);

  const lines = source.split("\n");

  if (error) {
    return (
      <div className="panelBody">
        <p className="markNote">Could not trace this: {error}</p>
        <button className="paletteBtn" onClick={onClose}>
          Back to the code
        </button>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="panelBody">
        <p className="markNote">Recording the run…</p>
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="panelBody">
        <p className="markNote">
          Nothing to step through — this snippet has no executable statements at the top level.
        </p>
        <button className="paletteBtn" onClick={onClose}>
          Back to the code
        </button>
      </div>
    );
  }

  return (
    <div className="stepper">
      <div className="stepBar">
        <button className="paletteBtn" onClick={() => setAt(0)} disabled={at === 0}>
          ⏮
        </button>
        <button
          className="paletteBtn"
          onClick={() => setAt((n) => Math.max(0, n - 1))}
          disabled={at === 0}
        >
          ← Back
        </button>
        <button className="paletteBtn" onClick={() => setPlaying(!playing)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button
          className="paletteBtn"
          onClick={() => setAt((n) => Math.min(steps.length - 1, n + 1))}
          disabled={at >= steps.length - 1}
        >
          Step →
        </button>
        <span className="mono stepCount">
          {at + 1} / {steps.length}
          {trace.truncated && " (cut short)"}
        </span>
        <button className="paletteBtn ghost" onClick={() => setAsTable(!asTable)}>
          {asTable ? "Show the code" : "As a trace table"}
        </button>
        <button className="paletteBtn ghost" onClick={onClose}>
          Done
        </button>
      </div>

      <input
        className="stepScrub"
        type="range"
        min={0}
        max={steps.length - 1}
        value={at}
        onChange={(e) => {
          setPlaying(false);
          setAt(Number(e.target.value));
        }}
        aria-label="Position in the run"
      />

      {asTable ? (
        <div className="tableWrap">
          <table className="traceTable">
            <thead>
              <tr>
                <th>Step</th>
                <th>Line</th>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => {
                const before = i > 0 ? steps[i - 1] : null;
                const printed = trace.output.slice(before?.out ?? 0, s.out);
                return (
                  <tr key={i} data-current={i === at} onClick={() => setAt(i)}>
                    <td className="mono">{i + 1}</td>
                    <td className="mono">{s.line}</td>
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="mono"
                        data-changed={before && before.vars[c] !== s.vars[c] ? true : undefined}
                      >
                        {s.vars[c] ?? ""}
                      </td>
                    ))}
                    <td className="mono">{printed.replace(/\n/g, "⏎")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stepPane">
          <div className="stepCode" ref={codeBox}>
            {lines.map((text, i) => (
              <div
                key={i}
                className="stepLine"
                data-current={i + 1 === step.line}
                onClick={() => {
                  const found = steps.findIndex((s, n) => n >= at && s.line === i + 1);
                  if (found >= 0) setAt(found);
                }}
              >
                <span className="stepNo">{i + 1}</span>
                <span className="stepText">
                  <HighlightedPython source={text || " "} />
                </span>
              </div>
            ))}
          </div>

          <div className="stepState">
            <div className="stepStateHead">
              Variables
              {step.depth > 0 && <span className="stepDepth">depth {step.depth}</span>}
            </div>
            {Object.keys(step.vars).length === 0 ? (
              <p className="stepNone">Nothing defined yet.</p>
            ) : (
              <table className="stepVars">
                <tbody>
                  {Object.entries(step.vars).map(([k, v]) => {
                    const before = at > 0 ? steps[at - 1].vars[k] : undefined;
                    return (
                      <tr key={k} data-changed={before !== v ? true : undefined}>
                        <th>{k}</th>
                        <td className="mono">{v}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="stepStateHead">Printed so far</div>
            <pre className="stepOut">{trace.output.slice(0, step.out) || "—"}</pre>
          </div>
        </div>
      )}

      {trace.error && <pre className="pyOut" data-error>{trace.error}</pre>}
    </div>
  );
}
