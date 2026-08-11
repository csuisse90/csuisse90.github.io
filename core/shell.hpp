#pragma once

// A virtual filesystem and command line, for the terminal on the site. The
// parts that get hammered — path resolution, globbing, searching, listing —
// live here rather than in JavaScript, because the shell touches them on every
// keystroke and every completion.
//
// Python is not here. That is Pyodide's job; the shell hands it a source
// string and takes back whatever it printed.

#include <cstdint>
#include <map>
#include <string>
#include <vector>

#include "base64.hpp"  // base64Encode/base64Decode, used by the shell tools

namespace sh {

struct Node {
  bool directory = false;
  std::string content;
  /** Seconds since the epoch, supplied by the caller — this has no clock. */
  int64_t modified = 0;
};

/** Splits a command line into words, honouring quotes and backslash escapes. */
std::vector<std::string> tokenise(const std::string& line);

/** True when `name` matches a glob of *, ? and [abc] character classes. */
bool globMatch(const std::string& pattern, const std::string& name);

class Fs {
 public:
  Fs();

  /** Resolves a path against the working directory, applying . and .. and
   *  collapsing repeated separators. Always returns an absolute path. */
  std::string resolve(const std::string& path) const;

  bool exists(const std::string& path) const;
  bool isDirectory(const std::string& path) const;

  std::string cwd() const { return cwd_; }
  /** Returns an error message, or empty on success. */
  std::string chdir(const std::string& path);

  std::string read(const std::string& path) const;
  std::string write(const std::string& path, const std::string& content, int64_t when);
  std::string append(const std::string& path, const std::string& content, int64_t when);
  std::string makeDirectory(const std::string& path, int64_t when);
  std::string remove(const std::string& path, bool recursive);
  std::string move(const std::string& from, const std::string& to, int64_t when);
  std::string copy(const std::string& from, const std::string& to, int64_t when);

  /** Immediate children of a directory, sorted, directories first. */
  std::vector<std::string> list(const std::string& path) const;

  /** Every path under `root`, in order. Used by tree, find and du. */
  std::vector<std::string> walk(const std::string& root) const;

  /** Paths matching a possibly-globbed argument. Falls back to the argument
   *  itself when nothing matches, which is what a shell does. */
  std::vector<std::string> expand(const std::string& argument) const;

  /** Completions for a partially typed path, as full replacement text. */
  std::vector<std::string> complete(const std::string& prefix) const;

  const Node* node(const std::string& absolute) const;
  size_t size(const std::string& path) const;

  /** JSON for the JavaScript side: listing, tree, stat, and the whole disk. */
  std::string listJson(const std::string& path) const;
  std::string treeJson(const std::string& path) const;
  std::string statJson(const std::string& path) const;
  std::string dumpJson() const;
  std::string loadJson(const std::string& json);

 private:
  std::map<std::string, Node> nodes_;
  std::string cwd_ = "/home/student";

  std::string parentOf(const std::string& absolute) const;
  bool parentIsDirectory(const std::string& absolute) const;
};

/** grep: returns matching lines as "path:line:text", one per entry. */
std::vector<std::string> grep(const Fs& fs, const std::string& pattern,
                              const std::vector<std::string>& paths, bool ignoreCase,
                              bool invert);

/** wc: counts lines, words and characters. */
struct Counts {
  size_t lines = 0;
  size_t words = 0;
  size_t chars = 0;
};
Counts count(const std::string& text);

/** Splits on newlines, dropping a single trailing empty line so a file ending
 *  in "\n" does not produce a phantom last line. */
std::vector<std::string> lines(const std::string& text);

/** sort: -r reverses, -n compares by leading number rather than lexically. */
std::vector<std::string> sortLines(const std::vector<std::string>& in, bool reverse,
                                   bool numeric);

/** uniq: collapses runs of identical adjacent lines. With counts, each line is
 *  prefixed by how many times it repeated. */
std::vector<std::string> uniqueLines(const std::vector<std::string>& in, bool withCounts);

/** nl: prefixes each line with its number, right-aligned in six columns. */
std::vector<std::string> numberLines(const std::vector<std::string>& in);

/** rev: reverses the characters of each line. */
std::vector<std::string> reverseLines(const std::vector<std::string>& in);

/** cut -d<delimiter> -f<field>: one-based field selection, empty when short. */
std::vector<std::string> cutFields(const std::vector<std::string>& in, char delimiter,
                                   size_t field);

/** xxd: canonical hex dump, sixteen bytes per row with the printable column. */
std::vector<std::string> hexDump(const std::string& text);

}  // namespace sh
