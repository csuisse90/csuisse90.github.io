#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace lg {

struct Implicant {
  uint32_t bits = 0;  // literal values at the positions not masked out
  uint32_t mask = 0;  // 1 bit = position eliminated (a "don't care" position)
  std::vector<uint32_t> covers;
};

// Quine-McCluskey prime-implicant generation followed by essential-implicant
// extraction and a greedy cover of the remainder. For the variable counts this
// site uses (<= 5) the greedy step is optimal in practice.
struct Minimisation {
  std::vector<Implicant> primes;
  std::vector<int> chosen;  // indices into `primes`
  bool constantZero = false;
  bool constantOne = false;
};

Minimisation minimise(int numVars, const std::vector<uint32_t>& minterms,
                      const std::vector<uint32_t>& dontCares);

// JSON for the UI: prime implicants, the selected cover, the sum-of-products in
// LaTeX, and the covered minterms per term so the K-map can ring each group.
std::string minimiseJson(int numVars, const std::string& varNames,
                         const std::string& mintermCsv,
                         const std::string& dontCareCsv);

// Geometry for the site mascot, authored here so the shape has one definition
// and the browser renders it as vectors at any size.
std::string spriteGeometryJson();

}  // namespace lg
