// _archived/auto-gen.js — archived auto-generation pipeline
// =================================================================
// This file holds the legacy "auto-generate a mockup via Opus 4.7 +
// blueprint variants" code that lived in src/mockups.js until the
// May 2026 refactor that switched the portal to a manual-upload
// workflow.
//
// It's kept here as REFERENCE / RESTORE BACKUP only — it is NOT
// imported anywhere in the live worker. To re-enable, you'd need to:
//   1) Move blueprint*.js back out of _archived/
//   2) Re-import BLUEPRINTS, inferBlueprintKey, and the prompts
//   3) Wire generateForClient + regenerate back into the dispatcher
//      in mockups.js
//   4) Update package.json check:worker to include them
//
// History: 19+ regenerations on a single SaaS client (Schedulator)
// produced unsatisfactory results, prompting the move to manual.
//
// Original location: src/mockups.js (lines ~20-630)
// Original imports: import { BLUEPRINTS, inferBlueprintKey } from "./blueprint.js";
//                   import { renderPrivacyEs, renderPrivacyEn, renderTermsEs, renderTermsEn, renderRobots, renderSitemap } from "./legal.js";
// =================================================================

// ─── System prompts (Spanish-Colombian PYME tone) ────────────────────────
export const SYSTEM_PROMPT_BASE = `Eres un editor copy senior de PymeWebPro. Recibes datos crudos de un cliente colombiano (PyME) y devuelves un JSON listo para alimentar un blueprint HTML.
Reglas:
- Español colombiano natural, profesional pero cálido. NO suene a IA. Frases cortas.
- Si datos faltan, INVENTA piezas razonables y conservadoras (no exageres).
- Servicios: máximo 6, cada uno 2-4 palabras.
- "tagline": 6-12 palabras, beneficio claro, no cliché.
- Colores: si el cliente da hex/nombres, conviértelos a hex; si no, elige una paleta apropiada al sector (primary + accent + ink + bg).
Campos básicos (Esencial): businessName, tagline, industry, services, phone, email, address, hours, instagram, facebook, primary, accent, ink, bg, ctaPhone, ctaWhatsapp, testimonials (array de {name, quote, role} si los datos del cliente los incluyen, si no [])`;

export const SYSTEM_PROMPT_PRO_EXTRA = `
ADEMÁS, este cliente es plan CRECIMIENTO (Growth). Los datos del cliente contienen una sección "growth" con campos opcionales. Para cada campo:
- Si el cliente proporcionó un valor → inclúyalo TAL CUAL (no modifique URLs ni IDs).
- Si está vacío → OMITA la clave del JSON (no invente URLs/IDs).

Campos esperados de la sección growth:
- bookingsUrl: URL de Calendly / Cal.com / sistema de reservas
- pdfUrl + pdfLabel: link a un catálogo / menú PDF y la etiqueta del botón
- waCatalogUrl: link al catálogo de WhatsApp Business
- newsletterUrl: endpoint POST del formulario de suscripción
- ga4Id: ID de Google Analytics 4 (formato G-XXXXXXXX)
- metaPixelId: ID del Meta Pixel (números)

Adicionalmente, los campos "_parsedTestimonials" y "_parsedFaqs" ya están parseados como arrays de objetos en los datos crudos. Cópialos directamente al JSON como "testimonials" y "faqs" (no los re-parsee, no los modifique). Si están vacíos, devuelva [].`;

export const SYSTEM_PROMPT_REVISION = `
PRIORIDAD MÁXIMA — REVISIÓN ITERATIVA:
Si los datos del cliente contienen una clave "_revision_notes", esto significa que ya generaste una versión previa y el cliente / Mike pidió cambios específicos. APLÍCALOS exactamente, son MÁS importantes que los datos originales del intake:

  _revision_notes.typed_instruction: instrucción libre de Mike (admin) — máxima prioridad.
  _revision_notes.section_comments: { [section]: [{from, status, text}, ...] }
    - "section" indica QUÉ sección del sitio comentaron (servicios, hero, testimonios, gallery, contacto, etc.)
    - "from" = "client" (cliente) o "Mike" (admin)
    - "status" = "open" (acción pendiente) o "resolved" (ya manejado, solo contexto)
    - Comments con status="open" SON instrucciones que debes aplicar al regenerar.

Reglas concretas al ver _revision_notes:
1. Lea CADA comment con status="open" y aplíquelo a la sección correspondiente.
2. Cambios de color con alcance específico: si un comment menciona un elemento concreto, NO modifique la paleta global.
3. Cambios de color con alcance global: solo modifique primary/accent si el comment dice claramente que es del SITIO entero.
4. Si dice "agrega/quita un servicio", modifique el array services.
5. Si dice "el texto suena raro", reescriba ese texto.
6. Si comments contradicen el intake original, GANA el comment.
7. NO mencione _revision_notes en el output JSON.
8. Si typed_instruction está presente, aplíquela TAMBIÉN — es prioridad sobre los comments.
9. Si NO está claro qué color cambiar, prefiera DEJAR la paleta intacta.
`;

export function systemPromptFor(plan) {
  const isPro = String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
  return SYSTEM_PROMPT_BASE
    + (isPro ? "\n\n" + SYSTEM_PROMPT_PRO_EXTRA : "")
    + "\n\n" + SYSTEM_PROMPT_REVISION
    + `\n\nDevuelve SOLO JSON, sin markdown ni texto adicional.`;
}

// ─── Helper parsers (free-text → structured data) ────────────────────────
export function parseTestimonials(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/\r?\n/).map(line => {
    const parts = line.split("|").map(s => s.trim());
    if (!parts[0]) return null;
    return { name: parts[0], quote: parts[1] || "", role: parts[2] || "" };
  }).filter(t => t && t.quote);
}

export function parseFaqs(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/\r?\n/).map(line => {
    const idx = line.indexOf("|");
    if (idx < 0) return null;
    const q = line.slice(0, idx).trim();
    const a = line.slice(idx + 1).trim();
    if (!q || !a) return null;
    return { q, a };
  }).filter(Boolean);
}

// ─── Claude calls ─────────────────────────────────────────────────────────

export async function callClaude(env, intake, plan, lang) {
  const isPro = String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
  const targetLang = lang === "en" ? "en" : "es";
  const growth = intake.growth || {};
  intake._parsedTestimonials = parseTestimonials(growth.testimonials);
  intake._parsedFaqs = parseFaqs(growth.faqs);

  if (!env.ANTHROPIC_API_KEY) {
    const biz = intake.business || {};
    const out = {
      businessName: biz.bizName || intake._client_business_name || "Su Negocio",
      tagline: biz.tagline || biz.whatYouDo || "Su negocio, en línea.",
      industry: biz.audience || "Servicios",
      services: String(biz.whatYouDo || "").split(/[\n,]+/).map(s => s.trim()).filter(Boolean).slice(0, 6),
      phone: (intake.contact || {}).phone,
      email: (intake.contact || {}).email,
      address: (intake.contact || {}).address,
      instagram: (intake.contact || {}).ig,
      facebook: (intake.contact || {}).fb,
      ctaPhone: (intake.contact || {}).phone,
      ctaWhatsapp: (intake.contact || {}).whatsapp,
      primary: "#003893", accent: "#fcd116", ink: "#0a1840", bg: "#fbfaf6",
      testimonials: intake._parsedTestimonials,
      faqs: intake._parsedFaqs,
    };
    if (isPro) {
      out.bookingsUrl = growth.bookingsUrl;
      out.pdfUrl = growth.pdfUrl;
      out.pdfLabel = growth.pdfLabel;
      out.waCatalogUrl = growth.waCatalogUrl;
      out.newsletterUrl = growth.newsletterUrl;
      out.newsletterEnabled = !!growth.newsletterUrl;
      out.ga4Id = growth.ga4Id;
      out.metaPixelId = growth.metaPixelId;
    }
    return out;
  }
  const langSuffix = targetLang === "en"
    ? "\n\nLANGUAGE OVERRIDE: This client's primary language is ENGLISH (US). Generate ALL human-readable copy in English."
    : "";
  const userMsgPrefix = targetLang === "en"
    ? `Plan: ${isPro ? "GROWTH" : "ESSENTIAL"}\n\nGenerate marketing copy in ENGLISH. Raw client data:`
    : `Plan: ${isPro ? "CRECIMIENTO" : "ESENCIAL"}\n\nDatos crudos del cliente:`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      system: systemPromptFor(plan) + langSuffix,
      messages: [{ role: "user", content: `${userMsgPrefix}\n${JSON.stringify(intake, null, 2)}` }],
    }),
  });
  const j = await r.json();
  const text = j?.content?.[0]?.text || "{}";
  const match = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(match ? match[0] : "{}"); } catch { return {}; }
}

export async function translateToEnglish(env, esFilled) {
  const out = { ...esFilled };
  if (!env.ANTHROPIC_API_KEY) return out;
  const sysPrompt = `You translate Colombian Spanish marketing copy into natural US English for a small-business website. Keep brand names, URLs, IDs, hex colors, addresses, and phone numbers EXACTLY as-is. Translate only the human-readable strings provided. Return SOLO JSON con la misma forma del input, sin markdown ni texto adicional.`;
  const payload = {
    tagline: esFilled.tagline,
    industry: esFilled.industry,
    services: Array.isArray(esFilled.services) ? esFilled.services : [],
    testimonials: Array.isArray(esFilled.testimonials) ? esFilled.testimonials.map(t => ({ name: t.name, quote: t.quote, role: t.role || "" })) : [],
    faqs: Array.isArray(esFilled.faqs) ? esFilled.faqs.map(f => ({ q: f.q, a: f.a })) : [],
    pdfLabel: esFilled.pdfLabel || "",
  };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-7", max_tokens: 1500,
        system: sysPrompt,
        messages: [{ role: "user", content: `Translate to natural US English (return JSON only):\n${JSON.stringify(payload)}` }],
      }),
    });
    const j = await r.json();
    const text = j?.content?.[0]?.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const t = JSON.parse(match ? match[0] : "{}");
    if (t.tagline) out.tagline = t.tagline;
    if (t.industry) out.industry = t.industry;
    if (Array.isArray(t.services) && t.services.length) out.services = t.services;
    if (Array.isArray(t.testimonials)) out.testimonials = t.testimonials;
    if (Array.isArray(t.faqs)) out.faqs = t.faqs;
    if (t.pdfLabel) out.pdfLabel = t.pdfLabel;
  } catch (_) { /* fall through with ES values */ }
  return out;
}

// ─── generateForClient + regenerate (depended on BLUEPRINTS / inferBlueprintKey) ─
//
// NOTE: these functions are NOT importable as-is — they reference imports
// (BLUEPRINTS, inferBlueprintKey, render*Privacy/Terms, helpers.uuid, env.DB,
// env.ASSETS, autoMarkDeliverables, safeName) that are no longer in scope here.
// They're kept verbatim in this archive for reference / future restore.
//
// To restore: copy the function bodies back into mockups.js and re-add the
// imports listed in the file header above.
//
// (Body removed from archive copy — see git history of src/mockups.js
// for the full implementation prior to the manual-upload refactor.)

export async function setClientBlueprint(env, helpers, clientId, req) {
  const ALLOWED = [null, "blueprint-1", "blueprint-saas", "blueprint-professional"];
  const body = await req.json().catch(() => ({}));
  const key = body.blueprint_key === null || body.blueprint_key === "" || body.blueprint_key === "auto" ? null : String(body.blueprint_key);
  if (!ALLOWED.includes(key)) {
    return helpers.json({ error: "invalid_key", msg: "Plantilla no reconocida." }, 400);
  }
  const r = await env.DB.prepare("UPDATE clients SET blueprint_key = ?, updated_at = ? WHERE id = ?")
    .bind(key, Date.now(), clientId).run();
  return helpers.json({ ok: true, blueprint_key: key, changes: r.meta?.changes ?? 0 });
}
