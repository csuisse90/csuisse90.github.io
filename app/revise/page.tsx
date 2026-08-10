import type { Metadata } from "next";
import DeckPage from "@/components/DeckPage";

export const metadata: Metadata = {
  title: "Revision deck",
  description:
    "Every card you have collected by reading, scheduled so the ones you keep forgetting come back soonest.",
};

export default function Revise() {
  return (
    <>
      <header className="pageHead">
        <div className="kicker">Revision</div>
        <h1 className="display">Revision deck</h1>
        <p className="lede" style={{ marginTop: "1rem" }}>
          Cards are added as you read. Each one comes back just before you would have forgotten
          it, and the ones you keep getting wrong come back soonest.
        </p>
      </header>
      <DeckPage />
    </>
  );
}
