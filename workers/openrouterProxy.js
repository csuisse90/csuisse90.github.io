// Cloudflare Worker that fronts OpenRouter so the API key never reaches the
// browser. Without this the site can still work, but only for a reader who
// pastes in their own key.
//
//   npx wrangler deploy workers/openrouterProxy.js
//   npx wrangler secret put OPENROUTER_API_KEY
//
// Then rebuild the site with the Worker URL baked in:
//   NEXT_PUBLIC_AI_PROXY=https://<worker>.workers.dev bunx next build

const ALLOWED_ORIGINS = [
  "https://csuisse90.github.io",
  "http://localhost:3000",
  "http://localhost:4321",
];

// Only these may be requested, so a stolen endpoint cannot run up a bill on an
// expensive model. All are free tier.
const ALLOWED_MODELS = new Set([
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-20b:free",
  "inclusionai/ling-3.0-tiny:free",
]);

const MAX_CHARS = 6000;
const MAX_TOKENS = 700;

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const headers = cors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }
    if (!env.OPENROUTER_API_KEY) {
      return Response.json({ error: "Proxy has no key configured." }, { status: 500, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Malformed request." }, { status: 400, headers });
    }

    const model = ALLOWED_MODELS.has(body?.model) ? body.model : "google/gemma-4-31b-it:free";
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-6) : [];
    const total = messages.reduce((n, m) => n + String(m?.content ?? "").length, 0);
    if (!messages.length || total > MAX_CHARS) {
      return Response.json({ error: "Message too long." }, { status: 400, headers });
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": ALLOWED_ORIGINS[0],
        "X-Title": "IB CS HL",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role === "system" || m.role === "assistant" ? m.role : "user",
          content: String(m.content ?? "").slice(0, MAX_CHARS),
        })),
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
      }),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
