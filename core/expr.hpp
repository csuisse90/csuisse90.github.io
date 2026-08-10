#pragma once

#include <string>
#include <vector>

namespace lg {

class Circuit;

enum ExprOp {
  eVar = 0,
  eConst,
  eNot,
  eAnd,
  eOr,
  eXor,
  eNand,
  eNor,
  eXnor,
};

struct ExprNode {
  ExprOp op = eVar;
  int var = 0;    // index into Expr::vars for eVar
  int value = 0;  // literal for eConst
  int lhs = -1;
  int rhs = -1;
};

// Accepts the notations an IB student actually meets: A.B, A·B, A*B, AB,
// A+B, A|B, A^B, A⊕B, ¬A, !A, ~A, A', and the word forms AND OR NOT XOR
// NAND NOR XNOR. Variables are single letters, optionally with digits (X1).
struct Expr {
  std::vector<ExprNode> nodes;
  std::vector<std::string> vars;
  int root = -1;
  bool ok = false;
  std::string error;
  size_t errorPos = 0;
};

Expr parseExpression(const std::string& src);

int evalExpr(const Expr& e, int node, unsigned assignment);

std::string exprToLatex(const Expr& e, int node);

// Full analysis for the expression playground: LaTeX, variables, truth table,
// minterms and the minimised sum-of-products.
std::string analyseExpression(const std::string& src);

// Materialises the parse tree as gates so an expression can be drawn as a
// true-spec logic diagram. Returns "" on success, else the parse error.
std::string buildFromExpression(Circuit& c, const std::string& src);

}  // namespace lg
