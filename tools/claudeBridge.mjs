#!/usr/bin/env bun
// Local bridge between the website and Claude Code on this machine.
//
//   bun run tools/claudeBridge.mjs
//
// The published site is static and has no server, so the "Ask Claude" panel
// calls this instead. It listens only on 127.0.0.1, so nothing outside this
// machine can reach it, and it shells out to the Claude Code CLI you already
// have installed. No API key is stored anywhere in the site.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 120_000;
const MAX_PROMPT = 4000;

// An empty working directory, so no project CLAUDE.md, .claude/settings or
// local hooks from whatever repository you happen to be in leak into answers.
const SANDBOX = join(homedir(), ".claude-bridge");

// Uses your normal signed-in session — the OAuth token in the system keychain.
// Claude Code's --bare flag would give a stricter session, but it never reads
// the keychain and demands an API key instead, so it is deliberately not used.
// MCP servers and project memory are switched off here instead.
function prepareSandbox() {
  mkdirSync(SANDBOX, { recursive: true });
  writeFileSync(join(SANDBOX, "CLAUDE.md"), "");
}

function claudeArgs(prompt) {
  return [
    "-p",
    prompt,
    "--model",
    MODEL,
    "--output-format",
    "json",
    // No MCP servers, and do not merge in any that are configured.
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
  ];
}

// Only the deployed site and a local dev server may call this.
const ALLOWED_ORIGINS = new Set([
  "https://csuisse90.github.io",
  "http://localhost:3000",
  "http://localhost:4321",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4321",
]);

function corsHeaders(origin) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://csuisse90.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    // Chrome's Private Network Access check for a public page calling loopback.
    "Access-Control-Allow-Private-Network": "true",
    Vary: "Origin",
  };
}

// Claude Code runs SessionEnd hooks after the answer has already been written,
// and a blocking hook (arca's indexer, for one) holds the process open for
// about a minute afterwards. Waiting for exit — or even for stdout to close —
// would make every reply feel a minute slow for no reason.
//
// So we ask for JSON output and resolve the instant the payload parses. That
// is a definite end-of-message signal rather than a guess about timing, and
// the child is then killed so the hook is not waited on.
function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      claudeArgs(prompt),
      {
        stdio: ["ignore", "pipe", "pipe"],
        // Running from an empty directory keeps project memory and project
        // hooks out of the session. The config directory is left alone, since
        // relocating it would break OAuth sign-in.
        cwd: SANDBOX,
      },
    );

    let out = "";
    let err = "";
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Let any post-answer hooks run briefly, then stop waiting on them.
      setTimeout(() => child.kill("SIGKILL"), 200).unref?.();
      fn(value);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new Error("Claude took too long and was stopped."));
    }, TIMEOUT_MS);

    // Returns the answer once the JSON payload is complete, else null.
    const tryParse = () => {
      const trimmed = out.trim();
      if (!trimmed.startsWith("{")) return null;
      try {
        const payload = JSON.parse(trimmed);
        if (payload.is_error) throw new Error(payload.result ?? "Claude reported an error.");
        return typeof payload.result === "string" ? payload.result.trim() : null;
      } catch (e) {
        // Incomplete JSON simply means more is still arriving.
        if (e instanceof SyntaxError) return null;
        throw e;
      }
    };

    child.stdout.on("data", (d) => {
      out += d;
      try {
        const answer = tryParse();
        if (answer) finish(resolve, answer);
      } catch (e) {
        finish(reject, e);
      }
    });
    child.stderr.on("data", (d) => (err += d));

    child.on("error", (e) =>
      finish(
        reject,
        e.code === "ENOENT"
          ? new Error("The `claude` command was not found on your PATH.")
          : e,
      ),
    );

    child.on("close", (code) => {
      let answer = null;
      try {
        answer = tryParse();
      } catch (e) {
        finish(reject, e);
        return;
      }
      if (answer) finish(resolve, answer);
      else finish(reject, new Error(err.trim() || `claude exited with code ${code}`));
    });
  });
}

prepareSandbox();

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (url.pathname === "/health") {
      return Response.json({ ok: true, model: MODEL }, { headers });
    }

    if (url.pathname === "/ask" && req.method === "POST") {
      try {
        const { prompt } = await req.json();
        if (typeof prompt !== "string" || !prompt.trim()) {
          return Response.json({ error: "Empty prompt." }, { status: 400, headers });
        }
        const text = await askClaude(prompt.slice(0, MAX_PROMPT));
        console.log(`· answered (${text.length} chars)`);
        return Response.json({ text }, { headers });
      } catch (e) {
        console.error("!", e.message);
        return Response.json({ error: e.message }, { status: 500, headers });
      }
    }

    return new Response("Not found", { status: 404, headers });
  },
});

console.log(`claude bridge listening on http://127.0.0.1:${PORT}`);
console.log(`model: ${MODEL}`);
console.log("auth: keychain · MCP off · project memory off");
console.log("Leave this running, then use the Ask Claude button on the site.");
