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
  Stack,
  TEAL,
} from "./primitives";

/** Von Neumann architecture: CPU internals plus the three buses. */
export function CpuArchitecture() {
  return (
    <Figure
      title="Von Neumann architecture"
      meta="A1.1.1"
      width={620}
      height={300}
      caption="The CPU on the left, memory and devices on the right, joined by three buses. The address bus is one-way — memory never chooses its own address — while the data bus carries values in both directions."
    >
      <rect
        x={16}
        y={16}
        width={270}
        height={230}
        fill="none"
        stroke={FAINT}
        strokeWidth={1.2}
        strokeDasharray="5 4"
      />
      <Caption x={26} y={34} anchor="start">
        CPU
      </Caption>

      <Box x={34} y={48} w={110} h={40} label="CU" sub="control unit" />
      <Box x={158} y={48} w={110} h={40} label="ALU" sub="arithmetic/logic" />
      <Box x={34} y={104} w={110} h={34} label="PC" sub="next address" />
      <Box x={158} y={104} w={110} h={34} label="IR" sub="current instr." />
      <Box x={34} y={152} w={110} h={34} label="MAR" sub="which address" />
      <Box x={158} y={152} w={110} h={34} label="MDR" sub="the data" />
      <Box x={96} y={200} w={110} h={34} label="AC" sub="accumulator" />

      <Box x={400} y={48} w={180} h={60} label="Main memory" sub="RAM + ROM" />
      <Box x={400} y={186} w={180} h={48} label="Input / output" sub="devices" />

      {/* buses */}
      <Arrow x1={286} y1={80} x2={400} y2={80} label="address bus" />
      <line
        x1={286}
        y1={118}
        x2={400}
        y2={118}
        stroke={LINE}
        strokeWidth={1.8}
        markerEnd="url(#arrowEnd)"
        markerStart="url(#arrowEnd)"
      />
      <Caption x={343} y={112}>
        data bus
      </Caption>
      <Arrow x1={286} y1={156} x2={400} y2={156} accent label="control bus" />
      <Arrow x1={490} y1={108} x2={490} y2={186} />
    </Figure>
  );
}

/** The three stages, drawn as a loop, with the register traffic in each. */
export function FetchDecodeExecute() {
  return (
    <Figure
      title="The fetch–decode–execute cycle"
      meta="A1.1.5"
      width={620}
      height={262}
      caption="One pass round this loop is one instruction. A 3 GHz processor completes it roughly three billion times a second."
    >
      <Box x={40} y={40} w={150} h={70} label="FETCH" accent />
      <Caption x={115} y={126}>
        PC → MAR
      </Caption>
      <Caption x={115} y={140}>
        memory → MDR → IR
      </Caption>
      <Caption x={115} y={154}>
        PC incremented
      </Caption>

      <Box x={235} y={40} w={150} h={70} label="DECODE" accent />
      <Caption x={310} y={126}>
        CU reads IR
      </Caption>
      <Caption x={310} y={140}>
        works out the operation
      </Caption>
      <Caption x={310} y={154}>
        and which data it needs
      </Caption>

      <Box x={430} y={40} w={150} h={70} label="EXECUTE" accent />
      <Caption x={505} y={126}>
        ALU calculates
      </Caption>
      <Caption x={505} y={140}>
        or memory is accessed
      </Caption>
      <Caption x={505} y={154}>
        result → AC
      </Caption>

      <Arrow x1={190} y1={75} x2={235} y2={75} />
      <Arrow x1={385} y1={75} x2={430} y2={75} />

      {/* Return path routed around the outside: taking it straight down from
          the boxes would draw it through the caption text underneath them. */}
      <path
        d="M580,75 L600,75 L600,232 L20,232 L20,75 L36,75"
        fill="none"
        stroke={LINE}
        strokeWidth={1.8}
        markerEnd="url(#arrowEnd)"
      />
      <Caption x={310} y={225}>
        repeat, forever
      </Caption>
    </Figure>
  );
}

/** Speed/capacity trade-off as a pyramid. */
export function MemoryHierarchy() {
  return (
    <Figure
      title="The memory hierarchy"
      meta="A1.1.4"
      width={620}
      height={280}
      caption="Every step down is roughly a hundred times slower and a great deal cheaper per byte. Cache exists purely because the gap between registers and RAM is too expensive to pay on every access."
    >
      {[
        { label: "Registers", note: "< 1 ns · bytes", w: 130 },
        { label: "Cache L1/L2/L3", note: "1–20 ns · KB–MB", w: 210 },
        { label: "RAM", note: "~100 ns · GB", w: 290 },
        { label: "SSD / HDD", note: "10 µs – 10 ms · TB", w: 370 },
      ].map((r, i) => (
        <g key={r.label}>
          <rect
            x={310 - r.w / 2}
            y={30 + i * 52}
            width={r.w}
            height={44}
            fill={FILL}
            stroke={INK}
            strokeWidth={1.8}
          />
          <text
            x={310}
            y={46 + i * 52}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={12}
            fill={INK}
          >
            {r.label}
          </text>
          <text
            x={310}
            y={62 + i * 52}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={9}
            fill={FAINT}
          >
            {r.note}
          </text>
        </g>
      ))}
      <Arrow x1={58} y1={40} x2={58} y2={230} />
      <Caption x={50} y={140} anchor="end">
        slower
      </Caption>
      <Arrow x1={506} y1={230} x2={506} y2={40} />
      <Caption x={514} y={140} anchor="start">
        costlier
      </Caption>
    </Figure>
  );
}

/** Sequential vs pipelined instruction throughput. */
export function Pipelining() {
  const stages = ["F", "D", "E"];
  const cell = 34;
  return (
    <Figure
      title="Pipelining"
      meta="A1.1.6"
      width={620}
      height={250}
      caption="Three instructions take nine cycles run one after another, but only five when the stages overlap. Each instruction still takes three cycles — more of them simply finish per second."
    >
      <Caption x={16} y={26} anchor="start" size={11}>
        Without pipelining — 9 cycles
      </Caption>
      {[0, 1, 2].map((instr) =>
        stages.map((s, si) => (
          <g key={`a${instr}${si}`}>
            <rect
              x={90 + (instr * 3 + si) * cell}
              y={36 + instr * 26}
              width={cell - 3}
              height={22}
              fill={FILL}
              stroke={INK}
              strokeWidth={1.3}
            />
            <text
              x={90 + (instr * 3 + si) * cell + (cell - 3) / 2}
              y={48 + instr * 26}
              textAnchor="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={10}
              fill={INK}
            >
              {s}
            </text>
          </g>
        )),
      )}
      {[0, 1, 2].map((i) => (
        <Caption key={`la${i}`} x={82} y={52 + i * 26} anchor="end">
          {`instr ${i + 1}`}
        </Caption>
      ))}

      <Caption x={16} y={150} anchor="start" size={11}>
        With pipelining — 5 cycles
      </Caption>
      {[0, 1, 2].map((instr) =>
        stages.map((s, si) => (
          <g key={`b${instr}${si}`}>
            <rect
              x={90 + (instr + si) * cell}
              y={160 + instr * 26}
              width={cell - 3}
              height={22}
              fill="rgba(211,58,28,0.08)"
              stroke={ACCENT}
              strokeWidth={1.3}
            />
            <text
              x={90 + (instr + si) * cell + (cell - 3) / 2}
              y={172 + instr * 26}
              textAnchor="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={10}
              fill={ACCENT}
            >
              {s}
            </text>
          </g>
        )),
      )}
      {[0, 1, 2].map((i) => (
        <Caption key={`lb${i}`} x={82} y={176 + i * 26} anchor="end">
          {`instr ${i + 1}`}
        </Caption>
      ))}
    </Figure>
  );
}

/** The four components and the loop that closes them. */
export function ControlSystem() {
  return (
    <Figure
      title="A control system"
      meta="A1.3.6"
      width={620}
      height={252}
      caption="The feedback arrow is what makes it a control system rather than a one-off command: the effect of the actuator changes what the sensor next measures."
    >
      <Box x={30} y={70} w={120} h={54} label="SENSOR" sub="measures" />
      <Box x={200} y={70} w={140} h={54} label="PROCESSOR" sub="compares & decides" />
      <Box x={390} y={70} w={120} h={54} label="ACTUATOR" sub="acts" />

      <Arrow x1={150} y1={97} x2={200} y2={97} label="reading" />
      <Arrow x1={340} y1={97} x2={390} y2={97} label="command" />

      <Box x={520} y={70} w={80} h={54} label="WORLD" sub="changes" dashed />
      <Arrow x1={510} y1={97} x2={520} y2={97} />

      <path
        d="M560,124 L560,206 L90,206 L90,124"
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.8}
        strokeDasharray="5 3"
        markerEnd="url(#arrowAccent)"
      />
      <Caption x={325} y={199} colour={ACCENT}>
        feedback loop
      </Caption>
    </Figure>
  );
}

/** Round-robin vs first come first served, as a Gantt chart. */
export function SchedulingGantt() {
  const unit = 26;
  const fcfs = [
    { name: "P1", len: 7, colour: ACCENT },
    { name: "P2", len: 3, colour: TEAL },
    { name: "P3", len: 2, colour: LINE },
  ];
  const rr = [
    { name: "P1", len: 2, colour: ACCENT },
    { name: "P2", len: 2, colour: TEAL },
    { name: "P3", len: 2, colour: LINE },
    { name: "P1", len: 2, colour: ACCENT },
    { name: "P2", len: 1, colour: TEAL },
    { name: "P1", len: 3, colour: ACCENT },
  ];

  const row = (items: typeof fcfs, y: number) => {
    let x = 96;
    return items.map((it, i) => {
      const w = it.len * unit;
      const el = (
        <g key={`${y}-${i}`}>
          <rect
            x={x}
            y={y}
            width={w - 2}
            height={30}
            fill={FILL}
            stroke={it.colour}
            strokeWidth={2}
          />
          <text
            x={x + w / 2}
            y={y + 16}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={11}
            fill={it.colour}
          >
            {it.name}
          </text>
        </g>
      );
      x += w;
      return el;
    });
  };

  return (
    <Figure
      title="Two schedulers, same three processes"
      meta="A1.3.3"
      width={620}
      height={190}
      caption="P1 needs 7 units, P2 needs 3, P3 needs 2. Under first come first served, P3 waits 10 units for two units of work. Round robin gets it finished by unit 6 — the total time is the same, but short jobs stop being punished for arriving late."
    >
      <Caption x={16} y={34} anchor="start" size={11}>
        First come first served
      </Caption>
      {row(fcfs, 44)}
      <Caption x={88} y={62} anchor="end">
        CPU
      </Caption>

      <Caption x={16} y={118} anchor="start" size={11}>
        Round robin, slice = 2
      </Caption>
      {row(rr, 128)}
      <Caption x={88} y={146} anchor="end">
        CPU
      </Caption>
    </Figure>
  );
}

/** Stages a compiler passes through. */
export function CompilerPipeline() {
  const stages = [
    ["Lexical", "text → tokens"],
    ["Syntax", "tokens → tree"],
    ["Semantic", "types & scope"],
    ["Optimise", "same, but faster"],
    ["Generate", "→ machine code"],
  ];
  return (
    <Figure
      title="Stages of compilation"
      meta="A1.4.1"
      width={640}
      height={150}
      caption="The first two stages are exactly what the expression lab on this site does to what you type: break it into tokens, then build a tree, and complain if the grammar does not hold."
    >
      {stages.map(([name, note], i) => (
        <g key={name}>
          <Box x={14 + i * 126} y={40} w={110} h={52} label={name} sub={note} />
          {i < stages.length - 1 && (
            <Arrow
              x1={124 + i * 126}
              y1={66}
              x2={140 + i * 126}
              y2={66}
            />
          )}
        </g>
      ))}
      <Caption x={69} y={112}>
        source code
      </Caption>
      <Caption x={573} y={112}>
        executable
      </Caption>
    </Figure>
  );
}

/** Where the OS sits. */
export function OsLayers() {
  return (
    <Figure
      title="Where the operating system sits"
      meta="A1.3.1"
      width={520}
      height={230}
      caption="Applications never touch hardware directly. Everything goes through the OS, which is what lets one program run on machines with completely different components."
    >
      <Stack
        x={90}
        y={24}
        w={340}
        rowH={44}
        highlight={2}
        rows={[
          { label: "User", note: "clicks and types" },
          { label: "Applications", note: "browser, editor, games" },
          { label: "Operating system", note: "manages and abstracts" },
          { label: "Hardware", note: "CPU, memory, devices" },
        ]}
      />
      <Arrow x1={60} y1={40} x2={60} y2={190} label="" />
      <Caption x={54} y={120} anchor="end">
        requests
      </Caption>
      <Arrow x1={460} y1={190} x2={460} y2={40} />
      <Caption x={466} y={120} anchor="start">
        results
      </Caption>
    </Figure>
  );
}

/** Interrupt handling, as a timeline. */
export function InterruptTimeline() {
  return (
    <Figure
      title="Handling an interrupt"
      meta="A1.3.4"
      width={620}
      height={200}
      caption="The processor never stops mid-instruction. It finishes the one it is on, saves everything it would otherwise lose, deals with the interruption, then restores its state so precisely that the interrupted program cannot tell."
    >
      <line x1={30} y1={100} x2={590} y2={100} stroke={INK} strokeWidth={1.6} />
      {[
        [60, "program", false],
        [170, "finish", false],
        [280, "save state", true],
        [390, "run ISR", true],
        [500, "restore", false],
      ].map(([x, label, hot], i) => (
        <g key={i}>
          <circle
            cx={x as number}
            cy={100}
            r={6}
            fill={hot ? ACCENT : FILL}
            stroke={hot ? ACCENT : INK}
            strokeWidth={1.8}
          />
          <text
            x={x as number}
            y={i % 2 ? 78 : 128}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={10}
            fill={hot ? ACCENT : INK}
          >
            {label as string}
          </text>
        </g>
      ))}
      <path
        d="M170,40 L170,88"
        stroke={ACCENT}
        strokeWidth={1.8}
        markerEnd="url(#arrowAccent)"
        fill="none"
      />
      <Caption x={170} y={32} colour={ACCENT}>
        interrupt raised
      </Caption>
      <Caption x={560} y={128}>
        program resumes
      </Caption>
    </Figure>
  );
}
