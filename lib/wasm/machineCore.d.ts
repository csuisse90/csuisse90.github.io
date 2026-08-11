/** A processor the caller holds on to and drives. Every method that returns a
 *  string returns JSON; parsing on the JavaScript side is cheaper than
 *  marshalling structures across the boundary. */
export type WasmCpu = {
  /** Base64, not raw bytes: a raw byte string is read as UTF-8 on the way in. */
  loadBytes(base64: string, at: number): void;
  reset(entry: number, stack: number): void;
  configure(
    recordHistory: boolean,
    cacheOn: boolean,
    sets: number,
    ways: number,
    lineBytes: number,
    missPenalty: number,
    pipelineOn: boolean,
    forwarding: boolean,
    predictTaken: boolean,
  ): void;
  /** JSON: { micro: [{ transfer, lines }] } */
  step(): string;
  /** One instruction backwards. False when the history has run out. */
  undo(): boolean;
  /** Many instructions backwards; returns how many it managed. */
  undoMany(count: number): number;
  run(budget: number): void;
  /** Runs up to `budget` instructions, returning how many ran. Running out is
   *  not a fault, so this is the call to chunk a long program with. */
  runChunk(budget: number): number;
  /** JSON: registers, rip, flags, halted, fault, output, counts, history size. */
  state(): string;
  memory(at: number, count: number): string;
  /** JSON: { total, rows: [{ address, cycles, count }] }, costliest first. */
  profile(): string;
  /** JSON: the cache's configuration, counters and every line. */
  cacheState(): string;
  /** JSON: the pipeline's counters and its last few instructions. */
  pipelineState(): string;
  delete(): void;
};

export type MachineCore = {
  /** JSON: tokens, tree, intermediate code, assembly, and what -O1 changed. */
  compilePython(source: string, optLevel: number): string;
  assembleX86(source: string): string;
  /** The bytes are base64: raw binary in a string is mangled by UTF-8. */
  disassembleAt(base64: string, at: number): string;
  aluDescribe(width: number): string;
  aluEvaluate(width: number, a: number, b: number, op: number): string;
  base64Decode(text: string): string;
  Cpu: new () => WasmCpu;
};

declare const createMachineCore: (opts?: unknown) => Promise<MachineCore>;
export default createMachineCore;
