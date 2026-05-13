// PymeWebPro · Site Audit
//
// Public surface:
//   handleSiteAuditAPI(request, env, helpers)  → JSON findings for /api/admin/site-audit
//   siteAuditReportHTML(url)                    → full HTML report page (auto-opens print dialog)
//
// Runs the same checks as the Python audit.py but in Worker-compatible JS.
// Used by the "Test a site" header button in the admin SPA to produce a
// sales-ready PDF on any prospect URL.

const USER_AGENT = "Mozilla/5.0 (compatible; pymewebpro-audit/1.0)";
const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const OBSERVATORY_ENDPOINT = "https://http-observatory.security.mozilla.org/api/v1/analyze";
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function normalizeUrl(u) {
  if (!u) return "";
  u = u.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

function finding(category, severity, title, detail, fix = "") {
  return { category, severity, title, detail, fix };
}

function safeMatch(re, html) {
  const m = html.match(re);
  return m ? m[1] : null;
}

// ─── Checks ────────────────────────────────────────────────────────────────

async function checkSiteFetch(url, findings, ctx) {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
    ctx.headers = resp.headers;
    ctx.status = resp.status;
    ctx.finalUrl = resp.url;
    if (resp.status >= 400) {
      findings.push(finding("Site", "critical",
        `Website is broken (error ${resp.status})`,
        "Anyone trying to visit your website right now gets an error page instead of your site. You are losing every single customer who clicks through to you until this is fixed.",
        "Contact your hosting provider or web developer immediately. This is an outage and should be treated as urgent."));
    }
    ctx.html = await resp.text();
  } catch (e) {
    findings.push(finding("Site", "critical",
      "Website could not be loaded",
      "We could not reach your website at all. It may be offline, or the domain may be misconfigured. Customers and Google can't see you.",
      "Contact your hosting provider or web developer right away."));
  }
}

function checkHttps(url, findings) {
  if (!/^https:/i.test(url)) {
    findings.push(finding("Security", "critical",
      "No padlock — your site is marked 'Not Secure'",
      "Modern browsers show a big 'Not Secure' warning when visiting your site. Customers see this before they see your homepage, and most leave immediately. It also tells Google your site is untrustworthy, which hurts your search ranking.",
      "Install a free SSL certificate (Let's Encrypt) so your address bar shows the padlock and https://. Most hosting companies do this in one click."));
  }
}

function checkSecurityHeaders(headers, findings) {
  if (!headers) return;
  const h = {};
  for (const [k, v] of headers.entries()) h[k.toLowerCase()] = v;
  const expected = {
    "strict-transport-security": ["Browsers aren't told to always use the secure version of your site", "medium",
      "A simple safety setting is missing. Without it, a visitor's connection can be downgraded from secure to insecure on public WiFi (coffee shops, airports), exposing them and making you look unprofessional.",
      "Your web developer can add this in about 60 seconds."],
    "content-security-policy": ["No protection against malicious code injection", "medium",
      "Hackers can inject fake forms or scripts into your site through ad networks or compromised plugins. This safety rule blocks that. Without it, one bad ad or one outdated plugin can turn your site into a phishing trap.",
      "Your web developer can add a Content-Security-Policy rule. Standard fix."],
    "x-content-type-options": ["Minor browser safety setting is off", "low",
      "A small safeguard against a browser quirk that hackers can exploit. Easy to fix, low risk on its own, but adds up with the other missing settings.",
      "One-line addition for your web developer."],
    "referrer-policy": ["Privacy setting not configured", "low",
      "When visitors click a link on your site to go somewhere else, the other site sees the exact page they came from. A privacy setting can limit what gets shared. Modern, professional sites configure this.",
      "One-line addition for your web developer."],
  };
  for (const [k, [title, sev, detail, fix]] of Object.entries(expected)) {
    if (!h[k]) findings.push(finding("Security", sev, title, detail, fix));
  }
}

async function checkObservatory(host, findings) {
  try {
    const r = await fetch(`${OBSERVATORY_ENDPOINT}?host=${encodeURIComponent(host)}`, { method: "POST" });
    const data = await r.json();
    if (data && data.state === "FINISHED" && data.grade) {
      const { grade, score } = data;
      if (["D", "E", "F"].includes(grade)) {
        findings.push(finding("Security", "high",
          `Independent security scan: poor grade (${grade})`,
          "Mozilla, a major non-profit, runs a free security checker that grades websites like a school report card. Your site scored " + score + "/100 (grade " + grade + "). Customers can run this same scan and use it to decide whether to trust you — especially if you take payments or personal info.",
          "Address the security issues listed in this report. A web developer can typically bring this to a B or A grade in an hour."));
      } else if (grade === "C") {
        findings.push(finding("Security", "medium",
          `Independent security scan: mediocre grade (${grade})`,
          "Mozilla's free security scanner graded your site " + score + "/100. Not failing, but well below what a customer-facing business should have. Easy to bring up to an A.",
          "Address the missing security settings — your web developer can raise this in well under an hour."));
      }
    }
  } catch (e) { /* swallow */ }
}

function checkSEO(html, baseUrl, findings) {
  if (!html) return;

  // Title
  const title = safeMatch(/<title[^>]*>([^<]*)<\/title>/i, html);
  if (!title || !title.trim()) {
    findings.push(finding("SEO", "high",
      "Your page has no title",
      "The title is the blue clickable headline that shows up in Google search results. Without one, your business shows up looking broken — or doesn't show up at all. This is the single most important thing to fix for getting found on Google.",
      "Your web developer should add a clear title to each page, like 'Bluebird Dental Clinic — Family Dentistry in Medellín'."));
  } else {
    const t = title.trim();
    if (t.length > 70) {
      findings.push(finding("SEO", "low",
        `Your page title is too long (${t.length} characters)`,
        `Google cuts off titles longer than about 60 characters with "..." which makes your listing look messy. Your current title is: "${t}"`,
        "Shorten it to roughly 50–60 characters so Google shows the full title."));
    } else if (t.length < 20) {
      findings.push(finding("SEO", "medium",
        `Your page title is too short (${t.length} characters)`,
        `A very short title misses a chance to tell Google (and customers) what you do. Your current title is: "${t}"`,
        "Expand to roughly 50 characters and include your business type and city, e.g. 'Bluebird Dental Clinic — Family Dentistry in Medellín'."));
    }
  }

  // Meta description
  const desc = safeMatch(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i, html)
            || safeMatch(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i, html);
  if (!desc || !desc.trim()) {
    findings.push(finding("SEO", "high",
      "No description for Google to show under your listing",
      "When your site appears in Google, there's a short description below the blue title. You haven't written one, so Google grabs random text from the page — which is usually awful. A good description is one of the biggest factors in whether someone clicks your listing instead of a competitor's.",
      "Your web developer can add a 1–2 sentence description for each page, summarizing what you offer and where you are."));
  } else if (desc.length > 170) {
    findings.push(finding("SEO", "low",
      `Your Google description is too long (${desc.length} characters)`,
      "Google cuts off descriptions longer than about 160 characters with '...'. That makes your listing look chopped off.",
      "Trim the description to about 150 characters."));
  }

  // H1
  const h1Matches = html.match(/<h1[\s>][^]*?<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    findings.push(finding("SEO", "medium",
      "Your page has no main heading",
      "Every page should have one big headline at the top that tells visitors (and Google) what the page is about. Without it, the page looks unfinished and Google has a harder time understanding what you do.",
      "Your web developer can add a clear main heading (an 'H1') to each page."));
  } else if (h1Matches.length > 1) {
    findings.push(finding("SEO", "low",
      `Multiple top-level headings on the page (${h1Matches.length})`,
      "A page should have one main headline, not several. Multiple top headings confuses Google about what the page is really about.",
      "Your web developer can promote one heading as the main one and convert the others to sub-headings."));
  }

  // Images missing alt
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const missingAlt = imgs.filter(t => !/\balt\s*=/.test(t));
  if (imgs.length && missingAlt.length >= Math.max(3, Math.floor(imgs.length / 4))) {
    findings.push(finding("SEO", "medium",
      `${missingAlt.length} of ${imgs.length} photos have no text description`,
      "Every photo on your site should have a short text description attached (called 'alt text'). Two reasons: (1) Google can't see images, only read text, so good descriptions help your photos show up in Google Image search. (2) Blind visitors using screen readers depend on these descriptions — in many countries you can be sued for not having them.",
      "Your web developer can add a one-line description to each photo, like 'Dr. Garcia performing a teeth cleaning' or 'Front desk of our Medellín office'."));
  }

  // Open Graph
  const hasOgTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const hasOgImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  if (!hasOgTitle || !hasOgImage) {
    findings.push(finding("SEO", "low",
      "Your site looks ugly when shared on Facebook or WhatsApp",
      "When someone copies your link and pastes it into Facebook, WhatsApp, LinkedIn, or iMessage, those apps look for a special title, description, and preview image. You haven't set them, so your link shows up as plain text or a broken-looking card — which gets dramatically fewer clicks than a polished preview with your photo.",
      "Your web developer can add the right tags so your site shows a clean preview card with photo, title, and description when shared."));
  }

  // Favicon
  const hasIcon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
  if (!hasIcon) {
    findings.push(finding("SEO", "low",
      "No little icon in the browser tab",
      "When someone opens your site, the browser tab is blank or shows a generic globe instead of your logo. Small thing, but it makes your business look unfinished compared to competitors who have it.",
      "Your web developer can add a small icon (your logo, simplified) that shows in browser tabs and bookmarks."));
  }

  // Viewport (mobile)
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    findings.push(finding("Mobile", "high",
      "Your site is not set up for phones",
      "Over half of website visits come from phones. Your site is missing the basic setting that tells phones how to display the page. Visitors on a phone see tiny, unreadable text and have to pinch-zoom around. Most of them leave immediately.",
      "Your web developer can fix this with a single line of code — but the deeper fix is making sure the whole site is designed to work on phones, not just desktops."));
  }

  // Lang
  const htmlTag = safeMatch(/<html\b([^>]*)>/i, html);
  if (htmlTag && !/\blang\s*=/.test(htmlTag)) {
    findings.push(finding("SEO", "low",
      "Your site doesn't tell browsers what language it's in",
      "There's a small setting that declares whether the page is in English, Spanish, French, etc. Without it, Google's auto-translate doesn't work properly and screen readers for blind users pronounce things incorrectly. Tiny fix.",
      "Your web developer can add a one-line language declaration."));
  }

  // Schema.org
  if (!/<script[^>]+type=["']application\/ld\+json["']/i.test(html)) {
    findings.push(finding("SEO", "low",
      "Missing the tags that get you stars, hours, and photos in Google",
      "You know how some Google results show star ratings, opening hours, prices, or a map right in the search result? That's powered by a special set of behind-the-scenes tags. Yours has none, so your listing in Google looks plain — just a blue link and a sentence — while competitors stand out with rich extra info.",
      "Your web developer can add 'LocalBusiness' tags listing your name, address, phone, hours, and reviews. This often moves the needle on clicks more than anything else."));
  }
}

async function checkRobotsAndSitemap(baseUrl, findings) {
  try {
    const u = new URL(baseUrl);
    const origin = `${u.protocol}//${u.host}`;
    const [robotsR, sitemapR] = await Promise.all([
      fetch(`${origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT } }).catch(() => null),
      fetch(`${origin}/sitemap.xml`, { headers: { "User-Agent": USER_AGENT } }).catch(() => null),
    ]);
    if (!robotsR || robotsR.status !== 200) {
      findings.push(finding("SEO", "low",
        "Missing the file that tells Google what to look at",
        "There's a small standard file ('robots.txt') that tells Google's crawler what pages to read and what to skip. Yours is missing. Not the end of the world, but professional sites have one — and it's where you point Google to your sitemap (see next finding).",
        "Your web developer can add this in 5 minutes."));
    }
    if (sitemapR && sitemapR.status === 200) {
      const t = await sitemapR.text();
      if (!/<urlset|<sitemapindex/i.test(t)) {
        findings.push(finding("SEO", "medium",
          "No map of your site for Google to follow",
          "A 'sitemap' is a list of every page on your site that you hand to Google so it can find and index everything. Without it, Google may miss your less-linked pages entirely — meaning they never show up in search.",
          "Your web developer can generate a sitemap and submit it to Google Search Console. Most website platforms (WordPress, Shopify, etc.) can do this automatically."));
      }
    } else {
      findings.push(finding("SEO", "medium",
        "No map of your site for Google to follow",
        "A 'sitemap' is a list of every page on your site that you hand to Google so it can find and index everything. Without it, Google may miss your less-linked pages entirely — meaning they never show up in search.",
        "Your web developer can generate a sitemap and submit it to Google Search Console. Most website platforms (WordPress, Shopify, etc.) can do this automatically."));
    }
  } catch (e) { /* swallow */ }
}

async function checkPageSpeed(url, findings, results, apiKey) {
  // PageSpeed Insights v5 — free, no API key needed for low volume.
  for (const strategy of ["mobile", "desktop"]) {
    try {
      const params = new URLSearchParams();
      params.set("url", url);
      params.set("strategy", strategy);
      for (const cat of ["performance", "accessibility", "best-practices", "seo"]) params.append("category", cat);
      if (apiKey) params.set("key", apiKey);
      const r = await fetch(`${PSI_ENDPOINT}?${params}`);
      if (r.status !== 200) continue;
      const data = await r.json();
      const lr = data.lighthouseResult || {};
      const cats = lr.categories || {};
      const scores = {};
      for (const [k, v] of Object.entries(cats)) scores[k] = Math.round((v.score || 0) * 100);
      results[`psi_${strategy}`] = scores;

      const perf = scores.performance || 0;
      const device = strategy === "mobile" ? "on phones" : "on computers";
      if (perf < 50) {
        findings.push(finding("Performance", strategy === "mobile" ? "high" : "medium",
          `Your site is slow ${device} (Google's score: ${perf}/100)`,
          "Google graded your site's speed as poor. Studies show that for every extra second a site takes to load, about half of mobile visitors give up and leave. Slow sites also get ranked lower in Google search results — so you're losing customers two ways: they can't find you, and the ones who do find you don't wait around.",
          "Common fixes: compress oversized photos (the biggest win for most sites), remove unused plugins, switch to faster hosting. A web developer can usually double the speed in a day's work."));
      } else if (perf < 75) {
        findings.push(finding("Performance", "medium",
          `Your site is slower than ideal ${device} (Google's score: ${perf}/100)`,
          "Not terrible, but there's real money on the table. Sites that score above 75 keep more visitors and rank better in Google. Yours has room to improve.",
          "Usually a matter of compressing photos and removing scripts you no longer need."));
      }

      const a11y = scores.accessibility || 0;
      if (a11y < 80) {
        findings.push(finding("Accessibility", strategy === "mobile" ? "medium" : "low",
          `Site is hard to use for people with disabilities (${a11y}/100 ${device})`,
          "Google scored your site low for accessibility — meaning blind users, color-blind users, and people with motor difficulties have a hard time using it. Two reasons to care: (1) you're turning away real customers, and (2) in many countries (USA, Canada, parts of EU) you can be sued for an inaccessible business website.",
          "Common fixes: improve color contrast (text vs. background), add descriptions to photos, make sure buttons are big enough to tap, label every form field."));
      }

      const seoScore = scores.seo || 0;
      if (seoScore < 80) {
        findings.push(finding("SEO", "medium",
          `Google's SEO grade for your site is low (${seoScore}/100 ${device})`,
          "Google's own scanner found several basic SEO issues. These are the easy wins that every business website should have — missing them is leaving free Google traffic on the table.",
          "A web developer can run Google's free PageSpeed Insights tool and walk through the SEO checklist. Most issues are small fixes."));
      }

      const audits = lr.audits || {};
      const lcp = audits["largest-contentful-paint"]?.numericValue;
      const cls = audits["cumulative-layout-shift"]?.numericValue;
      const tbt = audits["total-blocking-time"]?.numericValue;
      if (strategy === "mobile") {
        if (lcp && lcp > 4000) {
          findings.push(finding("Performance", "high",
            `Your main content takes ${(lcp/1000).toFixed(1)} seconds to show up on phones`,
            "When someone opens your site on their phone, they stare at a blank or half-loaded screen for over " + (lcp/1000).toFixed(1) + " seconds before they see your main content. Google considers anything over 2.5 seconds as 'poor' and ranks you lower for it. Most people don't wait that long.",
            "Usually fixed by compressing the big photo at the top of your homepage and moving slow-loading scripts to the bottom of the page."));
        } else if (lcp && lcp > 2500) {
          findings.push(finding("Performance", "medium",
            `Main content shows up slower than ideal on phones (${(lcp/1000).toFixed(1)}s)`,
            "Google wants to see your main content within 2.5 seconds. You're at " + (lcp/1000).toFixed(1) + " seconds — not awful, but improvable. Faster pages convert better and rank higher.",
            "Compress your hero image and any other large photos near the top of the page."));
        }
        if (cls && cls > 0.25) {
          findings.push(finding("Performance", "high",
            "Your page jumps around as it loads",
            "When someone opens your site, things move around as the page loads — text shifts, buttons jump. People tap the wrong link or get frustrated and leave. Google measures this and penalizes sites for it.",
            "Usually fixed by telling the browser the size of each photo before it loads, so the browser can reserve space for it instead of pushing other content around."));
        }
        if (tbt && tbt > 600) {
          findings.push(finding("Performance", "medium",
            "Your page freezes briefly while loading",
            "On a phone, your page becomes unresponsive for almost a second while it loads. Tapping a button or scrolling does nothing during that window. Visitors interpret this as the site being broken.",
            "Usually caused by too many third-party scripts (chat widgets, analytics, ads). A developer can audit which scripts are needed and remove or defer the rest."));
        }

        const opps = [];
        for (const [k, a] of Object.entries(audits)) {
          if (a?.details?.type === "opportunity") {
            const savings = a.details.overallSavingsMs || 0;
            if (savings > 1000) opps.push([savings, a.title || k]);
          }
        }
        opps.sort((a, b) => b[0] - a[0]);
        if (opps[0]) {
          findings.push(finding("Performance", "medium",
            `Biggest single speed fix would save about ${(opps[0][0]/1000).toFixed(1)} seconds`,
            "Google identified one specific change that would shave " + (opps[0][0]/1000).toFixed(1) + " seconds off your page load. The technical name is: " + opps[0][1] + ". That's a lot of speed for a single fix.",
            "Worth prioritizing — your web developer can look this up in Google's free PageSpeed report and apply the fix."));
        }
      }
    } catch (e) { /* swallow */ }
  }
}

function detectTech(html, headers, findings, results) {
  const stack = [];
  const lc = (html || "").toLowerCase();
  if (lc.includes("wp-content") || lc.includes("wp-includes")) stack.push("WordPress");
  if (lc.includes("cdn.shopify") || lc.includes("shopify")) stack.push("Shopify");
  if (lc.includes("wix.com")) stack.push("Wix");
  if (lc.includes("squarespace")) stack.push("Squarespace");
  if (lc.includes("drupal-settings-json") || lc.includes("/sites/default/")) stack.push("Drupal");
  if (lc.includes("/media/jui/") || lc.includes("joomla")) stack.push("Joomla");
  const server = headers?.get("server");
  const powered = headers?.get("x-powered-by");
  if (server) stack.push(`Server: ${server}`);
  if (powered) stack.push(`Powered-By: ${powered}`);
  results.stack = stack;
  if (stack.includes("Wix") || stack.includes("Squarespace")) {
    findings.push(finding("Tech", "info",
      `Built on ${stack[0]}`,
      "DIY website builders are limiting — SEO, speed, and customization are constrained by the platform.",
      "Consider migrating to WordPress or a custom build for more control and better performance."));
  }
}

// ─── Orchestration ──────────────────────────────────────────────────────────

export async function runSiteAudit(url, env) {
  url = normalizeUrl(url);
  const findings = [];
  const results = {};
  const ctx = {};

  await checkSiteFetch(url, findings, ctx);
  checkHttps(url, findings);
  checkSecurityHeaders(ctx.headers, findings);
  checkSEO(ctx.html, url, findings);
  detectTech(ctx.html, ctx.headers, findings, results);

  try { await checkObservatory(new URL(url).host, findings); } catch (e) {}
  await checkRobotsAndSitemap(url, findings);
  await checkPageSpeed(url, findings, results, env?.PAGESPEED_API_KEY);

  // Sort: severity, then category
  findings.sort((a, b) => (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) || a.category.localeCompare(b.category));
  return { url, findings, results, generatedAt: new Date().toISOString() };
}

// ─── HTTP handlers ──────────────────────────────────────────────────────────

export async function handleSiteAuditAPI(request, env, helpers) {
  const { json, isAdmin } = helpers;
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const target = url.searchParams.get("url") || (request.method === "POST" ? (await request.json().catch(() => ({}))).url : null);
  if (!target) return json({ error: "Missing url parameter" }, 400);
  try {
    const result = await runSiteAudit(target, env);
    return json(result);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function siteAuditReportHTML(targetUrl) {
  const safe = escapeHtml(targetUrl);
  // The page calls the JSON API itself (with the admin token from localStorage),
  // renders the report, then opens the browser's print dialog so the user can
  // "Save as PDF" — no PDF library needed on the server.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site Audit · ${safe}</title>
<style>
  :root {
    --bg: #f7f8fa; --card: #fff; --ink: #1A2032; --muted: #6b7280;
    --line: #e5e7eb; --brand: #FF5C2E;
    --crit: #b91c1c; --high: #c2410c; --med: #b45309; --low: #475569; --info: #0369a1;
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: var(--bg); color: var(--ink); margin: 0; padding: 32px 16px; line-height: 1.5; }
  .wrap { max-width: 880px; margin: 0 auto; }
  .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .topbar h1 { font-family: Georgia, serif; font-size: 28px; margin: 0; font-weight: 400; }
  .topbar .actions button { padding: 8px 14px; border-radius: 4px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-family: inherit; font-size: 13px; }
  .topbar .actions .primary { background: var(--brand); color: #fff; border-color: var(--brand); }
  .sub { color: var(--muted); margin-bottom: 24px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .score { text-align: center; padding: 12px; border-radius: 10px; background: #f3f4f6; }
  .score .n { font-size: 26px; font-weight: 700; }
  .score .small { font-size: 12px; color: var(--muted); }
  .score .l { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  .critical { background: #fef2f2; color: var(--crit); }
  .high     { background: #fff7ed; color: var(--high); }
  .medium   { background: #fefce8; color: var(--med); }
  .low      { background: #f1f5f9; color: var(--low); }
  .info     { background: #e0f2fe; color: var(--info); }
  .finding { border-top: 1px solid var(--line); padding: 16px 0; }
  .finding:first-child { border-top: 0; }
  .ftitle { font-weight: 600; margin: 6px 0; }
  .fdetail { color: var(--ink); margin-bottom: 6px; }
  .ffix { color: var(--muted); font-size: 14px; }
  .ffix b { color: var(--ink); }
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center; }
  .summary-grid div { padding: 12px; border-radius: 8px; }
  .small { font-size: 13px; color: var(--muted); }
  footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 32px; }
  .brand { color: var(--brand); font-weight: 700; }
  .loader { text-align:center; padding: 80px 20px; color: var(--muted); }
  .spin { display:inline-block; width:24px; height:24px; border:3px solid #e5e7eb; border-top-color:var(--brand); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media print {
    body { padding: 0; background: #fff; }
    .topbar .actions { display: none; }
    .card { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <h1>Pyme<span class="brand">WebPro</span> · Site Audit</h1>
    <div class="actions">
      <button onclick="window.print()" class="primary">Save as PDF</button>
    </div>
  </div>
  <div class="sub" id="sub">${safe}</div>
  <div id="report" class="card loader"><div class="spin"></div><div style="margin-top:14px">Auditing site… this takes ~30 seconds</div></div>
  <footer>Generated by <span class="brand">pymewebpro</span> audit tool</footer>
</div>
<script>
(async function() {
  const url = ${JSON.stringify(targetUrl)};
  const token = localStorage.getItem('pwp_admin');
  if (!token) {
    document.getElementById('report').innerHTML = '<div style="color:#b91c1c">Not signed in to admin. Open the admin portal first, then retry.</div>';
    return;
  }
  try {
    const r = await fetch('/api/admin/site-audit?url=' + encodeURIComponent(url), {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    document.getElementById('sub').textContent = data.url + ' · Generated ' + new Date(data.generatedAt).toLocaleString();
    document.getElementById('report').classList.remove('loader');
    document.getElementById('report').outerHTML = renderReport(data);
    // Auto-open print dialog after a short delay so layout settles
    setTimeout(() => window.print(), 600);
  } catch (e) {
    document.getElementById('report').innerHTML = '<div style="color:#b91c1c">Audit failed: ' + (e.message || e) + '</div>';
  }
})();

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}
function renderReport(data) {
  const f = data.findings || [];
  const counts = { critical:0, high:0, medium:0, low:0, info:0 };
  f.forEach(x => counts[x.severity] = (counts[x.severity] || 0) + 1);
  const psiM = data.results.psi_mobile || {};
  const psiD = data.results.psi_desktop || {};
  const cell = (label, m, d) => '<div class="score"><div class="n">' + (m??'–') + '<span class="small"> / ' + (d??'–') + '</span></div><div class="l">' + label + '</div></div>';
  let scoresBlock = '';
  if (Object.keys(psiM).length || Object.keys(psiD).length) {
    scoresBlock = '<div class="card"><strong>PageSpeed Insights</strong>'
      + '<div class="small" style="margin-bottom:10px">Mobile / Desktop (out of 100)</div>'
      + '<div class="scores">'
      + cell('Performance', psiM.performance, psiD.performance)
      + cell('Accessibility', psiM.accessibility, psiD.accessibility)
      + cell('Best Practices', psiM['best-practices'], psiD['best-practices'])
      + cell('SEO', psiM.seo, psiD.seo)
      + '</div></div>';
  }
  const stack = data.results.stack || [];
  const techBlock = stack.length ? ('<div class="card"><strong>Tech detected</strong><div class="small" style="margin-top:6px">' + stack.map(esc).join(' · ') + '</div></div>') : '';
  const findingsHtml = f.length ? f.map(x =>
    '<div class="finding">'
    + '<div><span class="pill ' + esc(x.severity) + '">' + esc(x.severity) + '</span> <span class="small">' + esc(x.category) + '</span></div>'
    + '<div class="ftitle">' + esc(x.title) + '</div>'
    + '<div class="fdetail">' + esc(x.detail) + '</div>'
    + (x.fix ? '<div class="ffix"><b>Fix:</b> ' + esc(x.fix) + '</div>' : '')
    + '</div>'
  ).join('') : '<div class="finding small">No issues found.</div>';

  return '<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><strong>Summary</strong>'
    + '<span class="small">' + f.length + ' issues found</span></div>'
    + '<div class="summary-grid">'
    + '<div class="critical"><div style="font-size:22px;font-weight:700">' + counts.critical + '</div><div class="small">Critical</div></div>'
    + '<div class="high"><div style="font-size:22px;font-weight:700">' + counts.high + '</div><div class="small">High</div></div>'
    + '<div class="medium"><div style="font-size:22px;font-weight:700">' + counts.medium + '</div><div class="small">Medium</div></div>'
    + '<div class="low"><div style="font-size:22px;font-weight:700">' + counts.low + '</div><div class="small">Low</div></div>'
    + '<div class="info"><div style="font-size:22px;font-weight:700">' + counts.info + '</div><div class="small">Info</div></div>'
    + '</div></div>'
    + scoresBlock + techBlock
    + '<div class="card"><strong>Findings</strong>' + findingsHtml + '</div>';
}
</script>
</body>
</html>`;
}
