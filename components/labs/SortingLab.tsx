"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Every step a sort takes, recorded up front. Recording rather than animating
 *  means the lab can be stepped backwards, which is what makes it useful for
 *  tracing an exam question. */
type Frame = {
  values: number[];
  /** Indices being compared on this step. */
  looking: [number, number] | null;
  /** Indices already in their final position. */
  done: number[];
  comparisons: number;
  moves: number;
  note: string;
};

type Algorithm = "bubble" | "selection" | "insertion" | "merge";

const ALGORITHMS: { id: Algorithm; name: string; cost: string }[] = [
  { id: "bubble", name: "Bubble", cost: "O(n²), O(n) if already sorted" },
  { id: "selection", name: "Selection", cost: "O(n²) always, ≤ n swaps" },
  { id: "insertion", name: "Insertion", cost: "O(n²), near O(n) if nearly sorted" },
  { id: "merge", name: "Merge", cost: "O(n log n), extra memory O(n)" },
];

const SHAPES = [
  { id: "random", name: "Random" },
  { id: "nearly", name: "Nearly sorted" },
  { id: "reversed", name: "Reversed" },
  { id: "sorted", name: "Already sorted" },
] as const;

type Shape = (typeof SHAPES)[number]["id"];

/** A fixed pseudo-random sequence, so the same choice always gives the same
 *  data and two algorithms can be compared honestly. */
function makeData(shape: Shape, n: number): number[] {
  let seed = 20260811;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const base = Array.from({ length: n }, (_, i) => i + 1);
  if (shape === "sorted") return base;
  if (shape === "reversed") return base.reverse();
  if (shape === "nearly") {
    // n === 1 has no pair to swap, and swapping past the end would leave a hole.
    if (n < 2) return base;
    const out = [...base];
    for (let k = 0; k < Math.max(1, Math.round(n / 8)); k++) {
      const i = Math.floor(next() * (n - 1));
      [out[i], out[i + 1]] = [out[i + 1], out[i]];
    }
    return out;
  }
  const out = [...base];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function record(algorithm: Algorithm, input: number[]): Frame[] {
  const values = [...input];
  const frames: Frame[] = [];
  let comparisons = 0;
  let moves = 0;
  const push = (looking: [number, number] | null, done: number[], note: string) =>
    frames.push({ values: [...values], looking, done: [...done], comparisons, moves, note });

  push(null, [], "the list as given");

  if (algorithm === "bubble") {
    const done: number[] = [];
    for (let end = values.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        comparisons++;
        push([i, i + 1], done, `is ${values[i]} bigger than ${values[i + 1]}?`);
        if (values[i] > values[i + 1]) {
          [values[i], values[i + 1]] = [values[i + 1], values[i]];
          moves++;
          swapped = true;
          push([i, i + 1], done, `yes — swap them`);
        }
      }
      done.push(end);
      push(null, done, `end of a pass: ${values[end]} is now in its final place`);
      if (!swapped) {
        for (let i = 0; i <= end; i++) done.push(i);
        push(null, done, "a whole pass with no swaps, so the list is sorted");
        break;
      }
    }
    if (values.length) push(null, values.map((_, i) => i), "sorted");
  }

  if (algorithm === "selection") {
    const done: number[] = [];
    for (let start = 0; start < values.length; start++) {
      let smallest = start;
      for (let i = start + 1; i < values.length; i++) {
        comparisons++;
        push([smallest, i], done, `is ${values[i]} smaller than ${values[smallest]}?`);
        if (values[i] < values[smallest]) smallest = i;
      }
      if (smallest !== start) {
        [values[start], values[smallest]] = [values[smallest], values[start]];
        moves++;
      }
      done.push(start);
      push(null, done, `${values[start]} is the smallest left — swap it into place`);
    }
    push(null, values.map((_, i) => i), "sorted");
  }

  if (algorithm === "insertion") {
    const done = [0];
    for (let i = 1; i < values.length; i++) {
      const held = values[i];
      let j = i - 1;
      push([i, i], done, `take ${held} and slide it back into the sorted part`);
      while (j >= 0) {
        comparisons++;
        push([j, j + 1], done, `is ${values[j]} bigger than ${held}?`);
        if (values[j] <= held) break;
        values[j + 1] = values[j];
        moves++;
        j--;
      }
      values[j + 1] = held;
      done.push(i);
      push(null, done, `${held} goes at position ${j + 1}`);
    }
    push(null, values.map((_, i) => i), "sorted");
  }

  if (algorithm === "merge") {
    // Bottom-up, so the frames read as levels of merging rather than as a
    // recursion the reader has to hold in their head.
    for (let width = 1; width < values.length; width *= 2) {
      for (let left = 0; left < values.length; left += width * 2) {
        const middle = Math.min(left + width, values.length);
        const right = Math.min(left + width * 2, values.length);
        if (middle >= right) continue;
        const a = values.slice(left, middle);
        const b = values.slice(middle, right);
        push([left, right - 1], [], `merge [${a.join(" ")}] with [${b.join(" ")}]`);
        let i = 0;
        let j = 0;
        let k = left;
        while (i < a.length && j < b.length) {
          comparisons++;
          values[k++] = a[i] <= b[j] ? a[i++] : b[j++];
          moves++;
        }
        while (i < a.length) {
          values[k++] = a[i++];
          moves++;
        }
        while (j < b.length) {
          values[k++] = b[j++];
          moves++;
        }
        push([left, right - 1], [], `merged into [${values.slice(left, right).join(" ")}]`);
      }
      push(null, [], `all runs of ${width} merged — one level done`);
    }
    push(null, values.map((_, i) => i), "sorted");
  }

  return frames;
}

export default function SortingLab() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("bubble");
  const [shape, setShape] = useState<Shape>("random");
  const [size, setSize] = useState(12);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const input = useMemo(() => makeData(shape, size), [shape, size]);
  const frames = useMemo(() => record(algorithm, input), [algorithm, input]);
  const frame = frames[Math.min(at, frames.length - 1)];

  useEffect(() => setAt(0), [algorithm, shape, size]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setAt((n) => {
        if (n >= frames.length - 1) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, 90);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, frames.length]);

  // Every algorithm run on the same data, so the counts can be compared.
  const totals = useMemo(
    () =>
      ALGORITHMS.map((a) => {
        const trace = record(a.id, input);
        const last = trace[trace.length - 1];
        return { ...a, comparisons: last?.comparisons ?? 0, moves: last?.moves ?? 0 };
      }),
    [input],
  );

  const tallest = Math.max(...frame.values);

  return (
    <>
      <div className="panel">
        <div className="panelHead">
          <span>{ALGORITHMS.find((a) => a.id === algorithm)?.name} sort</span>
          <span>
            step {Math.min(at, frames.length - 1)} of {frames.length - 1}
          </span>
        </div>

        <div className="panelBody">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "3px",
              height: "13rem",
            }}
          >
            {frame.values.map((v, i) => {
              const looking = frame.looking && (i === frame.looking[0] || i === frame.looking[1]);
              const settled = frame.done.includes(i);
              return (
                <div
                  key={i}
                  title={String(v)}
                  style={{
                    flex: 1,
                    height: `${(v / tallest) * 100}%`,
                    background: looking
                      ? "var(--alarm)"
                      : settled
                        ? "var(--teal)"
                        : "var(--ice-deep)",
                    transition: "height 90ms linear",
                  }}
                />
              );
            })}
          </div>

          <p className="mono" style={{ marginTop: "0.9rem", fontSize: "0.72rem", color: "var(--ink-soft)" }}>
            {frame.note}
          </p>

          <div
            className="mono"
            style={{
              display: "flex",
              gap: "1.6rem",
              marginTop: "0.5rem",
              fontSize: "0.72rem",
            }}
          >
            <span>
              comparisons <strong style={{ color: "var(--alarm)" }}>{frame.comparisons}</strong>
            </span>
            <span>
              moves <strong style={{ color: "var(--alarm)" }}>{frame.moves}</strong>
            </span>
            <span style={{ color: "var(--ink-faint)" }}>
              red = being compared · teal = in final position
            </span>
          </div>
        </div>

        <div className="transport">
          <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => setAt(0)}>
            Restart
          </button>
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => setAt((n) => Math.max(0, n - 1))}
          >
            Back
          </button>
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => setAt((n) => Math.min(frames.length - 1, n + 1))}
          >
            Step
          </button>
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "Pause" : "Run"}
          </button>
          <button
            className="paletteBtn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => setAt(frames.length - 1)}
          >
            To the end
          </button>
        </div>
      </div>

      <div className="labControls">
        <div>
          <div className="labControlHead">Algorithm</div>
          <div className="comparePick">
            {ALGORITHMS.map((a) => (
              <button
                key={a.id}
                className="comparePickBtn"
                data-active={a.id === algorithm}
                onClick={() => setAlgorithm(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="labControlHead">Starting data</div>
          <div className="comparePick">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                className="comparePickBtn"
                data-active={s.id === shape}
                onClick={() => setShape(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="labControlHead" htmlFor="sortSize">
            Items: {size}
          </label>
          <input
            id="sortSize"
            type="range"
            min={6}
            max={32}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--alarm)" }}
          />
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <span>All four on this same data</span>
          <span>
            {size} items, {SHAPES.find((s) => s.id === shape)?.name.toLowerCase()}
          </span>
        </div>
        <div className="panelBody">
          <div className="tableWrap">
            <table className="compareTable">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Comparisons</th>
                  <th>Moves</th>
                  <th>Complexity</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.id}>
                    <th scope="row">{t.name}</th>
                    <td>{t.comparisons}</td>
                    <td>{t.moves}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{t.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption">
            Switch the starting data to <strong>nearly sorted</strong> and watch
            insertion sort collapse to almost nothing while selection sort makes
            exactly the same number of comparisons it always does. That
            difference is the whole reason best-case complexity is quoted
            separately.
          </p>
        </div>
      </div>
    </>
  );
}
