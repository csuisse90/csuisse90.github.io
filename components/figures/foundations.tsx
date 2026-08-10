// Diagrams for the pages that had none: the general computing model, the
// stored-program idea, character encoding, and the two compression methods.
import { Arrow, Box, Caption, Figure, ACCENT, FAINT, FILL, INK, LINE, SOFT } from "./primitives";

/** Input → processing → output, with storage feeding both ways. */
export function ComputingModel() {
  const y = 46;
  const h = 52;
  const w = 118;
  const gap = 42;
  const stages = ["INPUT", "PROCESSING", "OUTPUT"];

  return (
    <Figure
      title="The general model"
      meta="four parts"
      width={520}
      height={206}
      caption="Every computer, from a washing machine to a data centre, is these four boxes. Storage is drawn below because it serves both the processing stage and the long term."
    >
      {stages.map((label, i) => (
        <Box key={label} x={i * (w + gap)} y={y} w={w} h={h} label={label} accent={i === 1} />
      ))}
      <Arrow x1={w} y1={y + h / 2} x2={w + gap} y2={y + h / 2} />
      <Arrow x1={2 * w + gap} y1={y + h / 2} x2={2 * (w + gap)} y2={y + h / 2} />

      <Box x={(520 - w) / 2} y={y + 88} w={w} h={40} label="STORAGE" />
      <Arrow x1={260} y1={y + h} x2={260} y2={y + 88} />
      <Arrow x1={244} y1={y + 88} x2={244} y2={y + h} />

      <Caption x={0} y={26} anchor="start" colour={SOFT}>
        the world outside
      </Caption>
      <Caption x={520} y={26} anchor="end" colour={SOFT}>
        the world outside
      </Caption>
      <Caption x={260} y={196}>
        held for later, not just for now
      </Caption>
    </Figure>
  );
}

/** One memory holding both program and data, with the CPU unable to tell which
 *  is which except by how it is used. */
export function StoredProgram() {
  const cell = 30;
  const left = 150;
  const cells = [
    { text: "LOAD 10", kind: "instr" },
    { text: "ADD 11", kind: "instr" },
    { text: "STORE 12", kind: "instr" },
    { text: "HLT", kind: "instr" },
    { text: "14", kind: "data" },
    { text: "28", kind: "data" },
    { text: "—", kind: "data" },
  ];

  return (
    <Figure
      title="One memory, two meanings"
      meta="stored program"
      width={560}
      height={300}
      caption="Nothing in memory says which cells are instructions. The program counter decides: whatever it points at is treated as an instruction, and everything else is data."
    >
      <Box x={0} y={110} w={110} h={64} label="PROCESSOR" />
      <Caption x={55} y={192} colour={FAINT}>
        fetches from
      </Caption>
      <Caption x={55} y={205} colour={FAINT}>
        whatever the
      </Caption>
      <Caption x={55} y={218} colour={FAINT}>
        PC points at
      </Caption>

      <Arrow x1={110} y1={142} x2={left - 4} y2={142} accent />

      {cells.map((c, i) => {
        const y = 40 + i * cell;
        const isInstr = c.kind === "instr";
        return (
          <g key={i}>
            <rect
              x={left}
              y={y}
              width={200}
              height={cell}
              fill={FILL}
              stroke={INK}
              strokeWidth={1.2}
            />
            <text
              x={left + 8}
              y={y + cell / 2}
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={9}
              fill={FAINT}
            >
              {i}
            </text>
            <text
              x={left + 24}
              y={y + cell / 2}
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={11}
              fill={isInstr ? ACCENT : INK}
            >
              {c.text}
            </text>
            <text
              x={left + 190}
              y={y + cell / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={8}
              fill={FAINT}
            >
              {isInstr ? "read as instruction" : "read as data"}
            </text>
          </g>
        );
      })}

      <Caption x={left + 100} y={28} colour={SOFT}>
        one memory
      </Caption>

      <line
        x1={left + 210}
        y1={40}
        x2={left + 210}
        y2={40 + 4 * cell}
        stroke={ACCENT}
        strokeWidth={2}
      />
      <line
        x1={left + 210}
        y1={40 + 4 * cell}
        x2={left + 210}
        y2={40 + cells.length * cell}
        stroke={LINE}
        strokeWidth={2}
      />
      <Caption x={left + 220} y={90} anchor="start" colour={ACCENT}>
        the program
      </Caption>
      <Caption x={left + 220} y={200} anchor="start" colour={SOFT}>
        its data
      </Caption>
      <Caption x={280} y={288}>
        the same bits could be either — only use decides
      </Caption>
    </Figure>
  );
}

/** Character → code point → bytes, for ASCII and for UTF-8. */
export function CharacterEncoding() {
  const rows = [
    { ch: "A", point: "U+0041", bytes: ["01000001"], note: "1 byte — also valid ASCII" },
    { ch: "é", point: "U+00E9", bytes: ["11000011", "10101001"], note: "2 bytes" },
    { ch: "中", point: "U+4E2D", bytes: ["11100100", "10111000", "10101101"], note: "3 bytes" },
  ];

  return (
    <Figure
      title="From character to bytes"
      meta="unicode, utf-8"
      width={560}
      height={228}
      caption="The code point is the character set's answer; the bytes are the encoding's. Notice the leading bits: 110 starts a two-byte sequence, 1110 a three-byte one, and every continuation byte starts 10."
    >
      <Caption x={30} y={26} anchor="start" colour={FAINT}>
        character
      </Caption>
      <Caption x={110} y={26} anchor="start" colour={FAINT}>
        code point
      </Caption>
      <Caption x={210} y={26} anchor="start" colour={FAINT}>
        utf-8 bytes
      </Caption>

      {rows.map((row, i) => {
        const y = 44 + i * 58;
        return (
          <g key={row.ch}>
            <rect x={20} y={y} width={54} height={38} fill={FILL} stroke={INK} strokeWidth={1.5} />
            <text
              x={47}
              y={y + 19}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={17}
              fill={INK}
            >
              {row.ch}
            </text>
            <Arrow x1={76} y1={y + 19} x2={104} y2={y + 19} />
            <text
              x={110}
              y={y + 19}
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={11}
              fill={ACCENT}
            >
              {row.point}
            </text>
            <Arrow x1={182} y1={y + 19} x2={206} y2={y + 19} />
            {row.bytes.map((b, j) => (
              <g key={j}>
                <rect
                  x={210 + j * 78}
                  y={y + 3}
                  width={72}
                  height={32}
                  fill={FILL}
                  stroke={j === 0 ? INK : LINE}
                  strokeWidth={1.2}
                />
                <text
                  x={246 + j * 78}
                  y={y + 19}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="var(--font-mono), monospace"
                  fontSize={10}
                  fill={j === 0 ? INK : SOFT}
                >
                  {b}
                </text>
              </g>
            ))}
            <text
              x={210}
              y={y + 48}
              fontFamily="var(--font-mono), monospace"
              fontSize={8.5}
              fill={FAINT}
            >
              {row.note}
            </text>
          </g>
        );
      })}
    </Figure>
  );
}

/** Run-length encoding on data that suits it and data that does not. */
export function RunLength() {
  const cell = 20;
  const good = "WWWWWWWWBBWWWWWWWW";
  const bad = "WBWBGWBGWBWGBWBGWB";

  const strip = (data: string, y: number) =>
    data.split("").map((c, i) => (
      <rect
        key={i}
        x={i * cell}
        y={y}
        width={cell}
        height={cell}
        fill={c === "W" ? FILL : c === "B" ? INK : LINE}
        stroke={INK}
        strokeWidth={0.8}
      />
    ));

  return (
    <Figure
      title="When run-length encoding wins and loses"
      meta="lossless"
      width={520}
      height={196}
      caption="The same method on two inputs. Long runs collapse; alternating values gain a count on every symbol and the output grows."
    >
      <Caption x={0} y={22} anchor="start" colour={SOFT}>
        flat areas — a line drawing
      </Caption>
      {strip(good, 30)}
      <Caption x={370} y={45} anchor="start" colour={ACCENT}>
        8W2B8W
      </Caption>
      <Caption x={370} y={60} anchor="start" colour={FAINT}>
        18 → 6, ratio 3:1
      </Caption>

      <Caption x={0} y={110} anchor="start" colour={SOFT}>
        noisy detail — a photograph
      </Caption>
      {strip(bad, 118)}
      <Caption x={370} y={133} anchor="start" colour={ACCENT}>
        1W1B1W1B1G…
      </Caption>
      <Caption x={370} y={148} anchor="start" colour={FAINT}>
        18 → 36, twice as big
      </Caption>

      <Caption x={260} y={186}>
        every compression method assumes something; this one assumes repetition
      </Caption>
    </Figure>
  );
}

/** A Huffman tree, showing why frequent symbols end up shallow. */
export function HuffmanTree() {
  // Frequencies: e 8, t 5, a 3, o 2. Tree built by repeated merging.
  const nodes = [
    { id: "root", x: 260, y: 30, label: "18" },
    { id: "e", x: 150, y: 100, label: "e", freq: "8", code: "0" },
    { id: "n10", x: 370, y: 100, label: "10" },
    { id: "t", x: 300, y: 170, label: "t", freq: "5", code: "10" },
    { id: "n5", x: 450, y: 170, label: "5" },
    { id: "a", x: 400, y: 240, label: "a", freq: "3", code: "110" },
    { id: "o", x: 510, y: 240, label: "o", freq: "2", code: "111" },
  ];
  const edges: [string, string, string][] = [
    ["root", "e", "0"],
    ["root", "n10", "1"],
    ["n10", "t", "0"],
    ["n10", "n5", "1"],
    ["n5", "a", "0"],
    ["n5", "o", "1"],
  ];
  const at = (id: string) => nodes.find((n) => n.id === id)!;

  return (
    <Figure
      title="A Huffman tree"
      meta="variable-length codes"
      width={560}
      height={326}
      caption="The commonest symbol sits one edge from the root and gets a one-bit code; the rarest sits three edges away. No codeword is a prefix of another, because every symbol is a leaf."
    >
      {edges.map(([from, to, bit]) => {
        const a = at(from);
        const b = at(to);
        return (
          <g key={`${from}-${to}`}>
            <line x1={a.x} y1={a.y + 14} x2={b.x} y2={b.y - 14} stroke={LINE} strokeWidth={1.6} />
            <text
              x={(a.x + b.x) / 2 + (bit === "0" ? -12 : 12)}
              y={(a.y + b.y) / 2}
              textAnchor="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={10}
              fill={ACCENT}
            >
              {bit}
            </text>
          </g>
        );
      })}

      {nodes.map((n) => {
        const leaf = Boolean(n.freq);
        return (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={14}
              fill={FILL}
              stroke={leaf ? INK : LINE}
              strokeWidth={leaf ? 1.8 : 1.4}
            />
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={leaf ? 12 : 9}
              fill={leaf ? INK : FAINT}
            >
              {n.label}
            </text>
            {leaf && (
              <text
                x={n.x}
                y={n.y + 30}
                textAnchor="middle"
                fontFamily="var(--font-mono), monospace"
                fontSize={9}
                fill={FAINT}
              >
                {`seen ${n.freq}× · ${n.code}`}
              </text>
            )}
          </g>
        );
      })}

      <Caption x={20} y={310} anchor="start" colour={SOFT}>
        fixed 2-bit codes: 36 bits
      </Caption>
      <Caption x={540} y={310} anchor="end" colour={ACCENT}>
        huffman: 8+10+9+6 = 33 bits
      </Caption>
    </Figure>
  );
}

/** The three interchangeable descriptions of a combinational circuit. */
export function ThreeViews() {
  const points = [
    { x: 280, y: 40, label: "TRUTH TABLE", sub: "what it must do" },
    { x: 120, y: 190, label: "EXPRESSION", sub: "algebra on it" },
    { x: 440, y: 190, label: "CIRCUIT", sub: "gates that do it" },
  ];

  return (
    <Figure
      title="Three ways of saying the same thing"
      meta="all equivalent"
      width={560}
      height={266}
      caption="Any one of these can be converted into either of the others. Sum-of-products goes table to expression; reading gate by gate goes circuit to expression; enumerating inputs goes either to table."
    >
      {points.map((p) => (
        <g key={p.label}>
          <Box x={p.x - 82} y={p.y - 26} w={164} h={52} label={p.label} sub={p.sub} />
        </g>
      ))}

      <Arrow x1={214} y1={62} x2={148} y2={158} />
      <Arrow x1={120} y1={158} x2={202} y2={62} />
      <Arrow x1={346} y1={62} x2={412} y2={158} />
      <Arrow x1={440} y1={158} x2={358} y2={62} />
      <Caption x={138} y={112} anchor="end">
        sum of products
      </Caption>
      <Caption x={422} y={112} anchor="start">
        enumerate inputs
      </Caption>

      <Arrow x1={202} y1={190} x2={356} y2={190} label="draw the gates" labelSide="above" />
      <Arrow x1={356} y1={204} x2={202} y2={204} label="read gate by gate" labelSide="below" />

      <Caption x={280} y={256}>
        simplification means moving round this triangle to find a cheaper circuit
      </Caption>
    </Figure>
  );
}

/** Inner join against left join, as row sets rather than Venn circles. */
export function JoinShapes() {
  const rowH = 22;
  const left = [
    ["B1", "Godel Escher Bach"],
    ["B2", "Mythical Man-Month"],
    ["B3", "Structure & Interp."],
    ["B4", "Never Borrowed"],
  ];
  const matched = new Set(["B1", "B2", "B3"]);

  return (
    <Figure
      title="Inner join against left join"
      meta="the rows that differ"
      width={560}
      height={228}
      caption="An inner join drops B4 because it has no matching loan. A left join keeps it, with nulls — which is the only way to ask which books have never been borrowed."
    >
      <Caption x={0} y={22} anchor="start" colour={SOFT}>
        Book
      </Caption>
      {left.map(([id, title], i) => (
        <g key={id}>
          <rect
            x={0}
            y={34 + i * rowH}
            width={168}
            height={rowH}
            fill={FILL}
            stroke={matched.has(id) ? INK : ACCENT}
            strokeWidth={1.2}
          />
          <text
            x={8}
            y={34 + i * rowH + rowH / 2}
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={9.5}
            fill={matched.has(id) ? INK : ACCENT}
          >
            {`${id}  ${title}`}
          </text>
        </g>
      ))}

      <Caption x={210} y={22} anchor="start" colour={SOFT}>
        Loan
      </Caption>
      {["B1", "B2", "B3", "B1"].map((id, i) => (
        <g key={i}>
          <rect
            x={210}
            y={34 + i * rowH}
            width={92}
            height={rowH}
            fill={FILL}
            stroke={INK}
            strokeWidth={1.2}
          />
          <text
            x={218}
            y={34 + i * rowH + rowH / 2}
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={9.5}
            fill={INK}
          >
            {`L${i + 1}  ${id}`}
          </text>
        </g>
      ))}

      <Caption x={352} y={22} anchor="start" colour={SOFT}>
        result
      </Caption>
      <Box x={352} y={30} w={200} h={64} label="INNER JOIN" sub="3 rows — B4 vanishes" />
      <Box
        x={352}
        y={104}
        w={200}
        h={64}
        label="LEFT JOIN"
        sub="4 rows — B4 kept, nulls"
        accent
      />

      <Caption x={280} y={214}>
        the rows an inner join discards are exactly the ones an absence query wants
      </Caption>
    </Figure>
  );
}
