// Execution: the architectural effect of each instruction, and the
// register transfers a control unit would sequence to produce it.
#include <algorithm>
#include <cstdio>

#include "x86.hpp"

namespace x86 {

namespace {

int64_t signExtend(uint64_t value, uint8_t bytes) {
  if (bytes >= 8) return static_cast<int64_t>(value);
  const uint8_t bits = static_cast<uint8_t>(bytes * 8);
  const uint64_t sign = 1ull << (bits - 1);
  const uint64_t mask = (1ull << bits) - 1;
  value &= mask;
  return static_cast<int64_t>((value ^ sign) - sign);
}

uint64_t truncate(uint64_t value, uint8_t bytes) {
  return bytes >= 8 ? value : value & ((1ull << (bytes * 8)) - 1);
}

std::string dec(int64_t v) {
  char buffer[32];
  std::snprintf(buffer, sizeof buffer, "%lld", static_cast<long long>(v));
  return buffer;
}

std::string hex(uint64_t v) {
  char buffer[32];
  std::snprintf(buffer, sizeof buffer, "0x%llx", static_cast<unsigned long long>(v));
  return buffer;
}

}  // namespace

void Machine::load(const std::vector<uint8_t>& code, uint64_t at) {
  if (at + code.size() > memory.size()) memory.resize(at + code.size());
  for (size_t i = 0; i < code.size(); i++) memory[at + i] = code[i];
}

uint64_t Machine::read(uint64_t address, uint8_t width) const {
  uint64_t out = 0;
  for (uint8_t i = 0; i < width; i++) {
    if (address + i < memory.size()) out |= static_cast<uint64_t>(memory[address + i]) << (8 * i);
  }
  return out;
}

void Machine::write(uint64_t address, uint8_t width, uint64_t value) {
  for (uint8_t i = 0; i < width; i++) {
    if (address + i >= memory.size()) continue;
    if (capture) capture->push_back({static_cast<uint32_t>(address + i), memory[address + i]});
    memory[address + i] = static_cast<uint8_t>(value >> (8 * i));
  }
}

void Machine::forgetHistory() { history.clear(); }

bool Machine::undo() {
  if (history.empty()) return false;
  const Undo u = std::move(history.back());
  history.pop_back();

  // Backwards, so that two writes to the same byte in one instruction restore
  // the earlier value and not the later one.
  for (auto it = u.memory.rbegin(); it != u.memory.rend(); ++it) memory[it->first] = it->second;

  regs = u.regs;
  rip = u.rip;
  flags = u.flags;
  output.resize(u.outputLength);
  halted = u.wasHalted;
  fault.clear();
  if (instructionsRun) instructionsRun--;
  cyclesRun -= std::min<uint64_t>(cyclesRun, u.cycles);

  auto count = profileCount.find(u.address);
  if (count != profileCount.end() && count->second) count->second--;
  auto cycles = profileCycles.find(u.address);
  if (cycles != profileCycles.end()) cycles->second -= std::min<uint64_t>(cycles->second, u.cycles);
  return true;
}

// ------------------------------------------------------------------- caches

void Cache::configure(int newSets, int newWays, int newLineBytes) {
  sets = newSets < 1 ? 1 : newSets;
  ways = newWays < 1 ? 1 : newWays;
  lineBytes = newLineBytes < 1 ? 1 : newLineBytes;
  clear();
}

void Cache::clear() {
  lines.assign(static_cast<size_t>(sets) * static_cast<size_t>(ways), Line{});
  hits = misses = evictions = clock = 0;
  lastLine = -1;
  lastHit = false;
}

bool Cache::access(uint64_t address, bool write) {
  if (!enabled) return true;
  if (lines.size() != static_cast<size_t>(sets) * static_cast<size_t>(ways)) clear();

  clock++;
  const uint64_t block = address / static_cast<uint64_t>(lineBytes);
  const size_t set = static_cast<size_t>(block % static_cast<uint64_t>(sets));
  const uint64_t tag = block / static_cast<uint64_t>(sets);
  const size_t base = set * static_cast<size_t>(ways);

  for (size_t w = 0; w < static_cast<size_t>(ways); w++) {
    Line& line = lines[base + w];
    if (line.valid && line.tag == tag) {
      line.used = clock;
      if (write) line.dirty = true;
      hits++;
      lastLine = static_cast<int>(base + w);
      lastHit = true;
      return true;
    }
  }

  // A miss: fill the first empty way, or evict the one used longest ago.
  size_t victim = base;
  for (size_t w = 0; w < static_cast<size_t>(ways); w++) {
    if (!lines[base + w].valid) {
      victim = base + w;
      break;
    }
    if (lines[base + w].used < lines[victim].used) victim = base + w;
  }
  if (lines[victim].valid) evictions++;
  lines[victim] = Line{true, tag, block, clock, write};
  misses++;
  lastLine = static_cast<int>(victim);
  lastHit = false;
  return false;
}

// ------------------------------------------------------------------ pipeline

void Pipeline::clear() {
  cycles = issued = stallCycles = flushCycles = missCycles = 0;
  wrote[0] = wrote[1] = -1;
  wasLoad[0] = wasLoad[1] = false;
  recent.clear();
}

namespace {

/** Which register an instruction writes, or -1. Only register destinations
 *  count: a store to memory cannot be forwarded to a later register read. */
int destinationOf(const Instruction& in) {
  switch (in.op) {
    case Op::Cmp: case Op::Test: case Op::Jmp: case Op::Jcc: case Op::Nop:
    case Op::Hlt: case Op::Push: case Op::Ret: case Op::Syscall:
      return -1;
    default:
      break;
  }
  if (in.dst.kind == OperandKind::Register) return static_cast<int>(in.dst.reg);
  return -1;
}

/** Every register an instruction reads, including the ones an address is built
 *  from — the address adder needs them just as much as the ALU does. */
void sourcesOf(const Instruction& in, int out[4], int& count) {
  count = 0;
  auto add = [&](int r) {
    if (r < 0 || count >= 4) return;
    for (int i = 0; i < count; i++) {
      if (out[i] == r) return;
    }
    out[count++] = r;
  };
  for (const Operand* o : {&in.dst, &in.src}) {
    if (o->kind == OperandKind::Memory) {
      if (o->reg != REG_COUNT && !o->ripRelative) add(static_cast<int>(o->reg));
      if (o->index != REG_COUNT) add(static_cast<int>(o->index));
    }
  }
  // A destination register is also a source unless it is written whole.
  const bool readsDestination = in.op != Op::Mov && in.op != Op::Lea && in.op != Op::Pop &&
                                in.op != Op::Movzx && in.op != Op::Movsx;
  if (in.dst.kind == OperandKind::Register && readsDestination) add(static_cast<int>(in.dst.reg));
  if (in.src.kind == OperandKind::Register) add(static_cast<int>(in.src.reg));
}

bool isLoad(const Instruction& in) {
  return in.src.kind == OperandKind::Memory || in.op == Op::Pop;
}

}  // namespace

void Pipeline::observe(const Instruction& in, bool branchTaken, int missPenalty) {
  if (!enabled) return;

  int sources[4];
  int count = 0;
  sourcesOf(in, sources, count);

  int stall = 0;
  std::string why;
  for (int i = 0; i < count; i++) {
    for (int back = 0; back < 2; back++) {
      if (wrote[back] != sources[i]) continue;
      // Distance 1 is the instruction immediately before, distance 2 the one
      // before that. Forwarding removes both except after a load, whose value
      // does not exist until the memory stage.
      int need = 0;
      if (forwarding) {
        need = (back == 0 && wasLoad[0]) ? 1 : 0;
      } else {
        need = back == 0 ? 2 : 1;
      }
      if (need > stall) {
        stall = need;
        why = std::string(regName(static_cast<Reg>(sources[i]), 8)) + " is not ready yet" +
              (forwarding ? " — the load has not reached memory" : " — no forwarding");
      }
    }
  }

  int flush = 0;
  if (in.op == Op::Jcc && branchTaken != predictTaken) {
    flush = 2;
    why = branchTaken ? "branch taken, prediction was not-taken" : "branch not taken, predicted taken";
  } else if (in.op == Op::Jmp || in.op == Op::Call || in.op == Op::Ret) {
    flush = 1;
    why = "the next address is not known until this executes";
  }

  const int miss = missPenalty;

  Slot slot;
  slot.address = in.address;
  slot.text = in.text;
  slot.start = static_cast<int>(cycles);
  slot.stall = stall + flush + miss;
  slot.flushed = flush > 0;
  slot.why = why;
  recent.push_back(slot);
  while (recent.size() > recentLimit) recent.pop_front();

  cycles += 1 + stall + flush + miss;
  issued++;
  stallCycles += stall;
  flushCycles += flush;
  missCycles += miss;

  wrote[1] = wrote[0];
  wasLoad[1] = wasLoad[0];
  wrote[0] = destinationOf(in);
  wasLoad[0] = isLoad(in);
}

namespace {

/** Everything the ALU produces in one go: the result and the four flags that
 *  depend on how it was produced. Carry and overflow cannot be worked out from
 *  the result alone, which is exactly why the hardware computes them. */
struct AluResult {
  uint64_t value = 0;
  bool carry = false;
  bool overflow = false;
};

AluResult aluAdd(uint64_t a, uint64_t b, uint8_t width, bool subtract) {
  AluResult r;
  const uint64_t operand = subtract ? ~b + 1 : b;
  r.value = truncate(a + operand, width);

  const uint64_t bits = width * 8;
  const uint64_t top = 1ull << (bits - 1);
  const uint64_t sa = truncate(a, width) & top;
  const uint64_t sb = truncate(subtract ? ~b + 1 : b, width) & top;
  const uint64_t sr = r.value & top;

  if (subtract) {
    r.carry = truncate(a, width) < truncate(b, width);
    const uint64_t sbOrig = truncate(b, width) & top;
    r.overflow = (sa != sbOrig) && (sr != sa);
  } else {
    r.carry = truncate(a, width) + truncate(b, width) > truncate(a + b, width) ||
              (truncate(a, width) + truncate(b, width)) >> bits;
    r.overflow = (sa == sb) && (sr != sa);
  }
  return r;
}

bool parityOf(uint64_t value) {
  uint8_t low = static_cast<uint8_t>(value);
  uint8_t bits = 0;
  while (low) {
    bits += low & 1;
    low >>= 1;
  }
  return (bits & 1) == 0;
}

}  // namespace

namespace {

struct Executor {
  Machine& m;
  std::vector<MicroStep>* trace;
  /** True once any data access missed the cache, so the pipeline can be
   *  charged for it once rather than per byte. */
  bool dataMissed = false;

  void note(Micro kind, const std::string& transfer, uint32_t lines) {
    if (trace) trace->push_back({kind, transfer, lines});
  }

  uint64_t effectiveAddress(const Operand& o) {
    uint64_t address = 0;
    std::string how;
    if (o.ripRelative) {
      address = static_cast<uint64_t>(o.displacement);
      how = "disp(rip)";
    } else {
      if (o.reg != REG_COUNT) {
        address += m.regs[o.reg];
        how = regName(o.reg, 8);
      }
      if (o.index != REG_COUNT) {
        address += m.regs[o.index] * o.scale;
        how += (how.empty() ? "" : " + ") + std::string(regName(o.index, 8));
        if (o.scale > 1) how += "*" + std::to_string(o.scale);
      }
      if (o.displacement) {
        address += static_cast<uint64_t>(o.displacement);
        how += (how.empty() ? "" : " + ") + dec(o.displacement);
      }
    }
    note(Micro::AddressCalc, "MAR <- " + how + "  = " + hex(address), MAR_IN | ALU_ADD | ALU_OUT);
    return address;
  }

  uint64_t load(const Operand& o, uint8_t width) {
    switch (o.kind) {
      case OperandKind::Immediate:
        return truncate(static_cast<uint64_t>(o.immediate), width);
      case OperandKind::Register: {
        const uint64_t v = truncate(m.regs[o.reg], width);
        note(Micro::ReadRegister, std::string("A <- ") + regName(o.reg, width) + "  = " + dec(signExtend(v, width)),
             REG_OUT_A);
        return v;
      }
      case OperandKind::Memory: {
        const uint64_t address = effectiveAddress(o);
        if (!m.cache.access(address, false)) dataMissed = true;
        const uint64_t v = m.read(address, width);
        note(Micro::ReadMemory, "MDR <- mem[" + hex(address) + "]  = " + dec(signExtend(v, width)),
             MEM_READ | MDR_IN);
        return v;
      }
      default:
        return 0;
    }
  }

  void store(const Operand& o, uint8_t width, uint64_t value) {
    if (o.kind == OperandKind::Register) {
      // Writing 32 bits zeroes the upper half — one of the few places x86-64
      // differs from what a student would guess.
      if (width == 4) {
        m.regs[o.reg] = truncate(value, 4);
      } else if (width == 8) {
        m.regs[o.reg] = value;
      } else {
        const uint64_t mask = (1ull << (width * 8)) - 1;
        m.regs[o.reg] = (m.regs[o.reg] & ~mask) | (value & mask);
      }
      note(Micro::WriteRegister,
           std::string(regName(o.reg, width)) + " <- " + dec(signExtend(value, width)), REG_IN);
    } else if (o.kind == OperandKind::Memory) {
      const uint64_t address = effectiveAddress(o);
      if (!m.cache.access(address, true)) dataMissed = true;
      m.write(address, width, value);
      note(Micro::WriteMemory, "mem[" + hex(address) + "] <- " + dec(signExtend(value, width)),
           MEM_WRITE | MDR_OUT);
    }
  }

  void logicFlags(uint64_t result, uint8_t width) {
    m.flags.carry = false;
    m.flags.overflow = false;
    m.flags.zero = truncate(result, width) == 0;
    m.flags.sign = signExtend(result, width) < 0;
    m.flags.parity = parityOf(result);
    note(Micro::SetFlags,
         std::string("FLAGS <- ZF=") + (m.flags.zero ? "1" : "0") + " SF=" + (m.flags.sign ? "1" : "0") +
             " CF=0 OF=0",
         FLAGS_IN);
  }

  void arithFlags(const AluResult& r, uint8_t width) {
    m.flags.carry = r.carry;
    m.flags.overflow = r.overflow;
    m.flags.zero = truncate(r.value, width) == 0;
    m.flags.sign = signExtend(r.value, width) < 0;
    m.flags.parity = parityOf(r.value);
    note(Micro::SetFlags,
         std::string("FLAGS <- ZF=") + (m.flags.zero ? "1" : "0") + " SF=" + (m.flags.sign ? "1" : "0") +
             " CF=" + (m.flags.carry ? "1" : "0") + " OF=" + (m.flags.overflow ? "1" : "0"),
         FLAGS_IN);
  }

  bool test(Cond c) const {
    const Flags& f = m.flags;
    switch (c) {
      case Cond::O: return f.overflow;
      case Cond::NO: return !f.overflow;
      case Cond::B: return f.carry;
      case Cond::AE: return !f.carry;
      case Cond::E: return f.zero;
      case Cond::NE: return !f.zero;
      case Cond::BE: return f.carry || f.zero;
      case Cond::A: return !f.carry && !f.zero;
      case Cond::S: return f.sign;
      case Cond::NS: return !f.sign;
      case Cond::P: return f.parity;
      case Cond::NP: return !f.parity;
      case Cond::L: return f.sign != f.overflow;
      case Cond::GE: return f.sign == f.overflow;
      case Cond::LE: return f.zero || (f.sign != f.overflow);
      case Cond::G: return !f.zero && (f.sign == f.overflow);
      default: return true;
    }
  }

  void push(uint64_t value) {
    m.regs[RSP] -= 8;
    if (!m.cache.access(m.regs[RSP], true)) dataMissed = true;
    note(Micro::PushRsp, "rsp <- rsp - 8  = " + hex(m.regs[RSP]), ALU_SUB | REG_IN);
    m.write(m.regs[RSP], 8, value);
    note(Micro::WriteMemory, "mem[rsp] <- " + dec(static_cast<int64_t>(value)), MEM_WRITE | MDR_OUT);
  }

  uint64_t pop() {
    if (!m.cache.access(m.regs[RSP], false)) dataMissed = true;
    const uint64_t value = m.read(m.regs[RSP], 8);
    note(Micro::ReadMemory, "MDR <- mem[rsp]  = " + dec(static_cast<int64_t>(value)),
         MEM_READ | MDR_IN);
    m.regs[RSP] += 8;
    note(Micro::PopRsp, "rsp <- rsp + 8  = " + hex(m.regs[RSP]), ALU_ADD | REG_IN);
    return value;
  }
};

}  // namespace

std::vector<MicroStep> Machine::step() {
  std::vector<MicroStep> trace;
  if (halted) return trace;

  // Decode straight out of memory at rip. Decoding a copied window would make
  // every relative branch target relative to the start of the window instead
  // of to the instruction, which is a silent and very confusing wrong answer.
  const Instruction in = decode(memory, rip);
  const uint64_t startedAt = rip;

  Undo undoRecord;
  if (recording) {
    undoRecord.regs = regs;
    undoRecord.rip = rip;
    undoRecord.flags = flags;
    undoRecord.outputLength = static_cast<uint32_t>(output.size());
    undoRecord.address = startedAt;
    undoRecord.wasHalted = halted;
    capture = &undoRecord.memory;
  }

  // The fetch is a memory access like any other, and counting it is the reason
  // a tight loop shows a high hit rate: the same line is read over and over.
  bool missed = !cache.access(rip, false);

  // Fetch: the bytes come from memory one at a time, and recording each one is
  // what makes the cycle visible.
  for (uint8_t i = 0; i < in.length; i++) {
    trace.push_back({Micro::FetchByte,
                     "MDR <- mem[" + hex(rip + i) + "]  = " + hex(read(rip + i, 1)) +
                         (i == 0 ? "   (opcode)" : ""),
                     RIP_OUT | MAR_IN | MEM_READ | MDR_IN});
  }
  trace.push_back({Micro::DecodeByte, "IR <- " + in.text, IR_IN});

  const uint64_t next = rip + in.length;
  rip = next;
  trace.push_back({Micro::UpdateRip, "rip <- " + hex(next), RIP_IN});

  Executor ex{*this, &trace};
  const uint8_t w = in.width;

  switch (in.op) {
    case Op::Nop: break;

    case Op::Mov:
      ex.store(in.dst, w, ex.load(in.src, w));
      break;

    case Op::Movzx: {
      const uint8_t from = in.src.scale == 2 ? 2 : 1;
      ex.store(in.dst, w, truncate(ex.load(in.src, from), from));
      break;
    }

    case Op::Movsx: {
      const uint8_t from = in.src.scale == 2 ? 2 : 1;
      ex.store(in.dst, w, static_cast<uint64_t>(signExtend(ex.load(in.src, from), from)));
      break;
    }

    case Op::Lea:
      ex.store(in.dst, w, ex.effectiveAddress(in.src));
      break;

    case Op::Add: case Op::Sub: case Op::Cmp: {
      const uint64_t a = ex.load(in.dst, w);
      const uint64_t b = ex.load(in.src, w);
      const bool subtract = in.op != Op::Add;
      const AluResult r = aluAdd(a, b, w, subtract);
      trace.push_back({Micro::AluOp,
                       std::string("ALU: ") + dec(signExtend(a, w)) + (subtract ? " - " : " + ") +
                           dec(signExtend(b, w)) + " = " + dec(signExtend(r.value, w)),
                       (subtract ? ALU_SUB : ALU_ADD) | ALU_OUT});
      ex.arithFlags(r, w);
      if (in.op != Op::Cmp) ex.store(in.dst, w, r.value);
      break;
    }

    case Op::And: case Op::Or: case Op::Xor: case Op::Test: {
      const uint64_t a = ex.load(in.dst, w);
      const uint64_t b = ex.load(in.src, w);
      uint64_t v = in.op == Op::Or ? (a | b) : in.op == Op::Xor ? (a ^ b) : (a & b);
      trace.push_back({Micro::AluOp, "ALU: " + hex(a) + " op " + hex(b) + " = " + hex(truncate(v, w)),
                       ALU_LOGIC | ALU_OUT});
      ex.logicFlags(v, w);
      if (in.op != Op::Test) ex.store(in.dst, w, truncate(v, w));
      break;
    }

    case Op::Not:
      ex.store(in.dst, w, truncate(~ex.load(in.dst, w), w));
      break;

    case Op::Neg: {
      const uint64_t a = ex.load(in.dst, w);
      const AluResult r = aluAdd(0, a, w, true);
      ex.arithFlags(r, w);
      ex.store(in.dst, w, r.value);
      break;
    }

    case Op::Inc: case Op::Dec: {
      const uint64_t a = ex.load(in.dst, w);
      const bool carry = flags.carry;  // INC and DEC leave CF alone
      const AluResult r = aluAdd(a, 1, w, in.op == Op::Dec);
      ex.arithFlags(r, w);
      flags.carry = carry;
      ex.store(in.dst, w, r.value);
      break;
    }

    case Op::Imul: {
      if (in.src.kind == OperandKind::None) {
        // One-operand form: rdx:rax <- rax * rm
        const __int128 product = static_cast<__int128>(signExtend(regs[RAX], w)) *
                                 signExtend(ex.load(in.dst, w), w);
        regs[RAX] = static_cast<uint64_t>(product);
        regs[RDX] = static_cast<uint64_t>(product >> 64);
        trace.push_back({Micro::AluOp, "ALU: rdx:rax <- rax * operand", ALU_OUT});
      } else {
        const int64_t a = signExtend(ex.load(in.dst, w), w);
        const int64_t b = in.src.immediate && in.src.kind == OperandKind::Memory
                              ? in.src.immediate
                              : signExtend(ex.load(in.src, w), w);
        const int64_t v = a * b;
        trace.push_back({Micro::AluOp, "ALU: " + dec(a) + " * " + dec(b) + " = " + dec(v), ALU_OUT});
        ex.store(in.dst, w, static_cast<uint64_t>(v));
      }
      break;
    }

    case Op::Idiv: {
      const int64_t divisor = signExtend(ex.load(in.dst, w), w);
      if (divisor == 0) {
        fault = "divide by zero";
        halted = true;
        break;
      }
      const __int128 dividend =
          (static_cast<__int128>(static_cast<int64_t>(regs[RDX])) << 64) | regs[RAX];
      regs[RAX] = static_cast<uint64_t>(static_cast<int64_t>(dividend / divisor));
      regs[RDX] = static_cast<uint64_t>(static_cast<int64_t>(dividend % divisor));
      trace.push_back({Micro::AluOp, "ALU: rax <- quotient, rdx <- remainder", ALU_OUT});
      break;
    }

    case Op::Cqo:
      regs[RDX] = static_cast<int64_t>(regs[RAX]) < 0 ? ~0ull : 0;
      trace.push_back({Micro::WriteRegister, "rdx <- sign of rax", REG_IN});
      break;

    case Op::Shl: case Op::Shr: case Op::Sar: {
      const uint64_t a = ex.load(in.dst, w);
      const uint8_t by = static_cast<uint8_t>(ex.load(in.src, 1) & (w == 8 ? 63 : 31));
      uint64_t v = 0;
      if (in.op == Op::Shl) v = truncate(a << by, w);
      else if (in.op == Op::Shr) v = truncate(a, w) >> by;
      else v = static_cast<uint64_t>(signExtend(a, w) >> by);
      trace.push_back({Micro::AluOp, "ALU: shift by " + std::to_string(by) + " = " + hex(truncate(v, w)),
                       ALU_SHIFT | ALU_OUT});
      if (by) ex.logicFlags(v, w);
      ex.store(in.dst, w, truncate(v, w));
      break;
    }

    case Op::Push:
      ex.push(in.dst.kind == OperandKind::Immediate ? static_cast<uint64_t>(in.dst.immediate)
                                                    : ex.load(in.dst, 8));
      break;

    case Op::Pop:
      ex.store(in.dst, 8, ex.pop());
      break;

    case Op::Jmp:
      rip = in.dst.kind == OperandKind::Immediate ? static_cast<uint64_t>(in.dst.immediate)
                                                  : ex.load(in.dst, 8);
      trace.push_back({Micro::UpdateRip, "rip <- " + hex(rip) + "   (taken)", RIP_IN});
      break;

    case Op::Jcc: {
      const bool taken = ex.test(in.cond);
      if (taken) rip = static_cast<uint64_t>(in.dst.immediate);
      trace.push_back({Micro::UpdateRip,
                       std::string("condition ") + condName(in.cond) + (taken ? " holds: rip <- " + hex(rip)
                                                                              : " fails: rip unchanged"),
                       taken ? RIP_IN : 0});
      break;
    }

    case Op::Setcc:
      ex.store(in.dst, 1, ex.test(in.cond) ? 1 : 0);
      break;

    case Op::Cmovcc:
      if (ex.test(in.cond)) ex.store(in.dst, w, ex.load(in.src, w));
      break;

    case Op::Call: {
      const uint64_t target = in.dst.kind == OperandKind::Immediate
                                  ? static_cast<uint64_t>(in.dst.immediate)
                                  : ex.load(in.dst, 8);
      ex.push(rip);
      rip = target;
      trace.push_back({Micro::UpdateRip, "rip <- " + hex(rip) + "   (call)", RIP_IN});
      break;
    }

    case Op::Ret:
      rip = ex.pop();
      trace.push_back({Micro::UpdateRip, "rip <- " + hex(rip) + "   (return)", RIP_IN});
      break;

    case Op::Leave:
      regs[RSP] = regs[RBP];
      trace.push_back({Micro::WriteRegister, "rsp <- rbp", REG_IN});
      regs[RBP] = ex.pop();
      break;

    case Op::Syscall: {
      // One call only: rax = 1 writes rsi..rsi+rdx to the output. Enough for
      // print, and honest about being a stand-in for an operating system.
      if (regs[RAX] == 1) {
        for (uint64_t i = 0; i < regs[RDX]; i++) {
          output += static_cast<char>(read(regs[RSI] + i, 1));
        }
      } else if (regs[RAX] == 60) {
        halted = true;
      }
      trace.push_back({Micro::WriteMemory, "syscall " + dec(static_cast<int64_t>(regs[RAX])), 0});
      break;
    }

    case Op::Hlt:
      halted = true;
      trace.push_back({Micro::Halt, "halted", HALT});
      break;

    default:
      fault = "unknown opcode at " + hex(in.address);
      halted = true;
      break;
  }

  instructionsRun++;
  cyclesRun += trace.size();
  profileCount[startedAt]++;
  profileCycles[startedAt] += trace.size();

  if (ex.dataMissed) missed = true;
  pipeline.observe(in, in.op == Op::Jcc && rip == static_cast<uint64_t>(in.dst.immediate),
                   missed ? cache.missPenalty : 0);

  if (recording) {
    capture = nullptr;
    undoRecord.cycles = static_cast<uint32_t>(trace.size());
    history.push_back(std::move(undoRecord));
    while (history.size() > historyLimit) history.pop_front();
  }
  return trace;
}

void Machine::run(uint64_t budget) {
  // One implementation of the semantics, used by both paths. A second copy
  // written for speed is a second copy that drifts.
  while (!halted && budget) {
    budget--;
    if (decode(memory, rip).op == Op::Unknown) {
      fault = "unknown opcode at " + hex(rip);
      halted = true;
      return;
    }
    step();
  }
  if (!halted && budget == 0) fault = "did not finish";
}

}  // namespace x86
