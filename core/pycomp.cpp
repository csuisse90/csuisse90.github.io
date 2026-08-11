#include "pycomp.hpp"

#include <cctype>
#include <cstdio>
#include <map>
#include <memory>
#include <set>
#include <stdexcept>

namespace py {

namespace {

struct Failure {
  std::string message;
  int line;
};

[[noreturn]] void fail(int line, const std::string& message) { throw Failure{message, line}; }

// ------------------------------------------------------------------- lexing

const std::set<std::string> KEYWORDS = {"if", "elif", "else", "while", "for", "in", "def",
                                        "return", "and", "or", "not", "break", "continue",
                                        "pass", "True", "False", "None"};

/** Constructs this compiler will not accept. Naming them here means the error
 *  says what the student wrote rather than "unexpected token". */
const std::map<std::string, std::string> REFUSED = {
    {"class", "classes"},        {"import", "imports"},      {"from", "imports"},
    {"lambda", "lambdas"},       {"yield", "generators"},    {"try", "exception handling"},
    {"except", "exception handling"}, {"finally", "exception handling"},
    {"raise", "raising exceptions"},  {"with", "context managers"},
    {"global", "the global statement"}, {"nonlocal", "the nonlocal statement"},
    {"assert", "assert"},        {"del", "del"},             {"async", "async"},
    {"await", "await"},
};

std::vector<Token> lex(const std::string& source) {
  std::vector<Token> out;
  std::vector<int> indents{0};
  size_t i = 0;
  int line = 1;
  bool atLineStart = true;

  auto push = [&](Token::Kind kind, const std::string& text, long long value = 0) {
    Token t;
    t.kind = kind;
    t.text = text;
    t.value = value;
    t.line = line;
    out.push_back(t);
  };

  while (i < source.size()) {
    if (atLineStart) {
      int width = 0;
      size_t start = i;
      while (i < source.size() && (source[i] == ' ' || source[i] == '\t')) {
        width += source[i] == '\t' ? 8 - (width % 8) : 1;
        i++;
      }
      // A blank or comment-only line has no indentation to speak of.
      if (i >= source.size() || source[i] == '\n' || source[i] == '#') {
        while (i < source.size() && source[i] != '\n') i++;
        if (i < source.size()) {
          i++;
          line++;
        }
        continue;
      }
      (void)start;
      if (width > indents.back()) {
        indents.push_back(width);
        push(Token::Indent, "");
      } else {
        while (width < indents.back()) {
          indents.pop_back();
          push(Token::Dedent, "");
        }
        if (width != indents.back()) fail(line, "the indentation does not line up with any block");
      }
      atLineStart = false;
      continue;
    }

    const char c = source[i];

    if (c == '\n') {
      push(Token::Newline, "");
      i++;
      line++;
      atLineStart = true;
      continue;
    }
    if (c == '#') {
      while (i < source.size() && source[i] != '\n') i++;
      continue;
    }
    if (std::isspace(static_cast<unsigned char>(c))) {
      i++;
      continue;
    }

    if (std::isdigit(static_cast<unsigned char>(c))) {
      size_t start = i;
      while (i < source.size() && (std::isalnum(static_cast<unsigned char>(source[i])) ||
                                   source[i] == '_' || source[i] == '.')) {
        i++;
      }
      const std::string text = source.substr(start, i - start);
      if (text.find('.') != std::string::npos) {
        fail(line, "floating-point numbers are not supported; this machine works in integers");
      }
      push(Token::Number, text, std::strtoll(text.c_str(), nullptr, 0));
      continue;
    }

    if (std::isalpha(static_cast<unsigned char>(c)) || c == '_') {
      size_t start = i;
      while (i < source.size() &&
             (std::isalnum(static_cast<unsigned char>(source[i])) || source[i] == '_')) {
        i++;
      }
      const std::string text = source.substr(start, i - start);
      const auto refused = REFUSED.find(text);
      if (refused != REFUSED.end()) {
        fail(line, refused->second + " are not supported by this compiler");
      }
      push(Token::Name, text);
      continue;
    }

    if (c == '"' || c == '\'') {
      const char quote = c;
      i++;
      std::string text;
      while (i < source.size() && source[i] != quote) {
        if (source[i] == '\\' && i + 1 < source.size()) {
          const char next = source[++i];
          text += next == 'n' ? '\n' : next == 't' ? '\t' : next;
        } else {
          text += source[i];
        }
        i++;
      }
      if (i >= source.size()) fail(line, "a string is missing its closing quote");
      i++;
      push(Token::String, text);
      continue;
    }

    // Operators, longest first.
    static const std::vector<std::string> OPS = {"//=", "**", "//", "==", "!=", "<=", ">=",
                                                 "+=", "-=", "*=", "/=", "%=",
                                                 "(", ")", "[", "]", "{", "}", ",", ":", ".",
                                                 "+", "-", "*", "/", "%", "<", ">", "="};
    bool matched = false;
    for (const std::string& op : OPS) {
      if (source.compare(i, op.size(), op) == 0) {
        if (op == "**") fail(line, "the ** operator is not supported; multiply in a loop");
        if (op == "{") fail(line, "dictionaries and sets are not supported");
        push(Token::Op, op);
        i += op.size();
        matched = true;
        break;
      }
    }
    if (matched) continue;

    fail(line, std::string("this character means nothing here: '") + c + "'");
  }

  if (!out.empty() && out.back().kind != Token::Newline) push(Token::Newline, "");
  while (indents.size() > 1) {
    indents.pop_back();
    push(Token::Dedent, "");
  }
  push(Token::End, "");
  return out;
}

// ------------------------------------------------------------------ parsing

struct Node;
using NodePtr = std::unique_ptr<Node>;

struct Node {
  std::string kind;         // "num", "name", "str", "binary", "unary", "call", "index",
                            // "list", "assign", "if", "while", "for", "def", "return", ...
  std::string text;         // operator, name, or string value
  long long value = 0;
  int line = 0;
  std::vector<NodePtr> children;
};

NodePtr make(const std::string& kind, int line) {
  auto n = std::make_unique<Node>();
  n->kind = kind;
  n->line = line;
  return n;
}

struct Parser {
  const std::vector<Token>& tokens;
  size_t at = 0;

  const Token& peek(size_t ahead = 0) const {
    return tokens[std::min(at + ahead, tokens.size() - 1)];
  }
  bool isOp(const std::string& op) const {
    return peek().kind == Token::Op && peek().text == op;
  }
  bool isName(const std::string& name) const {
    return peek().kind == Token::Name && peek().text == name;
  }
  const Token& take() { return tokens[at++]; }
  void expectOp(const std::string& op) {
    if (!isOp(op)) fail(peek().line, "expected '" + op + "' here");
    at++;
  }
  void expectNewline() {
    if (peek().kind != Token::Newline) fail(peek().line, "expected the end of the line");
    at++;
  }

  NodePtr parseBlock() {
    auto block = make("block", peek().line);
    if (peek().kind != Token::Indent) fail(peek().line, "expected an indented block");
    at++;
    while (peek().kind != Token::Dedent && peek().kind != Token::End) {
      block->children.push_back(parseStatement());
    }
    if (peek().kind == Token::Dedent) at++;
    return block;
  }

  NodePtr parseStatement() {
    const Token& t = peek();

    if (t.kind == Token::Name && t.text == "if") return parseIf();
    if (t.kind == Token::Name && t.text == "while") return parseWhile();
    if (t.kind == Token::Name && t.text == "for") return parseFor();
    if (t.kind == Token::Name && t.text == "def") return parseDef();

    if (t.kind == Token::Name && (t.text == "break" || t.text == "continue" || t.text == "pass")) {
      auto n = make(t.text, t.line);
      at++;
      expectNewline();
      return n;
    }

    if (t.kind == Token::Name && t.text == "return") {
      auto n = make("return", t.line);
      at++;
      if (peek().kind != Token::Newline) n->children.push_back(parseExpression());
      expectNewline();
      return n;
    }

    // Assignment, augmented assignment, or a bare expression.
    NodePtr target = parseExpression();
    if (isOp("=")) {
      const int line = peek().line;
      at++;
      auto n = make("assign", line);
      n->children.push_back(std::move(target));
      n->children.push_back(parseExpression());
      expectNewline();
      return n;
    }
    for (const std::string& op : {"+=", "-=", "*=", "//=", "%="}) {
      if (isOp(op)) {
        const int line = peek().line;
        at++;
        auto n = make("augassign", line);
        n->text = op.substr(0, op.size() - 1);
        n->children.push_back(std::move(target));
        n->children.push_back(parseExpression());
        expectNewline();
        return n;
      }
    }
    if (isOp("/=")) fail(peek().line, "/= gives a float; use //= for integer division");

    auto n = make("expressionStatement", t.line);
    n->children.push_back(std::move(target));
    expectNewline();
    return n;
  }

  NodePtr parseIf() {
    auto n = make("if", peek().line);
    at++;  // if / elif
    n->children.push_back(parseExpression());
    expectOp(":");
    expectNewline();
    n->children.push_back(parseBlock());
    if (isName("elif")) {
      auto wrapper = make("block", peek().line);
      wrapper->children.push_back(parseIf());
      n->children.push_back(std::move(wrapper));
    } else if (isName("else")) {
      at++;
      expectOp(":");
      expectNewline();
      n->children.push_back(parseBlock());
    }
    return n;
  }

  NodePtr parseWhile() {
    auto n = make("while", peek().line);
    at++;
    n->children.push_back(parseExpression());
    expectOp(":");
    expectNewline();
    n->children.push_back(parseBlock());
    return n;
  }

  NodePtr parseFor() {
    auto n = make("for", peek().line);
    at++;
    if (peek().kind != Token::Name) fail(peek().line, "expected a loop variable");
    n->text = take().text;
    if (!isName("in")) fail(peek().line, "expected 'in'");
    at++;
    n->children.push_back(parseExpression());
    expectOp(":");
    expectNewline();
    n->children.push_back(parseBlock());
    return n;
  }

  NodePtr parseDef() {
    auto n = make("def", peek().line);
    at++;
    if (peek().kind != Token::Name) fail(peek().line, "expected a function name");
    n->text = take().text;
    expectOp("(");
    auto params = make("params", peek().line);
    while (!isOp(")")) {
      if (peek().kind != Token::Name) fail(peek().line, "expected a parameter name");
      auto p = make("param", peek().line);
      p->text = take().text;
      if (isOp("=")) fail(peek().line, "default arguments are not supported");
      params->children.push_back(std::move(p));
      if (isOp(",")) at++;
    }
    expectOp(")");
    expectOp(":");
    expectNewline();
    n->children.push_back(std::move(params));
    n->children.push_back(parseBlock());
    return n;
  }

  // Precedence, loosest first.
  NodePtr parseExpression() { return parseOr(); }

  NodePtr parseOr() {
    NodePtr left = parseAnd();
    while (isName("or")) {
      const int line = peek().line;
      at++;
      auto n = make("or", line);
      n->children.push_back(std::move(left));
      n->children.push_back(parseAnd());
      left = std::move(n);
    }
    return left;
  }

  NodePtr parseAnd() {
    NodePtr left = parseNot();
    while (isName("and")) {
      const int line = peek().line;
      at++;
      auto n = make("and", line);
      n->children.push_back(std::move(left));
      n->children.push_back(parseNot());
      left = std::move(n);
    }
    return left;
  }

  NodePtr parseNot() {
    if (isName("not")) {
      const int line = peek().line;
      at++;
      auto n = make("not", line);
      n->children.push_back(parseNot());
      return n;
    }
    return parseComparison();
  }

  NodePtr parseComparison() {
    NodePtr left = parseSum();
    for (;;) {
      std::string op;
      for (const std::string& candidate : {"==", "!=", "<=", ">=", "<", ">"}) {
        if (isOp(candidate)) {
          op = candidate;
          break;
        }
      }
      if (op.empty() && isName("in")) fail(peek().line, "the 'in' test is not supported");
      if (op.empty()) return left;
      const int line = peek().line;
      at++;
      auto n = make("compare", line);
      n->text = op;
      n->children.push_back(std::move(left));
      n->children.push_back(parseSum());
      left = std::move(n);
    }
  }

  NodePtr parseSum() {
    NodePtr left = parseTerm();
    while (isOp("+") || isOp("-")) {
      const int line = peek().line;
      const std::string op = take().text;
      auto n = make("binary", line);
      n->text = op;
      n->children.push_back(std::move(left));
      n->children.push_back(parseTerm());
      left = std::move(n);
    }
    return left;
  }

  NodePtr parseTerm() {
    NodePtr left = parseUnary();
    for (;;) {
      if (isOp("/")) fail(peek().line, "/ gives a float; use // for integer division");
      if (!isOp("*") && !isOp("//") && !isOp("%")) return left;
      const int line = peek().line;
      const std::string op = take().text;
      auto n = make("binary", line);
      n->text = op;
      n->children.push_back(std::move(left));
      n->children.push_back(parseUnary());
      left = std::move(n);
    }
  }

  NodePtr parseUnary() {
    if (isOp("-")) {
      const int line = peek().line;
      at++;
      auto n = make("negate", line);
      n->children.push_back(parseUnary());
      return n;
    }
    if (isOp("+")) {
      at++;
      return parseUnary();
    }
    return parsePostfix();
  }

  NodePtr parsePostfix() {
    NodePtr base = parseAtom();
    for (;;) {
      if (isOp("(")) {
        const int line = peek().line;
        at++;
        auto call = make("call", line);
        call->children.push_back(std::move(base));
        while (!isOp(")")) {
          call->children.push_back(parseExpression());
          if (isOp(",")) at++;
        }
        expectOp(")");
        base = std::move(call);
      } else if (isOp("[")) {
        const int line = peek().line;
        at++;
        auto index = make("index", line);
        index->children.push_back(std::move(base));
        index->children.push_back(parseExpression());
        if (isOp(":")) fail(peek().line, "slices are not supported");
        expectOp("]");
        base = std::move(index);
      } else if (isOp(".")) {
        fail(peek().line, "attributes and methods are not supported");
      } else {
        return base;
      }
    }
  }

  NodePtr parseAtom() {
    const Token& t = peek();
    if (t.kind == Token::Number) {
      auto n = make("num", t.line);
      n->value = t.value;
      at++;
      return n;
    }
    if (t.kind == Token::String) {
      auto n = make("str", t.line);
      n->text = t.text;
      at++;
      return n;
    }
    if (t.kind == Token::Name) {
      if (t.text == "True" || t.text == "False") {
        auto n = make("num", t.line);
        n->value = t.text == "True" ? 1 : 0;
        at++;
        return n;
      }
      if (t.text == "None") fail(t.line, "None is not supported");
      auto n = make("name", t.line);
      n->text = t.text;
      at++;
      return n;
    }
    if (isOp("(")) {
      at++;
      NodePtr inner = parseExpression();
      if (isOp(",")) fail(peek().line, "tuples are not supported");
      expectOp(")");
      return inner;
    }
    if (isOp("[")) {
      auto n = make("list", t.line);
      at++;
      while (!isOp("]")) {
        n->children.push_back(parseExpression());
        if (isOp(",")) at++;
      }
      expectOp("]");
      return n;
    }
    fail(t.line, "expected a value here");
  }
};

void render(const Node& n, std::string& out, int depth) {
  out.append(static_cast<size_t>(depth) * 2, ' ');
  out += n.kind;
  if (!n.text.empty()) out += " " + n.text;
  if (n.kind == "num") out += " " + std::to_string(n.value);
  out += "\n";
  for (const auto& child : n.children) render(*child, out, depth + 1);
}

}  // namespace

// --------------------------------------------------------------- code generation

namespace {

struct Generator {
  std::vector<Ir>& ir;
  std::string assembly = "";
  std::vector<int> map;
  int temporaries = 0;
  int labels = 0;
  std::vector<std::string> breakLabels;
  std::vector<std::string> continueLabels;

  /** Locals live at rbp-relative offsets; the map is per function. */
  std::map<std::string, int> locals;
  int frameSize = 0;
  std::set<std::string> functions;
  std::vector<std::pair<std::string, std::string>> strings;  // label, text

  std::string temporary() { return "t" + std::to_string(++temporaries); }
  std::string label(const std::string& hint) { return "." + hint + std::to_string(++labels); }

  void emit(const std::string& text, int line) {
    assembly += "  " + text + "\n";
    map.push_back(line);
  }
  void emitLabel(const std::string& name, int line) {
    assembly += name + ":\n";
    map.push_back(line);
  }
  void note(const std::string& op, const std::string& result, const std::string& a,
            const std::string& b, const std::string& text, int line) {
    ir.push_back({op, result, a, b, line, text});
  }

  int slotFor(const std::string& name) {
    auto found = locals.find(name);
    if (found != locals.end()) return found->second;
    frameSize += 8;
    locals[name] = -frameSize;
    return -frameSize;
  }

  std::string slotText(int offset) {
    return "[rbp " + std::string(offset < 0 ? "- " : "+ ") + std::to_string(std::abs(offset)) + "]";
  }

  // Every expression leaves its value in rax.
  void expression(const Node& n) {
    if (n.kind == "num") {
      emit("mov rax, " + std::to_string(n.value), n.line);
      note("const", "rax", std::to_string(n.value), "", "rax = " + std::to_string(n.value), n.line);
      return;
    }
    if (n.kind == "str") {
      const std::string name = ".str" + std::to_string(strings.size());
      strings.push_back({name, n.text});
      emit("mov rax, " + name, n.line);
      note("const", "rax", name, "", "rax = address of " + name, n.line);
      return;
    }
    if (n.kind == "name") {
      if (!locals.count(n.text)) {
        fail(n.line, "'" + n.text + "' is used before it is given a value");
      }
      const int slot = locals[n.text];
      emit("mov rax, " + slotText(slot), n.line);
      note("load", "rax", n.text, "", "rax = " + n.text, n.line);
      return;
    }
    if (n.kind == "negate") {
      expression(*n.children[0]);
      emit("neg rax", n.line);
      note("neg", "rax", "rax", "", "rax = -rax", n.line);
      return;
    }
    if (n.kind == "binary") {
      expression(*n.children[0]);
      emit("push rax", n.line);
      expression(*n.children[1]);
      emit("mov rcx, rax", n.line);
      emit("pop rax", n.line);
      const std::string t = temporary();
      if (n.text == "+") {
        emit("add rax, rcx", n.line);
      } else if (n.text == "-") {
        emit("sub rax, rcx", n.line);
      } else if (n.text == "*") {
        emit("imul rax, rcx", n.line);
      } else if (n.text == "//" || n.text == "%") {
        emit("cqo", n.line);
        emit("idiv rcx", n.line);
        if (n.text == "%") emit("mov rax, rdx", n.line);
      }
      note(n.text, t, "left", "right", t + " = left " + n.text + " right", n.line);
      return;
    }
    if (n.kind == "compare") {
      expression(*n.children[0]);
      emit("push rax", n.line);
      expression(*n.children[1]);
      emit("mov rcx, rax", n.line);
      emit("pop rax", n.line);
      emit("cmp rax, rcx", n.line);
      const std::map<std::string, std::string> SET = {{"==", "sete"}, {"!=", "setne"},
                                                      {"<", "setl"},  {"<=", "setle"},
                                                      {">", "setg"},  {">=", "setge"}};
      emit(SET.at(n.text) + " al", n.line);
      emit("movzx rax, al", n.line);
      const std::string t = temporary();
      note("compare", t, "left", "right", t + " = left " + n.text + " right", n.line);
      return;
    }
    if (n.kind == "and" || n.kind == "or") {
      const std::string done = label(n.kind);
      expression(*n.children[0]);
      emit("test rax, rax", n.line);
      emit(n.kind == "and" ? "je " + done : "jne " + done, n.line);
      note(n.kind, "rax", "left", "", "short circuit: " + n.kind, n.line);
      expression(*n.children[1]);
      emitLabel(done, n.line);
      return;
    }
    if (n.kind == "not") {
      expression(*n.children[0]);
      emit("test rax, rax", n.line);
      emit("sete al", n.line);
      emit("movzx rax, al", n.line);
      note("not", "rax", "rax", "", "rax = not rax", n.line);
      return;
    }
    if (n.kind == "list") {
      // A list is a length followed by its elements, in the bump heap.
      emit("mov rdi, " + std::to_string((n.children.size() + 1) * 8), n.line);
      emit("call __alloc", n.line);
      emit("mov qword ptr [rax], " + std::to_string(n.children.size()), n.line);
      emit("push rax", n.line);
      for (size_t i = 0; i < n.children.size(); i++) {
        expression(*n.children[i]);
        emit("pop rcx", n.line);
        emit("push rcx", n.line);
        emit("mov [rcx + " + std::to_string((i + 1) * 8) + "], rax", n.line);
      }
      emit("pop rax", n.line);
      note("list", "rax", std::to_string(n.children.size()), "", "rax = new list", n.line);
      return;
    }
    if (n.kind == "index") {
      expression(*n.children[0]);
      emit("push rax", n.line);
      expression(*n.children[1]);
      emit("pop rcx", n.line);
      emit("mov rax, [rcx + rax*8 + 8]", n.line);
      note("index", "rax", "list", "i", "rax = list[i]", n.line);
      return;
    }
    if (n.kind == "call") {
      call(n, true);
      return;
    }
    fail(n.line, "this expression is not supported");
  }

  void call(const Node& n, bool wantValue) {
    const Node& target = *n.children[0];
    if (target.kind != "name") fail(n.line, "only plain function names can be called");
    const std::string name = target.text;
    const size_t argc = n.children.size() - 1;

    if (name == "print") {
      for (size_t i = 1; i < n.children.size(); i++) {
        expression(*n.children[i]);
        emit("mov rdi, rax", n.line);
        emit(n.children[i]->kind == "str" ? "call __printStr" : "call __printInt", n.line);
        if (i + 1 < n.children.size()) emit("call __printSpace", n.line);
      }
      emit("call __printNewline", n.line);
      note("call", "", "print", std::to_string(argc), "print(...)", n.line);
      return;
    }
    if (name == "len") {
      if (argc != 1) fail(n.line, "len takes one argument");
      expression(*n.children[1]);
      emit("mov rax, [rax]", n.line);
      note("len", "rax", "list", "", "rax = len(list)", n.line);
      return;
    }
    if (name == "range") fail(n.line, "range can only be used in a for loop");

    if (!functions.count(name)) fail(n.line, "there is no function called '" + name + "'");
    static const char* ARG_REGS[] = {"rdi", "rsi", "rdx", "rcx", "r8", "r9"};
    if (argc > 6) fail(n.line, "more than six arguments is not supported");
    // Evaluate left to right onto the stack, then load the registers, so an
    // argument that is itself a call cannot clobber one already computed.
    for (size_t i = 1; i < n.children.size(); i++) {
      expression(*n.children[i]);
      emit("push rax", n.line);
    }
    for (size_t i = argc; i >= 1; i--) {
      emit(std::string("pop ") + ARG_REGS[i - 1], n.line);
    }
    emit("call " + name, n.line);
    note("call", wantValue ? "rax" : "", name, std::to_string(argc),
         (wantValue ? "rax = " : "") + name + "(...)", n.line);
  }

  void assign(const Node& target, int line) {
    if (target.kind == "name") {
      const int slot = slotFor(target.text);
      emit("mov " + slotText(slot) + ", rax", line);
      note("store", target.text, "rax", "", target.text + " = rax", line);
      return;
    }
    if (target.kind == "index") {
      emit("push rax", line);
      expression(*target.children[0]);
      emit("push rax", line);
      expression(*target.children[1]);
      emit("pop rcx", line);   // the list
      emit("pop rdx", line);   // the value
      emit("mov [rcx + rax*8 + 8], rdx", line);
      note("storeIndex", "list[i]", "rax", "", "list[i] = value", line);
      return;
    }
    fail(line, "this cannot be assigned to");
  }

  void statement(const Node& n) {
    if (n.kind == "pass") return;

    if (n.kind == "expressionStatement") {
      const Node& inner = *n.children[0];
      if (inner.kind == "call") call(inner, false);
      else expression(inner);
      return;
    }
    if (n.kind == "assign") {
      expression(*n.children[1]);
      assign(*n.children[0], n.line);
      return;
    }
    if (n.kind == "augassign") {
      auto synthetic = make("binary", n.line);
      synthetic->text = n.text;
      // Rebuilding the target as a read is what "x += 1" means.
      auto read = make(n.children[0]->kind, n.line);
      read->text = n.children[0]->text;
      for (const auto& c : n.children[0]->children) {
        auto copy = make(c->kind, c->line);
        copy->text = c->text;
        copy->value = c->value;
        read->children.push_back(std::move(copy));
      }
      expression(*read);
      emit("push rax", n.line);
      expression(*n.children[1]);
      emit("mov rcx, rax", n.line);
      emit("pop rax", n.line);
      if (n.text == "+") emit("add rax, rcx", n.line);
      else if (n.text == "-") emit("sub rax, rcx", n.line);
      else if (n.text == "*") emit("imul rax, rcx", n.line);
      else {
        emit("cqo", n.line);
        emit("idiv rcx", n.line);
        if (n.text == "%") emit("mov rax, rdx", n.line);
      }
      assign(*n.children[0], n.line);
      return;
    }
    if (n.kind == "if") {
      const std::string otherwise = label("else");
      const std::string done = label("endif");
      expression(*n.children[0]);
      emit("test rax, rax", n.line);
      emit("je " + otherwise, n.line);
      note("branch", "", "condition", otherwise, "if false, go to " + otherwise, n.line);
      block(*n.children[1]);
      emit("jmp " + done, n.line);
      emitLabel(otherwise, n.line);
      if (n.children.size() > 2) block(*n.children[2]);
      emitLabel(done, n.line);
      return;
    }
    if (n.kind == "while") {
      const std::string top = label("while");
      const std::string done = label("endwhile");
      emitLabel(top, n.line);
      expression(*n.children[0]);
      emit("test rax, rax", n.line);
      emit("je " + done, n.line);
      note("branch", "", "condition", done, "if false, leave the loop", n.line);
      breakLabels.push_back(done);
      continueLabels.push_back(top);
      block(*n.children[1]);
      breakLabels.pop_back();
      continueLabels.pop_back();
      emit("jmp " + top, n.line);
      emitLabel(done, n.line);
      return;
    }
    if (n.kind == "for") {
      forLoop(n);
      return;
    }
    if (n.kind == "break" || n.kind == "continue") {
      auto& stack = n.kind == "break" ? breakLabels : continueLabels;
      if (stack.empty()) fail(n.line, n.kind + " is only meaningful inside a loop");
      emit("jmp " + stack.back(), n.line);
      return;
    }
    if (n.kind == "return") {
      if (!n.children.empty()) expression(*n.children[0]);
      else emit("mov rax, 0", n.line);
      emit("leave", n.line);
      emit("ret", n.line);
      note("return", "", "rax", "", "return rax", n.line);
      return;
    }
    if (n.kind == "def") fail(n.line, "functions must be defined at the top level");
    fail(n.line, "this statement is not supported");
  }

  void forLoop(const Node& n) {
    const Node& iterable = *n.children[0];
    const std::string top = label("for");
    const std::string done = label("endfor");
    const std::string next = label("next");
    const int slot = slotFor(n.text);

    if (iterable.kind == "call" && iterable.children[0]->kind == "name" &&
        iterable.children[0]->text == "range") {
      const size_t argc = iterable.children.size() - 1;
      if (argc < 1 || argc > 3) fail(n.line, "range takes one, two or three arguments");

      // Evaluate the bounds once, into hidden slots, so `range(0, len(xs))`
      // does not recompute len on every iteration.
      const int limitSlot = slotFor("__limit" + std::to_string(labels));
      const int stepSlot = slotFor("__step" + std::to_string(labels));

      if (argc == 1) {
        emit("mov rax, 0", n.line);
        emit("mov " + slotText(slot) + ", rax", n.line);
        expression(*iterable.children[1]);
        emit("mov " + slotText(limitSlot) + ", rax", n.line);
        emit("mov rax, 1", n.line);
        emit("mov " + slotText(stepSlot) + ", rax", n.line);
      } else {
        expression(*iterable.children[1]);
        emit("mov " + slotText(slot) + ", rax", n.line);
        expression(*iterable.children[2]);
        emit("mov " + slotText(limitSlot) + ", rax", n.line);
        if (argc == 3) expression(*iterable.children[3]);
        else emit("mov rax, 1", n.line);
        emit("mov " + slotText(stepSlot) + ", rax", n.line);
      }

      emitLabel(top, n.line);
      emit("mov rax, " + slotText(slot), n.line);
      emit("mov rcx, " + slotText(limitSlot), n.line);
      emit("mov rdx, " + slotText(stepSlot), n.line);
      emit("cmp rdx, 0", n.line);
      const std::string negative = label("down");
      const std::string body = label("body");
      emit("jl " + negative, n.line);
      emit("cmp rax, rcx", n.line);
      emit("jge " + done, n.line);
      emit("jmp " + body, n.line);
      emitLabel(negative, n.line);
      emit("cmp rax, rcx", n.line);
      emit("jle " + done, n.line);
      emitLabel(body, n.line);
      note("loop", n.text, "range", "", "for " + n.text + " in range(...)", n.line);

      breakLabels.push_back(done);
      continueLabels.push_back(next);
      block(*n.children[1]);
      breakLabels.pop_back();
      continueLabels.pop_back();

      emitLabel(next, n.line);
      emit("mov rax, " + slotText(slot), n.line);
      emit("add rax, " + slotText(stepSlot), n.line);
      emit("mov " + slotText(slot), n.line);  // placeholder, replaced below
      assembly.erase(assembly.size() - ("  mov " + slotText(slot) + "\n").size());
      map.pop_back();
      emit("mov " + slotText(slot) + ", rax", n.line);
      emit("jmp " + top, n.line);
      emitLabel(done, n.line);
      return;
    }

    // for x in <list>
    const int listSlot = slotFor("__list" + std::to_string(labels));
    const int indexSlot = slotFor("__index" + std::to_string(labels));
    expression(iterable);
    emit("mov " + slotText(listSlot) + ", rax", n.line);
    emit("mov rax, 0", n.line);
    emit("mov " + slotText(indexSlot) + ", rax", n.line);
    emitLabel(top, n.line);
    emit("mov rcx, " + slotText(listSlot), n.line);
    emit("mov rax, " + slotText(indexSlot), n.line);
    emit("cmp rax, [rcx]", n.line);
    emit("jge " + done, n.line);
    emit("mov rax, [rcx + rax*8 + 8]", n.line);
    emit("mov " + slotText(slot) + ", rax", n.line);
    note("loop", n.text, "list", "", "for " + n.text + " in a list", n.line);

    breakLabels.push_back(done);
    continueLabels.push_back(next);
    block(*n.children[1]);
    breakLabels.pop_back();
    continueLabels.pop_back();

    emitLabel(next, n.line);
    emit("mov rax, " + slotText(indexSlot), n.line);
    emit("add rax, 1", n.line);
    emit("mov " + slotText(indexSlot) + ", rax", n.line);
    emit("jmp " + top, n.line);
    emitLabel(done, n.line);
  }

  void block(const Node& n) {
    for (const auto& child : n.children) statement(*child);
  }
};

}  // namespace

Compiled compile(const std::string& source) {
  Compiled out;
  try {
    out.tokens = lex(source);

    Parser parser{out.tokens};
    auto program = make("program", 1);
    while (parser.peek().kind != Token::End) {
      if (parser.peek().kind == Token::Indent) {
        fail(parser.peek().line, "this line is indented but nothing above it opens a block");
      }
      if (parser.peek().kind == Token::Newline || parser.peek().kind == Token::Dedent) {
        parser.at++;
        continue;
      }
      program->children.push_back(parser.parseStatement());
    }
    render(*program, out.tree, 0);

    // Functions first, so a call can be checked against a name that exists.
    Generator g{out.ir};
    for (const auto& child : program->children) {
      if (child->kind == "def") g.functions.insert(child->text);
    }

    // The entry point runs the top-level statements, then halts.
    std::string body;
    std::vector<int> bodyMap;
    {
      Generator top{out.ir};
      top.functions = g.functions;
      for (const auto& child : program->children) {
        if (child->kind != "def") top.statement(*child);
      }
      body = top.assembly;
      bodyMap = top.map;
      g.frameSize = top.frameSize;
      g.strings = top.strings;
      g.temporaries = top.temporaries;
      g.labels = top.labels;
    }

    const int mainFrame = ((g.frameSize + 15) / 16) * 16;
    out.assembly = "  ; entry point\n";
    out.assemblyToSource.push_back(0);
    auto add = [&](const std::string& line, int source) {
      out.assembly += line + "\n";
      out.assemblyToSource.push_back(source);
    };
    add("main:", 0);
    add("  push rbp", 0);
    add("  mov rbp, rsp", 0);
    add("  sub rsp, " + std::to_string(mainFrame), 0);
    {
      size_t index = 0;
      std::string current;
      for (char c : body) {
        if (c == '\n') {
          add(current, index < bodyMap.size() ? bodyMap[index] : 0);
          index++;
          current.clear();
        } else {
          current += c;
        }
      }
    }
    add("  leave", 0);
    add("  hlt", 0);

    // Each function gets its own frame and its own local map.
    for (const auto& child : program->children) {
      if (child->kind != "def") continue;
      Generator f{out.ir};
      f.functions = g.functions;
      f.strings = g.strings;
      f.labels = g.labels + 1000;
      static const char* ARG_REGS[] = {"rdi", "rsi", "rdx", "rcx", "r8", "r9"};
      const Node& params = *child->children[0];
      for (size_t i = 0; i < params.children.size(); i++) {
        f.slotFor(params.children[i]->text);
      }
      f.block(*child->children[1]);

      const int frame = ((f.frameSize + 15) / 16) * 16;
      add("", child->line);
      add(child->text + ":", child->line);
      add("  push rbp", child->line);
      add("  mov rbp, rsp", child->line);
      add("  sub rsp, " + std::to_string(frame), child->line);
      for (size_t i = 0; i < params.children.size(); i++) {
        add("  mov " + f.slotText(f.locals[params.children[i]->text]) + ", " + ARG_REGS[i],
            child->line);
      }
      size_t index = 0;
      std::string current;
      for (char c : f.assembly) {
        if (c == '\n') {
          add(current, index < f.map.size() ? f.map[index] : child->line);
          index++;
          current.clear();
        } else {
          current += c;
        }
      }
      // A function that runs off the end returns zero, as Python returns None.
      add("  mov rax, 0", child->line);
      add("  leave", child->line);
      add("  ret", child->line);
      g.strings = f.strings;
    }

    // The runtime: printing and allocation, written once in assembly.
    out.assembly += R"(
; ---- runtime -------------------------------------------------------------
__printInt:
  push rbp
  mov rbp, rsp
  sub rsp, 48
  mov rcx, 0
  cmp rdi, 0
  jge .positive
  neg rdi
  mov rcx, 1
.positive:
  mov rsi, rbp
  sub rsi, 8
  mov byte ptr [rsi], 0
  mov rax, rdi
.digits:
  cqo
  mov r8, 10
  idiv r8
  add rdx, 48
  dec rsi
  mov [rsi], dl
  cmp rax, 0
  jne .digits
  cmp rcx, 0
  je .noSign
  dec rsi
  mov byte ptr [rsi], 45
.noSign:
  mov rdx, rbp
  sub rdx, 8
  sub rdx, rsi
  mov rax, 1
  push rsi
  push rdx
  pop rdx
  pop rsi
  mov rax, 1
  syscall
  leave
  ret

__printStr:
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

__printSpace:
  mov rsi, .spaceText
  mov rdx, 1
  mov rax, 1
  syscall
  ret

__printNewline:
  mov rsi, .newlineText
  mov rdx, 1
  mov rax, 1
  syscall
  ret

__alloc:
  mov rax, [.heapNext]
  mov rcx, rax
  add rcx, rdi
  mov [.heapNext], rcx
  ret

.spaceText:
  .ascii " "
.newlineText:
  .ascii "\n"
.heapNext:
  .quad 0x8000
)";
    for (const auto& [name, text] : g.strings) {
      out.assembly += name + ":\n  .asciz \"";
      for (char c : text) {
        if (c == '"') out.assembly += "\\\"";
        else if (c == '\n') out.assembly += "\\n";
        else out.assembly += c;
      }
      out.assembly += "\"\n";
    }

    out.ok = true;
  } catch (const Failure& f) {
    out.ok = false;
    out.error = "line " + std::to_string(f.line) + ": " + f.message;
    out.errorLine = f.line;
  }
  return out;
}

}  // namespace py
