// A small Python tokeniser for display only, coloured like VS Code's light
// theme. Not a parser: it never has to be correct, only helpful.
const KEYWORDS = new Set([
  "False","None","True","and","as","assert","async","await","break","class",
  "continue","def","del","elif","else","except","finally","for","from","global",
  "if","import","in","is","lambda","nonlocal","not","or","pass","raise","return",
  "try","while","with","yield","match","case",
]);

const BUILTINS = new Set([
  "abs","all","any","bool","dict","enumerate","filter","float","format","int",
  "len","list","map","max","min","object","open","ord","chr","print","range",
  "repr","reversed","round","set","sorted","str","sum","tuple","type","zip",
  "isinstance","super","__import__","Exception","SyntaxError","ValueError",
  "TypeError","KeyError","IndexError","self",
]);

type Tok = { text: string; cls: string };

const PATTERN = new RegExp(
  [
    "(?<comment>#[^\\n]*)",
    "(?<string>[frbu]{0,2}(?:\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?'''|\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'))",
    "(?<number>\\b\\d+(?:\\.\\d+)?\\b)",
    "(?<def>\\b(?:def|class)\\s+[A-Za-z_]\\w*)",
    "(?<name>\\b[A-Za-z_]\\w*\\b)",
    "(?<op>[+\\-*/%=<>!&|^~@]+)",
  ].join("|"),
  "g",
);

export function highlightPython(source: string): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  for (const m of source.matchAll(PATTERN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: source.slice(last, i), cls: "" });
    const g = m.groups ?? {};
    const text = m[0];
    let cls = "";
    if (g.comment) cls = "tk-comment";
    else if (g.string) cls = "tk-string";
    else if (g.number) cls = "tk-number";
    else if (g.def) cls = "tk-defline";
    else if (g.op) cls = "tk-op";
    else if (g.name) {
      if (KEYWORDS.has(text)) cls = "tk-keyword";
      else if (BUILTINS.has(text)) cls = "tk-builtin";
      else cls = "";
    }
    if (g.def) {
      // Colour the keyword and the name it declares differently.
      const [kw, ...rest] = text.split(/(\s+)/);
      out.push({ text: kw, cls: "tk-keyword" });
      out.push({ text: rest.slice(0, -1).join(""), cls: "" });
      out.push({ text: rest[rest.length - 1] ?? "", cls: "tk-fn" });
    } else {
      out.push({ text, cls });
    }
    last = i + text.length;
  }
  if (last < source.length) out.push({ text: source.slice(last), cls: "" });
  return out;
}

export function HighlightedPython({ source }: { source: string }) {
  return (
    <>
      {highlightPython(source).map((t, i) =>
        t.cls ? (
          <span key={i} className={t.cls}>
            {t.text}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}
