// The machine, off the main thread.
//
// A million instructions is a fraction of a second of real work and several
// seconds of frozen page if it happens on the UI thread. Here it cannot freeze
// anything: the run is chunked, progress is posted between chunks, and a stop
// message is seen at the next chunk boundary rather than never.
import createMachineCore, { type MachineCore, type WasmCpu } from "./wasm/machineCore.js";

type Request =
  | { id: number; call: "compile"; source: string; optLevel: number }
  | { id: number; call: "assemble"; source: string }
  | { id: number; call: "load"; bytes: string; entry: number; stack: number }
  | {
      id: number;
      call: "configure";
      recordHistory: boolean;
      cache: boolean;
      sets: number;
      ways: number;
      lineBytes: number;
      missPenalty: number;
      pipeline: boolean;
      forwarding: boolean;
      predictTaken: boolean;
    }
  | { id: number; call: "step" }
  | { id: number; call: "back"; count: number }
  | { id: number; call: "run"; budget: number }
  | { id: number; call: "stop" }
  | { id: number; call: "snapshot" }
  | { id: number; call: "window"; at: number; count: number }
  | { id: number; call: "alu"; width: number; a: number; b: number; op: number };

let core: MachineCore | null = null;
let cpu: WasmCpu | null = null;
let stopped = false;

// Which slice of memory the caller is looking at. Held here so every reply
// carries the right window without the caller repeating itself.
let windowAt = 0;
let windowCount = 64;

async function ready(): Promise<MachineCore> {
  if (!core) core = await createMachineCore();
  return core;
}

function machine(c: MachineCore): WasmCpu {
  if (!cpu) cpu = new c.Cpu();
  return cpu;
}

/** State, memory and the three model views in one message. Sending them
 *  separately would mean the panes could disagree with each other for a frame. */
function snapshot() {
  if (!cpu) return null;
  return {
    state: JSON.parse(cpu.state()),
    memory: JSON.parse(cpu.memory(windowAt, windowCount)),
    profile: JSON.parse(cpu.profile()),
    cache: JSON.parse(cpu.cacheState()),
    pipeline: JSON.parse(cpu.pipelineState()),
  };
}

// One instruction at a time would post thousands of messages a second; a chunk
// this size keeps the stop message responsive while costing one post per few
// milliseconds of work.
const CHUNK = 20_000;

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;

  if (message.call === "stop") {
    stopped = true;
    return;
  }

  try {
    const c = await ready();

    switch (message.call) {
      case "compile":
        self.postMessage({ id: message.id, result: JSON.parse(c.compilePython(message.source, message.optLevel)) });
        return;

      case "assemble":
        self.postMessage({ id: message.id, result: JSON.parse(c.assembleX86(message.source)) });
        return;

      case "alu":
        self.postMessage({
          id: message.id,
          result: JSON.parse(c.aluEvaluate(message.width, message.a, message.b, message.op)),
        });
        return;

      case "load": {
        const m = machine(c);
        m.loadBytes(message.bytes, 0);
        m.reset(message.entry, message.stack);
        self.postMessage({ id: message.id, result: snapshot() });
        return;
      }

      case "configure": {
        machine(c).configure(
          message.recordHistory,
          message.cache,
          message.sets,
          message.ways,
          message.lineBytes,
          message.missPenalty,
          message.pipeline,
          message.forwarding,
          message.predictTaken,
        );
        self.postMessage({ id: message.id, result: true });
        return;
      }

      case "step": {
        const m = machine(c);
        const micro = JSON.parse(m.step());
        self.postMessage({ id: message.id, result: { micro, ...snapshot() } });
        return;
      }

      case "back": {
        const m = machine(c);
        const moved = m.undoMany(message.count);
        self.postMessage({ id: message.id, result: { moved, ...snapshot() } });
        return;
      }

      case "run": {
        const m = machine(c);
        stopped = false;
        let ran = 0;
        for (;;) {
          const left = message.budget - ran;
          if (left <= 0 || stopped) break;
          const did = m.runChunk(Math.min(CHUNK, left));
          ran += did;
          const state = JSON.parse(m.state());
          if (did === 0 || state.halted || state.fault) break;
          self.postMessage({ id: message.id, progress: { instructions: state.instructions } });
          // Yielding is what makes "stop" work at all: messages queued while
          // this handler runs are only delivered once it gives the loop back.
          await new Promise((resume) => setTimeout(resume, 0));
        }
        self.postMessage({ id: message.id, result: { ran, stopped, ...snapshot() } });
        return;
      }

      case "window":
        windowAt = message.at;
        windowCount = message.count;
        machine(c);
        self.postMessage({ id: message.id, result: snapshot() });
        return;

      case "snapshot":
        machine(c);
        self.postMessage({ id: message.id, result: snapshot() });
        return;
    }
  } catch (error) {
    self.postMessage({ id: message.id, error: String(error) });
  }
};
