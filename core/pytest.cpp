// Compiles Python, assembles it, runs it on the x86 core, and checks what it
// printed. End to end — the only test that proves the whole chain agrees.
#include <cstdio>
#include "pycomp.hpp"
#include "x86.hpp"
#include "x86asm.hpp"

static int failures = 0;

static void runs(const char* name, const std::string& source, const std::string& expect) {
  py::Compiled c = py::compile(source);
  if (!c.ok) {
    std::printf("FAIL  %-30s compile: %s\n", name, c.error.c_str());
    failures++;
    return;
  }
  x86::Assembled a = x86::assemble(c.assembly, 0);
  if (!a.error.empty()) {
    std::printf("FAIL  %-30s assemble: %s\n", name, a.error.c_str());
    failures++;
    return;
  }
  x86::Machine m(1 << 17);
  m.load(a.bytes, 0);
  m.regs[x86::RSP] = 0x7000;
  const auto entry = a.labels.find("main");
  m.rip = entry == a.labels.end() ? 0 : entry->second;
  m.run(2'000'000);
  if (!m.fault.empty()) {
    std::printf("FAIL  %-30s fault: %s\n", name, m.fault.c_str());
    failures++;
    return;
  }
  if (m.output != expect) {
    std::printf("FAIL  %-30s got %s want %s\n", name, ("[" + m.output + "]").c_str(),
                ("[" + expect + "]").c_str());
    failures++;
    return;
  }
  std::printf("ok    %-30s %zu instructions\n", name, static_cast<size_t>(m.instructionsRun));
}

static void refuses(const char* name, const std::string& source, const std::string& contains) {
  py::Compiled c = py::compile(source);
  const bool ok = !c.ok && c.error.find(contains) != std::string::npos;
  std::printf("%s  %-30s %s\n", ok ? "ok  " : "FAIL", name,
              c.ok ? "(it compiled)" : c.error.c_str());
  if (!ok) failures++;
}

int main() {
  runs("arithmetic", "x = 3 * 4\nprint(x)\n", "12\n");
  runs("precedence", "print(2 + 3 * 4 - 6 // 2)\n", "11\n");
  runs("negative", "print(0 - 7)\nprint(-7)\n", "-7\n-7\n");
  runs("modulo", "print(17 % 5)\n", "2\n");
  runs("comparison", "print(3 < 4)\nprint(3 > 4)\n", "1\n0\n");
  runs("if", "x = 10\nif x > 5:\n    print(1)\nelse:\n    print(2)\n", "1\n");
  runs("elif", "x = 3\nif x > 5:\n    print(1)\nelif x > 2:\n    print(2)\nelse:\n    print(3)\n", "2\n");
  runs("while", "i = 0\nwhile i < 3:\n    print(i)\n    i = i + 1\n", "0\n1\n2\n");
  runs("augmented", "x = 5\nx += 3\nx *= 2\nprint(x)\n", "16\n");
  runs("for range", "for i in range(3):\n    print(i)\n", "0\n1\n2\n");
  runs("for range 2", "for i in range(2, 5):\n    print(i)\n", "2\n3\n4\n");
  runs("for range down", "for i in range(3, 0, -1):\n    print(i)\n", "3\n2\n1\n");
  runs("break", "for i in range(10):\n    if i == 2:\n        break\n    print(i)\n", "0\n1\n");
  runs("and or", "print(1 and 0)\nprint(0 or 5)\n", "0\n5\n");
  runs("not", "print(not 0)\n", "1\n");
  runs("string", "print(\"hello\")\n", "hello\n");
  runs("list", "xs = [10, 20, 30]\nprint(xs[1])\nprint(len(xs))\n", "20\n3\n");
  runs("list assign", "xs = [1, 2, 3]\nxs[0] = 99\nprint(xs[0])\n", "99\n");
  runs("for list", "for v in [4, 5, 6]:\n    print(v)\n", "4\n5\n6\n");
  runs("function", "def double(n):\n    return n * 2\nprint(double(21))\n", "42\n");
  runs("two args", "def add(a, b):\n    return a + b\nprint(add(3, 4))\n", "7\n");
  runs("recursion",
       "def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(5))\n",
       "120\n");
  runs("fib",
       "def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\nprint(fib(10))\n",
       "55\n");
  runs("sum loop", "total = 0\nfor i in range(1, 11):\n    total += i\nprint(total)\n", "55\n");
  runs("bubble sort",
       "xs = [5, 2, 9, 1]\n"
       "n = len(xs)\n"
       "for i in range(n):\n"
       "    for j in range(n - 1):\n"
       "        if xs[j] > xs[j + 1]:\n"
       "            t = xs[j]\n"
       "            xs[j] = xs[j + 1]\n"
       "            xs[j + 1] = t\n"
       "for v in xs:\n"
       "    print(v)\n",
       "1\n2\n5\n9\n");
  runs("two prints", "print(1, 2)\n", "1 2\n");

  refuses("classes", "class A:\n    pass\n", "classes");
  refuses("imports", "import math\n", "imports");
  refuses("dicts", "d = {}\n", "dictionaries");
  refuses("floats", "x = 1.5\n", "floating-point");
  refuses("true division", "x = 7 / 2\n", "//");
  refuses("undefined name", "print(y)\n", "before it is given a value");
  refuses("unknown function", "foo()\n", "no function called");
  refuses("bad indent", "x = 1\n  y = 2\n", "indent");
  refuses("slices", "xs = [1]\nprint(xs[0:1])\n", "slices");
  refuses("attributes", "xs = [1]\nxs.append(2)\n", "attributes");

  std::printf("\n%s\n", failures ? "FAILURES" : "all compiler checks passed");
  return failures ? 1 : 0;
}
