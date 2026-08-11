// Pairs students confuse. Almost nobody misunderstands a compiler on its own;
// they misunderstand it next to an interpreter. Each row is one axis on which
// the two genuinely differ, so the table reads as a contrast rather than two
// descriptions side by side.

export type Comparison = {
  id: string;
  left: string;
  right: string;
  unit: string;
  /** The syllabus code of the page that teaches this pair, linked from the tool. */
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
    page: "A1.4.1",
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
    page: "A1.1.4",
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
    page: "A2.1.1",
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
    page: "A1.1.4",
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
    page: "A2.2.1",
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
    page: "A2.3.1",
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
    page: "A3.1.1",
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
    page: "A4.1.2",
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
    page: "B4.1.2",
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
    page: "B4.1.6",
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
    page: "B4.1.6",
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
  {
    id: "abstraction-decomposition",
    left: "Abstraction",
    right: "Decomposition",
    unit: "B1",
    page: "B1.1.1",
    confusion:
      "Both are described as ways of coping with a big problem, so answers use whichever word comes first and lose the mark for the other.",
    rows: [
      { axis: "What it does", left: "Removes detail", right: "Divides into parts" },
      { axis: "The question it answers", left: "What can I ignore?", right: "What are the pieces?" },
      { axis: "Result", left: "A simpler view of one thing", right: "Several smaller things" },
      {
        axis: "Everyday example",
        left: "An underground map, with the geography deliberately wrong",
        right: "A recipe split into preparation, cooking and serving",
      },
      {
        axis: "In code",
        left: "A function name hiding its body",
        right: "A program split into functions and classes",
      },
    ],
    tell: "If the answer is about hiding or ignoring detail it is abstraction. If it is about breaking one thing into several, it is decomposition.",
  },
  {
    id: "static-dynamic-typing",
    left: "Static typing",
    right: "Dynamic typing",
    unit: "B2",
    page: "B2.1.1",
    confusion:
      "Students describe dynamic typing as having no types at all, which is wrong — the values still have types, only the names do not.",
    rows: [
      { axis: "Type belongs to", left: "The variable", right: "The value" },
      { axis: "Checked", left: "Before the program runs", right: "As each line executes" },
      { axis: "A mismatch is", left: "A compile error", right: "A run-time error, if reached" },
      { axis: "Speed", left: "Faster: the type is known when code is generated", right: "Slower: every operation checks first" },
      { axis: "Cost to the writer", left: "More to write, errors found early", right: "Quicker to write, errors found late" },
      { axis: "Typical of", left: "Java, C++, C#", right: "Python, JavaScript, Ruby" },
    ],
    tell: "Ask when the error appears. Before running means static; only when that line executes means dynamic.",
  },
  {
    id: "for-while",
    left: "for loop",
    right: "while loop",
    unit: "B2",
    page: "B2.1.2",
    confusion:
      "Both repeat, and either can be made to do the other's job, so students choose by habit rather than by what the question describes.",
    rows: [
      { axis: "Repetitions known in advance", left: "Yes", right: "No" },
      { axis: "Proper name", left: "Count-controlled", right: "Condition-controlled" },
      { axis: "Controlled by", left: "A range or a collection", right: "A condition tested each time" },
      {
        axis: "Typical use",
        left: "Processing every item of a list",
        right: "Reading until a sentinel, or retrying until valid input",
      },
      { axis: "Characteristic failure", left: "Off-by-one at the bounds", right: "An infinite loop" },
    ],
    tell: "Can you state the number of repetitions before the loop starts? If yes it is count-controlled, and the answer should say so.",
  },
  {
    id: "parameter-argument",
    left: "Parameter",
    right: "Argument",
    unit: "B2",
    page: "B2.1.3",
    confusion:
      "The words are used interchangeably in ordinary speech, but a question asking you to distinguish them expects the exact pairing.",
    rows: [
      { axis: "Where it appears", left: "In the function definition", right: "At the call" },
      { axis: "What it is", left: "A name", right: "A value" },
      { axis: "Exists when", left: "The function runs", right: "Before the call is made" },
      { axis: "In average(numbers) / average(marks)", left: "numbers", right: "marks" },
      { axis: "How many", left: "Fixed by the definition", right: "Supplied afresh at every call" },
    ],
    tell: "Definition means parameter, call means argument. The parameter is the box; the argument is what you put in it.",
  },
  {
    id: "local-global",
    left: "Local variable",
    right: "Global variable",
    unit: "B2",
    page: "B2.1.3",
    confusion:
      "Globals look convenient and work fine in a short program, so the reason they are discouraged never becomes visible until a program is large.",
    rows: [
      { axis: "Visible from", left: "Inside one function", right: "Anywhere in the program" },
      { axis: "Lifetime", left: "While the function runs", right: "The whole run" },
      { axis: "Who can change it", left: "The ten lines around it", right: "Any code, anywhere" },
      {
        axis: "When it holds a wrong value",
        left: "One function is the suspect",
        right: "The whole program is the suspect",
      },
      { axis: "Testing", left: "The function can be tested alone", right: "Needs the surrounding state set up" },
    ],
    tell: "The argument against globals is about the size of the search when something breaks, not about tidiness — say that and the marks follow.",
  },
  {
    id: "list-dictionary",
    left: "List",
    right: "Dictionary",
    unit: "B2",
    page: "B2.1.3",
    confusion:
      "Both hold many values, so students pick a list by default and then write a loop to search it when a lookup would have done.",
    rows: [
      { axis: "Reached by", left: "Position", right: "Key" },
      { axis: "Duplicates", left: "Allowed", right: "Keys must be unique" },
      { axis: "Order", left: "Meaningful", right: "Not used for access" },
      { axis: "Cost of finding a value", left: "$O(n)$ — scan it", right: "$O(1)$ — compute the slot" },
      {
        axis: "Right when",
        left: "The data has an order, or is processed in sequence",
        right: "Each item has a natural identifier",
      },
    ],
    tell: "If the program keeps searching a list for a matching field, that field wanted to be a dictionary key.",
  },
  {
    id: "class-object",
    left: "Class",
    right: "Object",
    unit: "B3",
    page: "B3.1.1",
    confusion:
      "The two words are used loosely in conversation, and a question asking for the relationship wants the blueprint-and-instance distinction stated exactly.",
    rows: [
      { axis: "What it is", left: "A description", right: "A thing" },
      { axis: "Exists", left: "In the program text", right: "In memory, at run time" },
      { axis: "How many", left: "One", right: "As many as are created" },
      { axis: "Holds", left: "Attribute names and method code", right: "Its own attribute values" },
      {
        axis: "Analogy",
        left: "The architectural plan",
        right: "Each house built from it",
      },
      { axis: "Created by", left: "Writing it", right: "Instantiation — calling the constructor" },
    ],
    tell: "Methods are stored once with the class; values are stored per object. That single sentence answers most questions on this pair.",
  },
  {
    id: "inheritance-composition",
    left: "Inheritance",
    right: "Composition",
    unit: "B3",
    page: "B3.1.3",
    confusion:
      "Both reuse another class's code, so inheritance gets used for convenience where the is-a relationship does not actually hold.",
    rows: [
      { axis: "Relationship", left: "is-a", right: "has-a" },
      { axis: "What you get", left: "The whole parent, wanted or not", right: "Only what you choose to use" },
      { axis: "Fixed", left: "When the class is written", right: "Can be swapped at run time" },
      { axis: "Coupling", left: "Tight — to the parent's internals", right: "Loose — to the part's interface" },
      {
        axis: "Example",
        left: "A Dog is an Animal",
        right: "A Car has an Engine",
      },
      { axis: "Fails when", left: "The subclass cannot honour the parent's promises", right: "Rarely — but it forwards more calls by hand" },
    ],
    tell: "Say the sentence out loud. If “is a” is false, the answer is composition, however much code inheritance would have saved.",
  },
  {
    id: "overriding-polymorphism",
    left: "Overriding",
    right: "Polymorphism",
    unit: "B3",
    page: "B3.1.3",
    confusion:
      "They always appear together, so answers use one word for both — but one is the mechanism and the other is what it buys you.",
    rows: [
      { axis: "What it is", left: "A subclass replacing an inherited method", right: "One call producing different behaviour per object" },
      { axis: "Where you see it", left: "In the class definition", right: "At the call site" },
      { axis: "Concerns", left: "One class and its parent", right: "A collection of mixed types" },
      {
        axis: "The benefit",
        left: "Specialising behaviour without rewriting the rest",
        right: "Code that needs no branch listing every type",
      },
      { axis: "Depends on", left: "Nothing else", right: "Overriding having happened" },
    ],
    tell: "Overriding is what the subclass does. Polymorphism is what the caller gets. A question about removing if statements is about polymorphism.",
  },
  {
    id: "adt-structure",
    left: "Abstract data type",
    right: "Data structure",
    unit: "B4",
    page: "B4.1.1",
    confusion:
      "Both name a way of holding data, so answers describe an array when the question asked about a stack, or the reverse.",
    rows: [
      { axis: "Describes", left: "What it does", right: "How it is stored" },
      { axis: "Says nothing about", left: "Memory or implementation", right: "The problem being solved" },
      { axis: "Defined by", left: "Its operations", right: "Its layout in memory" },
      { axis: "Examples", left: "Stack, queue, list, tree, set", right: "Array, linked nodes, hash table, heap" },
      {
        axis: "Can be changed",
        left: "Not without changing every caller",
        right: "Freely, if the operations still behave",
      },
    ],
    tell: "If the answer would still be true on a different machine in a different language, you are describing the ADT.",
  },
  {
    id: "array-linked",
    left: "Array",
    right: "Linked list",
    unit: "B4",
    page: "B4.1.1",
    confusion:
      "Each is good at exactly what the other is bad at, so a blanket claim that one is faster is wrong half the time.",
    rows: [
      { axis: "Size", left: "Fixed when created", right: "Grows and shrinks" },
      { axis: "Memory layout", left: "One consecutive block", right: "Scattered, joined by pointers" },
      { axis: "Read element $i$", left: "$O(1)$ — one calculation", right: "$O(n)$ — walk from the head" },
      { axis: "Insert at the front", left: "$O(n)$ — shift everything", right: "$O(1)$ — two pointer writes" },
      { axis: "Memory per element", left: "Just the data", right: "The data plus a pointer" },
      { axis: "Binary search possible", left: "Yes, if sorted", right: "No — the middle cannot be reached" },
    ],
    tell: "Name the operation the program does most. Indexing favours the array; insertion and deletion favour the linked list.",
  },
  {
    id: "recursion-iteration",
    left: "Recursion",
    right: "Iteration",
    unit: "B4",
    page: "B4.1.5",
    confusion:
      "Anything one can do the other can, so the difference has to be argued on memory and clarity rather than on capability.",
    rows: [
      { axis: "Repeats by", left: "Calling itself", right: "Looping" },
      { axis: "Memory", left: "One stack frame per level", right: "One frame, reused" },
      { axis: "Stops at", left: "The base case", right: "The loop condition failing" },
      { axis: "Depth limit", left: "Yes — the call stack", right: "None" },
      { axis: "Fails with", left: "Stack overflow", right: "An infinite loop" },
      {
        axis: "Clearer for",
        left: "Trees, nested data, divide and conquer",
        right: "Plain repetition over a sequence",
      },
    ],
    tell: "Recursion wins when the data is self-similar — a subtree is a tree. Otherwise a loop is cheaper and clearer, and saying so is the mark.",
  },
];
