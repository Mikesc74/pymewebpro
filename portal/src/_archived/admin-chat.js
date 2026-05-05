// admin-chat.js — per-client AI assistant chat for the PymeWebPro admin SPA.
//
// Endpoint contract (mounted from mockups.js dispatcher):
//   POST   /api/admin/clients/:clientId/ai-chat   { message }    → run agentic loop
//   GET    /api/admin/clients/:clientId/ai-chat                  → load last 50 msgs
//   DELETE /api/admin/clients/:clientId/ai-chat                  → clear history
//
// Storage: D1 table `admin_chat_messages` (see migration in admin-chat.js header).
// Tools execute server-side against env.DB and patch submissions/clients.
// Every tool call writes one row to `audit_log` (event='admin_chat_tool', metadata JSON).
//
// Model: claude-opus-4-7 (Mike's preference — same model the mockup generator uses).

const CHAT_MODEL = "claude-opus-4-7";
const MAX_HISTORY_FOR_API = 10;     // most recent messages we hand back to Anthropic (was 20; lowered to fit Tier 1 ITPM)
const MAX_HISTORY_FOR_HYDRATE = 50; // most recent messages returned via GET
const MAX_LOOP_ITERATIONS = 6;       // safety cap on agentic tool loop
// Pexels API key — read from env.PEXELS_API_KEY (set via `wrangler secret put PEXELS_API_KEY`).

// As of the May 2026 manual-upload refactor, the only remaining mutating tool
// is set_admin_css (CSS overrides survive the new workflow because they're
// applied per-request to the served HTML) and push_to_client (workflow op,
// not a content edit). Everything else here is read-only.
const MUTATING_TOOLS = new Set([
  "set_admin_css",
  "push_to_client",
]);

// ─── Public dispatch ────────────────────────────────────────────────────────
export async function handleAdminChat(req, env, ctx, helpers) {
  const url = new URL(req.url);
  const m = req.method;
  const match = url.pathname.match(/^\/api\/admin\/clients\/([A-Za-z0-9-]+)\/ai-chat$/);
  if (!match) return null;
  const clientId = match[1];

  if (m === "GET") return getHistory(env, helpers, clientId);
  if (m === "DELETE") return clearHistory(env, helpers, clientId);
  if (m === "POST") return postMessage(env, helpers, clientId, req);
  return helpers.json({ error: "method not allowed" }, 405);
}

// ─── GET / DELETE ───────────────────────────────────────────────────────────
async function getHistory(env, helpers, clientId) {
  const row = await env.DB.prepare(
    "SELECT id FROM clients WHERE id = ?",
  ).bind(clientId).first();
  if (!row) return helpers.json({ error: "client not found" }, 404);
  const msgs = await env.DB.prepare(
    "SELECT id, role, content, tool_calls, tool_use_id, created_at FROM admin_chat_messages WHERE client_id = ? ORDER BY created_at DESC LIMIT ?",
  ).bind(clientId, MAX_HISTORY_FOR_HYDRATE).all();
  const list = (msgs.results || []).reverse();
  return helpers.json({ messages: list });
}

async function clearHistory(env, helpers, clientId) {
  await env.DB.prepare("DELETE FROM admin_chat_messages WHERE client_id = ?")
    .bind(clientId).run();
  return helpers.json({ ok: true });
}

// ─── POST — run the agentic loop ────────────────────────────────────────────
async function postMessage(env, helpers, clientId, req) {
  const body = await req.json().catch(() => ({}));
  const userMessage = String(body.message || "").trim();
  if (!userMessage) return helpers.json({ error: "empty message" }, 400);
  if (userMessage.length > 8000) return helpers.json({ error: "message too long" }, 400);

  const client = await env.DB.prepare(
    "SELECT id, business_name, email, plan, status, language, blueprint_key, admin_css FROM clients WHERE id = ?",
  ).bind(clientId).first();
  if (!client) return helpers.json({ error: "client not found" }, 404);

  if (!env.ANTHROPIC_API_KEY) {
    return helpers.json({ error: "anthropic_key_missing", msg: "ANTHROPIC_API_KEY not configured." }, 500);
  }

  // Persist user message immediately so it's visible even if the loop crashes.
  const now = Date.now();
  const userMsgId = helpers.uuid();
  await env.DB.prepare(
    "INSERT INTO admin_chat_messages (id, client_id, role, content, tool_calls, tool_use_id, created_at) VALUES (?, ?, 'user', ?, NULL, NULL, ?)",
  ).bind(userMsgId, clientId, userMessage, now).run();

  const newlyCreated = [];
  newlyCreated.push({ id: userMsgId, role: "user", content: userMessage, tool_calls: null, tool_use_id: null, created_at: now });

  try {
    // Build context for the system prompt
    const context = await loadClientContext(env, clientId, client);
    const systemPrompt = buildSystemPrompt(client, context);

    // Load the last 20 messages BEFORE this user msg, then add the user msg.
    const prior = await env.DB.prepare(
      "SELECT id, role, content, tool_calls, tool_use_id, created_at FROM admin_chat_messages WHERE client_id = ? AND id != ? ORDER BY created_at DESC LIMIT ?",
    ).bind(clientId, userMsgId, MAX_HISTORY_FOR_API - 1).all();
    const history = (prior.results || []).reverse();
    history.push({ id: userMsgId, role: "user", content: userMessage, tool_calls: null, tool_use_id: null, created_at: now });

    let apiMessages = historyToApiMessages(history);

    for (let iter = 0; iter < MAX_LOOP_ITERATIONS; iter++) {
      // Strip image content blocks from all but the LAST tool_result message —
      // images are token-heavy (~1500 each) and once Opus has reasoned about
      // them in one turn, the older ones don't add value to subsequent calls.
      // This keeps ITPM in check on multi-iteration agentic loops.
      const compactedMessages = compactImageHistory(apiMessages);
      const resp = await callAnthropic(env, systemPrompt, compactedMessages);
      if (resp.error) {
        const errId = helpers.uuid();
        const errTs = Date.now();
        const errText = "Anthropic error: " + resp.error;
        await env.DB.prepare(
          "INSERT INTO admin_chat_messages (id, client_id, role, content, tool_calls, tool_use_id, created_at) VALUES (?, ?, 'assistant', ?, NULL, NULL, ?)",
        ).bind(errId, clientId, errText, errTs).run();
        newlyCreated.push({ id: errId, role: "assistant", content: errText, tool_calls: null, tool_use_id: null, created_at: errTs });
        break;
      }

      // Extract text + tool_use blocks
      const textParts = [];
      const toolUses = [];
      for (const block of (resp.content || [])) {
        if (block.type === "text") textParts.push(block.text || "");
        else if (block.type === "tool_use") toolUses.push(block);
      }
      const assistantText = textParts.join("\n").trim();
      const toolCallsForRow = toolUses.length
        ? toolUses.map((t) => ({ id: t.id, name: t.name, input: t.input }))
        : null;

      // Persist assistant message (text + tool_use signals)
      const aId = helpers.uuid();
      const aTs = Date.now();
      await env.DB.prepare(
        "INSERT INTO admin_chat_messages (id, client_id, role, content, tool_calls, tool_use_id, created_at) VALUES (?, ?, 'assistant', ?, ?, NULL, ?)",
      ).bind(aId, clientId, assistantText, toolCallsForRow ? JSON.stringify(toolCallsForRow) : null, aTs).run();
      newlyCreated.push({
        id: aId, role: "assistant", content: assistantText,
        tool_calls: toolCallsForRow ? JSON.stringify(toolCallsForRow) : null,
        tool_use_id: null, created_at: aTs,
      });

      // Mirror assistant turn into apiMessages for next iteration
      apiMessages.push({ role: "assistant", content: resp.content });

      // No tool calls → conversation turn complete
      if (toolUses.length === 0 || resp.stop_reason !== "tool_use") break;

      // Execute every tool sequentially. Anthropic may batch multiple in one
      // turn, but we run them in order so later tools see the effects of earlier ones.
      const toolResultBlocks = [];
      for (const tu of toolUses) {
        const result = await runTool(env, helpers, clientId, tu.name, tu.input || {});

        // Vision-capable tools (e.g. screenshot_mockup) may return an image block
        // alongside the text content. We pass it through to Anthropic as a
        // multi-block tool_result so Opus can SEE the image — but persist only
        // the caption text in D1 to avoid storing massive base64 payloads.
        const hasImage = result.image_data && typeof result.image_data === "string";
        const resultText = typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content);

        // Persist tool result row (text only — images are too big for D1)
        const tId = helpers.uuid();
        const tTs = Date.now();
        const persistedText = hasImage
          ? `[image returned: ${result.image_caption || "screenshot"}]\n${resultText}`
          : resultText;
        await insertToolMsg(env, tId, clientId, persistedText, tu.id, tTs);

        newlyCreated.push({
          id: tId, role: "tool", content: persistedText,
          tool_calls: null, tool_use_id: tu.id, created_at: tTs,
        });

        // Audit log row per tool call
        try {
          await env.DB.prepare(
            "INSERT INTO audit_log (client_id, event, metadata, created_at) VALUES (?, 'admin_chat_tool', ?, ?)",
          ).bind(clientId, JSON.stringify({
            tool: tu.name,
            input: tu.input || {},
            ok: !result.is_error,
            tool_use_id: tu.id,
            had_image: !!hasImage,
          }), Date.now()).run();
        } catch (_) { /* audit_log is best-effort */ }

        // Build the tool_result content. If we have an image, format as
        // multi-block content [{image}, {text}] for Anthropic vision support.
        const blockContent = hasImage
          ? [
              { type: "image", source: { type: "base64", media_type: result.image_media_type || "image/png", data: result.image_data } },
              { type: "text", text: resultText },
            ]
          : resultText;

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: blockContent,
          ...(result.is_error ? { is_error: true } : {}),
        });
      }

      // Append tool results as a single user-role message, per Anthropic spec
      apiMessages.push({ role: "user", content: toolResultBlocks });
    }

    return helpers.json({ messages: newlyCreated });
  } catch (err) {
    console.error("[admin-chat] error:", err && err.stack || err);
    return helpers.json({
      messages: newlyCreated,
      error: "chat_error",
      detail: String(err && err.message || err),
    }, 500);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Replace image content blocks in tool_results with text stubs EXCEPT in the
// most recent tool_result message. Saves ~1500 tokens per stale image on each
// subsequent agentic-loop iteration.
function compactImageHistory(messages) {
  if (!messages || messages.length === 0) return messages;
  // Find the index of the LAST message that's a tool_result batch
  let lastToolResultIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user" && Array.isArray(m.content) && m.content.some(b => b && b.type === "tool_result")) {
      lastToolResultIdx = i;
      break;
    }
  }
  return messages.map((m, idx) => {
    if (idx === lastToolResultIdx) return m;  // keep the most-recent images
    if (m.role !== "user" || !Array.isArray(m.content)) return m;
    let touched = false;
    const newContent = m.content.map(block => {
      if (block && block.type === "tool_result" && Array.isArray(block.content)) {
        // Replace any image blocks with a text stub
        const stripped = block.content.map(b => {
          if (b && b.type === "image") { touched = true; return { type: "text", text: "[image filtered to save tokens — was a screenshot]" }; }
          return b;
        });
        return { ...block, content: stripped };
      }
      return block;
    });
    return touched ? { ...m, content: newContent } : m;
  });
}

async function insertToolMsg(env, id, clientId, resultText, toolUseId, ts) {
  await env.DB.prepare(
    "INSERT INTO admin_chat_messages (id, client_id, role, content, tool_calls, tool_use_id, created_at) VALUES (?, ?, 'tool', ?, NULL, ?, ?)",
  ).bind(id, clientId, resultText, toolUseId, ts).run();
}

function historyToApiMessages(history) {
  // Convert D1 rows back into Anthropic message blocks.
  // - role='user' with no tool_use_id  → { role:'user', content:text }
  // - role='assistant'                  → { role:'assistant', content:[{type:'text',text}, ...{type:'tool_use'}]
  // - role='tool'                       → folded into a single trailing 'user' message with tool_result blocks,
  //                                       grouped per assistant turn (i.e. consecutive tool rows).
  const out = [];
  let pendingToolResults = [];

  function flushPendingTools() {
    if (pendingToolResults.length === 0) return;
    out.push({ role: "user", content: pendingToolResults });
    pendingToolResults = [];
  }

  for (const r of history) {
    if (r.role === "tool") {
      pendingToolResults.push({
        type: "tool_result",
        tool_use_id: r.tool_use_id,
        content: String(r.content || ""),
      });
      continue;
    }
    flushPendingTools();
    if (r.role === "user") {
      out.push({ role: "user", content: String(r.content || "") });
    } else if (r.role === "assistant") {
      const blocks = [];
      const txt = String(r.content || "").trim();
      if (txt) blocks.push({ type: "text", text: txt });
      let tc = null;
      try { tc = r.tool_calls ? JSON.parse(r.tool_calls) : null; } catch (_) { tc = null; }
      if (Array.isArray(tc)) {
        for (const t of tc) {
          if (!t || !t.id || !t.name) continue;
          blocks.push({ type: "tool_use", id: t.id, name: t.name, input: t.input || {} });
        }
      }
      if (blocks.length === 0) blocks.push({ type: "text", text: "" });
      out.push({ role: "assistant", content: blocks });
    }
  }
  flushPendingTools();
  return out;
}

async function loadClientContext(env, clientId, client) {
  const subs = await env.DB.prepare(
    "SELECT section, data FROM submissions WHERE client_id = ?",
  ).bind(clientId).all();
  const intake = {};
  for (const row of subs.results || []) {
    try { intake[row.section] = JSON.parse(row.data); } catch { intake[row.section] = row.data; }
  }
  const mockupsList = await env.DB.prepare(
    "SELECT id, version, status, shipped_at, blueprint_key, created_at FROM mockups WHERE client_id = ? ORDER BY version DESC",
  ).bind(clientId).all();
  const mockups = mockupsList.results || [];
  const live = await env.DB.prepare(
    "SELECT slug, custom_domain, disabled_at FROM live_sites WHERE client_id = ?",
  ).bind(clientId).first();

  // Deliverables % done
  let delivState = {};
  try { delivState = client && client.deliverables_state ? JSON.parse(client.deliverables_state) : {}; } catch (_) {}
  const delivKeys = Object.keys(delivState);
  const delivDone = delivKeys.filter((k) => delivState[k] === "done").length;
  const delivPct = delivKeys.length ? Math.round((delivDone / delivKeys.length) * 100) : null;

  return { intake, mockups, latestMockup: mockups[0] || null, live, delivPct };
}

function buildSystemPrompt(client, ctx) {
  const business = (ctx.intake.business || {});
  const brand = (ctx.intake.brand || {});
  const latest = ctx.latestMockup;
  const shippedAt = latest && latest.shipped_at ? new Date(latest.shipped_at * 1000).toISOString() : null;
  const adminCssLen = client.admin_css ? String(client.admin_css).length : 0;
  const liveUrl = (ctx.live && ctx.live.custom_domain)
    ? ctx.live.custom_domain
    : (ctx.live && ctx.live.slug ? ctx.live.slug + ".sites.pymewebpro.com" : "not yet published");

  return [
    "You are Mike's AI assistant inside the PymeWebPro admin console. Mockups are now hand-built in Cowork and uploaded — auto-generation has been removed. Your job is post-build polish: read what's deployed, take screenshots so Mike can verify, suggest CSS tweaks, find imagery, and push the mockup to the client when he says go.",
    "",
    "CURRENT CLIENT: " + (client.business_name || "(unnamed)") + " (" + (client.email || "") + ")",
    "- Plan: " + (client.plan || "—"),
    "- Status: " + (client.status || "—"),
    "- Latest mockup: " + (latest ? ("v" + latest.version + " (" + latest.status + ", " + (shippedAt ? "pushed to client" : "draft") + ")") : "(none yet)"),
    "- Total mockups uploaded: " + ctx.mockups.length,
    "- Custom CSS overrides: " + (adminCssLen ? ("active (" + adminCssLen + " chars)") : "none"),
    "- Live URL: " + liveUrl,
    "- Deliverables: " + (ctx.delivPct == null ? "n/a" : (ctx.delivPct + "% done")),
    "",
    "INTAKE SUMMARY (for context — Mike already used this when hand-building):",
    "- Business: " + (business.bizName || "—") + " — " + (business.tagline || ""),
    "- What they do: " + (business.whatYouDo || "—"),
    "- Brand colors: " + (brand.colors || "—"),
    "",
    "RULES:",
    "- Keep replies brief. Mike values concise updates.",
    "- Mockups are uploaded HTML built in Cowork. There is NO regeneration, NO blueprints, NO palette tokens. Don't suggest \"regenerate\" or \"switch blueprint\" — those don't exist anymore.",
    "- For visual tweaks, use set_admin_css. It's the only content-mutating tool you have. Be precise with selectors (e.g. `.hero h1`, `.btn-cta`, `header nav a`).",
    "- Use get_mockup_html FIRST when asked about specific elements/copy — read the actual structure before guessing selectors.",
    "- Use screenshot_mockup when visual judgment is required (color balance, spacing, hero composition).",
    "- search_pexels is for finding imagery Mike can drop into the next manual upload — return URLs and let him decide. You can't paste images into the build directly.",
    "- ALWAYS confirm before push_to_client (it counts against the client's revision quota).",
    "- If a request is ambiguous, ask one clarifying question. Don't ramble.",
  ].join("\n");
}

// ─── Anthropic call ─────────────────────────────────────────────────────────
// Uses prompt caching (cache_control) so the system prompt + tool schema (the
// expensive bulk of input tokens) are billed at 1/10 the rate after the first
// call within a 5-minute window. This is essential for Tier 1 accounts where
// ITPM is tight (10K/min) — without caching, 4-6 turns blow the budget.
async function callAnthropic(env, systemPrompt, messages) {
  // Mark the LAST tool definition with cache_control: ephemeral. Anthropic caches
  // every block up to that marker, including the system prompt and tool schema.
  const cachedTools = TOOL_SCHEMA.map((t, i) =>
    i === TOOL_SCHEMA.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t
  );
  // System prompt as an array so we can attach cache_control to it too.
  const cachedSystem = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: 2048,
        system: cachedSystem,
        tools: cachedTools,
        messages,
      }),
    });
  } catch (e) {
    return { error: "fetch_failed: " + (e && e.message || e) };
  }
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    // Friendlier message for the most common error: rate limits.
    if (r.status === 429) {
      const retryAfter = r.headers.get("retry-after") || "a few seconds";
      let detail = "Anthropic rate limit hit. Wait " + retryAfter + " seconds and try again.";
      // Try to surface which limit (input/output/requests) tripped
      try {
        const j = JSON.parse(txt);
        if (j && j.error && j.error.message) detail = j.error.message;
      } catch (_) {}
      return { error: "rate_limit: " + detail, status: 429, retry_after: retryAfter };
    }
    return { error: r.status + " " + txt.slice(0, 400), status: r.status };
  }
  let data;
  try { data = await r.json(); } catch (e) { return { error: "bad_json" }; }
  return data;
}

// ─── Tool schema ────────────────────────────────────────────────────────────
const TOOL_SCHEMA = [
  {
    name: "set_admin_css",
    description: "Replace the per-client admin_css override (injected at end of <head> on every served page, including manual uploads). Use this for post-deploy CSS tweaks. Up to 64KB. </style> and <script> tags are stripped.",
    input_schema: {
      type: "object",
      properties: { css: { type: "string", description: "Raw CSS to inject. Use selectors like .hero h1, .btn-cta, etc." } },
      required: ["css"],
    },
  },
  {
    name: "get_admin_css",
    description: "Return the current admin_css value so you can inspect or patch it before writing.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "push_to_client",
    description: "DESTRUCTIVE: push the LATEST mockup to the client's portal and email them. Counts against their revision quota. Confirm with the user before calling.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_pexels",
    description: "Search Pexels for photographs (orientation=landscape by default). Returns id, photographer, and src_large URLs. Useful when Mike is hand-building a manual mockup and needs imagery — he can copy the URL into the next upload.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        per_page: { type: "integer", minimum: 1, maximum: 20 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_state",
    description: "Return a JSON snapshot of the current client state (meta, latest mockup, intake summary, custom_css length, deliverables %).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_mockup_html",
    description: "Fetch the rendered HTML of a mockup so you can read the actual structure, copy, inline styles, and layout. Returns the HTML body as text (truncated at ~80KB; data: URIs collapsed). Use this BEFORE making targeted edits to confirm what's actually rendered. Pass version=N to fetch a specific mockup; omit to get the latest.",
    input_schema: {
      type: "object",
      properties: {
        version: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "screenshot_mockup",
    description: "Take a real screenshot of a mockup at a given viewport (desktop/tablet/mobile) using Cloudflare Browser Rendering, and return it as an inline image you can SEE. Use this when visual judgment is required — color balance, spacing, hero composition. More expensive than get_mockup_html; prefer HTML for content/structure questions, screenshot for visual ones. Pass version=N for a specific mockup; omit for latest.",
    input_schema: {
      type: "object",
      properties: {
        version: { type: "integer", minimum: 1 },
        viewport: { type: "string", enum: ["desktop", "tablet", "mobile"] },
      },
    },
  },
];

// ─── Tool runner ────────────────────────────────────────────────────────────
async function runTool(env, helpers, clientId, name, input) {
  try {
    switch (name) {
      case "set_admin_css": return await tool_setAdminCss(env, clientId, input);
      case "get_admin_css": return await tool_getAdminCss(env, clientId);
      case "push_to_client": return await tool_pushToClient(env, helpers, clientId);
      case "search_pexels": return await tool_searchPexels(env, input);
      case "get_state": return await tool_getState(env, clientId);
      case "get_mockup_html": return await tool_getMockupHtml(env, clientId, input);
      case "screenshot_mockup": return await tool_screenshotMockup(env, helpers, clientId, input);
      default: return { is_error: true, content: { error: "unknown_tool", tool: name } };
    }
  } catch (e) {
    return { is_error: true, content: { error: "tool_threw", tool: name, detail: String(e && e.message || e) } };
  }
}

// ─── Tool implementations ───────────────────────────────────────────────────

async function tool_setAdminCss(env, clientId, input) {
  if (typeof input.css !== "string") return { is_error: true, content: { error: "css must be a string" } };
  const raw = input.css.slice(0, 64 * 1024);
  const safe = raw.replace(/<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  await env.DB.prepare("UPDATE clients SET admin_css = ?, updated_at = ? WHERE id = ?")
    .bind(safe || null, Date.now(), clientId).run();
  return { content: { ok: true, length: safe.length, message: "admin_css updated" } };
}

async function tool_getAdminCss(env, clientId) {
  const row = await env.DB.prepare("SELECT admin_css FROM clients WHERE id = ?").bind(clientId).first();
  return { content: { admin_css: row && row.admin_css ? row.admin_css : "" } };
}

async function tool_pushToClient(env, helpers, clientId) {
  const latest = await env.DB.prepare(
    "SELECT id, version, shipped_at FROM mockups WHERE client_id = ? ORDER BY version DESC LIMIT 1",
  ).bind(clientId).first();
  if (!latest) return { is_error: true, content: { error: "no_mockup" } };

  const url = "https://internal/api/admin/mockups/" + encodeURIComponent(latest.id) + "/push-to-client";
  const fakeReq = new Request(url, {
    method: "POST",
    headers: { "Authorization": "Bearer " + (env.ADMIN_TOKEN || "") },
  });
  const mod = await import("./mockups.js");
  const resp = await mod.handleMockups(fakeReq, env, {}, helpers);
  if (!resp) return { is_error: true, content: { error: "no_response_from_dispatcher" } };
  const text = await resp.text();
  let body;
  try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
  if (resp.status >= 400) {
    return { is_error: true, content: { error: "push_failed", status: resp.status, body } };
  }
  return { content: { ok: true, version: latest.version, shipped_at: body.shipped_at || null } };
}

async function tool_searchPexels(env, input) {
  const query = String(input.query || "").trim();
  if (!query) return { is_error: true, content: { error: "empty_query" } };
  const apiKey = env.PEXELS_API_KEY;
  if (!apiKey) {
    return { is_error: true, content: { error: "pexels_key_missing", detail: "PEXELS_API_KEY secret not configured. Run: wrangler secret put PEXELS_API_KEY --name pymewebpro-portal" } };
  }
  const perPage = Math.max(1, Math.min(20, Number(input.per_page) || 6));
  const u = "https://api.pexels.com/v1/search?orientation=landscape&per_page=" + perPage + "&query=" + encodeURIComponent(query);
  let r;
  try {
    r = await fetch(u, { headers: { "Authorization": apiKey } });
  } catch (e) {
    return { is_error: true, content: { error: "pexels_fetch_failed", detail: String(e && e.message || e) } };
  }
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return { is_error: true, content: { error: "pexels_status_" + r.status, detail: t.slice(0, 200) } };
  }
  const data = await r.json().catch(() => ({}));
  const photos = (data.photos || []).map((p) => ({
    id: p.id,
    photographer: p.photographer,
    src_large: (p.src && (p.src.large2x || p.src.large || p.src.original)) || "",
    alt: p.alt || "",
  }));
  return { content: { count: photos.length, photos } };
}

async function tool_getState(env, clientId) {
  const client = await env.DB.prepare(
    "SELECT id, business_name, email, plan, status, admin_css, deliverables_state FROM clients WHERE id = ?",
  ).bind(clientId).first();
  if (!client) return { is_error: true, content: { error: "client_not_found" } };
  const ctx = await loadClientContext(env, clientId, client);
  const business = ctx.intake.business || {};
  return {
    content: {
      client: {
        id: client.id,
        business_name: client.business_name,
        email: client.email,
        plan: client.plan,
        status: client.status,
        admin_css_length: client.admin_css ? client.admin_css.length : 0,
      },
      latest_mockup: ctx.latestMockup ? {
        id: ctx.latestMockup.id,
        version: ctx.latestMockup.version,
        status: ctx.latestMockup.status,
        shipped_at: ctx.latestMockup.shipped_at,
        blueprint_key: ctx.latestMockup.blueprint_key, // 'manual' for new uploads, blueprint-* for legacy
        is_manual: ctx.latestMockup.blueprint_key === "manual",
      } : null,
      intake_summary: {
        bizName: business.bizName || "",
        tagline: business.tagline || "",
        whatYouDo: business.whatYouDo || "",
      },
      live: ctx.live ? { slug: ctx.live.slug, custom_domain: ctx.live.custom_domain, disabled_at: ctx.live.disabled_at } : null,
      deliverables_pct: ctx.delivPct,
    },
  };
}

// ─── Vision tools — let Opus actually inspect the rendered mockup ───────────

// Find a mockup row by clientId + optional version (or latest if omitted).
async function findMockup(env, clientId, version) {
  if (version) {
    return env.DB.prepare(
      "SELECT id, version, html_r2_key, blueprint_key, shipped_at FROM mockups WHERE client_id = ? AND version = ?",
    ).bind(clientId, Number(version)).first();
  }
  return env.DB.prepare(
    "SELECT id, version, html_r2_key, blueprint_key, shipped_at FROM mockups WHERE client_id = ? ORDER BY version DESC LIMIT 1",
  ).bind(clientId).first();
}

async function tool_getMockupHtml(env, clientId, input) {
  const m = await findMockup(env, clientId, input && input.version);
  if (!m) return { is_error: true, content: { error: "mockup_not_found", hint: "No mockup exists for this version. Try get_state to see available versions." } };
  const obj = await env.ASSETS.get(m.html_r2_key);
  if (!obj) return { is_error: true, content: { error: "html_missing_in_r2", mockup_id: m.id } };
  let html = await obj.text();

  // Collapse long inline data: URIs (placeholder SVGs etc.) so we don't waste tokens.
  // Keep the first 80 chars of each so Opus knows it's a placeholder vs a real image.
  html = html.replace(/data:image\/[a-z+]+;[^"')\s]{200,}/gi, (m) => m.slice(0, 80) + "…[truncated data URI]");

  // Hard cap on total text size — 30KB is enough for Opus to reason about
  // layout/copy without blowing the Tier 1 input-token-per-minute budget.
  const MAX = 30 * 1024;
  let truncated = false;
  if (html.length > MAX) { html = html.slice(0, MAX); truncated = true; }

  return {
    content: {
      mockup_id: m.id,
      version: m.version,
      blueprint_key: m.blueprint_key,
      shipped: !!m.shipped_at,
      html,
      truncated,
      total_length: html.length,
    },
  };
}

async function tool_screenshotMockup(env, helpers, clientId, input) {
  const m = await findMockup(env, clientId, input && input.version);
  if (!m) return { is_error: true, content: { error: "mockup_not_found" } };

  const viewport = input && input.viewport;
  const sizes = {
    desktop: { width: 1280, height: 800 },
    tablet:  { width: 768,  height: 1024 },
    mobile:  { width: 390,  height: 844 },
  };
  const dim = sizes[viewport] || sizes.desktop;

  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    return {
      is_error: true,
      content: {
        error: "browser_rendering_not_configured",
        hint: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets must be set on the worker. Falling back to get_mockup_html is recommended.",
      },
    };
  }

  // Mint a fresh 1-hour share token so Browser Rendering can fetch the URL publicly
  const token = helpers.randomToken(20);
  const expires = Math.floor(Date.now() / 1000) + 3600;
  await env.DB.prepare(
    "INSERT INTO mockup_shares (token, mockup_id, expires_at) VALUES (?, ?, ?)",
  ).bind(token, m.id, expires).run();
  const url = `${env.APP_URL || "https://portal.pymewebpro.com"}/m/${token}/`;

  // Cloudflare Browser Rendering REST API
  let resp;
  try {
    resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          viewport: dim,
          screenshotOptions: { type: "png", fullPage: false },
          gotoOptions: { waitUntil: "networkidle0", timeout: 25000 },
        }),
      },
    );
  } catch (e) {
    return { is_error: true, content: { error: "screenshot_fetch_failed", detail: String(e && e.message || e) } };
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    return {
      is_error: true,
      content: {
        error: "browser_rendering_status_" + resp.status,
        detail: txt.slice(0, 300),
        hint: "If the response says Browser Rendering isn't enabled, enable it in the Cloudflare dashboard under your account → Browser Rendering.",
      },
    };
  }

  // Response is the raw PNG bytes (or sometimes a JSON wrapper). Sniff and convert to base64.
  const ct = resp.headers.get("content-type") || "";
  let imageData = "";
  let mediaType = "image/png";
  if (ct.includes("image/")) {
    const buf = new Uint8Array(await resp.arrayBuffer());
    imageData = arrayBufferToBase64(buf);
    mediaType = ct.split(";")[0].trim();
  } else {
    // Some endpoints wrap the image in JSON: { result: { image: "<base64>" } }
    const j = await resp.json().catch(() => null);
    if (j && j.result && j.result.image) {
      imageData = j.result.image;
    } else if (j && typeof j.image === "string") {
      imageData = j.image;
    } else {
      return { is_error: true, content: { error: "unexpected_screenshot_response", body_preview: JSON.stringify(j).slice(0, 300) } };
    }
  }

  const caption = `Screenshot of v${m.version} (${viewport || "desktop"}, ${dim.width}×${dim.height}, blueprint=${m.blueprint_key || "?"})`;
  return {
    content: { mockup_id: m.id, version: m.version, viewport: viewport || "desktop", caption },
    image_data: imageData,
    image_media_type: mediaType,
    image_caption: caption,
  };
}

// Convert a Uint8Array to a base64 string (Workers don't have Buffer)
function arrayBufferToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Re-export the mutating set so the SPA can call onRefresh selectively
export const ADMIN_CHAT_MUTATING_TOOLS = MUTATING_TOOLS;
