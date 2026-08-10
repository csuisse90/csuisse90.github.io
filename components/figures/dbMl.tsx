import {
  ACCENT,
  Arrow,
  Box,
  Caption,
  FAINT,
  Figure,
  FILL,
  INK,
  LINE,
  TEAL,
} from "./primitives";

/* ---------------------------------------------------------------- A3 */

function Table({
  x,
  y,
  name,
  cols,
  w = 150,
}: {
  x: number;
  y: number;
  name: string;
  cols: { label: string; key?: "PK" | "FK" }[];
  w?: number;
}) {
  const rowH = 22;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={26 + cols.length * rowH}
        fill={FILL}
        stroke={INK}
        strokeWidth={1.8}
      />
      <rect x={x} y={y} width={w} height={26} fill="rgba(214,228,234,0.5)" stroke={INK} strokeWidth={1.8} />
      <text
        x={x + w / 2}
        y={y + 13}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize={11}
        fill={INK}
      >
        {name}
      </text>
      {cols.map((c, i) => (
        <g key={c.label}>
          <line
            x1={x}
            y1={y + 26 + i * rowH}
            x2={x + w}
            y2={y + 26 + i * rowH}
            stroke={FAINT}
            strokeWidth={0.7}
          />
          <text
            x={x + 8}
            y={y + 26 + i * rowH + rowH / 2}
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={9.5}
            fill={c.key ? ACCENT : INK}
          >
            {c.label}
          </text>
          {c.key && (
            <text
              x={x + w - 8}
              y={y + 26 + i * rowH + rowH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={8}
              fill={ACCENT}
            >
              {c.key}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

export function ErDiagram() {
  return (
    <Figure
      title="A relational schema"
      meta="A3"
      width={620}
      height={250}
      caption="One student has many enrolments; one course has many enrolments. The join table in the middle turns a many-to-many relationship into two one-to-many ones, which is the only way a relational database can express it."
    >
      <Table x={20} y={40} name="Student" cols={[{ label: "studentId", key: "PK" }, { label: "name" }, { label: "dateOfBirth" }]} />
      <Table
        x={232}
        y={40}
        name="Enrolment"
        cols={[
          { label: "enrolmentId", key: "PK" },
          { label: "studentId", key: "FK" },
          { label: "courseId", key: "FK" },
          { label: "grade" },
        ]}
      />
      <Table x={444} y={40} name="Course" cols={[{ label: "courseId", key: "PK" }, { label: "title" }, { label: "level" }]} />

      <line x1={170} y1={92} x2={232} y2={92} stroke={LINE} strokeWidth={1.8} />
      <Caption x={201} y={84}>
        1 — ∞
      </Caption>
      <line x1={382} y1={92} x2={444} y2={92} stroke={LINE} strokeWidth={1.8} />
      <Caption x={413} y={84}>
        ∞ — 1
      </Caption>

      <Caption x={310} y={210} size={10}>
        PK = primary key · FK = foreign key
      </Caption>
    </Figure>
  );
}

export function Normalisation() {
  return (
    <Figure
      title="Why normalise"
      meta="A3"
      width={620}
      height={230}
      caption="On the left the tutor's room is stored three times. Change it once and the other two are now wrong — that is an update anomaly. On the right it is stored once, and there is nothing to disagree with."
    >
      <Caption x={150} y={26} size={11} colour={ACCENT}>
        Unnormalised — one table
      </Caption>
      <Table
        x={20}
        y={38}
        w={260}
        name="StudentTutor"
        cols={[
          { label: "studentId", key: "PK" },
          { label: "studentName" },
          { label: "tutorName   ← repeated" },
          { label: "tutorRoom   ← repeated" },
        ]}
      />

      <Caption x={470} y={26} size={11} colour={TEAL}>
        Normalised — two tables
      </Caption>
      <Table
        x={350}
        y={38}
        w={240}
        name="Student"
        cols={[{ label: "studentId", key: "PK" }, { label: "studentName" }, { label: "tutorId", key: "FK" }]}
      />
      <Table
        x={350}
        y={148}
        w={240}
        name="Tutor"
        cols={[{ label: "tutorId", key: "PK" }, { label: "tutorName" }]}
      />
      <Arrow x1={290} y1={100} x2={344} y2={100} accent />
    </Figure>
  );
}

export function AcidDiagram() {
  return (
    <Figure
      title="A transaction, and what ACID protects"
      meta="A3"
      width={620}
      height={210}
      caption="Moving money is two writes that must both happen or neither. Atomicity is what stops the power cut in the middle from destroying £100."
    >
      <Box x={30} y={50} w={150} h={48} label="Debit A −£100" />
      <Box x={230} y={50} w={150} h={48} label="Credit B +£100" />
      <Arrow x1={180} y1={74} x2={230} y2={74} />
      <rect
        x={14}
        y={32}
        width={382}
        height={84}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.6}
        strokeDasharray="6 4"
      />
      <Caption x={205} y={130} colour={ACCENT} size={11}>
        one transaction — all of it, or none of it
      </Caption>

      {[
        ["A", "Atomic", 0],
        ["C", "Consistent", 1],
        ["I", "Isolated", 2],
        ["D", "Durable", 3],
      ].map(([letter, word, i]) => (
        <g key={letter as string}>
          <Box x={430} y={26 + (i as number) * 42} w={40} h={32} label={letter as string} accent />
          <Caption x={480} y={46 + (i as number) * 42} anchor="start" size={11} colour={INK}>
            {word as string}
          </Caption>
        </g>
      ))}
    </Figure>
  );
}

/* ---------------------------------------------------------------- A4 */

export function NeuralNetwork() {
  const layer = (cx: number, n: number, top = 40, gap = 42) =>
    Array.from({ length: n }, (_, i) => ({ x: cx, y: top + i * gap }));
  const input = layer(90, 3, 60);
  const hidden = layer(300, 4, 40);
  const output = layer(510, 2, 80);
  return (
    <Figure
      title="A neural network"
      meta="A4"
      width={620}
      height={240}
      caption="Every arrow carries a weight — a number saying how much that input matters. Training is nothing more than nudging those numbers until the outputs stop being wrong."
    >
      {input.flatMap((a, i) =>
        hidden.map((b, j) => (
          <line key={`ih${i}${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINE} strokeWidth={0.8} opacity={0.7} />
        )),
      )}
      {hidden.flatMap((a, i) =>
        output.map((b, j) => (
          <line key={`ho${i}${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINE} strokeWidth={0.8} opacity={0.7} />
        )),
      )}
      {[
        { nodes: input, colour: INK, label: "input" },
        { nodes: hidden, colour: ACCENT, label: "hidden" },
        { nodes: output, colour: TEAL, label: "output" },
      ].map((l) => (
        <g key={l.label}>
          {l.nodes.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={13} fill={FILL} stroke={l.colour} strokeWidth={1.9} />
          ))}
          <Caption x={l.nodes[0].x} y={214} size={11} colour={l.colour}>
            {l.label}
          </Caption>
        </g>
      ))}
    </Figure>
  );
}

export function TrainingLoop() {
  return (
    <Figure
      title="How a model learns"
      meta="A4"
      width={620}
      height={210}
      caption="The loop runs thousands of times. Nothing about it is intelligent — it is a very patient process of being wrong slightly less each time."
    >
      {[
        ["Predict", "guess an answer"],
        ["Compare", "against the label"],
        ["Measure loss", "how wrong, as a number"],
        ["Adjust weights", "nudge towards right"],
      ].map(([t, s], i) => (
        <g key={t}>
          <Box x={16 + i * 152} y={44} w={132} h={54} label={t} sub={s} />
          {i < 3 && <Arrow x1={148 + i * 152} y1={71} x2={168 + i * 152} y2={71} />}
        </g>
      ))}
      <path
        d="M582,98 L582,160 L82,160 L82,98"
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.8}
        markerEnd="url(#arrowAccent)"
      />
      <Caption x={332} y={154} colour={ACCENT}>
        repeat for every example, many times over
      </Caption>
    </Figure>
  );
}

export function ConfusionMatrix() {
  const cells = [
    { x: 0, y: 0, label: "True positive", note: "said yes, was yes", good: true },
    { x: 1, y: 0, label: "False negative", note: "said no, was yes", good: false },
    { x: 0, y: 1, label: "False positive", note: "said yes, was no", good: false },
    { x: 1, y: 1, label: "True negative", note: "said no, was no", good: true },
  ];
  return (
    <Figure
      title="Confusion matrix"
      meta="A4"
      width={560}
      height={250}
      caption="Accuracy alone hides the difference between the two mistakes. Missing a disease and raising a false alarm are both errors, and they are not equally bad."
    >
      <Caption x={300} y={26} size={11} colour={INK}>
        what the model said
      </Caption>
      <Caption x={175} y={48}>
        positive
      </Caption>
      <Caption x={355} y={48}>
        negative
      </Caption>
      <text
        x={40}
        y={140}
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize={11}
        fill={INK}
        transform="rotate(-90 40 140)"
      >
        the truth
      </text>
      <Caption x={80} y={98} anchor="end">
        positive
      </Caption>
      <Caption x={80} y={188} anchor="end">
        negative
      </Caption>
      {cells.map((c) => (
        <g key={c.label}>
          <rect
            x={90 + c.x * 180}
            y={62 + c.y * 90}
            width={176}
            height={86}
            fill={c.good ? "rgba(45,120,110,0.07)" : "rgba(211,58,28,0.07)"}
            stroke={c.good ? TEAL : ACCENT}
            strokeWidth={1.8}
          />
          <text
            x={178 + c.x * 180}
            y={98 + c.y * 90}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={11}
            fill={c.good ? TEAL : ACCENT}
          >
            {c.label}
          </text>
          <text
            x={178 + c.x * 180}
            y={118 + c.y * 90}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={9}
            fill={FAINT}
          >
            {c.note}
          </text>
        </g>
      ))}
    </Figure>
  );
}

export function Overfitting() {
  const pts = Array.from({ length: 14 }, (_, i) => ({
    x: 60 + i * 36,
    y: 150 - i * 5 + (i % 3 === 0 ? 16 : i % 2 === 0 ? -12 : 4),
  }));
  const good = `M60,152 L${pts[pts.length - 1].x},88`;
  const over = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return (
    <Figure
      title="Overfitting"
      meta="A4"
      width={620}
      height={230}
      caption="The wiggly line passes through every training point perfectly and will be worse than the straight one on anything new. It has memorised the data instead of learning the pattern."
    >
      <line x1={44} y1={186} x2={580} y2={186} stroke={INK} strokeWidth={1.4} />
      <line x1={44} y1={30} x2={44} y2={186} stroke={INK} strokeWidth={1.4} />
      <path d={over} fill="none" stroke={ACCENT} strokeWidth={2} />
      <path d={good} fill="none" stroke={TEAL} strokeWidth={2} strokeDasharray="6 4" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.4} fill={INK} />
      ))}
      <Caption x={470} y={56} colour={ACCENT} anchor="start">
        overfitted
      </Caption>
      <Caption x={470} y={74} colour={TEAL} anchor="start">
        generalises
      </Caption>
    </Figure>
  );
}

export function LearningTypes() {
  return (
    <Figure
      title="Three kinds of learning"
      meta="A4"
      width={620}
      height={220}
      caption="The difference is what the data comes with. Labels mean supervised; no labels means unsupervised; a reward signal earned by acting means reinforcement."
    >
      {[
        {
          t: "Supervised",
          s: "labelled data",
          ex: "spam / not spam",
          c: ACCENT,
        },
        { t: "Unsupervised", s: "no labels", ex: "group similar customers", c: TEAL },
        { t: "Reinforcement", s: "reward signal", ex: "learn to play a game", c: LINE },
      ].map((k, i) => (
        <g key={k.t}>
          <rect
            x={20 + i * 198}
            y={36}
            width={178}
            height={128}
            fill={FILL}
            stroke={k.c}
            strokeWidth={1.9}
          />
          <text
            x={109 + i * 198}
            y={68}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={12}
            fill={k.c}
          >
            {k.t}
          </text>
          <text
            x={109 + i * 198}
            y={96}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={10}
            fill={INK}
          >
            {k.s}
          </text>
          <text
            x={109 + i * 198}
            y={124}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={9}
            fill={FAINT}
          >
            {k.ex}
          </text>
        </g>
      ))}
    </Figure>
  );
}
