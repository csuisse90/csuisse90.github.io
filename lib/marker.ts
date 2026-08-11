"use client";

// Marks a written answer against a mark scheme, point by point, the way an
// examiner does: each point is a tick or it is not, and the student is told
// which one they missed rather than being shown a model answer to compare
// against by eye.
//
// Two engines, in order:
//   1. The API model. Fast, and the better marker.
//   2. A small model running in this browser on WebGPU. Downloads about a
//      gigabyte once, then works with no network. It marks noticeably worse
//      than the API — it misses valid phrasings — so it is offered as a second
//      opinion, never silently substituted.
// If neither is available the caller falls back to showing the mark scheme.

import { askAi } from "./ai";
import type { Question } from "./content";

export type PointVerdict = {
  /** Index into the question's `points`. */
  point: number;
  awarded: boolean;
  /** One short sentence: what earned it, or what was missing. */
  why: string;
};

export type Marking = {
  awarded: number;
  outOf: number;
  points: PointVerdict[];
  /** A sentence of advice about the answer as a whole. */
  comment: string;
  engine: "api" | "local";
};

const SYSTEM = `You are an IB Computer Science examiner marking one short answer.

You are given a question, its mark scheme as a numbered list of credit points,
and a student's answer. Award each credit point independently: it is earned or
it is not. There are no half marks.

Be generous about wording and strict about meaning. A student who says the
right thing in their own words, or with a correct example instead of the
scheme's wording, earns the point. A student who uses the scheme's exact words
without the idea behind them — naming a thing where the point asks them to
explain it — does not. Never award a point for something the answer does not
actually say; do not infer what they probably meant.

Reply with JSON only, no prose around it, in exactly this shape:

{"points":[{"point":0,"awarded":true,"why":"..."}],"comment":"..."}

One entry per credit point, in order, using zero-based indices. "why" is one
short sentence addressed to the student: what earned the mark, or precisely
what was missing. "comment" is one sentence of advice about the answer as a
whole — its structure, or the habit that cost marks. Plain British English.
Wrap any maths in $...$ for KaTeX. Do not repeat the mark scheme back.`;

function prompt(q: Question, answer: string): string {
  const scheme = q.points.map((p, i) => `${i}. ${p}`).join("\n");
  return `QUESTION (${q.marks} mark${q.marks === 1 ? "" : "s"})
${q.q}

MARK SCHEME
${scheme}

STUDENT ANSWER
${answer}`;
}

/** Pulls the JSON object out of a reply that may be wrapped in a fence or
 *  padded with an apology. Returns null if there is nothing usable. */
function parse(text: string, q: Question, engine: "api" | "local"): Marking | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const obj = raw as { points?: unknown; comment?: unknown };
  if (!Array.isArray(obj.points)) return null;

  // Trust the model's judgement, not its bookkeeping: rebuild the list against
  // the real mark scheme so a missing or duplicated entry cannot invent marks.
  const points: PointVerdict[] = q.points.map((_, i) => {
    const found = (obj.points as PointVerdict[]).find((p) => Number(p?.point) === i);
    return {
      point: i,
      awarded: Boolean(found?.awarded),
      why: typeof found?.why === "string" ? found.why : "Not addressed.",
    };
  });

  return {
    awarded: points.filter((p) => p.awarded).length,
    outOf: q.marks,
    points,
    comment: typeof obj.comment === "string" ? obj.comment : "",
    engine,
  };
}

export async function markWithApi(
  q: Question,
  answer: string,
  signal?: AbortSignal,
): Promise<Marking | { error: string }> {
  const result = await askAi(prompt(q, answer), {
    signal,
    system: SYSTEM,
    web: false,
    temperature: 0.1,
    maxTokens: 800,
  });
  if ("error" in result) return { error: result.error };

  const marking = parse(result.text, q, "api");
  // A model that answers with prose instead of JSON is a different failure
  // from one that never answers, and the reader should be told which.
  return marking ?? { error: "The reply could not be read as a marking." };
}

// ---------------------------------------------------------------------------
// The in-browser engine.

export const LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

type Engine = { chat: { completions: { create: (o: unknown) => Promise<unknown> } } };

let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;

export function hasWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function localReady(): boolean {
  return engine !== null;
}

/** Downloads and starts the local model. The download is cached by the
 *  browser, so this is slow once and fast afterwards. */
export async function startLocal(onProgress?: (text: string, ratio: number) => void) {
  if (engine) return engine;
  if (loading) return loading;

  loading = (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    const created = (await webllm.CreateMLCEngine(LOCAL_MODEL, {
      initProgressCallback: (r: { text: string; progress: number }) =>
        onProgress?.(r.text, r.progress),
    })) as unknown as Engine;
    engine = created;
    return created;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export async function markLocally(q: Question, answer: string): Promise<Marking | null> {
  if (!engine) return null;
  const reply = (await engine.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt(q, answer) },
    ],
    temperature: 0.1,
    max_tokens: 800,
  })) as { choices?: { message?: { content?: string } }[] };

  const text = reply?.choices?.[0]?.message?.content ?? "";
  return parse(text, q, "local");
}
