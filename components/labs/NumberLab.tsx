"use client";

import { useState } from "react";

const BITS = [4, 8, 16] as const;

function toBinary(n: number, bits: number) {
  const masked = ((n % 2 ** bits) + 2 ** bits) % 2 ** bits;
  return masked.toString(2).padStart(bits, "0");
}

export default function NumberLab() {
  const [value, setValue] = useState(90);
  const [bits, setBits] = useState<(typeof BITS)[number]>(8);

  const max = 2 ** (bits - 1) - 1;
  const min = -(2 ** (bits - 1));
  const unsignedMax = 2 ** bits - 1;
  const clamped = Math.max(min, Math.min(unsignedMax, Math.round(value) || 0));
  const negative = clamped < 0;
  const binary = toBinary(clamped, bits);
  const hex = (((clamped % 2 ** bits) + 2 ** bits) % 2 ** bits)
    .toString(16)
    .toUpperCase()
    .padStart(bits / 4, "0");

  const powers = Array.from({ length: bits }, (_, i) => 2 ** (bits - 1 - i));
  const signedPowers = powers.map((p, i) => (i === 0 ? -p : p));
  const active = powers.map((_, i) => binary[i] === "1");

  return (
    <>
      <div className="panel">
        <div className="panelHead">
          <span>Number</span>
          <span>
            {bits}-bit · unsigned 0…{unsignedMax} · signed {min}…{max}
          </span>
        </div>
        <div className="panelBody">
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              value={clamped}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label="Denary value"
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "1.4rem",
                width: "8rem",
                padding: "0.4rem 0.5rem",
                border: "1px solid var(--hairline)",
                background: "var(--paper)",
                color: "var(--ink)",
              }}
            />
            {BITS.map((b) => (
              <button
                key={b}
                className="paletteBtn"
                style={{
                  width: "auto",
                  margin: 0,
                  borderColor: b === bits ? "var(--alarm)" : undefined,
                  color: b === bits ? "var(--alarm)" : undefined,
                }}
                onClick={() => setBits(b)}
              >
                {b}-bit
              </button>
            ))}
            <button className="paletteBtn" style={{ width: "auto", margin: 0 }}
              onClick={() => setValue(Math.floor(Math.random() * (unsignedMax + 1)))}>
              Random
            </button>
          </div>

          <input
            type="range"
            min={min}
            max={unsignedMax}
            value={clamped}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Slide the value"
            style={{ width: "100%", marginTop: "1rem", accentColor: "var(--alarm)" }}
          />
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <span>Place values</span>
          <span>{negative ? "two's complement — the top column is negative" : "click a bit to flip it"}</span>
        </div>
        <div className="panelBody" style={{ overflowX: "auto" }}>
          <table className="tt" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                {(negative ? signedPowers : powers).map((p, i) => (
                  <th key={i} style={i === 0 && negative ? { color: "var(--alarm)" } : undefined}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {active.map((on, i) => (
                  <td
                    key={i}
                    className={on ? "one" : "zero"}
                    style={{ cursor: "pointer", fontSize: "1.05rem" }}
                    onClick={() => {
                      const flipped = binary.split("");
                      flipped[i] = on ? "0" : "1";
                      const raw = parseInt(flipped.join(""), 2);
                      setValue(negative || flipped[0] === "1" && negative ? raw - 2 ** bits : raw);
                    }}
                  >
                    {on ? 1 : 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="cardGrid">
        {[
          ["Denary", String(clamped)],
          ["Binary", binary.replace(/(.{4})/g, "$1 ").trim()],
          ["Hexadecimal", hex],
          ["Sum of columns", active
            .map((on, i) => (on ? (negative ? signedPowers : powers)[i] : 0))
            .filter(Boolean)
            .join(" + ") || "0"],
        ].map(([k, v]) => (
          <div className="card" key={k}>
            <div className="cardTitle">{k}</div>
            <div className="cardBody mono" style={{ fontSize: "1rem", color: "var(--ink)" }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <p className="annotation">
        <b>Try this.</b> Set the value to 5, note the pattern, then set it to −5.
        Flip every bit of 5 in your head and add one — that is what the machine
        does, and it is why the same adder handles subtraction.
      </p>
    </>
  );
}
