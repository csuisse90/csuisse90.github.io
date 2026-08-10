import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Practice from "@/components/Practice";
import { SpecList } from "@/components/Spec";
import Topology from "@/components/Topology";
import { ClientServerVsP2p, Segmentation } from "@/components/figures/dataNet";

export const metadata: Metadata = { title: "Network architecture" };

const TOPOLOGIES = [
  {
    kind: "star" as const,
    name: "Star",
    body: "Every device has its own cable to a central switch.",
    pro: "Fast, because each link is private. One cable failing affects only one device, and adding a device disturbs nobody.",
    con: "The central switch is a single point of failure — lose it and the whole network goes. Uses the most cable.",
  },
  {
    kind: "bus" as const,
    name: "Bus",
    body: "All devices share one backbone cable.",
    pro: "Cheapest and simplest, using the least cable.",
    con: "Every device shares the bandwidth, so it slows badly as devices are added, collisions are common, and one break in the backbone kills the whole network. Largely obsolete.",
  },
  {
    kind: "ring" as const,
    name: "Ring",
    body: "Each device connects to two neighbours, forming a loop.",
    pro: "Predictable performance, with no collisions when a token controls who may transmit.",
    con: "One broken link can sever the ring unless it is dual-ring, and data may pass through many devices to arrive.",
  },
  {
    kind: "mesh" as const,
    name: "Mesh",
    body: "Devices connect to many others, giving multiple routes.",
    pro: "Extremely reliable — traffic reroutes around a failure. No single point of failure. This is how the internet's backbone is built.",
    con: "Enormously expensive in cabling and ports, and complex to configure. A full mesh of n devices needs n(n−1)/2 links.",
  },
];

export default function NetworkArchitecturePage() {
  return (
    <>
      <PageHead
        code="A2.2 · Network architecture"
        title="Network architecture"
        lede="How the machines are arranged, who holds the resources, and why big networks are deliberately cut into smaller ones."
      />

      <h2 className="display">Topologies</h2>
      <div className="prose">
        <p>
          A topology is the shape of the connections. The trade is nearly always
          the same one: cost and cabling against resilience and speed.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(17rem, 1fr))",
          gap: "1.25rem",
          margin: "1.75rem 0",
        }}
      >
        {TOPOLOGIES.map((t) => (
          <div key={t.name} className="panel" style={{ margin: 0 }}>
            <div className="panelHead">
              <span>{t.name}</span>
            </div>
            <div className="panelBody" style={{ padding: "0.5rem" }}>
              <Topology kind={t.kind} />
            </div>
            <div className="caption">
              <p style={{ margin: "0 0 0.5rem" }}>{t.body}</p>
              <p style={{ margin: "0 0 0.4rem" }}>
                <strong style={{ color: "var(--teal)" }}>Strength.</strong>{" "}
                {t.pro}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: "var(--alarm)" }}>Weakness.</strong>{" "}
                {t.con}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="prose">
        <p>
          A <strong>hybrid</strong> topology combines them, and is what real
          organisations run: a mesh or ring backbone between buildings, with a
          star inside each one. Take the strengths where they matter and accept
          the cost only where it buys something.
        </p>
      </div>

      <h2 className="display">Servers</h2>
      <div className="prose">
        <p>
          A server is hardware or software that hosts, delivers and manages a
          resource for other machines. The point is{" "}
          <strong>centralisation</strong>: one copy to back up, one place to
          secure, one thing to update.
        </p>
      </div>

      <SpecList
        title="Types of server"
        meta="A2.2"
        termWidth="8rem"
        rows={[
          { term: "Web", body: "Stores web pages and sends them in response to HTTP and HTTPS requests." },
          { term: "File", body: "Central storage for shared documents, with permissions deciding who may read or change each one." },
          { term: "Mail", body: "Sends, receives and stores email for the organisation." },
          { term: "DNS", body: "Resolves domain names into IP addresses." },
          { term: "Print", body: "Manages a queue of print jobs and shares printers between many users." },
          { term: "Database", body: "Stores structured data and answers queries from applications, keeping one authoritative copy." },
          { term: "Proxy", body: "Sits between clients and the internet, forwarding requests. Used for caching, filtering and hiding the internal network." },
        ]}
      />

      <h2 className="display">Client–server against peer-to-peer</h2>
      <ClientServerVsP2p />

      <SpecList
        title="Networking models"
        termWidth="10rem"
        rows={[
          {
            term: "Client–server",
            body: (
              <>
                Centralised. Dedicated servers hold the resources and clients
                request them. <strong>Strengths:</strong> central security and
                backup, easy to administer, scales predictably.{" "}
                <strong>Weaknesses:</strong> servers are expensive, need expert
                administration, and are a single point of failure — if the
                server is down, nobody works.
              </>
            ),
          },
          {
            term: "Peer-to-peer",
            body: (
              <>
                Decentralised. Every peer acts as both client and server, sharing
                its own resources. <strong>Strengths:</strong> cheap, no
                dedicated hardware, no single point of failure, and it gets more
                capable as more peers join.{" "}
                <strong>Weaknesses:</strong> security and backup are each
                machine&apos;s own problem, files are scattered, and performance
                depends on which peers happen to be switched on.
              </>
            ),
          },
        ]}
      />

      <div className="callout">
        <div className="calloutHead">Which model does a scenario want?</div>
        <p style={{ margin: 0 }}>
          Central control, shared data, and someone accountable for security
          points to <strong>client–server</strong> — a school or a business. A
          handful of machines, no budget, and no administrator points to{" "}
          <strong>peer-to-peer</strong> — a small home office, or file-sharing
          and blockchain systems at large scale.
        </p>
      </div>

      <h2 className="display">Network segmentation</h2>
      <div className="prose">
        <p>
          Segmentation divides one network into smaller ones — subnets, or VLANs
          — so that traffic is contained. Traffic crossing between segments must
          pass through a router or firewall, which is precisely the point:
          it creates a place to inspect and control it.
        </p>
        <ul>
          <li>
            <strong>Security.</strong> A compromised machine can only reach its
            own segment, so an attack is contained rather than spreading across
            the organisation. Sensitive systems can be isolated from general
            traffic.
          </li>
          <li>
            <strong>Performance.</strong> Broadcast traffic stays inside its
            segment instead of reaching every device, so there is less
            congestion.
          </li>
          <li>
            <strong>Management.</strong> Devices can be grouped by role rather
            than by physical location — all the finance machines on one VLAN
            even if they sit on three different floors.
          </li>
        </ul>
        <p>
          A school is the standard example: students, staff and administration
          on separate VLANs, so that a student device cannot reach the system
          holding examination records, whichever socket it is plugged into.
        </p>
      </div>

      <Segmentation />

      <p className="annotation">
        <b>Exam note.</b> Topology questions nearly always ask you to justify a
        choice for a described organisation. Name the topology, give one
        strength and one weakness, and tie both to the specific scenario —
        budget, number of devices, how badly downtime would hurt. A generic
        list of properties without that link rarely earns full marks.
      </p>
      <Practice
        items={[
          {
            marks: 6,
            q: <p>A school is cabling a new building with forty machines and cannot tolerate the whole network failing. Recommend a topology and justify it, including one drawback.</p>,
            a: (
              <p>A star topology: each machine has its own cable to a central switch. Performance stays high because links are not shared, one failed cable affects only one machine, and adding a machine disturbs nobody. The drawback is that the central switch is a single point of failure and the topology uses the most cable of the practical options. A hybrid — star within each floor, a resilient backbone between floors — mitigates the switch risk.</p>
            ),
          },
          {
            marks: 4,
            q: <p>Compare client–server and peer-to-peer models for a business with sensitive records.</p>,
            a: (
              <p>Client–server suits it. Resources are centralised, so security, permissions and backup are managed in one place and can be audited. Peer-to-peer scatters files across machines, leaving security and backup to each user, which is unacceptable for sensitive records. The trade is cost: servers are expensive, need administration, and are a single point of failure.</p>
            ),
          },
          {
            marks: 4,
            q: <p>Explain two benefits of segmenting a network into VLANs.</p>,
            a: (
              <p><strong>Security.</strong> Traffic between segments must pass a router or firewall, so it can be inspected and refused. A compromised machine can only reach its own segment, containing an attack rather than letting it spread. <strong>Performance.</strong> Broadcast traffic stays within its segment instead of reaching every device, reducing congestion.</p>
            ),
          },
        ]}
      />
    </>
  );
}
