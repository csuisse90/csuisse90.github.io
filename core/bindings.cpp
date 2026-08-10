#include <emscripten/bind.h>

#include "expr.hpp"
#include "logic.hpp"
#include "qm.hpp"

using namespace emscripten;

namespace {

std::string buildFromExpr(lg::Circuit& c, const std::string& src) {
  return lg::buildFromExpression(c, src);
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

  function("minimise", &lg::minimiseJson);
  function("analyseExpression", &lg::analyseExpression);
  function("buildFromExpression", &buildFromExpr);
}
