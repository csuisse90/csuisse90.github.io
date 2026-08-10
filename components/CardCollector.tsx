"use client";

import { useEffect } from "react";
import { collect } from "@/lib/deck";
import type { Card } from "@/lib/content";

/** Adds this page's cards to the deck on first read. Renders nothing: the
 *  student should not have to opt in to remembering what they just read. */
export default function CardCollector({
  code,
  title,
  cards,
}: {
  code: string;
  title: string;
  cards: Card[];
}) {
  useEffect(() => {
    if (cards.length) collect(code, title, cards);
  }, [code, title, cards]);

  return null;
}
