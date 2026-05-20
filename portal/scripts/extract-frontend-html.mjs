#!/usr/bin/env node
// One-off migration script: extracts the FRONTEND_HTML template literal from
// src/index.js, simulates JS template-literal escape evaluation, and writes
// the result to src/frontend.html. This eliminates the recurring class of bug
// where `\n` (single backslash) inside the template literal silently becomes
// a real newline at worker boot, breaking the inline React script.
//
// Idempotent: re-running on an already-migrated index.js is a no-op (the
// template literal is gone). Run once, then delete this script if desired.
//
//   node scripts/extract-frontend-html.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src", "index.js");
const OUT = path.resolve(__dirname, "..", "src", "frontend.html");

const src = fs.readFileSync(SRC, "utf8");

const startMarker = "const FRONTEND_HTML = `";
const start = src.indexOf(startMarker);
if (start < 0) {
  console.error("[extract-frontend-html] FRONTEND_HTML template literal not found. Already migrated?");
  process.exit(1);
}
const tlStart = src.indexOf("`", start) + 1;

let i = tlStart;
while (i < src.length) {
  const ch = src[i];
  if (ch === "\\") { i += 2; continue; } // skip escaped char
  if (ch === "`") break;
  i++;
}
const tlEnd = i;
const raw = src.slice(tlStart, tlEnd);

// Simulate JS template-literal escape evaluation. Same rules as check-spa.mjs.
function unescape(s) {
  let out = "";
  for (let j = 0; j < s.length; j++) {
    const c = s[j];
    if (c === "\\" && j + 1 < s.length) {
      const n = s[j + 1];
      if (n === "n") out += "\n";
      else if (n === "t") out += "\t";
      else if (n === "r") out += "\r";
      else if (n === "\\") out += "\\";
      else if (n === "`") out += "`";
      else if (n === "$") out += "$";
      else if (n === "'") out += "'";
      else if (n === '"') out += '"';
      else if (n === "b") out += "\b";
      else if (n === "f") out += "\f";
      else if (n === "0") out += "\0";
      else if (n === "v") out += "\v";
      else out += n;
      j++;
      continue;
    }
    out += c;
  }
  return out;
}

const html = unescape(raw);
fs.writeFileSync(OUT, html, "utf8");
console.log("[extract-frontend-html] Wrote " + OUT + " (" + html.length + " chars)");
