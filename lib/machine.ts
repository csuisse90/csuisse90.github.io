"use client";

// The main thread's side of the machine worker: one promise per request, and
// one worker per tab. Everything here is async because everything there is on
// another thread — there is no synchronous door into it, by design.

export type Compiled = {
  ok: boolean;
  error: string;
  errorLine: number;
  optLevel: number;
  optimisations: string[];
  tree: string;
  ir: { op: string; text: string; line: number }[];
  assembly: string;
  assemblyToSource: number[];
};

export type AsmLine = { address: number; length: number; sourceLine: number; text: string };
export type Assembled = {
  error: string;
  bytes: number[];
  lines: AsmLine[];
  labels: Record<string, number>;
};

export type State = {
  regs: number[];
  rip: number;
  flags: { carry: boolean; zero: boolean; sign: boolean; overflow: boolean };
  halted: boolean;
  fault: string;
  output: string;
  instructions: number;
  cycles: number;
  history: number;
};

export type Micro = { transfer: string; lines: string };

export type Profile = {
  total: number;
  rows: { address: number; cycles: number; count: number }[];
};

export type CacheState = {
  enabled: boolean;
  sets: number;
  ways: number;
  lineBytes: number;
  hits: number;
  misses: number;
  evictions: number;
  lastLine: number;
  lastHit: boolean;
  lines: { valid: boolean; tag: number; block: number; dirty: boolean }[];
};

export type PipelineState = {
  enabled: boolean;
  forwarding: boolean;
  predictTaken: boolean;
  cycles: number;
  issued: number;
  stallCycles: number;
  flushCycles: number;
  missCycles: number;
  recent: {
    address: number;
    text: string;
    start: number;
    stall: number;
    flushed: boolean;
    why: string;
  }[];
};

export type Snapshot = {
  state: State;
  memory: number[];
  profile: Profile;
  cache: CacheState;
  pipeline: PipelineState;
};

export type Settings = {
  recordHistory: boolean;
  cache: boolean;
  sets: number;
  ways: number;
  lineBytes: number;
  missPenalty: number;
  pipeline: boolean;
  forwarding: boolean;
  predictTaken: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  recordHistory: true,
  cache: true,
  sets: 8,
  ways: 2,
  lineBytes: 16,
  missPenalty: 10,
  pipeline: true,
  forwarding: true,
  predictTaken: false,
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  onProgress?: (instructions: number) => void;
};

/** One worker per tab, created on first use. The machine holds state, so a
 *  second worker would be a second, different machine. */
export class MachineClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  private ensure(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL("./machineWorker.ts", import.meta.url));
    this.worker.onmessage = (event: MessageEvent) => {
      const { id, result, error, progress } = event.data ?? {};
      const waiting = this.pending.get(id);
      if (!waiting) return;
      if (progress) {
        waiting.onProgress?.(progress.instructions);
        return;
      }
      this.pending.delete(id);
      if (error) waiting.reject(new Error(error));
      else waiting.resolve(result);
    };
    this.worker.onerror = (event) => {
      // Without this every caller waits for ever on a worker that has already
      // died, and the page just says "starting…".
      for (const [, waiting] of this.pending) waiting.reject(new Error(event.message));
      this.pending.clear();
    };
    return this.worker;
  }

  private send<T>(
    message: Record<string, unknown>,
    onProgress?: (instructions: number) => void,
  ): Promise<T> {
    const worker = this.ensure();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, onProgress });
      worker.postMessage({ ...message, id });
    });
  }

  compile(source: string, optLevel: number) {
    return this.send<Compiled>({ call: "compile", source, optLevel });
  }
  assemble(source: string) {
    return this.send<Assembled>({ call: "assemble", source });
  }
  load(bytes: number[], entry: number, stack: number) {
    // Base64, because a raw byte string crossing into wasm is read as UTF-8
    // and every byte above 0x7f comes out as two.
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return this.send<Snapshot>({ call: "load", bytes: btoa(binary), entry, stack });
  }
  configure(settings: Settings) {
    return this.send<boolean>({ call: "configure", ...settings });
  }
  step() {
    return this.send<Snapshot & { micro: { micro: Micro[] } }>({ call: "step" });
  }
  back(count: number) {
    return this.send<Snapshot & { moved: number }>({ call: "back", count });
  }
  run(budget: number, onProgress?: (instructions: number) => void) {
    return this.send<Snapshot & { ran: number; stopped: boolean }>({ call: "run", budget }, onProgress);
  }
  stop() {
    this.ensure().postMessage({ call: "stop", id: 0 });
  }
  window(at: number, count: number) {
    return this.send<Snapshot>({ call: "window", at, count });
  }
  snapshot() {
    return this.send<Snapshot>({ call: "snapshot" });
  }
  alu(width: number, a: number, b: number, op: number) {
    return this.send<{ value: number; carry: boolean; zero: boolean; sign: boolean; overflow: boolean }>(
      { call: "alu", width, a, b, op },
    );
  }

  close() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

let shared: MachineClient | null = null;

/** The tab's machine. The terminal's `cc` and the machine page share it, which
 *  is why compiling in one is visible in the other. */
export function machineClient(): MachineClient {
  if (!shared) shared = new MachineClient();
  return shared;
}
