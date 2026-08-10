import type { Metadata } from "next";
import Terminal from "@/components/Terminal";

export const metadata: Metadata = {
  title: "Terminal",
  description:
    "A shell in the browser — a real filesystem, thirty commands, Python with the scientific libraries, and an editor with vim keys.",
};

export default function Python() {
  return (
    <>
      <header className="pageHead">
        <div className="kicker">Tools</div>
        <h1 className="display">Terminal</h1>
        <p className="lede" style={{ marginTop: "1rem" }}>
          A shell with a real filesystem, thirty commands, Python with the scientific libraries,
          and an editor with vim keys. Everything runs in this tab and is kept between visits.
        </p>
      </header>
      <Terminal />
    </>
  );
}
