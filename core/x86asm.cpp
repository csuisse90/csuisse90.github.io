#include "x86asm.hpp"

#include <algorithm>
#include <cctype>
#include <cstdlib>

#include "x86.hpp"

namespace x86 {

namespace {

struct Parsed {
  enum Kind { Register, Immediate, Memory, Label } kind = Register;
  Reg reg = RAX;
  uint8_t width = 8;
  int64_t value = 0;
  Reg base = REG_COUNT;
  Reg index = REG_COUNT;
  uint8_t scale = 1;
  int64_t displacement = 0;
  std::string label;
};

std::string lower(std::string s) {
  for (char& c : s) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  return s;
}

std::string trim(const std::string& s) {
  size_t a = 0;
  size_t b = s.size();
  while (a < b && std::isspace(static_cast<unsigned char>(s[a]))) a++;
  while (b > a && std::isspace(static_cast<unsigned char>(s[b - 1]))) b--;
  return s.substr(a, b - a);
}

std::vector<std::string> splitTop(const std::string& s, char sep) {
  std::vector<std::string> out;
  std::string current;
  int depth = 0;
  for (char c : s) {
    if (c == '[') depth++;
    if (c == ']') depth--;
    if (c == sep && depth == 0) {
      out.push_back(trim(current));
      current.clear();
    } else {
      current += c;
    }
  }
  if (!trim(current).empty()) out.push_back(trim(current));
  return out;
}

bool registerNamed(const std::string& name, Reg& reg, uint8_t& width) {
  static const char* const* TABLES[] = {nullptr};
  (void)TABLES;
  for (uint8_t r = 0; r < REG_COUNT; r++) {
    for (uint8_t w : {8, 4, 2, 1}) {
      if (name == regName(static_cast<Reg>(r), w)) {
        reg = static_cast<Reg>(r);
        width = w;
        return true;
      }
    }
  }
  return false;
}

bool number(const std::string& text, int64_t& out) {
  if (text.empty()) return false;
  const char* start = text.c_str();
  char* end = nullptr;
  const long long v = std::strtoll(start, &end, 0);
  if (end == start || *end != '\0') return false;
  out = v;
  return true;
}

/** Parses one operand. Memory is written the way a disassembler prints it:
 *  optionally "qword ptr", then a bracketed base + index*scale + displacement. */
bool parseOperand(std::string text, Parsed& out, std::string& error) {
  text = trim(text);
  if (text.empty()) return false;

  // A size prefix only tells us the width; the brackets carry the address.
  for (const auto& [word, width] : std::vector<std::pair<std::string, uint8_t>>{
           {"qword ptr", 8}, {"dword ptr", 4}, {"word ptr", 2}, {"byte ptr", 1},
           {"qword", 8},     {"dword", 4},     {"word", 2},     {"byte", 1}}) {
    if (lower(text).rfind(word, 0) == 0) {
      out.width = width;
      text = trim(text.substr(word.size()));
      break;
    }
  }

  if (text.front() == '[') {
    if (text.back() != ']') {
      error = "unclosed [";
      return false;
    }
    out.kind = Parsed::Memory;
    const std::string inner = trim(text.substr(1, text.size() - 2));

    // Split on + and -, keeping the sign with the term.
    std::vector<std::pair<int, std::string>> terms;
    std::string current;
    int sign = 1;
    for (size_t i = 0; i < inner.size(); i++) {
      const char c = inner[i];
      if (c == '+' || c == '-') {
        if (!trim(current).empty()) terms.push_back({sign, trim(current)});
        current.clear();
        sign = c == '-' ? -1 : 1;
      } else {
        current += c;
      }
    }
    if (!trim(current).empty()) terms.push_back({sign, trim(current)});

    for (const auto& [termSign, term] : terms) {
      const size_t star = term.find('*');
      Reg reg = RAX;
      uint8_t width = 8;
      int64_t value = 0;
      if (star != std::string::npos) {
        const std::string name = trim(term.substr(0, star));
        int64_t scale = 0;
        if (!registerNamed(lower(name), reg, width) || !number(trim(term.substr(star + 1)), scale)) {
          error = "cannot read the index term '" + term + "'";
          return false;
        }
        out.index = reg;
        out.scale = static_cast<uint8_t>(scale);
      } else if (registerNamed(lower(term), reg, width)) {
        if (out.base == REG_COUNT) out.base = reg;
        else out.index = reg;
      } else if (number(term, value)) {
        out.displacement += termSign * value;
      } else {
        // A bare name inside brackets is a label: an absolute address, which
        // pass two fills in.
        if (!out.label.empty()) {
          error = "only one label may appear inside the brackets";
          return false;
        }
        out.label = term;
        out.value = termSign;
      }
    }
    return true;
  }

  Reg reg = RAX;
  uint8_t width = 8;
  if (registerNamed(lower(text), reg, width)) {
    out.kind = Parsed::Register;
    out.reg = reg;
    out.width = width;
    return true;
  }

  int64_t value = 0;
  if (number(text, value)) {
    out.kind = Parsed::Immediate;
    out.value = value;
    return true;
  }

  out.kind = Parsed::Label;
  out.label = text;
  return true;
}

struct Emitter {
  std::vector<uint8_t>& out;

  void byte(uint8_t b) { out.push_back(b); }
  void dword(int64_t v) {
    for (int i = 0; i < 4; i++) byte(static_cast<uint8_t>(v >> (8 * i)));
  }
  void qword(int64_t v) {
    for (int i = 0; i < 8; i++) byte(static_cast<uint8_t>(v >> (8 * i)));
  }

  void rex(bool w, uint8_t reg, uint8_t rm, uint8_t index = 0) {
    const uint8_t value = 0x40 | (w ? 8 : 0) | ((reg & 8) ? 4 : 0) | ((index & 8) ? 2 : 0) |
                          ((rm & 8) ? 1 : 0);
    if (value != 0x40) byte(value);
  }

  /** ModRM plus whatever SIB and displacement the addressing mode needs. */
  void modrm(uint8_t reg, const Parsed& rm) {
    if (rm.kind == Parsed::Register) {
      byte(static_cast<uint8_t>(0xc0 | ((reg & 7) << 3) | (rm.reg & 7)));
      return;
    }

    // No base at all means an absolute address, which x86 can only encode
    // through a SIB byte with base 5 and index 4. Without this, [0x7f00]
    // silently assembles as [rax].
    if (rm.base == REG_COUNT && rm.index == REG_COUNT) {
      byte(static_cast<uint8_t>(((reg & 7) << 3) | 4));
      byte(0x25);
      dword(rm.displacement);
      return;
    }

    const bool needsSib = rm.index != REG_COUNT || rm.base == RSP || rm.base == R12;
    const bool needsDisp8 = rm.displacement >= -128 && rm.displacement <= 127 &&
                            rm.displacement != 0;
    const bool needsDisp32 = rm.displacement != 0 && !needsDisp8;
    // RBP and R13 cannot use mod 0 — that encoding means "no base".
    const bool forceDisp = rm.base == RBP || rm.base == R13;

    uint8_t mod = 0;
    if (needsDisp32) mod = 2;
    else if (needsDisp8 || forceDisp) mod = 1;

    if (needsSib) {
      byte(static_cast<uint8_t>((mod << 6) | ((reg & 7) << 3) | 4));
      uint8_t scaleBits = rm.scale == 8 ? 3 : rm.scale == 4 ? 2 : rm.scale == 2 ? 1 : 0;
      const uint8_t indexField = rm.index == REG_COUNT ? 4 : (rm.index & 7);
      byte(static_cast<uint8_t>((scaleBits << 6) | (indexField << 3) | (rm.base & 7)));
    } else {
      byte(static_cast<uint8_t>((mod << 6) | ((reg & 7) << 3) | (rm.base & 7)));
    }

    if (mod == 1) byte(static_cast<uint8_t>(rm.displacement));
    else if (mod == 2) dword(rm.displacement);
  }
};

bool fitsIn8(int64_t v) { return v >= -128 && v <= 127; }

const std::map<std::string, uint8_t> ARITH = {
    {"add", 0}, {"or", 1}, {"and", 4}, {"sub", 5}, {"xor", 6}, {"cmp", 7}};
const std::map<std::string, uint8_t> ARITH_OPCODE = {
    {"add", 0x01}, {"or", 0x09}, {"and", 0x21}, {"sub", 0x29}, {"xor", 0x31}, {"cmp", 0x39}};
const std::map<std::string, uint8_t> SHIFT = {{"shl", 4}, {"shr", 5}, {"sar", 7}};
const std::vector<std::string> CONDS = {"o", "no", "b", "ae", "e", "ne", "be", "a",
                                        "s", "ns", "p", "np", "l", "ge", "le", "g"};

int conditionCode(const std::string& suffix) {
  for (size_t i = 0; i < CONDS.size(); i++) {
    if (CONDS[i] == suffix) return static_cast<int>(i);
  }
  // The aliases a person actually types.
  if (suffix == "z") return 4;
  if (suffix == "nz") return 5;
  if (suffix == "c") return 2;
  if (suffix == "nc") return 3;
  if (suffix == "nge") return 12;
  if (suffix == "nl") return 13;
  return -1;
}

}  // namespace

Assembled assemble(const std::string& source, uint64_t origin) {
  Assembled result;

  struct Statement {
    std::string mnemonic;
    std::vector<std::string> operands;
    int sourceLine = 0;
    std::string raw;
  };
  std::vector<Statement> statements;

  // Pass one: strip comments, record labels against the statement that follows.
  std::vector<std::string> rawLines;
  {
    std::string current;
    for (char c : source) {
      if (c == '\n') {
        rawLines.push_back(current);
        current.clear();
      } else {
        current += c;
      }
    }
    rawLines.push_back(current);
  }

  std::map<std::string, size_t> labelAtStatement;
  for (size_t i = 0; i < rawLines.size(); i++) {
    std::string line = rawLines[i];
    const size_t comment = line.find(';');
    if (comment != std::string::npos) line = line.substr(0, comment);
    const size_t hash = line.find('#');
    if (hash != std::string::npos) line = line.substr(0, hash);
    line = trim(line);
    if (line.empty()) continue;

    // A line may be "label:", or "label: instruction".
    for (;;) {
      const size_t colon = line.find(':');
      if (colon == std::string::npos) break;
      const std::string name = trim(line.substr(0, colon));
      if (name.empty() || name.find(' ') != std::string::npos) break;
      labelAtStatement[name] = statements.size();
      line = trim(line.substr(colon + 1));
      if (line.empty()) break;
    }
    if (line.empty()) continue;

    Statement s;
    s.sourceLine = static_cast<int>(i);
    s.raw = line;
    const size_t space = line.find_first_of(" \t");
    s.mnemonic = lower(space == std::string::npos ? line : line.substr(0, space));
    if (space != std::string::npos) s.operands = splitTop(line.substr(space + 1), ',');
    statements.push_back(s);
  }

  // Two encoding passes: the first works out where every statement lands so
  // forward branches know their target, the second emits with real offsets.
  std::vector<uint64_t> addresses(statements.size() + 1, origin);
  std::map<std::string, uint64_t> labels;

  for (int pass = 0; pass < 2; pass++) {
    result.bytes.clear();
    result.lines.clear();

    for (const auto& [name, index] : labelAtStatement) labels[name] = addresses[index];

    for (size_t i = 0; i < statements.size(); i++) {
      addresses[i] = origin + result.bytes.size();
      const Statement& s = statements[i];
      const uint64_t before = result.bytes.size();
      Emitter e{result.bytes};

      std::vector<Parsed> ops;
      bool bad = false;
      // .ascii takes raw text, not operands; parsing its quotes as an operand
      // would read the string as a label name.
      const bool rawText = s.mnemonic == ".ascii" || s.mnemonic == ".asciz";
      for (const std::string& text : rawText ? std::vector<std::string>{} : s.operands) {
        Parsed p;
        std::string error;
        if (!parseOperand(text, p, error)) {
          if (pass == 1) {
            result.error = "line " + std::to_string(s.sourceLine + 1) + ": " + error;
            return result;
          }
          bad = true;
          break;
        }
        if (p.kind == Parsed::Memory && !p.label.empty()) {
          const auto found = labels.find(p.label);
          if (found == labels.end() && pass == 1) {
            result.error = "line " + std::to_string(s.sourceLine + 1) + ": no label named '" +
                           p.label + "'";
            return result;
          }
          p.displacement += (p.value < 0 ? -1 : 1) *
                            static_cast<int64_t>(found == labels.end() ? origin : found->second);
          p.label.clear();
        }
        if (p.kind == Parsed::Label) {
          const auto found = labels.find(p.label);
          p.value = found == labels.end() ? static_cast<int64_t>(origin) : static_cast<int64_t>(found->second);
          if (found == labels.end() && pass == 1) {
            result.error = "line " + std::to_string(s.sourceLine + 1) + ": no label named '" +
                           p.label + "'";
            return result;
          }
        }
        ops.push_back(p);
      }
      if (bad) continue;

      const std::string& m = s.mnemonic;
      auto widthOf = [&](void) -> uint8_t {
        for (const Parsed& p : ops) {
          if (p.kind == Parsed::Register) return p.width;
        }
        return ops.empty() ? 8 : ops[0].width;
      };

      if (m == "mov" && ops.size() == 2) {
        const uint8_t w = widthOf();
        if (ops[1].kind == Parsed::Immediate || ops[1].kind == Parsed::Label) {
          if (ops[0].kind == Parsed::Register && w == 8 &&
              (ops[1].value > 0x7fffffff || ops[1].value < -0x80000000LL)) {
            e.rex(true, 0, ops[0].reg);
            e.byte(static_cast<uint8_t>(0xb8 | (ops[0].reg & 7)));
            e.qword(ops[1].value);
          } else {
            e.rex(w == 8, 0, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base,
                  ops[0].index);
            e.byte(w == 1 ? 0xc6 : 0xc7);
            e.modrm(0, ops[0]);
            if (w == 1) e.byte(static_cast<uint8_t>(ops[1].value));
            else e.dword(ops[1].value);
          }
        } else if (ops[1].kind == Parsed::Register) {
          e.rex(w == 8, ops[1].reg, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base,
                ops[0].index);
          e.byte(w == 1 ? 0x88 : 0x89);
          e.modrm(ops[1].reg, ops[0]);
        } else {
          e.rex(w == 8, ops[0].reg, ops[1].base, ops[1].index);
          e.byte(w == 1 ? 0x8a : 0x8b);
          e.modrm(ops[0].reg, ops[1]);
        }
      } else if (m == "lea" && ops.size() == 2) {
        e.rex(true, ops[0].reg, ops[1].base, ops[1].index);
        e.byte(0x8d);
        e.modrm(ops[0].reg, ops[1]);
      } else if (ARITH.count(m) && ops.size() == 2) {
        const uint8_t w = widthOf();
        if (ops[1].kind == Parsed::Immediate || ops[1].kind == Parsed::Label) {
          e.rex(w == 8, 0, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base, ops[0].index);
          // 0x80 is the byte-wide form. Using 0x83 for a byte operand would
          // silently compare or add the whole 32-bit register instead, which
          // is a very quiet wrong answer.
          const bool small = fitsIn8(ops[1].value);
          e.byte(w == 1 ? 0x80 : small ? 0x83 : 0x81);
          e.modrm(ARITH.at(m), ops[0]);
          if (w == 1 || small) e.byte(static_cast<uint8_t>(ops[1].value));
          else e.dword(ops[1].value);
        } else if (ops[1].kind == Parsed::Register) {
          e.rex(w == 8, ops[1].reg, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base,
                ops[0].index);
          e.byte(static_cast<uint8_t>(ARITH_OPCODE.at(m) - (w == 1 ? 1 : 0)));
          e.modrm(ops[1].reg, ops[0]);
        } else {
          e.rex(w == 8, ops[0].reg, ops[1].base, ops[1].index);
          e.byte(static_cast<uint8_t>(ARITH_OPCODE.at(m) + 2));
          e.modrm(ops[0].reg, ops[1]);
        }
      } else if (m == "test" && ops.size() == 2 && ops[1].kind == Parsed::Register) {
        e.rex(widthOf() == 8, ops[1].reg, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base);
        e.byte(0x85);
        e.modrm(ops[1].reg, ops[0]);
      } else if (m == "imul" && ops.size() == 2) {
        e.rex(true, ops[0].reg, ops[1].kind == Parsed::Register ? ops[1].reg : ops[1].base,
              ops[1].index);
        e.byte(0x0f);
        e.byte(0xaf);
        e.modrm(ops[0].reg, ops[1]);
      } else if ((m == "idiv" || m == "neg" || m == "not" || m == "mul") && ops.size() == 1) {
        e.rex(true, 0, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base);
        e.byte(0xf7);
        e.modrm(m == "not" ? 2 : m == "neg" ? 3 : m == "mul" ? 4 : 7, ops[0]);
      } else if ((m == "inc" || m == "dec") && ops.size() == 1) {
        e.rex(true, 0, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base);
        e.byte(0xff);
        e.modrm(m == "inc" ? 0 : 1, ops[0]);
      } else if (SHIFT.count(m) && ops.size() == 2) {
        e.rex(true, 0, ops[0].kind == Parsed::Register ? ops[0].reg : ops[0].base);
        if (ops[1].kind == Parsed::Register && ops[1].reg == RCX) {
          e.byte(0xd3);
          e.modrm(SHIFT.at(m), ops[0]);
        } else {
          e.byte(0xc1);
          e.modrm(SHIFT.at(m), ops[0]);
          e.byte(static_cast<uint8_t>(ops[1].value));
        }
      } else if (m == "push" && ops.size() == 1) {
        if (ops[0].kind == Parsed::Register) {
          if (ops[0].reg & 8) e.byte(0x41);
          e.byte(static_cast<uint8_t>(0x50 | (ops[0].reg & 7)));
        } else if (ops[0].kind == Parsed::Immediate) {
          e.byte(0x68);
          e.dword(ops[0].value);
        } else {
          e.rex(false, 0, ops[0].base, ops[0].index);
          e.byte(0xff);
          e.modrm(6, ops[0]);
        }
      } else if (m == "pop" && ops.size() == 1 && ops[0].kind == Parsed::Register) {
        if (ops[0].reg & 8) e.byte(0x41);
        e.byte(static_cast<uint8_t>(0x58 | (ops[0].reg & 7)));
      } else if (m == "jmp" && ops.size() == 1) {
        if (ops[0].kind == Parsed::Register) {
          e.rex(false, 0, ops[0].reg);
          e.byte(0xff);
          e.modrm(4, ops[0]);
        } else {
          e.byte(0xe9);
          e.dword(ops[0].value - static_cast<int64_t>(origin + result.bytes.size() + 4));
        }
      } else if (m == "call" && ops.size() == 1) {
        e.byte(0xe8);
        e.dword(ops[0].value - static_cast<int64_t>(origin + result.bytes.size() + 4));
      } else if (m.size() > 1 && m[0] == 'j' && conditionCode(m.substr(1)) >= 0 &&
                 ops.size() == 1) {
        e.byte(0x0f);
        e.byte(static_cast<uint8_t>(0x80 + conditionCode(m.substr(1))));
        e.dword(ops[0].value - static_cast<int64_t>(origin + result.bytes.size() + 4));
      } else if (m.rfind("set", 0) == 0 && conditionCode(m.substr(3)) >= 0 && ops.size() == 1) {
        // A REX prefix is needed to reach sil, dil, spl and bpl at all.
        if (ops[0].kind == Parsed::Register && ops[0].reg >= 4) e.rex(false, 0, ops[0].reg);
        e.byte(0x0f);
        e.byte(static_cast<uint8_t>(0x90 + conditionCode(m.substr(3))));
        e.modrm(0, ops[0]);
      } else if (m.rfind("cmov", 0) == 0 && conditionCode(m.substr(4)) >= 0 && ops.size() == 2) {
        e.rex(true, ops[0].reg, ops[1].kind == Parsed::Register ? ops[1].reg : ops[1].base);
        e.byte(0x0f);
        e.byte(static_cast<uint8_t>(0x40 + conditionCode(m.substr(4))));
        e.modrm(ops[0].reg, ops[1]);
      } else if (m == "movzx" && ops.size() == 2) {
        e.rex(true, ops[0].reg, ops[1].kind == Parsed::Register ? ops[1].reg : ops[1].base);
        e.byte(0x0f);
        e.byte(ops[1].width == 2 ? 0xb7 : 0xb6);
        e.modrm(ops[0].reg, ops[1]);
      } else if (m == "movsx" && ops.size() == 2) {
        e.rex(true, ops[0].reg, ops[1].kind == Parsed::Register ? ops[1].reg : ops[1].base);
        e.byte(0x0f);
        e.byte(ops[1].width == 2 ? 0xbf : 0xbe);
        e.modrm(ops[0].reg, ops[1]);
      } else if (m == "ret") {
        e.byte(0xc3);
      } else if (m == "leave") {
        e.byte(0xc9);
      } else if (m == "cqo") {
        e.byte(0x48);
        e.byte(0x99);
      } else if (m == "nop") {
        e.byte(0x90);
      } else if (m == "hlt") {
        e.byte(0xf4);
      } else if (m == "syscall") {
        e.byte(0x0f);
        e.byte(0x05);
      } else if (m == ".quad") {
        for (const Parsed& p : ops) e.qword(p.value);
      } else if (m == ".byte") {
        for (const Parsed& p : ops) e.byte(static_cast<uint8_t>(p.value));
      } else if (m == ".ascii" || m == ".asciz") {
        // The operand keeps its quotes, since splitting happened before now.
        const size_t open = s.raw.find('"');
        const size_t close = s.raw.rfind('"');
        if (open != std::string::npos && close > open) {
          for (size_t k = open + 1; k < close; k++) {
            if (s.raw[k] == '\\' && k + 1 < close) {
              const char next = s.raw[++k];
              e.byte(next == 'n' ? '\n' : next == 't' ? '\t' : next == '0' ? '\0'
                                                                          : static_cast<uint8_t>(next));
            } else {
              e.byte(static_cast<uint8_t>(s.raw[k]));
            }
          }
        }
        if (m == ".asciz") e.byte(0);
      } else if (m == ".align") {
        const int64_t to = ops.empty() ? 8 : ops[0].value;
        while (to > 0 && (origin + result.bytes.size()) % static_cast<uint64_t>(to)) e.byte(0);
      } else {
        if (pass == 1) {
          result.error = "line " + std::to_string(s.sourceLine + 1) + ": cannot assemble '" +
                         s.raw + "'";
          return result;
        }
      }

      AsmLine record;
      record.address = origin + before;
      record.length = static_cast<uint8_t>(result.bytes.size() - before);
      record.sourceLine = s.sourceLine;
      record.text = s.raw;
      result.lines.push_back(record);
    }
    addresses[statements.size()] = origin + result.bytes.size();
  }

  result.labels = labels;
  return result;
}

}  // namespace x86
