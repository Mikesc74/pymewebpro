// build-bilingual.mjs — bilingual build. Writes Spanish to / and English to /en/.
//
// Spanish source (canonical): manual-mockups/pymewebpro-v4-es/index.html  -> /index.html
// English source:             manual-mockups/pymewebpro-v4/index.html     -> /en/index.html
//
// English version is bilingual-aware (data-tag images already in English, prices
// shown via .price-na/.price-co toggles, .lang-en class on <html>). The Spanish
// version remains the apex (https://pymewebpro.com/) per the LATAM-first audience.
//
// Transforms applied to BOTH outputs (each scoped to its source slug):
//   mockups.pymewebpro.com/pymewebpro-v4-es/  -> pymewebpro.com/
//   mockups.pymewebpro.com/pymewebpro-v4/     -> pymewebpro.com/en/   (EN only)
//   "./mike.jpg"     -> "/screenshots/mike.jpg"
//   "./santiago.jpg" -> "/screenshots/santiago.jpg"
//   /pymewebpro-v4-es/   -> /
//   /pymewebpro-v4/      -> /en/   (EN only) or /  (ES — legacy refs)
//
// Usage:  node scripts/build-bilingual.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ES_SRC = path.join(ROOT, "manual-mockups/pymewebpro-v4-es/index.html");
const ES_OUT = path.join(ROOT, "index.html");
const EN_SRC = path.join(ROOT, "manual-mockups/pymewebpro-v4/index.html");
const EN_OUT = path.join(ROOT, "en/index.html");

function transformEs(html) {
  return html
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4-es\//g, "https://pymewebpro.com/")
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4\//g, "https://pymewebpro.com/en/")
    .replace(/"\.\/mike\.jpg"/g, '"/screenshots/mike.jpg"')
    .replace(/"\.\/santiago\.jpg"/g, '"/screenshots/santiago.jpg"')
    .replace(/\/pymewebpro-v4-es\//g, "/")
    .replace(/\/pymewebpro-v4\//g, "/en/");
}

function transformEn(html) {
  return html
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4\//g, "https://pymewebpro.com/en/")
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4-es\//g, "https://pymewebpro.com/")
    .replace(/"\.\/mike\.jpg"/g, '"/screenshots/mike.jpg"')
    .replace(/"\.\/santiago\.jpg"/g, '"/screenshots/santiago.jpg"')
    .replace(/\/pymewebpro-v4\//g, "/en/")
    .replace(/\/pymewebpro-v4-es\//g, "/");
}

function build(srcPath, outPath, transform, label) {
  if (!fs.existsSync(srcPath)) {
    console.error(`[build-bilingual] FAIL: ${label} source missing — ${path.relative(ROOT, srcPath)}`);
    process.exit(1);
  }
  let html = fs.readFileSync(srcPath, "utf-8");
  html = transform(html);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);

  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  const emDashes = (html.match(/—|&mdash;|&#8212;/g) || []).length;

  console.log(`[build-bilingual] ✓  ${label}  ${path.relative(ROOT, srcPath)}  ->  ${path.relative(ROOT, outPath)}  (${sizeKB} KB)`);
  if (emDashes > 0) {
    console.error(`[build-bilingual] FAIL: ${emDashes} em dashes detected in ${label}. Replace with periods, commas, colons, or '·'.`);
    process.exit(1);
  }
}

build(ES_SRC, ES_OUT, transformEs, "ES");
build(EN_SRC, EN_OUT, transformEn, "EN");

console.log("[build-bilingual] OK — Spanish at /, English at /en/.");
