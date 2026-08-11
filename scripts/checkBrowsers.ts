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
];

type Report = {
  engine: string;
  pageErrors: string[];
  consoleErrors: string[];
  termErrors: { command: string; text: string }[];
  otherPageErrors: { path: string; error: string }[];
};

const ENGINES: Record<string, () => Promise<Browser>> = {
  chromium: () => chromium.launch(),
  firefox: () => firefox.launch(),
  webkit: () => webkit.launch(),
};

async function checkTerminal(engine: string, browser: Browser): Promise<Report> {
  const report: Report = { engine, pageErrors: [], consoleErrors: [], termErrors: [], otherPageErrors: [] };
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

  return report;
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
