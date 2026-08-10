import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { SpecList } from "@/components/Spec";
import { M, MB } from "@/components/Math";
import PyRunner from "@/components/PyRunner";
import {
  CpuArchitecture,
  FetchDecodeExecute,
  MemoryHierarchy,
  Pipelining,
} from "@/components/figures/systems";

export const metadata: Metadata = { title: "Hardware and operation" };

export default function HardwarePage() {
  return (
    <>
      <PageHead
        code="A1.1 · Computer hardware and operation"
        title="Hardware and operation"
        lede="What the parts are, what each one does, and the cycle that repeats billions of times a second underneath everything else."
      />

      <h2 className="display">A1.1.1 Inside the CPU</h2>
      <div className="prose">
        <p>
          The central processing unit is the part that actually carries out
          instructions. It is not one thing but a small team of components, and
          the exam wants each named, described, and — the part people drop
          marks on — related to the others.
        </p>
      </div>

      <CpuArchitecture />

      <SpecList
        title="CPU components"
        meta="A1.1.1"
        rows={[
          {
            term: "ALU",
            body: (
              <>
                <strong>Arithmetic and logic unit.</strong> Does the actual work:
                addition, subtraction, comparisons, and the AND/OR/NOT
                operations built from the gates in A1.2. It is the adder circuit
                from these pages, scaled up.
              </>
            ),
          },
          {
            term: "CU",
            body: (
              <>
                <strong>Control unit.</strong> Decodes each instruction and sends
                the signals that make everything else act at the right moment.
                It does no arithmetic itself — it is the conductor, not a player.
              </>
            ),
          },
          {
            term: "PC",
            body: (
              <>
                <strong>Program counter.</strong> Holds the memory address of the{" "}
                <em>next</em> instruction. Normally it just increments; a jump or
                a branch works by writing a different address into it.
              </>
            ),
          },
          {
            term: "MAR",
            body: (
              <>
                <strong>Memory address register.</strong> Holds the address
                currently being read from or written to. It says <em>where</em>.
              </>
            ),
          },
          {
            term: "MDR",
            body: (
              <>
                <strong>Memory data register.</strong> Holds the data travelling
                to or from that address. It says <em>what</em>. MAR and MDR
                always work as a pair.
              </>
            ),
          },
          {
            term: "IR",
            body: (
              <>
                <strong>Instruction register.</strong> Holds the instruction
                currently being decoded and executed, so the PC is free to move
                on to the next one.
              </>
            ),
          },
          {
            term: "AC",
            body: (
              <>
                <strong>Accumulator.</strong> Holds the result the ALU has just
                produced, ready to be used again or written back to memory.
              </>
            ),
          },
        ]}
      />

      <div className="callout">
        <div className="calloutHead">How they interact</div>
        <p style={{ margin: 0 }}>
          The PC says where to look. That address goes into the MAR. Memory
          returns the instruction into the MDR, which is copied into the IR. The
          CU decodes the IR and directs the ALU, whose answer lands in the AC.
          Learn it as that sentence and you can reconstruct the whole cycle.
        </p>
      </div>

      <h2 className="display">A1.1.5 The fetch–decode–execute cycle</h2>
      <div className="prose">
        <p>
          This is the loop that never stops while the machine is on. Every
          program you have ever run is this cycle, repeated.
        </p>
        <ol>
          <li>
            <strong>Fetch.</strong> The address in the PC is copied to the MAR.
            The instruction at that address is fetched into the MDR, then copied
            into the IR. The PC is incremented so it points at the next
            instruction.
          </li>
          <li>
            <strong>Decode.</strong> The CU works out what the instruction in the
            IR means: which operation, and which data it needs.
          </li>
          <li>
            <strong>Execute.</strong> The operation is carried out — the ALU
            calculates, or data moves to or from memory. Any result is placed in
            the accumulator.
          </li>
        </ol>
        <p>
          Then it begins again. A processor described as 3 GHz is running this
          cycle around three billion times per second, which is only possible
          because the propagation delays inside every gate are measured in
          picoseconds.
        </p>
      </div>

      <FetchDecodeExecute />

      <PyRunner
        caption="A tiny model processor. It has a program counter, an accumulator and four instructions, and it runs the fetch–decode–execute cycle explicitly so you can watch the registers change."
        code={`# A very small CPU. Program: add 5 and 7, store the answer at address 20.
memory = {
    0: ("LDA", 10),   # load the value at address 10 into the accumulator
    1: ("ADD", 11),   # add the value at address 11
    2: ("STA", 20),   # store the accumulator at address 20
    3: ("HLT", 0),
    10: 5,
    11: 7,
}

pc = 0            # program counter
accumulator = 0
running = True

print(f"{'PC':>3} {'IR':<10} {'MAR':>4} {'MDR':>4} {'AC':>4}")
print("-" * 32)

while running:
    # FETCH
    mar = pc
    mdr = memory[mar]
    ir = mdr
    pc += 1

    # DECODE
    opcode, operand = ir

    # EXECUTE
    if opcode == "LDA":
        mar = operand
        mdr = memory[mar]
        accumulator = mdr
    elif opcode == "ADD":
        mar = operand
        mdr = memory[mar]
        accumulator += mdr
    elif opcode == "STA":
        mar = operand
        memory[mar] = accumulator
        mdr = accumulator
    elif opcode == "HLT":
        running = False

    print(f"{pc:>3} {opcode + ' ' + str(operand):<10} {mar:>4} {mdr:>4} {accumulator:>4}")

print()
print("address 20 now holds:", memory[20])`}
      />

      <h2 className="display">A1.1.2–A1.1.3 The GPU, and why it is different</h2>
      <div className="prose">
        <p>
          A graphics processing unit is built for a different shape of problem.
          A CPU has a few very fast, very general cores; a GPU has thousands of
          simpler ones. Neither is better — they are answers to different
          questions.
        </p>
      </div>

      <SpecList
        title="CPU compared with GPU"
        meta="A1.1.3"
        termWidth="9rem"
        rows={[
          {
            term: "Cores",
            body: "CPU: a few powerful, general-purpose cores. GPU: thousands of small, specialised ones.",
          },
          {
            term: "Best at",
            body: "CPU: sequential work with lots of branching and decisions. GPU: the same simple operation applied to enormous amounts of data at once.",
          },
          {
            term: "Latency vs throughput",
            body: "A CPU is optimised to finish one task as fast as possible. A GPU is optimised to finish a huge number of tasks per second, even if each individual one is slower.",
          },
          {
            term: "Typical use",
            body: "CPU: the operating system, program logic, file handling. GPU: rendering graphics, video encoding, and training machine-learning models — where the same calculation runs over millions of pixels or weights.",
          },
        ]}
      />

      <h2 className="display">A1.1.4 Primary memory</h2>
      <div className="prose">
        <p>
          Primary memory is what the CPU can reach directly. Secondary storage
          has to be loaded into it first.
        </p>
      </div>

      <SpecList
        title="Types of primary memory"
        meta="A1.1.4"
        termWidth="9rem"
        rows={[
          {
            term: "RAM",
            body: (
              <>
                <strong>Random access memory.</strong> Holds the programs and data
                in use right now. It is <strong>volatile</strong> — cut the power
                and the contents are gone. Read and written freely, and fast.
              </>
            ),
          },
          {
            term: "ROM",
            body: (
              <>
                <strong>Read-only memory.</strong> Non-volatile, and written at
                manufacture. Holds the firmware that starts the machine — the
                bootstrap that knows how to load the operating system.
              </>
            ),
          },
          {
            term: "Cache",
            body: "A small, extremely fast memory sitting between the CPU and RAM, holding recently and frequently used data. Organised in levels (L1 smallest and fastest, then L2, L3). It exists because RAM is far slower than the CPU, and a processor waiting for data is a processor doing nothing.",
          },
          {
            term: "Registers",
            body: "The fastest storage of all, inside the CPU itself, holding single values mid-calculation. The PC, MAR, MDR, IR and AC above are registers.",
          },
        ]}
      />

      <MemoryHierarchy />

      <div className="callout">
        <div className="calloutHead">The memory hierarchy</div>
        <p style={{ margin: 0 }}>
          Registers → cache → RAM → secondary storage. As you go down, capacity
          rises and cost per byte falls, but access gets slower — by roughly a
          factor of a hundred at each big step. Every design decision in memory
          is a trade between those two.
        </p>
      </div>

      <h2 className="display">A1.1.6 Multicore and pipelining</h2>
      <div className="prose">
        <p>
          Clock speeds stopped climbing in the mid-2000s because faster clocks
          meant more heat than could be removed. Two techniques recovered the
          lost progress.
        </p>
        <p>
          <strong>Pipelining</strong> overlaps the stages of the cycle. While
          instruction 1 is executing, instruction 2 is being decoded and
          instruction 3 fetched — like a production line where every station is
          busy. The time for one instruction does not improve, but the number
          completed per second does.
        </p>
        <p>
          <strong>Multicore</strong> puts several complete processors on one
          chip, so genuinely separate tasks run at the same time. The catch is
          that a program only benefits if its work can be split up. Some
          problems are inherently sequential, and adding cores does nothing for
          them.
        </p>
        <p>
          A pipeline can also stall. If an instruction is a branch, the
          processor does not yet know which instruction comes next, so the work
          already started may have to be thrown away.
        </p>
      </div>

      <Pipelining />

      <h2 className="display">A1.1.7 Secondary storage</h2>
      <SpecList
        title="Storage media"
        meta="A1.1.7"
        termWidth="9rem"
        rows={[
          {
            term: "Magnetic",
            body: "Hard disk drives. A spinning platter with magnetised regions, read by a moving head. Cheap per gigabyte and high capacity, but slow, and the moving parts eventually fail.",
          },
          {
            term: "Solid state",
            body: "SSDs and flash memory. No moving parts, so far faster and more robust, and silent. More expensive per gigabyte, and each cell tolerates a finite number of writes.",
          },
          {
            term: "Optical",
            body: "CD, DVD, Blu-ray. Pits burned into a surface and read by laser. Cheap and long-lived for archives, but slow and low-capacity by modern standards.",
          },
        ]}
      />

      <h2 className="display">A1.1.8 Data compression</h2>
      <div className="prose">
        <p>
          Compression makes files smaller so they take less space and less time
          to transmit. There are two kinds, and the distinction is examinable.
        </p>
        <p>
          <strong>Lossless</strong> compression throws nothing away — the
          original is recoverable bit for bit. It works by removing redundancy:
          run-length encoding replaces &ldquo;fifty identical pixels&rdquo; with
          a count, and dictionary methods replace repeated sequences with short
          references. Used for text, program files and ZIP archives, where a
          single altered bit would be a corruption.
        </p>
        <p>
          <strong>Lossy</strong> compression discards information that people
          are unlikely to notice — frequencies the ear barely registers, or
          colour detail the eye is insensitive to. It achieves far smaller files
          and is used for JPEG, MP3 and streamed video. The loss is permanent,
          and re-saving repeatedly degrades the file each time.
        </p>
        <p>
          The compression ratio compares the two sizes:
        </p>
        <MB>{"\\text{ratio} = \\frac{\\text{original size}}{\\text{compressed size}}"}</MB>
      </div>

      <h2 className="display">A1.1.9 Cloud computing</h2>
      <div className="prose">
        <p>
          Cloud computing means using someone else&apos;s computers, over a
          network, and paying for what you use. Instead of buying a server, you
          rent capacity that grows and shrinks with demand.
        </p>
        <ul>
          <li>
            <strong>Advantages.</strong> No large up-front cost; scales
            instantly with demand; accessible from anywhere; backups and
            maintenance handled by the provider.
          </li>
          <li>
            <strong>Disadvantages.</strong> Useless without a connection;
            ongoing cost never stops; your data sits on hardware you do not
            control, which raises real privacy and legal questions about where
            it is physically stored.
          </li>
        </ul>
        <p>
          You will meet three service models: <strong>SaaS</strong> (finished
          software, such as webmail), <strong>PaaS</strong> (a platform to
          deploy your own code onto) and <strong>IaaS</strong> (raw virtual
          machines and storage you configure yourself).
        </p>
      </div>

      <p className="annotation">
        <b>Exam note.</b> &ldquo;Describe&rdquo; wants what a component does.
        &ldquo;Explain&rdquo; wants why it matters or how it interacts with
        something else. For <M>{"A1.1"}</M> the interaction questions are the
        common ones: how MAR and MDR work together, why cache exists, why more
        cores does not always mean a faster program.
      </p>
    </>
  );
}
