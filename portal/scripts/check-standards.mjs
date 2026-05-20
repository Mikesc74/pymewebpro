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
  "blues-kitchen", "daga-parfum", "espacio-dental", "marena",
  "pymewebpro.com (ES)", "pymewebpro.com (EN)",
]);

// Extra production HTML files (outside manual-mockups/) we still want to
// validate. After the build-bilingual flatten on 2026-05-18, the live
// pymewebpro.com pages ARE the source of truth, served directly by
// Cloudflare Pages — no intermediate mockup folder.
const PRODUCTION_SITES = [
  { label: "pymewebpro.com (ES)", file: path.resolve(STUDIO, "index.html") },
  { label: "pymewebpro.com (EN)", file: path.resolve(STUDIO, "en/index.html") },
];

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
    name: "Footer brand legible on dark footer (no '< web />' regression)",
    severity: "FAIL",
    // The brand mark <pymewebpro/> inherits the default dark .brand color
    // (#1B1410). On the dark footer that is invisible, so "pyme" and "pro"
    // vanish and only the orange "web" survives -> "< web />". It MUST be
    // overridden to a light color via `footer.site .brand`. This has regressed
    // 3+ times because the brand CSS is inline-duplicated per language file and
    // a fix to one file never reaches the other. This guard fails the build if
    // either production page is missing the override.
    test: (html, slug) => {
      if (slug !== "pymewebpro.com (ES)" && slug !== "pymewebpro.com (EN)") return true;
      return /footer\.site\s+\.brand\s*\{[^}]*color:\s*#(?:FBF7F0|F4ECDF|FFF|FFFFFF)\b/i.test(html);
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

function validateSite(label, file) {
  if (!fs.existsSync(file)) return { slug: label, missing: true, results: [] };
  const html = fs.readFileSync(file, "utf-8");
  const results = checks.map((check) => ({
    name: check.name,
    severity: check.severity,
    pass: check.test(html, label),
  }));
  return { slug: label, results, bytes: html.length };
}

const mockupSites = fs.readdirSync(MOCKUPS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .filter((s) => !FULL_SITE_EXEMPT.has(s))
  // Skip directories that don't have an index.html yet. These are research /
  // WIP folders (Instagram pulls, mood-board screenshots, hero photo drafts)
  // that haven't been built into a mockup. A missing index.html is not a
  // deploy-blocking failure for the WORKER · it just means the directory
  // exists but the build hasn't happened yet.
  .filter((s) => fs.existsSync(path.join(MOCKUPS_DIR, s, "index.html")))
  .map((slug) => ({ label: slug, file: path.join(MOCKUPS_DIR, slug, "index.html") }));

const sites = [...PRODUCTION_SITES, ...mockupSites];

let totalFails = 0;
let totalWarns = 0;

console.log(`[check-standards] Validating ${sites.length} site(s)...\n`);

for (const { label, file } of sites) {
  const { results, missing, bytes } = validateSite(label, file);
  if (missing) {
    console.log(`  ✗ ${label} — index.html missing`);
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
  console.log(`  ${status} ${label} (${sizeKb}KB)`);

  for (const r of fails) console.log(`      ✗ FAIL: ${r.name}`);
  for (const r of warns) console.log(`      ⚠ WARN: ${r.name}`);
}

console.log(`\n[check-standards] ${sites.length} site(s) checked · ${totalFails} fail(s) · ${totalWarns} warn(s)`);

if (totalFails > 0) {
  console.error("[check-standards] BLOCKING: at least one FAIL — fix before deploy.");
  process.exit(1);
}

console.log("[check-standards] OK — all sites pass blocking checks.");
