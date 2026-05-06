// rebuild-mockups.mjs — auto-discover all manual-mockups-*.js modules
// from MANUAL_MOCKUPS imports and regenerate them from their source HTML.
//
// Usage: node scripts/rebuild-mockups.mjs
//
// Reads portal/src/manual-mockups.js to find imports, maps each to a
// source HTML at manual-mockups/<slug>/index.html, base64-embeds any
// local jpg references, applies template-literal escapes, writes the
// JS module back. Avoids the trap of hardcoded site lists going stale.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STUDIO = path.resolve(ROOT, "..");

const indexJs = fs.readFileSync(path.join(ROOT, "src/manual-mockups.js"), "utf-8");
const importRe = /import\s*\{\s*(\w+)\s*\}\s*from\s*"\.\/(manual-mockups-[\w-]+)\.js"/g;
const mapEntryRe = /(?:^|\s)(?:"([\w-]+)"|(\w+))\s*:\s*(\w+)\s*[,}]/g;

const imports = [...indexJs.matchAll(importRe)].map(m => ({ varName: m[1], moduleName: m[2] }));
const mapEntries = [...indexJs.matchAll(mapEntryRe)]
  .map(m => ({ slug: m[1] || m[2], varName: m[3] }))
  .filter(e => imports.find(i => i.varName === e.varName));

console.log(`Found ${mapEntries.length} wired mockups`);

for (const entry of mapEntries) {
  const imp = imports.find(i => i.varName === entry.varName);
  if (!imp) continue;
  const slug = entry.slug;
  const srcHtml = path.join(STUDIO, "manual-mockups", slug, "index.html");
  const dstJs = path.join(ROOT, "src", `${imp.moduleName}.js`);

  if (!fs.existsSync(srcHtml)) {
    console.log(`  ! ${slug}: source HTML missing at ${srcHtml}, skipping`);
    continue;
  }

  let html = fs.readFileSync(srcHtml, "utf-8");

  // Embed any local ./*.{jpg,jpeg,png,webp} references as base64.
  // Backwards compatible: previously only .jpg was matched; expanded to png/webp
  // so v2-style mockups can drop screenshots in PNG without manual conversion.
  const photosDir = path.dirname(srcHtml);
  const photoRefs = [...new Set(html.match(/\.\/([\w-]+\.(?:jpg|jpeg|png|webp))/g) || [])];
  const mimeFor = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  for (const ref of photoRefs) {
    const fn = ref.slice(2);
    const photoPath = path.join(photosDir, fn);
    if (fs.existsSync(photoPath)) {
      const ext = fn.split(".").pop().toLowerCase();
      const mime = mimeFor[ext] || "image/jpeg";
      const b64 = fs.readFileSync(photoPath).toString("base64");
      html = html.split(ref).join(`data:${mime};base64,${b64}`);
    }
  }

  // Escape template-literal hazards
  let escaped = html;
  if (escaped.includes("${")) escaped = escaped.replace(/\$\{/g, "\\${");
  if (escaped.includes("`")) escaped = escaped.replace(/`/g, "\\`");
  escaped = escaped.replace(/\\([0-9])/g, "\\\\$1");

  const header =
    `// ${imp.moduleName}.js — auto-rebuilt by scripts/rebuild-mockups.mjs\n` +
    `// Source: manual-mockups/${slug}/index.html\n` +
    `//\n` +
    `// Imported by manual-mockups.js → MANUAL_MOCKUPS["${slug}"].\n` +
    `\n` +
    `export const ${imp.varName} = \`\n`;

  fs.writeFileSync(dstJs, header + escaped + "\n`;\n");
  const sizeKB = Math.round(fs.statSync(dstJs).size / 1024);
  const emDashes = (html.match(/—|&mdash;|&#8212;/g) || []).length;
  console.log(`  ✓ ${slug}: ${sizeKB}KB · em-dashes=${emDashes}`);
}
