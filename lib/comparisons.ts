// Pairs students confuse. Almost nobody misunderstands a compiler on its own;
// they misunderstand it next to an interpreter. Each row is one axis on which
// the two genuinely differ, so the table reads as a contrast rather than two
// descriptions side by side.

export type Comparison = {
  id: string;
  left: string;
  right: string;
  unit: string;
  /** Where a student normally meets this pair. */
  page?: string;
  /** The confusion this pair actually causes, in one sentence. */
  confusion: string;
  rows: { axis: string; left: string; right: string }[];
  /** The thing that decides which one an exam answer should name. */
  tell: string;
};

export const COMPARISONS: Comparison[] = [
  {
    id: "compiler-interpreter",
    left: "Compiler",
    right: "Interpreter",
    unit: "A1",
    confusion:
      "Both turn source code into something that runs, so students reach for whichever word they remember rather than the one the question needs.",
    rows: [
      {
        axis: "When translation happens",
        left: "Once, before the program is ever run",
        right: "Every time, as each statement is reached",
      },
      {
        axis: "What you are left with",
        left: "A separate executable file of machine code",
        right: "Nothing — the source is needed again next time",
      },
      {
        axis: "Speed of the running program",
        left: "Fast: translation cost is already paid",
        right: "Slower: translating happens during execution",
      },
      {
        axis: "Speed of getting started",
        left: "Slow: the whole program compiles before anything runs",
        right: "Immediate: the first line runs at once",
      },
      {
        axis: "When errors surface",
        left: "All syntax errors reported before running",
        right: "One at a time, when that line is reached",
      },
      {
        axis: "Portability",
        left: "Executable is tied to one processor and OS",
        right: "Source runs anywhere the interpreter exists",
      },
      {
        axis: "Typical use",
        left: "Shipping finished software; C, Rust, Go",
        right: "Development and scripting; Python, JavaScript",
      },
    ],
    tell: "If the question mentions distributing a finished program or execution speed, it wants a compiler. If it mentions testing, debugging or running the same code on different machines, it wants an interpreter.",
  },
  {
    id: "ram-rom",
    left: "RAM",
    right: "ROM",
    unit: "A1",
    confusion:
      "Both are 'memory on the motherboard', and the names describe access rather than the property that actually matters.",
    rows: [
      { axis: "Can be written during use", left: "Yes, freely", right: "No, or only specially" },
      {
        axis: "Survives power off",
        left: "No — volatile",
        right: "Yes — non-volatile",
      },
      {
        axis: "What it holds",
        left: "The running program and its data",
        right: "The instructions needed to start the machine",
      },
      { axis: "Typical size", left: "Gigabytes", right: "Megabytes at most" },
      {
        axis: "Why it exists",
        left: "Working space the processor can reach quickly",
        right: "Something must be there before anything is loaded",
      },
    ],
    tell: "Ask what happens at power-off. If losing the contents would be a disaster, it is ROM.",
  },
  {
    id: "tcp-udp",
    left: "TCP",
    right: "UDP",
    unit: "A2",
    confusion:
      "Both carry data across a network, and 'reliable' sounds unambiguously better until you notice what reliability costs.",
    rows: [
      {
        axis: "Delivery guarantee",
        left: "Lost packets are detected and resent",
        right: "Lost packets are simply gone",
      },
      {
        axis: "Order",
        left: "Reassembled into the order sent",
        right: "Arrive in whatever order they arrive",
      },
      {
        axis: "Setup",
        left: "A handshake before any data moves",
        right: "None — the first packet is data",
      },
      { axis: "Overhead per packet", left: "20 bytes of header", right: "8 bytes of header" },
      {
        axis: "Behaviour under congestion",
        left: "Slows itself down deliberately",
        right: "Keeps sending at the same rate",
      },
      {
        axis: "Suits",
        left: "Web pages, email, file transfer",
        right: "Live video, voice calls, games",
      },
    ],
    tell: "Ask whether a late packet is still useful. In a phone call it is not — replaying a lost syllable a second later is worse than dropping it — so live media uses UDP.",
  },
  {
    id: "sram-dram",
    left: "SRAM",
    right: "DRAM",
    unit: "A1",
    confusion:
      "Both are volatile RAM, so the distinction feels like trivia until you have to explain why cache is small and expensive.",
    rows: [
      {
        axis: "How a bit is held",
        left: "A latch of about six transistors",
        right: "A charge on one tiny capacitor",
      },
      {
        axis: "Refresh",
        left: "None needed while powered",
        right: "Must be rewritten thousands of times a second",
      },
      { axis: "Speed", left: "About 1 ns", right: "About 50 ns" },
      { axis: "Cost per bit", left: "High", right: "Low" },
      { axis: "Density", left: "Low — few bits per mm²", right: "High" },
      { axis: "Used for", left: "CPU cache", right: "Main memory" },
    ],
    tell: "The whole memory hierarchy exists because of this pair: SRAM is fast and unaffordable in bulk, DRAM is affordable and slow, so machines use a little of the first in front of a lot of the second.",
  },
  {
    id: "star-mesh",
    left: "Star",
    right: "Mesh",
    unit: "A2",
    confusion:
      "Diagrams of both look like lines between circles, and the trade-off is about failure, not shape.",
    rows: [
      {
        axis: "Shape",
        left: "Every device connects to one central node",
        right: "Devices connect to many other devices",
      },
      {
        axis: "Cable or links needed",
        left: "One per device",
        right: "Up to $n(n-1)/2$ for full mesh",
      },
      {
        axis: "If one link fails",
        left: "That one device is cut off",
        right: "Traffic routes around it",
      },
      {
        axis: "If the centre fails",
        left: "The whole network stops",
        right: "There is no centre to fail",
      },
      { axis: "Cost", left: "Low", right: "High" },
      { axis: "Typical use", left: "Offices, homes, most LANs", right: "The internet's backbone" },
    ],
    tell: "Star has a single point of failure and mesh does not. Any question about resilience is really asking about that.",
  },
  {
    id: "circuit-packet",
    left: "Circuit switching",
    right: "Packet switching",
    unit: "A2",
    confusion:
      "Both move data from A to B, and the difference is about what is reserved rather than what is sent.",
    rows: [
      {
        axis: "What is set up first",
        left: "A dedicated path held for the whole call",
        right: "Nothing",
      },
      {
        axis: "If the path is idle",
        left: "Wasted — nobody else may use it",
        right: "Other traffic uses the capacity",
      },
      { axis: "Delay", left: "Constant once connected", right: "Varies packet to packet" },
      {
        axis: "If a link fails mid-transfer",
        left: "The connection drops",
        right: "Later packets take another route",
      },
      { axis: "Example", left: "The old telephone network", right: "The internet" },
    ],
    tell: "Circuit switching guarantees the capacity and wastes it; packet switching shares the capacity and guarantees nothing.",
  },
  {
    id: "primary-foreign",
    left: "Primary key",
    right: "Foreign key",
    unit: "A3",
    confusion:
      "Both are 'key' columns, and in a diagram the same value appears in both places.",
    rows: [
      {
        axis: "What it does",
        left: "Identifies each row of this table uniquely",
        right: "Points at a row in another table",
      },
      { axis: "Must be unique", left: "Yes", right: "No — many rows may point at the same one" },
      { axis: "May be empty", left: "No", right: "Sometimes, if the link is optional" },
      { axis: "How many per table", left: "Exactly one", right: "Any number" },
      {
        axis: "What it enforces",
        left: "Entity integrity — no duplicate or missing identity",
        right: "Referential integrity — no pointing at a row that is not there",
      },
    ],
    tell: "A primary key answers 'which row is this?'. A foreign key answers 'which row does this belong to?'.",
  },
  {
    id: "supervised-unsupervised",
    left: "Supervised learning",
    right: "Unsupervised learning",
    unit: "A4",
    confusion:
      "Both 'learn from data', and the distinction is about what came with the data, not about the algorithm.",
    rows: [
      {
        axis: "What the training data has",
        left: "Inputs paired with the correct answers",
        right: "Inputs only",
      },
      {
        axis: "What is being learned",
        left: "A mapping from input to a known output",
        right: "Structure that was not labelled in advance",
      },
      {
        axis: "How you know it worked",
        left: "Compare predictions against held-back labels",
        right: "Judgement — the groups have to be useful to someone",
      },
      {
        axis: "Typical tasks",
        left: "Classification, regression",
        right: "Clustering, dimensionality reduction",
      },
      {
        axis: "Cost of the data",
        left: "High — labelling is manual",
        right: "Low — unlabelled data is everywhere",
      },
    ],
    tell: "Ask whether the training data contained the answers. If it did, it is supervised, whatever the algorithm.",
  },
  {
    id: "stack-queue",
    left: "Stack",
    right: "Queue",
    unit: "B4",
    confusion:
      "Both are linear collections with push and pop style operations; only the end you remove from differs, and that changes everything they are used for.",
    rows: [
      { axis: "Order out", left: "Last in, first out", right: "First in, first out" },
      { axis: "Add at", left: "The top", right: "The back" },
      { axis: "Remove from", left: "The top", right: "The front" },
      {
        axis: "Models",
        left: "Undo, recursion, expression evaluation",
        right: "Print jobs, buffers, breadth-first search",
      },
      {
        axis: "Natural failure",
        left: "Overflow from unbounded recursion",
        right: "Starvation if the front never empties",
      },
    ],
    tell: "If the most recent thing must be handled first, it is a stack. If fairness matters, it is a queue.",
  },
  {
    id: "linear-binary",
    left: "Linear search",
    right: "Binary search",
    unit: "B4",
    confusion:
      "Binary search is faster, so students propose it everywhere — including on data where it cannot work.",
    rows: [
      { axis: "Data must be sorted", left: "No", right: "Yes" },
      { axis: "Comparisons, worst case", left: "$n$", right: "$\\log_2 n$" },
      { axis: "On a million items", left: "Up to 1,000,000", right: "About 20" },
      {
        axis: "Cost of preparing",
        left: "None",
        right: "Sorting first, at least $n\\log n$",
      },
      {
        axis: "Better when",
        left: "Searching once, or data changes constantly",
        right: "Searching a stable collection many times",
      },
    ],
    tell: "Binary search only wins if the data is already sorted, or will be searched enough times to repay the sort.",
  },
  {
    id: "bubble-merge",
    left: "Bubble sort",
    right: "Merge sort",
    unit: "B4",
    confusion:
      "Both sort, and the difference in complexity is invisible on the ten-item examples used to teach them.",
    rows: [
      { axis: "Strategy", left: "Repeatedly swap neighbours", right: "Split, sort halves, merge" },
      { axis: "Comparisons, worst case", left: "$n^2$", right: "$n\\log n$" },
      { axis: "Extra memory", left: "None", right: "Another array of size $n$" },
      { axis: "On 1,000 items", left: "About 1,000,000 steps", right: "About 10,000 steps" },
      {
        axis: "Worth knowing because",
        left: "It is the clearest example of a bad algorithm",
        right: "It is the clearest example of divide and conquer",
      },
    ],
    tell: "Bubble sort trades time for simplicity and memory; merge sort trades memory for time. Exam answers should say which resource is being spent.",
  },
];
