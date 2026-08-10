"use client";

// The site is static, so there is no server of its own to hold a secret.
// Two supported ways to reach a model, in priority order:
//
//   1. A proxy you deploy (see workers/openrouterProxy.js). The key lives as a
//      secret on the proxy and never reaches the browser, so the assistant
//      works for everyone who visits.
//   2. A key the reader pastes in, kept in their own browser's localStorage
//      and sent straight to OpenRouter. Nothing is published, but it only
//      works for that one person.
//
// A key must never be baked into the build: this site's source and its output
// are both public.

export const PROXY_URL = process.env.NEXT_PUBLIC_AI_PROXY ?? "";
export const KEY_STORAGE = "openrouterKey";
export const MODEL_STORAGE = "openrouterModel";

export const DEFAULT_MODEL = "google/gemma-4-31b-it:free";

/** Free models on OpenRouter that suit short explanatory answers. */
export const FREE_MODELS = [
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B" },
  { id: "inclusionai/ling-3.0-tiny:free", label: "Ling 3.0 Tiny" },
];

export function storedKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_STORAGE) ?? "";
}

export function storedModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return window.localStorage.getItem(MODEL_STORAGE) ?? DEFAULT_MODEL;
}

export type AskResult = { text: string } | { error: string };

import siteContext from "./generated/siteContext.json";

const SCOPE = `You are the study assistant built into IB CS HL, a revision site for
IB Computer Science Higher Level (first assessment 2027).

STRICT SCOPE. You answer questions about computer science and this course only:
computer architecture, data representation, Boolean logic and gates, operating
systems, translators, networks, databases, machine learning, computational
thinking, programming, object-oriented programming, abstract data types,
algorithms, and IB exam technique for this subject.

If asked about anything outside that — other subjects, personal advice, current
events, entertainment, politics, medical or legal questions, or anything
unrelated to computing — decline in one short sentence and offer a computer
science topic instead. Do not be preachy about it; one line is enough. Never
answer the off-topic question anyway, even partially.

HOW TO ANSWER. Plain British English. Short paragraphs, no markdown headings and
no long bullet lists. Reach for a concrete everyday analogy whenever it makes an
idea land, because that is how this site teaches. Be precise about technical
detail: a wrong definition is worse than a vague one.

HONESTY. This course changed for 2027 and some sub-topic codes are uncertain. If
you are not sure whether something is on the syllabus, say so plainly rather than
guessing. Never invent syllabus codes, mark allocations or exam rules.

DO NOT write code unless asked. When you do, use Python — never Java.`;

const SITE_MAP = `Pages on this site, so you can point the reader at the right one:

${(siteContext as { digest: string }).digest}`;

const SYSTEM = `${SCOPE}\n\n${SITE_MAP}`;

export async function askAi(
  prompt: string,
  opts: {
    key?: string;
    model?: string;
    signal?: AbortSignal;
    /** Called with each chunk of text as it arrives. */
    onToken?: (chunk: string) => void;
  } = {},
): Promise<AskResult> {
  const model = opts.model || DEFAULT_MODEL;
  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
    max_tokens: 700,
    temperature: 0.6,
    stream: Boolean(opts.onToken),
  };

  const usingProxy = Boolean(PROXY_URL);
  const url = usingProxy ? PROXY_URL : "https://openrouter.ai/api/v1/chat/completions";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!usingProxy) {
    const key = opts.key || storedKey();
    if (!key) return { error: "no-key" };
    headers.Authorization = `Bearer ${key}`;
    // OpenRouter asks browser callers to identify themselves.
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "IB CS HL";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 401) return { error: "That key was rejected." };
      if (res.status === 429) return { error: "Rate limited — the free tier needs a moment." };
      return { error: `Request failed (${res.status}). ${detail.slice(0, 200)}` };
    }

    if (!opts.onToken || !res.body) {
      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (!text) return { error: data?.error?.message ?? "The model returned nothing." };
      return { text: text.trim() };
    }

    // Server-sent events: one JSON object per "data:" line, terminated by
    // [DONE]. Partial lines are held back until the newline arrives.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let full = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const piece: string = chunk?.choices?.[0]?.delta?.content ?? "";
          if (piece) {
            full += piece;
            opts.onToken(piece);
          }
        } catch {
          // A partial object simply means more is on the way.
        }
      }
    }

    if (!full.trim()) return { error: "The model returned nothing." };
    return { text: full.trim() };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { error: "Cancelled." };
    return { error: "Could not reach the model." };
  }
}
