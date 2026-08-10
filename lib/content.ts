// The shape of a teaching page. Everything the site needs to build navigation,
// paging, the revision deck and the marker comes from a page's frontmatter, so
// adding a page means adding one file under content/ and nothing else.

/** One spaced-repetition card. Kept short by design: a card that needs a
 *  paragraph to answer is really two cards. */
export type Card = {
  q: string;
  /** Rendered as markdown with maths, same as everything else. */
  a: string;
};

/** One exam-style question. `points` is the mark scheme, one entry per mark,
 *  written the way a marker would tick it. The marker checks an answer against
 *  these individually rather than against a model answer, because that is how
 *  marks are actually awarded. */
export type Question = {
  marks: number;
  q: string;
  points: string[];
  /** Shown when the student gives up, or when no marker is reachable. */
  answer?: string;
};

export type Frontmatter = {
  /** Syllabus code, e.g. "A1.1.2". Drives ordering and the nav label. */
  code: string;
  title: string;
  /** One sentence under the title. */
  lede: string;
  /** HL-only material, highlighted in the nav. */
  hl?: boolean;
  /** Codes of pages that should be read first. Drives the prerequisite note. */
  prereqs?: string[];
  cards?: Card[];
  practice?: Question[];
};

export type Page = Frontmatter & {
  /** URL path without leading or trailing slash, e.g. "a/a1/binary". */
  slug: string;
  href: string;
  /** Path of the source file relative to content/. */
  file: string;
  /** Top-level part, "a" or "b". */
  theme: string;
  /** Sub-topic, "a1".."b4". */
  unit: string;
};

export type Unit = {
  id: string;
  /** e.g. "A1" */
  code: string;
  title: string;
  pages: Page[];
};

export type Manifest = {
  units: Unit[];
  pages: Page[];
};

/** Titles for the sub-topic groupings in the sidebar. Sub-topic codes are the
 *  one thing here not derivable from the files themselves. */
export const UNIT_TITLES: Record<string, string> = {
  a1: "Computer fundamentals",
  a2: "Networks",
  a3: "Databases",
  a4: "Machine learning",
  b1: "Computational thinking",
  b2: "Programming",
  b3: "Object-oriented programming",
  b4: "Abstract data types and algorithms",
};

export const THEME_TITLES: Record<string, string> = {
  a: "Theme A",
  b: "Theme B",
};

/** Sorts "A1.10.2" after "A1.9.1" — numeric per segment, not lexicographic. */
export function compareCodes(a: string, b: string): number {
  const pa = a.split(/[.\s]/);
  const pb = b.split(/[.\s]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? "";
    const y = pb[i] ?? "";
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny) && x !== "" && y !== "") {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}
