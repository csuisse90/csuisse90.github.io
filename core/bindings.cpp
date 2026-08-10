#include <emscripten/bind.h>

#include "expr.hpp"
#include "logic.hpp"
#include "qm.hpp"
#include "shell.hpp"
#include "json.hpp"

using namespace emscripten;

namespace {

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
  function("globMatch", &sh::globMatch);

  function("minimise", &lg::minimiseJson);
  function("spriteGeometry", &lg::spriteGeometryJson);
  function("analyseExpression", &lg::analyseExpression);
  function("buildFromExpression", &buildFromExpr);
}
