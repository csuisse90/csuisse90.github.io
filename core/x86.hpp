// A real x86-64 core: real encodings, real registers, real flags.
//
// Scope, stated plainly. This executes a substantial subset of x86-64 —
// enough that the machine code it runs disassembles correctly in any
// disassembler, and enough for a compiler to target. It is not a complete
// x86: no segmentation, no protected or real mode, no SSE, no privileged
// instructions, no self-modifying code. Those are absent because they teach
// nothing here, not because they were forgotten.
//
// Two levels are modelled, and the difference matters:
//
//   - The architectural level: registers, flags, memory, and the effect of
//     each instruction. Fast, exact, and what the stepper walks by default.
//   - The register-transfer level: each instruction is expanded into the
//     micro-operations a control unit would actually sequence, driven by a
//     microcode table. This is what A1.1.3 is about, and it is where the
//     gate-level ALU is invoked.
#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace x86 {

// ---------------------------------------------------------------- registers

/** The sixteen general-purpose registers, in encoding order — the order the
 *  ModRM byte numbers them, not alphabetical. */
enum Reg : uint8_t {
  RAX = 0, RCX, RDX, RBX, RSP, RBP, RSI, RDI,
  R8, R9, R10, R11, R12, R13, R14, R15,
  REG_COUNT,
};

const char* regName(Reg r, uint8_t width);

/** RFLAGS, the bits a compiler actually reads. */
struct Flags {
  bool carry = false;      // CF — unsigned overflow out of the top bit
  bool zero = false;       // ZF
  bool sign = false;       // SF
  bool overflow = false;   // OF — signed overflow
  bool parity = false;     // PF — even number of set bits in the low byte
  bool adjust = false;     // AF — carry out of bit 3, for BCD

  uint64_t packed() const;
};

// ------------------------------------------------------------- instructions

enum class Op : uint8_t {
  Unknown,
  Mov, Movzx, Movsx, Lea,
  Add, Sub, Imul, Idiv, Neg,
  And, Or, Xor, Not,
  Shl, Shr, Sar,
  Cmp, Test,
  Inc, Dec,
  Push, Pop,
  Jmp, Jcc, Call, Ret, Leave,
  Setcc, Cmovcc,
  Cqo, Nop, Hlt,
  Syscall,
};

/** The condition a Jcc, SETcc or CMOVcc tests. The numbering is x86's own: the
 *  low nibble of the opcode. */
enum class Cond : uint8_t {
  O = 0x0, NO = 0x1, B = 0x2, AE = 0x3, E = 0x4, NE = 0x5, BE = 0x6, A = 0x7,
  S = 0x8, NS = 0x9, P = 0xa, NP = 0xb, L = 0xc, GE = 0xd, LE = 0xe, G = 0xf,
  None = 0xff,
};

const char* condName(Cond c);

/** How an operand is reached. */
enum class OperandKind : uint8_t { None, Register, Immediate, Memory };

/** A memory operand is always base + index*scale + displacement in x86; the
 *  ModRM and SIB bytes are just a compressed way of writing that. */
struct Operand {
  OperandKind kind = OperandKind::None;
  Reg reg = RAX;             // Register, or the base of a Memory operand
  Reg index = REG_COUNT;     // REG_COUNT means no index
  uint8_t scale = 1;         // 1, 2, 4 or 8
  int64_t displacement = 0;
  int64_t immediate = 0;
  bool ripRelative = false;
};

struct Instruction {
  Op op = Op::Unknown;
  Cond cond = Cond::None;
  Operand dst;
  Operand src;
  uint8_t width = 8;         // operand size in bytes: 1, 2, 4 or 8
  uint64_t address = 0;      // where it was decoded from
  uint8_t length = 0;        // how many bytes it occupied
  std::vector<uint8_t> bytes;
  std::string text;          // Intel-syntax disassembly
};

// ------------------------------------------------------ micro-operations

/** One register transfer. A real control unit asserts a set of control lines
 *  per clock; this names the transfer those lines produce, which is the level
 *  A1.1.3 asks students to describe. */
enum class Micro : uint8_t {
  FetchByte,      // MDR <- mem[RIP]; RIP <- RIP + 1
  DecodeByte,     // IR <- MDR, and the decoder classifies it
  AddressCalc,    // MAR <- base + index*scale + disp   (uses the ALU)
  ReadMemory,     // MDR <- mem[MAR]
  WriteMemory,    // mem[MAR] <- MDR
  ReadRegister,   // A or B latch <- register file
  WriteRegister,  // register file <- result bus
  AluOp,          // result <- A op B, flags updated  (the gate-level adder)
  SetFlags,
  UpdateRip,
  PushRsp,        // RSP <- RSP - width
  PopRsp,         // RSP <- RSP + width
  Halt,
};

struct MicroStep {
  Micro kind;
  /** Register-transfer notation, e.g. "MAR <- RBP + (-8)". This is the line
   *  the UI shows, and it is generated from the actual values, not a template. */
  std::string transfer;
  /** Which control lines this step asserts, for the control-unit view. */
  uint32_t controlLines = 0;
};

/** Control lines, one bit each. The names are the conventional ones. */
enum ControlLine : uint32_t {
  RIP_OUT   = 1u << 0,
  RIP_IN    = 1u << 1,
  MAR_IN    = 1u << 2,
  MDR_IN    = 1u << 3,
  MDR_OUT   = 1u << 4,
  IR_IN     = 1u << 5,
  MEM_READ  = 1u << 6,
  MEM_WRITE = 1u << 7,
  REG_OUT_A = 1u << 8,
  REG_OUT_B = 1u << 9,
  REG_IN    = 1u << 10,
  ALU_ADD   = 1u << 11,
  ALU_SUB   = 1u << 12,
  ALU_LOGIC = 1u << 13,
  ALU_SHIFT = 1u << 14,
  ALU_OUT   = 1u << 15,
  FLAGS_IN  = 1u << 16,
  HALT      = 1u << 17,
};

std::string controlLineNames(uint32_t lines);

// ------------------------------------------------------------------- decode

/** Decodes one instruction at `at`. Always advances by at least one byte, so a
 *  malformed stream cannot wedge the disassembler. */
Instruction decode(const std::vector<uint8_t>& code, uint64_t at);

/** Intel syntax, the same text the decoder puts in Instruction::text. */
std::string disassemble(const Instruction& in);

// -------------------------------------------------------------------- state

struct Machine {
  std::array<uint64_t, REG_COUNT> regs{};
  uint64_t rip = 0;
  Flags flags;
  std::vector<uint8_t> memory;
  bool halted = false;
  std::string fault;          // non-empty once something went wrong
  uint64_t instructionsRun = 0;
  uint64_t cyclesRun = 0;
  std::string output;         // what the program has printed

  explicit Machine(size_t memoryBytes = 1 << 16) : memory(memoryBytes, 0) {}

  void load(const std::vector<uint8_t>& code, uint64_t at);
  uint64_t read(uint64_t address, uint8_t width) const;
  void write(uint64_t address, uint8_t width, uint64_t value);

  /** Runs one instruction. Returns the micro-operations it took, in order, so
   *  the caller can step through them without simulating twice. */
  std::vector<MicroStep> step();

  /** Runs until halt, a fault, or `budget` instructions — whichever is first.
   *  No micro-operations are recorded, so this is the fast path. */
  void run(uint64_t budget);
};

}  // namespace x86
