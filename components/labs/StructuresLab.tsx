"use client";

import { useState } from "react";

/** Four structures driven by their own operations, so the restriction each one
 *  imposes is felt rather than described. The log records what each call cost,
 *  which is the part exam answers get wrong. */
type Kind = "stack" | "queue" | "linked" | "bst";

const KINDS: { id: Kind; name: string; code: string; blurb: string }[] = [
  { id: "stack", name: "Stack", code: "B4.1.2", blurb: "Push and pop at the same end. Last in, first out." },
  { id: "queue", name: "Circular queue", code: "B4.1.2", blurb: "Enqueue at the rear, dequeue from the front, indices wrapping with mod." },
  { id: "linked", name: "Linked list", code: "B4.1.3", blurb: "Nodes joined by pointers. Insertion is cheap; reaching the nth node is not." },
  { id: "bst", name: "Binary search tree", code: "B4.1.4", blurb: "Smaller left, larger right, at every node." },
];

type Node = { value: number; left: Node | null; right: Node | null };

const QUEUE_SIZE = 8;

export default function StructuresLab() {
  const [kind, setKind] = useState<Kind>("stack");
  const [value, setValue] = useState("42");
  const [log, setLog] = useState<string[]>([]);

  const [stack, setStack] = useState<number[]>([7, 4, 9]);
  const [ring, setRing] = useState<(number | null)[]>(() => {
    const slots: (number | null)[] = Array(QUEUE_SIZE).fill(null);
    slots[2] = 12;
    slots[3] = 7;
    slots[4] = 9;
    return slots;
  });
  const [front, setFront] = useState(2);
  const [rear, setRear] = useState(4);
  const [count, setCount] = useState(3);
  const [list, setList] = useState<number[]>([12, 7, 9]);
  const [tree, setTree] = useState<Node | null>(() => {
    let root: Node | null = null;
    for (const v of [50, 30, 70, 20, 40, 60, 85]) root = insert(root, v);
    return root;
  });

  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 8));
  const number = () => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  // ---- stack ---------------------------------------------------------------
  const push = () => {
    const n = number();
    if (n === null) return say("push: that is not a number");
    setStack((s) => [n, ...s]);
    say(`push(${n}) — one write at the top. O(1)`);
  };
  const pop = () => {
    if (!stack.length) return say("pop: stack underflow — refused, not zero");
    say(`pop() → ${stack[0]} — the most recent item. O(1)`);
    setStack((s) => s.slice(1));
  };

  // ---- circular queue ------------------------------------------------------
  const enqueue = () => {
    const n = number();
    if (n === null) return say("enqueue: that is not a number");
    if (count === QUEUE_SIZE) return say("enqueue: the queue is full — refused");
    const next = (rear + 1) % QUEUE_SIZE;
    setRing((r) => r.map((v, i) => (i === next ? n : v)));
    setRear(next);
    setCount((c) => c + 1);
    say(`enqueue(${n}) — rear = (${rear} + 1) mod ${QUEUE_SIZE} = ${next}. O(1)`);
  };
  const dequeue = () => {
    if (!count) return say("dequeue: the queue is empty — refused");
    const taken = ring[front];
    const next = (front + 1) % QUEUE_SIZE;
    setRing((r) => r.map((v, i) => (i === front ? null : v)));
    setFront(next);
    setCount((c) => c - 1);
    say(`dequeue() → ${taken} — front = (${front} + 1) mod ${QUEUE_SIZE} = ${next}. Nothing moved. O(1)`);
  };

  // ---- linked list ---------------------------------------------------------
  const insertFront = () => {
    const n = number();
    if (n === null) return say("insert: that is not a number");
    setList((l) => [n, ...l]);
    say(`insert at front: new.next ← head, then head ← new. Two pointer writes. O(1)`);
  };
  const deleteValue = () => {
    const n = number();
    if (n === null) return say("delete: that is not a number");
    const at = list.indexOf(n);
    if (at < 0) return say(`delete(${n}): not in the list — ${list.length} nodes walked`);
    setList((l) => l.filter((_, i) => i !== at));
    say(
      at === 0
        ? `delete(${n}): it is the head, so move the head pointer. O(1)`
        : `delete(${n}): ${at + 1} nodes walked to find it, then previous.next ← current.next`,
    );
  };
  const findValue = () => {
    const n = number();
    if (n === null) return say("find: that is not a number");
    const at = list.indexOf(n);
    say(
      at < 0
        ? `find(${n}): not present — the whole list of ${list.length} was walked`
        : `find(${n}): ${at + 1} links followed. There is no shortcut to the nth node`,
    );
  };

  // ---- binary search tree --------------------------------------------------
  const insertNode = () => {
    const n = number();
    if (n === null) return say("insert: that is not a number");
    const steps = depthOf(tree, n);
    setTree((t) => insert(t, n));
    say(`insert(${n}) — ${steps} comparison${steps === 1 ? "" : "s"} down to an empty place, then added as a leaf`);
  };
  const searchNode = () => {
    const n = number();
    if (n === null) return say("search: that is not a number");
    const steps = depthOf(tree, n);
    say(
      contains(tree, n)
        ? `search(${n}) — found in ${steps} comparison${steps === 1 ? "" : "s"}. Each one discarded a whole subtree`
        : `search(${n}) — not present, decided in ${steps} comparison${steps === 1 ? "" : "s"}`,
    );
  };

  const reset = () => {
    setStack([7, 4, 9]);
    const slots: (number | null)[] = Array(QUEUE_SIZE).fill(null);
    slots[2] = 12;
    slots[3] = 7;
    slots[4] = 9;
    setRing(slots);
    setFront(2);
    setRear(4);
    setCount(3);
    setList([12, 7, 9]);
    let root: Node | null = null;
    for (const v of [50, 30, 70, 20, 40, 60, 85]) root = insert(root, v);
    setTree(root);
    setLog([]);
  };

  const current = KINDS.find((k) => k.id === kind)!;

  return (
    <>
      <div className="comparePick">
        {KINDS.map((k) => (
          <button
            key={k.id}
            className="comparePickBtn"
            data-active={k.id === kind}
            onClick={() => setKind(k.id)}
          >
            <span className="mono compareUnit">{k.code}</span>
            {k.name}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panelHead">
          <span>{current.name}</span>
          <span>{current.code}</span>
        </div>

        <div className="panelBody">
          <p
            style={{
              margin: "0 0 1.2rem",
              fontSize: "0.85rem",
              color: "var(--ink-soft)",
              maxWidth: "68ch",
            }}
          >
            {current.blurb}
          </p>

          {kind === "stack" && <StackView items={stack} />}
          {kind === "queue" && <RingView slots={ring} front={front} rear={rear} count={count} />}
          {kind === "linked" && <ListView items={list} />}
          {kind === "bst" && <TreeView root={tree} />}
        </div>

        <div className="transport">
          <label className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
            value{" "}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="numeric"
              aria-label="Value"
              style={{
                width: "4.5rem",
                font: "inherit",
                padding: "0.2rem 0.4rem",
                border: "1px solid var(--hairline)",
                background: "var(--paper)",
              }}
            />
          </label>

          {kind === "stack" && (
            <>
              <Op label="push" onClick={push} />
              <Op label="pop" onClick={pop} />
            </>
          )}
          {kind === "queue" && (
            <>
              <Op label="enqueue" onClick={enqueue} />
              <Op label="dequeue" onClick={dequeue} />
            </>
          )}
          {kind === "linked" && (
            <>
              <Op label="insert at front" onClick={insertFront} />
              <Op label="delete" onClick={deleteValue} />
              <Op label="find" onClick={findValue} />
            </>
          )}
          {kind === "bst" && (
            <>
              <Op label="insert" onClick={insertNode} />
              <Op label="search" onClick={searchNode} />
            </>
          )}
          <Op label="reset" onClick={reset} />
        </div>

        {log.length > 0 && (
          <pre className="pyOut" style={{ margin: 0 }}>
            {log.join("\n")}
          </pre>
        )}
      </div>

      {kind === "bst" && tree && (
        <div className="panel">
          <div className="panelHead">
            <span>Traversals of this tree</span>
            <span>height {heightOf(tree)}</span>
          </div>
          <div className="panelBody mono" style={{ fontSize: "0.78rem", lineHeight: 2 }}>
            <div>
              <span style={{ color: "var(--ink-faint)" }}>in-order&nbsp;&nbsp;&nbsp;</span>
              {walk(tree, "in").join(" ")}
              <span style={{ color: "var(--ink-faint)" }}> — sorted</span>
            </div>
            <div>
              <span style={{ color: "var(--ink-faint)" }}>pre-order&nbsp;&nbsp;</span>
              {walk(tree, "pre").join(" ")}
              <span style={{ color: "var(--ink-faint)" }}> — rebuilds this shape</span>
            </div>
            <div>
              <span style={{ color: "var(--ink-faint)" }}>post-order&nbsp;</span>
              {walk(tree, "post").join(" ")}
              <span style={{ color: "var(--ink-faint)" }}> — children before parents</span>
            </div>
          </div>
          <p className="caption">
            Insert 1, 2, 3, 4, 5 in that order into a fresh tree and watch the
            height climb by one each time. That is a binary search tree
            degenerating into a linked list.
          </p>
        </div>
      )}
    </>
  );
}

function Op({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={onClick}>
      {label}
    </button>
  );
}

function StackView({ items }: { items: number[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "14rem" }}>
      <div className="mono" style={{ fontSize: "0.68rem", color: "var(--alarm)" }}>
        top — push and pop here
      </div>
      {items.length === 0 && (
        <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
          (empty)
        </div>
      )}
      {items.map((v, i) => (
        <div
          key={`${i}-${v}`}
          className="mono"
          style={{
            border: `1.6px solid ${i === 0 ? "var(--alarm)" : "var(--ink)"}`,
            color: i === 0 ? "var(--alarm)" : "var(--ink)",
            background: i === 0 ? "rgba(211,58,28,0.08)" : "var(--paper-lift)",
            padding: "0.45rem 0.8rem",
            textAlign: "center",
          }}
        >
          {v}
        </div>
      ))}
      <div className="mono" style={{ fontSize: "0.68rem", color: "var(--ink-faint)" }}>
        bottom — unreachable until everything above leaves
      </div>
    </div>
  );
}

function RingView({
  slots,
  front,
  rear,
  count,
}: {
  slots: (number | null)[];
  front: number;
  rear: number;
  count: number;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {slots.map((v, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              className="mono"
              style={{
                width: "3.2rem",
                padding: "0.5rem 0",
                border: `1.6px solid ${v === null ? "var(--hairline)" : "var(--alarm)"}`,
                background: v === null ? "transparent" : "rgba(211,58,28,0.08)",
                color: v === null ? "var(--ink-faint)" : "var(--alarm)",
              }}
            >
              {v === null ? "·" : v}
            </div>
            <div className="mono" style={{ fontSize: "0.62rem", color: "var(--ink-faint)" }}>
              [{i}]
              {i === front && count > 0 ? " f" : ""}
              {i === rear && count > 0 ? " r" : ""}
            </div>
          </div>
        ))}
      </div>
      <p className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginTop: "0.8rem" }}>
        front = {front} · rear = {rear} · count = {count} of {slots.length}
        {count === slots.length ? " — full" : count === 0 ? " — empty" : ""}
      </p>
    </>
  );
}

function ListView({ items }: { items: number[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
      <span className="mono" style={{ fontSize: "0.7rem", color: "var(--teal)" }}>
        head →
      </span>
      {items.length === 0 && (
        <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
          null
        </span>
      )}
      {items.map((v, i) => (
        <span key={`${i}-${v}`} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span
            className="mono"
            style={{
              display: "inline-flex",
              border: "1.6px solid var(--ink)",
              background: "var(--paper-lift)",
            }}
          >
            <span style={{ padding: "0.4rem 0.7rem" }}>{v}</span>
            <span
              style={{
                padding: "0.4rem 0.6rem",
                borderLeft: "1.4px solid var(--ink)",
                color: "var(--ink-faint)",
                fontSize: "0.7rem",
              }}
            >
              {i === items.length - 1 ? "null" : "next"}
            </span>
          </span>
          {i < items.length - 1 && <span style={{ color: "var(--ice-deep)" }}>→</span>}
        </span>
      ))}
    </div>
  );
}

function TreeView({ root }: { root: Node | null }) {
  if (!root) {
    return (
      <p className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
        (empty)
      </p>
    );
  }
  const height = heightOf(root);
  const width = 620;
  const rowHeight = 54;
  const placed: { value: number; x: number; y: number; parent?: { x: number; y: number } }[] = [];

  const place = (node: Node | null, depth: number, left: number, right: number, parent?: { x: number; y: number }) => {
    if (!node) return;
    const x = (left + right) / 2;
    const y = 22 + depth * rowHeight;
    placed.push({ value: node.value, x, y, parent });
    place(node.left, depth + 1, left, x, { x, y });
    place(node.right, depth + 1, x, right, { x, y });
  };
  place(root, 0, 10, width - 10);

  return (
    <svg
      viewBox={`0 0 ${width} ${height * rowHeight + 20}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Binary search tree"
    >
      {placed.map((n, i) =>
        n.parent ? (
          <line
            key={`e${i}`}
            x1={n.parent.x}
            y1={n.parent.y + 16}
            x2={n.x}
            y2={n.y - 16}
            stroke="var(--ice-deep)"
            strokeWidth={1.6}
          />
        ) : null,
      )}
      {placed.map((n, i) => (
        <g key={`n${i}`}>
          <circle cx={n.x} cy={n.y} r={16} fill="var(--paper-lift)" stroke="var(--ink)" strokeWidth={1.6} />
          <text
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={11}
            fill="var(--ink)"
          >
            {n.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

function insert(node: Node | null, value: number): Node {
  if (!node) return { value, left: null, right: null };
  if (value < node.value) node.left = insert(node.left, value);
  else if (value > node.value) node.right = insert(node.right, value);
  return { ...node };
}

function contains(node: Node | null, value: number): boolean {
  if (!node) return false;
  if (value === node.value) return true;
  return contains(value < node.value ? node.left : node.right, value);
}

/** How many comparisons a search for this value takes, whether or not it is
 *  there — which is exactly what insertion costs too. */
function depthOf(node: Node | null, value: number): number {
  let steps = 0;
  let at = node;
  while (at) {
    steps++;
    if (value === at.value) return steps;
    at = value < at.value ? at.left : at.right;
  }
  return steps;
}

function heightOf(node: Node | null): number {
  return node ? 1 + Math.max(heightOf(node.left), heightOf(node.right)) : 0;
}

function walk(node: Node | null, order: "in" | "pre" | "post", out: number[] = []): number[] {
  if (!node) return out;
  if (order === "pre") out.push(node.value);
  walk(node.left, order, out);
  if (order === "in") out.push(node.value);
  walk(node.right, order, out);
  if (order === "post") out.push(node.value);
  return out;
}
