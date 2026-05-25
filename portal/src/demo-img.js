// ============================================================================
// Fake imagery for mockup demo pages.
// ============================================================================
// Cost + quality control: images are generated ONLY by an admin action (the
// "Imágenes" panel in Mi día), never on a public page view. So a prospect or a
// crawler can never trigger a paid generation or lock in a bad image. Generated
// images are cached in R2 (ASSETS) and served from there forever (one-time
// cost, a handful of shared images total). If an image has not been generated
// yet, the public route serves a clean brand-gradient SVG so nothing breaks.
// ============================================================================

// Try several image-capable Gemini models in order (key/region access varies).
const IMG_MODELS = [
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/";

// The shared set. Dental prompts show teeth, smiles and braces on purpose.
const PROMPTS = {
  "dental-hero":   "Photorealistic bright modern dental clinic, a happy patient smiling in the dental chair while a friendly dentist works, clean teal and white interior, natural light. No text, no watermark, no logos.",
  "dental-smile":  "Photorealistic extreme close-up of a healthy bright white natural smile with perfectly straight teeth, professional dental photography, soft studio lighting. No text, no watermark.",
  "dental-braces": "Photorealistic close-up of a smiling mouth wearing clear ceramic dental braces on slightly crooked teeth, bright and clean, professional dental photo. No text, no watermark.",
  "generic-hero":  "Photorealistic bright modern small business interior, welcoming and professional, natural light. No text, no watermark, no logos.",
  "generic-team":  "Photorealistic friendly professional helping a happy customer in a bright modern setting, warm and welcoming. No text, no watermark.",
};

export const DEMO_IMG_KEYS = Object.keys(PROMPTS);

function r2Key(key) { return "demo-img/" + key + ".png"; }

function fallbackSVG(key) {
  const dental = String(key).indexOf("dental") === 0;
  const a = dental ? "#0E8C8C" : "#B5562A", b = dental ? "#0E2433" : "#1A1B22";
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='520'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='" + a + "'/><stop offset='1' stop-color='" + b + "'/></linearGradient></defs><rect width='800' height='520' fill='url(#g)'/></svg>";
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=600" } });
}

// Public: serve the cached image, or a gradient fallback. Never generates.
export async function serveDemoImg(env, key) {
  if (!PROMPTS[key]) return new Response("Not found", { status: 404 });
  try {
    const obj = await env.ASSETS.get(r2Key(key));
    if (obj) return new Response(obj.body, { headers: { "Content-Type": (obj.httpMetadata && obj.httpMetadata.contentType) || "image/png", "Cache-Control": "public, max-age=86400" } });
  } catch (e) {}
  return fallbackSVG(key);
}

// Admin: generate (or regenerate) one image via Gemini and store it in R2.
// Returns { ok, key, bytes } or { ok:false, error }.
export async function genDemoImg(env, key) {
  const prompt = PROMPTS[key];
  if (!prompt) return { ok: false, error: "Unknown image key: " + key };
  if (!env.GEMINI_API_KEY) return { ok: false, error: "GEMINI_API_KEY not set on the worker" };
  const errors = [];
  for (const model of IMG_MODELS) {
    let r;
    try {
      r = await fetch(GEMINI_API + model + ":generateContent?key=" + env.GEMINI_API_KEY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
      });
    } catch (e) { errors.push(model + ": fetch " + String(e && e.message || e)); continue; }
    if (!r.ok) { const t = await r.text(); errors.push(model + ": " + r.status + " " + t.slice(0, 140)); continue; }
    let data;
    try { data = await r.json(); } catch (e) { errors.push(model + ": bad JSON"); continue; }
    const parts = ((((data.candidates || [])[0] || {}).content) || {}).parts || [];
    let b64 = null, mime = "image/png";
    for (const p of parts) { if (p.inlineData && p.inlineData.data) { b64 = p.inlineData.data; mime = p.inlineData.mimeType || mime; break; } }
    if (!b64) { errors.push(model + ": no image in response"); continue; }
    let bytes;
    try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch (e) { errors.push(model + ": decode failed"); continue; }
    try { await env.ASSETS.put(r2Key(key), bytes, { httpMetadata: { contentType: mime } }); } catch (e) { return { ok: false, error: "R2 put failed: " + String(e && e.message || e) }; }
    return { ok: true, key, model, bytes: bytes.length };
  }
  return { ok: false, error: errors.join(" | ") };
}
