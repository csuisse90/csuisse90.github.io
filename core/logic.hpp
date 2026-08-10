#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace lg {

enum GateKind {
  kInput = 0,
  kOutput,
  kAnd,
  kOr,
  kNot,
  kNand,
  kNor,
  kXor,
  kXnor,
  kBuffer,
  kConst0,
  kConst1,
};

// Number of input pins a kind accepts by default. Variadic kinds report 2 but
// accept up to kMaxFanIn connections.
int defaultFanIn(GateKind k);
bool isVariadic(GateKind k);
const char* kindName(GateKind k);

constexpr int kMaxFanIn = 8;

struct Node {
  GateKind kind = kAnd;
  std::string label;
  std::vector<int> srcNode;  // per input pin, -1 when unconnected
  std::vector<int> srcPin;   // reserved: all gates have a single output pin
  double x = 0, y = 0;       // author-supplied position, or filled by layout
  bool placed = false;
  int layer = 0;
};

// A combinational-or-sequential gate network. Cycles are permitted: evaluation
// relaxes the network until the signal vector stops changing, which is what
// makes cross-coupled latches representable.
class Circuit {
 public:
  int addNode(int kind, const std::string& label);
  void setPosition(int node, double x, double y);
  // Connects the single output of `from` to pin `pin` of `to`. Growing a
  // variadic gate past its current pin count widens it.
  bool connect(int from, int to, int pin);
  void disconnectPin(int node, int pin);
  void removeNode(int node);
  void clear();

  int nodeCount() const { return static_cast<int>(nodes_.size()); }
  int inputCount() const { return static_cast<int>(inputs_.size()); }
  int outputCount() const { return static_cast<int>(outputs_.size()); }

  // Evaluates with the i-th input node driven by bit i of `mask`
  // (bit 0 is the *last* input, matching truth-table row ordering).
  // Returns one character per node index: '0', '1' or 'x' for undriven.
  std::string evaluate(uint32_t mask);

  // The same simulation, but every intermediate state kept. Each entry is one
  // unit gate delay, so the array *is* the propagation wavefront frame by
  // frame. JSON: { steps: ["xx0", ...], settled: 4, stable: true, glitches: [] }
  std::string trace(uint32_t mask);

  // Settles at `fromMask`, then flips the inputs to `toMask` and records the
  // sweeps that follow. This is what actually happens when a switch is
  // clicked, and it is the only way the classic static hazard shows up: a
  // trace started from an unknown state sees signals arrive, never change.
  std::string traceFrom(uint32_t fromMask, uint32_t toMask);

  // Rows in standard ascending binary order. JSON:
  // { inputs, outputs, rows: [{ in: "01", out: "1", stable: true }], truncated }
  std::string truthTable();

  // Everything the SVG layer needs: node boxes, pin anchors, gate outline
  // paths and routed wire polylines. See layout.cpp.
  std::string geometry(int symbolSet);

  std::string describe() const;
  bool hasCycle() const;

  const std::vector<Node>& nodes() const { return nodes_; }
  const std::vector<int>& inputs() const { return inputs_; }
  const std::vector<int>& outputs() const { return outputs_; }

 private:
  void reindex();
  // One relaxation sweep; returns true when nothing changed.
  bool sweep(std::vector<int8_t>& v) const;
  void driveInputs(std::vector<int8_t>& v, uint32_t mask) const;
  std::string recordSettling(std::vector<int8_t>& v) const;
  int8_t applyGate(const Node& n, const std::vector<int8_t>& v) const;

  std::vector<Node> nodes_;
  std::vector<int> inputs_;   // node indices, in creation order
  std::vector<int> outputs_;  // node indices, in creation order
  bool dirty_ = true;
};

}  // namespace lg
