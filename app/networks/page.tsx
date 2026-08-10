import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { SpecList } from "@/components/Spec";
import { Encapsulation, OsiStack } from "@/components/figures/dataNet";

export const metadata: Metadata = { title: "Network fundamentals" };

const OSI = [
  ["7", "Application", "Where programs meet the network. HTTP, HTTPS, FTP, SMTP, DNS live here."],
  ["6", "Presentation", "Translation, encryption and compression — getting data into a form the application can read."],
  ["5", "Session", "Opening, maintaining and closing conversations between two machines."],
  ["4", "Transport", "End-to-end delivery, splitting data into segments. TCP and UDP live here."],
  ["3", "Network", "Routing between different networks, and logical addressing. IP and routers live here."],
  ["2", "Data link", "Delivery across a single physical link, using MAC addresses. Switches live here."],
  ["1", "Physical", "The actual signal: cables, voltages, radio waves, connectors."],
];

export default function NetworksPage() {
  return (
    <>
      <PageHead
        code="A2.1 · Network fundamentals"
        title="Network fundamentals"
        lede="What a network is made of, the layered model that keeps it comprehensible, and the protocols that let machines from different manufacturers agree."
      />

      <div className="prose">
        <p>
          A network is two or more devices connected so they can exchange data
          and share resources. The reason networking is difficult is not the
          wire — it is agreement. Millions of devices, built by companies that
          have never spoken, must interpret the same signals identically. That
          agreement is what protocols and standards are.
        </p>
      </div>

      <h2 className="display">Types of network</h2>
      <SpecList
        title="By scale and purpose"
        meta="A2.1"
        termWidth="6rem"
        rows={[
          { term: "LAN", body: "Local area network. One site — a house, a school, an office. Privately owned, fast, and cheap to run." },
          { term: "WAN", body: "Wide area network. Spans towns or countries, usually over infrastructure someone else owns and you rent. The internet is the largest WAN." },
          { term: "WLAN", body: "Wireless LAN. A LAN using radio rather than cable, which is what Wi-Fi provides." },
          { term: "PAN", body: "Personal area network. A few metres around one person — a phone talking to headphones or a watch over Bluetooth." },
          { term: "VLAN", body: "Virtual LAN. One physical network divided by configuration into separate logical networks, so devices are grouped by function rather than by where they are plugged in." },
          { term: "VPN", body: "Virtual private network. An encrypted tunnel across a public network, making a remote device behave as though it were on the private one." },
          { term: "SAN", body: "Storage area network. A dedicated high-speed network whose only job is connecting servers to storage." },
        ]}
      />

      <h2 className="display">Network components</h2>
      <SpecList
        title="The hardware"
        termWidth="7rem"
        rows={[
          { term: "Router", body: "Connects different networks and forwards packets between them using IP addresses, choosing a route. This is what joins your home network to the internet." },
          { term: "Switch", body: "Connects devices within one network and forwards frames using MAC addresses, sending each frame only to the port it is meant for." },
          { term: "Hub", body: "An obsolete switch. It repeats every incoming signal to every port, so all devices see all traffic — wasteful and insecure. Know it mainly as the contrast to a switch." },
          { term: "Bridge", body: "Joins two network segments so they behave as one." },
          { term: "Gateway", body: "Connects networks that use different protocols, translating between them." },
          { term: "NIC", body: "Network interface card. The hardware in each device that connects it to the network and carries its MAC address." },
          { term: "Modem", body: "Converts between digital data and whatever signal the carrier medium uses, such as a telephone or cable line." },
          { term: "WAP", body: "Wireless access point. Provides the radio link that lets wireless devices join a wired network." },
        ]}
      />

      <div className="callout">
        <div className="calloutHead">Switch or router?</div>
        <p style={{ margin: 0 }}>
          A <strong>switch</strong> moves traffic <em>within</em> one network
          using MAC addresses. A <strong>router</strong> moves traffic{" "}
          <em>between</em> networks using IP addresses. If the question mentions
          reaching the internet, the answer involves a router.
        </p>
      </div>

      <h2 className="display">Why standards exist</h2>
      <div className="prose">
        <p>
          A standard is a published agreement about how something must behave.
          They matter for three reasons the syllabus asks about:
        </p>
        <ul>
          <li>
            <strong>Interoperability.</strong> Equipment from different
            manufacturers works together, so buyers are not locked to one
            supplier.
          </li>
          <li>
            <strong>Reliability.</strong> Behaviour is predictable and tested,
            rather than depending on one vendor&apos;s interpretation.
          </li>
          <li>
            <strong>Security.</strong> Agreed encryption and authentication
            methods can be reviewed publicly, and weaknesses found and fixed by
            everyone at once.
          </li>
        </ul>
      </div>

      <h2 className="display">The OSI model</h2>
      <div className="prose">
        <p>
          Networking is layered so that each layer can be designed, and
          replaced, without disturbing the others. Switching from cable to Wi-Fi
          changes layer 1 and nothing above it. The OSI model has seven layers,
          numbered from the wire upwards.
        </p>
      </div>

      <OsiStack />

      <div className="panel">
        <div className="panelHead">
          <span>OSI seven-layer model</span>
          <span>layer 7 at the top</span>
        </div>
        <div className="panelBody">
          {OSI.map(([n, name, body]) => (
            <div
              key={n}
              style={{
                display: "grid",
                gridTemplateColumns: "2rem 8rem minmax(0,1fr)",
                gap: "1rem",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--hairline)",
                alignItems: "baseline",
                fontSize: "0.93rem",
              }}
            >
              <span className="mono" style={{ color: "var(--alarm)" }}>{n}</span>
              <span
                className="mono"
                style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {name}
              </span>
              <span style={{ color: "var(--ink-soft)" }}>{body}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="prose">
        <p>
          The mnemonic from the bottom up is{" "}
          <strong>P</strong>lease <strong>D</strong>o <strong>N</strong>ot{" "}
          <strong>T</strong>hrow <strong>S</strong>ausage{" "}
          <strong>P</strong>izza <strong>A</strong>way.
        </p>
        <p>
          The practical <strong>TCP/IP model</strong> collapses this into four
          layers — Application, Transport, Internet and Network Access — and is
          what the internet actually runs on. OSI is the teaching model; TCP/IP
          is the working one.
        </p>
        <p>
          Data moving down the stack is <strong>encapsulated</strong>: each
          layer wraps what it received in its own header. At the far end it is
          unwrapped layer by layer, and each layer only ever talks to its
          opposite number.
        </p>
      </div>

      <Encapsulation />

      <h2 className="display">Protocols</h2>
      <SpecList
        title="Protocols named in the syllabus"
        meta="A2.1"
        termWidth="6rem"
        rows={[
          { term: "TCP", body: "Transmission control protocol. Connection-oriented and reliable: it numbers segments, waits for acknowledgements, retransmits anything lost and reassembles in order. Used where correctness matters — web pages, email, file transfer." },
          { term: "UDP", body: "User datagram protocol. Connectionless and unreliable: it sends and does not check. Far less overhead and no waiting, so it suits live video, voice calls and gaming, where a late packet is worse than a missing one." },
          { term: "HTTP", body: "Hypertext transfer protocol. The request-and-response protocol of the web. Sent in plain text, so anyone in between can read it." },
          { term: "HTTPS", body: "HTTP secured with TLS. The content is encrypted, the server's identity is verified by a certificate, and tampering is detectable. The padlock in the browser." },
          { term: "DHCP", body: "Dynamic host configuration protocol. Automatically issues a device an IP address, subnet mask, gateway and DNS server when it joins, instead of someone configuring each one by hand." },
          { term: "DNS", body: "Domain name system. Translates a human name such as example.com into the IP address the network actually routes to. The internet's phone book." },
        ]}
      />

      <div className="callout">
        <div className="calloutHead">TCP or UDP — the deciding question</div>
        <p style={{ margin: 0 }}>
          Ask what is worse: <strong>losing</strong> some data, or{" "}
          <strong>waiting</strong> for it. A bank transfer must not lose a
          digit, so TCP. A video call must not freeze for a retransmission of a
          frame that is already in the past, so UDP.
        </p>
      </div>

      <h2 className="display">Addressing</h2>
      <div className="prose">
        <p>
          A <strong>MAC address</strong> is 48 bits, fixed in the hardware at
          manufacture, and identifies a device on its local link. An{" "}
          <strong>IP address</strong> is assigned by the network and identifies
          a device&apos;s location on the wider internet, so it changes when the
          device moves networks.
        </p>
        <p>
          IPv4 uses 32 bits — about 4.3 billion addresses, which ran out. IPv6
          uses 128 bits, which is enough for every grain of sand many times
          over. The <strong>subnet mask</strong> splits an IP address into the
          part identifying the network and the part identifying the host on it.
        </p>
      </div>

      <h2 className="display">VPNs</h2>
      <div className="prose">
        <p>
          A VPN builds an encrypted <strong>tunnel</strong> across a public
          network. Traffic is encrypted before it leaves, decrypted at the far
          end, and unreadable to anyone in between — including whoever runs the
          café Wi-Fi.
        </p>
        <p>
          <strong>Uses:</strong> letting employees reach an internal network
          from home securely; protecting traffic on untrusted public Wi-Fi;
          joining a company&apos;s separate offices into one logical network at
          far less cost than a leased line; and privacy, since the destination
          sees the VPN server&apos;s address rather than yours.
        </p>
        <p>
          <strong>Components:</strong> a VPN client on the device, a VPN server
          at the other end, a tunnelling protocol, authentication to prove who
          is connecting, and encryption to protect what is carried.
        </p>
      </div>

      <p className="annotation">
        <b>Exam note.</b> Layer questions are usually &ldquo;at which layer does
        X operate, and why&rdquo;. Anchor the four you will actually be asked:
        switches at layer 2, routers at layer 3, TCP and UDP at layer 4, HTTP
        and DNS at layer 7.
      </p>
    </>
  );
}
