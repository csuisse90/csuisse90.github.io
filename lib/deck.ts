"use client";

// The revision deck. Cards are declared in each page's frontmatter and added
// to the deck the first time that page is read; scheduling lives in this
// browser and nowhere else, so there is nothing to sign into and nothing to
// lose if the site is offline.

import type { Card } from "./content";

export type Entry = {
  id: string;
  code: string;
  page: string;
  q: string;
  a: string;
  /** When this card next comes up, as a timestamp. */
  due: number;
  /** Days until the next sight of it after a good answer. */
  interval: number;
  /** SM-2 ease factor; falls when you keep getting it wrong. */
  ease: number;
  reps: number;
  lapses: number;
};

export type Grade = "again" | "hard" | "good" | "easy";

const KEY = "deck.v1";
const DAY = 86_400_000;

type Store = Record<string, Entry>;

const listeners = new Set<() => void>();
let cache: Store | null = null;

function read(): Store {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Store) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or refused store must not take the grading button down with it.
    // The deck still works for this session; it just will not survive a reload.
  }
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Snapshot for useSyncExternalStore. Returns the same object until a write,
 *  which is what keeps React from looping. */
export function snapshot(): Store {
  return read();
}

export function serverSnapshot(): Store {
  return {};
}

/** Adds a page's cards if they are not already known. Existing cards keep
 *  their schedule, so re-reading a page never resets your progress; the text
 *  is refreshed in case the page has been rewritten. */
export function collect(code: string, page: string, cards: Card[]) {
  const now = read();
  let changed = false;
  const next = { ...now };

  cards.forEach((card, i) => {
    const id = `${code}#${i}`;
    const existing = now[id];
    if (existing) {
      if (existing.q !== card.q || existing.a !== card.a) {
        next[id] = { ...existing, q: card.q, a: card.a };
        changed = true;
      }
      return;
    }
    next[id] = {
      id,
      code,
      page,
      q: card.q,
      a: card.a,
      due: Date.now(),
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
    };
    changed = true;
  });

  if (changed) write(next);
}

export function due(at = Date.now()): Entry[] {
  return Object.values(read())
    .filter((e) => e.due <= at)
    .sort((a, b) => a.due - b.due);
}

export function all(): Entry[] {
  return Object.values(read());
}

/** SM-2, trimmed. "again" puts the card back in this session rather than
 *  scheduling it a day out, because a card you have just failed is exactly the
 *  one worth seeing again in five minutes. */
export function grade(id: string, g: Grade) {
  const now = read();
  const card = now[id];
  if (!card) return;

  let { interval, ease, reps, lapses } = card;

  if (g === "again") {
    lapses += 1;
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    write({ ...now, [id]: { ...card, interval, ease, reps, lapses, due: Date.now() + 60_000 } });
    return;
  }

  const bump = g === "hard" ? 1.2 : g === "good" ? ease : ease * 1.3;
  if (g === "hard") ease = Math.max(1.3, ease - 0.15);
  if (g === "easy") ease = Math.min(3.2, ease + 0.15);

  interval = reps === 0 ? (g === "easy" ? 3 : 1) : Math.max(1, Math.round(interval * bump));
  reps += 1;

  write({ ...now, [id]: { ...card, interval, ease, reps, lapses, due: Date.now() + interval * DAY } });
}

export function forget(id: string) {
  const now = read();
  if (!now[id]) return;
  const next = { ...now };
  delete next[id];
  write(next);
}

export function reset() {
  write({});
}
