// An assembler for the same subset the core executes. Intel syntax, two
// passes, real encodings — the bytes it emits are the bytes a real assembler
// emits, which is the only way the disassembly pane can be trusted.
#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>

namespace x86 {

struct AsmLine {
  /** Byte offset of this line's first instruction. */
  uint64_t address = 0;
  uint8_t length = 0;
  /** Index into the source text, so the UI can map a byte back to a line. */
  int sourceLine = -1;
  std::string text;
};

struct Assembled {
  std::vector<uint8_t> bytes;
  std::vector<AsmLine> lines;
  std::map<std::string, uint64_t> labels;
  /** Empty when it assembled. Otherwise "line 12: what went wrong". */
  std::string error;
};

/** Assembles Intel-syntax text. Labels end in a colon; `; ...` is a comment.
 *  Directives: .quad, .byte, .ascii, .align. */
Assembled assemble(const std::string& source, uint64_t origin = 0);

}  // namespace x86
