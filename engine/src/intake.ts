// Client intake portal: GET /intake/:token shows form, POST saves intake + uploads.
import { Env, escapeHtml, html, json, nowSec, uuid } from "./util";
import { shell } from "./templates";

export async function intakeGet(token: string, env: Env): Promise<Response> {
  const proj = await env.DB.prepare(
    "SELECT id, status, intake_json FROM projects WHERE intake_token = ?",
  ).bind(token).first<{ id: string; status: string; intake_json: string | null }>();
  if (!proj) return new Response("Enlace no válido", { status: 404 });

  const existing = proj.intake_json ? JSON.parse(proj.intake_json) : {};
  const v = (k: string) => escapeHtml(existing[k] ?? "");

  const body = `
<h1>Cuéntenos sobre su negocio</h1>
<p class="muted">Toda esta información alimentará el mockup de su sitio. Puede regresar y editar en cualquier momento usando este mismo enlace.</p>
${proj.status !== 'awaiting_intake' ? `<div class="flash ok">Ya recibimos sus datos. Si necesita corregir algo, edite y guarde de nuevo.</div>` : ''}
<form method="POST" action="/intake/${token}" enctype="multipart/form-data" class="card">
  <div class="row">
    <div><label>Nombre del negocio</label><input name="business_name" value="${v('business_name')}" required></div>
    <div><label>Sector / industria</label><input name="industry" value="${v('industry')}" required></div>
  </div>
  <label>En una frase, ¿qué hace su negocio?</label>
  <input name="tagline" value="${v('tagline')}" required>

  <label>Servicios o productos principales (uno por línea)</label>
  <textarea name="services" required>${v('services')}</textarea>

  <div class="row">
    <div><label>Teléfono / WhatsApp público</label><input name="phone" value="${v('phone')}"></div>
    <div><label>Email público</label><input name="email" value="${v('email')}"></div>
  </div>

  <label>Dirección o ciudades de cobertura</label>
  <input name="address" value="${v('address')}">

  <label>Horario de atención</label>
  <input name="hours" value="${v('hours')}" placeholder="Lun-Vie 8am-6pm">

  <div class="row">
    <div><label>Instagram</label><input name="instagram" value="${v('instagram')}"></div>
    <div><label>Facebook</label><input name="facebook" value="${v('facebook')}"></div>
  </div>

  <div class="row">
    <div><label>¿Tiene dominio propio?</label>
      <select name="domain_status">
        <option value="own"${existing.domain_status==='own'?' selected':''}>Sí, ya lo tengo</option>
        <option value="buy"${existing.domain_status==='buy'?' selected':''}>Quiero que lo compren por mí</option>
        <option value="subdomain"${existing.domain_status==='subdomain'?' selected':''}>Use un subdominio gratis</option>
      </select></div>
    <div><label>Dominio deseado</label><input name="domain" value="${v('domain')}" placeholder="minegocio.com"></div>
  </div>

  <label>Sitios que le gustan (URLs, uno por línea)</label>
  <textarea name="references">${v('references')}</textarea>

  <label>Colores preferidos (opcional, hex o nombre)</label>
  <input name="colors" value="${v('colors')}" placeholder="azul marino, dorado · #003893 #fcd116">

  <label>Logo (PNG con fondo transparente preferido)</label>
  <input type="file" name="logo" accept="image/*">

  <label>Fotos de su negocio (3-8 imágenes)</label>
  <input type="file" name="photos" accept="image/*" multiple>

  <label>Comentarios adicionales</label>
  <textarea name="notes">${v('notes')}</textarea>

  <p style="margin-top:18px"><button class="btn" type="submit">Guardar y enviar</button></p>
</form>`;
  return html(shell("Su sitio · datos", body));
}

export async function intakePost(token: string, req: Request, env: Env): Promise<Response> {
  const proj = await env.DB.prepare("SELECT id FROM projects WHERE intake_token = ?")
    .bind(token).first<{ id: string }>();
  if (!proj) return new Response("Enlace no válido", { status: 404 });

  const form = await req.formData();
  const fields = [
    "business_name","industry","tagline","services","phone","email","address","hours",
    "instagram","facebook","domain_status","domain","references","colors","notes",
  ];
  const data: Record<string,string> = {};
  for (const f of fields) data[f] = String(form.get(f) ?? "");

  // Save uploads
  const uploads: { kind: string; file: File }[] = [];
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) uploads.push({ kind: "logo", file: logo });
  for (const p of form.getAll("photos")) {
    if (p instanceof File && p.size > 0) uploads.push({ kind: "photo", file: p });
  }
  for (const u of uploads) {
    const id = uuid();
    const safe = u.file.name.replace(/[^\w.\-]/g, "_");
    const key = `projects/${proj.id}/${u.kind}/${id}-${safe}`;
    await env.ASSETS.put(key, u.file.stream(), { httpMetadata: { contentType: u.file.type } });
    await env.DB.prepare(
      "INSERT INTO assets (id, project_id, kind, filename, r2_key, mime, size_bytes) VALUES (?,?,?,?,?,?,?)",
    ).bind(id, proj.id, u.kind, u.file.name, key, u.file.type, u.file.size).run();
  }

  await env.DB.prepare(
    "UPDATE projects SET intake_json = ?, status = CASE WHEN status='awaiting_intake' THEN 'intake_done' ELSE status END, updated_at = ? WHERE id = ?",
  ).bind(JSON.stringify(data), nowSec(), proj.id).run();

  return html(shell("Datos recibidos", `
    <div class="card">
      <h1>¡Gracias!</h1>
      <p>Recibimos sus datos. Le enviaremos un enlace para revisar el primer mockup en menos de 48 horas.</p>
      <p><a class="btn ghost" href="/intake/${token}">Editar datos</a></p>
    </div>`));
}
