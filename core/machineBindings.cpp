// The bindings for the machine module: the Python compiler, the assembler, the
// x86-64 core and the gate-level ALU.
//
// These are separate from the logic module's bindings because they are separate
// downloads. A reader on a circuit page should not fetch a compiler, and a
// reader on the machine page should not wait for the shell's filesystem.
#include <emscripten/bind.h>

#include <algorithm>

#include "alu.hpp"
#include "base64.hpp"
#include "json.hpp"
#include "pycomp.hpp"
#include "x86.hpp"
#include "x86asm.hpp"

using namespace emscripten;

namespace {

/** Compiles Python and returns every stage, so the panes can be filled from
 *  one call rather than five. */
std::string compilePython(const std::string& source, int optLevel) {
  const py::Compiled c = py::compile(source, optLevel);
  jw::Out j;
  j.beginObj();
  j.key("ok");
  j.boolean(c.ok);
  j.key("error");
  j.str(c.error);
  j.key("errorLine");
  j.num(c.errorLine);
  j.key("optLevel");
  j.num(c.optLevel);

  j.key("optimisations");
  j.beginArr();
  for (const std::string& note : c.optimisations) j.str(note);
  j.endArr();

  j.key("tokens");
  j.beginArr();
  for (const py::Token& t : c.tokens) {
    j.beginObj();
    j.key("kind");
    j.str(t.kind == py::Token::Name ? "name"
          : t.kind == py::Token::Number ? "number"
          : t.kind == py::Token::String ? "string"
          : t.kind == py::Token::Op ? "op"
          : t.kind == py::Token::Indent ? "indent"
          : t.kind == py::Token::Dedent ? "dedent"
          : t.kind == py::Token::Newline ? "newline" : "end");
    j.key("text");
    j.str(t.text);
    j.key("line");
    j.num(t.line);
    j.endObj();
  }
  j.endArr();

  j.key("tree");
  j.str(c.tree);

  j.key("ir");
  j.beginArr();
  for (const py::Ir& i : c.ir) {
    j.beginObj();
    j.key("op");
    j.str(i.op);
    j.key("text");
    j.str(i.text);
    j.key("line");
    j.num(i.line);
    j.endObj();
  }
  j.endArr();

  j.key("assembly");
  j.str(c.assembly);
  j.key("assemblyToSource");
  j.beginArr();
  for (int line : c.assemblyToSource) j.num(line);
  j.endArr();
  j.endObj();
  return j.done();
}

/** Assembles text and reports the bytes, plus where every line landed. */
std::string assembleX86(const std::string& source) {
  const x86::Assembled a = x86::assemble(source, 0);
  jw::Out j;
  j.beginObj();
  j.key("error");
  j.str(a.error);
  j.key("bytes");
  j.beginArr();
  for (uint8_t b : a.bytes) j.num(b);
  j.endArr();
  j.key("lines");
  j.beginArr();
  for (const x86::AsmLine& l : a.lines) {
    j.beginObj();
    j.key("address");
    j.num(static_cast<double>(l.address));
    j.key("length");
    j.num(l.length);
    j.key("sourceLine");
    j.num(l.sourceLine);
    j.key("text");
    j.str(l.text);
    j.endObj();
  }
  j.endArr();
  j.key("labels");
  j.beginObj();
  for (const auto& [name, address] : a.labels) {
    j.key(name);
    j.num(static_cast<double>(address));
  }
  j.endObj();
  j.endObj();
  return j.done();
}

std::string disassembleAt(const std::string& base64, int at) {
  // Binary must not travel as a std::string: embind encodes one as UTF-8, so
  // every byte above 0x7f becomes two and the image is quietly corrupted.
  const std::string decoded = sh::base64Decode(base64);
  std::vector<uint8_t> code(decoded.begin(), decoded.end());
  const x86::Instruction in = x86::decode(code, static_cast<uint64_t>(at));
  jw::Out j;
  j.beginObj();
  j.key("text");
  j.str(in.text);
  j.key("length");
  j.num(in.length);
  j.endObj();
  return j.done();
}

/** A machine the browser can hold on to and step. */
class Cpu {
 public:
  Cpu() : machine_(1 << 18) {}

  /** Base64 rather than raw bytes: see disassembleAt. */
  void loadBytes(const std::string& base64, int at) {
    const std::string decoded = sh::base64Decode(base64);
    std::vector<uint8_t> code(decoded.begin(), decoded.end());
    machine_.load(code, static_cast<uint64_t>(at));
  }

  void reset(double entry, double stack) {
    machine_.regs = {};
    machine_.flags = x86::Flags{};
    machine_.rip = static_cast<uint64_t>(entry);
    machine_.regs[x86::RSP] = static_cast<uint64_t>(stack);
    machine_.halted = false;
    machine_.fault.clear();
    machine_.output.clear();
    machine_.instructionsRun = 0;
    machine_.cyclesRun = 0;
    machine_.history.clear();
    machine_.profileCount.clear();
    machine_.profileCycles.clear();
    machine_.cache.clear();
    machine_.pipeline.clear();
  }

  /** Everything the reader can turn on or off, in one call so the worker can
   *  send one message. */
  void configure(bool recordHistory, bool cacheOn, int sets, int ways, int lineBytes,
                 int missPenalty, bool pipelineOn, bool forwarding, bool predictTaken) {
    machine_.recording = recordHistory;
    if (!recordHistory) machine_.history.clear();
    const bool shape = machine_.cache.sets != sets || machine_.cache.ways != ways ||
                       machine_.cache.lineBytes != lineBytes;
    if (shape) machine_.cache.configure(sets, ways, lineBytes);
    machine_.cache.enabled = cacheOn;
    machine_.cache.missPenalty = missPenalty;
    machine_.pipeline.enabled = pipelineOn;
    machine_.pipeline.forwarding = forwarding;
    machine_.pipeline.predictTaken = predictTaken;
  }

  /** One instruction, with every micro-operation it took. */
  std::string step() {
    const std::vector<x86::MicroStep> trace = machine_.step();
    jw::Out j;
    j.beginObj();
    j.key("micro");
    j.beginArr();
    for (const x86::MicroStep& s : trace) {
      j.beginObj();
      j.key("transfer");
      j.str(s.transfer);
      j.key("lines");
      j.str(x86::controlLineNames(s.controlLines));
      j.endObj();
    }
    j.endArr();
    j.endObj();
    return j.done();
  }

  /** Steps backwards. False when the history has run out. */
  bool undo() { return machine_.undo(); }

  /** Steps backwards many times, for dragging a slider. Returns how many it
   *  managed, which is less than asked for at the start of the program. */
  int undoMany(int count) {
    int done = 0;
    while (done < count && machine_.undo()) done++;
    return done;
  }

  void run(int budget) { machine_.run(static_cast<uint64_t>(budget)); }

  /** Runs up to `budget` instructions and returns how many it managed. Unlike
   *  run(), running out of budget is not a fault: the caller is chunking on
   *  purpose, so that a long program can report progress and stay stoppable. */
  int runChunk(int budget) {
    int done = 0;
    while (!machine_.halted && done < budget) {
      machine_.step();
      done++;
    }
    return done;
  }

  std::string state() const {
    jw::Out j;
    j.beginObj();
    j.key("regs");
    j.beginArr();
    for (uint64_t v : machine_.regs) j.num(static_cast<double>(v));
    j.endArr();
    j.key("rip");
    j.num(static_cast<double>(machine_.rip));
    j.key("flags");
    j.beginObj();
    j.key("carry");
    j.boolean(machine_.flags.carry);
    j.key("zero");
    j.boolean(machine_.flags.zero);
    j.key("sign");
    j.boolean(machine_.flags.sign);
    j.key("overflow");
    j.boolean(machine_.flags.overflow);
    j.endObj();
    j.key("halted");
    j.boolean(machine_.halted);
    j.key("fault");
    j.str(machine_.fault);
    j.key("output");
    j.str(machine_.output);
    j.key("instructions");
    j.num(static_cast<double>(machine_.instructionsRun));
    j.key("cycles");
    j.num(static_cast<double>(machine_.cyclesRun));
    j.key("history");
    j.num(static_cast<double>(machine_.history.size()));
    j.endObj();
    return j.done();
  }

  /** A window of memory as numbers, for the memory pane. */
  std::string memory(int at, int count) const {
    jw::Out j;
    j.beginArr();
    for (int i = 0; i < count; i++) {
      j.num(static_cast<double>(machine_.read(static_cast<uint64_t>(at + i), 1)));
    }
    j.endArr();
    return j.done();
  }

  /** How often each address ran, and what it cost. Sorted by cost, because an
   *  unsorted profile is a table nobody reads. */
  std::string profile() const {
    std::vector<std::pair<uint64_t, uint64_t>> rows(machine_.profileCycles.begin(),
                                                    machine_.profileCycles.end());
    std::sort(rows.begin(), rows.end(),
              [](const auto& a, const auto& b) { return a.second > b.second; });

    uint64_t total = 0;
    for (const auto& [address, cycles] : rows) total += cycles;

    jw::Out j;
    j.beginObj();
    j.key("total");
    j.num(static_cast<double>(total));
    j.key("rows");
    j.beginArr();
    for (const auto& [address, cycles] : rows) {
      const auto count = machine_.profileCount.find(address);
      j.beginObj();
      j.key("address");
      j.num(static_cast<double>(address));
      j.key("cycles");
      j.num(static_cast<double>(cycles));
      j.key("count");
      j.num(static_cast<double>(count == machine_.profileCount.end() ? 0 : count->second));
      j.endObj();
    }
    j.endArr();
    j.endObj();
    return j.done();
  }

  std::string cacheState() const {
    const x86::Cache& c = machine_.cache;
    jw::Out j;
    j.beginObj();
    j.key("enabled");
    j.boolean(c.enabled);
    j.key("sets");
    j.num(c.sets);
    j.key("ways");
    j.num(c.ways);
    j.key("lineBytes");
    j.num(c.lineBytes);
    j.key("hits");
    j.num(static_cast<double>(c.hits));
    j.key("misses");
    j.num(static_cast<double>(c.misses));
    j.key("evictions");
    j.num(static_cast<double>(c.evictions));
    j.key("lastLine");
    j.num(c.lastLine);
    j.key("lastHit");
    j.boolean(c.lastHit);
    j.key("lines");
    j.beginArr();
    for (const x86::Cache::Line& line : c.lines) {
      j.beginObj();
      j.key("valid");
      j.boolean(line.valid);
      j.key("tag");
      j.num(static_cast<double>(line.tag));
      j.key("block");
      j.num(static_cast<double>(line.block));
      j.key("dirty");
      j.boolean(line.dirty);
      j.endObj();
    }
    j.endArr();
    j.endObj();
    return j.done();
  }

  std::string pipelineState() const {
    const x86::Pipeline& p = machine_.pipeline;
    jw::Out j;
    j.beginObj();
    j.key("enabled");
    j.boolean(p.enabled);
    j.key("forwarding");
    j.boolean(p.forwarding);
    j.key("predictTaken");
    j.boolean(p.predictTaken);
    j.key("cycles");
    j.num(static_cast<double>(p.cycles));
    j.key("issued");
    j.num(static_cast<double>(p.issued));
    j.key("stallCycles");
    j.num(static_cast<double>(p.stallCycles));
    j.key("flushCycles");
    j.num(static_cast<double>(p.flushCycles));
    j.key("missCycles");
    j.num(static_cast<double>(p.missCycles));
    j.key("recent");
    j.beginArr();
    for (const x86::Pipeline::Slot& s : p.recent) {
      j.beginObj();
      j.key("address");
      j.num(static_cast<double>(s.address));
      j.key("text");
      j.str(s.text);
      j.key("start");
      j.num(s.start);
      j.key("stall");
      j.num(s.stall);
      j.key("flushed");
      j.boolean(s.flushed);
      j.key("why");
      j.str(s.why);
      j.endObj();
    }
    j.endArr();
    j.endObj();
    return j.done();
  }

 private:
  x86::Machine machine_;
};

}  // namespace

EMSCRIPTEN_BINDINGS(machineCore) {
  function("compilePython", &compilePython);
  function("assembleX86", &assembleX86);
  function("disassembleAt", &disassembleAt);
  function("aluDescribe", &alu::describeJson);
  function("aluEvaluate", &alu::evaluateJson);
  function("base64Decode", &sh::base64Decode);

  class_<Cpu>("Cpu")
      .constructor<>()
      .function("loadBytes", &Cpu::loadBytes)
      .function("reset", &Cpu::reset)
      .function("configure", &Cpu::configure)
      .function("step", &Cpu::step)
      .function("undo", &Cpu::undo)
      .function("undoMany", &Cpu::undoMany)
      .function("run", &Cpu::run)
      .function("runChunk", &Cpu::runChunk)
      .function("state", &Cpu::state)
      .function("memory", &Cpu::memory)
      .function("profile", &Cpu::profile)
      .function("cacheState", &Cpu::cacheState)
      .function("pipelineState", &Cpu::pipelineState);
}
