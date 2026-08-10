#!/usr/bin/env bash
# Builds the logic engine.
#
#   ./core/build.sh --test    native build + run the sanity checks (clang++)
#   ./core/build.sh           emscripten build -> lib/wasm/logicCore.js
#
# The wasm is embedded in the .js as base64 (-sSINGLE_FILE). That costs ~33% of
# an already tiny module and buys one large thing: no runtime file lookup, so
# the same artifact loads under webpack, under Node during the static export,
# and in the browser, with no asset-path juggling for GitHub Pages.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"
sources=("$here/logic.cpp" "$here/qm.cpp" "$here/expr.cpp" "$here/layout.cpp")

if [[ "${1:-}" == "--sprite" ]]; then
  out="$(mktemp -d)/sprite"
  clang++ -std=c++17 -O1 -I"$here" "$here/qm.cpp" "$here/sprite.cpp" -o "$out"
  mkdir -p "$root/lib/generated"
  "$out" > "$root/lib/generated/sprite.json"
  echo "wrote lib/generated/sprite.json"
  exit 0
fi

if [[ "${1:-}" == "--test" ]]; then
  out="$(mktemp -d)/coretest"
  clang++ -std=c++17 -O1 -Wall -Wextra -Wno-unused-parameter \
    -I"$here" "${sources[@]}" "$here/test.cpp" -o "$out"
  exec "$out"
fi

if ! command -v em++ >/dev/null 2>&1; then
  echo "em++ not found. Run inside: nix shell nixpkgs#emscripten" >&2
  exit 1
fi

mkdir -p "$root/lib/wasm"
em++ -std=c++17 -O3 -flto \
  -I"$here" "${sources[@]}" "$here/bindings.cpp" \
  --bind \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sSINGLE_FILE=1 \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=16MB \
  -sFILESYSTEM=0 \
  -sEXPORT_NAME=createLogicCore \
  -sDISABLE_EXCEPTION_CATCHING=1 \
  -o "$root/lib/wasm/logicCore.js"

echo "built lib/wasm/logicCore.js ($(wc -c <"$root/lib/wasm/logicCore.js") bytes)"
