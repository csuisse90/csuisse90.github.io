// A buffer overflow that actually overflows, on the real processor.
//
// greet() copies twenty-four bytes into an eight-byte buffer. The eight after
// the buffer are the saved frame pointer; the eight after those are the address
// `ret` will jump to. The payload ends with the address of owned(), which is
// never called from anywhere — and runs anyway.
//
// This is the whole of C's memory-safety problem in thirty lines, and the point
// is that nothing here is a trick: the copy is a normal loop, the return is a
// normal `ret`, and the machine does exactly what it is told.
export const SMASH_SOURCE = `
main:
  push rbp
  mov rbp, rsp
  mov rdi, .payload
  call greet
  mov rdi, .backText
  call print
  hlt

greet:
  push rbp
  mov rbp, rsp
  sub rsp, 16
  lea rdx, [rbp - 8]
  mov rcx, 0
.copy:
  mov al, [rdi + rcx]
  mov [rdx + rcx], al
  inc rcx
  cmp rcx, 24
  jne .copy
  mov rdi, .greetText
  call print
  leave
  ret

owned:
  mov rdi, .ownedText
  call print
  hlt

print:
  mov rsi, rdi
  mov rdx, 0
.measure:
  mov al, [rsi + rdx]
  cmp al, 0
  je .measured
  inc rdx
  jmp .measure
.measured:
  mov rax, 1
  syscall
  ret

.greetText:
  .asciz "hello, whoever you are\\n"
.backText:
  .asciz "back in main, as the source says\\n"
.ownedText:
  .asciz "owned() is running, and nothing calls owned()\\n"
.payload:
  .ascii "AAAAAAAA"
  .quad 0
  .quad owned
`;

/** The same program with the copy bounded, so the two can be run side by side.
 *  The only difference is the number in the cmp. */
export const SAFE_SOURCE = SMASH_SOURCE.replace("cmp rcx, 24", "cmp rcx, 8");
