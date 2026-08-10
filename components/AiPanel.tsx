"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  askAi,
  DEFAULT_MODEL,
  FREE_MODELS,
  KEY_STORAGE,
  MODEL_STORAGE,
  PROXY_URL,
  storedKey,
  storedModel,
} from "@/lib/ai";
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
  const [key, setKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [showSettings, setShowSettings] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setKey(storedKey());
    setModel(storedModel());
  }, []);

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

  const ready = Boolean(PROXY_URL) || Boolean(key);

  async function ask(prompt: string, display: string) {
    if (busy) return;
    if (!ready) {
      setShowSettings(true);
      return;
    }
    setTurns((t) => [...t, { role: "you", text: display }, { role: "claude", text: "" }]);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();

    const result = await askAi(prompt, {
      key,
      model,
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
      const shown = "text" in result ? result.text : result.error;
      // Replace the streamed text with the final version, or with the error if
      // nothing arrived.
      if (!next[next.length - 1].text || "error" in result) {
        next[next.length - 1] = { role: "claude", text: shown };
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
          <button
            className="aiClose"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Settings"
            style={{ fontSize: "0.7rem", letterSpacing: "0.14em" }}
          >
            {showSettings ? "back" : "setup"}
          </button>
          <button className="aiClose" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>

        {showSettings ? (
          <div className="aiBody">
            <div className="aiHint">
              {PROXY_URL ? (
                <p>Answers are routed through a proxy, so no key is needed here.</p>
              ) : (
                <>
                  <p>
                    Paste an OpenRouter key. It is kept in this browser only and
                    sent straight to OpenRouter — it is never part of the site.
                  </p>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value);
                      window.localStorage.setItem(KEY_STORAGE, e.target.value.trim());
                    }}
                    placeholder="sk-or-v1-…"
                    aria-label="OpenRouter API key"
                    style={{
                      width: "100%",
                      marginTop: "0.5rem",
                      border: "1px solid var(--hairline)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.75rem",
                      padding: "0.45rem 0.5rem",
                    }}
                  />
                  <p style={{ marginTop: "0.6rem" }}>
                    Get one free at{" "}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
                      openrouter.ai/keys
                    </a>
                    .
                  </p>
                </>
              )}

              <p style={{ marginTop: "0.9rem" }}>Model</p>
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  window.localStorage.setItem(MODEL_STORAGE, e.target.value);
                }}
                aria-label="Model"
                style={{
                  width: "100%",
                  border: "1px solid var(--hairline)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.75rem",
                  padding: "0.4rem",
                }}
              >
                {FREE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p style={{ marginTop: "0.5rem", color: "var(--ink-faint)" }}>
                All free tier. They are rate limited, so a busy one may refuse.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="aiBody" ref={scroller}>
              {turns.length === 0 && !ready && (
                <div className="aiHint">
                  <p className="aiWarn">No key set. Open “setup” above.</p>
                </div>
              )}
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
          </>
        )}
      </aside>
    </>
  );
}
