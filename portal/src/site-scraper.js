// site-scraper.js · 2026-05-27
//
// Lightweight homepage scraper used by the mockup v2 generator. Given a URL,
// fetches the page, extracts the facts the page-writer needs to draft copy:
// title, og metadata, h1/h2 text, lists that look like services, contact
// info (phone, email, address, hours), social URLs, and the OG/Twitter image
// (used as a logo / hero fallback).
//
// Design notes:
// - Workers fetch with a User-Agent set so most sites don't 403 us.
// - We cap the body read at ~600kB so a runaway page can't blow the 1MB
//   subrequest body limit.
// - No DOM parser available on the worker · we use targeted regexes against
//   the raw HTML. That's lossy but fine for the "extract a few facts" job.
// - On error we return {ok:false, error} so the orchestrator can include a
//   reason in mockup_data.diagnostics without throwing.
//
// Callers: portal/src/mockup-generator.js

const MAX_BYTES = 600 * 1024;
const UA = "Mozilla/5.0 (compatible; PymeWebPro-MockupBot/1.0; +https://pymewebpro.com/bot)";

export async function scrapeSite(rawUrl, { timeoutMs = 15000 } = {}) {
  if (!rawUrl) return { ok: false, error: "no url" };
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false, error: "invalid url" };

  let html = "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, error: "HTTP " + r.status, url };
    const reader = r.body && r.body.getReader();
    if (!reader) html = await r.text();
    else {
      const dec = new TextDecoder("utf-8", { fatal: false });
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        html += dec.decode(value, { stream: true });
        if (total >= MAX_BYTES) { try { reader.cancel(); } catch {} break; }
      }
      html += dec.decode();
    }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), url };
  }

  // Strip <script> and <style> so we don't pick up CSS class names or JSON
  // fragments as if they were content.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const meta = extractMeta(html);
  const title = stripHtml(meta.title || firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)).slice(0, 200);
  const ogImage = abs(meta["og:image"], url);
  const ogDesc = meta["og:description"] || meta["description"] || "";
  const themeColor = meta["theme-color"] || null;
  const lang = (firstMatch(html, /<html[^>]+lang=["']([^"']+)["']/i) || "").slice(0, 8);

  const h1 = allTexts(cleaned, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 3, 200);
  const h2 = allTexts(cleaned, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 12, 160);
  const h3 = allTexts(cleaned, /<h3[^>]*>([\s\S]*?)<\/h3>/gi, 20, 140);

  // List items · often where "Servicios" / "Productos" sections live. Capped
  // because navs and footers add noise; the orchestrator dedupes later.
  const lis = allTexts(cleaned, /<li[^>]*>([\s\S]*?)<\/li>/gi, 80, 200)
    .filter((s) => s.length >= 4 && s.length <= 180);

  // Contact info · best-effort regex pulls.
  const emails = uniq(allMatches(cleaned, /[\w.+-]+@[\w-]+\.[\w.-]+/g)).slice(0, 5);
  // Colombian-ish phone numbers (allow +57, spaces, dashes, parens). We dedupe
  // by digits-only to merge "(604) 123-4567" and "604-123-4567".
  const phoneRaw = allMatches(cleaned, /(?:\+?57[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?){2,3}\d{2,4}/g)
    .map((s) => s.trim()).filter((s) => s.replace(/\D/g, "").length >= 7);
  const phones = uniq(phoneRaw.map((s) => s.replace(/\D/g, ""))).map((d, i) => phoneRaw[i] || d).slice(0, 5);

  // Social URLs.
  const social = {
    instagram: firstMatch(cleaned, /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)\/?/i),
    facebook:  firstMatch(cleaned, /https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9_.\-/]+)/i),
    tiktok:    firstMatch(cleaned, /https?:\/\/(?:www\.)?tiktok\.com\/(@[A-Za-z0-9_.]+)/i),
    youtube:   firstMatch(cleaned, /https?:\/\/(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9_.\-]+|channel\/[A-Za-z0-9_\-]+)/i),
    twitter:   firstMatch(cleaned, /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)/i),
  };

  // Inline image candidates · loose filter (Mike: previous version threw out
  // real photos because their URL had "logo" in the path). We dedupe by stem,
  // drop only the obvious junk (data URIs, tracking pixels, SVG sprites with
  // no business value). Includes <img src>, srcset's best entry, <source>
  // inside <picture>, and CSS background-image: url(...) on inline styles.
  const imgUrls = [];
  // <img src>
  for (const m of allMatches(cleaned, /<img\b[^>]+?\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const mm = /src\s*=\s*["']([^"']+)["']/i.exec(m); if (mm) imgUrls.push(mm[1]);
  }
  // <img srcset> · grab last (highest-res) candidate
  for (const m of allMatches(cleaned, /<img\b[^>]+?\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    const mm = /srcset\s*=\s*["']([^"']+)["']/i.exec(m); if (mm) {
      const last = mm[1].split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
      if (last) imgUrls.push(last);
    }
  }
  // <source srcset> inside <picture>
  for (const m of allMatches(cleaned, /<source\b[^>]+?\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    const mm = /srcset\s*=\s*["']([^"']+)["']/i.exec(m); if (mm) {
      const last = mm[1].split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
      if (last) imgUrls.push(last);
    }
  }
  // CSS background-image: url(...) on inline styles
  for (const m of allMatches(cleaned, /background(?:-image)?\s*:\s*url\(\s*["']?([^)"'\s]+)["']?\s*\)/gi)) {
    const mm = /url\(\s*["']?([^)"'\s]+)/i.exec(m); if (mm) imgUrls.push(mm[1]);
  }
  const imgSrcs = uniq(imgUrls)
    .map((s) => abs(s, url))
    .filter(Boolean)
    .filter((s) => !/^data:/i.test(s))
    // SVG: drop unless it's clearly a logo (then we still want it as a logo source)
    .filter((s) => !/\.svg(?:\?|$)/i.test(s) || /logo|brand/i.test(s))
    // Drop tracking pixels, analytics beacons.
    .filter((s) => !/(\b1x1\b|pixel\.|tracking|beacon|analytics|gtag|googletagmanager|facebook\.com\/tr)/i.test(s))
    // Drop obvious WordPress emoji + admin chrome.
    .filter((s) => !/wp-includes\/images\/(?:smilies|wlw)/i.test(s))
    .slice(0, 24);

  // Favicon · try a few common locations from the head.
  const favicon = abs(
    firstMatch(html, /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i) ||
      "/favicon.ico",
    url,
  );

  // Hours · loose Spanish heuristic ("Lunes a Sábado 9 a 7", "L-S 9-7", etc.).
  // Best-effort, the AI writer is the one that turns this into nice text.
  const hoursHits = uniq(allMatches(cleaned, /(?:lun(?:es)?|mar(?:tes)?|mi[eé]rcoles|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?)[^<]{0,80}\d{1,2}[:\s.h]?\d{0,2}\s*(?:a|-|hasta|to)\s*\d{1,2}/gi))
    .slice(0, 4);

  return {
    ok: true,
    url,
    final_url: url,
    title,
    description: stripHtml(ogDesc).slice(0, 400),
    og_image: ogImage,
    favicon,
    lang,
    theme_color: themeColor,
    headings: { h1, h2, h3 },
    lists: lis,
    emails,
    phones,
    social,
    images: imgSrcs,
    hours_hits: hoursHits,
    bytes: html.length,
  };
}

// ---- internals -------------------------------------------------------------

function normalizeUrl(s) {
  s = String(s || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try { return new URL(s).toString(); } catch { return null; }
}

function abs(u, base) {
  if (!u) return null;
  try { return new URL(u, base).toString(); } catch { return null; }
}

function firstMatch(s, re) { const m = s.match(re); return m ? m[1] : null; }
function allMatches(s, re) {
  const out = []; let m;
  if (!re.global) re = new RegExp(re.source, re.flags + "g");
  while ((m = re.exec(s)) !== null) { out.push(m[0]); if (out.length > 500) break; }
  return out;
}

function extractMeta(html) {
  const out = {};
  const re = /<meta\b[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m; while ((m = re.exec(html)) !== null) { out[m[1].toLowerCase()] = decodeEntities(m[2]); if (Object.keys(out).length > 60) break; }
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleM) out.title = decodeEntities(stripHtml(titleM[1]));
  return out;
}

function allTexts(s, re, limit, maxLen) {
  const out = []; let m;
  if (!re.global) re = new RegExp(re.source, re.flags + "g");
  while ((m = re.exec(s)) !== null) {
    const t = decodeEntities(stripHtml(m[1])).trim();
    if (t && t.length <= maxLen) out.push(t);
    if (out.length >= limit) break;
  }
  return uniq(out);
}

function stripHtml(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function uniq(arr) { const seen = new Set(); const out = []; for (const v of arr) { if (!seen.has(v)) { seen.add(v); out.push(v); } } return out; }

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
