// convert-px-to-rem.mjs — convert font-size px values to rem across the v4
// mockup sources and the /start intake pages. Borders, shadows, line-height,
// padding, etc. are left alone — only font-size is touched.
//
// Conversion: pxValue / 16 = remValue. Examples:
//   font-size:14px        -> font-size:0.875rem
//   font-size:13.5px      -> font-size:0.84375rem
//   font-size:clamp(40px,5.8vw,72px)  ->  font-size:clamp(2.5rem,5.8vw,4.5rem)
//
// Idempotent: if you run it twice, the second run converts nothing.
//
// Usage (from repo root):
//   node scripts/convert-px-to-rem.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FILES = [
  "manual-mockups/pymewebpro-v4/index.html",
  "manual-mockups/pymewebpro-v4-es/index.html",
  "start/index.html",
  "es/start/index.html",
];

function pxToRem(pxStr) {
  const rem = parseFloat(pxStr) / 16;
  // Trim trailing zeros: 1.0000 -> 1, 0.8750 -> 0.875
  return parseFloat(rem.toFixed(6)) + "rem";
}

function convert(html) {
  let out = html;
  let bare = 0;
  let clamped = 0;

  // 1. font-size: clamp(NNpx, MID, NNpx) — convert min and max bounds.
  // Run BEFORE the bare regex so the clamp wrapper is still intact when matched.
  out = out.replace(
    /font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px\s*,\s*([^,]+?)\s*,\s*(\d+(?:\.\d+)?)px\s*\)/g,
    (_m, lo, mid, hi) => {
      clamped++;
      return `font-size:clamp(${pxToRem(lo)},${mid},${pxToRem(hi)})`;
    }
  );

  // 2. font-size: NNpx (anywhere — CSS rules, inline style attrs).
  // Won't match px inside clamp() because clamp() doesn't have "font-size:"
  // immediately followed by a digit (it has "clamp(" first).
  out = out.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (_m, px) => {
    bare++;
    return "font-size:" + pxToRem(px);
  });

  return { out, bare, clamped };
}

console.log("[convert-px-to-rem] converting font-size px to rem...\n");
let totalBare = 0;
let totalClamped = 0;
let touched = 0;

for (const rel of FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`  ! skip (missing): ${rel}`);
    continue;
  }
  const html = fs.readFileSync(full, "utf-8");
  const { out, bare, clamped } = convert(html);
  if (bare === 0 && clamped === 0) {
    console.log(`  - ${rel}: no px font-sizes found (already converted?)`);
    continue;
  }
  fs.writeFileSync(full, out);
  totalBare += bare;
  totalClamped += clamped;
  touched++;
  console.log(`  ✓ ${rel}: ${bare} bare + ${clamped} clamp() conversions`);
}

console.log(`\n[convert-px-to-rem] done. ${touched} files updated. ${totalBare} bare + ${totalClamped} clamp() conversions total.`);
console.log(`Next: rebuild-mockups (if mockups subdomain serves these), then build-bilingual + refresh-csp-hashes for prod.`);
