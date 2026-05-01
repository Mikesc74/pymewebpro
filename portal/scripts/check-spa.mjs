#!/usr/bin/env node
// Pre-deploy guard: parses the inline JSX inside FRONTEND_HTML to catch
// the class of bug where a literal `\n` inside a JS string lives inside
// the FRONTEND_HTML template literal — at template-eval time `\n` becomes
// a real newline, which then breaks JS parsing at runtime in the browser.
// Catches that before `wrangler deploy` runs.

import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src", "index.js");

function extractFrontendHtml(src) {
  // Find: const FRONTEND_HTML = `...`;
  // Use the template-literal start/end and balance backticks (with escapes).
  const start = src.indexOf("const FRONTEND_HTML = `");
  if (start < 0) return null;
  const tlStart = src.indexOf("`", start) + 1;
  let i = tlStart;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") { i += 2; continue; } // skip escaped char
    if (ch === "`") return src.slice(tlStart, i);
    i++;
  }
  return null;
}

function unescapeTemplateLiteral(s) {
  // Full simulation of JS template-literal escape rules.
  // Key rules:
  //   \\ -> \, \` -> `, \${ -> ${, \n -> newline, \t -> tab, etc.
  //   ANY OTHER \X -> X (the backslash is silently dropped per ECMAScript spec).
  // The "other" rule is the killer: \/ becomes /, \. becomes ., which breaks
  // any JS regex literal containing them when written naively inside the
  // FRONTEND_HTML template literal. Catching this requires a faithful sim.
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      const n = s[i + 1];
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
      else out += n; // unrecognized: drop the backslash
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

function extractBabelScript(html) {
  const m = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}

function findContextLine(src, lineNum, range = 3) {
  const lines = src.split("\n");
  const start = Math.max(0, lineNum - range - 1);
  const end = Math.min(lines.length, lineNum + range);
  const out = [];
  for (let i = start; i < end; i++) {
    const marker = (i + 1 === lineNum) ? ">>> " : "    ";
    out.push(marker + String(i + 1).padStart(5, " ") + " | " + lines[i]);
  }
  return out.join("\n");
}

function main() {
  const src = fs.readFileSync(SRC, "utf8");
  const fhtml = extractFrontendHtml(src);
  if (!fhtml) {
    console.error("[check-spa] FRONTEND_HTML not found in src/index.js");
    process.exit(2);
  }
  const html = unescapeTemplateLiteral(fhtml);
  const babel = extractBabelScript(html);
  if (!babel) {
    console.error("[check-spa] No <script type='text/babel'> block found inside FRONTEND_HTML");
    process.exit(2);
  }
  try {
    parse(babel, { sourceType: "script", plugins: ["jsx"] });
    console.log("[check-spa] OK — SPA babel script parses cleanly (" + babel.length + " chars)");
    process.exit(0);
  } catch (e) {
    console.error("[check-spa] SPA babel script FAILED to parse:");
    console.error("  " + e.message);
    const m = e.message.match(/\((\d+):(\d+)\)/);
    if (m) {
      const line = parseInt(m[1], 10);
      console.error("\nContext (after template-literal evaluation):");
      console.error(findContextLine(babel, line));
      console.error("\nIf you see a multi-line string literal above, the cause is");
      console.error("almost certainly a JS string with `\\n` (single backslash) inside");
      console.error("the FRONTEND_HTML template literal. Change `\\n` to `\\\\n` so the");
      console.error("template renders `\\n` and JS reads it as the newline escape.");
    }
    process.exit(1);
  }
}

main();
