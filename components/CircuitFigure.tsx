"use client";

import { useState } from "react";
import CircuitView from "./CircuitView";
import TruthTable from "./TruthTable";
import type { CircuitData } from "@/lib/types";

type Props = {
  data: CircuitData;
  /** Put the truth table beside the diagram and keep the two in step. */
  withTable?: boolean;
  animate?: boolean;
  interactive?: boolean;
  iec?: boolean;
  initialMask?: number;
  showIndex?: boolean;
  maxHeight?: number;
};

export default function CircuitFigure({
  data,
  withTable = false,
  animate = false,
  interactive = true,
  iec = false,
  initialMask = 0,
  showIndex = false,
  maxHeight = 320,
}: Props) {
  const [mask, setMask] = useState(initialMask);

  const diagram = (
    <CircuitView
      data={data}
      animate={animate}
      interactive={interactive}
      iec={iec}
      maxHeight={maxHeight}
      mask={mask}
      onMaskChange={setMask}
    />
  );

  if (!withTable) return diagram;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "1.25rem",
        alignItems: "start",
        margin: "1.75rem 0",
      }}
    >
      <div style={{ minWidth: 0 }}>{diagram}</div>
      <div style={{ paddingTop: "0.4rem" }}>
        <TruthTable
          table={data.truthTable}
          activeMask={mask}
          onSelect={setMask}
          showIndex={showIndex}
        />
        <p className="mono" style={{ color: "var(--ink-faint)", marginTop: "0.5rem" }}>
          Click a row
        </p>
      </div>
    </div>
  );
}
