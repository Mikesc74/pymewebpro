// build-bilingual.mjs — promote the v4 ES mockup to the production root.
//
// As of the LATAM-only commit, the entire site is Spanish. There is no /es/
// subdirectory anymore. The Spanish v4 page IS the root index.html.
//
// Reads:
//   manual-mockups/pymewebpro-v4-es/index.html
//
// Writes:
//   index.html                 (root, served at https://pymewebpro.com/)
//
// Transforms applied:
//   mockups.pymewebpro.com/pymewebpro-v4-es/  -> pymewebpro.com/
//   "./mike.jpg"     -> "/screenshots/mike.jpg"
//   "./santiago.jpg" -> "/screenshots/santiago.jpg"
//   /pymewebpro-v4-es/   -> /             (any remaining mockup-subdomain refs)
//   /pymewebpro-v4/      -> /             (legacy EN refs that may still exist)
//
// Script name kept as build-bilingual for backwards compat with portal/package.json
// predeploy chain. Despite the name, it now produces a single Spanish output.
//
// Usage:  node scripts/build-bilingual.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SRC = path.join(ROOT, "manual-mockups/pymewebpro-v4-es/index.html");
const OUT = path.join(ROOT, "index.html");

function transform(html) {
  return html
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4-es\//g, "https://pymewebpro.com/")
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4\//g, "https://pymewebpro.com/")
    .replace(/"\.\/mike\.jpg"/g, '"/screenshots/mike.jpg"')
    .replace(/"\.\/santiago\.jpg"/g, '"/screenshots/santiago.jpg"')
    .replace(/\/pymewebpro-v4-es\//g, "/")
    .replace(/\/pymewebpro-v4\//g, "/");
}

if (!fs.existsSync(SRC)) {
  console.error(`[build-bilingual] FAIL: source missing — ${path.relative(ROOT, SRC)}`);
  process.exit(1);
}

let html = fs.readFileSync(SRC, "utf-8");
html = transform(html);
fs.writeFileSync(OUT, html);

const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(1);
const emDashes = (html.match(/—|&mdash;|&#8212;/g) || []).length;

console.log(`[build-bilingual] ✓  ${path.relative(ROOT, SRC)}  ->  ${path.relative(ROOT, OUT)}  (${sizeKB} KB)`);
if (emDashes > 0) {
  console.error(`[build-bilingual] FAIL: ${emDashes} em dashes detected. Replace with periods, commas, colons, or '·'.`);
  process.exit(1);
}
console.log("[build-bilingual] OK — single-language Spanish build.");
