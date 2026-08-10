import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { SpecList } from "@/components/Spec";
import { M, MB } from "@/components/Math";
import PyRunner from "@/components/PyRunner";
import { PacketSwitching } from "@/components/figures/dataNet";

export const metadata: Metadata = { title: "Data transmission" };

export default function DataTransmissionPage() {
  return (
    <>
      <PageHead
        code="A2.3 · Data transmission"
        title="Data transmission"
        lede="What the data physically travels along, how it is cut up for the journey, and how the far end knows it arrived intact."
      />

      <h2 className="display">Choosing a medium</h2>
      <div className="prose">
        <p>
          The syllabus asks you to compare transmission media against a fixed
          set of factors. Learn the factors and the comparison writes itself.
        </p>
      </div>

      <SpecList
        title="The factors to compare on"
        meta="A2.3"
        termWidth="10rem"
        rows={[
          { term: "Bandwidth", body: "How much data the medium can carry per second. Often loosely called speed." },
          { term: "Installation", body: "How difficult and disruptive it is to put in — running cable through walls, or simply placing an access point." },
          { term: "Cost", body: "Of the medium, the equipment at each end, and the labour to install it." },
          { term: "Range", body: "How far the signal usefully travels before it must be boosted." },
          { term: "Interference", body: "How badly other electrical or radio sources corrupt the signal." },
          { term: "Attenuation", body: "How much the signal weakens with distance. All media attenuate; they differ in how fast." },
          { term: "Reliability", body: "How consistent the connection is over time." },
          { term: "Security", body: "How easily the traffic can be intercepted without physical access." },
        ]}
      />

      <h2 className="display">Wired media</h2>
      <SpecList
        title="Cable types"
        termWidth="10rem"
        rows={[
          {
            term: "Twisted pair",
            body: "Pairs of copper wires twisted together, which cancels much of the interference. Cheap, flexible and easy to install — the ordinary Ethernet cable. Limited to about 100 m before a repeater, and more prone to interference and eavesdropping than fibre.",
          },
          {
            term: "Coaxial",
            body: "A copper core inside a shielding braid. Better protected from interference than twisted pair and good over longer distances, but bulkier, less flexible and more expensive. Common for cable television and broadband.",
          },
          {
            term: "Fibre optic",
            body: "Pulses of light through glass or plastic. Enormous bandwidth, very low attenuation so it runs for kilometres, completely immune to electromagnetic interference, and extremely hard to tap without detection. Costs more and needs skilled installation, since the fibre is fragile and cannot be sharply bent.",
          },
        ]}
      />

      <h2 className="display">Wireless</h2>
      <div className="prose">
        <p>
          Wireless transmits over radio, and its advantages and disadvantages
          are the same fact seen from two sides: there is no cable.
        </p>
        <ul>
          <li>
            <strong>For.</strong> Devices move freely, installation needs no
            cabling, and adding a device costs nothing physical. Far cheaper in
            buildings where running cable is difficult or forbidden.
          </li>
          <li>
            <strong>Against.</strong> Lower bandwidth than fibre and shared
            between everyone on the access point; range limited and reduced by
            walls; susceptible to interference from other networks and
            appliances; and the signal leaves the building, so security depends
            entirely on encryption rather than on physical access.
          </li>
        </ul>
        <p>
          <strong>Wi-Fi</strong> serves a building; <strong>Bluetooth</strong> a
          few metres at low power; <strong>cellular</strong> covers wide areas
          through a network of base stations; and satellite reaches places no
          infrastructure does, at the cost of high latency.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Bandwidth is not latency</div>
        <p style={{ margin: 0 }}>
          <strong>Bandwidth</strong> is how much data fits through per second.{" "}
          <strong>Latency</strong> is how long one piece takes to arrive. A
          satellite link can have huge bandwidth and dreadful latency — a very
          wide road that happens to be very long. Video calls suffer from
          latency; large downloads suffer from low bandwidth.
        </p>
      </div>

      <div className="prose">
        <p>Transfer time follows directly from the file size and the bandwidth:</p>
        <MB>{"\\text{time} = \\frac{\\text{file size}}{\\text{bandwidth}}"}</MB>
        <p>
          Watch the units. A 50 megabyte file over a 20 megabit per second
          connection is <M>{"50 \\times 8 = 400"}</M> megabits, so{" "}
          <M>{"400 \\div 20 = 20"}</M> seconds. Mixing bits and bytes is the
          most common error in this calculation.
        </p>
      </div>

      <h2 className="display">Packet switching</h2>
      <div className="prose">
        <p>
          Data is not sent as one continuous stream. It is broken into{" "}
          <strong>packets</strong>, each carrying a header with the source and
          destination addresses, a sequence number and error-checking data,
          alongside the payload itself.
        </p>
        <p>
          Each packet is routed independently and may take a different path, so
          they can arrive out of order or not at all. The receiver uses the
          sequence numbers to reassemble them and requests retransmission of
          anything missing.
        </p>
        <p>
          This seems inefficient, and it is the reason the internet works. If
          one route fails, packets go another way with no connection to
          re-establish. Many conversations share the same links rather than each
          reserving a private circuit. It is the opposite of{" "}
          <strong>circuit switching</strong>, where a dedicated path is held
          open for the whole call — reliable and predictable, but idle whenever
          nobody is speaking.
        </p>
      </div>

      <PacketSwitching />

      <PyRunner
        caption="Parity and checksums, and the case parity silently misses. Flip a second bit in the corrupted byte and watch parity declare it fine."
        code={`def parity_bit(bits):
    """Even parity: the appended bit makes the number of 1s even."""
    return "1" if bits.count("1") % 2 else "0"

def check_parity(word):
    return word.count("1") % 2 == 0

original = "1011001"
sent = original + parity_bit(original)
print("data      ", original)
print("sent      ", sent, "(last bit is parity)")
print()

def flip(word, *positions):
    bits = list(word)
    for i in positions:
        bits[i] = "1" if bits[i] == "0" else "0"
    return "".join(bits)

for label, received in [
        ("clean       ", sent),
        ("1 bit flipped", flip(sent, 2)),
        ("2 bits flipped", flip(sent, 2, 5))]:
    verdict = "looks fine" if check_parity(received) else "ERROR DETECTED"
    print(f"{label}: {received}  ->  {verdict}")

print()
print("Two flipped bits cancel out. Parity cannot see them.")
print()

# A checksum catches far more, though still not everything.
packet = [72, 101, 108, 108, 111]
checksum = sum(packet) % 256
print("packet   ", packet, "checksum", checksum)
corrupted = [72, 101, 108, 108, 121]
print("corrupted", corrupted, "checksum", sum(corrupted) % 256)
print("match?", sum(corrupted) % 256 == checksum)`}
      />

      <h2 className="display">Detecting errors</h2>
      <SpecList
        title="Error detection and correction"
        termWidth="9rem"
        rows={[
          {
            term: "Parity bit",
            body: "One extra bit set so the total number of 1s is even (or odd). Cheap, and it catches any single-bit error — but two errors cancel out and slip through undetected.",
          },
          {
            term: "Checksum",
            body: "The sender adds up the data and transmits the total; the receiver adds it up again and compares. Catches most corruption, but different data can occasionally produce the same sum.",
          },
          {
            term: "CRC",
            body: "Cyclic redundancy check. Treats the data as a large binary number and transmits the remainder from dividing it by an agreed value. Far more reliable than a checksum and standard in real networks.",
          },
          {
            term: "Echo check",
            body: "The receiver sends the data back and the sender compares. Simple, but doubles the traffic, and an error in the return journey is indistinguishable from one on the way out.",
          },
          {
            term: "ARQ",
            body: "Automatic repeat request. The receiver acknowledges what arrived correctly and the sender retransmits anything unacknowledged within a timeout. This is what TCP does.",
          },
        ]}
      />

      <div className="prose">
        <p>
          Detection tells you something is wrong; <strong>correction</strong>{" "}
          fixes it without asking again. Hamming codes add enough redundancy to
          identify which bit flipped and repair it, which is worth the cost when
          retransmission is impossible — a probe in deep space cannot wait for a
          reply.
        </p>
      </div>

      <h2 className="display">Keeping transmission private</h2>
      <div className="prose">
        <p>
          Anything crossing a network can be intercepted, so confidentiality
          comes from <strong>encryption</strong> rather than from the wire.
        </p>
        <p>
          <strong>Symmetric</strong> encryption uses one key for both encrypting
          and decrypting. It is fast, which makes it right for bulk data, but
          both parties must already share the key — and getting it to them
          safely is the hard part.
        </p>
        <p>
          <strong>Asymmetric</strong> encryption uses a public key to encrypt
          and a private key to decrypt. The public key can be published freely,
          which solves the distribution problem, but it is much slower.
        </p>
        <p>
          HTTPS uses both: asymmetric encryption to agree a shared secret
          safely, then symmetric encryption with that secret for the rest of the
          conversation. Fast where it needs to be, secure where it matters.
        </p>
      </div>

      <p className="annotation">
        <b>Exam note.</b> &ldquo;Compare&rdquo; means both sides against the
        same criteria — not two separate descriptions. Pick three or four
        factors from the list above, and say how each medium does on each of
        them. Structure earns the marks here.
      </p>
    </>
  );
}
