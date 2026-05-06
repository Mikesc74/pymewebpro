// promote-v4.mjs — promote pymewebpro-v4 mockups to production root files.
//
// Reads:
//   manual-mockups/pymewebpro-v4/index.html      (EN source)
//   manual-mockups/pymewebpro-v4-es/index.html   (ES source)
//
// Writes:
//   index.html       (root EN, served at https://pymewebpro.com/)
//   es/index.html    (ES, served at https://pymewebpro.com/es/)
//
// Transforms applied to both files:
//   - mockups.pymewebpro.com/pymewebpro-v4-es/  -> pymewebpro.com/es/
//   - mockups.pymewebpro.com/pymewebpro-v4/     -> pymewebpro.com/
//   - "./mike.jpg"     -> "/screenshots/mike.jpg"
//   - "./santiago.jpg" -> "/screenshots/santiago.jpg"
//   - /pymewebpro-v4-es/ -> /es/    (lang switcher hrefs)
//   - /pymewebpro-v4/    -> /       (lang switcher hrefs)
//
// Usage:
//   cd ~/code/pymewebpro && node scripts/promote-v4.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function transform(html) {
  return html
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4-es\//g, "https://pymewebpro.com/es/")
    .replace(/https:\/\/mockups\.pymewebpro\.com\/pymewebpro-v4\//g, "https://pymewebpro.com/")
    .replace(/"\.\/mike\.jpg"/g, '"/screenshots/mike.jpg"')
    .replace(/"\.\/santiago\.jpg"/g, '"/screenshots/santiago.jpg"')
    .replace(/\/pymewebpro-v4-es\//g, "/es/")
    .replace(/\/pymewebpro-v4\//g, "/");
}

function promote(srcRel, dstRel) {
  const src = path.join(ROOT, srcRel);
  const dst = path.join(ROOT, dstRel);
  if (!fs.existsSync(src)) {
    console.error(`  ! source missing: ${srcRel}`);
    process.exit(1);
  }
  let html = fs.readFileSync(src, "utf-8");
  const before = html.length;
  html = transform(html);
  const dstDir = path.dirname(dst);
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
  fs.writeFileSync(dst, html);
  const sizeKB = Math.round(fs.statSync(dst).size / 1024);
  const emDashes = (html.match(/—|&mdash;|&#8212;/g) || []).length;
  const status = emDashes === 0 ? "OK" : `WARN ${emDashes} em dashes`;
  console.log(`  ✓ ${srcRel}  ->  ${dstRel}  (${sizeKB}KB, ${status})`);
}

console.log("[promote-v4] writing v4 mockups to production root...\n");
promote("manual-mockups/pymewebpro-v4/index.html", "index.html");
promote("manual-mockups/pymewebpro-v4-es/index.html", "es/index.html");
console.log("\n[promote-v4] done. Next: refresh CSP hashes, then commit + push.");
