# Mockup Pipeline · How to ship a new manual mockup

The exact build/deploy workflow used for every site in `manual-mockups/` (Schedulator, Blues Kitchen, Daga, BWI, Espacio Dental, PymeWebPro CA, and any new client).

## Step 1 · Source HTML

Write a single self-contained HTML file at:
```
~/code/pymewebpro/manual-mockups/<slug>/index.html
```

Constraints:
- Single file — all CSS inlined in `<style>`, all JS inlined in `<script>`
- Only external dependencies: Google Fonts (preconnect), Pexels CDN images, optional CDN scripts (Chart.js etc.)
- No external CSS/JS files — bundle must be self-contained
- Include `<link rel="icon">` for favicon (data URI SVG works great)
- Include OG meta tags (`og:title`, `og:description`, `og:image`, `og:type`)
- Footer credit: `Sitio web por <a href="https://pymewebpro.com">PymeWebPro</a>` (Spanish sites) or `Built by PymeWebPro` (English)

If the site needs photos that aren't on Pexels (e.g., Blues Kitchen used Instagram-sourced shots), put them in `manual-mockups/<slug>/photos/` and reference as `./filename.jpg` — they'll be base64-embedded in step 2.

## Step 2 · Wrap as JS module

Create `~/code/pymewebpro/portal/src/manual-mockups-<slug>.js`:

```javascript
// manual-mockups-<slug>.js — <Brand> marketing site.
// Brief description of what this mockup is.
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["<slug>"].

export const <varName>Html = `<full HTML content here>`;
```

Where `<varName>` is camelCase (`bluesKitchenHtml`, `dagaParfumHtml`, `pymewebproCaHtml`).

### Use this Python script to do it cleanly:

```python
import os, re

src = "/Users/mikec-home/code/pymewebpro/manual-mockups/<slug>/index.html"
dst = "/Users/mikec-home/code/pymewebpro/portal/src/manual-mockups-<slug>.js"

with open(src, encoding="utf-8") as f:
    html = f.read()

# Audit for template-literal hazards
print("backticks  :", html.count("`"))
print("dollarcurly:", html.count("${"))
oct_hits = re.findall(r"\\[0-7]", html)
print("oct escapes:", len(oct_hits), oct_hits[:5])

# If photos folder exists, base64-embed them:
import base64
src_dir = os.path.dirname(src)
refs = sorted(set(re.findall(r"\./([\w\-]+\.jpg)", html)))
for fn in refs:
    path = os.path.join(src_dir, fn)
    if os.path.exists(path):
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        html = html.replace(f"./{fn}", f"data:image/jpeg;base64,{b64}")

# Escape template-literal hazards
escaped = html
if "${" in escaped: escaped = escaped.replace("${", "\\${")
if "`" in escaped: escaped = escaped.replace("`", "\\`")
escaped = re.sub(r"\\([0-9])", r"\\\\\1", escaped)  # octal escapes

# CSS unicode escapes like \201C (left double quote) need double-backslash:
escaped = escaped.replace(r'content:"\201C"', r'content:"\\201C"')

header = (
    "// manual-mockups-<slug>.js — <Brand> marketing site.\n"
    "// Brief description.\n"
    "//\n"
    "// Imported by manual-mockups.js → MANUAL_MOCKUPS[\"<slug>\"].\n"
    "\n"
    "export const <varName>Html = `"
)
with open(dst, "w", encoding="utf-8") as f:
    f.write(header + escaped + "`;\n")
```

### Things to watch for:
- **Backticks** in HTML: must be escaped as `` \` ``
- **`${` interpolations**: must be escaped as `\${`
- **Octal escapes** like `\201C` (CSS unicode for `"`): must be `\\201C` in source
- **Backslashes** generally: count and audit

## Step 3 · Wire into MANUAL_MOCKUPS

Edit `~/code/pymewebpro/portal/src/manual-mockups.js`:

Add import near the top (after other manual-mockup imports):
```javascript
import { <varName>Html } from "./manual-mockups-<slug>.js";
```

Add to MANUAL_MOCKUPS map at the bottom:
```javascript
export const MANUAL_MOCKUPS = {
  schedulator: renderSchedulator(),
  "blues-kitchen": bluesKitchenHtml,
  // ... existing entries
  "<slug>": <varName>Html,  // NEW
};
```

The slug must match the URL path: `mockups.pymewebpro.com/<slug>/`.

## Step 4 · Add to `check:worker`

Edit `~/code/pymewebpro/portal/package.json`:

In the `check:worker` script, insert `&& node --check src/manual-mockups-<slug>.js` BEFORE the `&& echo` at the end.

This ensures the new module gets parsed on every deploy.

## Step 5 · Verify

```bash
cd ~/code/pymewebpro/portal
npm run check
```

Should output:
```
[check-worker] OK — worker source files parse cleanly
[check-spa] OK — SPA babel script parses cleanly (XXXXX chars)
```

If parse fails, the error message points to the issue. Common ones:
- `SyntaxError: Octal escape sequences are not allowed in template strings.` → unescaped `\201C` or similar in CSS
- `Unexpected template string` → unescaped backtick in HTML
- `Unexpected token '${'` → unescaped `${` in HTML

## Step 6 · Deploy

```bash
cd ~/code/pymewebpro/portal
npm run deploy
```

This is Mike's call. Wrangler pushes the worker bundle to Cloudflare. After deploy, the new mockup is live at `https://mockups.pymewebpro.com/<slug>/`.

## Bundle size budget

- Cloudflare Workers Plan: 10 MB compressed worker bundle limit
- Current bundle: well under (each manual mockup adds 40–600 KB depending on whether photos are base64-embedded)
- If a single mockup grows past ~3 MB, host photos on R2 instead of inlining

## Routing logic (`mockups.js`)

The mockups subdomain routing lives in `portal/src/mockups.js`:

```javascript
if (m === "GET" && reqHost === "mockups.pymewebpro.com") {
  const slugMatch = p.match(/^\/([a-z0-9-]+)\/?$/);
  const slug = slugMatch ? slugMatch[1] : null;
  if (slug && MANUAL_MOCKUPS[slug]) {
    return new Response(MANUAL_MOCKUPS[slug], {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "public, max-age=300",
      },
    });
  }
  // Index page lists all available slugs as <a> tags
  if (p === "/" || p === "") {
    return new Response(`...index page HTML...`, {...});
  }
}
```

Slug regex: `^\/([a-z0-9-]+)\/?$` — lowercase, alphanumeric, hyphens. Must use kebab-case.

## Reference: clients shipped with this pipeline

| Slug | Module file | Module size |
|------|-------------|-------------|
| schedulator | rendered inline in manual-mockups.js (function) | ~80 KB |
| blues-kitchen | manual-mockups-blueskitchen.js | ~568 KB (photos base64) |
| daga-parfum | manual-mockups-dagaparfum.js | ~43 KB (Pexels CDN) |
| blue-whale-international | manual-mockups-bluewhale.js | ~69 KB (Pexels CDN) |
| espacio-dental | manual-mockups-espaciodental.js | ~64 KB (Pexels CDN) |
| pymewebpro-ca | manual-mockups-pymewebproca.js | ~67 KB (Pexels CDN + thum.io thumbnails) |
