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
#include <deque>
#include <string>
#include <unordered_map>
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

// ------------------------------------------------------------------- caches

/** A set-associative cache, modelled at the level A1.1.2 asks for: which set a
 *  block lands in, whether the tag matches, and what gets evicted. It changes
 *  no results — only the count of hits and misses, which is the whole point.
 *  A real cache would also change the timing; the pipeline model below adds the
 *  miss penalty so the two numbers agree. */
struct Cache {
  struct Line {
    bool valid = false;
    uint64_t tag = 0;
    uint64_t block = 0;    // the block address, for the display
    uint64_t used = 0;     // for least-recently-used replacement
    bool dirty = false;
  };

  bool enabled = false;
  int lineBytes = 16;
  int sets = 8;
  int ways = 2;
  int missPenalty = 10;    // extra cycles charged to the pipeline on a miss

  std::vector<Line> lines;  // sets * ways, set-major
  uint64_t hits = 0;
  uint64_t misses = 0;
  uint64_t evictions = 0;
  uint64_t clock = 0;
  /** Which line was touched last, so the view can flash it. */
  int lastLine = -1;
  bool lastHit = false;

  void configure(int sets, int ways, int lineBytes);
  void clear();
  /** Returns true on a hit. A write marks the line dirty; nothing is written
   *  back, because the memory behind it is already the truth here. */
  bool access(uint64_t address, bool write);
};

/** A five-stage pipeline — fetch, decode, execute, memory, write-back —
 *  modelled by counting the cycles it would take rather than by simulating the
 *  latches. That is enough to show the two things that matter: a dependent
 *  instruction has to wait, and a taken branch throws away work already done.
 */
struct Pipeline {
  bool enabled = false;
  bool forwarding = true;   // results fed back from EX/MEM instead of via the file
  bool predictTaken = false;

  uint64_t cycles = 0;      // cycles the pipelined machine would have taken
  uint64_t issued = 0;      // instructions issued
  uint64_t stallCycles = 0; // lost to data hazards
  uint64_t flushCycles = 0; // lost to mispredicted branches
  uint64_t missCycles = 0;  // lost to cache misses

  /** What the last two instructions wrote, newest first; -1 for nothing. */
  int wrote[2] = {-1, -1};
  bool wasLoad[2] = {false, false};

  /** The last few instructions as a stage timeline, for the diagram. */
  struct Slot {
    uint64_t address = 0;
    std::string text;
    int start = 0;      // cycle the fetch happened in
    int stall = 0;      // bubbles inserted before execute
    bool flushed = false;
    std::string why;    // why it stalled, in words
  };
  std::deque<Slot> recent;
  size_t recentLimit = 24;

  void clear();
  /** Charges the cycles this instruction costs and records why. */
  void observe(const Instruction& in, bool branchTaken, int missPenalty);
};

// -------------------------------------------------------------------- state

/** Everything needed to put one instruction back the way it was. Registers are
 *  small enough to copy whole; memory is not, so only the bytes that changed
 *  are kept. That makes a step cost a few dozen bytes and makes stepping
 *  backwards exact rather than approximate. */
struct Undo {
  std::array<uint64_t, REG_COUNT> regs{};
  uint64_t rip = 0;
  Flags flags;
  uint32_t outputLength = 0;
  uint32_t cycles = 0;
  uint64_t address = 0;
  bool wasHalted = false;
  std::vector<std::pair<uint32_t, uint8_t>> memory;  // address, byte before
};

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

  Cache cache;
  Pipeline pipeline;

  /** How many times each address was executed, and how many transfers it cost.
   *  Keyed by address because a profile is only interesting where code is. */
  std::unordered_map<uint64_t, uint64_t> profileCount;
  std::unordered_map<uint64_t, uint64_t> profileCycles;

  /** The history that makes stepping backwards possible. Bounded, because a
   *  program that runs for a million instructions must not exhaust memory —
   *  when it fills, the oldest step is dropped and only that step becomes
   *  unreachable. */
  bool recording = true;
  size_t historyLimit = 200000;
  std::deque<Undo> history;
  /** Non-null while an instruction is running and history is being kept, so
   *  write() can save what it is about to clobber. */
  std::vector<std::pair<uint32_t, uint8_t>>* capture = nullptr;

  explicit Machine(size_t memoryBytes = 1 << 16) : memory(memoryBytes, 0) {}

  void load(const std::vector<uint8_t>& code, uint64_t at);
  uint64_t read(uint64_t address, uint8_t width) const;
  void write(uint64_t address, uint8_t width, uint64_t value);

  /** Undoes the last instruction exactly. False when there is no history left,
   *  either because nothing has run or because the bound discarded it. */
  bool undo();
  void forgetHistory();

  /** Runs one instruction. Returns the micro-operations it took, in order, so
   *  the caller can step through them without simulating twice. */
  std::vector<MicroStep> step();

  /** Runs until halt, a fault, or `budget` instructions — whichever is first.
   *  No micro-operations are recorded, so this is the fast path. */
  void run(uint64_t budget);
};

}  // namespace x86
