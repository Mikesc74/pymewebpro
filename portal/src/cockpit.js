// ============================================================================
// Cockpit endpoints for the Mi día kanban (ventas.pymewebpro.com).
// ============================================================================
// Auto-generation hooks that fire as Santi drags a card forward:
//   POST /api/admin/cockpit/mockup-msg  · drafts the WhatsApp message that
//        accompanies the free mockup link, stores it as a 'Listo: mockup'
//        activity (done=0) so the card can flag "listo para enviar".
//
// Spanish, Santi voice, tú register. No em dashes. No marketing-speak. COP only.
// ============================================================================

import { generateProposal } from "./proposal-generator.js";
import { genDemoImg, DEMO_IMG_KEYS } from "./demo-img.js";

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEMO_BASE = "https://mockups.pymewebpro.com";

export async function handleCockpitRoutes(request, env, helpers) {
  const { json, isAdmin } = helpers;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/admin/cockpit/mockup-msg" && request.method === "POST") {
    if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    return await mockupMsg(request, env, json);
  }
  if (path === "/api/admin/cockpit/proposal" && request.method === "POST") {
    if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    return await proposalGen(request, env, json);
  }
  if (path === "/api/admin/cockpit/gen-img" && request.method === "POST") {
    if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    let body; try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
    const res = await genDemoImg(env, body && body.key);
    return json(res, res.ok ? 200 : 502);
  }
  if (path === "/api/admin/cockpit/img-keys" && request.method === "GET") {
    if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
    return json({ ok: true, keys: DEMO_IMG_KEYS });
  }
  return null; // not our route
}

// Creates (or updates) a deal linked to the lead with the chosen add-ons +
// requirement notes, then builds the clean proposal page via the existing
// proposal generator. Returns the generated deal so the card can link to it.
async function proposalGen(request, env, json) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const leadId = body && body.lead_id;
  if (!leadId) return json({ ok: false, error: "Missing lead_id" }, 400);
  const addons = Array.isArray(body.addons) ? body.addons : [];
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";

  const lead = await env.DB.prepare("SELECT id, business_name, name FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return json({ ok: false, error: "Lead not found" }, 404);

  const addonsJson = JSON.stringify(addons);
  const now = Date.now();
  let deal = await env.DB.prepare(
    "SELECT id FROM deals WHERE lead_id = ? ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1"
  ).bind(leadId).first();
  let dealId;
  if (deal) {
    dealId = deal.id;
    await env.DB.prepare("UPDATE deals SET addons = ?, notes = ?, stage = 'proposal', proposal_status = 'generating', updated_at = ? WHERE id = ?")
      .bind(addonsJson, notes || null, now, dealId).run();
  } else {
    dealId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO deals (id, title, lead_id, stage, source, addons, notes, proposal_status, created_at, updated_at) " +
      "VALUES (?, ?, ?, 'proposal', 'cockpit', ?, ?, 'generating', ?, ?)"
    ).bind(dealId, (lead.business_name || lead.name || "Propuesta"), leadId, addonsJson, notes || null, now, now).run();
  }
  // Advance the lead into the Propuesta column.
  await env.DB.prepare("UPDATE leads SET lead_stage = 'proposal', updated_at = ? WHERE id = ?").bind(now, leadId).run();
  // Build the mockup + printable proposal HTML on the deal (clean template).
  return await generateProposal(env, dealId, json);
}

function stripEmDashes(s) {
  var dash = String.fromCharCode(0x2014); // em dash, kept out of source per house style
  return String(s == null ? "" : s).split(dash).join(", ");
}

async function mockupMsg(request, env, json) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: "ANTHROPIC_API_KEY not set on worker" }, 500);
  }
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const leadId = body && body.lead_id;
  if (!leadId) return json({ ok: false, error: "Missing lead_id" }, 400);

  const lead = await env.DB.prepare(
    "SELECT id, name, business_name, category, city FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (!lead) return json({ ok: false, error: "Lead not found" }, 404);

  const negocio = lead.business_name || lead.name || "tu negocio";
  const url = DEMO_BASE + "/demo/" + leadId;

  const system = [
    "Eres Santi de PymeWebPro, un estudio de diseño web para PYMES colombianas.",
    "YA estás en una conversación activa de WhatsApp con este prospecto. NO es el primer mensaje.",
    "Le preparaste un ejemplo (mockup) de su página y se lo vas a pasar ahora, dentro de esa misma charla.",
    "Escribe SOLO el texto del mensaje, sin comillas, sin nada antes ni después.",
    "Reglas: español, tutea, 1 o 2 frases cortas y naturales. NUNCA te presentes ni digas 'soy Santi' ni 'de PymeWebPro' (ya te conoce).",
    "Continúa la conversación: dile que acá le dejas el ejemplo que le comentaste e invítalo a abrirlo y decirte qué opina.",
    "No incluyas ningún link (yo lo agrego después). No prometas resultados ni primeros lugares en Google.",
    "Prohibido: líder, mundial, aprovechar, desbloquear, y el guion largo (em dash). Usa comas y puntos.",
  ].join("\n");
  const userMsg = [
    "Negocio: " + negocio,
    lead.category ? "Sector: " + lead.category : "",
    lead.city ? "Ciudad: " + lead.city : "",
  ].filter(Boolean).join("\n");

  let text = "";
  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: [{ role: "user", content: userMsg }] }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return json({ ok: false, error: "Anthropic " + resp.status + ": " + errText.slice(0, 200) }, 502);
    }
    const data = await resp.json();
    text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 502);
  }

  // Fallback if the model returned nothing usable.
  if (!text) {
    text = "Acá te dejo el ejemplo que te comenté de cómo se vería la página de " + negocio + ". ¿Lo abres y me dices qué te parece?";
  }
  const message = stripEmDashes(text) + "\n" + url;

  // Persist as a 'Listo: mockup' draft activity (done=0) so the card knows it
  // is ready to send. The card treats it as ready when its occurred_at is newer
  // than last_touched_at (i.e. generated but not yet sent).
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at, done) " +
    "VALUES (?, 'note', 'Listo: mockup', ?, ?, 'system', ?, ?, ?, 0)"
  ).bind(crypto.randomUUID(), message, leadId, now, now, now).run();

  return json({ ok: true, draft: message, url: url });
}
