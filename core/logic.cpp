#include "logic.hpp"

#include <algorithm>

#include "json.hpp"

namespace lg {

namespace {
constexpr int8_t X = -1;
constexpr int kMaxRelaxSweeps = 64;
constexpr int kMaxTruthInputs = 12;  // 4096 rows; the UI never asks for more
}  // namespace

int defaultFanIn(GateKind k) {
  switch (k) {
    case kInput:
    case kConst0:
    case kConst1:
      return 0;
    case kOutput:
    case kNot:
    case kBuffer:
      return 1;
    default:
      return 2;
  }
}

bool isVariadic(GateKind k) {
  switch (k) {
    case kAnd:
    case kOr:
    case kNand:
    case kNor:
    case kXor:
    case kXnor:
      return true;
    default:
      return false;
  }
}

const char* kindName(GateKind k) {
  switch (k) {
    case kInput: return "INPUT";
    case kOutput: return "OUTPUT";
    case kAnd: return "AND";
    case kOr: return "OR";
    case kNot: return "NOT";
    case kNand: return "NAND";
    case kNor: return "NOR";
    case kXor: return "XOR";
    case kXnor: return "XNOR";
    case kBuffer: return "BUFFER";
    case kConst0: return "0";
    case kConst1: return "1";
  }
  return "?";
}

int Circuit::addNode(int kind, const std::string& label) {
  Node n;
  n.kind = static_cast<GateKind>(kind);
  n.label = label;
  n.srcNode.assign(defaultFanIn(n.kind), -1);
  nodes_.push_back(n);
  dirty_ = true;
  return static_cast<int>(nodes_.size()) - 1;
}

void Circuit::setPosition(int node, double x, double y) {
  if (node < 0 || node >= nodeCount()) return;
  nodes_[node].x = x;
  nodes_[node].y = y;
  nodes_[node].placed = true;
}

bool Circuit::connect(int from, int to, int pin) {
  if (from < 0 || from >= nodeCount() || to < 0 || to >= nodeCount()) return false;
  if (from == to) return false;
  Node& dst = nodes_[to];
  if (defaultFanIn(dst.kind) == 0) return false;
  if (pin < 0) return false;
  if (pin >= static_cast<int>(dst.srcNode.size())) {
    if (!isVariadic(dst.kind) || pin >= kMaxFanIn) return false;
    dst.srcNode.resize(pin + 1, -1);
  }
  dst.srcNode[pin] = from;
  dirty_ = true;
  return true;
}

void Circuit::disconnectPin(int node, int pin) {
  if (node < 0 || node >= nodeCount()) return;
  auto& src = nodes_[node].srcNode;
  if (pin < 0 || pin >= static_cast<int>(src.size())) return;
  src[pin] = -1;
  dirty_ = true;
}

void Circuit::removeNode(int node) {
  if (node < 0 || node >= nodeCount()) return;
  nodes_.erase(nodes_.begin() + node);
  for (Node& n : nodes_) {
    for (int& s : n.srcNode) {
      if (s == node) s = -1;
      else if (s > node) --s;
    }
  }
  dirty_ = true;
}

void Circuit::clear() {
  nodes_.clear();
  inputs_.clear();
  outputs_.clear();
  dirty_ = true;
}

void Circuit::reindex() {
  if (!dirty_) return;
  inputs_.clear();
  outputs_.clear();
  for (int i = 0; i < nodeCount(); ++i) {
    if (nodes_[i].kind == kInput) inputs_.push_back(i);
    if (nodes_[i].kind == kOutput) outputs_.push_back(i);
  }
  dirty_ = false;
}

int8_t Circuit::applyGate(const Node& n, const std::vector<int8_t>& v) const {
  // Reads pin values, treating an unconnected pin as unknown.
  int ones = 0, zeros = 0, unknown = 0, parity = 0;
  for (int s : n.srcNode) {
    int8_t b = (s < 0) ? X : v[s];
    if (b == X) ++unknown;
    else if (b == 1) { ++ones; parity ^= 1; }
    else ++zeros;
  }

  switch (n.kind) {
    case kConst0: return 0;
    case kConst1: return 1;
    case kInput: return X;  // driven externally
    case kOutput:
    case kBuffer:
      return unknown ? X : (ones ? 1 : 0);
    case kNot:
      return unknown ? X : (ones ? 0 : 1);
    // Controlling values resolve a gate even when other pins are unknown,
    // which is what lets cross-coupled latches settle.
    case kAnd:  return zeros ? 0 : (unknown ? X : 1);
    case kNand: return zeros ? 1 : (unknown ? X : 0);
    case kOr:   return ones ? 1 : (unknown ? X : 0);
    case kNor:  return ones ? 0 : (unknown ? X : 1);
    case kXor:  return unknown ? X : static_cast<int8_t>(parity);
    case kXnor: return unknown ? X : static_cast<int8_t>(parity ^ 1);
  }
  return X;
}

// Double-buffered: every gate reads the *previous* state, so one sweep is
// exactly one unit gate delay and the sweep sequence is the real propagation
// wavefront. Evaluating in place would let a signal cross several gates in one
// step, which would both hide the delay and suppress genuine hazard glitches.
bool Circuit::sweep(std::vector<int8_t>& v) const {
  std::vector<int8_t> next = v;
  bool stable = true;
  for (int i = 0; i < nodeCount(); ++i) {
    if (nodes_[i].kind == kInput) continue;
    next[i] = applyGate(nodes_[i], v);
    if (next[i] != v[i]) stable = false;
  }
  v.swap(next);
  return stable;
}

namespace {
std::string render(const std::vector<int8_t>& v) {
  std::string out(v.size(), 'x');
  for (size_t i = 0; i < v.size(); ++i) {
    out[i] = v[i] == 1 ? '1' : (v[i] == 0 ? '0' : 'x');
  }
  return out;
}
}  // namespace

std::string Circuit::evaluate(uint32_t mask) {
  reindex();
  std::vector<int8_t> v(nodeCount(), X);
  const int ni = inputCount();
  for (int i = 0; i < ni; ++i) {
    v[inputs_[i]] = static_cast<int8_t>((mask >> (ni - 1 - i)) & 1u);
  }
  for (int it = 0; it < kMaxRelaxSweeps; ++it) {
    if (sweep(v)) break;
  }
  return render(v);
}

void Circuit::driveInputs(std::vector<int8_t>& v, uint32_t mask) const {
  const int ni = static_cast<int>(inputs_.size());
  for (int i = 0; i < ni; ++i) {
    v[inputs_[i]] = static_cast<int8_t>((mask >> (ni - 1 - i)) & 1u);
  }
}

// Sweeps until nothing changes, recording every intermediate state, and
// serialises the result. Shared by both trace entry points; the only
// difference between them is the state `v` starts in.
std::string Circuit::recordSettling(std::vector<int8_t>& v) const {
  const int n = nodeCount();
  std::vector<std::string> steps{render(v)};
  std::vector<int> transitions(n, 0);
  bool stable = false;

  for (int it = 0; it < kMaxRelaxSweeps; ++it) {
    std::vector<int8_t> before = v;
    stable = sweep(v);
    // The settling sweep changes nothing, so recording it would overstate the
    // propagation delay by one.
    if (stable) break;
    steps.push_back(render(v));
    for (int i = 0; i < n; ++i) {
      // Settling from unknown to a defined level is arrival, not a transition.
      // Only a defined level moving to a different defined level is a glitch.
      if (before[i] != X && v[i] != before[i]) ++transitions[i];
    }
  }

  jw::Out o;
  o.beginObj();
  o.key("steps");
  o.beginArr();
  for (const std::string& s : steps) o.str(s);
  o.endArr();
  o.key("settled");
  o.num(static_cast<int>(steps.size()) - 1);
  o.key("stable");
  o.boolean(stable);
  o.key("glitches");
  o.beginArr();
  for (int i = 0; i < n; ++i) {
    if (transitions[i] > 1) o.num(i);
  }
  o.endArr();
  o.endObj();
  return o.done();
}

std::string Circuit::trace(uint32_t mask) {
  reindex();
  std::vector<int8_t> v(nodeCount(), X);
  driveInputs(v, mask);
  return recordSettling(v);
}

std::string Circuit::traceFrom(uint32_t fromMask, uint32_t toMask) {
  reindex();
  std::vector<int8_t> v(nodeCount(), X);
  driveInputs(v, fromMask);
  for (int it = 0; it < kMaxRelaxSweeps; ++it) {
    if (sweep(v)) break;
  }
  driveInputs(v, toMask);
  return recordSettling(v);
}

bool Circuit::hasCycle() const {
  const int n = nodeCount();
  std::vector<int> state(n, 0);  // 0 unvisited, 1 on stack, 2 done
  std::vector<int> stack;
  for (int start = 0; start < n; ++start) {
    if (state[start]) continue;
    stack.push_back(start);
    while (!stack.empty()) {
      int u = stack.back();
      if (state[u] == 0) state[u] = 1;
      bool descended = false;
      for (int s : nodes_[u].srcNode) {
        if (s < 0) continue;
        if (state[s] == 1) return true;
        if (state[s] == 0) {
          stack.push_back(s);
          descended = true;
          break;
        }
      }
      if (!descended) {
        state[u] = 2;
        stack.pop_back();
      }
    }
  }
  return false;
}

std::string Circuit::truthTable() {
  reindex();
  jw::Out o;
  o.beginObj();

  const int ni = inputCount();
  const int no = outputCount();
  const bool truncated = ni > kMaxTruthInputs;
  const int sweepBits = truncated ? kMaxTruthInputs : ni;

  o.key("inputs");
  o.beginArr();
  for (int i : inputs_) o.str(nodes_[i].label);
  o.endArr();

  o.key("outputs");
  o.beginArr();
  for (int i : outputs_) o.str(nodes_[i].label);
  o.endArr();

  o.key("truncated");
  o.boolean(truncated);

  o.key("rows");
  o.beginArr();
  if (!truncated && ni > 0 && no > 0) {
    const uint32_t rows = 1u << sweepBits;
    for (uint32_t m = 0; m < rows; ++m) {
      std::string v = evaluate(m);
      o.beginObj();
      o.key("in");
      std::string in;
      for (int i = 0; i < ni; ++i) in += ((m >> (ni - 1 - i)) & 1u) ? '1' : '0';
      o.str(in);
      o.key("out");
      std::string out;
      for (int i : outputs_) out += v[i];
      o.str(out);
      o.endObj();
    }
  }
  o.endArr();
  o.endObj();
  return o.done();
}

std::string Circuit::describe() const {
  jw::Out o;
  o.beginObj();
  o.key("nodes");
  o.beginArr();
  for (const Node& n : nodes_) {
    o.beginObj();
    o.key("kind");
    o.str(kindName(n.kind));
    o.key("label");
    o.str(n.label);
    o.key("src");
    o.beginArr();
    for (int s : n.srcNode) o.num(s);
    o.endArr();
    o.endObj();
  }
  o.endArr();
  o.key("cyclic");
  o.boolean(hasCycle());
  o.endObj();
  return o.done();
}

}  // namespace lg
