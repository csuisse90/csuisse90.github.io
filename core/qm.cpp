#include "qm.hpp"

#include <algorithm>
#include <map>
#include <set>

#include "json.hpp"

namespace lg {

namespace {

int popcount(uint32_t v) {
  int c = 0;
  while (v) {
    v &= v - 1;
    ++c;
  }
  return c;
}

// Hand-rolled rather than via stringstream: pulling in <sstream> links the
// whole of iostreams, which was a third of the wasm binary on its own.
std::vector<uint32_t> parseCsv(const std::string& s) {
  std::vector<uint32_t> out;
  size_t i = 0;
  while (i <= s.size()) {
    size_t end = s.find(',', i);
    if (end == std::string::npos) end = s.size();
    bool digits = end > i;
    uint32_t value = 0;
    for (size_t k = i; k < end; ++k) {
      if (s[k] < '0' || s[k] > '9') {
        digits = false;
        break;
      }
      value = value * 10 + static_cast<uint32_t>(s[k] - '0');
    }
    if (digits) out.push_back(value);
    i = end + 1;
  }
  std::sort(out.begin(), out.end());
  out.erase(std::unique(out.begin(), out.end()), out.end());
  return out;
}

struct Key {
  uint32_t bits, mask;
  bool operator<(const Key& o) const {
    return mask != o.mask ? mask < o.mask : bits < o.bits;
  }
};

}  // namespace

Minimisation minimise(int numVars, const std::vector<uint32_t>& minterms,
                      const std::vector<uint32_t>& dontCares) {
  Minimisation result;
  if (minterms.empty()) {
    result.constantZero = true;
    return result;
  }
  const uint32_t full = (numVars >= 32) ? 0xffffffffu : ((1u << numVars) - 1u);
  std::vector<uint32_t> all = minterms;
  all.insert(all.end(), dontCares.begin(), dontCares.end());
  std::sort(all.begin(), all.end());
  all.erase(std::unique(all.begin(), all.end()), all.end());

  if (all.size() == static_cast<size_t>(1u << numVars) &&
      minterms.size() == all.size()) {
    result.constantOne = true;
    return result;
  }

  // Column 0: one implicant per term, nothing eliminated yet.
  std::map<Key, std::vector<uint32_t>> current;
  for (uint32_t m : all) current[{m, 0u}] = {m};

  std::set<Key> primeKeys;
  std::map<Key, std::vector<uint32_t>> primeCovers;

  while (!current.empty()) {
    std::map<Key, std::vector<uint32_t>> next;
    std::set<Key> combined;

    // Bucket by mask, then by number of 1s, so only adjacent buckets pair up.
    std::map<uint32_t, std::map<int, std::vector<Key>>> buckets;
    for (const auto& kv : current) {
      buckets[kv.first.mask][popcount(kv.first.bits)].push_back(kv.first);
    }

    for (const auto& byMask : buckets) {
      const auto& byOnes = byMask.second;
      for (const auto& group : byOnes) {
        auto upper = byOnes.find(group.first + 1);
        if (upper == byOnes.end()) continue;
        for (const Key& a : group.second) {
          for (const Key& b : upper->second) {
            uint32_t diff = a.bits ^ b.bits;
            if (popcount(diff) != 1) continue;
            Key merged{a.bits & ~diff, a.mask | diff};
            combined.insert(a);
            combined.insert(b);
            auto& cover = next[merged];
            if (cover.empty()) {
              cover = current.at(a);
              const auto& cb = current.at(b);
              cover.insert(cover.end(), cb.begin(), cb.end());
              std::sort(cover.begin(), cover.end());
              cover.erase(std::unique(cover.begin(), cover.end()), cover.end());
            }
          }
        }
      }
    }

    for (const auto& kv : current) {
      if (!combined.count(kv.first)) {
        primeKeys.insert(kv.first);
        primeCovers[kv.first] = kv.second;
      }
    }
    current.swap(next);
  }

  for (const Key& k : primeKeys) {
    Implicant imp;
    imp.bits = k.bits & full;
    imp.mask = k.mask & full;
    imp.covers = primeCovers[k];
    result.primes.push_back(imp);
  }
  std::sort(result.primes.begin(), result.primes.end(),
            [](const Implicant& a, const Implicant& b) {
              if (a.mask != b.mask) return a.mask > b.mask;  // wider first
              return a.bits < b.bits;
            });

  // Cover only the true minterms; don't-cares are free riders.
  std::set<uint32_t> required(minterms.begin(), minterms.end());
  std::vector<bool> picked(result.primes.size(), false);

  auto coversRequired = [&](size_t pi) {
    std::vector<uint32_t> hit;
    for (uint32_t m : result.primes[pi].covers) {
      if (required.count(m)) hit.push_back(m);
    }
    return hit;
  };

  // Essential prime implicants: any minterm reachable by exactly one implicant.
  for (uint32_t m : std::vector<uint32_t>(required.begin(), required.end())) {
    int owner = -1, count = 0;
    for (size_t pi = 0; pi < result.primes.size(); ++pi) {
      const auto& c = result.primes[pi].covers;
      if (std::find(c.begin(), c.end(), m) != c.end()) {
        owner = static_cast<int>(pi);
        ++count;
      }
    }
    if (count == 1 && owner >= 0 && !picked[owner]) {
      picked[owner] = true;
      for (uint32_t x : result.primes[owner].covers) required.erase(x);
    }
  }

  // Greedy remainder: most uncovered minterms, breaking ties on fewer literals.
  while (!required.empty()) {
    int best = -1;
    size_t bestHits = 0;
    int bestLiterals = 0;
    for (size_t pi = 0; pi < result.primes.size(); ++pi) {
      if (picked[pi]) continue;
      auto hit = coversRequired(pi);
      if (hit.empty()) continue;
      int literals = numVars - popcount(result.primes[pi].mask);
      if (hit.size() > bestHits ||
          (hit.size() == bestHits && literals < bestLiterals)) {
        best = static_cast<int>(pi);
        bestHits = hit.size();
        bestLiterals = literals;
      }
    }
    if (best < 0) break;
    picked[best] = true;
    for (uint32_t x : result.primes[best].covers) required.erase(x);
  }

  for (size_t pi = 0; pi < picked.size(); ++pi) {
    if (picked[pi]) result.chosen.push_back(static_cast<int>(pi));
  }
  return result;
}

namespace {

std::vector<std::string> splitNames(const std::string& s, int numVars) {
  std::vector<std::string> names;
  size_t i = 0;
  while (i <= s.size()) {
    size_t end = s.find(',', i);
    if (end == std::string::npos) end = s.size();
    if (end > i) names.push_back(s.substr(i, end - i));
    i = end + 1;
  }
  while (static_cast<int>(names.size()) < numVars) {
    names.push_back(std::string(1, static_cast<char>('A' + names.size())));
  }
  names.resize(numVars);
  return names;
}

std::string termLatex(const Implicant& imp, int numVars,
                      const std::vector<std::string>& names) {
  std::string s;
  for (int i = 0; i < numVars; ++i) {
    const uint32_t bit = 1u << (numVars - 1 - i);
    if (imp.mask & bit) continue;
    if (imp.bits & bit) {
      s += names[i];
    } else {
      s += "\\overline{" + names[i] + "}";
    }
  }
  return s.empty() ? "1" : s;
}

std::string termPlain(const Implicant& imp, int numVars,
                      const std::vector<std::string>& names) {
  std::string s;
  for (int i = 0; i < numVars; ++i) {
    const uint32_t bit = 1u << (numVars - 1 - i);
    if (imp.mask & bit) continue;
    if (!(imp.bits & bit)) s += "NOT ";
    s += names[i];
    s += " AND ";
  }
  if (s.size() > 5) s.erase(s.size() - 5);
  return s.empty() ? "1" : s;
}

}  // namespace

std::string minimiseJson(int numVars, const std::string& varNames,
                         const std::string& mintermCsv,
                         const std::string& dontCareCsv) {
  const std::vector<std::string> names = splitNames(varNames, numVars);
  const std::vector<uint32_t> ms = parseCsv(mintermCsv);
  const std::vector<uint32_t> dc = parseCsv(dontCareCsv);
  Minimisation m = minimise(numVars, ms, dc);

  jw::Out o;
  o.beginObj();
  o.key("constantZero");
  o.boolean(m.constantZero);
  o.key("constantOne");
  o.boolean(m.constantOne);

  auto writeTerms = [&](const std::vector<int>& idx) {
    o.beginArr();
    for (int i : idx) {
      const Implicant& imp = m.primes[i];
      o.beginObj();
      o.key("latex");
      o.str(termLatex(imp, numVars, names));
      o.key("plain");
      o.str(termPlain(imp, numVars, names));
      o.key("literals");
      o.num(numVars - popcount(imp.mask));
      o.key("covers");
      o.beginArr();
      for (uint32_t c : imp.covers) o.num(c);
      o.endArr();
      o.endObj();
    }
    o.endArr();
  };

  std::vector<int> allIdx(m.primes.size());
  for (size_t i = 0; i < m.primes.size(); ++i) allIdx[i] = static_cast<int>(i);

  o.key("primes");
  writeTerms(allIdx);
  o.key("terms");
  writeTerms(m.chosen);

  // Canonical (unsimplified) sum of products, for the before/after comparison.
  std::string canonical;
  for (size_t i = 0; i < ms.size(); ++i) {
    Implicant single;
    single.bits = ms[i];
    single.mask = 0;
    if (i) canonical += " + ";
    canonical += termLatex(single, numVars, names);
  }

  o.key("canonicalLatex");
  o.str(ms.empty() ? "0" : canonical);

  std::string sop;
  if (m.constantZero) {
    sop = "0";
  } else if (m.constantOne) {
    sop = "1";
  } else {
    for (size_t i = 0; i < m.chosen.size(); ++i) {
      if (i) sop += " + ";
      sop += termLatex(m.primes[m.chosen[i]], numVars, names);
    }
  }
  o.key("sopLatex");
  o.str(sop);

  int litTotal = 0;
  for (int i : m.chosen) litTotal += numVars - popcount(m.primes[i].mask);
  o.key("literalCount");
  o.num(litTotal);
  o.key("canonicalLiteralCount");
  o.num(static_cast<int>(ms.size()) * numVars);
  o.endObj();
  return o.done();
}

}  // namespace lg

namespace lg {

std::string spriteGeometryJson() {
  struct R { int x, y, w, h; };
  // A 100 x 81 grid: body, two side nubs, four legs.
  const R body[] = {
      {10, 0, 80, 60}, {0, 19, 10, 21}, {90, 19, 10, 21},
      {10, 60, 9, 21}, {29, 60, 10, 21}, {61, 60, 10, 21}, {81, 60, 9, 21},
  };
  const R eyes[] = {{19, 21, 10, 10}, {71, 21, 10, 10}};

  jw::Out o;
  o.beginObj();
  o.key("width");
  o.num(100);
  o.key("height");
  o.num(81);
  auto emit = [&](const R* rs, size_t n) {
    o.beginArr();
    for (size_t i = 0; i < n; ++i) {
      o.beginObj();
      o.key("x"); o.num(rs[i].x);
      o.key("y"); o.num(rs[i].y);
      o.key("w"); o.num(rs[i].w);
      o.key("h"); o.num(rs[i].h);
      o.endObj();
    }
    o.endArr();
  };
  o.key("body");
  emit(body, sizeof body / sizeof body[0]);
  o.key("eyes");
  emit(eyes, sizeof eyes / sizeof eyes[0]);
  o.endObj();
  return o.done();
}

}  // namespace lg
