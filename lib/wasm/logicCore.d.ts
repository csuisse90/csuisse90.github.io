export type WasmCircuit = {
  addNode(kind: number, label: string): number;
  setPosition(node: number, x: number, y: number): void;
  connect(from: number, to: number, pin: number): boolean;
  disconnectPin(node: number, pin: number): void;
  removeNode(node: number): void;
  clear(): void;
  nodeCount(): number;
  inputCount(): number;
  outputCount(): number;
  hasCycle(): boolean;
  evaluate(mask: number): string;
  trace(mask: number): string;
  traceFrom(from: number, to: number): string;
  truthTable(): string;
  geometry(symbolSet: number): string;
  describe(): string;
  delete(): void;
};

/** The virtual filesystem behind the terminal. Every method that can fail
 *  returns an error message, empty on success. */
export type WasmFs = {
  resolve(path: string): string;
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  cwd(): string;
  chdir(path: string): string;
  read(path: string): string;
  write(path: string, content: string, when: number): string;
  append(path: string, content: string, when: number): string;
  makeDirectory(path: string, when: number): string;
  remove(path: string, recursive: boolean): string;
  move(from: string, to: string, when: number): string;
  copy(from: string, to: string, when: number): string;
  listJson(path: string): string;
  treeJson(path: string): string;
  statJson(path: string): string;
  dumpJson(): string;
  loadJson(json: string): string;
  delete(): void;
};

export type LogicCore = {
  Fs: new () => WasmFs;
  /** JSON array of paths matching a possibly-globbed argument. */
  fsExpand(fs: WasmFs, argument: string): string;
  /** JSON array of completions for a partially typed path. */
  fsComplete(fs: WasmFs, prefix: string): string;
  /** JSON array of "path:line:text". Paths are newline separated. */
  fsGrep(
    fs: WasmFs,
    pattern: string,
    newlineSeparatedPaths: string,
    ignoreCase: boolean,
    invert: boolean,
  ): string;
  /** JSON array of words, honouring quotes and escapes. */
  shTokenise(line: string): string;
  /** JSON {lines, words, chars}. */
  shCount(text: string): string;
  globMatch(pattern: string, name: string): boolean;
  Circuit: new () => WasmCircuit;
  minimise(
    numVars: number,
    varNames: string,
    mintermCsv: string,
    dontCareCsv: string,
  ): string;
  analyseExpression(src: string): string;
  spriteGeometry(): string;
  buildFromExpression(circuit: WasmCircuit, src: string): string;
};

declare const createLogicCore: (opts?: unknown) => Promise<LogicCore>;
export default createLogicCore;
