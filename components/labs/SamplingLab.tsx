"use client";

import { useMemo, useState } from "react";

export default function SamplingLab() {
  const [rate, setRate] = useState(16);
  const [depth, setDepth] = useState(3);
  const [seconds, setSeconds] = useState(30);
  const [channels, setChannels] = useState(2);

  const W = 620, H = 170, MID = H / 2, AMP = 58;
  const wave = (x: number) =>
    MID - AMP * (0.7 * Math.sin(x / 46) + 0.3 * Math.sin(x / 17 + 1));

  const smooth = useMemo(
    () => Array.from({ length: W }, (_, x) => `${x ? "L" : "M"}${x},${wave(x).toFixed(1)}`).join(" "),
    [],
  );

  const levels = 2 ** depth;
  const samples = useMemo(() => {
    const gap = W / rate;
    return Array.from({ length: rate }, (_, i) => {
      const x = i * gap + gap / 2;
      const raw = wave(x);
      const norm = (MID + AMP - raw) / (2 * AMP);
      const q = Math.round(norm * (levels - 1)) / (levels - 1);
      return { x, gap, raw, y: MID + AMP - q * 2 * AMP };
    });
  }, [rate, levels]);

  const bits = 44100 * (rate / 16) * 0 + rate * depth * seconds * channels;
  const realRate = rate * 2756;
  const realBits = realRate * depth * seconds * channels;

  const slider = (label: string, value: number, set: (n: number) => void, min: number, max: number, unit = "") => (
    <label style={{ display: "block", marginBottom: "0.8rem" }}>
      <span className="mono" style={{ display: "block", color: "var(--ink-soft)", marginBottom: "0.2rem" }}>
        {label}: <strong style={{ color: "var(--alarm)" }}>{value}{unit}</strong>
      </span>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => set(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--alarm)" }} />
    </label>
  );

  return (
    <>
      <div className="panel">
        <div className="panelHead">
          <span>Sampling</span>
          <span>{rate} samples · {levels} levels</span>
        </div>
        <div className="panelBody">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
            role="img" aria-label="Sampled waveform">
            <line x1={0} y1={MID} x2={W} y2={MID} stroke="var(--ink-faint)" strokeWidth={0.8} />
            {Array.from({ length: levels }, (_, i) => (
              <line key={i} x1={0} y1={MID - AMP + (i * 2 * AMP) / (levels - 1)}
                x2={W} y2={MID - AMP + (i * 2 * AMP) / (levels - 1)}
                stroke="var(--ice-line)" strokeWidth={0.6} strokeDasharray="2 4" />
            ))}
            <path d={smooth} fill="none" stroke="var(--ice-deep)" strokeWidth={2} />
            {samples.map((s, i) => (
              <g key={i}>
                <rect x={s.x - s.gap / 2 + 1} y={Math.min(s.y, MID)} width={s.gap - 2}
                  height={Math.abs(s.y - MID)} fill="rgba(211,58,28,0.14)" stroke="var(--alarm)" strokeWidth={1} />
                <circle cx={s.x} cy={s.y} r={2.6} fill="var(--alarm)" />
              </g>
            ))}
          </svg>
        </div>
        <p className="caption">
          The blue line is the real sound. The red bars are what gets stored. Raise
          the sample rate and the bars follow the curve more closely; raise the bit
          depth and each bar can land closer to the true height.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))", gap: "1.5rem" }}>
        <div>
          {slider("Sample rate (shown)", rate, setRate, 4, 64)}
          {slider("Bit depth", depth, setDepth, 1, 16, " bits")}
          {slider("Length", seconds, setSeconds, 1, 300, " s")}
          {slider("Channels", channels, setChannels, 1, 2)}
        </div>
        <div className="panel" style={{ margin: 0 }}>
          <div className="panelHead"><span>File size</span></div>
          <div className="panelBody">
            <p className="mono" style={{ lineHeight: 1.9, color: "var(--ink)" }}>
              rate × depth × seconds × channels
              <br />
              {realRate.toLocaleString()} × {depth} × {seconds} × {channels}
              <br />
              = {realBits.toLocaleString()} bits
              <br />
              = <strong style={{ color: "var(--alarm)" }}>
                {(realBits / 8 / 1024 / 1024).toFixed(2)} MB
              </strong>
            </p>
            <p className="caption" style={{ border: 0, padding: 0, marginTop: "0.5rem" }}>
              For scale, CD audio is 44,100 Hz at 16 bits in stereo — about 10 MB
              a minute. Every slider here multiplies directly into that number,
              which is the whole reason lossy compression was invented.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
