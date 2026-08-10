"use client";

import { useEffect, useMemo, useState } from "react";
import { all, due, grade, type Entry, type Grade } from "@/lib/deck";
import RichText from "./RichText";

const GRADES: { g: Grade; label: string; hint: string }[] = [
  { g: "again", label: "Again", hint: "in a minute" },
  { g: "hard", label: "Hard", hint: "sooner" },
  { g: "good", label: "Good", hint: "as scheduled" },
  { g: "easy", label: "Easy", hint: "much later" },
];

/** A review session over the cards that are due. Answer hidden until asked
 *  for: the recall attempt is the part that does the work, so the card must
 *  not give it away. */
export default function DeckSession({ onClose }: { onClose: () => void }) {
  // Snapshot the queue once. Grading writes to the store, and a live queue
  // would reshuffle under the reader's hands mid-session.
  const initial = useMemo(() => {
    const ready = due();
    return ready.length ? ready : all().sort((a, b) => a.due - b.due).slice(0, 20);
  }, []);

  const [queue, setQueue] = useState<Entry[]>(initial);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);

  const card = queue[0];

  function answer(g: Grade) {
    if (!card) return;
    grade(card.id, g);
    setShown(false);
    setDone((n) => n + 1);
    // "Again" sends the card to the back of this session rather than out of it.
    setQueue((q) => (g === "again" ? [...q.slice(1), q[0]] : q.slice(1)));
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") return onClose();
      if (!card) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!shown) return setShown(true);
        return answer("good");
      }
      if (shown && e.key >= "1" && e.key <= "4") answer(GRADES[Number(e.key) - 1].g);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="deckOverlay" role="dialog" aria-modal="true" aria-label="Revision">
      <div className="deckCard">
        <div className="deckHead">
          <span className="mono">
            {card ? `${queue.length} left · ${done} done` : `${done} done`}
          </span>
          <button className="aiClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {!card ? (
          <div className="deckDone">
            <p className="display">Nothing due.</p>
            <p className="prose">
              Come back tomorrow. Cards you have just learned are scheduled a day out; ones you
              have known for a while will not reappear for weeks.
            </p>
            <button className="paletteBtn" onClick={onClose}>
              Back to reading
            </button>
          </div>
        ) : (
          <>
            <div className="deckFrom mono">{card.code}</div>
            <div className="deckQ">
              <RichText text={card.q} />
            </div>

            {shown ? (
              <>
                <div className="deckA">
                  <RichText text={card.a} />
                </div>
                <div className="deckGrades">
                  {GRADES.map((g, i) => (
                    <button key={g.g} className="paletteBtn" onClick={() => answer(g.g)}>
                      <span>{g.label}</span>
                      <span className="deckHint">
                        {i + 1} · {g.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button className="paletteBtn deckShow" onClick={() => setShown(true)}>
                Show the answer
                <span className="deckHint">space</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
