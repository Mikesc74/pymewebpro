// agreement.js · PymeWebPro full-payment agreement page + Wompi checkout +
// post-payment launch checklist. The PWP analog of ChatClick's /pay flow.
//
// No deposit: the client sees their mockup, then on the Pago column the board
// sends them a link to this one-screen agreement (portal.pymewebpro.com/pago/
// <pay_token>). Accepting + paying the full $400.000 COP is one action. On the
// approved Wompi webhook, processFullPayment marks the lead Won + paid and seeds
// the launch checklist (dominio / Ficha de Google / asistente / en vivo /
// reseña). COP only. No em dashes.

const SETUP_COP = 400000;
const MOCKUP_BASE = "https://mockups.pymewebpro.com";
const PAY_BASE = "https://portal.pymewebpro.com";

// Canonical 5-step launch checklist (same shape as ChatClick, Spanish labels).
export const LAUNCH_STEPS = [
  { key: "dominio",   label: "Conectar el dominio" },
  { key: "gbp",       label: "Configurar la Ficha de Google" },
  { key: "asistente", label: "Activar el asistente" },
  { key: "live",      label: "Confirmar que la página está en vivo" },
  { key: "review",    label: "Enviar la solicitud de reseña en Google" },
];
export const LAUNCH_KEYS = LAUNCH_STEPS.map((s) => s.key);

export function initialLaunchStepsJson() {
  const o = {};
  for (const k of LAUNCH_KEYS) o[k] = null;
  return JSON.stringify(o);
}

export async function toggleLaunchStep(env, leadId, key, done) {
  if (!LAUNCH_KEYS.includes(key)) return { ok: false, error: "Paso desconocido" };
  const row = await env.DB.prepare("SELECT launch_steps FROM leads WHERE id = ?").bind(leadId).first();
  if (!row) return { ok: false, error: "Lead no encontrado" };
  let steps = {};
  try { steps = row.launch_steps ? JSON.parse(row.launch_steps) : {}; } catch {}
  for (const k of LAUNCH_KEYS) if (!(k in steps)) steps[k] = null;
  steps[key] = done ? Date.now() : null;
  await env.DB.prepare("UPDATE leads SET launch_steps = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(steps), Date.now(), leadId).run();
  return { ok: true, launch_steps: steps };
}

// ---- agreement page -------------------------------------------------------

export async function handlePayPage(env, token) {
  if (!env.DB) return htmlResponse(payErrorHtml("Este enlace todavía no está activo."), 503);
  let lead;
  try {
    lead = await env.DB.prepare(
      "SELECT id, business_name, name, email, mockup_url, agreement_accepted_at, paid_at FROM leads WHERE pay_token = ?"
    ).bind(token).first();
  } catch (e) {
    console.error("pay lookup failed", e);
    return htmlResponse(payErrorHtml("Algo salió mal abriendo tu enlace. Intenta de nuevo."), 500);
  }
  if (!lead) return htmlResponse(payErrorHtml("Este enlace no es válido o ya expiró."), 404);
  if (lead.paid_at) return htmlResponse(payDoneHtml(lead));
  return htmlResponse(payHtml(lead, token, null));
}

export async function handlePayAccept(request, env, token) {
  if (!env.DB) return htmlResponse(payErrorHtml("Este enlace todavía no está activo."), 503);
  let lead;
  try {
    lead = await env.DB.prepare(
      "SELECT id, business_name, name, email, paid_at FROM leads WHERE pay_token = ?"
    ).bind(token).first();
  } catch (e) {
    console.error("pay accept lookup failed", e);
    return htmlResponse(payErrorHtml("Algo salió mal. Intenta de nuevo."), 500);
  }
  if (!lead) return htmlResponse(payErrorHtml("Este enlace no es válido o ya expiró."), 404);
  if (lead.paid_at) return htmlResponse(payDoneHtml(lead));

  let form;
  try { form = await request.formData(); }
  catch { return htmlResponse(payErrorHtml("No pudimos leer tu envío. Vuelve e intenta de nuevo."), 400); }
  if (!form.get("acepto")) {
    return htmlResponse(payHtml(lead, token, "Marca la casilla del acuerdo para continuar."), 400);
  }

  const now = Date.now();
  try {
    await env.DB.prepare("UPDATE leads SET agreement_accepted_at = ?, updated_at = ? WHERE pay_token = ?")
      .bind(now, now, token).run();
  } catch (e) { console.error("pay accept update failed", e); }

  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) {
    return htmlResponse(payErrorHtml("El pago no está configurado todavía. El equipo ya fue avisado y te contacta."), 503);
  }

  const amountCents = SETUP_COP * 100;
  const reference = "pwp-full-" + lead.id + "-" + now.toString(36);
  const sig = await sha256Hex(reference + amountCents + "COP" + env.WOMPI_INTEGRITY);
  try {
    await env.DB.prepare(
      "INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, status, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, 'COP', 'esencial', 'none', 'pending', ?, ?)"
    ).bind(crypto.randomUUID(), lead.id, reference, amountCents, now, now).run();
  } catch (e) { console.error("full payment row insert failed", e); }

  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    "currency": "COP",
    "amount-in-cents": String(amountCents),
    "reference": reference,
    "signature:integrity": sig,
    "redirect-url": PAY_BASE + "/pago/" + encodeURIComponent(token) + "?status=back",
  });
  const checkoutUrl = "https://checkout.wompi.co/p/?" + params.toString();
  return new Response(null, { status: 303, headers: { Location: checkoutUrl } });
}

// ---- webhook follow-up: pwp-full-<leadId>-<ts> ----------------------------

export async function processFullPayment(env, payment) {
  const leadId = payment.lead_id;
  if (!leadId) { console.warn("full payment with no lead_id", payment.reference); return; }
  const now = Date.now();
  // Mark Won + paid and seed the launch checklist (COALESCE so a duplicate
  // webhook delivery does not wipe progress).
  try {
    await env.DB.prepare(
      "UPDATE leads SET paid_at = ?, lead_stage = 'sales_qualified', status = 'converted', " +
      "       last_touched_at = ?, last_touched_kind = 'payment', " +
      "       touches_count = COALESCE(touches_count, 0) + 1, " +
      "       next_action = 'Publicar + activar asistente', " +
      "       launch_steps = COALESCE(launch_steps, ?), updated_at = ? WHERE id = ?"
    ).bind(now, now, initialLaunchStepsJson(), now, leadId).run();
  } catch (e) { console.error("processFullPayment lead update failed", e); }

  try {
    await env.DB.prepare(
      "INSERT INTO activities (id, kind, subject, body, lead_id, owner, occurred_at, created_at, updated_at, done) " +
      "VALUES (?, 'note', 'Pago completo recibido via Wompi', ?, ?, 'system', ?, ?, ?, 1)"
    ).bind(
      crypto.randomUUID(),
      JSON.stringify({ reference: payment.reference, amount_cents: payment.amount_cents, currency: payment.currency || "COP", wompi_transaction_id: payment.wompi_transaction_id || null }),
      leadId, now, now, now,
    ).run();
  } catch (e) { console.error("processFullPayment activity failed", e); }
}

// ---- HTML -----------------------------------------------------------------

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PAY_STYLE = `
  :root{--ink:#11261f;--ink-soft:#33473f;--paper-soft:#f4f8f6;--accent:#15573B;--accent-bright:#1d7a52;--line:#cdd9d3;}
  *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--paper-soft);line-height:1.55}
  .wrap{max-width:640px;margin:0 auto;padding:32px 20px 64px}
  .brand{font-weight:800;font-size:20px;margin-bottom:24px}.brand span{color:var(--accent)}
  h1{font-size:28px;letter-spacing:-.02em;margin:0 0 8px}.sub{color:var(--ink-soft);font-size:16px;margin:0 0 24px}
  .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:14px}
  label{display:block;font-weight:700;font-size:14px;margin:0 0 6px}
  .lead-list{margin:0;padding-left:18px}.lead-list li{margin:6px 0}
  .price-line{font-size:17px;margin:4px 0}.price-line b{color:var(--accent)}
  .terms li{margin:8px 0;color:var(--ink-soft);font-size:14px}
  .mocklink{display:inline-block;color:var(--accent);font-weight:700;text-decoration:none}
  .acepto{display:flex;gap:10px;align-items:flex-start;margin:4px 0}
  .acepto input{margin-top:3px;width:18px;height:18px;flex:0 0 auto}.acepto label{font-weight:600;font-size:14px;margin:0}
  .btn{display:block;width:100%;padding:15px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-size:17px;font-weight:600;cursor:pointer}
  .btn:hover{background:var(--accent-bright)}.foot{text-align:center;color:var(--ink-soft);font-size:13px;margin-top:16px}
  .done{text-align:center;padding:48px 0}.done .tick{font-size:48px}
`;

function payHtml(lead, token, errorMsg) {
  const biz = escapeHtml(lead.business_name || lead.name || "tu negocio");
  const mockUrl = lead.mockup_url || (MOCKUP_BASE + "/demo/" + lead.id);
  const err = errorMsg
    ? `<div class="card" style="border-color:#b91c1c;background:#fff5f5"><b>Falta un paso</b><div style="font-weight:400;color:var(--ink-soft);font-size:14px">${escapeHtml(errorMsg)}</div></div>`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Tu página, lista para salir en vivo · PymeWebPro</title><style>${PAY_STYLE}</style></head>
<body><div class="wrap">
  <div class="brand">Pyme<span>WebPro</span></div>
  <h1>Tu página, lista para salir en vivo</h1>
  <p class="sub">Acá está el acuerdo y el pago seguro para ${biz}. Revisarlo y pagar es un solo paso. Sin depósito: el pago total publica tu página.</p>
  ${err}
  <div class="card"><a class="mocklink" href="${escapeHtml(mockUrl)}" target="_blank" rel="noopener">Ver tu página de muestra &rarr;</a></div>
  <div class="card">
    <label>Qué recibes</label>
    <ul class="lead-list">
      <li>Una página de ventas a la medida para ${biz}, hecha y alojada por PymeWebPro.</li>
      <li>Un asistente de chat 24/7 que conoce tu negocio, responde y captura a tus clientes.</li>
      <li>Tu Ficha de Google configurada, hosting, SSL y dominio, todo gestionado por nosotros.</li>
    </ul>
  </div>
  <div class="card">
    <label>El precio</label>
    <div class="price-line"><b>Página: $400.000 COP, pago único (IVA incluido).</b></div>
    <div class="price-line">Plan mensual opcional: $150.000 COP/mes, sin contrato, cancelas con 30 días de aviso.</div>
  </div>
  <div class="card">
    <label>El acuerdo</label>
    <ul class="terms">
      <li>Pagar el total publica tu página. Conectamos tu dominio y activamos tu asistente, normalmente en unas 48 horas.</li>
      <li>Tu plan mensual incluye hasta 2 cambios al mes. Un cambio es editar textos, imágenes, horarios o datos que ya existen. Una página nueva, una función nueva o un rediseño es una solicitud aparte y se cotiza por separado.</li>
      <li>Mes a mes. Cancelas cuando quieras con 30 días de aviso. Tu página y tu asistente siguen activos mientras el plan esté activo. Garantía de devolución a 30 días.</li>
      <li>Este acuerdo es entre tú y Norte Sur Consulting S.A.S. (NIT 901.956.771-1), el estudio detrás de PymeWebPro.</li>
    </ul>
  </div>
  <form method="POST" action="/api/pago/${encodeURIComponent(token)}">
    <div class="card"><div class="acepto"><input type="checkbox" id="acepto" name="acepto" value="1"><label for="acepto">He leído y acepto lo anterior, y autorizo el pago para publicar mi página.</label></div></div>
    <button class="btn" type="submit">Aceptar y pagar</button>
    <p class="foot">Pago seguro con Wompi (tarjetas, PSE, transferencia). Ves el monto exacto antes de confirmar.</p>
  </form>
</div></body></html>`;
}

function payDoneHtml(lead) {
  const biz = escapeHtml(lead.business_name || lead.name || "tu negocio");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Pago recibido · PymeWebPro</title><style>${PAY_STYLE}</style></head>
<body><div class="wrap"><div class="brand">Pyme<span>WebPro</span></div>
  <div class="done"><div class="tick">&#10003;</div><h1>Pago recibido, gracias</h1>
  <p class="sub">Recibimos el pago de ${biz}. Estamos conectando tu dominio y activando tu asistente, normalmente en unas 48 horas. Te escribimos en cuanto esté en vivo.</p></div>
</div></body></html>`;
}

function payErrorHtml(msg) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>PymeWebPro</title><style>${PAY_STYLE}</style></head>
<body><div class="wrap"><div class="brand">Pyme<span>WebPro</span></div>
  <div class="card"><p style="margin:0">${escapeHtml(msg)}</p></div>
</div></body></html>`;
}
