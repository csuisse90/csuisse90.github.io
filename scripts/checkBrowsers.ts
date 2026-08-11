// Cross-browser smoke test for the in-browser terminal (/python/), plus a
// couple of other pages. WebKit is the engine that matters here — it's what
// Safari uses, and a user reported the terminal failing "on other people's
// MacBooks", which almost certainly means Safari.
//
// Usage:
//   bun run build
//   bunx --bun serve -l 4321 out &
//   bun run browsers
//
// The engines come from playwright; install them once with
//   bunx playwright install webkit firefox chromium

import { chromium, firefox, webkit, type Browser, type ConsoleMessage } from "playwright";

const BASE = "http://localhost:4321";
const COMMANDS = [
  "ls",
  "ls -la",
  "cat readme.txt",
  "tree",
  "sort notes/loops.md",
  "xxd hello.py",
  "base64 hello.py",
  "grep -i loop notes/loops.md",
  "diag",
  "uname -a",
  "df",
  "ps",
  "cc hello.py",
  "run a.out",
  "smash",
  "smash --safe",
];

type Report = {
  engine: string;
  pageErrors: string[];
  consoleErrors: string[];
  termErrors: { command: string; text: string }[];
  otherPageErrors: { path: string; error: string }[];
  checks: { name: string; ok: boolean; detail: string }[];
};

const ENGINES: Record<string, () => Promise<Browser>> = {
  chromium: () => chromium.launch(),
  firefox: () => firefox.launch(),
  webkit: () => webkit.launch(),
};

async function checkTerminal(engine: string, browser: Browser): Promise<Report> {
  const report: Report = {
    engine,
    pageErrors: [],
    consoleErrors: [],
    termErrors: [],
    otherPageErrors: [],
    checks: [],
  };
  const page = await browser.newPage();

  page.on("pageerror", (err) => report.pageErrors.push(err.stack ?? String(err)));
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE}/python/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".termInput:not([disabled])", { timeout: 60_000 });

  for (const command of COMMANDS) {
    const before = await page.locator(".termLine").count();
    await page.fill(".termInput", command);
    await page.keyboard.press("Enter");
    // The prompt disables while a command runs (busy state), so wait for it
    // to re-enable rather than for a fixed line count.
    await page.waitForSelector(".termInput:not([disabled])", { timeout: 60_000 });
    await page.waitForFunction(
      (n) => document.querySelectorAll(".termLine").length > n,
      before,
      { timeout: 60_000 },
    );

    // `.termLine` accumulates for the whole session, so only the lines this
    // command appended are its output — re-scanning the full list would
    // re-report every earlier error on every later command.
    const newErrors = await page.evaluate((n) => {
      const lines = Array.from(document.querySelectorAll(".termLine")).slice(n);
      return lines
        .filter((el) => el.getAttribute("data-kind") === "err")
        .map((el) => el.textContent ?? "");
    }, before);
    for (const text of newErrors) report.termErrors.push({ command, text });
  }

  await page.close();

  // Other pages: pageerrors only, per the task.
  for (const path of ["/", "/b/b4/trees/"]) {
    const p = await browser.newPage();
    const errors: string[] = [];
    p.on("pageerror", (err) => errors.push(err.stack ?? String(err)));
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    for (const error of errors) report.otherPageErrors.push({ path, error });
    await p.close();
  }

  await checkMachine(browser, report);
  await checkDiagrams(browser, report);

  return report;
}

/** The machine page, driven the way a reader would drive it: step, step back,
 *  run to the end, and look at each model. Every one of these goes through the
 *  worker, so a worker that failed to start shows up here rather than as a
 *  page that quietly never fills in. */
async function checkMachine(browser: Browser, report: Report) {
  const page = await browser.newPage();
  page.on("pageerror", (err) => report.otherPageErrors.push({ path: "/machine/", error: err.stack ?? String(err) }));

  const note = (name: string, ok: boolean, detail = "") => report.checks.push({ name, ok, detail });

  await page.goto(`${BASE}/machine/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".machineGrid", { timeout: 60_000 });
  // The first compile happens on load; wait for the assembly pane to fill.
  await page.waitForFunction(
    () => (document.querySelectorAll(".machineList > div").length ?? 0) > 5,
    undefined,
    { timeout: 60_000 },
  );

  const counter = () =>
    page.locator(".machineCount").first().textContent().then((t) => t ?? "");

  await page.getByRole("button", { name: "Step an instruction ▶" }).click();
  await page.waitForFunction(() => /\b1 instructions/.test(document.querySelector(".machineCount")?.textContent ?? ""), undefined, { timeout: 30_000 });
  note("machine: one step", true, await counter());

  await page.getByRole("button", { name: "◀ Back one" }).click();
  await page.waitForFunction(() => /\b0 instructions/.test(document.querySelector(".machineCount")?.textContent ?? ""), undefined, { timeout: 30_000 });
  note("machine: steps backwards", true, await counter());

  await page.getByRole("button", { name: "To the end" }).click();
  await page.waitForFunction(
    () => (document.querySelector(".machineOutput")?.textContent ?? "").trim() === "55",
    undefined,
    { timeout: 60_000 },
  );
  note("machine: runs in the worker and prints 55", true, await counter());

  for (const tab of ["profile", "cache", "pipeline"]) {
    await page.locator(`.machineTabs button:text-is("${tab}")`).click();
    // The pane that owns the tabs, not the last pane on the page — that one is
    // the output, and it is filled whatever tab is showing.
    const filled = await page
      .locator(".machinePane:has(.machineTabs)")
      .textContent()
      .then((t) => (t ?? "").length > 60);
    note(`machine: the ${tab} view has something in it`, filled);
  }

  await page.close();
}

/** A diagram question, answered wrongly on purpose: the empty canvas must be
 *  marked, and must not score full marks. */
async function checkDiagrams(browser: Browser, report: Report) {
  const page = await browser.newPage();
  page.on("pageerror", (err) => report.otherPageErrors.push({ path: "/diagrams/", error: err.stack ?? String(err) }));

  await page.goto(`${BASE}/diagrams/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".builderShell", { timeout: 60_000 });
  await page.getByRole("button", { name: "Mark it" }).click();
  await page.waitForSelector(".markSheet", { timeout: 30_000 });
  const score = (await page.locator(".markScore").textContent()) ?? "";
  report.checks.push({
    name: "diagrams: an unfinished answer is marked and does not get full marks",
    ok: /\/ 4$/.test(score.trim()) && !score.trim().startsWith("4"),
    detail: score.trim(),
  });
  await page.close();
}

async function main() {
  // Failing here with an explanation beats three engines each timing out.
  try {
    await fetch(`${BASE}/python/`);
  } catch {
    console.error(`nothing is serving ${BASE}. Run:  bunx --bun serve -l 4321 out`);
    process.exit(1);
  }

  const reports: Report[] = [];

  for (const [name, launch] of Object.entries(ENGINES)) {
    console.log(`\n=== ${name} ===`);
    const browser = await launch();
    try {
      reports.push(await checkTerminal(name, browser));
    } finally {
      await browser.close();
    }
  }

  let failed = false;
  for (const r of reports) {
    console.log(`\n----- ${r.engine} -----`);
    for (const c of r.checks) {
      console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
      if (!c.ok) failed = true;
    }
    if (!r.pageErrors.length && !r.consoleErrors.length && !r.termErrors.length && !r.otherPageErrors.length) {
      console.log("clean: no page errors, console errors, or terminal `err` lines");
      continue;
    }
    for (const e of r.pageErrors) {
      failed = true;
      console.log(`[pageerror] ${e}`);
    }
    for (const e of r.consoleErrors) {
      failed = true;
      console.log(`[console.error] ${e}`);
    }
    for (const e of r.termErrors) {
      failed = true;
      console.log(`[term err] after "${e.command}": ${e.text}`);
    }
    for (const e of r.otherPageErrors) {
      failed = true;
      console.log(`[pageerror @ ${e.path}] ${e.error}`);
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
