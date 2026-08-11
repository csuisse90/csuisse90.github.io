// base64, for A1.2.3 — how bytes travel through something that only carries
// text. It lives in its own file because both wasm modules need it and only one
// of them wants the shell.
#pragma once

#include <string>

namespace sh {

std::string base64Encode(const std::string& text);
std::string base64Decode(const std::string& text);

}  // namespace sh
