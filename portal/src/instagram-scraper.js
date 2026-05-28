// instagram-scraper.js · 2026-05-27
//
// Public-HTML Instagram scraper used by the mockup v2 generator. Given a
// handle (with or without leading @), fetches the profile page and pulls:
//   - profile pic (often the best logo we can get for an SMB without a site)
//   - bio (one-line description in their own voice)
//   - the most recent ~9 post thumbnails (real photos of their actual stuff)
//
// IG is fragile and rate-limits aggressively. The orchestrator MUST treat any
// thin/error response as graceful · we still generate the mockup, just flag
// it as `needs_review` so Mike or Santi can spot-check before sending.
//
// Approach:
// 1. Try the public web profile URL with a real-looking User-Agent.
// 2. IG embeds a JSON blob in <script type="application/ld+json"> with
//    `image` (profile pic) and sometimes the bio (via description). Pull
//    that first · it's the most stable shape.
// 3. Try the `?__a=1&__d=dis` JSON endpoint as a backup. Often 401s for
//    unauth requests but worth attempting.
// 4. Fall back to regex extraction from the page-injected `<meta property=
//    "og:image"|"og:description"|"og:title">` tags.
//
// Returns:
//   { ok: true, handle, profile_pic, bio, posts:[{thumb,caption,url}, ...], source }
//   { ok: false, error, handle }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_BYTES = 800 * 1024;
const MAX_POSTS = 9;

export async function scrapeInstagram(rawHandle, { timeoutMs = 12000 } = {}) {
  const handle = String(rawHandle || "").replace(/^@+/, "").trim().replace(/^https?:\/\/(?:www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  if (!handle) return { ok: false, error: "no handle" };
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(handle)) return { ok: false, error: "invalid handle", handle };

  const url = "https://www.instagram.com/" + encodeURIComponent(handle) + "/";
  let html = "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.5",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, error: "HTTP " + r.status, handle, url };
    html = await readCapped(r, MAX_BYTES);
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), handle, url };
  }

  // Path 1 · structured data
  let profile_pic = null, bio = "", posts = [], source = "scrape";

  const ld = extractLdJson(html);
  if (ld) {
    if (ld.image) profile_pic = ld.image;
    if (typeof ld.description === "string") bio = ld.description;
    // Some structured blocks expose recent posts in `mainEntityOfPage` / `image`
    if (Array.isArray(ld.image)) profile_pic = ld.image[0] || profile_pic;
  }

  // Path 2 · og: tags · always present, last-resort
  const meta = extractMeta(html);
  if (!profile_pic && meta["og:image"]) profile_pic = meta["og:image"];
  if (!bio && meta["og:description"]) bio = meta["og:description"];
  if (!bio && meta["description"]) bio = meta["description"];

  // Path 3 · the inlined JSON blob that contains recent posts. The shape
  // changes often, so we use a broad regex to find display_url candidates
  // INSIDE the JSON and treat them as post thumbnails.
  const jsonBlobs = findInlineJsonBlobs(html);
  for (const blob of jsonBlobs) {
    const found = harvestPostsFromBlob(blob);
    if (found.length) { posts = posts.concat(found); if (posts.length >= MAX_POSTS) break; }
  }
  posts = uniqByThumb(posts).slice(0, MAX_POSTS);

  // Bio cleanup · IG often prefixes with "N Followers, M Following, ..."; we
  // strip that boilerplate so the actual bio survives.
  bio = String(bio || "")
    .replace(/^\s*[\d.,KMkm\s]+(?:Followers?|Following|Seguidores|Siguiendo|publicaciones|posts?)[^.]*\./i, "")
    .replace(/See Instagram photos and videos from .*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const ok = !!(profile_pic || bio || posts.length);
  return {
    ok,
    handle,
    url,
    profile_pic,
    bio: bio.slice(0, 500),
    posts,
    source,
    error: ok ? null : "no content extracted",
  };
}

// ---- internals -------------------------------------------------------------

async function readCapped(r, maxBytes) {
  const reader = r.body && r.body.getReader();
  if (!reader) return await r.text();
  const dec = new TextDecoder("utf-8", { fatal: false });
  let out = "", total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    out += dec.decode(value, { stream: true });
    if (total >= maxBytes) { try { reader.cancel(); } catch {} break; }
  }
  out += dec.decode();
  return out;
}

function extractLdJson(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  return null;
}

function extractMeta(html) {
  const out = {};
  const re = /<meta\b[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m; while ((m = re.exec(html)) !== null) { out[m[1].toLowerCase()] = m[2]; if (Object.keys(out).length > 50) break; }
  return out;
}

// Returns up to N inline JSON blobs that look like they contain post data.
// IG embeds these inside script tags · we slurp anything starting with `{`
// and containing `display_url` or `image_versions`, both signals of post media.
function findInlineJsonBlobs(html) {
  const out = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const s = m[1];
    if (s.length < 200) continue;
    if (!/display_url|image_versions|edge_owner_to_timeline_media|profile_pic_url/i.test(s)) continue;
    out.push(s);
    if (out.length > 8) break;
  }
  return out;
}

function harvestPostsFromBlob(blob) {
  // Extract display_url candidates · IG uses `display_url` for full-resolution
  // post images. The accompanying caption sometimes lives in nearby `text`
  // fields but the JSON is too irregular to parse reliably, so we just take
  // the image URLs.
  const out = [];
  const re = /"display_url"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(blob)) !== null) {
    const u = JSON.parse('"' + m[1] + '"'); // decode \u escapes
    if (u && /^https?:\/\//.test(u)) out.push({ thumb: u, caption: "", url: null });
    if (out.length >= MAX_POSTS * 2) break;
  }
  return out;
}

function uniqByThumb(arr) {
  const seen = new Set(); const out = [];
  for (const p of arr) {
    const key = (p.thumb || "").split("?")[0];
    if (!key || seen.has(key)) continue;
    seen.add(key); out.push(p);
  }
  return out;
}
