"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { all, due, forget, reset, snapshot, serverSnapshot, subscribe } from "@/lib/deck";
import DeckSession from "./DeckSession";
import RichText from "./RichText";

const DAY = 86_400_000;

export default function DeckPage() {
  const store = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const cards = all();
  const ready = due();
  void store;

  if (cards.length === 0) {
    return (
      <div className="prose">
        <p>
          Your deck is empty. It fills itself as you read — every topic page carries its own
          cards, and they are added the first time you open the page.
        </p>
        <p>
          <Link href="/a/a1/what-a-computer-is/">Start at the beginning</Link>.
        </p>
      </div>
    );
  }

  // "New" is a card never answered; "learning" is one on a schedule shorter
  // than a week; anything longer has genuinely stuck.
  const fresh = cards.filter((c) => c.reps === 0).length;
  const learning = cards.filter((c) => c.reps > 0 && c.interval < 7).length;
  const known = cards.filter((c) => c.interval >= 7).length;
  const next = cards.filter((c) => c.due > Date.now()).sort((a, b) => a.due - b.due)[0];

  return (
    <>
      <div className="deckStats">
        {[
          { n: ready.length, label: "due now" },
          { n: fresh, label: "never seen" },
          { n: learning, label: "learning" },
          { n: known, label: "known" },
        ].map((s) => (
          <div className="deckStat" key={s.label}>
            <div className="deckStatN">{s.n}</div>
            <div className="deckStatL">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="answerBar" style={{ marginTop: "1.5rem" }}>
        <button className="paletteBtn" onClick={() => setOpen(true)}>
          {ready.length > 0 ? `Review ${ready.length} due` : "Review ahead of schedule"}
        </button>
        <button className="paletteBtn ghost" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Hide the list" : `Show all ${cards.length}`}
        </button>
        <button
          className="paletteBtn ghost"
          onClick={() => {
            if (confirm("Delete every card and its schedule? This cannot be undone.")) reset();
          }}
        >
          Empty the deck
        </button>
      </div>

      {ready.length === 0 && next && (
        <p className="markNote">
          Nothing is due. The next card comes back in{" "}
          {Math.max(1, Math.round((next.due - Date.now()) / DAY))} day
          {Math.round((next.due - Date.now()) / DAY) === 1 ? "" : "s"}.
        </p>
      )}

      {showAll && (
        <div className="deckList">
          {cards
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((c) => (
              <div className="deckRow" key={c.id}>
                <span className="mono deckRowCode">{c.code}</span>
                <span className="deckRowQ">
                  <RichText text={c.q} />
                </span>
                <span className="mono deckRowWhen">
                  {c.due <= Date.now()
                    ? "due"
                    : `${Math.max(1, Math.round((c.due - Date.now()) / DAY))}d`}
                </span>
                <button className="deckDrop" onClick={() => forget(c.id)} aria-label="Remove">
                  ×
                </button>
              </div>
            ))}
        </div>
      )}

      {open && <DeckSession onClose={() => setOpen(false)} />}
    </>
  );
}
