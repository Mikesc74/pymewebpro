#!/usr/bin/env node
// One-off migration: extract a `const NAME = \`...\`` template literal from a
// source file, unescape it to its evaluated value, and write to a target file.
// Usage:
//   node scripts/_one-off-migrate.mjs <srcFile> <constName> <outFile>
//
// Then in <srcFile> replace the template literal with:
//   import NAME from "./outFileBasename";  (with a [[rules]] block in wrangler.toml)
//
// Used to migrate static HTML/JS template literals out of worker .js files
// so the escape-collision bug class (single-backslash \n becoming a real
// newline at template-eval time) is structurally impossible.

import fs from "node:fs";
import path from "node:path";

const [, , srcFile, constName, outFile] = process.argv;
if (!srcFile || !constName || !outFile) {
  console.error("usage: node _one-off-migrate.mjs <srcFile> <constName> <outFile>");
  process.exit(2);
}

const src = fs.readFileSync(srcFile, "utf8");

// Look for `export const NAME = \`` or `const NAME = \``.
const patterns = [
  "export const " + constName + " = `",
  "const " + constName + " = `",
];
let startIdx = -1;
let usedPattern = null;
for (const p of patterns) {
  const idx = src.indexOf(p);
  if (idx >= 0) { startIdx = idx; usedPattern = p; break; }
}
if (startIdx < 0) {
  console.error("[migrate] could not find `" + constName + "` template literal in " + srcFile);
  process.exit(1);
}
const tlStart = startIdx + usedPattern.length;

let i = tlStart;
while (i < src.length) {
  const ch = src[i];
  if (ch === "\\") { i += 2; continue; }
  if (ch === "`") break;
  i++;
}
const tlEnd = i;
const raw = src.slice(tlStart, tlEnd);

function unescapeTemplateLiteral(s) {
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

const value = unescapeTemplateLiteral(raw);
fs.writeFileSync(outFile, value, "utf8");
console.log("[migrate] wrote " + outFile + " (" + value.length + " chars, " + (value.split("\n").length) + " lines)");
console.log("[migrate] template literal bytes: " + (tlEnd - tlStart) + " (offsets " + tlStart + ".." + tlEnd + ")");
console.log("[migrate] now: replace the literal block in " + srcFile + " with an import");
