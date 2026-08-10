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

/* ---------------------------------------------------------------- A1.2 */

export function PlaceValue() {
  const bits = [0, 1, 0, 1, 1, 0, 1, 0];
  const powers = [128, 64, 32, 16, 8, 4, 2, 1];
  return (
    <Figure
      title="Reading a binary byte"
      meta="A1.2.1"
      width={620}
      height={190}
      caption="Write the column values above the bits, then add the ones with a 1 underneath. 64 + 16 + 8 + 2 = 90."
    >
      {powers.map((p, i) => (
        <g key={p}>
          <Caption x={70 + i * 64} y={36}>
            {String(p)}
          </Caption>
          <rect
            x={44 + i * 64}
            y={48}
            width={52}
            height={46}
            fill={bits[i] ? "rgba(211,58,28,0.09)" : FILL}
            stroke={bits[i] ? ACCENT : INK}
            strokeWidth={1.8}
          />
          <text
            x={70 + i * 64}
            y={73}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={18}
            fill={bits[i] ? ACCENT : FAINT}
          >
            {bits[i]}
          </text>
          {bits[i] === 1 && (
            <Caption x={70 + i * 64} y={116} colour={ACCENT}>
              {`+${p}`}
            </Caption>
          )}
        </g>
      ))}
      <line x1={44} y1={132} x2={556} y2={132} stroke={INK} strokeWidth={1.4} />
      <Caption x={556} y={156} anchor="end" size={13} colour={INK}>
        = 90
      </Caption>
    </Figure>
  );
}

export function TwosComplement() {
  const powers = ["−128", "64", "32", "16", "8", "4", "2", "1"];
  const bits = [1, 0, 0, 1, 1, 0, 1, 1];
  return (
    <Figure
      title="Two's complement"
      meta="A1.2.1"
      width={620}
      height={175}
      caption="Only the leftmost column changes: its weight is negative. −128 + 16 + 8 + 2 + 1 = −101. Any number beginning with 1 is negative."
    >
      {powers.map((p, i) => (
        <g key={p}>
          <Caption
            x={70 + i * 64}
            y={36}
            colour={i === 0 ? ACCENT : FAINT}
            size={i === 0 ? 12 : 10}
          >
            {p}
          </Caption>
          <rect
            x={44 + i * 64}
            y={48}
            width={52}
            height={46}
            fill={bits[i] ? "rgba(211,58,28,0.09)" : FILL}
            stroke={bits[i] ? ACCENT : INK}
            strokeWidth={1.8}
          />
          <text
            x={70 + i * 64}
            y={73}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={18}
            fill={bits[i] ? ACCENT : FAINT}
          >
            {bits[i]}
          </text>
        </g>
      ))}
      <Caption x={70} y={124} colour={ACCENT}>
        sign column
      </Caption>
      <Caption x={556} y={148} anchor="end" size={13} colour={INK}>
        = −101
      </Caption>
    </Figure>
  );
}

export function Sampling() {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const x = 40 + i * 9;
    const y = 100 - 46 * Math.sin(i / 6.2) * Math.cos(i / 17);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y.toFixed(1)}`).join(" ");
  return (
    <Figure
      title="Sampling a sound wave"
      meta="A1.2.1"
      width={620}
      height={200}
      caption="The smooth line is the real sound. The bars are what gets stored. More samples per second, and more bits per sample, means the bars follow the curve more closely — and the file grows in proportion."
    >
      <line x1={40} y1={100} x2={584} y2={100} stroke={FAINT} strokeWidth={1} />
      <path d={path} fill="none" stroke={LINE} strokeWidth={2} />
      {pts
        .filter((_, i) => i % 5 === 0)
        .map(([x, y], i) => (
          <g key={i}>
            <line x1={x} y1={100} x2={x} y2={y} stroke={ACCENT} strokeWidth={2} />
            <circle cx={x} cy={y} r={2.6} fill={ACCENT} />
          </g>
        ))}
      <Caption x={40} y={172} anchor="start">
        each bar is one stored number
      </Caption>
      <Caption x={584} y={172} anchor="end">
        sample rate → how many bars
      </Caption>
    </Figure>
  );
}

export function ColourDepth() {
  return (
    <Figure
      title="Colour depth"
      meta="A1.2.2"
      width={620}
      height={190}
      caption="One bit per pixel gives two colours. Eight bits give 256. Twenty-four bits — eight each for red, green and blue — give about 16.7 million, and cost three bytes for every single pixel."
    >
      {[
        { bits: 1, n: "2 colours", shades: 2 },
        { bits: 4, n: "16 colours", shades: 8 },
        { bits: 8, n: "256 colours", shades: 16 },
      ].map((row, r) => (
        <g key={row.bits}>
          <Caption x={116} y={54 + r * 48} anchor="end" size={11} colour={INK}>
            {`${row.bits}-bit`}
          </Caption>
          <Caption x={116} y={68 + r * 48} anchor="end">
            {row.n}
          </Caption>
          {Array.from({ length: row.shades }, (_, i) => {
            const v = Math.round((i / (row.shades - 1)) * 210 + 20);
            return (
              <rect
                key={i}
                x={136 + i * (430 / row.shades)}
                y={36 + r * 48}
                width={430 / row.shades - 2}
                height={32}
                fill={`rgb(${v},${v},${v})`}
                stroke={INK}
                strokeWidth={0.8}
              />
            );
          })}
        </g>
      ))}
    </Figure>
  );
}

/* ---------------------------------------------------------------- A2 */

export function OsiStack() {
  return (
    <Figure
      title="The OSI model"
      meta="A2.1"
      width={720}
      height={330}
      caption="Each layer talks only to its opposite number at the far end, and relies on the layer below to get it there. Swapping cable for Wi-Fi changes layer 1 and nothing above it."
    >
      <Stack
        x={150}
        y={20}
        w={420}
        rowH={42}
        rows={[
          { label: "7 · Application", note: "HTTP, DNS, SMTP" },
          { label: "6 · Presentation", note: "encrypt, compress" },
          { label: "5 · Session", note: "start & end talks" },
          { label: "4 · Transport", note: "TCP, UDP" },
          { label: "3 · Network", note: "IP, routers" },
          { label: "2 · Data link", note: "MAC, switches" },
          { label: "1 · Physical", note: "cable, radio" },
        ]}
      />
      <Arrow x1={126} y1={30} x2={126} y2={300} />
      <Caption x={118} y={165} anchor="end">
        down at the sender
      </Caption>
      <Arrow x1={594} y1={300} x2={594} y2={30} />
      <Caption x={604} y={165} anchor="start">
        up at the receiver
      </Caption>
    </Figure>
  );
}

export function Encapsulation() {
  const layers = [
    { label: "Data", w: 120, colour: INK },
    { label: "Segment", w: 220, colour: TEAL },
    { label: "Packet", w: 320, colour: LINE },
    { label: "Frame", w: 420, colour: ACCENT },
  ];
  return (
    <Figure
      title="Encapsulation"
      meta="A2.1"
      width={560}
      height={250}
      caption="Each layer wraps what it was handed in its own header, like putting a letter in an envelope, in a sack, in a van. The far end unwraps them in reverse."
    >
      {layers.map((l, i) => (
        <g key={l.label}>
          <rect
            x={280 - l.w / 2}
            y={28 + i * 50}
            width={l.w}
            height={38}
            fill={FILL}
            stroke={l.colour}
            strokeWidth={1.9}
          />
          {i > 0 && (
            <rect
              x={280 - l.w / 2}
              y={28 + i * 50}
              width={46}
              height={38}
              fill="rgba(0,0,0,0.03)"
              stroke={l.colour}
              strokeWidth={1.2}
            />
          )}
          {i > 0 && (
            <text
              x={280 - l.w / 2 + 23}
              y={48 + i * 50}
              textAnchor="middle"
              fontFamily="var(--font-mono), monospace"
              fontSize={8}
              fill={l.colour}
            >
              hdr
            </text>
          )}
          <text
            x={280 + (i > 0 ? 23 : 0)}
            y={48 + i * 50}
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={11}
            fill={l.colour}
          >
            {l.label}
          </text>
        </g>
      ))}
      <Caption x={40} y={50} anchor="start">
        layer 7
      </Caption>
      <Caption x={40} y={200} anchor="start">
        layer 2
      </Caption>
    </Figure>
  );
}

export function PacketSwitching() {
  return (
    <Figure
      title="Packet switching"
      meta="A2.3"
      width={620}
      height={230}
      caption="The three packets take three different routes and arrive out of order. Sequence numbers in each header let the receiver put them back together — and if one never turns up, only that packet is resent."
    >
      <Box x={20} y={90} w={80} h={46} label="Sender" />
      <Box x={520} y={90} w={80} h={46} label="Receiver" />

      {[
        { y: 40, label: "R1" },
        { y: 113, label: "R2" },
        { y: 186, label: "R3" },
      ].map((r) => (
        <Box key={r.label} x={280} y={r.y - 18} w={60} h={36} label={r.label} />
      ))}

      {[
        { y: 40, n: "1", colour: ACCENT },
        { y: 113, n: "3", colour: TEAL },
        { y: 186, n: "2", colour: LINE },
      ].map((p) => (
        <g key={p.n}>
          <path
            d={`M100,113 L${240},${p.y} L280,${p.y}`}
            fill="none"
            stroke={p.colour}
            strokeWidth={1.7}
          />
          <path
            d={`M340,${p.y} L${480},${p.y} L520,113`}
            fill="none"
            stroke={p.colour}
            strokeWidth={1.7}
            markerEnd="url(#arrowEnd)"
          />
          <circle cx={200} cy={(113 + p.y) / 2} r={9} fill={FILL} stroke={p.colour} strokeWidth={1.7} />
          <text
            x={200}
            y={(113 + p.y) / 2 + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize={10}
            fill={p.colour}
          >
            {p.n}
          </text>
        </g>
      ))}
    </Figure>
  );
}

export function ClientServerVsP2p() {
  const ring = (cx: number, cy: number, r: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });
  const a = ring(160, 120, 66, 5);
  const b = ring(450, 120, 66, 5);
  return (
    <Figure
      title="Client–server against peer-to-peer"
      meta="A2.2"
      width={620}
      height={230}
      caption="On the left every request goes through one machine — easy to secure and back up, and catastrophic when it fails. On the right there is no centre to lose, and no centre to control either."
    >
      {a.map((p, i) => (
        <g key={`a${i}`}>
          <line x1={160} y1={120} x2={p.x} y2={p.y} stroke={LINE} strokeWidth={1.6} />
          <circle cx={p.x} cy={p.y} r={11} fill={FILL} stroke={INK} strokeWidth={1.7} />
        </g>
      ))}
      <rect x={140} y={106} width={40} height={28} fill={FILL} stroke={ACCENT} strokeWidth={2} />
      <text
        x={160}
        y={120}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize={9}
        fill={ACCENT}
      >
        SRV
      </text>
      <Caption x={160} y={214} size={11} colour={INK}>
        client–server
      </Caption>

      {b.flatMap((p, i) =>
        b.slice(i + 1).map((q, j) => (
          <line
            key={`b${i}${j}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={LINE}
            strokeWidth={1.4}
          />
        )),
      )}
      {b.map((p, i) => (
        <circle key={`bn${i}`} cx={p.x} cy={p.y} r={11} fill={FILL} stroke={INK} strokeWidth={1.7} />
      ))}
      <Caption x={450} y={214} size={11} colour={INK}>
        peer-to-peer
      </Caption>
    </Figure>
  );
}

export function Segmentation() {
  return (
    <Figure
      title="Network segmentation"
      meta="A2.2"
      width={620}
      height={220}
      caption="Traffic between segments has to pass the firewall, which is the whole point: it creates one place where it can be inspected and refused. A compromised student laptop cannot reach the examinations server."
    >
      {[
        { x: 24, label: "Students", n: 4 },
        { x: 232, label: "Staff", n: 3 },
        { x: 440, label: "Admin", n: 2 },
      ].map((g) => (
        <g key={g.label}>
          <rect
            x={g.x}
            y={30}
            width={156}
            height={104}
            fill="none"
            stroke={FAINT}
            strokeWidth={1.2}
            strokeDasharray="5 4"
          />
          <Caption x={g.x + 78} y={48} size={11} colour={INK}>
            {g.label}
          </Caption>
          {Array.from({ length: g.n }, (_, i) => (
            <circle
              key={i}
              cx={g.x + 34 + i * 30}
              cy={98}
              r={11}
              fill={FILL}
              stroke={INK}
              strokeWidth={1.7}
            />
          ))}
          <Arrow x1={g.x + 78} y1={134} x2={g.x + 78} y2={166} />
        </g>
      ))}
      <Box x={230} y={166} w={160} h={38} label="Firewall / router" accent />
    </Figure>
  );
}
