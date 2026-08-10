import type { Metadata } from "next";
import PythonEditor from "@/components/PythonEditor";

export const metadata: Metadata = {
  title: "Python editor",
  description:
    "A full Python environment with NumPy, Pandas, Matplotlib, SciPy, SymPy and scikit-learn, running in the browser.",
};

export default function Python() {
  return (
    <>
      <header className="pageHead">
        <div className="kicker">Tools</div>
        <h1 className="display">Python editor</h1>
        <p className="lede" style={{ marginTop: "1rem" }}>
          Real CPython with the scientific libraries. Write anything you like, run it, and see
          the output and any plots underneath. Your buffer is kept between visits.
        </p>
      </header>
      <PythonEditor />
    </>
  );
}
