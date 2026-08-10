"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { askAi } from "@/lib/ai";
import RichText from "./RichText";

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
  "/timing/": "propagation delay and hazards",
  "/circuits/": "adders, multiplexers and latches",
};

export default function AiPanel() {
  const pathname = usePathname();
  const here = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const topic = TOPIC_FROM_PATH[here] ?? "IB computer science";

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, busy]);

  // Make room for the panel rather than laying it over the reading column.
  useEffect(() => {
    document.documentElement.dataset.aiOpen = open ? "true" : "false";
    return () => {
      delete document.documentElement.dataset.aiOpen;
    };
  }, [open]);

  async function ask(prompt: string, display: string) {
    if (busy) return;
    setTurns((t) => [...t, { role: "you", text: display }, { role: "claude", text: "" }]);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();

    const result = await askAi(prompt, {
      signal: abort.current.signal,
      onToken: (chunk) =>
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = {
            role: "claude",
            text: next[next.length - 1].text + chunk,
          };
          return next;
        }),
    });

    setTurns((t) => {
      const next = [...t];
      if (!next[next.length - 1].text || "error" in result) {
        next[next.length - 1] = {
          role: "claude",
          text: "text" in result ? result.text : result.error,
        };
      }
      return next;
    });
    setBusy(false);
  }

  return (
    <>
      {!open && (
        <button
          className="aiToggle"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="aiPanel"
        >
          Ask
        </button>
      )}

      <aside id="aiPanel" className="aiPanel" data-open={open} aria-hidden={!open}>
        <div className="aiHead">
          <span />
          <button className="aiClose" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>

        <div className="aiBody" ref={scroller}>
          {turns.map((t, i) => (
            <div key={i} className="aiTurn" data-role={t.role}>
              <div className="aiRole">{t.role === "you" ? "you" : ""}</div>
              <div className="aiText">
                {t.role === "claude" ? <RichText text={t.text} /> : t.text}
              </div>
            </div>
          ))}
          {busy && turns[turns.length - 1]?.text === "" && (
            <div className="aiTurn" data-role="claude">
              <div className="aiRole" />
              <div className="aiText">thinking…</div>
            </div>
          )}
        </div>

        <div className="aiActions">
          <button
            className="paletteBtn"
            onClick={() =>
              ask(
                `Explain ${topic} using a single vivid everyday analogy. Under 150 words.`,
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
                `Give me one exam-style IB Computer Science question on ${topic}, then its mark scheme. Keep it short.`,
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
            if (q) ask(`A student studying ${topic} asks: ${q}`, q);
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
