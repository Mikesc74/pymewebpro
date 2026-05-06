// build-bilingual.mjs — split a bilingual source HTML into two SEO-clean files.
//
// Reads:  manual-mockups/pymewebpro-ca/index.html (single source of truth, has ml-en/ml-es spans
//         and data-lang attrs on title/description/OG meta).
// Writes: index.html       (EN-only DOM, <html lang="en">, EN canonical)
//         es/index.html    (ES-only DOM, <html lang="es">, ES canonical)
//
// Usage:  node scripts/build-bilingual.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "manual-mockups/pymewebpro-ca/index.html");
const OUT_EN = path.join(ROOT, "index.html");
const OUT_ES = path.join(ROOT, "es/index.html");

function buildVariant(html, keepLang) {
  const dropLang = keepLang === "en" ? "es" : "en";

  // 1. Set <html lang="..."> and class for the chosen language
  let out = html.replace(
    /<html\b[^>]*>/i,
    `<html lang="${keepLang}" class="lang-${keepLang}">`
  );

  // 2. Drop any <title>/<meta>/<link> tag tagged with the OTHER language
  // Pattern matches self-closing or paired tags with data-lang="<dropLang>"
  out = out.replace(
    new RegExp(`<title\\s+data-lang="${dropLang}"[^>]*>[\\s\\S]*?<\\/title>`, "g"),
    ""
  );
  out = out.replace(
    new RegExp(`<meta\\s+[^>]*data-lang="${dropLang}"[^>]*>`, "g"),
    ""
  );

  // 3. Strip data-lang attribute from kept tags (clean output)
  out = out.replace(
    new RegExp(`(<title|<meta)([^>]*)\\sdata-lang="${keepLang}"`, "g"),
    "$1$2"
  );

  // 4+5. Strip drop-lang blocks and unwrap keep-lang blocks. Loop until stable
  // because the source can have nested ml-en inside ml-en (or similar).
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = stripMlSpans(out, dropLang);
    out = unwrapMlSpans(out, keepLang);
    if (out === before) break;
  }

  // 6. Add canonical URL pointing to self
  const canonical = keepLang === "en"
    ? "https://pymewebpro.com/"
    : "https://pymewebpro.com/es/";
  out = out.replace(
    /<link rel="alternate" hreflang="x-default"[^>]*>/,
    (m) => m + `\n<link rel="canonical" href="${canonical}">`
  );

  // 7. Mark the active language toggle as "current"
  // <a href="/" data-l="en">EN</a>  → add aria-current="page" if active
  const activeHref = keepLang === "en" ? "/" : "/es/";
  out = out.replace(
    new RegExp(`(<a\\s+href="${escapeRegex(activeHref)}"\\s+data-l="${keepLang}"[^>]*)>`, "g"),
    `$1 aria-current="page">`
  );

  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Strip <span class="ml-XX">...</span> blocks. Handles single-level nesting by
// finding the matching </span> with depth tracking.
function stripMlSpans(html, lang) {
  const open = new RegExp(`<span\\s+class="ml-${lang}"[^>]*>`, "g");
  let result = "";
  let cursor = 0;
  let m;
  while ((m = open.exec(html)) !== null) {
    result += html.slice(cursor, m.index);
    // Find matching </span>
    let depth = 1;
    let scan = open.lastIndex;
    while (depth > 0 && scan < html.length) {
      const nextOpen = html.indexOf("<span", scan);
      const nextClose = html.indexOf("</span>", scan);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        scan = nextOpen + 5;
      } else {
        depth--;
        scan = nextClose + "</span>".length;
        if (depth === 0) {
          cursor = scan;
          open.lastIndex = scan;
          break;
        }
      }
    }
  }
  result += html.slice(cursor);
  return result;
}

// Unwrap <span class="ml-KEEP">CONTENT</span> → CONTENT (preserve inner HTML).
function unwrapMlSpans(html, lang) {
  const open = new RegExp(`<span\\s+class="ml-${lang}"[^>]*>`, "g");
  let result = "";
  let cursor = 0;
  let m;
  while ((m = open.exec(html)) !== null) {
    result += html.slice(cursor, m.index);
    // Find matching </span>
    let depth = 1;
    let scan = open.lastIndex;
    let innerStart = scan;
    while (depth > 0 && scan < html.length) {
      const nextOpen = html.indexOf("<span", scan);
      const nextClose = html.indexOf("</span>", scan);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        scan = nextOpen + 5;
      } else {
        depth--;
        if (depth === 0) {
          result += html.slice(innerStart, nextClose);
          cursor = nextClose + "</span>".length;
          open.lastIndex = cursor;
          break;
        }
        scan = nextClose + "</span>".length;
      }
    }
  }
  result += html.slice(cursor);
  return result;
}

// ─── main ───────────────────────────────────────────────────────────────
const source = fs.readFileSync(SOURCE, "utf-8");

const enHtml = buildVariant(source, "en");
const esHtml = buildVariant(source, "es");

fs.mkdirSync(path.dirname(OUT_ES), { recursive: true });
fs.writeFileSync(OUT_EN, enHtml);
fs.writeFileSync(OUT_ES, esHtml);

// Sanity-check: each variant should have NO ml-* spans left
function countMlSpans(html, lang) {
  return (html.match(new RegExp(`<span\\s+class="ml-${lang}"`, "g")) || []).length;
}
const enLeftover = countMlSpans(enHtml, "en") + countMlSpans(enHtml, "es");
const esLeftover = countMlSpans(esHtml, "en") + countMlSpans(esHtml, "es");

console.log(`[build-bilingual] EN: ${(enHtml.length / 1024).toFixed(1)} KB → ${OUT_EN.replace(ROOT + "/", "")}`);
console.log(`[build-bilingual] ES: ${(esHtml.length / 1024).toFixed(1)} KB → ${OUT_ES.replace(ROOT + "/", "")}`);
console.log(`[build-bilingual] Residual ml-* spans: EN=${enLeftover}, ES=${esLeftover} (should be 0).`);

if (enLeftover > 0 || esLeftover > 0) {
  console.error("[build-bilingual] FAIL: span unwrapping incomplete.");
  process.exit(1);
}
console.log("[build-bilingual] OK");
