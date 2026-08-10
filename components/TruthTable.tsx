"use client";

import type { TruthTable as TT } from "@/lib/types";

type Props = {
  table: TT;
  /** Row currently shown in the diagram; that row is highlighted. */
  activeMask?: number;
  onSelect?: (mask: number) => void;
  /** Show the decimal row number, which is the minterm index. */
  showIndex?: boolean;
  /** Highlight the rows where a given output column is 1. */
  emphasiseOutput?: number;
};

function cell(v: string) {
  return v === "1" ? "one" : v === "0" ? "zero" : "unknown";
}

export default function TruthTable({
  table,
  activeMask,
  onSelect,
  showIndex = false,
  emphasiseOutput,
}: Props) {
  if (table.truncated || table.rows.length === 0) {
    return (
      <p className="annotation">
        Too many inputs to tabulate here — a truth table doubles in height with
        every input added.
      </p>
    );
  }

  return (
    <table className="tt">
      <thead>
        <tr>
          {showIndex && <th>#</th>}
          {table.inputs.map((name) => (
            <th key={name}>{name}</th>
          ))}
          {table.outputs.map((name, i) => (
            <th
              key={name}
              className="outCol"
              style={
                emphasiseOutput === i
                  ? { background: "rgba(211,58,28,0.14)" }
                  : undefined
              }
            >
              {name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr
            key={i}
            data-active={activeMask === i}
            onClick={() => onSelect?.(i)}
            style={onSelect ? undefined : { cursor: "default" }}
          >
            {showIndex && (
              <td className="rowIndex">{i}</td>
            )}
            {row.in.split("").map((v, j) => (
              <td key={j} className={cell(v)}>
                {v}
              </td>
            ))}
            {row.out.split("").map((v, j) => (
              <td key={j} className={cell(v)}>
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
