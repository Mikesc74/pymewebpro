// Preview viewer + share-link verification + comment widget.
// Routes:
//   GET  /preview/:shareToken/             -> serves index.html (with comment widget injected)
//   GET  /preview/:shareToken/asset/:name  -> serves R2 asset
//   POST /preview/:shareToken/comment      -> records a revision row (author=client)
import { verifyShareToken } from "./auth";
import { Env, html, json, notFound, nowSec, uuid } from "./util";

async function loadShare(env: Env, token: string) {
  const verified = await verifyShareToken(env, token);
  if (!verified) return null;
  const link = await env.DB.prepare(
    "SELECT id, project_id, expires_at, revoked FROM share_links WHERE id = ?",
  ).bind(verified.linkId).first<{ id: string; project_id: string; expires_at: number; revoked: number }>();
  if (!link || link.revoked || link.expires_at < nowSec()) return null;
  return link;
}

export async function previewIndex(env: Env, token: string): Promise<Response> {
  const link = await loadShare(env, token);
  if (!link) return notFound("Enlace caducado o no válido");
  const proj = await env.DB.prepare(
    "SELECT current_mockup FROM projects WHERE id = ?",
  ).bind(link.project_id).first<{ current_mockup: string | null }>();
  if (!proj?.current_mockup) return notFound("Sin mockup todavía");
  const obj = await env.ASSETS.get(`${proj.current_mockup}/index.html`);
  if (!obj) return notFound("Mockup no encontrado");
  let body = await obj.text();
  body = injectCommentWidget(body, token);
  return html(body);
}

export async function previewAsset(env: Env, token: string, name: string): Promise<Response> {
  const link = await loadShare(env, token);
  if (!link) return notFound();
  const proj = await env.DB.prepare(
    "SELECT current_mockup FROM projects WHERE id = ?",
  ).bind(link.project_id).first<{ current_mockup: string | null }>();
  if (!proj?.current_mockup) return notFound();
  const obj = await env.ASSETS.get(`${proj.current_mockup}/asset/${name}`);
  if (!obj) return notFound();
  return new Response(obj.body, {
    headers: { "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream" },
  });
}

export async function previewComment(env: Env, token: string, req: Request): Promise<Response> {
  const link = await loadShare(env, token);
  if (!link) return new Response("invalid", { status: 401 });
  const body = await req.json<{ section?: string; comment: string }>();
  if (!body?.comment) return new Response("comment required", { status: 400 });
  await env.DB.prepare(
    "INSERT INTO revisions (id, project_id, share_link_id, section, comment, author) VALUES (?,?,?,?,?, 'client')",
  ).bind(uuid(), link.project_id, link.id, body.section ?? null, body.comment).run();
  await env.DB.prepare(
    "UPDATE projects SET status = CASE WHEN status='shared' THEN 'revising' ELSE status END WHERE id = ?",
  ).bind(link.project_id).run();
  return json({ ok: true });
}

function injectCommentWidget(htmlSrc: string, token: string): string {
  const widget = `
<style>
#__cw_btn{position:fixed;bottom:20px;right:20px;background:#003893;color:#fff;padding:14px 18px;border-radius:999px;font-family:system-ui;font-weight:600;cursor:pointer;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.2)}
#__cw_panel{position:fixed;bottom:80px;right:20px;width:340px;background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px;font-family:system-ui;display:none;z-index:99999}
#__cw_panel h3{margin:0 0 8px;font-size:1rem}
#__cw_panel select,#__cw_panel textarea{width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font:inherit;margin-top:6px}
#__cw_panel textarea{min-height:90px}
#__cw_panel button{margin-top:10px;background:#003893;color:#fff;border:0;padding:9px 14px;border-radius:6px;font-weight:600;cursor:pointer}
#__cw_msg{margin-top:8px;font-size:.85rem}
.__cw_outline{outline:2px dashed #003893;outline-offset:4px}
</style>
<div id="__cw_btn" onclick="__cwToggle()">💬 Comentar</div>
<div id="__cw_panel">
  <h3>Deje un comentario</h3>
  <label style="font-size:.85rem">Sección</label>
  <select id="__cw_section"></select>
  <textarea id="__cw_text" placeholder="¿Qué le gustaría cambiar?"></textarea>
  <button onclick="__cwSend()">Enviar</button>
  <div id="__cw_msg"></div>
</div>
<script>
const __cwToken = ${JSON.stringify(token)};
function __cwToggle(){
  const p=document.getElementById('__cw_panel');
  p.style.display = p.style.display==='block'?'none':'block';
  if(p.style.display==='block'){
    const sel=document.getElementById('__cw_section');
    sel.innerHTML='<option value="">— general —</option>';
    document.querySelectorAll('[data-section]').forEach(el=>{
      const o=document.createElement('option');o.value=el.dataset.section;o.textContent=el.dataset.section;
      sel.appendChild(o);
    });
    sel.onchange=()=>{document.querySelectorAll('.__cw_outline').forEach(e=>e.classList.remove('__cw_outline'));
      const t=document.querySelector('[data-section="'+sel.value+'"]');if(t){t.classList.add('__cw_outline');t.scrollIntoView({behavior:'smooth',block:'center'})}};
  }
}
async function __cwSend(){
  const section=document.getElementById('__cw_section').value;
  const comment=document.getElementById('__cw_text').value.trim();
  if(!comment)return;
  const r=await fetch('/preview/'+__cwToken+'/comment',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({section,comment})});
  const j=await r.json();
  document.getElementById('__cw_msg').textContent = j.ok?'¡Gracias! Recibido.':'Error al enviar';
  if(j.ok){document.getElementById('__cw_text').value='';}
}
</script>`;
  if (htmlSrc.includes("</body>")) return htmlSrc.replace("</body>", widget + "</body>");
  return htmlSrc + widget;
}
