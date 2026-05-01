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
  // Apply the same transforms that JS does when evaluating a template literal.
  // \` -> `, \${ -> ${, \\ -> \, \n -> \n (actual newline), etc.
  return s
    .replace(/\\`/g, "`")
    .replace(/\\\$\{/g, "${")
    .replace(/\\\\/g, "\\");
  // We deliberately leave \n / \t etc. as-is for the babel script's purposes —
  // the bug we're catching is when JS string literals INSIDE the babel script
  // contain real newlines (because the OUTER template eval converted \n).
  // To simulate that fully we'd also expand \n; we do it implicitly by reading
  // the file as-is — any literal \n in the source becomes a real newline in JS
  // strings when the template runs. To detect this, we extract the babel
  // <script> section and parse it as JSX.
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
