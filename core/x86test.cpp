// Checks the decoder against bytes assembled by a real assembler, and the
// executor against arithmetic we can verify by hand.
#include <cstdio>
#include <cstring>
#include "x86.hpp"

static int failures = 0;
static void check(bool ok, const std::string& what) {
  std::printf("%s  %s\n", ok ? "ok  " : "FAIL", what.c_str());
  if (!ok) failures++;
}
static void checkText(const std::vector<uint8_t>& bytes, const std::string& expect) {
  x86::Instruction in = x86::decode(bytes, 0);
  const bool ok = in.text == expect && in.length == bytes.size();
  std::printf("%s  %-34s got %-34s len %u/%zu\n", ok ? "ok  " : "FAIL", expect.c_str(),
              in.text.c_str(), in.length, bytes.size());
  if (!ok) failures++;
}

int main() {
  // Encodings taken from real assembler output.
  checkText({0x48, 0x89, 0xe5}, "mov rbp, rsp");
  checkText({0x48, 0x83, 0xec, 0x20}, "sub rsp, 0x20");
  checkText({0xb8, 0x0c, 0x00, 0x00, 0x00}, "mov eax, 0xc");
  checkText({0x48, 0xc7, 0x45, 0xf8, 0x03, 0x00, 0x00, 0x00}, "mov qword ptr [rbp - 0x8], 0x3");
  checkText({0x48, 0x8b, 0x45, 0xf8}, "mov rax, [rbp - 0x8]");
  checkText({0x48, 0x0f, 0xaf, 0x45, 0xf0}, "imul rax, [rbp - 0x10]");
  checkText({0x48, 0x01, 0xd8}, "add rax, rbx");
  checkText({0x48, 0x39, 0xd8}, "cmp rax, rbx");
  checkText({0x0f, 0x8c, 0x10, 0x00, 0x00, 0x00}, "jl 0x16");
  checkText({0x74, 0x05}, "je 0x7");
  checkText({0x55}, "push rbp");
  checkText({0x5d}, "pop rbp");
  checkText({0xc3}, "ret");
  checkText({0xc9}, "leave");
  checkText({0x48, 0x8d, 0x04, 0x9b}, "lea rax, [rbx + rbx*4]");
  checkText({0x0f, 0x9f, 0xc0}, "setg al");
  checkText({0x48, 0x99}, "cqo");
  checkText({0x48, 0xf7, 0xfb}, "idiv rbx");
  checkText({0x0f, 0x05}, "syscall");
  checkText({0xf4}, "hlt");

  // Arithmetic and flags.
  {
    x86::Machine m;
    // mov rax, 6 ; mov rbx, 7 ; imul rax, rbx ; hlt
    std::vector<uint8_t> code = {0x48, 0xc7, 0xc0, 0x06, 0x00, 0x00, 0x00,
                                 0x48, 0xc7, 0xc3, 0x07, 0x00, 0x00, 0x00,
                                 0x48, 0x0f, 0xaf, 0xc3, 0xf4};
    m.load(code, 0);
    m.run(20);
    check(m.regs[x86::RAX] == 42, "6 * 7 is 42");
    check(m.halted, "hlt stops the machine");
  }
  {
    x86::Machine m;
    // mov eax, 5 ; sub eax, 5   -> ZF set
    std::vector<uint8_t> code = {0xb8, 0x05, 0x00, 0x00, 0x00, 0x83, 0xe8, 0x05, 0xf4};
    m.load(code, 0);
    m.run(20);
    check(m.flags.zero, "5 - 5 sets the zero flag");
    check(!m.flags.sign, "5 - 5 leaves the sign flag clear");
  }
  {
    x86::Machine m;
    // mov eax, 0 ; sub eax, 1  -> CF and SF set
    std::vector<uint8_t> code = {0xb8, 0x00, 0x00, 0x00, 0x00, 0x83, 0xe8, 0x01, 0xf4};
    m.load(code, 0);
    m.run(20);
    check(m.flags.carry, "0 - 1 borrows, so CF is set");
    check(m.flags.sign, "0 - 1 is negative, so SF is set");
  }
  {
    // A loop: sum 1..10 in rax.
    x86::Machine m;
    std::vector<uint8_t> code = {
        0x48, 0x31, 0xc0,              // xor rax, rax
        0x48, 0xc7, 0xc1, 0x0a, 0, 0, 0,  // mov rcx, 10
        0x48, 0x01, 0xc8,              // .loop: add rax, rcx
        0x48, 0xff, 0xc9,              // dec rcx
        0x75, 0xf8,                    // jne .loop
        0xf4};
    m.load(code, 0);
    m.run(200);
    check(m.regs[x86::RAX] == 55, "the loop sums 1..10 to 55");
  }
  {
    // The stack: push, pop, call, ret.
    x86::Machine m;
    m.regs[x86::RSP] = 0x1000;
    std::vector<uint8_t> code = {
        0x48, 0xc7, 0xc0, 0x63, 0, 0, 0,  // mov rax, 99
        0x50,                              // push rax
        0x48, 0x31, 0xc0,                  // xor rax, rax
        0x5b,                              // pop rbx
        0xf4};
    m.load(code, 0);
    m.run(50);
    check(m.regs[x86::RBX] == 99, "what was pushed is what is popped");
    check(m.regs[x86::RSP] == 0x1000, "the stack pointer comes back");
  }
  {
    // Micro-operations are recorded in the right order.
    x86::Machine m;
    std::vector<uint8_t> code = {0x48, 0x01, 0xd8, 0xf4};  // add rax, rbx
    m.load(code, 0);
    m.regs[x86::RAX] = 2;
    m.regs[x86::RBX] = 3;
    auto trace = m.step();
    check(trace.size() >= 6, "add rax, rbx takes several micro-operations");
    check(trace[0].kind == x86::Micro::FetchByte, "it begins with a fetch");
    bool sawAlu = false, sawWrite = false;
    for (const auto& s : trace) {
      if (s.kind == x86::Micro::AluOp) sawAlu = true;
      if (s.kind == x86::Micro::WriteRegister) sawWrite = true;
    }
    check(sawAlu && sawWrite, "it computes then writes back");
    check(m.regs[x86::RAX] == 5, "2 + 3 is 5");
  }

  std::printf("\n%s\n", failures ? "FAILURES" : "all x86 checks passed");
  return failures ? 1 : 0;
}
