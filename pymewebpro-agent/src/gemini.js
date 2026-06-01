// gemini.js · Google Gemini API wrapper for Valentina.
//
// Cost-optimization layer: Gemini 2.0 Flash handles "behind-the-scenes" work
// at ~30x cheaper input pricing than Claude Sonnet 4.6. Today the only
// behind-the-scenes step Valentina has is conversation history compression
// (long sales conversations with one prospect can pile up turns; compressing
// the oldest ones keeps token cost flat).
//
// Configure:
//   wrangler secret put GEMINI_API_KEY  --name pymewebpro-agent
//   (optional) GEMINI_MODEL = "gemini-2.0-flash"  in wrangler.toml [vars]
//
// Callers degrade gracefully when GEMINI_API_KEY is unset · they return null
// and the caller falls back to the previous Claude-only path. Deploying
// without a key is safe.
//
// Mirror of ~/code/catalina/src/gemini.js · keep the two in sync when adding
// new helpers. If divergence becomes an issue we can extract to a shared
// package.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Low-level call to the Gemini Generative Language API. Throws on error.
 */
export async function callGemini(env, {
  prompt,
  systemInstruction = null,
  model = null,
  maxOutputTokens = 512,
  temperature = 0.2,
}) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  const modelName = model || env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no text");
  }
  return text;
}

/**
 * Compress a chunk of older conversation turns into one summary paragraph.
 * Returns null on failure · caller should keep the raw history.
 *
 * For Valentina specifically, preserve: prospect's name, email, business
 * name, plan they chose (if any), Wompi link sent (if any), call booked
 * (if any), escalation (if any), and the substantive question(s) they
 * asked. Drop greetings and filler.
 */
export async function compressConversationHistory(env, { messages, maxOutputTokens = 400 }) {
  if (!env.GEMINI_API_KEY || !Array.isArray(messages) || messages.length < 4) return null;

  const flatten = (m) => {
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      return m.content.map(b => {
        if (b.type === "text") return b.text;
        if (b.type === "tool_use") return `[tool: ${b.name}(${JSON.stringify(b.input || {}).slice(0, 120)})]`;
        if (b.type === "tool_result") {
          const content = typeof b.content === "string" ? b.content : JSON.stringify(b.content);
          return `[tool_result: ${String(content).slice(0, 300)}]`;
        }
        return "";
      }).join(" ").trim();
    }
    return "";
  };

  const transcript = messages
    .map(m => `${m.role.toUpperCase()}: ${flatten(m).slice(0, 1000)}`)
    .join("\n\n");

  const prompt =
    `Compress this earlier portion of a sales conversation between Valentina (PymeWebPro AI agent) and a prospect into one tight summary the agent can use as context for the rest of the conversation. ` +
    `Preserve: the prospect's name, business name, email, phone, whether they want the optional monthly plan, Wompi link generated (if any), call booked (if any), escalation made (if any), and their actual question(s). ` +
    `Drop: greetings, filler, repeated explanations of the plans. ` +
    `Output: one prose paragraph (no bullets, no headers, no markdown), up to ~250 words, in the same language as the conversation.\n\n` +
    `--- EARLIER TURNS ---\n${transcript}\n--- END ---`;

  try {
    return await callGemini(env, {
      prompt,
      systemInstruction:
        "You compress sales conversation history for downstream AI memory. Preserve facts, drop filler. " +
        "Speak in third person about the conversation. " +
        "Do not add disclaimers or meta commentary.",
      maxOutputTokens,
      temperature: 0.1,
    });
  } catch (e) {
    console.error("[gemini] compressConversationHistory failed:", e.message);
    return null;
  }
}
