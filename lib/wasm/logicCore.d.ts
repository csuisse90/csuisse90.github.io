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

export type LogicCore = {
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
