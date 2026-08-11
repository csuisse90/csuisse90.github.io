#include "x86.hpp"

#include <cstdio>
#include <cstring>

namespace x86 {

namespace {

const char* NAMES64[] = {"rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi",
                         "r8",  "r9",  "r10", "r11", "r12", "r13", "r14", "r15"};
const char* NAMES32[] = {"eax", "ecx", "edx", "ebx", "esp", "ebp", "esi", "edi",
                         "r8d", "r9d", "r10d", "r11d", "r12d", "r13d", "r14d", "r15d"};
const char* NAMES16[] = {"ax", "cx", "dx", "bx", "sp", "bp", "si", "di",
                         "r8w", "r9w", "r10w", "r11w", "r12w", "r13w", "r14w", "r15w"};
const char* NAMES8[] = {"al", "cl", "dl", "bl", "spl", "bpl", "sil", "dil",
                        "r8b", "r9b", "r10b", "r11b", "r12b", "r13b", "r14b", "r15b"};

const char* CONDS[] = {"o", "no", "b", "ae", "e", "ne", "be", "a",
                       "s", "ns", "p", "np", "l", "ge", "le", "g"};

/** Sign-extends the low `bytes` bytes of a value to 64 bits. */
int64_t signExtend(uint64_t value, uint8_t bytes) {
  if (bytes >= 8) return static_cast<int64_t>(value);
  const uint8_t bits = static_cast<uint8_t>(bytes * 8);
  const uint64_t mask = (1ull << bits) - 1;
  const uint64_t sign = 1ull << (bits - 1);
  value &= mask;
  return static_cast<int64_t>((value ^ sign) - sign);
}

/** Reads a little-endian integer out of the byte stream, the way the processor
 *  does. Off the end reads as zero rather than faulting the disassembler. */
uint64_t little(const std::vector<uint8_t>& code, uint64_t at, uint8_t bytes) {
  uint64_t out = 0;
  for (uint8_t i = 0; i < bytes; i++) {
    if (at + i < code.size()) out |= static_cast<uint64_t>(code[at + i]) << (8 * i);
  }
  return out;
}

std::string hex(int64_t v) {
  char buffer[32];
  if (v < 0) {
    std::snprintf(buffer, sizeof buffer, "-0x%llx", static_cast<unsigned long long>(-v));
  } else {
    std::snprintf(buffer, sizeof buffer, "0x%llx", static_cast<unsigned long long>(v));
  }
  return buffer;
}

}  // namespace

const char* regName(Reg r, uint8_t width) {
  if (r >= REG_COUNT) return "?";
  switch (width) {
    case 1: return NAMES8[r];
    case 2: return NAMES16[r];
    case 4: return NAMES32[r];
    default: return NAMES64[r];
  }
}

const char* condName(Cond c) {
  return c == Cond::None ? "" : CONDS[static_cast<uint8_t>(c) & 0xf];
}

uint64_t Flags::packed() const {
  return (carry ? 1ull : 0) | (parity ? 1ull << 2 : 0) | (adjust ? 1ull << 4 : 0) |
         (zero ? 1ull << 6 : 0) | (sign ? 1ull << 7 : 0) | (overflow ? 1ull << 11 : 0);
}

std::string controlLineNames(uint32_t lines) {
  static const std::pair<uint32_t, const char*> ALL[] = {
      {RIP_OUT, "RIP_out"},   {RIP_IN, "RIP_in"},       {MAR_IN, "MAR_in"},
      {MDR_IN, "MDR_in"},     {MDR_OUT, "MDR_out"},     {IR_IN, "IR_in"},
      {MEM_READ, "MEM_read"}, {MEM_WRITE, "MEM_write"}, {REG_OUT_A, "REG_outA"},
      {REG_OUT_B, "REG_outB"}, {REG_IN, "REG_in"},      {ALU_ADD, "ALU_add"},
      {ALU_SUB, "ALU_sub"},   {ALU_LOGIC, "ALU_logic"}, {ALU_SHIFT, "ALU_shift"},
      {ALU_OUT, "ALU_out"},   {FLAGS_IN, "FLAGS_in"},   {HALT, "HALT"},
  };
  std::string out;
  for (const auto& [bit, name] : ALL) {
    if (lines & bit) {
      if (!out.empty()) out += " ";
      out += name;
    }
  }
  return out;
}

// ============================================================ the decoder

namespace {

struct Prefixes {
  bool rexW = false, rexR = false, rexX = false, rexB = false, hasRex = false;
  bool opSize = false;  // 0x66
  uint8_t length = 0;
};

Prefixes readPrefixes(const std::vector<uint8_t>& code, uint64_t at) {
  Prefixes p;
  for (;;) {
    if (at + p.length >= code.size()) break;
    const uint8_t b = code[at + p.length];
    if (b == 0x66) {
      p.opSize = true;
      p.length++;
    } else if (b == 0xf2 || b == 0xf3 || b == 0x2e || b == 0x3e || b == 0x26 || b == 0x36 ||
               b == 0x64 || b == 0x65) {
      p.length++;  // accepted and ignored: this core has one flat segment
    } else if ((b & 0xf0) == 0x40) {
      p.hasRex = true;
      p.rexW = b & 0x8;
      p.rexR = b & 0x4;
      p.rexX = b & 0x2;
      p.rexB = b & 0x1;
      p.length++;
      break;  // REX must be the last prefix
    } else {
      break;
    }
  }
  return p;
}

struct ModRm {
  Operand rm;
  Reg reg = RAX;
  uint8_t length = 0;
};

/** Decodes the ModRM byte, and the SIB and displacement it may pull in. This
 *  is the whole of x86 addressing: everything reduces to
 *  base + index*scale + displacement. */
ModRm readModRm(const std::vector<uint8_t>& code, uint64_t at, const Prefixes& p, uint8_t width) {
  ModRm out;
  const uint8_t modrm = static_cast<uint8_t>(little(code, at, 1));
  out.length = 1;

  const uint8_t mod = modrm >> 6;
  const uint8_t regField = (modrm >> 3) & 7;
  const uint8_t rmField = modrm & 7;

  out.reg = static_cast<Reg>(regField | (p.rexR ? 8 : 0));

  if (mod == 3) {
    out.rm.kind = OperandKind::Register;
    out.rm.reg = static_cast<Reg>(rmField | (p.rexB ? 8 : 0));
    return out;
  }

  out.rm.kind = OperandKind::Memory;

  if (rmField == 4) {
    // A SIB byte follows: scale, index, base.
    const uint8_t sib = static_cast<uint8_t>(little(code, at + out.length, 1));
    out.length++;
    const uint8_t scale = sib >> 6;
    const uint8_t indexField = (sib >> 3) & 7;
    const uint8_t baseField = sib & 7;

    out.rm.scale = static_cast<uint8_t>(1 << scale);
    const Reg index = static_cast<Reg>(indexField | (p.rexX ? 8 : 0));
    // Index 4 with no REX.X means "no index" — RSP cannot be an index.
    out.rm.index = (indexField == 4 && !p.rexX) ? REG_COUNT : index;

    if (baseField == 5 && mod == 0) {
      out.rm.reg = REG_COUNT;  // no base, disp32 only
      out.rm.displacement = signExtend(little(code, at + out.length, 4), 4);
      out.length += 4;
    } else {
      out.rm.reg = static_cast<Reg>(baseField | (p.rexB ? 8 : 0));
    }
  } else if (rmField == 5 && mod == 0) {
    // RIP-relative: the displacement is from the end of the instruction, which
    // the caller fixes up once it knows the total length.
    out.rm.ripRelative = true;
    out.rm.reg = REG_COUNT;
    out.rm.displacement = signExtend(little(code, at + out.length, 4), 4);
    out.length += 4;
    return out;
  } else {
    out.rm.reg = static_cast<Reg>(rmField | (p.rexB ? 8 : 0));
    out.rm.index = REG_COUNT;
  }

  if (mod == 1) {
    out.rm.displacement = signExtend(little(code, at + out.length, 1), 1);
    out.length += 1;
  } else if (mod == 2) {
    out.rm.displacement = signExtend(little(code, at + out.length, 4), 4);
    out.length += 4;
  }

  (void)width;
  return out;
}

Operand registerOperand(Reg r) {
  Operand o;
  o.kind = OperandKind::Register;
  o.reg = r;
  return o;
}

Operand immediateOperand(int64_t v) {
  Operand o;
  o.kind = OperandKind::Immediate;
  o.immediate = v;
  return o;
}

const Op GROUP1[] = {Op::Add, Op::Or, Op::Add, Op::Sub, Op::And, Op::Sub, Op::Xor, Op::Cmp};
const Op GROUP2[] = {Op::Shl, Op::Shr, Op::Shl, Op::Shr, Op::Shl, Op::Shr, Op::Shl, Op::Sar};

}  // namespace

Instruction decode(const std::vector<uint8_t>& code, uint64_t at) {
  Instruction in;
  in.address = at;
  if (at >= code.size()) {
    in.op = Op::Unknown;
    in.length = 1;
    in.text = "(past the end)";
    return in;
  }

  const Prefixes p = readPrefixes(code, at);
  uint64_t cursor = at + p.length;
  const uint8_t opcode = static_cast<uint8_t>(little(code, cursor, 1));
  cursor++;

  in.width = p.rexW ? 8 : (p.opSize ? 2 : 4);

  auto finish = [&](void) {
    in.length = static_cast<uint8_t>(cursor - at);
    for (uint8_t i = 0; i < in.length && at + i < code.size(); i++) {
      in.bytes.push_back(code[at + i]);
    }
    // RIP-relative displacements are measured from the next instruction.
    if (in.dst.ripRelative) in.dst.displacement += static_cast<int64_t>(at + in.length);
    if (in.src.ripRelative) in.src.displacement += static_cast<int64_t>(at + in.length);
    in.text = disassemble(in);
  };

  // Arithmetic and logic in the 0x00-0x3f block follow one pattern: the low
  // three bits pick the direction and the width, the high bits pick the
  // operation. Decoding them as a family rather than one by one is how the
  // instruction set is actually organised.
  auto arithmetic = [&](Op op) {
    const uint8_t form = opcode & 7;
    const uint8_t width = (form == 0 || form == 2 || form == 4) ? 1 : in.width;
    in.width = width;
    if (form == 4 || form == 5) {  // op al/eax, imm
      in.dst = registerOperand(RAX);
      const uint8_t size = width == 1 ? 1 : (width == 2 ? 2 : 4);
      in.src = immediateOperand(signExtend(little(code, cursor, size), size));
      cursor += size;
      in.op = op;
      return;
    }
    const ModRm m = readModRm(code, cursor, p, width);
    cursor += m.length;
    in.op = op;
    if (form == 0 || form == 1) {
      in.dst = m.rm;
      in.src = registerOperand(m.reg);
    } else {
      in.dst = registerOperand(m.reg);
      in.src = m.rm;
    }
  };

  switch (opcode) {
    case 0x00: case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: arithmetic(Op::Add); break;
    case 0x08: case 0x09: case 0x0a: case 0x0b: case 0x0c: case 0x0d: arithmetic(Op::Or); break;
    case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: arithmetic(Op::And); break;
    case 0x28: case 0x29: case 0x2a: case 0x2b: case 0x2c: case 0x2d: arithmetic(Op::Sub); break;
    case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: arithmetic(Op::Xor); break;
    case 0x38: case 0x39: case 0x3a: case 0x3b: case 0x3c: case 0x3d: arithmetic(Op::Cmp); break;

    case 0x50: case 0x51: case 0x52: case 0x53:
    case 0x54: case 0x55: case 0x56: case 0x57:
      in.op = Op::Push;
      in.width = 8;
      in.dst = registerOperand(static_cast<Reg>((opcode & 7) | (p.rexB ? 8 : 0)));
      break;

    case 0x58: case 0x59: case 0x5a: case 0x5b:
    case 0x5c: case 0x5d: case 0x5e: case 0x5f:
      in.op = Op::Pop;
      in.width = 8;
      in.dst = registerOperand(static_cast<Reg>((opcode & 7) | (p.rexB ? 8 : 0)));
      break;

    case 0x68:
      in.op = Op::Push;
      in.width = 8;
      in.dst = immediateOperand(signExtend(little(code, cursor, 4), 4));
      cursor += 4;
      break;

    case 0x6a:
      in.op = Op::Push;
      in.width = 8;
      in.dst = immediateOperand(signExtend(little(code, cursor, 1), 1));
      cursor += 1;
      break;

    case 0x69: case 0x6b: {  // imul r, r/m, imm
      const ModRm m = readModRm(code, cursor, p, in.width);
      cursor += m.length;
      const uint8_t size = opcode == 0x6b ? 1 : 4;
      in.op = Op::Imul;
      in.dst = registerOperand(m.reg);
      in.src = m.rm;
      in.src.immediate = signExtend(little(code, cursor, size), size);
      cursor += size;
      break;
    }

    case 0x80: case 0x81: case 0x83: {
      const uint8_t width = opcode == 0x80 ? 1 : in.width;
      in.width = width;
      const ModRm m = readModRm(code, cursor, p, width);
      cursor += m.length;
      const uint8_t field = (static_cast<uint8_t>(little(code, cursor - m.length, 1)) >> 3) & 7;
      const uint8_t size = opcode == 0x81 ? (width == 2 ? 2 : 4) : 1;
      in.op = GROUP1[field];
      in.dst = m.rm;
      in.src = immediateOperand(signExtend(little(code, cursor, size), size));
      cursor += size;
      break;
    }

    case 0x84: case 0x85: {
      in.width = opcode == 0x84 ? 1 : in.width;
      const ModRm m = readModRm(code, cursor, p, in.width);
      cursor += m.length;
      in.op = Op::Test;
      in.dst = m.rm;
      in.src = registerOperand(m.reg);
      break;
    }

    case 0x88: case 0x89: case 0x8a: case 0x8b: {
      const bool byte = (opcode & 1) == 0;
      const bool toReg = (opcode & 2) != 0;
      if (byte) in.width = 1;
      const ModRm m = readModRm(code, cursor, p, in.width);
      cursor += m.length;
      in.op = Op::Mov;
      if (toReg) {
        in.dst = registerOperand(m.reg);
        in.src = m.rm;
      } else {
        in.dst = m.rm;
        in.src = registerOperand(m.reg);
      }
      break;
    }

    case 0x8d: {
      const ModRm m = readModRm(code, cursor, p, in.width);
      cursor += m.length;
      in.op = Op::Lea;
      in.dst = registerOperand(m.reg);
      in.src = m.rm;
      break;
    }

    case 0x90: in.op = Op::Nop; break;
    case 0x99: in.op = Op::Cqo; break;

    case 0xb8: case 0xb9: case 0xba: case 0xbb:
    case 0xbc: case 0xbd: case 0xbe: case 0xbf: {
      in.op = Op::Mov;
      in.dst = registerOperand(static_cast<Reg>((opcode & 7) | (p.rexB ? 8 : 0)));
      const uint8_t size = p.rexW ? 8 : (p.opSize ? 2 : 4);
      // Only the 64-bit form takes a full 64-bit immediate; the 32-bit form
      // zero-extends, which is why compilers prefer it.
      in.src = immediateOperand(p.rexW ? static_cast<int64_t>(little(code, cursor, 8))
                                       : static_cast<int64_t>(little(code, cursor, size)));
      cursor += size;
      break;
    }

    case 0xc0: case 0xc1: case 0xd0: case 0xd1: case 0xd3: {
      const uint8_t width = (opcode == 0xc0 || opcode == 0xd0) ? 1 : in.width;
      in.width = width;
      const ModRm m = readModRm(code, cursor, p, width);
      const uint8_t field = (static_cast<uint8_t>(little(code, cursor, 1)) >> 3) & 7;
      cursor += m.length;
      in.op = GROUP2[field];
      in.dst = m.rm;
      if (opcode == 0xc0 || opcode == 0xc1) {
        in.src = immediateOperand(static_cast<int64_t>(little(code, cursor, 1)));
        cursor += 1;
      } else if (opcode == 0xd3) {
        in.src = registerOperand(RCX);
      } else {
        in.src = immediateOperand(1);
      }
      break;
    }

    case 0xc3: in.op = Op::Ret; break;
    case 0xc9: in.op = Op::Leave; break;

    case 0xc6: case 0xc7: {
      const uint8_t width = opcode == 0xc6 ? 1 : in.width;
      in.width = width;
      const ModRm m = readModRm(code, cursor, p, width);
      cursor += m.length;
      const uint8_t size = width == 1 ? 1 : (width == 2 ? 2 : 4);
      in.op = Op::Mov;
      in.dst = m.rm;
      in.src = immediateOperand(signExtend(little(code, cursor, size), size));
      cursor += size;
      break;
    }

    case 0xe8:
      in.op = Op::Call;
      in.dst = immediateOperand(signExtend(little(code, cursor, 4), 4));
      cursor += 4;
      in.dst.immediate += static_cast<int64_t>(cursor - at) + static_cast<int64_t>(at);
      break;

    case 0xe9:
      in.op = Op::Jmp;
      in.dst = immediateOperand(signExtend(little(code, cursor, 4), 4));
      cursor += 4;
      in.dst.immediate += static_cast<int64_t>(cursor);
      break;

    case 0xeb:
      in.op = Op::Jmp;
      in.dst = immediateOperand(signExtend(little(code, cursor, 1), 1));
      cursor += 1;
      in.dst.immediate += static_cast<int64_t>(cursor);
      break;

    case 0xf4: in.op = Op::Hlt; break;

    case 0xf6: case 0xf7: {
      const uint8_t width = opcode == 0xf6 ? 1 : in.width;
      in.width = width;
      const ModRm m = readModRm(code, cursor, p, width);
      const uint8_t field = (static_cast<uint8_t>(little(code, cursor, 1)) >> 3) & 7;
      cursor += m.length;
      in.dst = m.rm;
      switch (field) {
        case 0: case 1: {
          const uint8_t size = width == 1 ? 1 : (width == 2 ? 2 : 4);
          in.op = Op::Test;
          in.src = immediateOperand(signExtend(little(code, cursor, size), size));
          cursor += size;
          break;
        }
        case 2: in.op = Op::Not; break;
        case 3: in.op = Op::Neg; break;
        case 5: in.op = Op::Imul; break;   // one-operand form: rdx:rax <- rax * rm
        case 7: in.op = Op::Idiv; break;
        default: in.op = Op::Unknown; break;
      }
      break;
    }

    case 0xfe: case 0xff: {
      const uint8_t width = opcode == 0xfe ? 1 : in.width;
      in.width = width;
      const ModRm m = readModRm(code, cursor, p, width);
      const uint8_t field = (static_cast<uint8_t>(little(code, cursor, 1)) >> 3) & 7;
      cursor += m.length;
      in.dst = m.rm;
      switch (field) {
        case 0: in.op = Op::Inc; break;
        case 1: in.op = Op::Dec; break;
        case 2: in.op = Op::Call; in.width = 8; break;
        case 4: in.op = Op::Jmp; in.width = 8; break;
        case 6: in.op = Op::Push; in.width = 8; break;
        default: in.op = Op::Unknown; break;
      }
      break;
    }

    case 0x0f: {
      const uint8_t second = static_cast<uint8_t>(little(code, cursor, 1));
      cursor++;
      if (second == 0x05) {
        in.op = Op::Syscall;
      } else if (second >= 0x80 && second <= 0x8f) {
        in.op = Op::Jcc;
        in.cond = static_cast<Cond>(second & 0xf);
        in.dst = immediateOperand(signExtend(little(code, cursor, 4), 4));
        cursor += 4;
        in.dst.immediate += static_cast<int64_t>(cursor);
      } else if (second >= 0x90 && second <= 0x9f) {
        const ModRm m = readModRm(code, cursor, p, 1);
        cursor += m.length;
        in.op = Op::Setcc;
        in.cond = static_cast<Cond>(second & 0xf);
        in.width = 1;
        in.dst = m.rm;
      } else if (second >= 0x40 && second <= 0x4f) {
        const ModRm m = readModRm(code, cursor, p, in.width);
        cursor += m.length;
        in.op = Op::Cmovcc;
        in.cond = static_cast<Cond>(second & 0xf);
        in.dst = registerOperand(m.reg);
        in.src = m.rm;
      } else if (second == 0xaf) {
        const ModRm m = readModRm(code, cursor, p, in.width);
        cursor += m.length;
        in.op = Op::Imul;
        in.dst = registerOperand(m.reg);
        in.src = m.rm;
      } else if (second == 0xb6 || second == 0xb7 || second == 0xbe || second == 0xbf) {
        const ModRm m = readModRm(code, cursor, p, in.width);
        cursor += m.length;
        in.op = (second == 0xb6 || second == 0xb7) ? Op::Movzx : Op::Movsx;
        in.dst = registerOperand(m.reg);
        in.src = m.rm;
        in.src.scale = (second == 0xb6 || second == 0xbe) ? 1 : 2;  // source width
      } else if (second == 0x1f) {
        const ModRm m = readModRm(code, cursor, p, in.width);
        cursor += m.length;
        in.op = Op::Nop;
      } else {
        in.op = Op::Unknown;
      }
      break;
    }

    default:
      if (opcode >= 0x70 && opcode <= 0x7f) {
        in.op = Op::Jcc;
        in.cond = static_cast<Cond>(opcode & 0xf);
        in.dst = immediateOperand(signExtend(little(code, cursor, 1), 1));
        cursor += 1;
        in.dst.immediate += static_cast<int64_t>(cursor);
      } else {
        in.op = Op::Unknown;
      }
      break;
  }

  finish();
  return in;
}

namespace {

std::string operandText(const Operand& o, uint8_t width, bool showSize) {
  switch (o.kind) {
    case OperandKind::Register:
      return regName(o.reg, width);
    case OperandKind::Immediate:
      return hex(o.immediate);
    case OperandKind::Memory: {
      std::string inner;
      if (o.ripRelative) {
        inner = "rip";
        if (o.displacement) inner = hex(o.displacement);
      } else {
        if (o.reg != REG_COUNT) inner = regName(o.reg, 8);
        if (o.index != REG_COUNT) {
          if (!inner.empty()) inner += " + ";
          inner += regName(o.index, 8);
          if (o.scale > 1) inner += "*" + std::to_string(o.scale);
        }
        if (o.displacement || inner.empty()) {
          if (!inner.empty()) inner += o.displacement < 0 ? " - " : " + ";
          inner += hex(o.displacement < 0 && !inner.empty() ? -o.displacement : o.displacement);
        }
      }
      const char* size = width == 1 ? "byte" : width == 2 ? "word" : width == 4 ? "dword" : "qword";
      return showSize ? std::string(size) + " ptr [" + inner + "]" : "[" + inner + "]";
    }
    default:
      return "";
  }
}

const char* mnemonic(Op op) {
  switch (op) {
    case Op::Mov: return "mov";
    case Op::Movzx: return "movzx";
    case Op::Movsx: return "movsx";
    case Op::Lea: return "lea";
    case Op::Add: return "add";
    case Op::Sub: return "sub";
    case Op::Imul: return "imul";
    case Op::Idiv: return "idiv";
    case Op::Neg: return "neg";
    case Op::And: return "and";
    case Op::Or: return "or";
    case Op::Xor: return "xor";
    case Op::Not: return "not";
    case Op::Shl: return "shl";
    case Op::Shr: return "shr";
    case Op::Sar: return "sar";
    case Op::Cmp: return "cmp";
    case Op::Test: return "test";
    case Op::Inc: return "inc";
    case Op::Dec: return "dec";
    case Op::Push: return "push";
    case Op::Pop: return "pop";
    case Op::Jmp: return "jmp";
    case Op::Call: return "call";
    case Op::Ret: return "ret";
    case Op::Leave: return "leave";
    case Op::Cqo: return "cqo";
    case Op::Nop: return "nop";
    case Op::Hlt: return "hlt";
    case Op::Syscall: return "syscall";
    default: return "(bad)";
  }
}

}  // namespace

std::string disassemble(const Instruction& in) {
  if (in.op == Op::Unknown) return "(bad)";

  std::string name;
  if (in.op == Op::Jcc) {
    name = std::string("j") + condName(in.cond);
  } else if (in.op == Op::Setcc) {
    name = std::string("set") + condName(in.cond);
  } else if (in.op == Op::Cmovcc) {
    name = std::string("cmov") + condName(in.cond);
  } else {
    name = mnemonic(in.op);
  }

  // A memory operand only needs its size spelled out when no register operand
  // implies it — which is exactly what a real disassembler does.
  const bool needSize = in.dst.kind == OperandKind::Memory && in.src.kind != OperandKind::Register;

  std::string text = name;
  if (in.dst.kind != OperandKind::None) {
    text += " " + operandText(in.dst, in.width, needSize);
  }
  if (in.src.kind != OperandKind::None) {
    const bool srcSize = in.src.kind == OperandKind::Memory && in.dst.kind != OperandKind::Register;
    text += ", " + operandText(in.src, in.op == Op::Movzx || in.op == Op::Movsx
                                          ? (in.src.scale == 2 ? 2 : 1)
                                          : in.width,
                               srcSize);
    if (in.op == Op::Imul && in.src.kind == OperandKind::Memory && in.src.immediate) {
      text += ", " + hex(in.src.immediate);
    }
  }
  return text;
}

}  // namespace x86
