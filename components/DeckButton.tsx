"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { due, snapshot, serverSnapshot, subscribe } from "@/lib/deck";
import DeckSession from "./DeckSession";

/** Floating button showing how many cards are due. Hidden entirely when the
 *  deck is empty, so a first-time reader never sees a control for a feature
 *  they have not started using. */
export default function DeckButton() {
  const store = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [open, setOpen] = useState(false);

  // The due count depends on the clock, not just the store, so it is
  // recomputed on a timer as well as on every write.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const count = due().length;
  void store;
  void tick;

  if (Object.keys(store).length === 0) return null;

  return (
    <>
      <button
        className="deckButton"
        onClick={() => setOpen(true)}
        data-due={count > 0}
        aria-label={count > 0 ? `Revise ${count} due cards` : "Revision deck"}
      >
        <span className="deckCount">{count}</span>
        <span className="deckWord">{count === 1 ? "card" : "cards"}</span>
      </button>
      {open && <DeckSession onClose={() => setOpen(false)} />}
    </>
  );
}
