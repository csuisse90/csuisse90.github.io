"use client";

import { useRef, useState } from "react";
import RichText from "./RichText";
import type { Question } from "@/lib/content";
import {
  hasWebGpu,
  localReady,
  markLocally,
  markWithApi,
  startLocal,
  type Marking,
} from "@/lib/marker";

type State =
  | { at: "writing" }
  | { at: "marking" }
  | { at: "marked"; marking: Marking }
  | { at: "stuck"; why?: string };

function Scheme({ q }: { q: Question }) {
  return (
    <div className="scheme">
      <div className="schemeHead">Mark scheme</div>
      <ol className="schemeList">
        {q.points.map((p, i) => (
          <li key={i}>
            <RichText text={p} />
          </li>
        ))}
      </ol>
      {q.answer && (
        <div className="schemeNote">
          <RichText text={q.answer} />
        </div>
      )}
    </div>
  );
}

function One({ q, n }: { q: Question; n: number }) {
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<State>({ at: "writing" });
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState("");
  const abort = useRef<AbortController | null>(null);

  async function mark() {
    if (!answer.trim()) return;
    setState({ at: "marking" });
    abort.current = new AbortController();

    const viaApi = await markWithApi(q, answer, abort.current.signal);
    if (!("error" in viaApi)) return setState({ at: "marked", marking: viaApi });

    if (localReady()) {
      const viaLocal = await markLocally(q, answer);
      if (viaLocal) return setState({ at: "marked", marking: viaLocal });
    }
    setState({ at: "stuck", why: viaApi.error });
  }

  async function markHere() {
    setState({ at: "marking" });
    setProgress("starting…");
    try {
      await startLocal((text, ratio) => setProgress(`${text} ${Math.round(ratio * 100)}%`));
    } catch {
      setProgress("");
      return setState({ at: "stuck" });
    }
    setProgress("");
    const viaLocal = await markLocally(q, answer);
    setState(viaLocal ? { at: "marked", marking: viaLocal } : { at: "stuck" });
  }

  const marked = state.at === "marked" ? state.marking : null;

  return (
    <div className="panel question">
      <div className="panelHead">
        <span>Question {n}</span>
        <span>
          [{q.marks} mark{q.marks === 1 ? "" : "s"}]
        </span>
      </div>
      <div className="panelBody">
        <div className="prose" style={{ maxWidth: "none" }}>
          <RichText text={q.q} />
        </div>

        <textarea
          className="answerBox"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer as you would in the exam…"
          rows={Math.min(10, 2 + q.marks)}
          disabled={state.at === "marking"}
        />

        <div className="answerBar">
          <button
            className="paletteBtn"
            onClick={mark}
            disabled={state.at === "marking" || !answer.trim()}
          >
            {state.at === "marking" ? "Marking…" : "Mark my answer"}
          </button>
          <button className="paletteBtn ghost" onClick={() => setRevealed(!revealed)}>
            {revealed ? "Hide the scheme" : "Give up, show the scheme"}
          </button>
          {marked && (
            <span className="score" data-full={marked.awarded === marked.outOf}>
              {marked.awarded} / {marked.outOf}
            </span>
          )}
        </div>

        {progress && <div className="markNote">Loading the offline marker — {progress}</div>}

        {state.at === "stuck" && (
          <div className="markNote">
            <p>
              The marker could not be reached.{" "}
              {state.why && <span className="markWhy">{state.why}</span>}{" "}
              {hasWebGpu() && !localReady() ? (
                <>
                  You can run a small marker in this browser instead. It downloads about a
                  gigabyte the first time and marks more roughly than the usual one — expect
                  it to miss a valid phrasing now and then.
                </>
              ) : (
                <>Your browser cannot run the offline marker, so here is the scheme instead.</>
              )}
            </p>
            {hasWebGpu() && !localReady() ? (
              <button className="paletteBtn" onClick={markHere}>
                Mark it here instead
              </button>
            ) : (
              <Scheme q={q} />
            )}
          </div>
        )}

        {marked && (
          <div className="marking">
            {marked.engine === "local" && (
              <div className="markNote">Marked in your browser — treat it as a rough guide.</div>
            )}
            <ol className="markList">
              {marked.points.map((p) => (
                <li key={p.point} data-awarded={p.awarded}>
                  <span className="markTick" aria-hidden>
                    {p.awarded ? "✓" : "✗"}
                  </span>
                  <span>
                    <RichText text={q.points[p.point]} />
                    <span className="markWhy">
                      <RichText text={p.why} />
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {marked.comment && (
              <div className="markComment">
                <RichText text={marked.comment} />
              </div>
            )}
          </div>
        )}

        {revealed && <Scheme q={q} />}
      </div>
    </div>
  );
}

/** The question set at the foot of a topic page. */
export default function PagePractice({
  items,
}: {
  code: string;
  title: string;
  items: Question[];
}) {
  const marks = items.reduce((n, q) => n + q.marks, 0);

  return (
    <section className="practice">
      <h2 className="display">Practice</h2>
      <p className="prose">
        {items.length} questions, {marks} marks. Write your answer, then have it marked point
        by point against the scheme — the useful part is which mark you missed, not the score.
      </p>
      {items.map((q, i) => (
        <One key={i} q={q} n={i + 1} />
      ))}
    </section>
  );
}
