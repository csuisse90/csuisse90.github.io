"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { bytes, collect, type Reading } from "@/lib/systemInfo";
import type { WasmFs } from "@/lib/wasm/logicCore.js";

const HISTORY = 60;
const TICK = 250;

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
};

/** btop, as far as a sandbox allows. The hardware panel is read from real
 *  browser APIs; the load graph is measured here, because no browser will tell
 *  a page what the machine as a whole is doing. */
export default function SystemMonitor({
  fs,
  pythonLoaded,
  onClose,
}: {
  fs: WasmFs | null;
  pythonLoaded: boolean;
  onClose: () => void;
}) {
  const [spec, setSpec] = useState<Reading[] | null>(null);
  const [load, setLoad] = useState<number[]>(() => Array(HISTORY).fill(0));
  const [frames, setFrames] = useState<number[]>(() => Array(HISTORY).fill(0));
  const [heap, setHeap] = useState<number[]>(() => Array(HISTORY).fill(0));
  const [uptime, setUptime] = useState(0);
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  const started = useRef(Date.now());
  const frameCount = useRef(0);

  useEffect(() => {
    void collect().then(setSpec);
    void navigator.storage?.estimate?.().then((e) =>
      setQuota({ usage: e.usage ?? 0, quota: e.quota ?? 0 }),
    );
  }, []);

  // Frames actually painted, which is the honest measure of whether the page
  // is keeping up.
  useEffect(() => {
    let running = true;
    const count = () => {
      if (!running) return;
      frameCount.current++;
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    return () => {
      running = false;
    };
  }, []);

  useEffect(() => {
    let expected = performance.now() + TICK;
    const id = setInterval(() => {
      const now = performance.now();
      // Event-loop lag: how late this timer ran. A busy main thread cannot
      // service it on time, so overshoot stands in for load.
      const lag = Math.max(0, now - expected);
      expected = now + TICK;
      const busy = Math.min(1, lag / TICK);

      const fps = (frameCount.current * 1000) / TICK;
      frameCount.current = 0;

      const used = (performance as PerformanceWithMemory).memory?.usedJSHeapSize ?? 0;

      setLoad((h) => [...h.slice(1), busy]);
      setFrames((h) => [...h.slice(1), Math.min(1, fps / 60)]);
      setHeap((h) => [...h.slice(1), used]);
      setUptime(Math.round((Date.now() - started.current) / 1000));
    }, TICK);
    return () => clearInterval(id);
  }, []);

  const quit = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "q" || e.key === "Escape") {
        e.preventDefault();
        quit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quit]);

  const memory = (performance as PerformanceWithMemory).memory;
  const diskBytes = fs ? fs.dumpJson().length : 0;
  // treeJson is a flat list of entries, each flagged as a directory or not.
  const entries: { directory: boolean }[] = fs ? JSON.parse(fs.treeJson("/")) : [];
  const fileCount = entries.filter((e) => !e.directory).length;
  const directoryCount = entries.filter((e) => e.directory).length;

  const processes: { name: string; state: string; detail: string }[] = [
    { name: "logicCore.wasm", state: fs ? "running" : "loading", detail: "C++ shell, filesystem and logic engine" },
    { name: "pyodide", state: pythonLoaded ? "running" : "not started", detail: "CPython compiled to WebAssembly" },
    {
      name: "service-worker",
      state: typeof navigator !== "undefined" && navigator.serviceWorker?.controller ? "running" : "idle",
      detail: "serves the site with no network",
    },
    { name: "btop", state: "running", detail: "this window" },
  ];

  return (
    <div className="monitor" role="dialog" aria-modal="true" aria-label="System monitor">
      <div className="monitorBar">
        <span>btop — student@ibcshl</span>
        <span>
          up {Math.floor(uptime / 60)}m {uptime % 60}s
        </span>
        <button className="monitorQuit" onClick={quit}>
          q to quit
        </button>
      </div>

      <div className="monitorGrid">
        <Panel title="cpu" meta={`${navigator.hardwareConcurrency ?? "?"} logical cores`}>
          <Graph values={load} colour="var(--term-accent)" />
          <Row label="main thread" value={`${Math.round((load.at(-1) ?? 0) * 100)}% busy`} />
          <Row label="frame rate" value={`${Math.round((frames.at(-1) ?? 0) * 60)} fps`} />
          <Note>
            No browser exposes system-wide CPU load. This is event-loop lag on
            this tab&apos;s main thread — the only load a page can actually see.
          </Note>
        </Panel>

        <Panel title="memory" meta={memory ? "this tab's JS heap" : "not exposed here"}>
          {memory ? (
            <>
              <Graph values={heap.map((v) => v / (memory.jsHeapSizeLimit || 1))} colour="var(--term-green)" />
              <Bar value={memory.usedJSHeapSize / memory.jsHeapSizeLimit} />
              <Row label="used" value={bytes(memory.usedJSHeapSize)} />
              <Row label="allocated" value={bytes(memory.totalJSHeapSize)} />
              <Row label="limit" value={bytes(memory.jsHeapSizeLimit)} />
            </>
          ) : (
            <Note>
              performance.memory is Chromium-only. Firefox and Safari refuse it,
              because heap size leaks information about what you have been doing.
            </Note>
          )}
        </Panel>

        <Panel title="disk" meta="the shell's filesystem">
          <Row label="image" value={bytes(diskBytes)} />
          <Row label="files" value={`${fileCount} in ${directoryCount} directories`} />
          {quota && (
            <>
              <Bar value={quota.quota ? quota.usage / quota.quota : 0} />
              <Row label="origin usage" value={bytes(quota.usage)} />
              <Row label="origin quota" value={bytes(quota.quota)} />
            </>
          )}
          <Note>
            The quota is what this site may store, granted by the browser. It is
            not the size of your disc, and nothing here can see that.
          </Note>
        </Panel>

        <Panel title="processes" meta={`${processes.length} tasks`} wide>
          {processes.map((p) => (
            <div key={p.name} className="monitorProcess">
              <span className="monitorProcessName">{p.name}</span>
              <span className="monitorProcessState" data-state={p.state}>
                {p.state}
              </span>
              <span className="monitorProcessDetail">{p.detail}</span>
            </div>
          ))}
        </Panel>

        <Panel title="hardware" meta="what this machine will admit to" wide>
          {spec === null ? (
            <Note>reading…</Note>
          ) : (
            spec.map((r) => (
              <div key={r.label} className="monitorSpec">
                <span className="monitorSpecLabel">{r.label}</span>
                <span className="monitorSpecValue">{r.value}</span>
                <span className="monitorSpecKind" data-kind={r.kind}>
                  {r.kind}
                </span>
                {r.note && <span className="monitorSpecNote">{r.note}</span>}
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  meta,
  wide,
  children,
}: {
  title: string;
  meta?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="monitorPanel" data-wide={wide || undefined}>
      <header className="monitorPanelHead">
        <span>{title}</span>
        {meta && <span>{meta}</span>}
      </header>
      <div className="monitorPanelBody">{children}</div>
    </section>
  );
}

/** A braille-free bar graph: one block per sample, height by value. Drawn with
 *  divs rather than characters so it cannot come apart on a missing glyph. */
function Graph({ values, colour }: { values: number[]; colour: string }) {
  return (
    <div className="monitorGraph">
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(2, Math.min(1, v) * 100)}%`, background: colour }}
        />
      ))}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * 40);
  return (
    <div className="monitorBarline">
      <span className="monitorBarlineFill">{"█".repeat(filled)}</span>
      <span className="monitorBarlineRest">{"░".repeat(40 - filled)}</span>
      <span className="monitorBarlinePercent">{Math.round(value * 100)}%</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="monitorRow">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="monitorNote">{children}</p>;
}
