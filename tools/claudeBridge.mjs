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

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 60_000;
const MAX_PROMPT = 4000;

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

function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", prompt, "--model", MODEL, "--output-format", "text"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Claude took too long and was stopped."));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) =>
      reject(
        e.code === "ENOENT"
          ? new Error("The `claude` command was not found on your PATH.")
          : e,
      ),
    );
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `claude exited with code ${code}`));
    });
  });
}

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
console.log("Leave this running, then use the Ask Claude button on the site.");
