"use client";

import type { CircuitData } from "@/lib/types";

/** Lists the input changes that make the circuit glitch on its way to the
 *  right answer. These are not simulated in for effect — they fall out of
 *  giving every gate the same delay, which is why real hardware does it too. */
export default function Hazards({
  data,
  onShow,
}: {
  data: CircuitData;
  onShow: (from: number, to: number) => void;
}) {
  const inputs = data.truthTable.inputs;
  const bits = (m: number) =>
    inputs.map((_, i) => ((m >> (inputs.length - 1 - i)) & 1)).join("");

  const glitchy = Object.entries(data.transitions ?? {})
    .filter(([, t]) => t.glitches.length > 0)
    .map(([key, t]) => {
      const [from, to] = key.split(">").map(Number);
      return { from, to, t };
    });

  if (glitchy.length === 0) {
    return (
      <p className="prose" style={{ fontSize: "0.92rem" }}>
        No hazards. Every path from an input to the output passes through the same number of
        gates, so nothing arrives late enough to produce a wrong answer on the way.
      </p>
    );
  }

  return (
    <>
      <p className="prose" style={{ fontSize: "0.92rem" }}>
        {glitchy.length} input change{glitchy.length === 1 ? "" : "s"} produce a{" "}
        <strong>hazard</strong>: the output flickers to the wrong value for one gate delay
        before settling correctly. It happens because two paths to the same gate are different
        lengths, so one input to it updates before the other. Pick one and drag the delay
        slider through it slowly.
      </p>
      <div className="hazardList">
        {glitchy.map(({ from, to, t }) => (
          <button key={`${from}>${to}`} className="hazardBtn" onClick={() => onShow(from, to)}>
            <span className="mono">
              {bits(from)} → {bits(to)}
            </span>
            <span className="hazardWhen">
              glitches at delay {t.glitches.join(", ")} of {t.settled}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
