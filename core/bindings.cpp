#include <emscripten/bind.h>

#include "expr.hpp"
#include "logic.hpp"
#include "qm.hpp"
#include "shell.hpp"
#include "json.hpp"
#include "alu.hpp"
#include "pycomp.hpp"
#include "x86.hpp"
#include "x86asm.hpp"

using namespace emscripten;

namespace {


// ---- the vertical machine: Python down to gates ---------------------------

/** Compiles Python and returns every stage, so the panes can be filled from
 *  one call rather than five. */
std::string compilePython(const std::string& source) {
  const py::Compiled c = py::compile(source);
  jw::Out j;
  j.beginObj();
  j.key("ok");
  j.boolean(c.ok);
  j.key("error");
  j.str(c.error);
  j.key("errorLine");
  j.num(c.errorLine);

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

  void run(int budget) { machine_.run(static_cast<uint64_t>(budget)); }

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

 private:
  x86::Machine machine_;
};

std::string buildFromExpr(lg::Circuit& c, const std::string& src) {
  return lg::buildFromExpression(c, src);
}

std::string fsExpand(const sh::Fs& fs, const std::string& argument) {
  jw::Out j;
  j.beginArr();
  for (const auto& p : fs.expand(argument)) j.str(p);
  j.endArr();
  return j.done();
}

std::string fsComplete(const sh::Fs& fs, const std::string& prefix) {
  jw::Out j;
  j.beginArr();
  for (const auto& p : fs.complete(prefix)) j.str(p);
  j.endArr();
  return j.done();
}

std::string fsGrep(const sh::Fs& fs, const std::string& pattern, const std::string& pathsCsv,
                   bool ignoreCase, bool invert) {
  std::vector<std::string> paths;
  std::string current;
  for (char c : pathsCsv) {
    if (c == '\n') {
      if (!current.empty()) paths.push_back(current);
      current.clear();
    } else {
      current += c;
    }
  }
  if (!current.empty()) paths.push_back(current);

  jw::Out j;
  j.beginArr();
  for (const auto& line : sh::grep(fs, pattern, paths, ignoreCase, invert)) j.str(line);
  j.endArr();
  return j.done();
}

std::string shTokenise(const std::string& line) {
  jw::Out j;
  j.beginArr();
  for (const auto& w : sh::tokenise(line)) j.str(w);
  j.endArr();
  return j.done();
}

/** The text tools all return a JSON array of lines, so the shell can join them
 *  however it likes without another parse on the C++ side. */
std::string jsonLines(const std::vector<std::string>& lines) {
  jw::Out j;
  j.beginArr();
  for (const std::string& line : lines) j.str(line);
  j.endArr();
  return j.done();
}

std::string textSort(const std::string& text, bool reverse, bool numeric) {
  return jsonLines(sh::sortLines(sh::lines(text), reverse, numeric));
}

std::string textUniq(const std::string& text, bool withCounts) {
  return jsonLines(sh::uniqueLines(sh::lines(text), withCounts));
}

std::string textNumber(const std::string& text) {
  return jsonLines(sh::numberLines(sh::lines(text)));
}

std::string textReverse(const std::string& text) {
  return jsonLines(sh::reverseLines(sh::lines(text)));
}

std::string textCut(const std::string& text, const std::string& delimiter, int field) {
  char d = delimiter.empty() ? '\t' : delimiter[0];
  return jsonLines(sh::cutFields(sh::lines(text), d, field < 1 ? 1 : static_cast<size_t>(field)));
}

std::string textHexDump(const std::string& text) { return jsonLines(sh::hexDump(text)); }

std::string shCount(const std::string& text) {
  sh::Counts c = sh::count(text);
  jw::Out j;
  j.beginObj();
  j.key("lines");
  j.num(static_cast<double>(c.lines));
  j.key("words");
  j.num(static_cast<double>(c.words));
  j.key("chars");
  j.num(static_cast<double>(c.chars));
  j.endObj();
  return j.done();
}

}  // namespace

EMSCRIPTEN_BINDINGS(logicCore) {
  class_<lg::Circuit>("Circuit")
      .constructor<>()
      .function("addNode", &lg::Circuit::addNode)
      .function("setPosition", &lg::Circuit::setPosition)
      .function("connect", &lg::Circuit::connect)
      .function("disconnectPin", &lg::Circuit::disconnectPin)
      .function("removeNode", &lg::Circuit::removeNode)
      .function("clear", &lg::Circuit::clear)
      .function("nodeCount", &lg::Circuit::nodeCount)
      .function("inputCount", &lg::Circuit::inputCount)
      .function("outputCount", &lg::Circuit::outputCount)
      .function("hasCycle", &lg::Circuit::hasCycle)
      .function("evaluate", &lg::Circuit::evaluate)
      .function("trace", &lg::Circuit::trace)
      .function("traceFrom", &lg::Circuit::traceFrom)
      .function("truthTable", &lg::Circuit::truthTable)
      .function("geometry", &lg::Circuit::geometry)
      .function("describe", &lg::Circuit::describe);

  class_<sh::Fs>("Fs")
      .constructor<>()
      .function("resolve", &sh::Fs::resolve)
      .function("exists", &sh::Fs::exists)
      .function("isDirectory", &sh::Fs::isDirectory)
      .function("cwd", &sh::Fs::cwd)
      .function("chdir", &sh::Fs::chdir)
      .function("read", &sh::Fs::read)
      .function("write", &sh::Fs::write)
      .function("append", &sh::Fs::append)
      .function("makeDirectory", &sh::Fs::makeDirectory)
      .function("remove", &sh::Fs::remove)
      .function("move", &sh::Fs::move)
      .function("copy", &sh::Fs::copy)
      .function("listJson", &sh::Fs::listJson)
      .function("treeJson", &sh::Fs::treeJson)
      .function("statJson", &sh::Fs::statJson)
      .function("dumpJson", &sh::Fs::dumpJson)
      .function("loadJson", &sh::Fs::loadJson);

  function("fsExpand", &fsExpand);
  function("fsComplete", &fsComplete);
  function("fsGrep", &fsGrep);
  function("shTokenise", &shTokenise);
  function("shCount", &shCount);
  function("textSort", &textSort);
  function("textUniq", &textUniq);
  function("textNumber", &textNumber);
  function("textReverse", &textReverse);
  function("textCut", &textCut);
  function("textHexDump", &textHexDump);
  function("base64Encode", &sh::base64Encode);
  function("base64Decode", &sh::base64Decode);
  function("globMatch", &sh::globMatch);

  function("minimise", &lg::minimiseJson);
  function("spriteGeometry", &lg::spriteGeometryJson);
  function("analyseExpression", &lg::analyseExpression);
  function("buildFromExpression", &buildFromExpr);

  function("compilePython", &compilePython);
  function("assembleX86", &assembleX86);
  function("disassembleAt", &disassembleAt);
  function("aluDescribe", &alu::describeJson);
  function("aluEvaluate", &alu::evaluateJson);

  class_<Cpu>("Cpu")
      .constructor<>()
      .function("loadBytes", &Cpu::loadBytes)
      .function("reset", &Cpu::reset)
      .function("step", &Cpu::step)
      .function("run", &Cpu::run)
      .function("state", &Cpu::state)
      .function("memory", &Cpu::memory);
}
