import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { SpecList } from "@/components/Spec";
import { M, MB } from "@/components/Math";
import PyRunner from "@/components/PyRunner";
import {
  ColourDepth,
  PlaceValue,
  Sampling,
  TwosComplement,
} from "@/components/figures/dataNet";

export const metadata: Metadata = { title: "Data representation" };

const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];

export default function DataRepresentationPage() {
  return (
    <>
      <PageHead
        code="A1.2.1–A1.2.2 · Representing data · How binary stores data"
        title="Data representation"
        lede="Everything in the machine is a number, and every number is a pattern of switches. This is how text, pictures and sound get in and out of that."
      />

      <div className="prose">
        <p>
          A computer stores one thing: <strong>bits</strong>. A bit is a single
          switch, 0 or 1. Eight of them make a <strong>byte</strong>, which has{" "}
          <M>{"2^8 = 256"}</M> possible patterns. Meaning is not in the bits —
          it is in the agreement about how to read them. The same byte is the
          number 65, the letter A, or a dark grey pixel, depending only on what
          you have agreed it represents.
        </p>
      </div>

      <PlaceValue />

      <h2 className="display">Denary, binary and hexadecimal</h2>
      <div className="prose">
        <p>
          Denary (base 10) uses ten digits and column values that are powers of
          ten. Binary (base 2) uses two digits and columns that are powers of
          two. Hexadecimal (base 16) uses sixteen digits — 0–9 then A–F for
          10–15 — and columns that are powers of sixteen.
        </p>
        <p>
          <strong>Binary to denary.</strong> Write the column values above the
          bits and add up the ones with a 1 under them.
        </p>
      </div>

      <table className="tt" style={{ margin: "1rem 0" }}>
        <thead>
          <tr>
            {POWERS.map((p) => (
              <th key={p}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {[0, 1, 0, 1, 1, 0, 1, 0].map((b, i) => (
              <td key={i} className={b ? "one" : "zero"}>
                {b}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="prose">
        <p>
          <M>{"64 + 16 + 8 + 2 = 90"}</M>, so binary 01011010 is 90 in denary.
        </p>
        <p>
          <strong>Denary to binary.</strong> Work left to right through the
          column values. Ask &ldquo;does it fit?&rdquo; — if yes write 1 and
          subtract, if no write 0. For 90: 128 does not fit (0), 64 fits leaving
          26 (1), 32 does not (0), 16 fits leaving 10 (1), 8 fits leaving 2 (1),
          4 does not (0), 2 fits leaving 0 (1), 1 does not (0). That is
          01011010.
        </p>
        <p>
          <strong>Hexadecimal.</strong> Each hex digit is exactly four bits,
          which is the entire reason it is used — it is a shorthand for binary
          that humans can actually read. Split the byte into two nibbles:
          0101 = 5 and 1010 = A, so 01011010 is <M>{"5\\text{A}"}</M> in hex.
        </p>
        <p>
          You meet hex in colour codes (<span className="mono">#FF0080</span>),
          memory addresses and MAC addresses. Writing a 48-bit MAC address in
          binary would take 48 characters; in hex it takes 12.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Check your conversions backwards</div>
        <p style={{ margin: 0 }}>
          Converting the answer back the other way takes fifteen seconds and
          catches nearly every slip. It is the single highest-value habit in
          this topic.
        </p>
      </div>

      <h2 className="display">Negative numbers: two&apos;s complement</h2>
      <div className="prose">
        <p>
          The columns above have no room for a minus sign. The standard solution
          is <strong>two&apos;s complement</strong>, where the leftmost bit
          carries a negative weight. In eight bits the columns become −128, 64,
          32, 16, 8, 4, 2, 1.
        </p>
        <p>
          So 10011011 is <M>{"-128 + 16 + 8 + 2 + 1 = -101"}</M>. Any number
          starting with 1 is negative; any starting with 0 is positive.
        </p>
        <p>
          <strong>To negate a number:</strong> flip every bit, then add 1. Take
          +5 = 00000101. Flipped: 11111010. Add one: 11111011, which is{" "}
          <M>{"-128 + 64 + 32 + 16 + 8 + 2 + 1 = -5"}</M>.
        </p>
        <p>
          Why do it this awkward way? Because ordinary binary addition then just
          works. Add 00000101 and 11111011 and you get 100000000; discard the
          ninth bit and you have zero. The processor needs no separate
          subtraction circuit — the adder from the{" "}
          <a href="/circuits/">real circuits</a> page handles both.
        </p>
        <p>
          An eight-bit two&apos;s complement number covers −128 to +127. Push
          past either end and it wraps around, which is <strong>overflow</strong>
          .
        </p>
      </div>

      <TwosComplement />

      <PyRunner
        caption="Conversions in both directions, done by hand rather than with built-ins, so you can see the method the exam wants."
        code={`def to_binary(n, bits=8):
    """Repeatedly ask: does this column fit?"""
    out = ""
    for power in range(bits - 1, -1, -1):
        value = 2 ** power
        if n >= value:
            out += "1"
            n -= value
        else:
            out += "0"
    return out

def to_denary(bits):
    total = 0
    for i, bit in enumerate(bits):
        if bit == "1":
            total += 2 ** (len(bits) - 1 - i)
    return total

def twos_complement(n, bits=8):
    if n >= 0:
        return to_binary(n, bits)
    flipped = "".join("1" if b == "0" else "0" for b in to_binary(-n, bits))
    return to_binary(to_denary(flipped) + 1, bits)

for n in (90, 5, 255):
    b = to_binary(n)
    print(f"{n:>4} -> {b}  -> back to {to_denary(b)}  hex {n:02X}")

print()
for n in (5, -5, -101, -128):
    print(f"{n:>5} in two\u0027s complement -> {twos_complement(n)}")`}
      />

      <h2 className="display">Representing text</h2>
      <SpecList
        title="Character encodings"
        meta="A1.2.1"
        termWidth="8rem"
        rows={[
          {
            term: "ASCII",
            body: "Seven bits, 128 characters: the English alphabet, digits, punctuation and control codes. 'A' is 65, 'a' is 97 — exactly 32 apart, which is why changing case is a single bit flip. Too small for most of the world's writing.",
          },
          {
            term: "Extended ASCII",
            body: "Eight bits, 256 characters, adding accented letters and symbols. Still nowhere near enough, and different systems disagreed about the upper half.",
          },
          {
            term: "Unicode",
            body: "One code point for every character in every writing system, plus emoji. UTF-8 encodes them in one to four bytes and is deliberately identical to ASCII for the first 128 characters, so old English-only text is already valid UTF-8.",
          },
        ]}
      />

      <h2 className="display">Representing images</h2>
      <div className="prose">
        <p>
          A bitmap image is a grid of pixels, each stored as a number. Two
          properties decide the file size and the quality.
        </p>
        <ul>
          <li>
            <strong>Resolution</strong> — how many pixels, usually given as
            width × height.
          </li>
          <li>
            <strong>Colour depth</strong> — how many bits per pixel. One bit
            gives black and white; 8 bits give 256 shades; 24-bit colour gives 8
            bits each for red, green and blue, which is about 16.7 million
            colours.
          </li>
        </ul>
        <MB>
          {"\\text{file size (bits)} = \\text{width} \\times \\text{height} \\times \\text{colour depth}"}
        </MB>
        <p>
          A 1920 × 1080 photograph at 24-bit colour is{" "}
          <M>{"1920 \\times 1080 \\times 24 = 49{,}766{,}400"}</M> bits, about
          5.9 MB — before any compression. This is why lossy compression exists.
        </p>
        <p>
          Files also carry <strong>metadata</strong>: dimensions, colour depth,
          and often the date and camera settings. Without it the reader would
          not know how to lay the pixels out.
        </p>
      </div>

      <ColourDepth />

      <h2 className="display">Representing sound</h2>
      <div className="prose">
        <p>
          Sound is a continuous wave, and a computer cannot store something
          continuous. It <strong>samples</strong> the wave: measures its height
          many thousands of times a second and stores each measurement as a
          number.
        </p>
        <ul>
          <li>
            <strong>Sample rate</strong> — measurements per second, in hertz. CD
            audio uses 44,100 Hz.
          </li>
          <li>
            <strong>Bit depth</strong> — bits per measurement. More bits means
            finer distinctions between loudnesses. CD audio uses 16.
          </li>
        </ul>
        <MB>
          {"\\text{file size (bits)} = \\text{sample rate} \\times \\text{bit depth} \\times \\text{seconds} \\times \\text{channels}"}
        </MB>
        <p>
          One second of CD-quality stereo is{" "}
          <M>{"44100 \\times 16 \\times 1 \\times 2 = 1{,}411{,}200"}</M> bits,
          about 176 kB. Higher rates and depths give a more faithful recording
          and a proportionally larger file — the same trade as images.
        </p>
      </div>

      <Sampling />

      <h2 className="display">Units</h2>
      <div className="prose">
        <p>
          8 bits = 1 byte. Then each step up is ×1024 in the binary convention
          (kibibyte, mebibyte) or ×1000 in the decimal one (kilobyte,
          megabyte). Storage manufacturers use the decimal convention, operating
          systems have often used the binary one, which is why a
          &ldquo;1 TB&rdquo; drive shows up as roughly 931 GB.
        </p>
      </div>

      <p className="annotation">
        <b>Where this goes next.</b> Once data is numbers, the machine needs
        something that can act on those numbers. That is what the{" "}
        <a href="/gates/">logic gates</a> do — and the adder on the{" "}
        <a href="/circuits/">real circuits</a> page is literally the two&apos;s
        complement arithmetic above, built out of gates.
      </p>
    </>
  );
}
