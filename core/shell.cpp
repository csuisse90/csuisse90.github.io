#include "shell.hpp"

#include <algorithm>
#include <cctype>
#include <limits>
#include <string>

#include "json.hpp"

namespace sh {
namespace {

std::vector<std::string> splitPath(const std::string& path) {
  std::vector<std::string> parts;
  std::string current;
  for (char c : path) {
    if (c == '/') {
      if (!current.empty()) parts.push_back(current);
      current.clear();
    } else {
      current += c;
    }
  }
  if (!current.empty()) parts.push_back(current);
  return parts;
}

std::string join(const std::vector<std::string>& parts) {
  std::string out;
  for (const auto& p : parts) {
    out += '/';
    out += p;
  }
  return out.empty() ? "/" : out;
}

char lower(char c) { return static_cast<char>(std::tolower(static_cast<unsigned char>(c))); }

}  // namespace

std::vector<std::string> tokenise(const std::string& line) {
  std::vector<std::string> words;
  std::string current;
  bool inWord = false;
  char quote = 0;

  for (size_t i = 0; i < line.size(); i++) {
    char c = line[i];
    if (quote) {
      // Inside double quotes a backslash still escapes; inside single quotes
      // everything is literal, which is what every shell does.
      if (quote == '"' && c == '\\' && i + 1 < line.size()) {
        current += line[++i];
      } else if (c == quote) {
        quote = 0;
      } else {
        current += c;
      }
      continue;
    }
    if (c == '\'' || c == '"') {
      quote = c;
      inWord = true;
    } else if (c == '\\' && i + 1 < line.size()) {
      current += line[++i];
      inWord = true;
    } else if (c == ' ' || c == '\t') {
      if (inWord) {
        words.push_back(current);
        current.clear();
        inWord = false;
      }
    } else {
      current += c;
      inWord = true;
    }
  }
  if (inWord) words.push_back(current);
  return words;
}

bool globMatch(const std::string& pattern, const std::string& name) {
  size_t p = 0;
  size_t n = 0;
  size_t starP = std::string::npos;
  size_t starN = 0;

  while (n < name.size()) {
    if (p < pattern.size() && pattern[p] == '[') {
      // A character class, optionally negated with ! immediately after [.
      size_t close = pattern.find(']', p + 1);
      if (close == std::string::npos) return false;
      bool negate = pattern[p + 1] == '!';
      size_t from = p + (negate ? 2 : 1);
      bool hit = false;
      for (size_t i = from; i < close; i++) {
        if (i + 2 < close && pattern[i + 1] == '-') {
          if (name[n] >= pattern[i] && name[n] <= pattern[i + 2]) hit = true;
          i += 2;
        } else if (pattern[i] == name[n]) {
          hit = true;
        }
      }
      if (hit != negate) {
        p = close + 1;
        n++;
        continue;
      }
    } else if (p < pattern.size() && (pattern[p] == '?' || pattern[p] == name[n])) {
      p++;
      n++;
      continue;
    } else if (p < pattern.size() && pattern[p] == '*') {
      starP = p++;
      starN = n;
      continue;
    }

    if (starP != std::string::npos) {
      // Backtrack: let the last * swallow one more character.
      p = starP + 1;
      n = ++starN;
      continue;
    }
    return false;
  }
  while (p < pattern.size() && pattern[p] == '*') p++;
  return p == pattern.size();
}

Fs::Fs() {
  int64_t t = 0;
  nodes_["/"] = {true, "", t};
  for (const char* dir : {"/home", "/home/student", "/home/student/notes",
                          "/home/student/code", "/tmp", "/usr", "/usr/share"}) {
    nodes_[dir] = {true, "", t};
  }
}

std::string Fs::parentOf(const std::string& absolute) const {
  if (absolute == "/") return "/";
  size_t slash = absolute.find_last_of('/');
  return slash == 0 ? "/" : absolute.substr(0, slash);
}

bool Fs::parentIsDirectory(const std::string& absolute) const {
  const Node* p = node(parentOf(absolute));
  return p != nullptr && p->directory;
}

std::string Fs::resolve(const std::string& path) const {
  std::vector<std::string> parts;
  if (!path.empty() && path[0] == '/') {
    parts = splitPath(path);
  } else if (path.rfind("~", 0) == 0) {
    parts = splitPath("/home/student" + path.substr(1));
  } else {
    parts = splitPath(cwd_);
    for (const auto& p : splitPath(path)) parts.push_back(p);
  }

  std::vector<std::string> out;
  for (const auto& p : parts) {
    if (p == ".") continue;
    if (p == "..") {
      if (!out.empty()) out.pop_back();
      continue;
    }
    out.push_back(p);
  }
  return join(out);
}

const Node* Fs::node(const std::string& absolute) const {
  auto it = nodes_.find(absolute);
  return it == nodes_.end() ? nullptr : &it->second;
}

bool Fs::exists(const std::string& path) const { return node(resolve(path)) != nullptr; }

bool Fs::isDirectory(const std::string& path) const {
  const Node* n = node(resolve(path));
  return n != nullptr && n->directory;
}

size_t Fs::size(const std::string& path) const {
  const Node* n = node(resolve(path));
  return n == nullptr ? 0 : n->content.size();
}

std::string Fs::chdir(const std::string& path) {
  std::string target = resolve(path);
  const Node* n = node(target);
  if (n == nullptr) return "cd: " + path + ": no such file or directory";
  if (!n->directory) return "cd: " + path + ": not a directory";
  cwd_ = target;
  return "";
}

std::string Fs::read(const std::string& path) const {
  const Node* n = node(resolve(path));
  return n == nullptr ? "" : n->content;
}

std::string Fs::write(const std::string& path, const std::string& content, int64_t when) {
  std::string target = resolve(path);
  if (target == "/") return "cannot write to /";
  const Node* existing = node(target);
  if (existing != nullptr && existing->directory) return target + ": is a directory";
  if (!parentIsDirectory(target)) return parentOf(target) + ": no such directory";
  nodes_[target] = {false, content, when};
  return "";
}

std::string Fs::append(const std::string& path, const std::string& content, int64_t when) {
  return write(path, read(path) + content, when);
}

std::string Fs::makeDirectory(const std::string& path, int64_t when) {
  std::string target = resolve(path);
  if (node(target) != nullptr) return target + ": already exists";
  if (!parentIsDirectory(target)) return parentOf(target) + ": no such directory";
  nodes_[target] = {true, "", when};
  return "";
}

std::string Fs::remove(const std::string& path, bool recursive) {
  std::string target = resolve(path);
  const Node* n = node(target);
  if (n == nullptr) return path + ": no such file or directory";
  if (target == "/" || target == "/home/student") return path + ": refusing to remove";

  if (n->directory) {
    if (!recursive && !list(target).empty()) return path + ": directory not empty";
    // Erase the directory and everything beneath it. The prefix test needs the
    // trailing slash, or /home/studentx would be caught by /home/student.
    std::string prefix = target == "/" ? "/" : target + "/";
    for (auto it = nodes_.begin(); it != nodes_.end();) {
      if (it->first == target || it->first.rfind(prefix, 0) == 0) {
        it = nodes_.erase(it);
      } else {
        ++it;
      }
    }
    return "";
  }
  nodes_.erase(target);
  return "";
}

std::string Fs::copy(const std::string& from, const std::string& to, int64_t when) {
  std::string source = resolve(from);
  const Node* n = node(source);
  if (n == nullptr) return from + ": no such file or directory";

  std::string target = resolve(to);
  // Copying onto a directory means copying into it, under the same name.
  const Node* destination = node(target);
  if (destination != nullptr && destination->directory) {
    target = (target == "/" ? "" : target) + source.substr(source.find_last_of('/'));
  }
  if (!parentIsDirectory(target)) return parentOf(target) + ": no such directory";

  if (n->directory) {
    std::string prefix = source + "/";
    nodes_[target] = {true, "", when};
    for (const auto& [path, entry] : std::map<std::string, Node>(nodes_)) {
      if (path.rfind(prefix, 0) == 0) {
        nodes_[target + path.substr(source.size())] = {entry.directory, entry.content, when};
      }
    }
    return "";
  }
  nodes_[target] = {false, n->content, when};
  return "";
}

std::string Fs::move(const std::string& from, const std::string& to, int64_t when) {
  std::string copied = copy(from, to, when);
  if (!copied.empty()) return copied;
  return remove(from, true);
}

std::vector<std::string> Fs::list(const std::string& path) const {
  std::string target = resolve(path);
  std::string prefix = target == "/" ? "/" : target + "/";

  std::vector<std::string> directories;
  std::vector<std::string> files;
  for (const auto& [full, entry] : nodes_) {
    if (full == target || full.rfind(prefix, 0) != 0) continue;
    std::string rest = full.substr(prefix.size());
    if (rest.find('/') != std::string::npos) continue;  // not an immediate child
    (entry.directory ? directories : files).push_back(rest);
  }
  std::sort(directories.begin(), directories.end());
  std::sort(files.begin(), files.end());
  directories.insert(directories.end(), files.begin(), files.end());
  return directories;
}

std::vector<std::string> Fs::walk(const std::string& root) const {
  std::string target = resolve(root);
  std::string prefix = target == "/" ? "/" : target + "/";
  std::vector<std::string> out;
  for (const auto& [full, entry] : nodes_) {
    (void)entry;
    if (full == target || full.rfind(prefix, 0) == 0) out.push_back(full);
  }
  std::sort(out.begin(), out.end());
  return out;
}

std::vector<std::string> Fs::expand(const std::string& argument) const {
  if (argument.find('*') == std::string::npos && argument.find('?') == std::string::npos &&
      argument.find('[') == std::string::npos) {
    return {argument};
  }

  size_t slash = argument.find_last_of('/');
  std::string directory = slash == std::string::npos ? "." : argument.substr(0, slash);
  std::string pattern = slash == std::string::npos ? argument : argument.substr(slash + 1);
  if (directory.empty()) directory = "/";

  std::vector<std::string> out;
  for (const auto& name : list(directory)) {
    if (globMatch(pattern, name)) {
      out.push_back(slash == std::string::npos ? name : directory + "/" + name);
    }
  }
  if (out.empty()) return {argument};
  return out;
}

std::vector<std::string> Fs::complete(const std::string& prefix) const {
  size_t slash = prefix.find_last_of('/');
  std::string directory = slash == std::string::npos ? "." : prefix.substr(0, slash + 1);
  std::string stem = slash == std::string::npos ? prefix : prefix.substr(slash + 1);
  std::string lookIn = directory == "." ? cwd_ : directory;

  std::vector<std::string> out;
  for (const auto& name : list(lookIn)) {
    if (name.rfind(stem, 0) != 0) continue;
    std::string full = (directory == "." ? "" : directory) + name;
    if (isDirectory(lookIn + (lookIn.back() == '/' ? "" : "/") + name)) full += "/";
    out.push_back(full);
  }
  return out;
}

std::string Fs::listJson(const std::string& path) const {
  std::string target = resolve(path);
  jw::Out j;
  j.beginObj();
  j.key("path");
  j.str(target);
  j.key("entries");
  j.beginArr();
  for (const auto& name : list(target)) {
    std::string full = (target == "/" ? "" : target) + "/" + name;
    const Node* n = node(full);
    j.beginObj();
    j.key("name");
    j.str(name);
    j.key("directory");
    j.boolean(n != nullptr && n->directory);
    j.key("size");
    j.num(static_cast<double>(n == nullptr ? 0 : n->content.size()));
    j.key("modified");
    j.num(static_cast<double>(n == nullptr ? 0 : n->modified));
    j.endObj();
  }
  j.endArr();
  j.endObj();
  return j.done();
}

std::string Fs::treeJson(const std::string& path) const {
  std::string target = resolve(path);
  jw::Out j;
  j.beginArr();
  for (const auto& full : walk(target)) {
    if (full == target) continue;
    const Node* n = node(full);
    size_t depth = 0;
    for (size_t i = target.size(); i < full.size(); i++) {
      if (full[i] == '/') depth++;
    }
    j.beginObj();
    j.key("path");
    j.str(full);
    j.key("name");
    j.str(full.substr(full.find_last_of('/') + 1));
    j.key("depth");
    j.num(static_cast<double>(depth));
    j.key("directory");
    j.boolean(n != nullptr && n->directory);
    j.endObj();
  }
  j.endArr();
  return j.done();
}

std::string Fs::statJson(const std::string& path) const {
  std::string target = resolve(path);
  const Node* n = node(target);
  jw::Out j;
  j.beginObj();
  j.key("path");
  j.str(target);
  j.key("exists");
  j.boolean(n != nullptr);
  j.key("directory");
  j.boolean(n != nullptr && n->directory);
  j.key("size");
  j.num(static_cast<double>(n == nullptr ? 0 : n->content.size()));
  j.key("modified");
  j.num(static_cast<double>(n == nullptr ? 0 : n->modified));
  j.endObj();
  return j.done();
}

std::string Fs::dumpJson() const {
  jw::Out j;
  j.beginObj();
  j.key("cwd");
  j.str(cwd_);
  j.key("nodes");
  j.beginArr();
  for (const auto& [path, entry] : nodes_) {
    j.beginObj();
    j.key("path");
    j.str(path);
    j.key("directory");
    j.boolean(entry.directory);
    j.key("content");
    j.str(entry.content);
    j.key("modified");
    j.num(static_cast<double>(entry.modified));
    j.endObj();
  }
  j.endArr();
  j.endObj();
  return j.done();
}

std::string Fs::loadJson(const std::string& json) {
  // A deliberately small reader for exactly the shape dumpJson writes. It is
  // not a general JSON parser and does not pretend to be.
  auto findString = [&](size_t from, const std::string& key, std::string& out) -> size_t {
    std::string needle = "\"" + key + "\":\"";
    size_t at = json.find(needle, from);
    if (at == std::string::npos) return std::string::npos;
    size_t start = at + needle.size();
    std::string value;
    for (size_t i = start; i < json.size(); i++) {
      if (json[i] == '\\' && i + 1 < json.size()) {
        char next = json[++i];
        value += next == 'n' ? '\n' : next == 't' ? '\t' : next;
      } else if (json[i] == '"') {
        out = value;
        return i;
      } else {
        value += json[i];
      }
    }
    return std::string::npos;
  };

  std::string parsedCwd;
  if (findString(0, "cwd", parsedCwd) == std::string::npos) return "malformed image";

  std::map<std::string, Node> loaded;
  size_t at = json.find("\"nodes\"");
  while (at != std::string::npos) {
    std::string path;
    size_t after = findString(at, "path", path);
    if (after == std::string::npos) break;
    std::string content;
    size_t end = findString(after, "content", content);
    bool directory = json.find("\"directory\":true", after) < json.find("\"content\"", after);
    loaded[path] = {directory, content, 0};
    at = end;
  }
  if (loaded.empty()) return "malformed image";

  nodes_ = loaded;
  cwd_ = loaded.count(parsedCwd) ? parsedCwd : "/home/student";
  return "";
}

std::vector<std::string> grep(const Fs& fs, const std::string& pattern,
                              const std::vector<std::string>& paths, bool ignoreCase,
                              bool invert) {
  std::string needle = pattern;
  if (ignoreCase) std::transform(needle.begin(), needle.end(), needle.begin(), lower);

  std::vector<std::string> out;
  for (const auto& path : paths) {
    if (fs.isDirectory(path)) continue;
    const std::string text = fs.read(path);
    size_t lineNumber = 0;
    size_t start = 0;
    while (start <= text.size()) {
      size_t stop = text.find('\n', start);
      if (stop == std::string::npos) stop = text.size();
      std::string line = text.substr(start, stop - start);
      lineNumber++;

      std::string haystack = line;
      if (ignoreCase) std::transform(haystack.begin(), haystack.end(), haystack.begin(), lower);
      bool hit = haystack.find(needle) != std::string::npos;
      if (hit != invert && !(line.empty() && stop == text.size())) {
        out.push_back(path + ":" + std::to_string(lineNumber) + ":" + line);
      }
      if (stop == text.size()) break;
      start = stop + 1;
    }
  }
  return out;
}

Counts count(const std::string& text) {
  Counts c;
  c.chars = text.size();
  bool inWord = false;
  for (char ch : text) {
    if (ch == '\n') c.lines++;
    if (ch == ' ' || ch == '\t' || ch == '\n') {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      c.words++;
    }
  }
  if (!text.empty() && text.back() != '\n') c.lines++;
  return c;
}

std::vector<std::string> lines(const std::string& text) {
  std::vector<std::string> out;
  size_t start = 0;
  while (start <= text.size()) {
    size_t stop = text.find('\n', start);
    if (stop == std::string::npos) {
      out.push_back(text.substr(start));
      break;
    }
    out.push_back(text.substr(start, stop - start));
    start = stop + 1;
  }
  // A file ending in a newline has no empty last line, whatever split says.
  if (!out.empty() && out.back().empty()) out.pop_back();
  return out;
}

namespace {

/** The leading number of a line, for `sort -n`. Lines without one sort first,
 *  which is what coreutils does. */
double leadingNumber(const std::string& line) {
  size_t at = 0;
  while (at < line.size() && (line[at] == ' ' || line[at] == '\t')) at++;
  size_t start = at;
  if (at < line.size() && (line[at] == '-' || line[at] == '+')) at++;
  bool digits = false;
  while (at < line.size() && std::isdigit(static_cast<unsigned char>(line[at]))) {
    at++;
    digits = true;
  }
  if (at < line.size() && line[at] == '.') {
    at++;
    while (at < line.size() && std::isdigit(static_cast<unsigned char>(line[at]))) {
      at++;
      digits = true;
    }
  }
  if (!digits) return -std::numeric_limits<double>::infinity();
  return std::stod(line.substr(start, at - start));
}

const char* const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

}  // namespace

std::vector<std::string> sortLines(const std::vector<std::string>& in, bool reverse,
                                   bool numeric) {
  std::vector<std::string> out = in;
  // Stable, so equal keys keep their original order — which is what makes
  // sorting by one field and then another do what people expect.
  std::stable_sort(out.begin(), out.end(),
                   [numeric](const std::string& a, const std::string& b) {
                     if (numeric) {
                       double x = leadingNumber(a);
                       double y = leadingNumber(b);
                       if (x != y) return x < y;
                       return a < b;
                     }
                     return a < b;
                   });
  if (reverse) std::reverse(out.begin(), out.end());
  return out;
}

std::vector<std::string> uniqueLines(const std::vector<std::string>& in, bool withCounts) {
  std::vector<std::string> out;
  size_t i = 0;
  while (i < in.size()) {
    size_t run = 1;
    while (i + run < in.size() && in[i + run] == in[i]) run++;
    if (withCounts) {
      std::string count = std::to_string(run);
      out.push_back(std::string(run < 1000 ? 7 - count.size() : 1, ' ') + count + " " + in[i]);
    } else {
      out.push_back(in[i]);
    }
    i += run;
  }
  return out;
}

std::vector<std::string> numberLines(const std::vector<std::string>& in) {
  std::vector<std::string> out;
  for (size_t i = 0; i < in.size(); i++) {
    std::string n = std::to_string(i + 1);
    out.push_back(std::string(n.size() < 6 ? 6 - n.size() : 1, ' ') + n + "  " + in[i]);
  }
  return out;
}

std::vector<std::string> reverseLines(const std::vector<std::string>& in) {
  std::vector<std::string> out;
  out.reserve(in.size());
  for (const std::string& line : in) out.push_back(std::string(line.rbegin(), line.rend()));
  return out;
}

std::vector<std::string> cutFields(const std::vector<std::string>& in, char delimiter,
                                   size_t field) {
  std::vector<std::string> out;
  for (const std::string& line : in) {
    size_t start = 0;
    size_t seen = 0;
    std::string picked;
    while (true) {
      size_t stop = line.find(delimiter, start);
      seen++;
      std::string part = stop == std::string::npos ? line.substr(start)
                                                   : line.substr(start, stop - start);
      if (seen == field) {
        picked = part;
        break;
      }
      if (stop == std::string::npos) break;
      start = stop + 1;
    }
    out.push_back(picked);
  }
  return out;
}

std::vector<std::string> hexDump(const std::string& text) {
  static const char* digits = "0123456789abcdef";
  std::vector<std::string> out;
  for (size_t offset = 0; offset < text.size(); offset += 16) {
    std::string address;
    for (int shift = 28; shift >= 0; shift -= 4) {
      address += digits[(offset >> shift) & 0xf];
    }
    std::string hex;
    std::string printable;
    for (size_t i = 0; i < 16; i++) {
      if (i && i % 2 == 0) hex += ' ';
      if (offset + i < text.size()) {
        unsigned char byte = static_cast<unsigned char>(text[offset + i]);
        hex += digits[byte >> 4];
        hex += digits[byte & 0xf];
        printable += (byte >= 32 && byte < 127) ? static_cast<char>(byte) : '.';
      } else {
        hex += "  ";
      }
    }
    out.push_back(address + ": " + hex + "  " + printable);
  }
  return out;
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
    if (ch == '=' ) break;
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
