"use client";

import dynamic from "next/dynamic";

// The simulation engine is a large wasm module. Loading it statically would
// put it in the bundle of every topic page, including the many that contain no
// circuit at all, so both entry points fetch it only when rendered.
//
// These live in a client component because `ssr: false` is not available to a
// server one, and the MDX component map is server-side.
const loading = () => <p className="annotation">Loading the engine…</p>;

export const LazyFaultFinder = dynamic(() => import("./FaultFinder"), { ssr: false, loading });
export const LazyKMap = dynamic(() => import("./KMap"), { ssr: false, loading });

/** The marked diagram questions carry the whole editor and the marker with
 *  them, and only /diagrams/ needs either. */
export const LazyDiagramExam = dynamic(() => import("./DiagramExam"), { ssr: false, loading });

/** The whole vertical machine — compiler, assembler, processor and gates. It
 *  is the largest thing on the site, so nothing else waits for it. */
export const LazyMachine = dynamic(() => import("./Machine"), {
  ssr: false,
  loading: () => <p className="annotation">Starting the machine…</p>,
});
