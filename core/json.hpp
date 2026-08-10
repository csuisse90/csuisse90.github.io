// Minimal JSON *writer*. The module never parses JSON: structured input arrives
// through incremental embind calls, so only serialisation is needed.
#pragma once

#include <string>
#include <vector>

namespace jw {

class Out {
 public:
  // Splices an already-serialised value in. Clearing `fresh_` matters: leaving
  // it set makes the next key() skip its separating comma.
  void raw(const std::string& s) {
    buf_ += s;
    fresh_ = false;
  }

  void key(const std::string& k) {
    comma();
    buf_ += '"';
    escapeInto(k);
    buf_ += "\":";
    fresh_ = true;
  }

  void str(const std::string& v) {
    comma();
    buf_ += '"';
    escapeInto(v);
    buf_ += '"';
  }

  void num(double v) {
    comma();
    // Trim to a short round-trippable form; geometry never needs more.
    char tmp[32];
    if (v == static_cast<long long>(v)) {
      snprintf(tmp, sizeof tmp, "%lld", static_cast<long long>(v));
    } else {
      snprintf(tmp, sizeof tmp, "%.3f", v);
    }
    buf_ += tmp;
  }

  void boolean(bool v) {
    comma();
    buf_ += v ? "true" : "false";
  }

  void null() {
    comma();
    buf_ += "null";
  }

  void beginObj() {
    comma();
    buf_ += '{';
    fresh_ = true;
  }
  void endObj() {
    buf_ += '}';
    fresh_ = false;
  }
  void beginArr() {
    comma();
    buf_ += '[';
    fresh_ = true;
  }
  void endArr() {
    buf_ += ']';
    fresh_ = false;
  }

  const std::string& done() const { return buf_; }

 private:
  void comma() {
    if (!fresh_ && !buf_.empty()) {
      char c = buf_.back();
      if (c != '{' && c != '[' && c != ':') buf_ += ',';
    }
    fresh_ = false;
  }

  void escapeInto(const std::string& s) {
    for (char c : s) {
      switch (c) {
        case '"': buf_ += "\\\""; break;
        case '\\': buf_ += "\\\\"; break;
        case '\n': buf_ += "\\n"; break;
        case '\t': buf_ += "\\t"; break;
        default: buf_ += c;
      }
    }
  }

  std::string buf_;
  bool fresh_ = true;
};

}  // namespace jw
