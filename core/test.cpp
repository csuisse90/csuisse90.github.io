// Native sanity checks for the engine, so the C++ can be verified without an
// emscripten toolchain.  Build: see core/build.sh --test
#include <cstdio>
#include <cstdlib>
#include <string>

#include "expr.hpp"
#include "logic.hpp"
#include "qm.hpp"

namespace {

int failures = 0;

void check(bool cond, const std::string& what) {
  if (!cond) {
    std::printf("FAIL  %s\n", what.c_str());
    ++failures;
  } else {
    std::printf("ok    %s\n", what.c_str());
  }
}

bool contains(const std::string& h, const std::string& needle) {
  return h.find(needle) != std::string::npos;
}

void testGates() {
  for (int kind = lg::kAnd; kind <= lg::kXnor; ++kind) {
    if (kind == lg::kNot) continue;
    lg::Circuit c;
    int a = c.addNode(lg::kInput, "A");
    int b = c.addNode(lg::kInput, "B");
    int g = c.addNode(kind, lg::kindName(static_cast<lg::GateKind>(kind)));
    int q = c.addNode(lg::kOutput, "Q");
    c.connect(a, g, 0);
    c.connect(b, g, 1);
    c.connect(g, q, 0);

    std::string expected;
    switch (kind) {
      case lg::kAnd:  expected = "0001"; break;
      case lg::kOr:   expected = "0111"; break;
      case lg::kNand: expected = "1110"; break;
      case lg::kNor:  expected = "1000"; break;
      case lg::kXor:  expected = "0110"; break;
      case lg::kXnor: expected = "1001"; break;
      default: break;
    }
    std::string got;
    for (unsigned m = 0; m < 4; ++m) got += c.evaluate(m)[q];
    check(got == expected,
          std::string(lg::kindName(static_cast<lg::GateKind>(kind))) +
              " truth column " + got + " == " + expected);
  }

  lg::Circuit c;
  int a = c.addNode(lg::kInput, "A");
  int g = c.addNode(lg::kNot, "NOT");
  int q = c.addNode(lg::kOutput, "Q");
  c.connect(a, g, 0);
  c.connect(g, q, 0);
  check(c.evaluate(0)[q] == '1' && c.evaluate(1)[q] == '0', "NOT inverts");
}

void testPropagationDelay() {
  // A chain of three inverters must take three gate delays to settle.
  lg::Circuit c;
  int a = c.addNode(lg::kInput, "A");
  int prev = a;
  for (int i = 0; i < 3; ++i) {
    int g = c.addNode(lg::kNot, "NOT");
    c.connect(prev, g, 0);
    prev = g;
  }
  int q = c.addNode(lg::kOutput, "Q");
  c.connect(prev, q, 0);
  std::string t = c.trace(1);
  check(contains(t, "\"settled\":4"), "3 inverters + output settle in 4 delays");
  check(c.evaluate(1)[q] == '0', "odd inverter chain inverts");
}

void testHalfAdder() {
  lg::Circuit c;
  int a = c.addNode(lg::kInput, "A");
  int b = c.addNode(lg::kInput, "B");
  int x = c.addNode(lg::kXor, "XOR");
  int n = c.addNode(lg::kAnd, "AND");
  int s = c.addNode(lg::kOutput, "S");
  int co = c.addNode(lg::kOutput, "C");
  c.connect(a, x, 0);
  c.connect(b, x, 1);
  c.connect(a, n, 0);
  c.connect(b, n, 1);
  c.connect(x, s, 0);
  c.connect(n, co, 0);
  std::string sum, carry;
  for (unsigned m = 0; m < 4; ++m) {
    std::string v = c.evaluate(m);
    sum += v[s];
    carry += v[co];
  }
  check(sum == "0110" && carry == "0001", "half adder sum/carry");
  check(contains(c.truthTable(), "\"inputs\":[\"A\",\"B\"]"), "truth table names inputs");
}

void testLatch() {
  // Cross-coupled NOR SR latch: setting S must drive Q high and hold.
  lg::Circuit c;
  int s = c.addNode(lg::kInput, "S");
  int r = c.addNode(lg::kInput, "R");
  int n1 = c.addNode(lg::kNor, "NOR");
  int n2 = c.addNode(lg::kNor, "NOR");
  c.connect(r, n1, 0);
  c.connect(n2, n1, 1);
  c.connect(n1, n2, 0);
  c.connect(s, n2, 1);
  // n1 is fed by R, so n1 carries Q and n2 carries Q-bar.
  check(c.hasCycle(), "latch is detected as cyclic");
  check(c.evaluate(0b10)[n1] == '1', "S=1,R=0 sets Q high");
  check(c.evaluate(0b10)[n2] == '0', "S=1,R=0 drives Q-bar low");
  check(c.evaluate(0b01)[n1] == '0', "S=0,R=1 resets Q low");
  check(c.evaluate(0b11)[n1] == '0' && c.evaluate(0b11)[n2] == '0',
        "S=R=1 forces both outputs low, the forbidden state");
  check(c.evaluate(0b00)[n1] == 'x', "S=0,R=0 holds an indeterminate stored state");
}

void testMinimise() {
  // F(A,B,C) = Sigma(0,1,2,3) reduces to NOT A.
  std::string j = lg::minimiseJson(3, "A,B,C", "0,1,2,3", "");
  check(contains(j, "\"sopLatex\":\"\\\\overline{A}\""), "Sigma(0,1,2,3) minimises to A'");

  // The classic four-variable case with don't-cares.
  std::string k = lg::minimiseJson(4, "A,B,C,D", "0,1,2,8,9,10", "");
  check(contains(k, "sopLatex"), "four-variable minimisation produces a result");

  std::string all = lg::minimiseJson(2, "A,B", "0,1,2,3", "");
  check(contains(all, "\"constantOne\":true"), "a full map minimises to 1");

  std::string none = lg::minimiseJson(2, "A,B", "", "");
  check(contains(none, "\"constantZero\":true"), "an empty map minimises to 0");
}

void testExpressions() {
  lg::Expr e = lg::parseExpression("AB + C");
  check(e.ok && e.vars.size() == 3, "AB + C parses with three variables");
  check(lg::evalExpr(e, e.root, 0b110) == 1, "A=1,B=1,C=0 gives 1");
  check(lg::evalExpr(e, e.root, 0b100) == 0, "A=1,B=0,C=0 gives 0");

  lg::Expr p = lg::parseExpression("A'.B + NOT C");
  check(p.ok, "prime and NOT keyword both parse");

  lg::Expr d = lg::parseExpression("(A+B)'");
  check(d.ok && contains(lg::exprToLatex(d, d.root), "\\overline{A + B}"),
        "De Morgan input renders with an overbar");

  lg::Expr bad = lg::parseExpression("A +");
  check(!bad.ok, "a dangling operator is rejected");

  lg::Expr unmatched = lg::parseExpression("(A+B");
  check(!unmatched.ok, "an unclosed bracket is rejected");

  std::string a = lg::analyseExpression("A xor B");
  check(contains(a, "\"minterms\":[1,2]"), "XOR analysis yields minterms 1 and 2");
  // The nested minimisation object is spliced in raw, so the comma that
  // follows it is the easiest separator in the whole writer to lose.
  check(contains(a, "},\"gateCount\""),
        "nested minimisation is followed by a separating comma");

  // An expression built into gates must agree with direct evaluation.
  lg::Circuit c;
  check(lg::buildFromExpression(c, "A.B + C").empty(), "expression builds a circuit");
  lg::Expr ref = lg::parseExpression("A.B + C");
  bool agree = true;
  const int out = c.nodeCount() - 1;
  for (unsigned m = 0; m < 8; ++m) {
    char got = c.evaluate(m)[out];
    if ((got == '1') != (lg::evalExpr(ref, ref.root, m) == 1)) agree = false;
  }
  check(agree, "built circuit matches the expression on all 8 rows");
}

void testGeometry() {
  lg::Circuit c;
  lg::buildFromExpression(c, "A.B");
  std::string g = c.geometry(0);
  check(contains(g, "\"width\""), "geometry reports a view box");
  // A two-input body is 52 tall, so the semicircle radius must be exactly 26.
  check(contains(g, "A26,26 0 0 1"), "AND outline uses a true h/2 semicircle");
  std::string iec = c.geometry(1);
  check(contains(iec, "\"iecLabel\":\"&\""), "IEC symbol set labels AND with &");
}

}  // namespace

int main() {
  testGates();
  testPropagationDelay();
  testHalfAdder();
  testLatch();
  testMinimise();
  testExpressions();
  testGeometry();
  std::printf("\n%s\n", failures ? "FAILURES" : "all checks passed");
  return failures ? 1 : 0;
}
