// check-standards.mjs — validate every manual-mockups/<slug>/index.html
// against the build constraints documented in CLAUDE.md.
//
// FAIL = blocks deploy. WARN = printed but doesn't block (yet — promote
// to FAIL once the existing 7 sites are clean).
//
// Run via: npm run check:standards (from portal/)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(__dirname, "../..");
const MOCKUPS_DIR = path.join(STUDIO, "manual-mockups");

// Sites we expect to validate. The /start tutorial page is exempt from
// most checks because it's a single-purpose walkthrough, not a full site.
const FULL_SITE_EXEMPT = new Set(["start", "_template"]);

// Sites that target Colombia and therefore need NIT + Cámara compliance.
// Default to assuming a site doesn't unless flagged.
const COLOMBIAN_SITES = new Set([
  "blues-kitchen", "daga-parfum", "espacio-dental", "marena", "pymewebpro-ca",
]);

const checks = [
  {
    name: "Has <title>",
    severity: "FAIL",
    test: (html) => /<title[^>]*>[^<]+<\/title>/.test(html),
  },
  {
    name: "Has <meta name=\"viewport\">",
    severity: "FAIL",
    test: (html) => /<meta[^>]+name=["']viewport["']/i.test(html),
  },
  {
    name: "Has <meta name=\"description\">",
    severity: "FAIL",
    test: (html) => /<meta[^>]+name=["']description["']/i.test(html),
  },
  {
    name: "No Tailwind CDN",
    severity: "FAIL",
    test: (html) => !/cdn\.tailwindcss\.com/i.test(html),
  },
  {
    name: "No Bootstrap/Bulma/Pico CDN",
    severity: "FAIL",
    test: (html) => !/(bootstrap|bulma|picocss)[^"']*\.css/i.test(html),
  },
  {
    name: "No <marquee>",
    severity: "FAIL",
    test: (html) => !/<marquee/i.test(html),
  },
  {
    name: "No em dashes (—) in user-visible text",
    severity: "FAIL",
    // Allow em dashes inside <script>, <style>, and HTML comments
    test: (html) => {
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/<!--[\s\S]*?-->/g, "");
      return !stripped.includes("—");
    },
  },
  {
    name: "Has og:title",
    severity: "WARN",
    test: (html) => /<meta[^>]+property=["']og:title["']/i.test(html),
  },
  {
    name: "Has og:description",
    severity: "WARN",
    test: (html) => /<meta[^>]+property=["']og:description["']/i.test(html),
  },
  {
    name: "Has Organization JSON-LD",
    severity: "WARN",
    test: (html) =>
      /<script[^>]*application\/ld\+json[^>]*>[^<]*"@type"\s*:\s*"Organization"/i.test(html),
  },
  {
    name: "Has Service or FAQPage JSON-LD",
    severity: "WARN",
    test: (html) =>
      /<script[^>]*application\/ld\+json[^>]*>[^<]*"@type"\s*:\s*"(Service|FAQPage)"/i.test(html),
  },
  {
    name: "Has PymeWebPro footer credit (or self-credit)",
    severity: "WARN",
    test: (html, slug) => {
      // The pymewebpro-ca site IS PymeWebPro — its footer credits itself differently.
      if (slug === "pymewebpro-ca") return /Norte Sur Consulting|PymeWebPro/i.test(html);
      return /(Sitio web por PymeWebPro|Built by PymeWebPro|pymewebpro\.com)/i.test(html);
    },
  },
  {
    name: "Colombian site: includes NIT block",
    severity: "WARN",
    test: (html, slug) => {
      if (!COLOMBIAN_SITES.has(slug)) return true; // n/a
      return /NIT[\s.]*\d/i.test(html);
    },
  },
  {
    name: "No external CSS framework <link>",
    severity: "FAIL",
    test: (html) => {
      // Allow Google Fonts (fonts.googleapis.com) and self-hosted /styles.css
      const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+>/gi;
      const links = html.match(linkRegex) || [];
      return links.every((link) => {
        if (/fonts\.googleapis\.com/i.test(link)) return true;
        if (/href=["']\/[^"']*\.css/i.test(link)) return true; // local
        return false;
      });
    },
  },
];

function validateSite(slug) {
  const file = path.join(MOCKUPS_DIR, slug, "index.html");
  if (!fs.existsSync(file)) return { slug, missing: true, results: [] };
  const html = fs.readFileSync(file, "utf-8");
  const results = checks.map((check) => ({
    name: check.name,
    severity: check.severity,
    pass: check.test(html, slug),
  }));
  return { slug, results, bytes: html.length };
}

const slugs = fs.readdirSync(MOCKUPS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .filter((s) => !FULL_SITE_EXEMPT.has(s));

let totalFails = 0;
let totalWarns = 0;

console.log(`[check-standards] Validating ${slugs.length} mockup site(s)...\n`);

for (const slug of slugs) {
  const { results, missing, bytes } = validateSite(slug);
  if (missing) {
    console.log(`  ✗ ${slug} — index.html missing`);
    totalFails++;
    continue;
  }

  const fails = results.filter((r) => !r.pass && r.severity === "FAIL");
  const warns = results.filter((r) => !r.pass && r.severity === "WARN");
  totalFails += fails.length;
  totalWarns += warns.length;

  const status = fails.length === 0 && warns.length === 0
    ? "✓"
    : fails.length === 0
      ? "⚠"
      : "✗";
  const sizeKb = Math.round(bytes / 1024);
  console.log(`  ${status} ${slug} (${sizeKb}KB)`);

  for (const r of fails) console.log(`      ✗ FAIL: ${r.name}`);
  for (const r of warns) console.log(`      ⚠ WARN: ${r.name}`);
}

console.log(`\n[check-standards] ${slugs.length} site(s) checked · ${totalFails} fail(s) · ${totalWarns} warn(s)`);

if (totalFails > 0) {
  console.error("[check-standards] BLOCKING: at least one FAIL — fix before deploy.");
  process.exit(1);
}

console.log("[check-standards] OK — all sites pass blocking checks.");
