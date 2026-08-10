# eeshaan teaches cs

Digital logic for IB Computer Science HL (first assessment 2027, topic A1.2):
gates, truth tables, Boolean algebra, Karnaugh maps and logic diagrams, with an
interactive simulator you can slow down to watch signals propagate.

Live at **https://csuisse90.github.io**

## How it works

The simulation engine is written in C++ and compiled to WebAssembly. It owns
everything computational:

- **Netlist evaluation** with three-valued logic (`0`, `1`, unknown). Feedback
  loops are allowed, which is what makes an SR latch representable.
- **Unit-delay propagation tracing.** Every gate reads the previous state and
  writes the next, so one sweep is exactly one gate delay everywhere at once.
  The animations show a real wavefront, and genuine hazard glitches emerge
  without being scripted.
- **Quine–McCluskey minimisation** with essential-prime extraction.
- **Boolean expression parsing** covering the notations a student meets
  (`A.B`, `AB`, `A'`, `¬A`, `A⊕B`, `A NAND B`).
- **Layout and gate geometry.** Outlines are generated from the IEEE Std
  91-1984 distinctive shapes — the AND body is a true semicircle of radius
  *h*/2, the OR is three circular arcs — rather than drawn by hand.

React renders the result as real SVG, so diagrams stay selectable, accessible
and printable.

## Repository layout

    core/         C++ engine and its native test suite
    lib/wasm/     compiled WebAssembly (committed)
    lib/          catalogue, types, generated circuit data (committed)
    scripts/      build-time circuit generation
    components/   renderer, truth tables, K-map, builder, expression lab
    app/          Next.js App Router pages

## Building

Day to day, only the web build is needed — the WebAssembly module and the
generated circuit data are committed, so CI needs no C++ toolchain:

    bun install
    bun run dev          # or: bunx next build

### Changing the C++

    ./core/build.sh --test     # native build, runs the engine test suite
    ./core/build.sh            # emscripten build -> lib/wasm/logicCore.js
    bun run scripts/generate.ts   # regenerate lib/generated/circuits.json

The emscripten build needs `em++` on the PATH. Install the prebuilt SDK from
<https://github.com/emscripten-core/emscripten> — do not build it from source,
which takes hours.

Commit `lib/wasm/logicCore.js` and `lib/generated/circuits.json` alongside the
C++ change, or the deployed site will keep using the old engine.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs the
static export and publishes it with GitHub Pages.
