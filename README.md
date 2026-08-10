# IB CS HL

A written course for IB Computer Science Higher Level, first assessment 2027.

Theme A is written out in full — A1 computer fundamentals, A2 networks,
A3 databases, A4 machine learning. Theme B (B1–B4) is an outline.

Live at **https://csuisse90.github.io**

## What is in it

- An interactive logic simulator you can slow down to watch signals propagate,
  one gate delay at a time.
- Eight labs: numbers, a CPU you step through, scheduling, sampling, circuit
  building, Boolean expressions, Karnaugh maps and SQL.
- Editable Python throughout, executed in the browser.
- Practice questions with worked mark schemes at the end of every topic page.
- An assistant that explains the current page as an analogy or sets you a
  question.

## Building

    bun install
    bun run dev          # or: bunx next build

The engine is committed as a compiled artifact, so CI needs no C++ toolchain.
If you change anything under `core/`:

    ./core/build.sh --test        # native build, runs the engine test suite
    ./core/build.sh --sprite      # regenerates lib/generated/sprite.json
    ./core/build.sh               # emscripten build -> lib/wasm/logicCore.js
    bun run scripts/generate.ts   # regenerates the circuit data
    bun run scripts/siteContext.ts

Commit the regenerated files alongside the change, or the deployed site keeps
using the old engine. The emscripten step needs `em++` on the PATH — install the
prebuilt SDK rather than building it from source.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static
export and publishes it.

**Pages must be set to build from the workflow, not from a branch.** If it is
set to a branch, GitHub also runs Jekyll over the repository root and the two
deployments race — with the README ending up as the homepage:

    gh api -X PUT repos/<owner>/<repo>/pages -f build_type=workflow

## The assistant

`lib/ai.ts` calls OpenRouter directly with an embedded key. The key is
obfuscated, not secret: anything in a static bundle can be read from the network
tab. It is restricted to free models so the exposure is quota abuse rather than
spend, and it is rotated by replacing the packed string.

`workers/openrouterProxy.js` is a Cloudflare Worker that fronts OpenRouter with
the key held as a secret, which keeps it off the client entirely. Deploy it and
rebuild with `NEXT_PUBLIC_AI_PROXY` set to its URL to use that route instead.

## Layout

    core/         engine and its native test suite
    lib/wasm/     compiled engine (committed)
    lib/generated/  circuit data, sprite geometry, site digest (committed)
    scripts/      build-time generation
    components/   renderer, labs, figures, assistant
    workers/      optional API proxy
    app/          pages
