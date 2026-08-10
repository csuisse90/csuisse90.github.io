"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// The published site is static, so there is no server to ask. The panel talks
// to a bridge running on the reader's own machine, which shells out to Claude
// Code. Loopback addresses are exempt from mixed-content blocking, so an
// https page is allowed to call http://127.0.0.1.
const BRIDGE = "http://127.0.0.1:8787";

type Turn = { role: "you" | "claude"; text: string };

const TOPIC_FROM_PATH: Record<string, string> = {
  "/": "computer science fundamentals",
  "/hardware/": "CPU components and the fetch-decode-execute cycle",
  "/data-representation/": "binary, hexadecimal and two's complement",
  "/gates/": "logic gates",
  "/truth-tables/": "truth tables",
  "/boolean-algebra/": "Boolean algebra and De Morgan's laws",
  "/karnaugh-maps/": "Karnaugh maps",
  "/logic-diagrams/": "logic diagrams",
  "/operating-systems/": "operating systems and scheduling",
  "/translators/": "compilers and interpreters",
  "/networks/": "network fundamentals and the OSI model",
  "/network-architecture/": "network topologies and architecture",
  "/data-transmission/": "data transmission and packet switching",
  "/databases/": "relational databases",
  "/machine-learning/": "machine learning",
};

export default function AiPanel() {
  const pathname = usePathname();
  const here = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const topic = TOPIC_FROM_PATH[here] ?? "IB computer science";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"unknown" | "up" | "down">("unknown");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || status !== "unknown") return;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2500);
    fetch(`${BRIDGE}/health`, { signal: ac.signal })
      .then((r) => setStatus(r.ok ? "up" : "down"))
      .catch(() => setStatus("down"))
      .finally(() => clearTimeout(timer));
    return () => ac.abort();
  }, [open, status]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, busy]);

  async function ask(prompt: string, display: string) {
    if (busy) return;
    setTurns((t) => [...t, { role: "you", text: display }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`${BRIDGE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, topic }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { text?: string; error?: string };
      setTurns((t) => [
        ...t,
        { role: "claude", text: data.text ?? data.error ?? "(no reply)" },
      ]);
      setStatus("up");
    } catch {
      setStatus("down");
      setTurns((t) => [
        ...t,
        {
          role: "claude",
          text:
            "Could not reach the local bridge. Start it with:\n\n  bun run tools/claudeBridge.mjs\n\nThen ask again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="aiToggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="aiPanel"
      >
        {open ? "Close" : "Ask Claude"}
      </button>

      <aside id="aiPanel" className="aiPanel" data-open={open} aria-hidden={!open}>
        <div className="aiHead">
          <span
            className="aiDot"
            data-status={status}
            title={
              status === "up"
                ? "connected"
                : status === "down"
                  ? "not running"
                  : "checking"
            }
          />
          <button
            className="aiClose"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="aiBody" ref={scroller}>
          {turns.length === 0 && status === "down" && (
            <div className="aiHint">
              <p className="aiWarn">
                Not connected. Start the helper with{" "}
                <code>bun run tools/claudeBridge.mjs</code>
              </p>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className="aiTurn" data-role={t.role}>
              <div className="aiRole">{t.role}</div>
              <div className="aiText">{t.text}</div>
            </div>
          ))}

          {busy && <div className="aiTurn" data-role="claude"><div className="aiRole">claude</div><div className="aiText">thinking…</div></div>}
        </div>

        <div className="aiActions">
          <button
            className="paletteBtn"
            onClick={() =>
              ask(
                `Explain ${topic} to an IB Computer Science student using a single vivid everyday analogy. Keep it under 150 words, plain language, no jargon unless you define it, and no diagrams.`,
                `Explain ${topic} as an analogy`,
              )
            }
            disabled={busy}
          >
            Explain this page as an analogy
          </button>
          <button
            className="paletteBtn"
            onClick={() =>
              ask(
                `Give me one exam-style IB Computer Science question on ${topic}, then the mark scheme underneath it. Keep it short.`,
                `Quiz me on ${topic}`,
              )
            }
            disabled={busy}
          >
            Quiz me
          </button>
        </div>

        <form
          className="aiForm"
          onSubmit={(e) => {
            e.preventDefault();
            const q = input.trim();
            if (q) {
              ask(
                `A student studying ${topic} for IB Computer Science asks: ${q}\n\nAnswer in plain language with an analogy where it helps. Be accurate and concise.`,
                q,
              );
            }
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            aria-label="Ask a question"
            disabled={busy}
          />
          <button className="paletteBtn" type="submit" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
