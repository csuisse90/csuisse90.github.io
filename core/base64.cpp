#include "base64.hpp"

namespace sh {

namespace {
const char* const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
}

std::string base64Encode(const std::string& text) {
  std::string out;
  for (size_t i = 0; i < text.size(); i += 3) {
    unsigned value = static_cast<unsigned char>(text[i]) << 16;
    size_t have = 1;
    if (i + 1 < text.size()) {
      value |= static_cast<unsigned char>(text[i + 1]) << 8;
      have = 2;
    }
    if (i + 2 < text.size()) {
      value |= static_cast<unsigned char>(text[i + 2]);
      have = 3;
    }
    out += BASE64[(value >> 18) & 0x3f];
    out += BASE64[(value >> 12) & 0x3f];
    out += have > 1 ? BASE64[(value >> 6) & 0x3f] : '=';
    out += have > 2 ? BASE64[value & 0x3f] : '=';
  }
  return out;
}

std::string base64Decode(const std::string& text) {
  int table[256];
  for (int i = 0; i < 256; i++) table[i] = -1;
  for (int i = 0; i < 64; i++) table[static_cast<unsigned char>(BASE64[i])] = i;

  std::string out;
  unsigned value = 0;
  int bits = 0;
  for (char ch : text) {
    if (ch == '=') break;
    if (ch == '\n' || ch == '\r' || ch == ' ') continue;
    int digit = table[static_cast<unsigned char>(ch)];
    if (digit < 0) return "";  // malformed: say so rather than guess
    value = (value << 6) | static_cast<unsigned>(digit);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += static_cast<char>((value >> bits) & 0xff);
    }
  }
  return out;
}

}  // namespace sh
