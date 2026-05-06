// build-bilingual.mjs — generate prod root files from the v4 mockup sources.
//
// Reads:
//   manual-mockups/pymewebpro-v4/index.html      (EN source, lives at mockups.pymewebpro.com/pymewebpro-v4/)
//   manual-mockups/pymewebpro-v4-es/index.html   (ES source)
//
// Writes:
//   index.html       (EN-only DOM, served at https://pymewebpro.com/)
//   es/index.html    (ES-only DOM, served at https://pymewebpro.com/es/)
//
// Transforms applied to both files (same as old promote-v4.mjs):
//   mockups.pymewebpro.com/pymewebpro-v4-es/  -> pymewebpro.com/es/
//   mockups.pymewebpro.com/pymewebpro-v4/     -> pymewebpro.com/
//   "./mike.jpg"     -> "/screenshots/mike.jpg"
//   "./santiago.jpg" -> "/screenshots/santiago.jpg"
//   /pymewebpro-v4-es/   -> /es/        (lang switcher hrefs)
//   /pymewebpro-v4/      -> /
//
// Usage:  node scripts/build-bilingual.mjs
//
// History: this used to merge a dual-DOM source (pymewebpro-ca) into two
// language-specific outputs. v4 ships as two separate files, so the merge
// step is gone — this script now just promotes the v4 mockups to prod with
// the URL adjustments needed for the apex domain. The old merge logic is
// preserved in git history if you need it for a future bilingual source.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const EN_SRC = path.join(ROOT, "manual-mockups/pymewebpro-v4/index.html");
const ES_SRC = path.join(ROOT, "manual-mockups/pymewebpro-v4-es/index.html");
const OUT_EN = path.join(ROOT, "index.html");
const OUT_ES = path.join(ROOT, "es/index.html");

function transform(html) {
  return html
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4-es\//g, "https://pymewebpro.com/es/")
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4\//g, "https://pymewebpro.com/")
    .replace(/"\.\/mike\.jpg"/g, '"/screenshots/mike.jpg"')
    .replace(/"\.\/santiago\.jpg"/g, '"/screenshots/santiago.jpg"')
    .replace(/\/pymewebpro-v4-es\//g, "/es/")
    .replace(/\/pymewebpro-v4\//g, "/");
}

function build(src, dst, label) {
  if (!fs.existsSync(src)) {
    console.error(`[build-bilingual] FAIL: source missing — ${path.relative(ROOT, src)}`);
    process.exit(1);
  }
  let html = fs.readFileSync(src, "utf-8");
  html = transform(html);
  const dstDir = path.dirname(dst);
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
  fs.writeFileSync(dst, html);
  const sizeKB = (fs.statSync(dst).size / 1024).toFixed(1);
  const emDashes = (html.match(/—|&mdash;|&#8212;/g) || []).length;
  const status = emDashes === 0 ? "OK" : `WARN ${emDashes} em dashes`;
  console.log(`[build-bilingual] ${label}: ${sizeKB} KB → ${path.relative(ROOT, dst)}  (${status})`);
  return { html, emDashes };
}

const enResult = build(EN_SRC, OUT_EN, "EN");
const esResult = build(ES_SRC, OUT_ES, "ES");

if (enResult.emDashes > 0 || esResult.emDashes > 0) {
  console.error("[build-bilingual] FAIL: em dashes detected. Replace with periods, commas, colons, or '·'.");
  process.exit(1);
}

console.log("[build-bilingual] OK");
