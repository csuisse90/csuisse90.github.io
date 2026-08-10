import data from "./generated/circuits.json";
import type { CircuitData } from "./types";

const ALL = data as unknown as Record<string, CircuitData>;

/** Server-side only: pages pass the one circuit they need to a client
 *  component, so no page ever ships the whole catalogue to the browser. */
export function circuit(id: string): CircuitData {
  const c = ALL[id];
  if (!c) throw new Error(`No generated circuit with id "${id}"`);
  return c;
}
