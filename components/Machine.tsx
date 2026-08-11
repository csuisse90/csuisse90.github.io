"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLogicCore } from "@/lib/live";
import type { WasmCpu } from "@/lib/wasm/logicCore.js";

const STACK_TOP = 0x7000;
const HEAP_BASE = 0x8000;

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
];

const REG_NAMES = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi",
                   "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15"];

type Compiled = {
  ok: boolean;
  error: string;
  errorLine: number;
  tree: string;
  ir: { op: string; text: string; line: number }[];
  assembly: string;
  assemblyToSource: number[];
};

type AsmLine = { address: number; length: number; sourceLine: number; text: string };
type Assembled = { error: string; bytes: number[]; lines: AsmLine[]; labels: Record<string, number> };

type State = {
  regs: number[];
  rip: number;
  flags: { carry: boolean; zero: boolean; sign: boolean; overflow: boolean };
  halted: boolean;
  fault: string;
  output: string;
  instructions: number;
  cycles: number;
};

type Micro = { transfer: string; lines: string };

export default function Machine() {
  const core = useLogicCore();
  const [source, setSource] = useState(EXAMPLES[1].source);
  const [compiled, setCompiled] = useState<Compiled | null>(null);
  const [assembled, setAssembled] = useState<Assembled | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [micro, setMicro] = useState<Micro[]>([]);
  const [microAt, setMicroAt] = useState(0);
  const [running, setRunning] = useState(false);
  const [memoryAt, setMemoryAt] = useState(STACK_TOP - 64);

  const cpu = useRef<WasmCpu | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- compile, assemble, load ---------------------------------------------
  const build = useCallback(() => {
    if (!core) return;
    const c = JSON.parse(core.compilePython(source)) as Compiled;
    setCompiled(c);
    setAssembled(null);
    setState(null);
    setMicro([]);
    if (!c.ok) return;

    const a = JSON.parse(core.assembleX86(c.assembly)) as Assembled;
    setAssembled(a);
    if (a.error) return;

    if (!cpu.current) cpu.current = new core.Cpu();
    // Base64, because a raw byte string crossing into wasm is read as UTF-8
    // and every byte above 0x7f comes out as two.
    let binary = "";
    for (const b of a.bytes) binary += String.fromCharCode(b);
    cpu.current.loadBytes(btoa(binary), 0);
    cpu.current.reset(a.labels.main ?? 0, STACK_TOP);
    setState(JSON.parse(cpu.current.state()) as State);
  }, [core, source]);

  useEffect(() => {
    if (core) build();
    // Only on first load; afterwards the reader presses the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core]);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      cpu.current?.delete();
      cpu.current = null;
    };
  }, []);

  // ---- stepping -------------------------------------------------------------
  const stepInstruction = useCallback(() => {
    if (!cpu.current) return;
    const result = JSON.parse(cpu.current.step()) as { micro: Micro[] };
    setMicro(result.micro);
    setMicroAt(result.micro.length);
    setState(JSON.parse(cpu.current.state()) as State);
  }, []);

  const stepMicro = useCallback(() => {
    if (!cpu.current) return;
    // Micro-operations are recorded for a whole instruction at once, so
    // stepping within one is a matter of revealing the next line; reaching the
    // end runs the next instruction.
    setMicroAt((n) => {
      if (n < micro.length) return n + 1;
      const result = JSON.parse(cpu.current!.step()) as { micro: Micro[] };
      setMicro(result.micro);
      setState(JSON.parse(cpu.current!.state()) as State);
      return 1;
    });
  }, [micro.length]);

  const reset = useCallback(() => {
    if (!cpu.current || !assembled) return;
    cpu.current.reset(assembled.labels.main ?? 0, STACK_TOP);
    setState(JSON.parse(cpu.current.state()) as State);
    setMicro([]);
    setMicroAt(0);
    setRunning(false);
  }, [assembled]);

  const runToEnd = useCallback(() => {
    if (!cpu.current) return;
    cpu.current.run(5_000_000);
    setState(JSON.parse(cpu.current.state()) as State);
    setMicro([]);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      if (!cpu.current) return;
      const before = JSON.parse(cpu.current.state()) as State;
      if (before.halted) {
        setRunning(false);
        return;
      }
      const result = JSON.parse(cpu.current.step()) as { micro: Micro[] };
      setMicro(result.micro);
      setMicroAt(result.micro.length);
      setState(JSON.parse(cpu.current.state()) as State);
    }, 60);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

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

  const memory = useMemo(() => {
    if (!cpu.current || !state) return [];
    return JSON.parse(cpu.current.memory(memoryAt, 64)) as number[];
  }, [state, memoryAt]);

  if (!core) return <div className="panel"><div className="panelBody">Starting the machine…</div></div>;

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
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={build}>
          Compile
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={stepMicro}>
          Step a micro-operation
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={stepInstruction}>
          Step an instruction
        </button>
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "Pause" : "Run"}
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={runToEnd}>
          To the end
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={reset}>
          Reset
        </button>
        {state && (
          <span className="machineCount">
            {state.instructions.toLocaleString()} instructions · {state.cycles.toLocaleString()} transfers
          </span>
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
            {sourceLines.map((line, i) => (
              <div key={i} data-current={i + 1 === currentSourceLine}>
                {line || " "}
              </div>
            ))}
          </div>
        </Pane>

        <Pane title="Intermediate code" meta="three-address, A1.4.1">
          <div className="machineList">
            {(compiled?.ir ?? []).map((i, n) => (
              <div key={n} data-current={i.line === currentSourceLine}>
                <span className="machineDim">{i.op}</span> {i.text}
              </div>
            ))}
            {!compiled?.ir.length && <div className="machineDim">compile to see this</div>}
          </div>
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

        <Pane
          title="Memory"
          meta={memoryAt === STACK_TOP - 64 ? "the stack" : "the heap"}
        >
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

        <Pane title="Register transfers" meta="what the control unit sequences">
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
  meta?: string;
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
