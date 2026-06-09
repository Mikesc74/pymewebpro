// wizard.js · PymeWebPro Spanish intake wizard (public, token-gated).
//
// Valentina's start_mockup tool creates a lead in PORTAL_DB at lead_stage='mockup'
// with a random wizard_token, then hands the prospect this link:
//   https://valentina.pymewebpro.com/w/<token>
// The wizard collects their vision + assets (logo + photos) and writes them to
// the lead's intake_data (JSON) + the ASSETS R2 bucket, so the mockup comes out
// to their measure. Mirrors the ChatClick agent wizard, in Spanish, writing to
// the portal leads DB. No em dashes. COP / Colombia.

export async function serveWizard(env, token) {
  if (!env.PORTAL_DB) return htmlResponse(wizardErrorHtml("Este enlace todavía no está activo."), 503);
  let lead;
  try {
    lead = await env.PORTAL_DB.prepare(
      "SELECT id, business_name, name, email, phone, wizard_submitted_at FROM leads WHERE wizard_token = ?"
    ).bind(token).first();
  } catch (e) {
    console.error("wizard lookup failed", e);
    return htmlResponse(wizardErrorHtml("Algo salió mal abriendo tu enlace. Intenta de nuevo."), 500);
  }
  if (!lead) return htmlResponse(wizardErrorHtml("Este enlace no es válido o ya expiró. Vuelve al chat y te enviamos uno nuevo."), 404);
  return htmlResponse(wizardHtml(lead, token));
}

export async function handleWizardSubmit(request, env, token) {
  if (!env.PORTAL_DB) return htmlResponse(wizardErrorHtml("Este enlace todavía no está activo."), 503);
  let lead;
  try {
    lead = await env.PORTAL_DB.prepare("SELECT id, business_name FROM leads WHERE wizard_token = ?").bind(token).first();
  } catch (e) {
    console.error("wizard submit lookup failed", e);
    return htmlResponse(wizardErrorHtml("Algo salió mal. Intenta de nuevo."), 500);
  }
  if (!lead) return htmlResponse(wizardErrorHtml("Este enlace no es válido o ya expiró."), 404);

  let form;
  try { form = await request.formData(); }
  catch { return htmlResponse(wizardErrorHtml("No pudimos leer tu envío. Intenta de nuevo."), 400); }

  const text = (k) => (form.get(k) || "").toString().trim();
  const fields = {
    business_name: text("business_name"),
    services: text("services"),
    differentiators: text("differentiators"),
    city: text("city"),
    phone: text("phone"),
    email: text("email"),
    hours: text("hours"),
    style: text("style"),
    vision: text("vision"),
    current_site: text("current_site"),
  };

  // Uploaded files (logo + photos). Images only, capped size + count.
  const MAX_BYTES = 12 * 1024 * 1024;
  const uploads = [];
  const candidates = [];
  const logo = form.get("logo");
  if (logo && typeof logo === "object" && logo.size) candidates.push({ field: "logo", file: logo });
  for (const p of form.getAll("photos")) {
    if (p && typeof p === "object" && p.size) candidates.push({ field: "photo", file: p });
  }
  let stored = 0;
  for (const { field, file } of candidates) {
    if (stored >= 10) break;
    if (!/^image\//.test(file.type || "")) continue;
    if (file.size > MAX_BYTES) continue;
    const safe = sanitizeFilename(file.name || `${field}.bin`);
    const key = `wizard/${lead.id}/${field}-${Date.now()}-${safe}`;
    try {
      if (env.ASSETS) {
        await env.ASSETS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        uploads.push({ field, key, name: file.name || safe, type: file.type, size: file.size });
        stored++;
      }
    } catch (e) {
      console.error("wizard upload failed", key, e);
    }
  }

  const now = Date.now();
  const intakeData = JSON.stringify({ ...fields, files: uploads, submitted_at: now });
  try {
    await env.PORTAL_DB.prepare(
      `UPDATE leads SET
         business_name = COALESCE(NULLIF(?, ''), business_name),
         email = COALESCE(NULLIF(?, ''), email),
         phone = COALESCE(NULLIF(?, ''), phone),
         intake_data = ?,
         wizard_submitted_at = ?,
         updated_at = ?
       WHERE wizard_token = ?`
    ).bind(fields.business_name, fields.email, fields.phone, intakeData, now, now, token).run();
  } catch (e) {
    console.error("wizard submit update failed", e);
    return htmlResponse(wizardErrorHtml("No pudimos guardar eso. Intenta de nuevo en un momento."), 500);
  }

  return htmlResponse(wizardDoneHtml(fields.business_name || lead.business_name || ""));
}

function sanitizeFilename(name) {
  return String(name).replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "file";
}

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const WIZARD_STYLE = `
  :root{--ink:#11261f;--ink-soft:#33473f;--paper:#fff;--paper-soft:#f4f8f6;--accent:#15573B;--accent-bright:#1d7a52;--line:#cdd9d3;}
  *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--paper-soft);line-height:1.55;-webkit-font-smoothing:antialiased}
  .wrap{max-width:640px;margin:0 auto;padding:32px 20px 64px}
  .brand{font-weight:800;font-size:20px;letter-spacing:-.01em;margin-bottom:24px}.brand span{color:var(--accent)}
  h1{font-size:29px;letter-spacing:-.02em;margin:0 0 8px}.sub{color:var(--ink-soft);font-size:16px;margin:0 0 28px}
  .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}
  label{display:block;font-weight:700;font-size:14px;margin:0 0 6px}.hint{font-weight:400;color:var(--ink-soft);font-size:13px}
  input[type=text],input[type=email],input[type=tel],textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:8px;font-size:15px;font-family:inherit;background:#fff}
  textarea{min-height:84px;resize:vertical}input:focus,textarea:focus{outline:none;border-color:var(--accent)}
  input[type=file]{font-size:14px}.field{margin-bottom:18px}.field:last-child{margin-bottom:0}
  .btn{display:block;width:100%;padding:15px;border:none;border-radius:9px;background:var(--accent);color:#fff;font-size:17px;font-weight:600;cursor:pointer}
  .btn:hover{background:var(--accent-bright)}.foot{text-align:center;color:var(--ink-soft);font-size:13px;margin-top:18px}
  .done{text-align:center;padding:48px 0}.done .tick{font-size:48px}
`;

function wizardHtml(lead, token) {
  const v = (s) => escapeHtml(s || "");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Cuéntanos de tu negocio · PymeWebPro</title><style>${WIZARD_STYLE}</style></head>
<body><div class="wrap">
  <div class="brand">Pyme<span>WebPro</span></div>
  <h1>Unos datos para armar tu página</h1>
  <p class="sub">Toma unos tres minutos y es opcional, pero entre más nos cuentes, mejor te queda la muestra gratis. Nada de esto es un compromiso ni tienes que pagar.</p>
  <form method="POST" action="/api/w/${encodeURIComponent(token)}" enctype="multipart/form-data">
    <div class="card">
      <div class="field"><label>Nombre del negocio</label><input type="text" name="business_name" value="${v(lead.business_name)}" placeholder="El nombre de tu negocio"></div>
      <div class="field"><label>Qué haces <span class="hint">tus productos o servicios principales</span></label><textarea name="services" placeholder="ej. reparación de neveras, instalación de aires, servicio 24/7"></textarea></div>
      <div class="field"><label>Qué te hace diferente <span class="hint">por qué te eligen</span></label><textarea name="differentiators" placeholder="ej. negocio familiar, servicio el mismo día, 20 años en el barrio, garantía"></textarea></div>
      <div class="field"><label>Ciudad / zona de servicio</label><input type="text" name="city" placeholder="ej. Medellín y alrededores"></div>
      <div class="field"><label>Horario <span class="hint">opcional</span></label><input type="text" name="hours" placeholder="ej. Lun a Vie 8 a 6, Sáb 9 a 2"></div>
    </div>
    <div class="card">
      <div class="field"><label>WhatsApp / teléfono</label><input type="tel" name="phone" value="${v(lead.phone)}" placeholder="+57 3xx xxx xxxx"></div>
      <div class="field"><label>Correo</label><input type="email" name="email" value="${v(lead.email)}" placeholder="tu@negocio.com"></div>
      <div class="field"><label>Página actual <span class="hint">si tienes</span></label><input type="text" name="current_site" placeholder="https://"></div>
      <div class="field"><label>Estilo / colores <span class="hint">opcional</span></label><input type="text" name="style" placeholder="ej. moderno, colores de mi logo, serio y profesional"></div>
    </div>
    <div class="card">
      <div class="field"><label>Tu visión <span class="hint">qué quieres lograr con tu página</span></label><textarea name="vision" placeholder="Cuéntanos en tus palabras qué quieres que sienta y haga tu cliente al entrar."></textarea></div>
      <div class="field"><label>Tu logo <span class="hint">imagen, opcional</span></label><input type="file" name="logo" accept="image/*"></div>
      <div class="field"><label>Fotos del negocio <span class="hint">puedes subir varias</span></label><input type="file" name="photos" accept="image/*" multiple></div>
    </div>
    <button class="btn" type="submit">Enviar</button>
    <p class="foot">Tus datos solo se usan para armar tu página. Sin compromiso.</p>
  </form>
</div></body></html>`;
}

function wizardDoneHtml(biz) {
  const b = escapeHtml(biz || "tu negocio");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Recibido · PymeWebPro</title><style>${WIZARD_STYLE}</style></head>
<body><div class="wrap"><div class="brand">Pyme<span>WebPro</span></div>
  <div class="done"><div class="tick">&#10003;</div><h1>Recibido, gracias</h1>
  <p class="sub">Ya tenemos lo que necesitamos para armar la muestra de ${b}. Te escribimos por WhatsApp en cuanto esté lista para que la revises. Sin compromiso.</p></div>
</div></body></html>`;
}

function wizardErrorHtml(msg) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>PymeWebPro</title><style>${WIZARD_STYLE}</style></head>
<body><div class="wrap"><div class="brand">Pyme<span>WebPro</span></div>
  <div class="card"><p style="margin:0">${escapeHtml(msg)}</p></div>
</div></body></html>`;
}
