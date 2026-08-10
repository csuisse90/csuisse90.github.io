"use client";

// One CPython, shared by everything on the page that runs Python. It is a
// large download, so it is fetched from a CDN on first use and then reused:
// the snippet runner, the stepper and the editor all wait on the same promise.

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export type Pyodide = {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<void>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  globals: { get: (name: string) => unknown; set: (name: string, value: unknown) => void };
  FS: unknown;
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>;
  }
}

let promise: Promise<Pyodide> | null = null;

export function loadPython(): Promise<Pyodide> {
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_URL}pyodide.js`;
    script.onload = async () => {
      if (!window.loadPyodide) return reject(new Error("Pyodide failed to load"));
      try {
        resolve(await window.loadPyodide({ indexURL: PYODIDE_URL }));
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("Could not reach the Python CDN"));
    document.head.appendChild(script);
  });
  return promise;
}

export function isLoaded(): boolean {
  return promise !== null;
}

/** Libraries offered in the editor. Each is a prebuilt wheel fetched on
 *  demand, so nothing is downloaded until it is imported. */
export const LIBRARIES = [
  { name: "numpy", about: "arrays and numerical work" },
  { name: "pandas", about: "data frames, CSV, grouping" },
  { name: "matplotlib", about: "plots" },
  { name: "scipy", about: "statistics, optimisation, signals" },
  { name: "sympy", about: "symbolic algebra" },
  { name: "scikit-learn", about: "machine learning" },
  { name: "networkx", about: "graphs" },
  { name: "sqlite3", about: "SQL in memory" },
] as const;

/** Renders any matplotlib figures the code left open, as data URLs, and
 *  clears them so the next run starts clean. Returns [] if matplotlib was
 *  never imported. */
export const CAPTURE_PLOTS = `
def _capture_plots():
    import sys
    if "matplotlib" not in sys.modules:
        return []
    import base64, io
    import matplotlib.pyplot as plt
    out = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", dpi=110, bbox_inches="tight")
        out.append("data:image/png;base64," + base64.b64encode(buf.getvalue()).decode())
    plt.close("all")
    return out
_capture_plots()
`;

/** One recorded moment during a traced run. */
export type Step = {
  /** 1-based line about to execute. */
  line: number;
  /** Local variables at that moment, already turned into short strings. */
  vars: Record<string, string>;
  /** How much had been printed by then. */
  out: number;
  /** Call depth, so recursion is visible. */
  depth: number;
};

export type Trace = {
  steps: Step[];
  output: string;
  error: string | null;
  /** True when the run hit the step cap and was cut short. */
  truncated: boolean;
};

/** Runs the user's code under sys.settrace and records the state before every
 *  line. This is how the stepper and the trace tables both work: rather than
 *  simulating Python, it runs the real thing and watches.
 *
 *  Reads the source from the global `_src`, so nothing has to be escaped. */
export const TRACE_HARNESS = `
def _run_traced(_src, _limit=4000):
    import sys, io, json
    steps, buf = [], io.StringIO()
    stopped = [False]

    def shorten(v):
        try:
            r = repr(v)
        except Exception:
            return "<unrepresentable>"
        return r if len(r) <= 140 else r[:137] + "..."

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<user>":
            return None
        if event == "line":
            if len(steps) >= _limit:
                stopped[0] = True
                sys.settrace(None)
                raise KeyboardInterrupt
            depth, f = 0, frame
            while f.f_back is not None and f.f_back.f_code.co_filename == "<user>":
                depth += 1
                f = f.f_back
            steps.append({
                "line": frame.f_lineno,
                "vars": {k: shorten(v) for k, v in frame.f_locals.items()
                         if not k.startswith("__")},
                "out": buf.tell(),
                "depth": depth,
            })
        return tracer

    real_stdout, error = sys.stdout, None
    sys.stdout = buf
    try:
        code = compile(_src, "<user>", "exec")
        sys.settrace(tracer)
        exec(code, {"__name__": "__main__"})
    except KeyboardInterrupt:
        pass
    except BaseException as e:
        error = f"{type(e).__name__}: {e}"
    finally:
        sys.settrace(None)
        sys.stdout = real_stdout

    return json.dumps({
        "steps": steps,
        "output": buf.getvalue(),
        "error": error,
        "truncated": stopped[0],
    })

_run_traced(_src)
`;

/** matplotlib has no screen to draw on, so it must be told to render to a
 *  buffer before it is first imported. */
export const HEADLESS_PLOTS = `
import os
os.environ.setdefault("MPLBACKEND", "AGG")
`;
