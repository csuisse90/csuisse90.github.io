#include "expr.hpp"

#include <algorithm>
#include <cctype>
#include <map>

#include "json.hpp"
#include "logic.hpp"
#include "qm.hpp"

namespace lg {

namespace {

enum TokKind { tEnd, tVar, tConst, tNot, tAnd, tOr, tXor, tNand, tNor, tXnor, tLParen, tRParen, tPrime };

struct Tok {
  TokKind kind = tEnd;
  std::string text;
  int value = 0;
  size_t pos = 0;
};

bool startsWith(const std::string& s, size_t i, const char* word) {
  size_t n = 0;
  while (word[n]) {
    if (i + n >= s.size()) return false;
    if (std::toupper(static_cast<unsigned char>(s[i + n])) != word[n]) return false;
    ++n;
  }
  // A keyword must not run straight into another letter or digit.
  if (i + n < s.size() && std::isalnum(static_cast<unsigned char>(s[i + n]))) return false;
  return true;
}

// Consumes one UTF-8 sequence, so the multi-byte operators (·, ¬, ⊕, ×) can be
// recognised without pulling in a Unicode library.
bool matchUtf8(const std::string& s, size_t i, const char* seq, size_t* len) {
  size_t n = 0;
  while (seq[n]) {
    if (i + n >= s.size() || s[i + n] != seq[n]) return false;
    ++n;
  }
  *len = n;
  return true;
}

struct Lexer {
  const std::string& src;
  size_t i = 0;
  std::vector<Tok> toks;
  std::string error;
  size_t errorPos = 0;

  explicit Lexer(const std::string& s) : src(s) {}

  void run() {
    while (i < src.size()) {
      unsigned char c = static_cast<unsigned char>(src[i]);
      if (std::isspace(c)) {
        ++i;
        continue;
      }
      size_t len = 0;
      if (matchUtf8(src, i, "\xc2\xb7", &len) ||        // ·
          matchUtf8(src, i, "\xc3\x97", &len) ||        // ×
          matchUtf8(src, i, "\xe2\x88\xa7", &len)) {    // ∧
        push({tAnd, "AND", 0, i});
        i += len;
        continue;
      }
      if (matchUtf8(src, i, "\xe2\x88\xa8", &len)) {    // ∨
        push({tOr, "OR", 0, i});
        i += len;
        continue;
      }
      if (matchUtf8(src, i, "\xe2\x8a\x95", &len)) {    // ⊕
        push({tXor, "XOR", 0, i});
        i += len;
        continue;
      }
      if (matchUtf8(src, i, "\xc2\xac", &len)) {        // ¬ prefix negation
        push({tNot, "NOT", 0, i});
        i += len;
        continue;
      }
      if (matchUtf8(src, i, "\xe2\x80\xb2", &len)) {    // ′ postfix negation
        push({tPrime, "'", 0, i});
        i += len;
        continue;
      }

      if (std::isalpha(c)) {
        // Keywords win over variables; otherwise a bare letter is a variable,
        // which is what makes juxtaposition (AB) mean A AND B.
        if (startsWith(src, i, "NAND")) { push({tNand, "NAND", 0, i}); i += 4; continue; }
        if (startsWith(src, i, "XNOR")) { push({tXnor, "XNOR", 0, i}); i += 4; continue; }
        if (startsWith(src, i, "NOR"))  { push({tNor, "NOR", 0, i});  i += 3; continue; }
        if (startsWith(src, i, "XOR"))  { push({tXor, "XOR", 0, i});  i += 3; continue; }
        if (startsWith(src, i, "NOT"))  { push({tNot, "NOT", 0, i});  i += 3; continue; }
        if (startsWith(src, i, "AND"))  { push({tAnd, "AND", 0, i});  i += 3; continue; }
        if (startsWith(src, i, "OR"))   { push({tOr, "OR", 0, i});    i += 2; continue; }
        size_t start = i++;
        while (i < src.size() && std::isdigit(static_cast<unsigned char>(src[i]))) ++i;
        std::string name = src.substr(start, i - start);
        name[0] = static_cast<char>(std::toupper(static_cast<unsigned char>(name[0])));
        push({tVar, name, 0, start});
        continue;
      }

      switch (c) {
        case '0': case '1':
          push({tConst, std::string(1, static_cast<char>(c)), c - '0', i});
          ++i;
          continue;
        case '.': case '*': case '&':
          push({tAnd, "AND", 0, i});
          ++i;
          continue;
        case '+': case '|':
          push({tOr, "OR", 0, i});
          ++i;
          continue;
        case '^':
          push({tXor, "XOR", 0, i});
          ++i;
          continue;
        case '!': case '~':
          push({tNot, "NOT", 0, i});
          ++i;
          continue;
        case '\'':
          push({tPrime, "'", 0, i});
          ++i;
          continue;
        case '(': case '[':
          push({tLParen, "(", 0, i});
          ++i;
          continue;
        case ')': case ']':
          push({tRParen, ")", 0, i});
          ++i;
          continue;
        default:
          error = std::string("Unexpected character '") + static_cast<char>(c) + "'";
          errorPos = i;
          return;
      }
    }
    push({tEnd, "", 0, i});
  }

  void push(const Tok& t) { toks.push_back(t); }
};

struct Parser {
  Expr& e;
  const std::vector<Tok>& toks;
  size_t p = 0;

  Parser(Expr& expr, const std::vector<Tok>& t) : e(expr), toks(t) {}

  const Tok& peek() const { return toks[p]; }
  const Tok& take() { return toks[p++]; }

  void fail(const std::string& msg) {
    if (e.error.empty()) {
      e.error = msg;
      e.errorPos = peek().pos;
    }
  }

  int add(ExprOp op, int lhs = -1, int rhs = -1) {
    ExprNode n;
    n.op = op;
    n.lhs = lhs;
    n.rhs = rhs;
    e.nodes.push_back(n);
    return static_cast<int>(e.nodes.size()) - 1;
  }

  int varIndex(const std::string& name) {
    auto it = std::find(e.vars.begin(), e.vars.end(), name);
    if (it != e.vars.end()) return static_cast<int>(it - e.vars.begin());
    e.vars.push_back(name);
    return static_cast<int>(e.vars.size()) - 1;
  }

  bool startsAtom() const {
    switch (peek().kind) {
      case tVar: case tConst: case tLParen: case tNot:
        return true;
      default:
        return false;
    }
  }

  int parseOr() {
    int lhs = parseXor();
    if (lhs < 0) return -1;
    while (peek().kind == tOr || peek().kind == tNor) {
      ExprOp op = peek().kind == tOr ? eOr : eNor;
      take();
      int rhs = parseXor();
      if (rhs < 0) return -1;
      lhs = add(op, lhs, rhs);
    }
    return lhs;
  }

  int parseXor() {
    int lhs = parseAnd();
    if (lhs < 0) return -1;
    while (peek().kind == tXor || peek().kind == tXnor) {
      ExprOp op = peek().kind == tXor ? eXor : eXnor;
      take();
      int rhs = parseAnd();
      if (rhs < 0) return -1;
      lhs = add(op, lhs, rhs);
    }
    return lhs;
  }

  int parseAnd() {
    int lhs = parseUnary();
    if (lhs < 0) return -1;
    for (;;) {
      if (peek().kind == tAnd || peek().kind == tNand) {
        ExprOp op = peek().kind == tAnd ? eAnd : eNand;
        take();
        int rhs = parseUnary();
        if (rhs < 0) return -1;
        lhs = add(op, lhs, rhs);
      } else if (startsAtom()) {
        // Juxtaposition: AB means A AND B.
        int rhs = parseUnary();
        if (rhs < 0) return -1;
        lhs = add(eAnd, lhs, rhs);
      } else {
        return lhs;
      }
    }
  }

  int parseUnary() {
    if (peek().kind == tNot) {
      take();
      int operand = parseUnary();
      if (operand < 0) return -1;
      return add(eNot, operand);
    }
    return parsePostfix();
  }

  int parsePostfix() {
    int base = parsePrimary();
    if (base < 0) return -1;
    while (peek().kind == tPrime) {
      take();
      base = add(eNot, base);
    }
    return base;
  }

  int parsePrimary() {
    const Tok& t = peek();
    switch (t.kind) {
      case tVar: {
        take();
        int n = add(eVar);
        e.nodes[n].var = varIndex(t.text);
        return n;
      }
      case tConst: {
        take();
        int n = add(eConst);
        e.nodes[n].value = t.value;
        return n;
      }
      case tLParen: {
        take();
        int inner = parseOr();
        if (inner < 0) return -1;
        if (peek().kind != tRParen) {
          fail("Missing closing bracket");
          return -1;
        }
        take();
        return inner;
      }
      case tEnd:
        fail("Expression ends early — an operand is missing");
        return -1;
      default:
        fail("Expected a variable or bracket, found '" + t.text + "'");
        return -1;
    }
  }
};

}  // namespace

Expr parseExpression(const std::string& src) {
  Expr e;
  if (src.find_first_not_of(" \t\n") == std::string::npos) {
    e.error = "Type a Boolean expression, for example A.B + C";
    return e;
  }
  Lexer lex(src);
  lex.run();
  if (!lex.error.empty()) {
    e.error = lex.error;
    e.errorPos = lex.errorPos;
    return e;
  }
  Parser parser(e, lex.toks);
  e.root = parser.parseOr();
  if (e.root < 0) return e;
  if (parser.peek().kind != tRParen && parser.peek().kind != tEnd) {
    e.error = "Unexpected '" + parser.peek().text + "'";
    e.errorPos = parser.peek().pos;
    return e;
  }
  if (parser.peek().kind == tRParen) {
    e.error = "Unmatched closing bracket";
    e.errorPos = parser.peek().pos;
    return e;
  }
  if (e.vars.size() > 8) {
    e.error = "At most 8 variables are supported";
    return e;
  }
  // Alphabetical variable order keeps truth-table columns predictable.
  std::vector<std::string> sorted = e.vars;
  std::sort(sorted.begin(), sorted.end());
  std::map<int, int> remap;
  for (size_t i = 0; i < e.vars.size(); ++i) {
    remap[static_cast<int>(i)] = static_cast<int>(
        std::find(sorted.begin(), sorted.end(), e.vars[i]) - sorted.begin());
  }
  for (ExprNode& n : e.nodes) {
    if (n.op == eVar) n.var = remap[n.var];
  }
  e.vars = sorted;
  e.ok = true;
  return e;
}

int evalExpr(const Expr& e, int node, unsigned assignment) {
  const ExprNode& n = e.nodes[node];
  switch (n.op) {
    case eVar: {
      const int nv = static_cast<int>(e.vars.size());
      return (assignment >> (nv - 1 - n.var)) & 1u;
    }
    case eConst: return n.value;
    case eNot: return evalExpr(e, n.lhs, assignment) ? 0 : 1;
    case eAnd: return evalExpr(e, n.lhs, assignment) & evalExpr(e, n.rhs, assignment);
    case eOr: return evalExpr(e, n.lhs, assignment) | evalExpr(e, n.rhs, assignment);
    case eXor: return evalExpr(e, n.lhs, assignment) ^ evalExpr(e, n.rhs, assignment);
    case eNand: return (evalExpr(e, n.lhs, assignment) & evalExpr(e, n.rhs, assignment)) ? 0 : 1;
    case eNor: return (evalExpr(e, n.lhs, assignment) | evalExpr(e, n.rhs, assignment)) ? 0 : 1;
    case eXnor: return (evalExpr(e, n.lhs, assignment) ^ evalExpr(e, n.rhs, assignment)) ? 0 : 1;
  }
  return 0;
}

namespace {

int precedence(ExprOp op) {
  switch (op) {
    case eOr: case eNor: return 1;
    case eXor: case eXnor: return 2;
    case eAnd: case eNand: return 3;
    default: return 4;
  }
}

std::string latexRec(const Expr& e, int node, int parentPrec) {
  const ExprNode& n = e.nodes[node];
  switch (n.op) {
    case eVar: return e.vars[n.var];
    case eConst: return n.value ? "1" : "0";
    case eNot: return "\\overline{" + latexRec(e, n.lhs, 0) + "}";
    default: break;
  }
  const char* sym = "\\cdot ";
  bool bar = false;
  switch (n.op) {
    case eAnd: sym = "\\cdot "; break;
    case eOr: sym = " + "; break;
    case eXor: sym = " \\oplus "; break;
    case eNand: sym = "\\cdot "; bar = true; break;
    case eNor: sym = " + "; bar = true; break;
    case eXnor: sym = " \\oplus "; bar = true; break;
    default: break;
  }
  const int prec = precedence(n.op);
  std::string body = latexRec(e, n.lhs, prec) + sym + latexRec(e, n.rhs, prec);
  if (bar) return "\\overline{" + body + "}";
  return prec < parentPrec ? "\\left(" + body + "\\right)" : body;
}

}  // namespace

std::string exprToLatex(const Expr& e, int node) { return latexRec(e, node, 0); }

std::string analyseExpression(const std::string& src) {
  Expr e = parseExpression(src);
  jw::Out o;
  o.beginObj();
  o.key("ok");
  o.boolean(e.ok);
  if (!e.ok) {
    o.key("error");
    o.str(e.error);
    o.key("errorPos");
    o.num(static_cast<double>(e.errorPos));
    o.endObj();
    return o.done();
  }

  const int nv = static_cast<int>(e.vars.size());
  o.key("latex");
  o.str(exprToLatex(e, e.root));
  o.key("vars");
  o.beginArr();
  for (const std::string& v : e.vars) o.str(v);
  o.endArr();

  const unsigned rows = nv > 0 ? (1u << nv) : 1u;
  std::vector<uint32_t> minterms;
  o.key("rows");
  o.beginArr();
  for (unsigned m = 0; m < rows; ++m) {
    int r = evalExpr(e, e.root, m);
    if (r) minterms.push_back(m);
    o.beginObj();
    o.key("in");
    std::string in;
    for (int i = 0; i < nv; ++i) in += ((m >> (nv - 1 - i)) & 1u) ? '1' : '0';
    o.str(in);
    o.key("out");
    o.str(r ? "1" : "0");
    o.endObj();
  }
  o.endArr();

  o.key("minterms");
  o.beginArr();
  for (uint32_t m : minterms) o.num(m);
  o.endArr();

  std::string names;
  for (size_t i = 0; i < e.vars.size(); ++i) {
    if (i) names += ",";
    names += e.vars[i];
  }
  std::string csv;
  for (size_t i = 0; i < minterms.size(); ++i) {
    if (i) csv += ",";
    csv += std::to_string(minterms[i]);
  }
  o.key("minimised");
  o.raw(minimiseJson(nv, names, csv, ""));

  o.key("gateCount");
  int gates = 0;
  for (const ExprNode& n : e.nodes) {
    if (n.op != eVar && n.op != eConst) ++gates;
  }
  o.num(gates);
  o.endObj();
  return o.done();
}

namespace {

int emit(Circuit& c, const Expr& e, int node, const std::vector<int>& inputNodes) {
  const ExprNode& n = e.nodes[node];
  if (n.op == eVar) return inputNodes[n.var];
  if (n.op == eConst) return c.addNode(n.value ? kConst1 : kConst0, n.value ? "1" : "0");

  GateKind kind = kAnd;
  switch (n.op) {
    case eNot: kind = kNot; break;
    case eAnd: kind = kAnd; break;
    case eOr: kind = kOr; break;
    case eXor: kind = kXor; break;
    case eNand: kind = kNand; break;
    case eNor: kind = kNor; break;
    case eXnor: kind = kXnor; break;
    default: break;
  }
  const int lhs = emit(c, e, n.lhs, inputNodes);
  const int rhs = n.rhs >= 0 ? emit(c, e, n.rhs, inputNodes) : -1;
  const int g = c.addNode(kind, kindName(kind));
  c.connect(lhs, g, 0);
  if (rhs >= 0) c.connect(rhs, g, 1);
  return g;
}

}  // namespace

std::string buildFromExpression(Circuit& c, const std::string& src) {
  Expr e = parseExpression(src);
  if (!e.ok) return e.error;
  c.clear();
  std::vector<int> inputNodes;
  for (const std::string& v : e.vars) inputNodes.push_back(c.addNode(kInput, v));
  const int root = emit(c, e, e.root, inputNodes);
  const int out = c.addNode(kOutput, "Q");
  c.connect(root, out, 0);
  return "";
}

}  // namespace lg
