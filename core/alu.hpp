// The ALU, built out of individual gates rather than described in C++.
//
// This is the layer that joins A1.2 to A1.1: the add the processor performs is
// not a primitive, it is a chain of full adders, and the carry has to ripple
// through all of them before the answer is right. Building it from the same
// gate engine the lessons use means the delay the timing view shows is the
// delay the simulation actually took.
//
// Eight bits wide by default. A 64-bit version is the same picture with 64
// copies of the same slice, and cannot be usefully drawn.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "logic.hpp"

namespace alu {

/** What the control unit asks the ALU to do. The numbering matches the two
 *  select lines in the drawing. */
enum class Op : uint8_t { Add = 0, Sub = 1, And = 2, Or = 3, Xor = 4 };

struct Result {
  uint64_t value = 0;
  bool carry = false;
  bool zero = false;
  bool sign = false;
  bool overflow = false;
  /** Gate delays taken to settle — the ripple, counted rather than asserted. */
  int delay = 0;
};

/** The gate network, plus the node indices a caller needs to drive it. */
struct Alu {
  lg::Circuit circuit;
  int width = 8;
  std::vector<int> aInputs;    // low bit first
  std::vector<int> bInputs;
  std::vector<int> select0 = {};
  int select0Node = -1;
  int select1Node = -1;
  int subtractNode = -1;
  std::vector<int> sumOutputs;
  int carryOutNode = -1;
  int zeroNode = -1;
  int signNode = -1;
  int overflowNode = -1;
  /** Every carry wire, so the ripple can be shown arriving bit by bit. */
  std::vector<int> carryNodes;
};

/** Builds an `width`-bit ALU. */
Alu build(int width = 8);

/** Drives the network and reads the answer out of it. Nothing here computes
 *  the result in C++ — it is whatever the gates settle to. */
Result evaluate(Alu& unit, uint64_t a, uint64_t b, Op op);

/** The same, as JSON, for the browser: result, flags, delay, and the state of
 *  every node so the drawing can be coloured. */
std::string evaluateJson(int width, uint64_t a, uint64_t b, int op);

/** The gate network itself, for drawing: nodes, positions and wires. */
std::string describeJson(int width);

}  // namespace alu
