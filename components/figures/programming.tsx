/** Figures for Theme B units 3 and 4: objects, and the abstract data types.
 *  Static server-rendered SVG, same as the other figure modules. */
import { Arrow, Box, Caption, Figure, ACCENT, FAINT, FILL, INK, LINE, SOFT, TEAL } from "./primitives";

const MONO = "var(--font-mono), monospace";

/** A UML-ish class box: name band, attribute band, method band. */
function ClassBox({
  x,
  y,
  w,
  name,
  attributes,
  methods,
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  name: string;
  attributes: string[];
  methods: string[];
  accent?: boolean;
}) {
  const head = 22;
  const row = 16;
  const attrH = Math.max(row, attributes.length * row) + 8;
  const methH = Math.max(row, methods.length * row) + 8;
  const stroke = accent ? ACCENT : INK;
  return (
    <g>
      <rect x={x} y={y} width={w} height={head + attrH + methH} fill={FILL} stroke={stroke} strokeWidth={1.8} />
      <line x1={x} y1={y + head} x2={x + w} y2={y + head} stroke={stroke} strokeWidth={1.4} />
      <line
        x1={x}
        y1={y + head + attrH}
        x2={x + w}
        y2={y + head + attrH}
        stroke={stroke}
        strokeWidth={1.4}
      />
      <text
        x={x + w / 2}
        y={y + head / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={MONO}
        fontSize={12}
        fill={stroke}
      >
        {name}
      </text>
      {attributes.map((a, i) => (
        <text
          key={a}
          x={x + 9}
          y={y + head + 12 + i * row}
          dominantBaseline="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={SOFT}
        >
          {a}
        </text>
      ))}
      {methods.map((m, i) => (
        <text
          key={m}
          x={x + 9}
          y={y + head + attrH + 12 + i * row}
          dominantBaseline="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={INK}
        >
          {m}
        </text>
      ))}
    </g>
  );
}

/** One cell of an array or list drawing. */
function Cell({
  x,
  y,
  w,
  h,
  value,
  index,
  accent = false,
  faded = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  value: string;
  index?: string;
  accent?: boolean;
  faded?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={accent ? "rgba(211,58,28,0.10)" : FILL}
        stroke={accent ? ACCENT : INK}
        strokeWidth={1.6}
        opacity={faded ? 0.35 : 1}
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={MONO}
        fontSize={11}
        fill={accent ? ACCENT : INK}
        opacity={faded ? 0.4 : 1}
      >
        {value}
      </text>
      {index !== undefined && (
        <text
          x={x + w / 2}
          y={y + h + 12}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={FAINT}
        >
          {index}
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------- B3 objects

export function ObjectModel() {
  return (
    <Figure
      title="A class and three of its objects"
      meta="B3.1.1"
      width={560}
      height={250}
      caption="The class is written once and says what every dog has and can do. Each object is a separate set of values with the same shape. The methods are not copied — every object runs the same code, on its own data."
    >
      <Caption x={110} y={16} colour={FAINT}>
        the blueprint, written once
      </Caption>
      <ClassBox
        x={20}
        y={30}
        w={180}
        name="Dog"
        attributes={["name: string", "age: integer"]}
        methods={["bark()", "birthday()"]}
        accent
      />

      <Caption x={400} y={16} colour={FAINT}>
        the objects, made at run time
      </Caption>
      {[
        { name: "rex", values: ["name = “Rex”", "age = 3"] },
        { name: "bella", values: ["name = “Bella”", "age = 7"] },
        { name: "kip", values: ["name = “Kip”", "age = 1"] },
      ].map((o, i) => (
        <g key={o.name}>
          <rect
            x={300}
            y={30 + i * 66}
            width={200}
            height={54}
            fill={FILL}
            stroke={INK}
            strokeWidth={1.6}
          />
          <text
            x={310}
            y={46 + i * 66}
            fontFamily={MONO}
            fontSize={11}
            fill={TEAL}
          >
            {`${o.name} : Dog`}
          </text>
          {o.values.map((v, j) => (
            <text
              key={v}
              x={310}
              y={62 + i * 66 + j * 13}
              fontFamily={MONO}
              fontSize={9.5}
              fill={SOFT}
            >
              {v}
            </text>
          ))}
          <Arrow x1={205} y1={57 + i * 20} x2={295} y2={52 + i * 66} accent={i === 0} />
        </g>
      ))}
      <Caption x={250} y={240} colour={FAINT}>
        instantiation: Dog(&quot;Rex&quot;, 3)
      </Caption>
    </Figure>
  );
}

export function ObjectShell() {
  return (
    <Figure
      title="Encapsulation: state behind an interface"
      meta="B3.1.2"
      width={540}
      height={260}
      caption="The only way in is through a method, and the method is where the rule lives. Reaching past it — the crossed arrow — is what lets a balance go negative, which is why the attribute is private in the first place."
    >
      <rect x={140} y={26} width={260} height={188} fill="none" stroke={INK} strokeWidth={2} />
      <Caption x={270} y={18} colour={SOFT} size={11}>
        BankAccount
      </Caption>

      <Box x={190} y={112} w={160} h={44} label="- balance = 250" sub="private state" fontSize={11} />

      <Box x={165} y={44} w={100} h={26} label="+ deposit()" fontSize={10} />
      <Box x={280} y={44} w={100} h={26} label="+ withdraw()" fontSize={10} />
      <Box x={222} y={172} w={110} h={26} label="+ getBalance()" fontSize={10} />

      <Arrow x1={215} y1={72} x2={230} y2={108} />
      <Arrow x1={330} y1={72} x2={310} y2={108} />
      <Arrow x1={277} y1={170} x2={277} y2={160} />

      <Caption x={20} y={36} anchor="start" colour={SOFT}>
        outside code
      </Caption>
      <Arrow x1={28} y1={44} x2={162} y2={52} />
      <Caption x={20} y={66} anchor="start" colour={FAINT}>
        allowed
      </Caption>

      <line x1={20} y1={134} x2={186} y2={134} stroke={ACCENT} strokeWidth={1.8} strokeDasharray="4 3" />
      <line x1={92} y1={124} x2={112} y2={144} stroke={ACCENT} strokeWidth={2.2} />
      <line x1={112} y1={124} x2={92} y2={144} stroke={ACCENT} strokeWidth={2.2} />
      <Caption x={20} y={118} anchor="start" colour={ACCENT}>
        balance = -900
      </Caption>
      <Caption x={20} y={158} anchor="start" colour={ACCENT}>
        blocked — the rule
      </Caption>
      <Caption x={20} y={170} anchor="start" colour={ACCENT}>
        lives in withdraw()
      </Caption>

      <Caption x={270} y={238} colour={FAINT}>
        change the storage and the three methods still work — nothing outside knows
      </Caption>
    </Figure>
  );
}

export function InheritanceTree() {
  return (
    <Figure
      title="Inheritance and overriding"
      meta="B3.1.3"
      width={560}
      height={280}
      caption="Both subclasses inherit name, age and eat(). Each replaces speak() with its own version. Calling speak() on a list of animals runs the right one for each object without a single if — that is polymorphism."
    >
      <ClassBox
        x={190}
        y={20}
        w={180}
        name="Animal"
        attributes={["name", "age"]}
        methods={["eat()", "speak()"]}
      />

      <line x1={280} y1={122} x2={280} y2={134} stroke={LINE} strokeWidth={1.8} />
      <line x1={110} y1={134} x2={450} y2={134} stroke={LINE} strokeWidth={1.8} />
      <line x1={110} y1={134} x2={110} y2={152} stroke={LINE} strokeWidth={1.8} />
      <line x1={450} y1={134} x2={450} y2={152} stroke={LINE} strokeWidth={1.8} />
      <path d="M100,152 L120,152 L110,166 z" fill={FILL} stroke={LINE} strokeWidth={1.6} />
      <path d="M440,152 L460,152 L450,166 z" fill={FILL} stroke={LINE} strokeWidth={1.6} />

      <ClassBox
        x={20}
        y={168}
        w={180}
        name="Dog"
        attributes={["breed"]}
        methods={["speak()  overridden", "fetch()  new"]}
        accent
      />
      <ClassBox
        x={360}
        y={168}
        w={180}
        name="Cat"
        attributes={["indoor"]}
        methods={["speak()  overridden"]}
      />

      <Caption x={280} y={196} colour={SOFT}>
        is-a
      </Caption>
      <Caption x={280} y={214} colour={FAINT}>
        a Dog is an
      </Caption>
      <Caption x={280} y={228} colour={FAINT}>
        Animal, so it
      </Caption>
      <Caption x={280} y={242} colour={FAINT}>
        fits anywhere
      </Caption>
      <Caption x={280} y={256} colour={FAINT}>
        an Animal fits
      </Caption>
    </Figure>
  );
}

export function UmlRelations() {
  const rows: { label: string; note: string; draw: (y: number) => React.ReactNode }[] = [
    {
      label: "association",
      note: "knows about",
      draw: (y) => <line x1={200} y1={y} x2={300} y2={y} stroke={INK} strokeWidth={1.8} />,
    },
    {
      label: "aggregation",
      note: "has-a, parts outlive the whole",
      draw: (y) => (
        <g>
          <line x1={216} y1={y} x2={300} y2={y} stroke={INK} strokeWidth={1.8} />
          <path d={`M200,${y} L208,${y - 6} L216,${y} L208,${y + 6} z`} fill={FILL} stroke={INK} strokeWidth={1.6} />
        </g>
      ),
    },
    {
      label: "composition",
      note: "owns, parts die with the whole",
      draw: (y) => (
        <g>
          <line x1={216} y1={y} x2={300} y2={y} stroke={INK} strokeWidth={1.8} />
          <path d={`M200,${y} L208,${y - 6} L216,${y} L208,${y + 6} z`} fill={INK} />
        </g>
      ),
    },
    {
      label: "inheritance",
      note: "is-a",
      draw: (y) => (
        <g>
          <line x1={200} y1={y} x2={286} y2={y} stroke={INK} strokeWidth={1.8} />
          <path d={`M286,${y - 7} L300,${y} L286,${y + 7} z`} fill={FILL} stroke={INK} strokeWidth={1.6} />
        </g>
      ),
    },
  ];

  return (
    <Figure
      title="The four lines a UML class diagram uses"
      meta="B3.1.4"
      width={560}
      height={230}
      caption="The diamond end always sits on the whole, the triangle always on the parent. Aggregation against composition is a question about lifetime: a school still has teachers if a class is cancelled, but a book's pages go when the book does."
    >
      {rows.map((r, i) => {
        const y = 34 + i * 48;
        return (
          <g key={r.label}>
            <text x={20} y={y} dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={INK}>
              {r.label}
            </text>
            {r.draw(y)}
            <text
              x={318}
              y={y}
              dominantBaseline="middle"
              fontFamily={MONO}
              fontSize={9.5}
              fill={FAINT}
            >
              {r.note}
            </text>
          </g>
        );
      })}
      <Caption x={280} y={220} colour={FAINT}>
        read every line as a sentence: Library ◇— Book, Book ◆— Page, Ebook —▷ Book
      </Caption>
    </Figure>
  );
}

// ------------------------------------------------------- B4 abstract data types

export function StackQueue() {
  const stack = ["9", "4", "7"];
  const queue = ["7", "4", "9"];
  return (
    <Figure
      title="A stack and a queue, after the same three pushes"
      meta="B4.1.2"
      width={560}
      height={270}
      caption="Both received 7, then 4, then 9. The stack hands back 9 and the queue hands back 7. Nothing else about them differs: it is only the end you are allowed to touch."
    >
      <Caption x={130} y={18} colour={SOFT} size={11}>
        stack — last in, first out
      </Caption>
      {stack.map((v, i) => (
        <Cell key={v} x={80} y={40 + i * 34} w={100} h={32} value={v} accent={i === 0} />
      ))}
      <Arrow x1={230} y1={40} x2={190} y2={52} accent />
      <Caption x={196} y={30} anchor="start" colour={ACCENT}>
        push · pop
      </Caption>
      <Caption x={196} y={64} anchor="start" colour={FAINT}>
        same end
      </Caption>
      <Caption x={130} y={162} colour={FAINT}>
        pop() gives 9
      </Caption>
      <Caption x={130} y={178} colour={FAINT}>
        7 is unreachable until
      </Caption>
      <Caption x={130} y={192} colour={FAINT}>
        the two above it leave
      </Caption>

      <line x1={280} y1={30} x2={280} y2={210} stroke={LINE} strokeWidth={1} strokeDasharray="3 4" />

      <Caption x={430} y={18} colour={SOFT} size={11}>
        queue — first in, first out
      </Caption>
      {queue.map((v, i) => (
        <Cell key={v} x={330} y={40 + i * 34} w={100} h={32} value={v} accent={i === 0} />
      ))}
      <Arrow x1={480} y1={56} x2={440} y2={56} accent />
      <Caption x={486} y={44} anchor="start" colour={ACCENT}>
        dequeue
      </Caption>
      <Caption x={486} y={58} anchor="start" colour={FAINT}>
        front
      </Caption>
      <Arrow x1={480} y1={126} x2={440} y2={126} />
      <Caption x={486} y={130} anchor="start" colour={FAINT}>
        enqueue
      </Caption>
      <Caption x={380} y={162} colour={FAINT}>
        dequeue() gives 7
      </Caption>
      <Caption x={380} y={178} colour={FAINT}>
        the one that waited
      </Caption>
      <Caption x={380} y={192} colour={FAINT}>
        longest goes first
      </Caption>

      <Caption x={280} y={244} colour={FAINT}>
        pushed 7, then 4, then 9 — into both
      </Caption>
    </Figure>
  );
}

export function CircularQueue() {
  const slots = ["", "", "12", "7", "9", "", "", ""];
  const cx = 280;
  const cy = 120;
  const r = 72;
  return (
    <Figure
      title="A circular queue in a fixed array"
      meta="B4.1.2"
      width={560}
      height={272}
      caption="front and rear move round the array with (index + 1) mod size rather than shuffling every element down. The queue is full when advancing rear would land on front, which is why one slot is usually left spare."
    >
      {slots.map((v, i) => {
        const angle = (i / slots.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r - 22;
        const y = cy + Math.sin(angle) * r - 15;
        return (
          <Cell
            key={i}
            x={x}
            y={y}
            w={44}
            h={30}
            value={v || "·"}
            index={`[${i}]`}
            accent={v !== ""}
            faded={v === ""}
          />
        );
      })}

      <Caption x={cx} y={cy - 6} colour={SOFT} size={11}>
        size 8
      </Caption>
      <Caption x={cx} y={cy + 10} colour={FAINT}>
        front = 2
      </Caption>
      <Caption x={cx} y={cy + 24} colour={FAINT}>
        rear = 4
      </Caption>

      <Caption x={40} y={244} anchor="start" colour={ACCENT}>
        dequeue: front = (front + 1) mod 8
      </Caption>
      <Caption x={40} y={260} anchor="start" colour={SOFT}>
        enqueue: rear = (rear + 1) mod 8
      </Caption>
    </Figure>
  );
}

export function LinkedListDiagram() {
  const nodes = [
    { v: "12", x: 40 },
    { v: "7", x: 200 },
    { v: "9", x: 360 },
  ];
  return (
    <Figure
      title="A singly linked list, and one insertion"
      meta="B4.1.3"
      width={560}
      height={280}
      caption="Inserting 5 changes two pointers and nothing else. The same insertion in an array would shift every element after it. The price is that reaching the nth node means walking n links — there is no arithmetic shortcut to it."
    >
      <Caption x={20} y={14} anchor="start" colour={SOFT} size={11}>
        before
      </Caption>
      <Caption x={20} y={34} anchor="start" colour={TEAL}>
        head
      </Caption>
      <Arrow x1={28} y1={38} x2={38} y2={50} />
      {nodes.map((n, i) => (
        <g key={n.v}>
          <rect x={n.x} y={40} width={104} height={38} fill={FILL} stroke={INK} strokeWidth={1.6} />
          <line x1={n.x + 62} y1={40} x2={n.x + 62} y2={78} stroke={INK} strokeWidth={1.4} />
          <text x={n.x + 31} y={60} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={12} fill={INK}>
            {n.v}
          </text>
          <text x={n.x + 83} y={60} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={10} fill={FAINT}>
            {i === nodes.length - 1 ? "null" : "next"}
          </text>
          {i < nodes.length - 1 && <Arrow x1={n.x + 104} y1={59} x2={n.x + 156} y2={59} />}
        </g>
      ))}

      <Caption x={20} y={126} anchor="start" colour={SOFT} size={11}>
        after inserting 5 between 12 and 7
      </Caption>
      <Caption x={20} y={148} anchor="start" colour={TEAL}>
        head
      </Caption>
      <Arrow x1={28} y1={152} x2={38} y2={164} />
      <g>
        <rect x={40} y={154} width={104} height={38} fill={FILL} stroke={INK} strokeWidth={1.6} />
        <line x1={102} y1={154} x2={102} y2={192} stroke={INK} strokeWidth={1.4} />
        <text x={71} y={174} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={12} fill={INK}>12</text>
        <text x={123} y={174} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={10} fill={ACCENT}>next</text>
      </g>
      <g>
        <rect x={200} y={214} width={104} height={38} fill="rgba(211,58,28,0.10)" stroke={ACCENT} strokeWidth={1.8} />
        <line x1={262} y1={214} x2={262} y2={252} stroke={ACCENT} strokeWidth={1.4} />
        <text x={231} y={234} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={12} fill={ACCENT}>5</text>
        <text x={283} y={234} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={10} fill={ACCENT}>next</text>
      </g>
      <g>
        <rect x={360} y={154} width={104} height={38} fill={FILL} stroke={INK} strokeWidth={1.6} />
        <line x1={422} y1={154} x2={422} y2={192} stroke={INK} strokeWidth={1.4} />
        <text x={391} y={174} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={12} fill={INK}>7</text>
        <text x={443} y={174} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={10} fill={FAINT}>next</text>
      </g>
      <Arrow x1={144} y1={180} x2={200} y2={222} accent />
      <Arrow x1={304} y1={222} x2={358} y2={182} accent />
      <Caption x={252} y={276} colour={FAINT}>
        two pointer writes, no elements moved
      </Caption>
    </Figure>
  );
}

export function BinaryTreeDiagram() {
  const nodes = [
    { v: "50", x: 280, y: 40 },
    { v: "30", x: 170, y: 100 },
    { v: "70", x: 390, y: 100 },
    { v: "20", x: 110, y: 160 },
    { v: "40", x: 230, y: 160 },
    { v: "60", x: 330, y: 160 },
    { v: "85", x: 450, y: 160 },
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
  ];
  return (
    <Figure
      title="A binary search tree, and its three traversals"
      meta="B4.1.4"
      width={560}
      height={280}
      caption="Everything smaller than a node sits to its left, everything larger to its right — at every node, not just the root. That single rule is what lets a search throw away half the tree at each step, and what makes an in-order traversal come out sorted."
    >
      {edges.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={nodes[a].x}
          y1={nodes[a].y + 16}
          x2={nodes[b].x}
          y2={nodes[b].y - 16}
          stroke={LINE}
          strokeWidth={1.8}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={n.v}>
          <circle cx={n.x} cy={n.y} r={18} fill={i === 0 ? "rgba(211,58,28,0.10)" : FILL} stroke={i === 0 ? ACCENT : INK} strokeWidth={1.8} />
          <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={i === 0 ? ACCENT : INK}>
            {n.v}
          </text>
        </g>
      ))}

      <Caption x={20} y={210} anchor="start" colour={SOFT} size={11}>
        in-order   left, node, right
      </Caption>
      <Caption x={250} y={210} anchor="start" colour={FAINT}>
        20 30 40 50 60 70 85 — sorted
      </Caption>
      <Caption x={20} y={232} anchor="start" colour={SOFT} size={11}>
        pre-order  node, left, right
      </Caption>
      <Caption x={250} y={232} anchor="start" colour={FAINT}>
        50 30 20 40 70 60 85 — copies the tree
      </Caption>
      <Caption x={20} y={254} anchor="start" colour={SOFT} size={11}>
        post-order left, right, node
      </Caption>
      <Caption x={250} y={254} anchor="start" colour={FAINT}>
        20 40 30 60 85 70 50 — deletes the tree
      </Caption>
    </Figure>
  );
}

export function CallStackFrames() {
  const frames = [
    { call: "factorial(1)", ret: "returns 1" },
    { call: "factorial(2)", ret: "returns 2 × 1 = 2" },
    { call: "factorial(3)", ret: "returns 3 × 2 = 6" },
    { call: "factorial(4)", ret: "returns 4 × 6 = 24" },
  ];
  return (
    <Figure
      title="What recursion actually builds"
      meta="B4.1.5"
      width={560}
      height={250}
      caption="Every call is a frame holding its own copy of n, and nothing is multiplied until the base case is reached. Four calls are four frames — which is why a recursion 100,000 deep runs out of stack where a loop would not."
    >
      <Caption x={150} y={18} colour={SOFT} size={11}>
        going down: calls pile up
      </Caption>
      <Caption x={430} y={18} colour={SOFT} size={11}>
        coming back: values return
      </Caption>

      {frames.map((f, i) => {
        const y = 34 + (frames.length - 1 - i) * 40;
        return (
          <g key={f.call}>
            <rect x={60} y={y} width={180} height={32} fill={FILL} stroke={i === 0 ? ACCENT : INK} strokeWidth={1.7} />
            <text x={150} y={y + 16} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={i === 0 ? ACCENT : INK}>
              {f.call}
            </text>
            <text x={340} y={y + 16} dominantBaseline="middle" fontFamily={MONO} fontSize={10} fill={FAINT}>
              {f.ret}
            </text>
          </g>
        );
      })}

      <Arrow x1={44} y1={40} x2={44} y2={148} />
      <Arrow x1={266} y1={156} x2={266} y2={48} accent />
      <Caption x={150} y={200} colour={ACCENT}>
        base case: factorial(1) returns without calling again
      </Caption>
      <Caption x={280} y={224} colour={FAINT}>
        remove the base case and the stack grows until the program dies
      </Caption>
    </Figure>
  );
}

export function BinarySearchSteps() {
  const data = [3, 8, 12, 19, 24, 31, 40, 47, 55, 62, 70, 81];
  const rows = [
    { lo: 0, hi: 11, mid: 5 },
    { lo: 6, hi: 11, mid: 8 },
    { lo: 6, hi: 7, mid: 6 },
    { lo: 7, hi: 7, mid: 7 },
  ];
  const w = 42;
  const left = 24;
  const note = (v: number) =>
    v === 47
      ? "found it"
      : v > 47
        ? "too big — keep the left half"
        : "too small — keep the right half";
  return (
    <Figure
      title="Binary search for 47, in four comparisons"
      meta="B4.1.6"
      width={560}
      height={306}
      caption="Each comparison discards half of what is left. Twelve items take at most four steps; a million take at most twenty. The price is that the list must be sorted first, which is why it is worth sorting once and searching many times."
    >
      {rows.map((r, i) => {
        const y = 24 + i * 62;
        return (
          <g key={i}>
            {data.map((v, j) => (
              <Cell
                key={j}
                x={left + j * w}
                y={y}
                w={w - 4}
                h={30}
                value={String(v)}
                accent={j === r.mid}
                faded={j < r.lo || j > r.hi}
              />
            ))}
            <text x={left} y={y + 46} fontFamily={MONO} fontSize={9} fill={FAINT}>
              {`step ${i + 1}: middle is ${data[r.mid]}, ${note(data[r.mid])}`}
            </text>
          </g>
        );
      })}
      <Caption x={280} y={296} colour={FAINT}>
        12 items, at most 4 comparisons — log₂ 12 rounded up
      </Caption>
    </Figure>
  );
}

export function ComplexityCurves() {
  const w = 370;
  const h = 170;
  const x0 = 90;
  const y0 = 200;
  // Scaled so the five curves finish at five distinct heights in the order they
  // are usually quoted. The constants are cosmetic; the shapes are the point.
  const curves: { label: string; f: (t: number) => number; end: number; colour: string }[] = [
    { label: "O(n²)", f: (t) => t * t, end: 1, colour: ACCENT },
    { label: "O(n log n)", f: (t) => (t * Math.log2(1 + t * 31)) / 5.75, end: 0.87, colour: SOFT },
    { label: "O(n)", f: (t) => t * 0.62, end: 0.62, colour: INK },
    { label: "O(log n)", f: (t) => Math.log2(1 + t * 31) / 16.7, end: 0.3, colour: TEAL },
    { label: "O(1)", f: () => 0.03, end: 0.03, colour: TEAL },
  ];
  const path = (f: (t: number) => number) =>
    Array.from({ length: 61 }, (_, i) => {
      const t = i / 60;
      const y = Math.min(1, f(t));
      return `${i === 0 ? "M" : "L"}${(x0 + t * w).toFixed(1)},${(y0 - y * h).toFixed(1)}`;
    }).join(" ");

  return (
    <Figure
      title="How five running times grow"
      meta="B4.1.6"
      width={560}
      height={250}
      caption="The constant factors do not matter here; the shape does. An O(n²) algorithm that is fast on a class list is unusable on a school roll, and no amount of faster hardware changes the shape of the curve."
    >
      <line x1={x0} y1={y0} x2={x0 + w + 10} y2={y0} stroke={LINE} strokeWidth={1.4} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 - h - 10} stroke={LINE} strokeWidth={1.4} />
      <Caption x={x0 + w / 2} y={y0 + 22} colour={FAINT}>
        input size n
      </Caption>
      <text
        x={x0 - 14}
        y={y0 - h / 2}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={9}
        fill={FAINT}
        transform={`rotate(-90 ${x0 - 14} ${y0 - h / 2})`}
      >
        work done
      </text>

      {curves.map((c) => (
        <path key={c.label} d={path(c.f)} fill="none" stroke={c.colour} strokeWidth={1.9} />
      ))}
      {curves.map((c) => (
        <text
          key={c.label}
          x={x0 + w + 16}
          y={y0 - c.end * h}
          dominantBaseline="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={c.colour}
        >
          {c.label}
        </text>
      ))}
    </Figure>
  );
}

export function MergeSortTree() {
  const split = [
    ["38 27 43 3 9 82 10"],
    ["38 27 43 3", "9 82 10"],
    ["38 27", "43 3", "9 82", "10"],
    ["38", "27", "43", "3", "9", "82", "10"],
  ];
  const merge = [
    ["27 38", "3 43", "9 82", "10"],
    ["3 27 38 43", "9 10 82"],
    ["3 9 10 27 38 43 82"],
  ];
  const cellFor = (row: string[], y: number, accent: boolean) => {
    const total = row.length;
    return row.map((s, i) => {
      const w = Math.max(48, s.length * 7.2 + 16);
      const gap = 12;
      const widths = row.map((t) => Math.max(48, t.length * 7.2 + 16));
      const all = widths.reduce((a, b) => a + b, 0) + gap * (total - 1);
      const start = 280 - all / 2;
      const x = start + widths.slice(0, i).reduce((a, b) => a + b, 0) + gap * i;
      return (
        <g key={`${y}-${i}`}>
          <rect x={x} y={y} width={w} height={24} fill={accent ? "rgba(211,58,28,0.10)" : FILL} stroke={accent ? ACCENT : INK} strokeWidth={1.5} />
          <text x={x + w / 2} y={y + 12} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={10} fill={accent ? ACCENT : INK}>
            {s}
          </text>
        </g>
      );
    });
  };

  return (
    <Figure
      title="Merge sort: divide, then merge"
      meta="B4.1.6"
      width={560}
      height={300}
      caption="Splitting costs nothing; the work is in the merges. There are log₂ n levels of merging and each level touches all n items, which is exactly where n log n comes from — and why merge sort beats bubble sort by a growing margin rather than a fixed one."
    >
      <Caption x={20} y={20} anchor="start" colour={SOFT} size={11}>
        divide
      </Caption>
      {split.map((row, i) => cellFor(row, 28 + i * 34, false))}
      <Caption x={20} y={166} anchor="start" colour={ACCENT} size={11}>
        merge
      </Caption>
      {merge.map((row, i) => cellFor(row, 174 + i * 34, true))}
      <Caption x={280} y={292} colour={FAINT}>
        3 levels of merging × 7 items each — log₂ n levels, n work per level
      </Caption>
    </Figure>
  );
}

export function AdtInterface() {
  return (
    <Figure
      title="An ADT is a promise; the data structure is how it is kept"
      meta="B4.1.1"
      width={560}
      height={230}
      caption="The same three operations can sit on top of an array or a linked list. Code written against the operations does not change when the storage does — which is the whole reason for naming the abstract type separately."
    >
      <Box x={180} y={24} w={200} h={54} label="Stack" sub="push · pop · isEmpty" fontSize={13} />
      <Caption x={280} y={94} colour={SOFT}>
        what it does — the abstract data type
      </Caption>

      <line x1={280} y1={104} x2={280} y2={118} stroke={LINE} strokeWidth={1.4} strokeDasharray="4 3" />
      <line x1={140} y1={118} x2={420} y2={118} stroke={LINE} strokeWidth={1.4} strokeDasharray="4 3" />
      <Arrow x1={140} y1={118} x2={140} y2={146} />
      <Arrow x1={420} y1={118} x2={420} y2={146} />

      <Box x={50} y={150} w={180} h={50} label="array + top index" sub="fixed size, cache-friendly" fontSize={11} />
      <Box x={330} y={150} w={180} h={50} label="linked nodes" sub="grows freely, a pointer each" fontSize={11} />
      <Caption x={280} y={220} colour={FAINT}>
        how it is stored — the data structure, and it may be swapped
      </Caption>
    </Figure>
  );
}
