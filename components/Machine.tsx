"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SETTINGS,
  machineClient,
  type Assembled,
  type Compiled,
  type Micro,
  type Settings,
  type Snapshot,
} from "@/lib/machine";

const STACK_TOP = 0x7000;
const HEAP_BASE = 0x8000;
const BUDGET = 20_000_000;

const EXAMPLES: { name: string; source: string }[] = [
  {
    name: "Arithmetic",
    source: "x = 3 * 4\nprint(x)\n",
  },
  {
    name: "A loop",
    source: "total = 0\nfor i in range(1, 11):\n    total += i\nprint(total)\n",
  },
  {
    name: "Recursion",
    source:
      "def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(5))\n",
  },
  {
    name: "Bubble sort",
    source:
      "xs = [5, 2, 9, 1]\n" +
      "n = len(xs)\n" +
      "for i in range(n):\n" +
      "    for j in range(n - 1):\n" +
      "        if xs[j] > xs[j + 1]:\n" +
      "            t = xs[j]\n" +
      "            xs[j] = xs[j + 1]\n" +
      "            xs[j + 1] = t\n" +
      "for v in xs:\n" +
      "    print(v)\n",
  },
  {
    name: "Long enough to need the worker",
    source: "total = 0\nfor i in range(200000):\n    total += i\nprint(total)\n",
  },
];

const REG_NAMES = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi",
                   "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15"];

export default function Machine() {
  const client = useMemo(() => machineClient(), []);
  const [source, setSource] = useState(EXAMPLES[1].source);
  const [optLevel, setOptLevel] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [ready, setReady] = useState(false);
  const [compiled, setCompiled] = useState<Compiled | null>(null);
  const [assembled, setAssembled] = useState<Assembled | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [micro, setMicro] = useState<Micro[]>([]);
  const [microAt, setMicroAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [memoryAt, setMemoryAt] = useState(STACK_TOP - 64);
  const [view, setView] = useState<"transfers" | "profile" | "cache" | "pipeline">("transfers");

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const state = snap?.state ?? null;

  // ---- compile, assemble, load ---------------------------------------------
  const build = useCallback(async () => {
    setMicro([]);
    setMicroAt(0);
    const c = await client.compile(source, optLevel);
    setCompiled(c);
    setAssembled(null);
    if (!c.ok) return;

    const a = await client.assemble(c.assembly);
    setAssembled(a);
    if (a.error) return;

    await client.configure(settings);
    await client.window(memoryAt, 64);
    setSnap(await client.load(a.bytes, a.labels.main ?? 0, STACK_TOP));
    setReady(true);
  }, [client, source, optLevel, settings, memoryAt]);

  useEffect(() => {
    void build();
    // First load only; after that the reader presses Compile. Rebuilding on
    // every keystroke would throw away the machine they are stepping through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    void client.configure(settings);
  }, [client, settings, ready]);

  useEffect(() => {
    if (!ready) return;
    void client.window(memoryAt, 64).then(setSnap);
  }, [client, memoryAt, ready]);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // ---- stepping -------------------------------------------------------------
  const stepInstruction = useCallback(async () => {
    const result = await client.step();
    setMicro(result.micro.micro);
    setMicroAt(result.micro.micro.length);
    setSnap(result);
  }, [client]);

  const stepMicro = useCallback(async () => {
    // Micro-operations are recorded for a whole instruction at once, so
    // stepping within one is a matter of revealing the next line; reaching the
    // end runs the next instruction.
    if (microAt < micro.length) {
      setMicroAt(microAt + 1);
      return;
    }
    const result = await client.step();
    setMicro(result.micro.micro);
    setMicroAt(1);
    setSnap(result);
  }, [client, micro.length, microAt]);

  const back = useCallback(
    async (count: number) => {
      setPlaying(false);
      const result = await client.back(count);
      setMicro([]);
      setMicroAt(0);
      setSnap(result);
    },
    [client],
  );

  const reset = useCallback(async () => {
    if (!assembled) return;
    setPlaying(false);
    setMicro([]);
    setMicroAt(0);
    setSnap(await client.load(assembled.bytes, assembled.labels.main ?? 0, STACK_TOP));
  }, [client, assembled]);

  const runToEnd = useCallback(async () => {
    setPlaying(false);
    setBusy(0);
    const result = await client.run(BUDGET, (instructions) => setBusy(instructions));
    setBusy(null);
    setMicro([]);
    setSnap(result);
  }, [client]);

  useEffect(() => {
    if (!playing) return;
    let alive = true;
    timer.current = setInterval(async () => {
      if (!alive) return;
      const result = await client.step();
      if (!alive) return;
      setMicro(result.micro.micro);
      setMicroAt(result.micro.micro.length);
      setSnap(result);
      if (result.state.halted) setPlaying(false);
    }, 60);
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, client]);

  // ---- what is highlighted --------------------------------------------------
  const currentAsm = useMemo(() => {
    if (!assembled || !state) return -1;
    return assembled.lines.findIndex((l) => l.address === state.rip);
  }, [assembled, state]);

  const currentSourceLine = useMemo(() => {
    if (currentAsm < 0 || !assembled) return -1;
    return assembled.lines[currentAsm].sourceLine;
  }, [currentAsm, assembled]);

  const sourceLines = source.split("\n");

  // Walk the two lists together rather than looking a line up by its text:
  // "mov rax, 1" appears many times in one program, and matching by text gave
  // every copy the address of the first.
  const asmRows = useMemo(() => {
    const rows: { text: string; address?: number; index: number }[] = [];
    let at = 0;
    for (const line of compiled?.assembly.split("\n") ?? []) {
      const trimmed = line.trim();
      const record = assembled?.lines[at];
      if (record && record.text === trimmed) {
        rows.push({ text: line, address: record.address, index: at });
        at++;
      } else {
        rows.push({ text: line, index: -1 });
      }
    }
    return rows;
  }, [compiled, assembled]);

  /** The profile, folded from addresses onto the Python lines they came from —
   *  which is the form a reader can act on. */
  const hotLines = useMemo(() => {
    if (!snap || !assembled) return new Map<number, number>();
    const byAddress = new Map(assembled.lines.map((l) => [l.address, l.sourceLine]));
    const out = new Map<number, number>();
    for (const row of snap.profile.rows) {
      const line = byAddress.get(row.address);
      if (line === undefined || line <= 0) continue;
      out.set(line, (out.get(line) ?? 0) + row.cycles);
    }
    return out;
  }, [snap, assembled]);

  const hottest = useMemo(() => Math.max(1, ...hotLines.values()), [hotLines]);

  const memory = snap?.memory ?? [];

  return (
    <div className="machine">
      <div className="machineBar">
        <select
          className="machinePick"
          onChange={(e) => setSource(EXAMPLES[Number(e.target.value)].source)}
          defaultValue="1"
          aria-label="Example program"
        >
          {EXAMPLES.map((e, i) => (
            <option key={e.name} value={i}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className="machinePick"
          value={optLevel}
          onChange={(e) => setOptLevel(Number(e.target.value))}
          aria-label="Optimisation level"
        >
          <option value={0}>-O0 · translate directly</option>
          <option value={1}>-O1 · fold and peephole</option>
        </select>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => void build()}>
          Compile
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => void back(1)}>
          ◀ Back one
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => void stepMicro()}>
          Step a micro-operation
        </button>
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => void stepInstruction()}
        >
          Step an instruction ▶
        </button>
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => setPlaying((r) => !r)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        {busy === null ? (
          <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => void runToEnd()}>
            To the end
          </button>
        ) : (
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => client.stop()}
          >
            Stop — {busy.toLocaleString()} so far
          </button>
        )}
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => void reset()}>
          Reset
        </button>
        {state && (
          <span className="machineCount">
            {state.instructions.toLocaleString()} instructions · {state.cycles.toLocaleString()} transfers
            {settings.pipeline && snap
              ? ` · ${snap.pipeline.cycles.toLocaleString()} pipelined cycles`
              : ""}
          </span>
        )}
      </div>

      <div className="machineBar machineOptions">
        <label>
          <input
            type="checkbox"
            checked={settings.recordHistory}
            onChange={(e) => setSettings({ ...settings, recordHistory: e.target.checked })}
          />
          time travel
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.cache}
            onChange={(e) => setSettings({ ...settings, cache: e.target.checked })}
          />
          cache
        </label>
        <select
          className="machinePick"
          value={`${settings.sets}x${settings.ways}x${settings.lineBytes}`}
          onChange={(e) => {
            const [sets, ways, lineBytes] = e.target.value.split("x").map(Number);
            setSettings({ ...settings, sets, ways, lineBytes });
          }}
          aria-label="Cache shape"
        >
          <option value="16x1x16">16 sets × direct · 16 B lines</option>
          <option value="8x2x16">8 sets × 2 ways · 16 B lines</option>
          <option value="4x4x32">4 sets × 4 ways · 32 B lines</option>
          <option value="2x8x64">2 sets × 8 ways · 64 B lines</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={settings.pipeline}
            onChange={(e) => setSettings({ ...settings, pipeline: e.target.checked })}
          />
          pipeline
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.forwarding}
            onChange={(e) => setSettings({ ...settings, forwarding: e.target.checked })}
          />
          forwarding
        </label>
        {state && settings.recordHistory && (
          <input
            className="machineScrub"
            type="range"
            min={0}
            max={state.instructions}
            value={state.instructions}
            onChange={(e) => {
              const target = Number(e.target.value);
              if (target < state.instructions) void back(state.instructions - target);
            }}
            aria-label="Rewind"
          />
        )}
      </div>

      {compiled && !compiled.ok && (
        <div className="machineError">
          <strong>The compiler refused this.</strong> {compiled.error}
        </div>
      )}
      {assembled?.error && (
        <div className="machineError">
          <strong>The assembler refused this.</strong> {assembled.error}
        </div>
      )}
      {state?.fault && (
        <div className="machineError">
          <strong>The machine faulted.</strong> {state.fault}
        </div>
      )}

      <div className="machineGrid">
        <Pane title="Python" meta="what you wrote">
          <textarea
            className="machineSource"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            rows={Math.max(10, sourceLines.length + 1)}
          />
          <div className="machineLines" aria-hidden>
            {sourceLines.map((line, i) => {
              const heat = hotLines.get(i + 1) ?? 0;
              return (
                <div
                  key={i}
                  data-current={i + 1 === currentSourceLine}
                  style={
                    heat
                      ? { background: `color-mix(in srgb, var(--alarm) ${Math.round((heat / hottest) * 28)}%, transparent)` }
                      : undefined
                  }
                  title={heat ? `${heat.toLocaleString()} register transfers spent here` : undefined}
                >
                  {line || " "}
                </div>
              );
            })}
          </div>
        </Pane>

        <Pane
          title="Intermediate code"
          meta={
            compiled?.optimisations.length
              ? `${compiled.optimisations.length} optimisations`
              : "three-address, A1.4.1"
          }
        >
          <div className="machineList">
            {(compiled?.ir ?? []).map((i, n) => (
              <div key={n} data-current={i.line === currentSourceLine}>
                <span className="machineDim">{i.op}</span> {i.text}
              </div>
            ))}
            {!compiled?.ir.length && <div className="machineDim">compile to see this</div>}
          </div>
          {!!compiled?.optimisations.length && (
            <div className="machineNotes">
              {compiled.optimisations.map((note, i) => (
                <div key={i}>− {note}</div>
              ))}
            </div>
          )}
        </Pane>

        <Pane title="x86-64" meta={`${assembled?.bytes.length ?? 0} bytes`}>
          <div className="machineList">
            {asmRows.map((row, i) => (
              <div
                key={i}
                data-current={row.index >= 0 && row.index === currentAsm}
                data-label={row.text.trim().endsWith(":")}
              >
                <span className="machineAddress">
                  {row.address === undefined ? "" : row.address.toString(16).padStart(4, "0")}
                </span>
                {row.text || " "}
              </div>
            ))}
          </div>
        </Pane>

        <Pane title="Registers" meta="and RFLAGS">
          <div className="machineRegs">
            {REG_NAMES.map((name, i) => {
              const value = state?.regs[i] ?? 0;
              return (
                <div key={name} data-live={value !== 0}>
                  <span className="machineDim">{name}</span>
                  <span>{value.toLocaleString()}</span>
                  <span className="machineHex">
                    {(value >>> 0).toString(16).padStart(8, "0")}
                  </span>
                </div>
              );
            })}
            <div data-live>
              <span className="machineDim">rip</span>
              <span>{state?.rip ?? 0}</span>
              <span className="machineHex">
                {(state?.rip ?? 0).toString(16).padStart(4, "0")}
              </span>
            </div>
          </div>
          <div className="machineFlags">
            {(["zero", "sign", "carry", "overflow"] as const).map((f) => (
              <span key={f} data-on={state?.flags[f]}>
                {f.slice(0, 1).toUpperCase()}F {state?.flags[f] ? 1 : 0}
              </span>
            ))}
          </div>
        </Pane>

        <Pane title="Memory" meta={memoryAt === STACK_TOP - 64 ? "the stack" : "the heap"}>
          <div className="machineBar" style={{ padding: "0 0 0.5rem" }}>
            <button
              className="paletteBtn ghost"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setMemoryAt(STACK_TOP - 64)}
            >
              stack
            </button>
            <button
              className="paletteBtn ghost"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setMemoryAt(HEAP_BASE)}
            >
              heap
            </button>
          </div>
          <div className="machineMemory">
            {Array.from({ length: 8 }, (_, row) => (
              <div key={row}>
                <span className="machineAddress">
                  {(memoryAt + row * 8).toString(16).padStart(4, "0")}
                </span>
                {Array.from({ length: 8 }, (_, col) => {
                  const byte = memory[row * 8 + col] ?? 0;
                  const address = memoryAt + row * 8 + col;
                  return (
                    <span
                      key={col}
                      data-zero={byte === 0}
                      data-pointer={state ? address >= state.regs[4] && address < state.regs[5] : false}
                    >
                      {byte.toString(16).padStart(2, "0")}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </Pane>

        <Pane
          title={
            view === "transfers"
              ? "Register transfers"
              : view === "profile"
                ? "Where the time went"
                : view === "cache"
                  ? "Cache"
                  : "Pipeline"
          }
          meta={
            <span className="machineTabs">
              {(["transfers", "profile", "cache", "pipeline"] as const).map((v) => (
                <button key={v} data-on={v === view} onClick={() => setView(v)}>
                  {v}
                </button>
              ))}
            </span>
          }
        >
          {view === "transfers" && (
            <div className="machineList machineMicro">
              {micro.map((m, i) => (
                <div key={i} data-current={i === microAt - 1} data-done={i < microAt - 1}>
                  <span className="machineStep">t{i}</span>
                  {m.transfer}
                  {m.lines && <span className="machineControl">{m.lines}</span>}
                </div>
              ))}
              {!micro.length && (
                <div className="machineDim">
                  step an instruction to see the transfers it takes
                </div>
              )}
            </div>
          )}

          {view === "profile" && snap && (
            <div className="machineList">
              {snap.profile.rows.slice(0, 24).map((row) => {
                const line = assembled?.lines.find((l) => l.address === row.address);
                return (
                  <div key={row.address}>
                    <span
                      className="machineHeat"
                      style={{ width: `${Math.round((row.cycles / (snap.profile.rows[0]?.cycles || 1)) * 100)}%` }}
                    />
                    <span className="machineAddress">{row.address.toString(16).padStart(4, "0")}</span>
                    {line?.text ?? "?"}
                    <span className="machineDim">
                      {" "}
                      × {row.count.toLocaleString()} · {row.cycles.toLocaleString()} transfers
                    </span>
                  </div>
                );
              })}
              {!snap.profile.rows.length && <div className="machineDim">run something first</div>}
            </div>
          )}

          {view === "cache" && snap && (
            <>
              <div className="machineStat">
                <span>{snap.cache.hits.toLocaleString()} hits</span>
                <span>{snap.cache.misses.toLocaleString()} misses</span>
                <span>
                  {snap.cache.hits + snap.cache.misses
                    ? Math.round((snap.cache.hits / (snap.cache.hits + snap.cache.misses)) * 100)
                    : 0}
                  % hit rate
                </span>
                <span>{snap.cache.evictions.toLocaleString()} evictions</span>
              </div>
              <div className="machineCache" style={{ ["--ways" as string]: snap.cache.ways }}>
                {snap.cache.lines.map((line, i) => (
                  <span
                    key={i}
                    data-valid={line.valid}
                    data-dirty={line.dirty}
                    data-last={i === snap.cache.lastLine}
                    title={
                      line.valid
                        ? `set ${Math.floor(i / snap.cache.ways)}, tag ${line.tag}, block at 0x${(line.block * snap.cache.lineBytes).toString(16)}`
                        : `set ${Math.floor(i / snap.cache.ways)}, empty`
                    }
                  >
                    {line.valid ? (line.block * snap.cache.lineBytes).toString(16).padStart(4, "0") : "····"}
                  </span>
                ))}
              </div>
              <p className="machineDim" style={{ marginTop: "0.6rem" }}>
                Each box is one line. A tight loop keeps hitting the same few, which is why the
                hit rate climbs the longer it runs.
              </p>
            </>
          )}

          {view === "pipeline" && snap && (
            <>
              <div className="machineStat">
                <span>{snap.pipeline.cycles.toLocaleString()} cycles</span>
                <span>{snap.pipeline.issued.toLocaleString()} issued</span>
                <span>
                  {snap.pipeline.issued
                    ? (snap.pipeline.cycles / snap.pipeline.issued).toFixed(2)
                    : "0.00"}{" "}
                  cycles each
                </span>
                <span>{snap.pipeline.stallCycles.toLocaleString()} stalled</span>
                <span>{snap.pipeline.flushCycles.toLocaleString()} flushed</span>
              </div>
              <div className="machineList">
                {snap.pipeline.recent.map((slot, i) => (
                  <div key={i} data-label={slot.flushed}>
                    <span className="machineAddress">{slot.address.toString(16).padStart(4, "0")}</span>
                    {slot.text}
                    {slot.stall > 0 && (
                      <span className="machineControl">
                        +{slot.stall} {slot.why}
                      </span>
                    )}
                  </div>
                ))}
                {!snap.pipeline.recent.length && (
                  <div className="machineDim">
                    {snap.pipeline.enabled ? "step something first" : "the pipeline model is off"}
                  </div>
                )}
              </div>
            </>
          )}
        </Pane>
      </div>

      <Pane title="Output" meta="what the program printed" wide>
        <pre className="machineOutput">{state?.output || "(nothing yet)"}</pre>
      </Pane>
    </div>
  );
}

function Pane({
  title,
  meta,
  wide,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="panel machinePane" data-wide={wide || undefined}>
      <div className="panelHead">
        <span>{title}</span>
        {meta && <span>{meta}</span>}
      </div>
      <div className="panelBody">{children}</div>
    </section>
  );
}
