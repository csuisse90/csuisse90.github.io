// Geometry generation: gate outlines, pin anchors and orthogonal wire routing.
//
// Outlines follow IEEE Std 91-1984 distinctive shapes, the set the IB uses:
//   AND   a rectangle whose right side is a true semicircle of radius h/2, so
//         the body is exactly as wide as it is tall.
//   OR    three circular arcs: a back arc of radius h bulging into the body,
//         and two arcs of radius 1.2h meeting at a point on the right.
//   XOR   the OR shape with a second back arc set 6 units further left.
//   NOT   an isoceles triangle with its apex on the right.
//   Inversion is a bubble of radius 4.5 tangent to the body, never a stroke.
// Passing symbolSet = 1 swaps in IEC 60617-12 rectangles with the qualifying
// symbols &, >=1, 1 and =1.

#include <algorithm>
#include <cmath>
#include <string>
#include <vector>

#include "json.hpp"
#include "logic.hpp"

namespace lg {

namespace {

constexpr double kBubbleR = 4.5;
constexpr double kColGap = 118.0;
constexpr double kRowGap = 74.0;
constexpr double kMargin = 46.0;
constexpr double kTerminalW = 34.0;
constexpr double kTerminalH = 26.0;

struct Shape {
  double w = 44, h = 44;
  bool bubble = false;
  std::string path;
  std::string iecLabel;
};

double bodyHeight(int fanIn) {
  return std::max(44.0, 20.0 * fanIn + 12.0);
}

std::string num(double v) {
  char tmp[32];
  if (std::fabs(v - std::round(v)) < 1e-6) {
    snprintf(tmp, sizeof tmp, "%lld", static_cast<long long>(std::llround(v)));
  } else {
    snprintf(tmp, sizeof tmp, "%.2f", v);
  }
  return tmp;
}

std::string andPath(double h) {
  const double r = h / 2.0;
  return "M0,0 L" + num(r) + ",0 A" + num(r) + "," + num(r) + " 0 0 1 " +
         num(r) + "," + num(h) + " L0," + num(h) + " Z";
}

std::string orPath(double h, double w, double xShift) {
  const double r = 1.2 * h;          // radius of the two pointed side arcs
  const double back = h;             // radius of the concave back arc
  const std::string x0 = num(xShift);
  return "M" + x0 + ",0 " +
         "A" + num(r) + "," + num(r) + " 0 0 1 " + num(w) + "," + num(h / 2) + " " +
         "A" + num(r) + "," + num(r) + " 0 0 1 " + x0 + "," + num(h) + " " +
         "A" + num(back) + "," + num(back) + " 0 0 0 " + x0 + ",0 Z";
}

// The extra concave arc that distinguishes XOR from OR.
std::string xorBackArc(double h, double xShift) {
  return "M" + num(xShift) + ",0 A" + num(h) + "," + num(h) + " 0 0 1 " +
         num(xShift) + "," + num(h);
}

std::string notPath(double h, double w) {
  return "M0,0 L" + num(w) + "," + num(h / 2) + " L0," + num(h) + " Z";
}

std::string rectPath(double w, double h) {
  return "M0,0 L" + num(w) + ",0 L" + num(w) + "," + num(h) + " L0," + num(h) + " Z";
}

Shape shapeFor(GateKind kind, int fanIn, int symbolSet) {
  Shape s;
  s.h = bodyHeight(fanIn);

  if (kind == kInput || kind == kOutput || kind == kConst0 || kind == kConst1) {
    s.w = kTerminalW;
    s.h = kTerminalH;
    s.path = rectPath(s.w, s.h);
    return s;
  }

  switch (kind) {
    case kNand: case kNor: case kXnor: case kNot: s.bubble = true; break;
    default: break;
  }

  if (symbolSet == 1) {
    s.w = 46;
    s.path = rectPath(s.w, s.h);
    switch (kind) {
      case kAnd: case kNand: s.iecLabel = "&"; break;
      case kOr: case kNor: s.iecLabel = "≥1"; break;
      case kXor: case kXnor: s.iecLabel = "=1"; break;
      default: s.iecLabel = "1"; break;
    }
    return s;
  }

  switch (kind) {
    case kAnd:
    case kNand:
      s.w = s.h;
      s.path = andPath(s.h);
      break;
    case kOr:
    case kNor:
      s.w = 1.15 * s.h;
      s.path = orPath(s.h, s.w, 0);
      break;
    case kXor:
    case kXnor:
      s.w = 1.15 * s.h;
      s.path = orPath(s.h, s.w, 6);
      break;
    case kNot:
    case kBuffer:
    default:
      s.w = 0.86 * s.h;
      s.path = notPath(s.h, s.w);
      break;
  }
  return s;
}

}  // namespace

std::string Circuit::geometry(int symbolSet) {
  reindex();
  const int n = nodeCount();

  // --- layering ----------------------------------------------------------
  std::vector<int> layer(n, 0);
  for (int pass = 0; pass < n + 2; ++pass) {
    bool moved = false;
    for (int i = 0; i < n; ++i) {
      int want = 0;
      for (int s : nodes_[i].srcNode) {
        if (s >= 0) want = std::max(want, layer[s] + 1);
      }
      if (want > layer[i]) {
        layer[i] = want;
        moved = true;
      }
    }
    if (!moved) break;  // cycles simply stop growing once the pass count runs out
  }
  // Outputs sit in a column of their own, to the right of everything.
  int maxLayer = 0;
  for (int i = 0; i < n; ++i) maxLayer = std::max(maxLayer, layer[i]);
  for (int i : outputs_) layer[i] = maxLayer;

  std::vector<Shape> shapes(n);
  for (int i = 0; i < n; ++i) {
    const int fanIn = static_cast<int>(nodes_[i].srcNode.size());
    shapes[i] = shapeFor(nodes_[i].kind, fanIn, symbolSet);
  }

  // --- placement ---------------------------------------------------------
  std::vector<int> rowInLayer(n, 0);
  std::vector<int> layerCount(maxLayer + 1, 0);
  for (int i = 0; i < n; ++i) rowInLayer[i] = layerCount[layer[i]]++;
  const int tallest = *std::max_element(layerCount.begin(), layerCount.end());

  std::vector<double> px(n, 0), py(n, 0);
  for (int i = 0; i < n; ++i) {
    if (nodes_[i].placed) {
      px[i] = nodes_[i].x;
      py[i] = nodes_[i].y;
      continue;
    }
    const double colTop =
        kMargin + (tallest - layerCount[layer[i]]) * kRowGap / 2.0;
    px[i] = kMargin + layer[i] * kColGap;
    py[i] = colTop + rowInLayer[i] * kRowGap - shapes[i].h / 2.0 + kRowGap / 2.0;
  }

  auto outPin = [&](int i) {
    const double bx = shapes[i].bubble ? 2 * kBubbleR : 0;
    return std::pair<double, double>(px[i] + shapes[i].w + bx,
                                     py[i] + shapes[i].h / 2.0);
  };
  auto inPin = [&](int i, int pin) {
    const int fan = std::max<int>(1, static_cast<int>(nodes_[i].srcNode.size()));
    return std::pair<double, double>(
        px[i], py[i] + shapes[i].h * (pin + 1) / (fan + 1));
  };

  double viewW = 0, viewH = 0;
  for (int i = 0; i < n; ++i) {
    viewW = std::max(viewW, px[i] + shapes[i].w + 3 * kBubbleR);
    viewH = std::max(viewH, py[i] + shapes[i].h);
  }
  viewW += kMargin;
  viewH += kMargin;

  // Backward edges are routed underneath the diagram, so reserve that band
  // before the view box is written out.
  int feedbackCount = 0;
  for (int i = 0; i < n; ++i) {
    for (size_t pin = 0; pin < nodes_[i].srcNode.size(); ++pin) {
      const int src = nodes_[i].srcNode[pin];
      if (src < 0) continue;
      if (inPin(i, static_cast<int>(pin)).first <= outPin(src).first + 16) {
        ++feedbackCount;
      }
    }
  }
  const double feedbackBase = viewH - kMargin / 2 + 10;
  if (feedbackCount > 0) {
    viewH = feedbackBase + std::min(feedbackCount, 4) * 9.0 + kMargin / 2;
  }

  // --- output ------------------------------------------------------------
  jw::Out o;
  o.beginObj();
  o.key("width");
  o.num(viewW);
  o.key("height");
  o.num(viewH);
  o.key("bubbleR");
  o.num(kBubbleR);

  o.key("nodes");
  o.beginArr();
  for (int i = 0; i < n; ++i) {
    const Node& nd = nodes_[i];
    const Shape& s = shapes[i];
    o.beginObj();
    o.key("id");
    o.num(i);
    o.key("kind");
    o.str(kindName(nd.kind));
    o.key("label");
    o.str(nd.label);
    o.key("x");
    o.num(px[i]);
    o.key("y");
    o.num(py[i]);
    o.key("w");
    o.num(s.w);
    o.key("h");
    o.num(s.h);
    o.key("path");
    o.str(s.path);
    if (symbolSet == 0 && (nd.kind == kXor || nd.kind == kXnor)) {
      o.key("extraArc");
      o.str(xorBackArc(s.h, 0));
    }
    if (!s.iecLabel.empty()) {
      o.key("iecLabel");
      o.str(s.iecLabel);
    }
    o.key("bubble");
    if (s.bubble) {
      o.beginObj();
      o.key("cx");
      o.num(px[i] + s.w + kBubbleR);
      o.key("cy");
      o.num(py[i] + s.h / 2);
      o.key("r");
      o.num(kBubbleR);
      o.endObj();
    } else {
      o.null();
    }
    o.key("out");
    {
      auto p = outPin(i);
      o.beginObj();
      o.key("x");
      o.num(p.first);
      o.key("y");
      o.num(p.second);
      o.endObj();
    }
    o.key("in");
    o.beginArr();
    for (size_t pin = 0; pin < nd.srcNode.size(); ++pin) {
      auto p = inPin(i, static_cast<int>(pin));
      o.beginObj();
      o.key("x");
      o.num(p.first);
      o.key("y");
      o.num(p.second);
      o.key("src");
      o.num(nd.srcNode[pin]);
      o.endObj();
    }
    o.endArr();
    o.endObj();
  }
  o.endArr();

  // Wires: three-segment orthogonal routes, with a per-channel offset so that
  // parallel runs between the same pair of columns do not sit on top of
  // each other. Backward edges (feedback in a latch) drop below the diagram.
  o.key("wires");
  o.beginArr();
  std::vector<int> channelUse(maxLayer + 3, 0);
  int feedbackIndex = 0;
  for (int i = 0; i < n; ++i) {
    for (size_t pin = 0; pin < nodes_[i].srcNode.size(); ++pin) {
      const int src = nodes_[i].srcNode[pin];
      if (src < 0) continue;
      auto a = outPin(src);
      auto b = inPin(i, static_cast<int>(pin));

      o.beginObj();
      o.key("from");
      o.num(src);
      o.key("to");
      o.num(i);
      o.key("pin");
      o.num(static_cast<double>(pin));
      o.key("points");
      o.beginArr();

      auto pt = [&](double x, double y) {
        o.beginArr();
        o.num(x);
        o.num(y);
        o.endArr();
      };

      if (b.first > a.first + 16) {
        if (std::fabs(a.second - b.second) < 0.5) {
          pt(a.first, a.second);
          pt(b.first, b.second);
        } else {
          const int ch = std::min<int>(layer[i], maxLayer + 2);
          const double off = (channelUse[ch]++ % 5) * 6.0 - 12.0;
          const double mid = (a.first + b.first) / 2.0 + off;
          pt(a.first, a.second);
          pt(mid, a.second);
          pt(mid, b.second);
          pt(b.first, b.second);
        }
      } else {
        const double drop = feedbackBase + (feedbackIndex++ % 4) * 9.0;
        pt(a.first, a.second);
        pt(a.first + 14, a.second);
        pt(a.first + 14, drop);
        pt(b.first - 14, drop);
        pt(b.first - 14, b.second);
        pt(b.first, b.second);
      }
      o.endArr();
      o.endObj();
    }
  }
  o.endArr();
  o.endObj();
  return o.done();
}

}  // namespace lg
