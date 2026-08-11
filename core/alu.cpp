#include "alu.hpp"

#include "json.hpp"

namespace alu {

namespace {

/** One full adder: sum = a xor b xor carryIn, carryOut = majority(a, b, carryIn).
 *  Written out of gates rather than as arithmetic, because the point is that
 *  addition *is* this. */
struct FullAdder {
  int sum = -1;
  int carryOut = -1;
};

FullAdder fullAdder(lg::Circuit& c, int a, int b, int carryIn, int bit) {
  const std::string tag = std::to_string(bit);

  const int halfSum = c.addNode(lg::kXor, "s" + tag + "a");
  c.connect(a, halfSum, 0);
  c.connect(b, halfSum, 1);

  const int sum = c.addNode(lg::kXor, "sum" + tag);
  c.connect(halfSum, sum, 0);
  c.connect(carryIn, sum, 1);

  const int carryAB = c.addNode(lg::kAnd, "ca" + tag);
  c.connect(a, carryAB, 0);
  c.connect(b, carryAB, 1);

  const int carryHalf = c.addNode(lg::kAnd, "cb" + tag);
  c.connect(halfSum, carryHalf, 0);
  c.connect(carryIn, carryHalf, 1);

  const int carryOut = c.addNode(lg::kOr, "carry" + tag);
  c.connect(carryAB, carryOut, 0);
  c.connect(carryHalf, carryOut, 1);

  return {sum, carryOut};
}

/** A two-input multiplexer from gates: out = (a and not s) or (b and s). */
int mux(lg::Circuit& c, int a, int b, int select, const std::string& tag) {
  const int notSelect = c.addNode(lg::kNot, "n" + tag);
  c.connect(select, notSelect, 0);
  const int left = c.addNode(lg::kAnd, "l" + tag);
  c.connect(a, left, 0);
  c.connect(notSelect, left, 1);
  const int right = c.addNode(lg::kAnd, "r" + tag);
  c.connect(b, right, 0);
  c.connect(select, right, 1);
  const int out = c.addNode(lg::kOr, "m" + tag);
  c.connect(left, out, 0);
  c.connect(right, out, 1);
  return out;
}

}  // namespace

Alu build(int width) {
  Alu unit;
  unit.width = width;
  lg::Circuit& c = unit.circuit;

  // Inputs, low bit first, then the control lines.
  for (int i = 0; i < width; i++) {
    unit.aInputs.push_back(c.addNode(lg::kInput, "a" + std::to_string(i)));
  }
  for (int i = 0; i < width; i++) {
    unit.bInputs.push_back(c.addNode(lg::kInput, "b" + std::to_string(i)));
  }
  unit.subtractNode = c.addNode(lg::kInput, "sub");
  unit.select0Node = c.addNode(lg::kInput, "s0");
  unit.select1Node = c.addNode(lg::kInput, "s1");

  // Subtraction is addition of the complement: invert every bit of b and carry
  // one in. One XOR per bit does the inverting, controlled by the same line
  // that supplies the carry — which is why subtract costs no extra adder.
  std::vector<int> bOperand;
  for (int i = 0; i < width; i++) {
    const int inverted = c.addNode(lg::kXor, "bx" + std::to_string(i));
    c.connect(unit.bInputs[i], inverted, 0);
    c.connect(unit.subtractNode, inverted, 1);
    bOperand.push_back(inverted);
  }

  int carry = unit.subtractNode;  // the carry-in that turns invert into negate
  std::vector<int> sums;
  for (int i = 0; i < width; i++) {
    const FullAdder fa = fullAdder(c, unit.aInputs[i], bOperand[i], carry, i);
    sums.push_back(fa.sum);
    unit.carryNodes.push_back(fa.carryOut);
    carry = fa.carryOut;
  }
  unit.carryOutNode = carry;

  // The logic units, one gate per bit each.
  std::vector<int> ands, ors, xors;
  for (int i = 0; i < width; i++) {
    const int andBit = c.addNode(lg::kAnd, "and" + std::to_string(i));
    c.connect(unit.aInputs[i], andBit, 0);
    c.connect(unit.bInputs[i], andBit, 1);
    ands.push_back(andBit);

    const int orBit = c.addNode(lg::kOr, "or" + std::to_string(i));
    c.connect(unit.aInputs[i], orBit, 0);
    c.connect(unit.bInputs[i], orBit, 1);
    ors.push_back(orBit);

    const int xorBit = c.addNode(lg::kXor, "xor" + std::to_string(i));
    c.connect(unit.aInputs[i], xorBit, 0);
    c.connect(unit.bInputs[i], xorBit, 1);
    xors.push_back(xorBit);
  }

  // Two select lines choose which unit's answer leaves the ALU. Every unit
  // computes on every operation — that is what "combinational" means, and it
  // is why an ALU costs the same time whatever it is asked to do.
  for (int i = 0; i < width; i++) {
    const std::string tag = std::to_string(i);
    const int arithOrAnd = mux(c, sums[i], ands[i], unit.select0Node, "p" + tag);
    const int orOrXor = mux(c, ors[i], xors[i], unit.select0Node, "q" + tag);
    const int chosen = mux(c, arithOrAnd, orOrXor, unit.select1Node, "z" + tag);
    const int out = c.addNode(lg::kOutput, "f" + tag);
    c.connect(chosen, out, 0);
    unit.sumOutputs.push_back(out);
  }

  // Zero is a NOR of every result bit — one gate, and the reason a comparison
  // costs nothing beyond the subtraction it already did.
  const int zero = c.addNode(lg::kNor, "zero");
  for (int i = 0; i < width; i++) c.connect(unit.sumOutputs[i], zero, i);
  const int zeroOut = c.addNode(lg::kOutput, "ZF");
  c.connect(zero, zeroOut, 0);
  unit.zeroNode = zeroOut;

  const int signOut = c.addNode(lg::kOutput, "SF");
  c.connect(unit.sumOutputs[width - 1], signOut, 0);
  unit.signNode = signOut;

  const int carryOut = c.addNode(lg::kOutput, "CF");
  c.connect(unit.carryOutNode, carryOut, 0);
  unit.carryOutNode = carryOut;

  // Signed overflow is the XOR of the last two carries: the sign changed when
  // it should not have.
  const int overflow = c.addNode(lg::kXor, "of");
  c.connect(unit.carryNodes[width - 1], overflow, 0);
  c.connect(unit.carryNodes[width - 2], overflow, 1);
  const int overflowOut = c.addNode(lg::kOutput, "OF");
  c.connect(overflow, overflowOut, 0);
  unit.overflowNode = overflowOut;

  return unit;
}

namespace {

/** The ALU's inputs in the order Circuit::evaluate expects: bit 0 of the mask
 *  drives the *last* input node, matching truth-table row order. */
uint32_t maskFor(const Alu& unit, uint64_t a, uint64_t b, Op op) {
  const int width = unit.width;
  const int inputs = width * 2 + 3;
  uint32_t mask = 0;

  auto set = [&](int inputIndex, bool value) {
    if (!value) return;
    mask |= 1u << (inputs - 1 - inputIndex);
  };

  for (int i = 0; i < width; i++) set(i, (a >> i) & 1);
  for (int i = 0; i < width; i++) set(width + i, (b >> i) & 1);

  const bool subtract = op == Op::Sub;
  const bool s0 = op == Op::And || op == Op::Xor;
  const bool s1 = op == Op::Or || op == Op::Xor;
  set(width * 2, subtract);
  set(width * 2 + 1, s0);
  set(width * 2 + 2, s1);
  return mask;
}

}  // namespace

Result evaluate(Alu& unit, uint64_t a, uint64_t b, Op op) {
  const std::string states = unit.circuit.evaluate(maskFor(unit, a, b, op));

  Result r;
  for (int i = 0; i < unit.width; i++) {
    if (states[static_cast<size_t>(unit.sumOutputs[i])] == '1') r.value |= 1ull << i;
  }
  r.carry = states[static_cast<size_t>(unit.carryOutNode)] == '1';
  r.zero = states[static_cast<size_t>(unit.zeroNode)] == '1';
  r.sign = states[static_cast<size_t>(unit.signNode)] == '1';
  r.overflow = states[static_cast<size_t>(unit.overflowNode)] == '1';

  // Subtraction's carry-out is a borrow inverted, which is the convention x86
  // reports. The gates produce the carry; the meaning is ours to state.
  if (op == Op::Sub) r.carry = !r.carry;
  if (op != Op::Add && op != Op::Sub) {
    r.carry = false;
    r.overflow = false;
  }
  return r;
}

std::string evaluateJson(int width, uint64_t a, uint64_t b, int op) {
  Alu unit = build(width);
  const uint32_t mask = maskFor(unit, a, b, static_cast<Op>(op));
  const std::string trace = unit.circuit.trace(mask);
  const Result r = evaluate(unit, a, b, static_cast<Op>(op));

  jw::Out j;
  j.beginObj();
  j.key("value");
  j.num(static_cast<double>(r.value));
  j.key("carry");
  j.boolean(r.carry);
  j.key("zero");
  j.boolean(r.zero);
  j.key("sign");
  j.boolean(r.sign);
  j.key("overflow");
  j.boolean(r.overflow);
  j.key("width");
  j.num(width);
  j.key("trace");
  j.raw(trace);
  j.endObj();
  return j.done();
}

std::string describeJson(int width) {
  Alu unit = build(width);
  return unit.circuit.describe();
}

}  // namespace alu
