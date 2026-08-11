// A compiler from a subset of Python to x86-64, with every stage kept so the
// UI can show the correspondence: source, tokens, syntax tree, three-address
// intermediate code, and assembly.
//
// The subset, stated exactly, because a compiler that fails vaguely is worse
// than one that refuses clearly:
//
//   values      64-bit integers, booleans, lists of integers, string literals
//               (printable only)
//   operators   + - * // % , comparisons, and/or/not, unary minus
//   statements  assignment, augmented assignment, if/elif/else, while,
//               for x in range(...), for x in <list>, break, continue,
//               def/return, expression statements, pass
//   built-ins   print, len, range
//
// Everything else — classes, imports, dictionaries, sets, tuples, floats,
// comprehensions, generators, exceptions, slices, f-strings, closures — is
// rejected by name, with the line it appeared on.
#pragma once

#include <string>
#include <vector>

namespace py {

struct Token {
  enum Kind { Name, Number, String, Op, Newline, Indent, Dedent, End } kind = End;
  std::string text;
  long long value = 0;
  int line = 0;
  int column = 0;
};

/** One three-address instruction: the classic intermediate form, and the thing
 *  A1.4.1 means by "intermediate code". */
struct Ir {
  std::string op;        // "add", "mov", "call", "label", "jmpIfFalse", ...
  std::string result;
  std::string a;
  std::string b;
  int line = 0;
  std::string text;      // rendered form, e.g. "t3 = t1 * t2"
};

struct Compiled {
  bool ok = false;
  /** "line 7: dictionaries are not supported" — always names the construct. */
  std::string error;
  int errorLine = 0;

  std::vector<Token> tokens;
  std::string tree;              // the syntax tree, indented
  std::vector<Ir> ir;
  std::string assembly;
  /** Maps an assembly line index back to a source line, for the UI. */
  std::vector<int> assemblyToSource;
};

Compiled compile(const std::string& source);

}  // namespace py
