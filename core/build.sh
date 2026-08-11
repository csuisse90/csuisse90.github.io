#!/usr/bin/env bash
# Builds the two wasm modules.
#
#   ./core/build.sh --test    native build + run the sanity checks (clang++)
#   ./core/build.sh           emscripten build -> lib/wasm/{logicCore,machineCore}.js
#
# Two modules, not one. The logic core is what every page needs: gates,
# circuits, the shell and its filesystem. The machine core is the Python
# compiler, the assembler, the x86-64 processor and the gate-level ALU, which
# only /machine/ and the terminal's `cc` ask for. Keeping them apart means a
# reader on a circuit page never downloads a compiler.
#
# STACK_SIZE is set explicitly because emscripten's default dropped from 5 MB to
# 64 KB, which is a silent behaviour change for anything built with a newer
# toolchain: an overflow does not raise, it corrupts, and it corrupts
# differently in different engines.
#
# The wasm is embedded in the .js as base64 (-sSINGLE_FILE). That costs ~33% of
# an already tiny module and buys one large thing: no runtime file lookup, so
# the same artifact loads under webpack, under Node during the static export,
# and in the browser, with no asset-path juggling for GitHub Pages.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"

logicSources=("$here/logic.cpp" "$here/qm.cpp" "$here/expr.cpp" "$here/layout.cpp"
              "$here/shell.cpp" "$here/base64.cpp")
machineSources=("$here/logic.cpp" "$here/x86.cpp" "$here/x86exec.cpp" "$here/x86asm.cpp"
                "$here/pycomp.cpp" "$here/alu.cpp" "$here/base64.cpp")

if [[ "${1:-}" == "--sprite" ]]; then
  out="$(mktemp -d)/sprite"
  clang++ -std=c++17 -O1 -I"$here" "$here/qm.cpp" "$here/sprite.cpp" -o "$out"
  mkdir -p "$root/lib/generated"
  "$out" > "$root/lib/generated/sprite.json"
  echo "wrote lib/generated/sprite.json"
  exit 0
fi

if [[ "${1:-}" == "--test" ]]; then
  dir="$(mktemp -d)"
  clang++ -std=c++17 -O1 -Wall -Wextra -Wno-unused-parameter \
    -I"$here" "${logicSources[@]}" "$here/x86.cpp" "$here/x86exec.cpp" "$here/x86asm.cpp" \
    "$here/pycomp.cpp" "$here/alu.cpp" "$here/test.cpp" -o "$dir/coretest"
  clang++ -std=c++17 -O1 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers \
    -I"$here" "$here/x86.cpp" "$here/x86exec.cpp" "$here/x86asm.cpp" "$here/x86test.cpp" \
    -o "$dir/x86test"
  clang++ -std=c++17 -O1 -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers \
    -I"$here" "$here/x86.cpp" "$here/x86exec.cpp" "$here/x86asm.cpp" "$here/pycomp.cpp" \
    "$here/pytest.cpp" -o "$dir/pytest"
  # -O2 because this one is exhaustive: every 8-bit input pair through every
  # operation, which is 327,680 settlings of a 201-gate network.
  clang++ -std=c++17 -O2 -Wall -Wextra -Wno-unused-parameter \
    -I"$here" "$here/logic.cpp" "$here/alu.cpp" "$here/alutest.cpp" -o "$dir/alutest"
  "$dir/coretest" && "$dir/x86test" && "$dir/pytest" && "$dir/alutest"
  exit $?
fi

if ! command -v em++ >/dev/null 2>&1; then
  echo "em++ not found. Run inside: nix shell nixpkgs#emscripten" >&2
  exit 1
fi

mkdir -p "$root/lib/wasm"

build() {
  local name="$1" entry="$2" exportName="$3"
  shift 3
  em++ -std=c++17 -O3 -flto \
    -I"$here" "$@" "$entry" \
    --bind \
    -sMODULARIZE=1 \
    -sEXPORT_ES6=1 \
    -sSINGLE_FILE=1 \
    -sENVIRONMENT=web,worker \
    -sALLOW_MEMORY_GROWTH=1 \
    -sINITIAL_MEMORY=16MB \
    -sFILESYSTEM=0 \
    -sSTACK_SIZE=1MB \
    -sEXPORT_NAME="$exportName" \
    -sDISABLE_EXCEPTION_CATCHING=1 \
    -o "$root/lib/wasm/$name.js"

  # Engines that implement resizable ArrayBuffers expose a growable wasm
  # memory's buffer as one, and TextDecoder.decode refuses a view onto a
  # resizable buffer — by specification, in every engine. Emscripten's decoder
  # hands it exactly that, so every string crossing the boundary throws a
  # TypeError on Safari 26, Chrome 151 and Firefox 153, while older builds of
  # the same browsers are fine. Copying the bytes out first fixes it; the copy
  # is skipped where the buffer is not resizable, so nothing pays for it on
  # engines that never had the problem.
  python3 - "$root/lib/wasm/$name.js" <<'PATCH'
import sys

path = sys.argv[1]
glue = open(path).read()
before = "UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))"
after = (
    "UTF8Decoder.decode(heapOrArray.buffer.resizable?"
    "heapOrArray.slice(idx,endPtr):heapOrArray.subarray(idx,endPtr))"
)
if after in glue:
    print("  glue already patched for resizable buffers")
elif before in glue:
    open(path, "w").write(glue.replace(before, after, 1))
    print("  patched the glue for resizable ArrayBuffers")
else:
    sys.exit(
        "could not find emscripten's TextDecoder call to patch.\n"
        "The toolchain has changed shape. Check whether it now handles\n"
        "resizable buffers itself before removing this step."
    )
PATCH

  echo "built lib/wasm/$name.js ($(wc -c <"$root/lib/wasm/$name.js") bytes)"
}

build logicCore "$here/bindings.cpp" createLogicCore "${logicSources[@]}"
build machineCore "$here/machineBindings.cpp" createMachineCore "${machineSources[@]}"
