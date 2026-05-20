#!/usr/bin/env node
// One-off: rewrite relative API URLs in mockup HTML to absolute URLs
// pointing at mockups.pymewebpro.com. Lets the same HTML work whether served
// from mockups.pymewebpro.com OR pymewebpro.com/manual-mockups/<slug>/.
//
//   node scripts/_one-off-rewrite-mockup-urls.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const HOST = "https://mockups.pymewebpro.com";

const files = [
  "manual-mockups/central-farma-drogueria/index.html",
  "manual-mockups/revo-cafe/index.html",
  "manual-mockups/espacio-dental/index.html",
  "manual-mockups/blues-kitchen/index.html",
  "manual-mockups/blues-kitchen/index.embedded.html",
];

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log("skip (missing): " + rel); continue; }
  let s = fs.readFileSync(abs, "utf8");
  const before = s;
  let n = 0;
  // var ENDPOINT = '/api/...'
  s = s.replace(/var\s+ENDPOINT\s*=\s*'\/api\//g, (m) => { n++; return "var ENDPOINT = '" + HOST + "/api/"; });
  // fetch('/api/...')
  s = s.replace(/fetch\(\s*'\/api\//g, (m) => { n++; return "fetch('" + HOST + "/api/"; });
  if (s !== before) {
    fs.writeFileSync(abs, s, "utf8");
    console.log("updated " + n + " URL(s): " + rel);
  } else {
    console.log("no change: " + rel);
  }
}
