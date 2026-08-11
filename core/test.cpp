// Native sanity checks for the engine, so the C++ can be verified without an
// emscripten toolchain.  Build: see core/build.sh --test
#include <cstdio>
#include <cstdlib>
#include <string>

#include "expr.hpp"
#include "logic.hpp"
#include "qm.hpp"
#include "shell.hpp"

namespace {

int failures = 0;

void check(bool cond, const std::string& what) {
  if (!cond) {
    std::printf("FAIL  %s\n", what.c_str());
    ++failures;
  } else {
    std::printf("ok    %s\n", what.c_str());
  }
}

bool contains(const std::string& h, const std::string& needle) {
  return h.find(needle) != std::string::npos;
}

void testGates() {
  for (int kind = lg::kAnd; kind <= lg::kXnor; ++kind) {
    if (kind == lg::kNot) continue;
    lg::Circuit c;
    int a = c.addNode(lg::kInput, "A");
    int b = c.addNode(lg::kInput, "B");
    int g = c.addNode(kind, lg::kindName(static_cast<lg::GateKind>(kind)));
    int q = c.addNode(lg::kOutput, "Q");
    c.connect(a, g, 0);
    c.connect(b, g, 1);
    c.connect(g, q, 0);

    std::string expected;
    switch (kind) {
      case lg::kAnd:  expected = "0001"; break;
      case lg::kOr:   expected = "0111"; break;
      case lg::kNand: expected = "1110"; break;
      case lg::kNor:  expected = "1000"; break;
      case lg::kXor:  expected = "0110"; break;
      case lg::kXnor: expected = "1001"; break;
      default: break;
    }
    std::string got;
    for (unsigned m = 0; m < 4; ++m) got += c.evaluate(m)[q];
    check(got == expected,
          std::string(lg::kindName(static_cast<lg::GateKind>(kind))) +
              " truth column " + got + " == " + expected);
  }

  lg::Circuit c;
  int a = c.addNode(lg::kInput, "A");
  int g = c.addNode(lg::kNot, "NOT");
  int q = c.addNode(lg::kOutput, "Q");
  c.connect(a, g, 0);
  c.connect(g, q, 0);
  check(c.evaluate(0)[q] == '1' && c.evaluate(1)[q] == '0', "NOT inverts");
}

void testPropagationDelay() {
  // A chain of three inverters must take three gate delays to settle.
  lg::Circuit c;
  int a = c.addNode(lg::kInput, "A");
  int prev = a;
  for (int i = 0; i < 3; ++i) {
    int g = c.addNode(lg::kNot, "NOT");
    c.connect(prev, g, 0);
    prev = g;
  }
  int q = c.addNode(lg::kOutput, "Q");
  c.connect(prev, q, 0);
  std::string t = c.trace(1);
  check(contains(t, "\"settled\":4"), "3 inverters + output settle in 4 delays");
  check(c.evaluate(1)[q] == '0', "odd inverter chain inverts");
}

void testHalfAdder() {
  lg::Circuit c;
  int a = c.addNode(lg::kInput, "A");
  int b = c.addNode(lg::kInput, "B");
  int x = c.addNode(lg::kXor, "XOR");
  int n = c.addNode(lg::kAnd, "AND");
  int s = c.addNode(lg::kOutput, "S");
  int co = c.addNode(lg::kOutput, "C");
  c.connect(a, x, 0);
  c.connect(b, x, 1);
  c.connect(a, n, 0);
  c.connect(b, n, 1);
  c.connect(x, s, 0);
  c.connect(n, co, 0);
  std::string sum, carry;
  for (unsigned m = 0; m < 4; ++m) {
    std::string v = c.evaluate(m);
    sum += v[s];
    carry += v[co];
  }
  check(sum == "0110" && carry == "0001", "half adder sum/carry");
  check(contains(c.truthTable(), "\"inputs\":[\"A\",\"B\"]"), "truth table names inputs");
}

void testLatch() {
  // Cross-coupled NOR SR latch: setting S must drive Q high and hold.
  lg::Circuit c;
  int s = c.addNode(lg::kInput, "S");
  int r = c.addNode(lg::kInput, "R");
  int n1 = c.addNode(lg::kNor, "NOR");
  int n2 = c.addNode(lg::kNor, "NOR");
  c.connect(r, n1, 0);
  c.connect(n2, n1, 1);
  c.connect(n1, n2, 0);
  c.connect(s, n2, 1);
  // n1 is fed by R, so n1 carries Q and n2 carries Q-bar.
  check(c.hasCycle(), "latch is detected as cyclic");
  check(c.evaluate(0b10)[n1] == '1', "S=1,R=0 sets Q high");
  check(c.evaluate(0b10)[n2] == '0', "S=1,R=0 drives Q-bar low");
  check(c.evaluate(0b01)[n1] == '0', "S=0,R=1 resets Q low");
  check(c.evaluate(0b11)[n1] == '0' && c.evaluate(0b11)[n2] == '0',
        "S=R=1 forces both outputs low, the forbidden state");
  check(c.evaluate(0b00)[n1] == 'x', "S=0,R=0 holds an indeterminate stored state");
}

void testMinimise() {
  // F(A,B,C) = Sigma(0,1,2,3) reduces to NOT A.
  std::string j = lg::minimiseJson(3, "A,B,C", "0,1,2,3", "");
  check(contains(j, "\"sopLatex\":\"\\\\overline{A}\""), "Sigma(0,1,2,3) minimises to A'");

  // The classic four-variable case with don't-cares.
  std::string k = lg::minimiseJson(4, "A,B,C,D", "0,1,2,8,9,10", "");
  check(contains(k, "sopLatex"), "four-variable minimisation produces a result");

  std::string all = lg::minimiseJson(2, "A,B", "0,1,2,3", "");
  check(contains(all, "\"constantOne\":true"), "a full map minimises to 1");

  std::string none = lg::minimiseJson(2, "A,B", "", "");
  check(contains(none, "\"constantZero\":true"), "an empty map minimises to 0");
}

void testExpressions() {
  lg::Expr e = lg::parseExpression("AB + C");
  check(e.ok && e.vars.size() == 3, "AB + C parses with three variables");
  check(lg::evalExpr(e, e.root, 0b110) == 1, "A=1,B=1,C=0 gives 1");
  check(lg::evalExpr(e, e.root, 0b100) == 0, "A=1,B=0,C=0 gives 0");

  lg::Expr p = lg::parseExpression("A'.B + NOT C");
  check(p.ok, "prime and NOT keyword both parse");

  lg::Expr d = lg::parseExpression("(A+B)'");
  check(d.ok && contains(lg::exprToLatex(d, d.root), "\\overline{A + B}"),
        "De Morgan input renders with an overbar");

  lg::Expr bad = lg::parseExpression("A +");
  check(!bad.ok, "a dangling operator is rejected");

  lg::Expr unmatched = lg::parseExpression("(A+B");
  check(!unmatched.ok, "an unclosed bracket is rejected");

  std::string a = lg::analyseExpression("A xor B");
  check(contains(a, "\"minterms\":[1,2]"), "XOR analysis yields minterms 1 and 2");
  // The nested minimisation object is spliced in raw, so the comma that
  // follows it is the easiest separator in the whole writer to lose.
  check(contains(a, "},\"gateCount\""),
        "nested minimisation is followed by a separating comma");

  // An expression built into gates must agree with direct evaluation.
  lg::Circuit c;
  check(lg::buildFromExpression(c, "A.B + C").empty(), "expression builds a circuit");
  lg::Expr ref = lg::parseExpression("A.B + C");
  bool agree = true;
  const int out = c.nodeCount() - 1;
  for (unsigned m = 0; m < 8; ++m) {
    char got = c.evaluate(m)[out];
    if ((got == '1') != (lg::evalExpr(ref, ref.root, m) == 1)) agree = false;
  }
  check(agree, "built circuit matches the expression on all 8 rows");
}

void testGeometry() {
  lg::Circuit c;
  lg::buildFromExpression(c, "A.B");
  std::string g = c.geometry(0);
  check(contains(g, "\"width\""), "geometry reports a view box");
  // A two-input body is 52 tall, so the semicircle radius must be exactly 26.
  check(contains(g, "A26,26 0 0 1"), "AND outline uses a true h/2 semicircle");
  std::string iec = c.geometry(1);
  check(contains(iec, "\"iecLabel\":\"&\""), "IEC symbol set labels AND with &");
}


void testShellTokenise() {
  auto t = sh::tokenise("ls -la  /home/student");
  check(t.size() == 3 && t[0] == "ls" && t[2] == "/home/student", "tokenise splits on runs of space");
  t = sh::tokenise("echo \"hello there\" world");
  check(t.size() == 3 && t[1] == "hello there", "tokenise keeps a quoted phrase whole");
  t = sh::tokenise("echo 'it\\'s'");
  check(t.size() == 2, "tokenise survives an escaped quote");
  t = sh::tokenise("touch a\\ b.txt");
  check(t.size() == 2 && t[1] == "a b.txt", "tokenise honours a backslash-escaped space");
  check(sh::tokenise("   ").empty(), "tokenise of whitespace yields nothing");
}

void testGlob() {
  check(sh::globMatch("*.py", "main.py"), "glob * matches a stem");
  check(!sh::globMatch("*.py", "main.txt"), "glob * respects the extension");
  check(sh::globMatch("note?.md", "note1.md"), "glob ? matches one character");
  check(!sh::globMatch("note?.md", "note12.md"), "glob ? matches exactly one");
  check(sh::globMatch("[abc]at", "bat"), "glob character class matches");
  check(!sh::globMatch("[abc]at", "hat"), "glob character class excludes");
  check(sh::globMatch("[a-z]*", "zebra"), "glob range matches");
  check(sh::globMatch("*", "anything"), "bare star matches everything");
  check(sh::globMatch("a*b*c", "axxbyyc"), "glob backtracks across two stars");
  check(!sh::globMatch("a*b*c", "axxbyy"), "glob backtracking still requires the tail");
}

void testFsPaths() {
  sh::Fs fs;
  check(fs.cwd() == "/home/student", "shell starts in the home directory");
  check(fs.resolve("notes") == "/home/student/notes", "relative paths resolve against cwd");
  check(fs.resolve("../..") == "/", "dot dot climbs to the root");
  check(fs.resolve("/a/./b/../c") == "/a/c", "dot and dot dot collapse");
  check(fs.resolve("~/code") == "/home/student/code", "tilde expands to home");
  check(fs.resolve("//home///student//") == "/home/student", "repeated separators collapse");
  check(fs.chdir("/nowhere").find("no such") != std::string::npos, "cd reports a missing directory");
  check(fs.chdir("notes").empty() && fs.cwd() == "/home/student/notes", "cd moves the cwd");
}

void testFsFiles() {
  sh::Fs fs;
  check(fs.write("a.txt", "hello\n", 1).empty(), "write creates a file");
  check(fs.read("a.txt") == "hello\n", "read returns what was written");
  check(fs.append("a.txt", "again\n", 2).empty(), "append succeeds");
  check(fs.read("a.txt") == "hello\nagain\n", "append adds to the end");
  check(!fs.write("/nope/a.txt", "x", 3).empty(), "write refuses a missing parent");
  check(!fs.makeDirectory("/home/student", 4).empty(), "mkdir refuses an existing path");
  check(fs.makeDirectory("sub", 5).empty() && fs.isDirectory("sub"), "mkdir creates a directory");
  check(fs.write("sub/b.txt", "x", 6).empty(), "write into a new directory");
  check(!fs.remove("sub", false).empty(), "rm refuses a non-empty directory without -r");
  check(fs.remove("sub", true).empty() && !fs.exists("sub/b.txt"), "rm -r removes the whole subtree");
  check(!fs.remove("/home/student", true).empty(), "rm refuses to remove home");

  // A prefix that is not a path boundary must not be swept up by rm -r.
  fs.makeDirectory("/home/studentx", 7);
  fs.write("/home/studentx/keep.txt", "safe", 8);
  fs.makeDirectory("/home/stud", 9);
  fs.remove("/home/stud", true);
  check(fs.exists("/home/studentx/keep.txt"), "rm -r does not delete a sibling sharing a prefix");
}

void testFsCopyMove() {
  sh::Fs fs;
  fs.write("one.txt", "content", 1);
  check(fs.copy("one.txt", "two.txt", 2).empty(), "cp duplicates a file");
  check(fs.read("two.txt") == "content" && fs.exists("one.txt"), "cp leaves the original");
  check(fs.copy("one.txt", "notes", 3).empty(), "cp into a directory");
  check(fs.read("notes/one.txt") == "content", "cp into a directory keeps the name");
  check(fs.move("two.txt", "three.txt", 4).empty(), "mv renames");
  check(!fs.exists("two.txt") && fs.read("three.txt") == "content", "mv removes the original");
  check(!fs.copy("missing.txt", "x", 5).empty(), "cp reports a missing source");
}

void testFsListing() {
  sh::Fs fs;
  fs.write("b.txt", "", 1);
  fs.write("a.txt", "", 1);
  fs.makeDirectory("zdir", 1);
  // The home directory already holds code/ and notes/ from construction.
  auto entries = fs.list(".");
  check(entries.size() == 5, "list finds every immediate child");
  check(entries[0] == "code" && entries[1] == "notes" && entries[2] == "zdir",
        "list puts directories first, sorted");
  check(entries[3] == "a.txt", "files follow the directories, sorted");
  fs.write("zdir/deep.txt", "", 1);
  check(fs.list(".").size() == 5, "list does not descend");
  check(fs.walk("/home/student").size() == 7, "walk descends through the whole tree");
}

void testExpandAndComplete() {
  sh::Fs fs;
  fs.write("main.py", "", 1);
  fs.write("helper.py", "", 1);
  fs.write("notes.md", "", 1);
  auto matched = fs.expand("*.py");
  check(matched.size() == 2, "expand returns every glob match");
  check(fs.expand("*.rs").size() == 1 && fs.expand("*.rs")[0] == "*.rs",
        "expand passes an unmatched pattern through unchanged");
  check(fs.expand("main.py").size() == 1, "expand leaves a literal path alone");

  auto completions = fs.complete("ma");
  check(completions.size() == 1 && completions[0] == "main.py", "complete finishes a filename");
  check(fs.complete("no").size() == 2, "complete offers every candidate");
  bool trailing = false;
  for (const auto& c : fs.complete("not")) {
    if (c == "notes/") trailing = true;
  }
  check(trailing, "complete marks a directory with a trailing slash");
}

void testGrepAndCount() {
  sh::Fs fs;
  fs.write("log.txt", "alpha\nBETA\ngamma\nbeta again\n", 1);
  auto hits = sh::grep(fs, "beta", {"log.txt"}, false, false);
  check(hits.size() == 1, "grep is case sensitive by default");
  check(hits[0] == "log.txt:4:beta again", "grep reports path, line number and text");
  check(sh::grep(fs, "beta", {"log.txt"}, true, false).size() == 2, "grep -i ignores case");
  check(sh::grep(fs, "beta", {"log.txt"}, false, true).size() == 3, "grep -v inverts the match");
  check(sh::grep(fs, "x", {"notes"}, false, false).empty(), "grep skips directories");

  auto c = sh::count("one two\nthree\n");
  check(c.lines == 2 && c.words == 3 && c.chars == 14, "wc counts lines, words and characters");
  check(sh::count("no trailing newline").lines == 1, "wc counts a final line without a newline");
  check(sh::count("").lines == 0, "wc of nothing is nothing");
}

void testPersistence() {
  sh::Fs fs;
  fs.write("keep.txt", "line one\nline \"two\"\n", 1);
  fs.makeDirectory("deep", 1);
  fs.chdir("deep");
  std::string image = fs.dumpJson();

  sh::Fs restored;
  check(restored.loadJson(image).empty(), "an image loads without error");
  check(restored.cwd() == "/home/student/deep", "the working directory survives a round trip");
  check(restored.read("/home/student/keep.txt") == "line one\nline \"two\"\n",
        "file contents survive, including quotes and newlines");
  check(restored.isDirectory("/home/student/deep"), "directories survive as directories");
  check(!restored.loadJson("not json").empty(), "a malformed image is rejected");
}

}  // namespace

void testTextTools() {
  const std::vector<std::string> words = {"pear", "apple", "pear", "fig"};

  check(sh::lines("a\nb\n") == std::vector<std::string>({"a", "b"}),
        "a trailing newline does not make an extra line");
  check(sh::lines("a\nb") == std::vector<std::string>({"a", "b"}),
        "a missing final newline still gives both lines");

  check(sh::sortLines(words, false, false) ==
            std::vector<std::string>({"apple", "fig", "pear", "pear"}),
        "sort orders lexically");
  check(sh::sortLines(words, true, false) ==
            std::vector<std::string>({"pear", "pear", "fig", "apple"}),
        "sort -r reverses");
  check(sh::sortLines({"10", "9", "100"}, false, false) ==
            std::vector<std::string>({"10", "100", "9"}),
        "sorting numbers as text puts 9 last, which is the classic bug");
  check(sh::sortLines({"10", "9", "100"}, false, true) ==
            std::vector<std::string>({"9", "10", "100"}),
        "sort -n compares by value");

  const std::vector<std::string> sorted = sh::sortLines(words, false, false);
  check(sh::uniqueLines(sorted, false) ==
            std::vector<std::string>({"apple", "fig", "pear"}),
        "uniq collapses an adjacent run");
  check(sh::uniqueLines({"a", "b", "a"}, false) ==
            std::vector<std::string>({"a", "b", "a"}),
        "uniq only collapses neighbours, so unsorted input keeps duplicates");
  check(sh::uniqueLines(sorted, true).back().find("2 pear") != std::string::npos,
        "uniq -c reports how many times a line repeated");

  check(sh::numberLines({"first"})[0].find("1  first") != std::string::npos,
        "nl numbers from one");
  check(sh::reverseLines({"abc"}) == std::vector<std::string>({"cba"}),
        "rev turns a line round");

  const std::vector<std::string> csv = {"ada:91:7", "alan:55:4"};
  check(sh::cutFields(csv, ':', 2) == std::vector<std::string>({"91", "55"}),
        "cut picks a field, counting from one");
  check(sh::cutFields(csv, ':', 9) == std::vector<std::string>({"", ""}),
        "cut past the end gives nothing rather than failing");

  const std::vector<std::string> dump = sh::hexDump("Hi!");
  check(dump.size() == 1, "three bytes are one row");
  check(dump[0].find("4869 21") != std::string::npos, "xxd shows the bytes in hex");
  check(dump[0].find("Hi!") != std::string::npos, "xxd shows the printable column");
  check(sh::hexDump(std::string(17, 'x')).size() == 2, "seventeen bytes wrap to two rows");

  check(sh::base64Encode("Man") == "TWFu", "base64 encodes three bytes into four characters");
  check(sh::base64Encode("Ma") == "TWE=", "base64 pads two bytes with one =");
  check(sh::base64Encode("M") == "TQ==", "base64 pads one byte with two =");
  check(sh::base64Decode("TWFu") == "Man", "base64 decodes back");
  check(sh::base64Decode(sh::base64Encode("any bytes \x01\x02 at all")) ==
            "any bytes \x01\x02 at all",
        "base64 round-trips bytes that are not text");
  check(sh::base64Decode("not base64!!").empty(), "malformed base64 is refused");
}

int main() {
  testGates();
  testPropagationDelay();
  testHalfAdder();
  testLatch();
  testMinimise();
  testExpressions();
  testGeometry();
  testShellTokenise();
  testGlob();
  testFsPaths();
  testFsFiles();
  testFsCopyMove();
  testFsListing();
  testExpandAndComplete();
  testGrepAndCount();
  testTextTools();
  testPersistence();
  std::printf("\n%s\n", failures ? "FAILURES" : "all checks passed");
  return failures ? 1 : 0;
}
