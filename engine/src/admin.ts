// Admin portal: dashboard, project view, mockup gen, share-link mint, ship final.
import { adminCookieHeader, clearAdminCookie, generateShareLinkRow, isAdmin, loginAdmin, signShareToken } from "./auth";
import { Env, escapeHtml, html, json, nowSec, uuid } from "./util";
import { shell } from "./templates";
import { generateMockup, applyRevision } from "./mockup";
import { sendShareLinkToAdmin } from "./email";
import { deployFinal } from "./deploy";

export async function adminLoginGet(): Promise<Response> {
  return html(shell("Admin · login", `
    <div class="card">
      <h1>Admin</h1>
      <form method="POST" action="/admin/login">
        <label>Contraseña</label>
        <input name="password" type="password" required autofocus>
        <p style="margin-top:14px"><button class="btn" type="submit">Entrar</button></p>
      </form>
    </div>`));
}

export async function adminLoginPost(req: Request, env: Env): Promise<Response> {
  const form = await req.formData();
  const pw = String(form.get("password") ?? "");
  const sid = await loginAdmin(env, pw);
  if (!sid) return html(shell("Admin", `<div class="flash err">Contraseña incorrecta</div>` + `<p><a href="/admin/login">Reintentar</a></p>`), { status: 401 });
  return new Response("", { status: 302, headers: { location: "/admin", "set-cookie": adminCookieHeader(sid) } });
}

export async function adminLogout(): Promise<Response> {
  return new Response("", { status: 302, headers: { location: "/admin/login", "set-cookie": clearAdminCookie() } });
}

export async function adminDashboard(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(`
    SELECT p.id, p.status, p.updated_at, p.intake_json,
           o.customer_email, o.customer_name, o.amount_cents, o.reference
    FROM projects p JOIN orders o ON o.id = p.order_id
    ORDER BY p.updated_at DESC LIMIT 200
  `).all<{ id: string; status: string; updated_at: number; intake_json: string | null; customer_email: string; customer_name: string; amount_cents: number; reference: string }>();

  const fmt = (s: number) => new Date(s * 1000).toLocaleString("es-CO");
  const tag = (s: string) => {
    const cls = s === "delivered" ? "ok" : (s === "awaiting_intake" || s === "revising") ? "warn" : "";
    return `<span class="tag ${cls}">${s}</span>`;
  };

  const body = `
<div style="display:flex;justify-content:space-between;align-items:center">
  <h1>Proyectos</h1>
  <a class="btn ghost" href="/admin/logout">Salir</a>
</div>
<div class="card">
<table>
<thead><tr><th>Cliente</th><th>Estado</th><th>Ref</th><th>Monto</th><th>Actualizado</th><th></th></tr></thead>
<tbody>
${rows.results.map((r) => {
  const intake = r.intake_json ? JSON.parse(r.intake_json) : {};
  const name = intake.business_name || r.customer_name || r.customer_email || "—";
  return `<tr>
    <td><strong>${escapeHtml(name)}</strong><br><small>${escapeHtml(r.customer_email || "")}</small></td>
    <td>${tag(r.status)}</td>
    <td><small>${escapeHtml(r.reference)}</small></td>
    <td>$${(r.amount_cents/100).toLocaleString("es-CO")} COP</td>
    <td><small>${fmt(r.updated_at)}</small></td>
    <td><a class="btn ghost" href="/admin/project/${r.id}">Abrir</a></td>
  </tr>`;
}).join("")}
${rows.results.length === 0 ? `<tr><td colspan="6"><em class="muted">Aún no hay proyectos.</em></td></tr>` : ""}
</tbody></table>
</div>`;
  return html(shell("Admin · proyectos", body));
}

export async function adminProject(env: Env, projectId: string): Promise<Response> {
  const proj = await env.DB.prepare(`
    SELECT p.*, o.customer_email, o.customer_name, o.reference, o.amount_cents
    FROM projects p JOIN orders o ON o.id = p.order_id WHERE p.id = ?
  `).bind(projectId).first<any>();
  if (!proj) return new Response("not found", { status: 404 });

  const intake = proj.intake_json ? JSON.parse(proj.intake_json) : null;
  const mockups = await env.DB.prepare(
    "SELECT id, version, r2_prefix, created_at FROM mockups WHERE project_id = ? ORDER BY version DESC",
  ).bind(projectId).all<any>();
  const revisions = await env.DB.prepare(
    "SELECT id, section, comment, author, status, created_at FROM revisions WHERE project_id = ? ORDER BY created_at DESC",
  ).bind(projectId).all<any>();
  const links = await env.DB.prepare(
    "SELECT id, token, expires_at, revoked, created_at FROM share_links WHERE project_id = ? ORDER BY created_at DESC",
  ).bind(projectId).all<any>();
  const upsells = await env.DB.prepare(
    "SELECT id, sku, label, amount_cents, status FROM upsells WHERE project_id = ?",
  ).bind(projectId).all<any>();

  const fmt = (s: number) => new Date(s * 1000).toLocaleString("es-CO");

  const body = `
<p><a href="/admin">← Proyectos</a></p>
<h1>${escapeHtml(intake?.business_name || proj.customer_name || proj.customer_email || projectId)}</h1>
<p><span class="tag">${proj.status}</span> · ref ${escapeHtml(proj.reference)} · $${(proj.amount_cents/100).toLocaleString("es-CO")} COP</p>

<div class="card">
  <h2>Acciones</h2>
  <form method="POST" action="/admin/project/${projectId}/generate" style="display:inline">
    <button class="btn" ${intake ? "" : "disabled"}>${mockups.results.length ? "Regenerar mockup" : "Generar mockup"}</button>
  </form>
  <form method="POST" action="/admin/project/${projectId}/share" style="display:inline">
    <button class="btn ghost" ${proj.current_mockup ? "" : "disabled"}>Generar enlace temp (7 días)</button>
  </form>
  <form method="POST" action="/admin/project/${projectId}/ship" style="display:inline" onsubmit="return confirm('¿Desplegar a producción?')">
    <button class="btn red" ${proj.current_mockup ? "" : "disabled"}>Lanzar final</button>
  </form>
</div>

<div class="card">
  <h2>Datos del cliente (intake)</h2>
  ${intake ? `<pre style="white-space:pre-wrap;background:#fbf8e8;padding:12px;border-radius:8px;font-size:.85rem">${escapeHtml(JSON.stringify(intake, null, 2))}</pre>` : `<p class="muted">El cliente aún no envió sus datos.</p><p><small>Enlace de intake: <code>/intake/${escapeHtml(proj.intake_token)}</code></small></p>`}
</div>

<div class="card">
  <h2>Mockups</h2>
  ${mockups.results.length === 0 ? `<p class="muted">Sin mockups todavía.</p>` :
    mockups.results.map((m: any) => `<p>v${m.version} · <small>${fmt(m.created_at)}</small> · <code>${escapeHtml(m.r2_prefix)}</code> ${m.r2_prefix === proj.current_mockup ? '<span class="tag ok">actual</span>' : ''}</p>`).join("")}
</div>

<div class="card">
  <h2>Enlaces compartidos</h2>
  ${links.results.length === 0 ? `<p class="muted">Sin enlaces.</p>` :
    links.results.map((l: any) => `<p><code>/preview/&lt;token&gt;/</code> · expira ${fmt(l.expires_at)} ${l.revoked ? '<span class="tag warn">revocado</span>' : ''}<br><small>token id: ${escapeHtml(l.id)}</small></p>`).join("")}
</div>

<div class="card">
  <h2>Comentarios del cliente</h2>
  ${revisions.results.length === 0 ? `<p class="muted">Sin comentarios.</p>` :
    revisions.results.map((r: any) => `<div style="border-left:3px solid #003893;padding:6px 12px;margin:8px 0">
      <small>${r.author} · ${escapeHtml(r.section || 'general')} · ${fmt(r.created_at)}</small>
      <p>${escapeHtml(r.comment)}</p>
      <form method="POST" action="/admin/revision/${r.id}/apply" style="display:inline">
        <input type="hidden" name="instruction" value="${escapeHtml(r.comment)}">
        <button class="btn ghost">Aplicar con Claude</button>
      </form>
    </div>`).join("")}
</div>

<div class="card">
  <h2>Upsells</h2>
  ${upsells.results.length === 0 ? `<p class="muted">Sin upsells.</p>` :
    upsells.results.map((u: any) => `<p>${escapeHtml(u.label)} — $${(u.amount_cents/100).toLocaleString("es-CO")} COP <span class="tag">${u.status}</span></p>`).join("")}
</div>`;
  return html(shell("Admin · proyecto", body));
}

export async function adminGenerate(env: Env, projectId: string): Promise<Response> {
  await generateMockup(env, projectId);
  return new Response("", { status: 302, headers: { location: `/admin/project/${projectId}` } });
}

export async function adminShare(env: Env, projectId: string): Promise<Response> {
  const row = generateShareLinkRow();
  const expiresAt = nowSec() + 60 * 60 * 24 * 7;
  await env.DB.prepare(
    "INSERT INTO share_links (id, project_id, token, expires_at) VALUES (?,?,?,?)",
  ).bind(row.id, projectId, row.token, expiresAt).run();
  await env.DB.prepare(
    "UPDATE projects SET status = CASE WHEN status='mockup_ready' THEN 'shared' ELSE status END WHERE id = ?",
  ).bind(projectId).run();

  const signed = await signShareToken(env, row.id, expiresAt);
  const url = `${env.PUBLIC_BASE_URL}/preview/${signed}/`;
  await sendShareLinkToAdmin(env, projectId, url).catch(() => {});

  return html(shell("Enlace listo", `
    <div class="card">
      <h1>Enlace temporal listo</h1>
      <p>Caduca: ${new Date(expiresAt * 1000).toLocaleString("es-CO")}</p>
      <p><input type="text" value="${escapeHtml(url)}" readonly style="font-family:monospace" onclick="this.select()"></p>
      <p><a class="btn" href="${escapeHtml(url)}" target="_blank">Abrir</a> <a class="btn ghost" href="/admin/project/${projectId}">Volver</a></p>
    </div>`));
}

export async function adminApplyRevision(env: Env, revisionId: string, req: Request): Promise<Response> {
  const form = await req.formData();
  const instruction = String(form.get("instruction") ?? "");
  const rev = await env.DB.prepare("SELECT project_id FROM revisions WHERE id = ?")
    .bind(revisionId).first<{ project_id: string }>();
  if (!rev) return new Response("not found", { status: 404 });
  await applyRevision(env, rev.project_id, instruction);
  await env.DB.prepare("UPDATE revisions SET status='addressed' WHERE id = ?").bind(revisionId).run();
  return new Response("", { status: 302, headers: { location: `/admin/project/${rev.project_id}` } });
}

export async function adminShip(env: Env, projectId: string): Promise<Response> {
  const result = await deployFinal(env, projectId);
  return html(shell("Lanzado", `
    <div class="card">
      <h1>Sitio lanzado</h1>
      <p><a href="${escapeHtml(result.url)}" target="_blank">${escapeHtml(result.url)}</a></p>
      <p><a class="btn ghost" href="/admin/project/${projectId}">Volver</a></p>
    </div>`));
}
