// Emits the mascot geometry as JSON. Built natively by core/build.sh --sprite,
// so the shape has a single definition in C++ and the browser gets vectors it
// can scale to any size.
#include <cstdio>
#include "qm.hpp"

int main() {
  std::printf("%s", lg::spriteGeometryJson().c_str());
  return 0;
}
