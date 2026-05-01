// Mockup generator: takes intake JSON + assets, asks Claude to fill the blueprint, writes bundle to R2.
import { Env, nowSec, uuid } from "./util";
import { renderBlueprint1, BlueprintInput } from "./blueprints/blueprint1";

interface IntakeRaw {
  business_name: string; industry: string; tagline: string; services: string;
  phone?: string; email?: string; address?: string; hours?: string;
  instagram?: string; facebook?: string; colors?: string; references?: string; notes?: string;
}

const SYSTEM = `Eres un editor copy senior de PymeWebPro. Recibes datos crudos de un cliente colombiano (PyME) y devuelves un JSON listo para alimentar un blueprint HTML.
Reglas:
- Español colombiano natural, profesional pero cálido. NO suene a IA. Frases cortas.
- Si datos faltan, INVENTA piezas razonables y conservadoras (no exageres).
- Servicios: máximo 6, cada uno 2-4 palabras.
- "tagline": 6-12 palabras, beneficio claro, no cliché.
- Colores: si el cliente da hex/nombres, conviértelos a hex; si no, elige una paleta apropiada al sector (primary + accent + ink + bg).
Devuelve SOLO JSON con este shape, sin texto extra:
{"businessName":"","tagline":"","industry":"","services":["",""],"phone":"","email":"","address":"","hours":"","instagram":"","facebook":"","primary":"#xxxxxx","accent":"#xxxxxx","ink":"#0a1840","bg":"#fbfaf6","ctaPhone":"","ctaWhatsapp":""}`;

export async function generateMockup(env: Env, projectId: string): Promise<{ version: number; r2Prefix: string; previewKey: string }> {
  const proj = await env.DB.prepare(
    "SELECT id, intake_json, blueprint_id FROM projects WHERE id = ?",
  ).bind(projectId).first<{ id: string; intake_json: string | null; blueprint_id: string }>();
  if (!proj) throw new Error("project not found");
  if (!proj.intake_json) throw new Error("no intake");
  const intake: IntakeRaw = JSON.parse(proj.intake_json);

  // Pull assets
  const assets = await env.DB.prepare(
    "SELECT kind, r2_key FROM assets WHERE project_id = ?",
  ).bind(projectId).all<{ kind: string; r2_key: string }>();
  const logo = assets.results.find((a) => a.kind === "logo");
  const photos = assets.results.filter((a) => a.kind === "photo");

  // Ask Claude
  const userMsg = `Datos crudos del cliente:\n${JSON.stringify(intake, null, 2)}`;
  const filled: Partial<BlueprintInput> = await callClaude(env, SYSTEM, userMsg);

  // Determine version
  const last = await env.DB.prepare(
    "SELECT MAX(version) as v FROM mockups WHERE project_id = ?",
  ).bind(projectId).first<{ v: number | null }>();
  const version = (last?.v ?? 0) + 1;
  const r2Prefix = `projects/${projectId}/mockups/v${version}`;

  // Wire asset URLs (served by /preview/.../asset/*)
  filled.logoUrl = logo ? `./asset/${encodeURIComponent(logo.r2_key.split("/").pop()!)}` : undefined;
  filled.galleryUrls = photos.slice(0, 6).map((p) => `./asset/${encodeURIComponent(p.r2_key.split("/").pop()!)}`);

  const htmlOut = renderBlueprint1(filled);
  const indexKey = `${r2Prefix}/index.html`;
  await env.ASSETS.put(indexKey, htmlOut, { httpMetadata: { contentType: "text/html; charset=utf-8" } });
  // Copy assets into mockup folder for clean serving
  for (const a of [logo, ...photos].filter(Boolean) as { kind: string; r2_key: string }[]) {
    const obj = await env.ASSETS.get(a.r2_key);
    if (!obj) continue;
    const filename = a.r2_key.split("/").pop()!;
    await env.ASSETS.put(`${r2Prefix}/asset/${filename}`, obj.body, {
      httpMetadata: { contentType: obj.httpMetadata?.contentType ?? "application/octet-stream" },
    });
  }

  await env.DB.prepare(
    "INSERT INTO mockups (id, project_id, version, r2_prefix, prompt_used) VALUES (?,?,?,?,?)",
  ).bind(uuid(), projectId, version, r2Prefix, JSON.stringify({ system: SYSTEM, user: userMsg })).run();
  await env.DB.prepare(
    "UPDATE projects SET current_mockup = ?, status = 'mockup_ready', updated_at = ? WHERE id = ?",
  ).bind(r2Prefix, nowSec(), projectId).run();

  return { version, r2Prefix, previewKey: indexKey };
}

async function callClaude(env: Env, system: string, user: string): Promise<any> {
  if (!env.ANTHROPIC_API_KEY) {
    // Dev fallback: shallow heuristic
    const intake = JSON.parse(user.replace(/^Datos crudos del cliente:\n/, ""));
    return {
      businessName: intake.business_name,
      tagline: intake.tagline,
      industry: intake.industry,
      services: String(intake.services || "").split(/\n+/).filter(Boolean).slice(0, 6),
      phone: intake.phone, email: intake.email, address: intake.address, hours: intake.hours,
      instagram: intake.instagram, facebook: intake.facebook,
      primary: "#003893", accent: "#fcd116", ink: "#0a1840", bg: "#fbfaf6",
      ctaPhone: intake.phone, ctaWhatsapp: intake.phone,
    };
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const j = await r.json<any>();
  const text = j.content?.[0]?.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : "{}");
}

export async function applyRevision(env: Env, projectId: string, instruction: string): Promise<{ version: number }> {
  // For v1: re-run generator with the instruction appended as a note in the intake.
  const proj = await env.DB.prepare(
    "SELECT intake_json FROM projects WHERE id = ?",
  ).bind(projectId).first<{ intake_json: string | null }>();
  if (!proj) throw new Error("no project");
  const intake = proj.intake_json ? JSON.parse(proj.intake_json) : {};
  intake.notes = (intake.notes ? intake.notes + "\n" : "") + `[REVISIÓN]: ${instruction}`;
  await env.DB.prepare("UPDATE projects SET intake_json = ? WHERE id = ?")
    .bind(JSON.stringify(intake), projectId).run();
  const r = await generateMockup(env, projectId);
  return { version: r.version };
}
