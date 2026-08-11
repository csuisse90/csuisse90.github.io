// The strongest check available: every possible input. An 8-bit ALU has 65,536
// operand pairs, and each of the five operations is compared against plain C++
// arithmetic. If the gates are wired wrongly anywhere, one of these fails.
#include <cstdio>
#include "alu.hpp"

int main() {
  alu::Alu unit = alu::build(8);
  int failures = 0;
  long long checked = 0;

  const alu::Op ops[] = {alu::Op::Add, alu::Op::Sub, alu::Op::And, alu::Op::Or, alu::Op::Xor};
  const char* names[] = {"add", "sub", "and", "or", "xor"};

  for (int o = 0; o < 5; o++) {
    for (int a = 0; a < 256; a++) {
      for (int b = 0; b < 256; b++) {
        const alu::Result r = alu::evaluate(unit, a, b, ops[o]);
        unsigned expect = 0;
        switch (ops[o]) {
          case alu::Op::Add: expect = (a + b) & 0xff; break;
          case alu::Op::Sub: expect = (a - b) & 0xff; break;
          case alu::Op::And: expect = a & b; break;
          case alu::Op::Or: expect = a | b; break;
          case alu::Op::Xor: expect = a ^ b; break;
        }
        checked++;
        if (r.value != expect) {
          if (failures < 5) {
            std::printf("FAIL  %s %d,%d gave %llu want %u\n", names[o], a, b,
                        static_cast<unsigned long long>(r.value), expect);
          }
          failures++;
          continue;
        }
        if (r.zero != (expect == 0)) {
          if (failures < 5) std::printf("FAIL  %s %d,%d zero flag\n", names[o], a, b);
          failures++;
        }
        if (r.sign != ((expect & 0x80) != 0)) {
          if (failures < 5) std::printf("FAIL  %s %d,%d sign flag\n", names[o], a, b);
          failures++;
        }
        if (ops[o] == alu::Op::Add && r.carry != (a + b > 255)) {
          if (failures < 5) std::printf("FAIL  add %d,%d carry\n", a, b);
          failures++;
        }
        if (ops[o] == alu::Op::Sub && r.carry != (a < b)) {
          if (failures < 5) std::printf("FAIL  sub %d,%d borrow\n", a, b);
          failures++;
        }
        if (ops[o] == alu::Op::Add) {
          const int sa = static_cast<signed char>(a);
          const int sb = static_cast<signed char>(b);
          const bool over = sa + sb > 127 || sa + sb < -128;
          if (r.overflow != over) {
            if (failures < 5) std::printf("FAIL  add %d,%d overflow\n", a, b);
            failures++;
          }
        }
      }
    }
  }

  std::printf("checked %lld gate-level operations across %d gates\n", checked,
              unit.circuit.nodeCount());
  std::printf("%s\n", failures ? "FAILURES" : "the gate-level ALU agrees with arithmetic everywhere");
  return failures ? 1 : 0;
}
