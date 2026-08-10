import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Practice from "@/components/Practice";
import { SpecList } from "@/components/Spec";
import PyRunner from "@/components/PyRunner";
import {
  ControlSystem,
  InterruptTimeline,
  OsLayers,
  SchedulingGantt,
} from "@/components/figures/systems";

export const metadata: Metadata = { title: "Operating systems" };

export default function OperatingSystemsPage() {
  return (
    <>
      <PageHead
        code="A1.3 · Operating systems and control systems"
        title="Operating systems"
        lede="The program whose job is to manage all the other programs — and the smaller cousins of it that run lifts, greenhouses and traffic lights."
      />

      <h2 className="display">A1.3.1 What an operating system is for</h2>
      <div className="prose">
        <p>
          Without an operating system, every program would have to know how to
          drive every piece of hardware itself, and any two programs running at
          once would fight over the same memory. The OS sits between
          applications and hardware and prevents both problems.
        </p>
        <p>
          Two ideas capture most of it. It is a <strong>resource manager</strong>
          , handing out processor time, memory and devices fairly and safely.
          And it is an <strong>abstraction layer</strong>: a program says
          &ldquo;save this file&rdquo; without knowing or caring whether the
          storage is a spinning disk or flash memory.
        </p>
      </div>

      <OsLayers />

      <h2 className="display">A1.3.2 The functions of an operating system</h2>
      <SpecList
        title="Core functions"
        meta="A1.3.2"
        termWidth="10rem"
        rows={[
          {
            term: "Process management",
            body: "Creating, scheduling and ending processes, and deciding which one gets the processor next.",
          },
          {
            term: "Memory management",
            body: "Allocating memory to each process and keeping them out of each other's space. Virtual memory lets the OS use secondary storage as an overflow when RAM runs out — which works, but is far slower.",
          },
          {
            term: "File management",
            body: "Organising data into files and folders, tracking where each is physically stored, and enforcing permissions on who may read or change them.",
          },
          {
            term: "Device management",
            body: "Communicating with hardware through drivers, so applications need no knowledge of any particular model of printer or graphics card.",
          },
          {
            term: "Security",
            body: "User accounts, passwords, permissions, and keeping processes isolated so a crash or an attack in one cannot reach into another.",
          },
          {
            term: "User interface",
            body: "Providing the means to interact, whether a graphical desktop or a command line.",
          },
        ]}
      />

      <h2 className="display">A1.3.3 Scheduling</h2>
      <div className="prose">
        <p>
          A processor core can run one process at a time, but a machine has
          hundreds wanting to run. The <strong>scheduler</strong> decides the
          order. Different algorithms optimise for different things, and no
          single one is best at everything.
        </p>
      </div>

      <SpecList
        title="Scheduling algorithms"
        meta="A1.3.3"
        termWidth="12rem"
        rows={[
          {
            term: "First come first served",
            body: "Runs processes in arrival order, to completion. Simple and perfectly fair in one sense, but one long job blocks everything behind it — the supermarket queue behind a full trolley.",
          },
          {
            term: "Shortest job first",
            body: "Runs the shortest remaining job next. Gives the best average waiting time, but needs to know how long jobs will take, and long jobs may be starved indefinitely if short ones keep arriving.",
          },
          {
            term: "Round robin",
            body: "Each process gets a fixed time slice in turn; if unfinished it goes to the back of the queue. Nothing starves, and the machine feels responsive — this is what makes an interactive system usable. Switching between processes has a cost, so slices must not be too short.",
          },
          {
            term: "Priority scheduling",
            body: "Each process carries a priority and the highest goes first. Important work gets served promptly, but low-priority jobs can starve unless their priority rises the longer they wait.",
          },
          {
            term: "Multilevel queue",
            body: "Several queues with different priorities and their own rules, with processes moved between them based on behaviour. This is closest to what real desktop operating systems do.",
          },
        ]}
      />

      <SchedulingGantt />

      <PyRunner
        caption="The same three processes under both schedulers. Change the burst times or the time slice and see how the average waiting time moves."
        code={`processes = [("P1", 7), ("P2", 3), ("P3", 2)]
SLICE = 2

def fcfs(procs):
    time, waits, order = 0, {}, []
    for name, burst in procs:
        waits[name] = time
        order += [name] * burst
        time += burst
    return waits, order

def round_robin(procs, slice_len):
    remaining = {n: b for n, b in procs}
    queue = [n for n, _ in procs]
    time, finished, order = 0, {}, []
    while queue:
        name = queue.pop(0)
        run = min(slice_len, remaining[name])
        order += [name] * run
        time += run
        remaining[name] -= run
        if remaining[name]:
            queue.append(name)
        else:
            finished[name] = time
    waits = {n: finished[n] - b for n, b in procs}
    return waits, order

for label, (waits, order) in [
        ("First come first served", fcfs(processes)),
        (f"Round robin (slice {SLICE})", round_robin(processes, SLICE))]:
    print(label)
    print("  timeline:", " ".join(order))
    for name in waits:
        print(f"    {name} waited {waits[name]}")
    print(f"  average wait: {sum(waits.values()) / len(waits):.2f}")
    print()`}
      />

      <h2 className="display">A1.3.4 Interrupts</h2>
      <div className="prose">
        <p>
          An <strong>interrupt</strong> is a signal telling the processor that
          something needs attention now. It is the alternative to{" "}
          <strong>polling</strong>, where the CPU repeatedly asks
          &ldquo;anything yet?&rdquo; and wastes almost every cycle hearing no.
        </p>
        <p>The handling sequence is examinable, so learn it in order:</p>
        <ol>
          <li>
            The device or program raises an interrupt request, and the CPU
            checks for one at the end of the current cycle.
          </li>
          <li>
            The CPU finishes the instruction it is on — it never stops
            mid-instruction.
          </li>
          <li>
            The current state, the contents of the registers, is saved to a
            stack so it can be resumed exactly.
          </li>
          <li>
            The address of the appropriate <strong>interrupt service routine</strong>{" "}
            is looked up in the interrupt vector table, and that routine runs.
          </li>
          <li>
            The saved state is restored from the stack and the interrupted
            program carries on, unaware anything happened.
          </li>
        </ol>
        <p>
          Interrupts carry priorities, so a disk failure is handled ahead of a
          keypress, and a high-priority interrupt can interrupt the handler of a
          lower-priority one.
        </p>
      </div>

      <InterruptTimeline />

      <h2 className="display">A1.3.5 Multitasking</h2>
      <div className="prose">
        <p>
          On a single core, nothing genuinely runs simultaneously. The OS
          switches between processes so quickly that it appears simultaneous —{" "}
          <strong>concurrency</strong> rather than true parallelism. On a
          multicore processor some of it really is parallel.
        </p>
        <p>
          Each switch is a <strong>context switch</strong>: save the state of one
          process, load the state of another. It is not free, and an OS that
          switched too eagerly would spend more time switching than working.
        </p>
        <p>
          Two flavours appear in the syllabus.{" "}
          <strong>Pre-emptive</strong> multitasking lets the OS take the
          processor away when a time slice expires — one badly behaved program
          cannot freeze the machine. <strong>Cooperative</strong> multitasking
          relies on each program voluntarily giving up control, so a single
          program that never yields hangs everything. Modern systems are
          pre-emptive for exactly that reason.
        </p>
      </div>

      <h2 className="display">A1.3.6–A1.3.7 Control systems</h2>
      <div className="prose">
        <p>
          A control system is a computer whose job is to monitor and adjust
          something in the physical world. The components are always the same
          four.
        </p>
      </div>

      <ControlSystem />

      <SpecList
        title="Components of a control system"
        meta="A1.3.6"
        termWidth="9rem"
        rows={[
          {
            term: "Sensor",
            body: "Measures a physical quantity — temperature, light, pressure, motion — and reports it. Usually the reading is analogue and must be converted to digital first.",
          },
          {
            term: "Microprocessor",
            body: "Compares the reading against the desired value and decides what to do. The rule is often as simple as 'if too cold, switch the heater on'.",
          },
          {
            term: "Actuator",
            body: "Carries the decision out in the physical world: a motor, a valve, a heating element, a relay.",
          },
          {
            term: "Feedback loop",
            body: "The result changes the environment, the sensor measures it again, and the cycle repeats. This is what makes it a control system rather than a one-off command.",
          },
        ]}
      />

      <div className="prose">
        <p>
          <strong>Applications.</strong> A central heating thermostat, an
          automatic greenhouse managing temperature and watering, traffic lights
          responding to sensors in the road, a lift deciding which floor to
          serve next, cruise control in a car, and an industrial robot on a
          production line are all the same four components with different
          sensors and actuators.
        </p>
        <p>
          Control systems are usually <strong>real-time</strong>: an answer that
          arrives late is as bad as a wrong one. Anti-lock brakes that decide
          correctly half a second afterwards have failed.
        </p>
      </div>

      <p className="annotation">
        <b>Exam note.</b> Control-system questions almost always ask you to
        identify the sensor, the actuator and the feedback loop in a described
        scenario. Name all four components explicitly, even when the question
        seems to be asking about only one — the marks are usually distributed
        across them.
      </p>
      <Practice
        items={[
          {
            marks: 6,
            q: <p>Three processes arrive together: P1 needs 8 units, P2 needs 2, P3 needs 4. Calculate the average waiting time under first come first served and under shortest job first, and comment.</p>,
            a: (
              <>
                <p><strong>FCFS</strong> runs P1, P2, P3. Waits: P1 = 0, P2 = 8, P3 = 10. Average = 6.</p>
                <p><strong>SJF</strong> runs P2, P3, P1. Waits: P2 = 0, P3 = 2, P1 = 6. Average = 2.67.</p>
                <p>Shortest job first is much better on average because short jobs stop queueing behind long ones. Its weakness is that a long job can be starved indefinitely if short ones keep arriving, and it needs to know burst times in advance.</p>
              </>
            ),
          },
          {
            marks: 5,
            q: <p>Describe the sequence of events when an interrupt is raised while a program is running.</p>,
            a: (
              <p>The device raises an interrupt request, which the CPU checks for at the end of the current cycle. The processor finishes the instruction it is executing. The current state — the register contents — is saved to a stack. The address of the appropriate interrupt service routine is looked up in the interrupt vector table and that routine runs. Finally the saved state is restored and the interrupted program continues, unaware anything happened.</p>
            ),
          },
          {
            marks: 4,
            q: <p>Explain the difference between pre-emptive and cooperative multitasking, and why modern systems use one over the other.</p>,
            a: (
              <p>Under pre-emptive multitasking the operating system can take the processor away when a time slice expires. Under cooperative multitasking each program must voluntarily give up control. Modern systems are pre-emptive because a single badly written or crashed program under cooperative multitasking never yields and freezes the whole machine.</p>
            ),
          },
          {
            marks: 5,
            q: <p>An automatic greenhouse keeps the temperature at 22 °C. Identify the components of the control system and explain the role of feedback.</p>,
            a: (
              <p>The sensor is a temperature probe; the processor compares the reading with 22 °C; the actuators are a heater and a vent motor. Feedback closes the loop: the heater changes the air temperature, the sensor measures the new value, and the processor decides again. Without feedback the system would act once and never correct itself, so it would overshoot or drift.</p>
            ),
          },
        ]}
      />
    </>
  );
}
