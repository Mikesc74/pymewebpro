# Memory · PymeWebPro Studio

This file is the hot cache. Claude reads this first on every session in `~/code/pymewebpro/`.
Full glossary and rich context live in `./memory/`.

## HARD RULE: Colombia-only market

**PymeWebPro serves Colombian SMBs only.** This is a Colombian company, billed in COP, marketed to Colombian customers, operating from Medellín.

Do NOT:
- Quote prices in CAD or USD on any pymewebpro asset
- Position the studio as serving NA / Canada / US / LATAM clients
- Mention London, Ontario as a business location
- Frame pymewebpro as bilingual for "two markets"
- Reference Wise, Stripe, or NA payment rails as our payment methods

DO:
- Quote prices in COP
- Treat Mike's Canadian nationality as a personal fact about the founder, not a market positioning
- Treat any English copy on pymewebpro as a courtesy for English-speaking Colombian residents / expats, not as an NA-market funnel
- Reference Wompi (cards, PSE, bank transfer) as the payment method
- Frame the studio as "Colombian web design studio" or "diseño web en Colombia"

## Me

**Michael Chartrand** ("Mike") — Canadian citizen by nationality, full-time resident of Medellín, Founder & Legal Representative of **Norte Sur Consulting S.A.S.**, doing business as **PymeWebPro**.
- **Legal entity:** Norte Sur Consulting S.A.S. (Colombian Sociedad por Acciones Simplificada)
- **NIT:** 901.956.771-1
- **DBA / brand:** PymeWebPro
- **Based in:** Medellín, Antioquia, Colombia
- **Email:** mike@mikec.pro

PymeWebPro is the public-facing brand and trade name. Norte Sur Consulting S.A.S. is the contracting legal entity on all invoices, contracts, banking, and tax filings.

**Two-person partnership.** Mike (Canadian founder by nationality, legal-entity owner, Medellín resident) and **Santiago Santos** (paisa, born and based in Medellín, profit-share partner) run the studio together. Both are in Medellín and have access to client records. Default routing:
- **Spanish-first / Colombian buyers** → Santiago (WhatsApp +57 301 404 7722, primary).
- **English-language Colombian / expat buyers in Colombia** → Mike (Cal.com 15-min call, WhatsApp).
- Either can hand off to the other if the situation calls for it.

Colombian web design studio targeting Colombian SMBs.

Do NOT describe the studio as "solo operator" or imply Mike works alone — Santiago is a real, named partner who shares profit and is publicly named in the FAQ + privacy policy as a person with access to client records.

## Studio · One-line

PymeWebPro = a Medellín-based, AI-leveraged web design studio that ships custom-coded sales pages on Cloudflare for Colombian SMBs at a fraction of agency pricing.

## Location

- **Medellín, Antioquia, Colombia** — studio · design, code & deploy · Colombian clients billed in COP via Wompi.

Single location. No London office. Mike's family home is in London, Ontario but that is a personal fact, not a business location and must not appear on pymewebpro public surfaces.

## Pricing (current)

| Tier | Price | Includes |
|------|-------|----------|
| Essential | $390.000 COP one-time | 1 yr hosting+support |
| Pro | $690.000 COP one-time | 2 yr hosting+support |

**Both Essential and Pro are multi-page custom sites.** Essential includes a WhatsApp button, lead form to email, custom domain + SSL, 1 year hosting + support, 1 week of free post-launch revisions. Pro adds a blog, PDF download section, GA4 + Meta Pixel tracking, bilingual support (EN/ES) if the client needs it, 2 years hosting + support, 2 weeks of free post-launch revisions.

## Hosting

- **$30.000 COP/mes** or **$270.000 COP/año** (25% prepay discount) for ongoing hosting after the included period
- Essential includes 1 yr · Pro includes 2 yr
- Optional maintenance add-on: extra cost on top of hosting (monthly content updates, security patches, minor design)
- Ad-hoc edits: hourly, COP-denominated, 30-min minimum

## Payment terms

- **30% deposit to start** — no design or development begins until deposit clears ($117.000 COP Essential / $207.000 COP Pro)
- **70% on launch** — site sits on staging URL; DNS to client domain not connected until balance clears
- Payments via **Wompi** (cards, PSE, bank transfer) in COP only
- **30-day money-back guarantee post-launch:** site goes offline + full refund within 14 days if client unhappy. After 30 days, fee is non-refundable.

Switched from 50/50 to 30/70 on 2026-05-05. Lower psychological barrier to start (productized service, not custom agency build), DNS gating on the 70% balance still protects against non-payment.

→ Full strategy + economics: `memory/context/studio.md`

## Brand identity

| Mark | Use |
|------|-----|
| `<pymewebpro/>` | Site header, footer, email, invoices |
| `<pwp/>` | Favicon, social profile pic, app icon |
| `#FF5C2E` | Single accent (orange) — bracket color in small format |
| Inter Tight + JetBrains Mono | Display / mono pair |
→ Full design system: `memory/context/brand.md`

## Pipeline · "manual mockup"

Build process for every client site:
1. Write self-contained HTML in `manual-mockups/<slug>/index.html`
2. Run `node portal/scripts/rebuild-mockups.mjs` — auto-discovers wired mockups from `portal/src/manual-mockups.js` imports and regenerates each `portal/src/manual-mockups-<slug>.js` module from its source HTML (base64-embeds local jpg/png references, applies template-literal escapes). Avoids the trap of hardcoded site lists going stale.
3. New site only: add the import + map entry to `portal/src/manual-mockups.js`, add the file to `portal/package.json` `check:worker` script
4. `npm run check` → verify
5. `npm run deploy` → goes live at `mockups.pymewebpro.com/<slug>/`
→ Full pipeline: `memory/context/pipeline.md`

## Production marketing site

The studio's primary site at **pymewebpro.com** is Spanish-primary, Colombian-market only. It is served by Cloudflare Pages from the repo root `index.html` (sibling Pages project, not the Worker). Source-of-truth HTML lives at `manual-mockups/pymewebpro-ca/index.html` (legacy folder name — kept for git history, contents are now Colombia-only) — copy to repo root after edits and `git push` to deploy via Pages.

ES (primary): $390.000 / $690.000 COP, Wompi payments, Colombian-market copy.
EN (secondary courtesy): optional English version for English-speaking Colombian residents and expats. Same COP pricing. Same Colombian-market positioning. NOT an NA-market funnel.

Single footer with Medellín location and the Norte Sur NIT block. The site previously had London/Ontario + NA-market framing — that is stale and should be removed wherever it still appears.

**Outstanding cleanup as of 2026-05-13:** Homepage `index.html`, `en/index.html`, and various other pages still contain `.price-na` / `.price-co` swap classes, "$500 CAD" references, London/Ontario footer entries, and "Canadian-led, built in Medellín" framing. These need a sweep to remove. The new traffic guide pages at `/guides/traffic/` and `/en/guides/traffic/` were corrected on 2026-05-13.

## Active client mockups (8 wired)

| Slug | Brand | Sector | Status |
|------|-------|--------|--------|
| `schedulator` | The Schedulator | B2B SaaS | Live, v21 shipped |
| `blues-kitchen` | The Blues Kitchen | Events venue | Live, photos embedded |
| `daga-parfum` | Daga Parfum | Luxury fragrance e-comm | Live |
| `blue-whale-international` | BWI Talent | Finance + tech recruiting | Live, refocused 2026-05 |
| `espacio-dental` | Espacio Dental | Dental clinic (expat-targeted) | Live |
| `pymewebpro-ca` | PymeWebPro (now bilingual EN/ES, primary site) | Studio's own | Live · also = root pymewebpro.com |
| `marena` | Marena | Fashion retail (cold outreach) | Live |
| `start` | PymeWebPro /start | Tutorial walkthrough page | Live |
→ Per-client briefs: `memory/projects/`

All 7 sites with a navbar (i.e. all except `start`) ship a **working hamburger drawer**: 3-bar toggle → animated X, slide-in `.nav-drawer` from right with brand-tinted scrim, body scroll lock, close on link/scrim/Escape. Brand colors per site via `--accent`, `--ink`, `--line` vars.

## Tech stack

- Cloudflare Workers (single worker `pymewebpro-portal`)
- D1 (SQLite), R2 (storage), KV
- Wrangler CLI · `npm run deploy`
- Worker source: `~/code/pymewebpro/portal/src/`
- Manual mockup HTML sources: `~/code/pymewebpro/manual-mockups/`

## Payments — what we accept

| Method | Currency | Use |
|--------|----------|-----|
| Wompi | COP | All clients · bank transfers (PSE) + cards |

**No Stripe account.** We do NOT use Stripe for our own payments. We CAN integrate Stripe into client sites (they provide their own merchant account). Don't list Stripe as a PymeWebPro payment method on any site.

**No Wise / CAD / USD.** Even though Mike has a Wise Business account personally, PymeWebPro the studio does NOT bill in CAD or USD and does NOT use Wise as a payment method. Colombian customers pay in COP via Wompi. Period.
→ Setup details: `memory/context/studio.md`

## Positioning · key phrases

- "Estudio de diseño web en Medellín. Construido con Claude de Anthropic."
- "Páginas de ventas custom. Sub-1s LCP. Entrega en 48 horas."
- "Claude construye. Mike y Santiago supervisan, revisan, lanzan."
- "Lo que las agencias cobran $5M COP, nosotros lo cobramos $390k COP."

**What we don't claim:**
- We don't claim "Canadian-led" or "Canadian-owned" as a market position. Mike's nationality is a personal fact, not a sales angle for Colombian SMBs.
- We don't position ourselves as senior engineers, a development team, or programmers. The pitch is honest: a small studio that uses Anthropic AI to do the technical work, with humans setting briefs and reviewing output before shipping.
- We don't serve NA / US / Canada / international clients. Customers are Colombian SMBs only.

## Mike's preferences

- Keep responses brief and to the point
- Use contractions in English copy ("we're", "it's", not "we are", "it is")
- No emojis unless explicitly asked
- Show real numbers (Lighthouse 100, LCP 0.84s) instead of vague claims
- Honest framing over marketing-speak (e.g., "Why we cost less" sections)
- Prefer files over chat for durable artifacts

## Hard writing rules (apply to chat AND every site we ship)

1. **No em dashes.** Never use the em dash character (the long dash). Use commas, periods, colons, parentheses, or " · " separators instead. This applies to all client sites, all marketing copy, all chat responses. The em dash is a tell of AI writing and Mike does not want it in anything we ship.
2. **No "delve", "tapestry", "navigate" (when used metaphorically), "in the realm of", "embark on a journey", "a testament to", "stands as", "fast-paced world", "in today's", "leverage" (as a verb), "vibrant ecosystem".** Replace with plain language.
3. **Sentence case headings** unless a brand specifically uses Title Case (none currently do).
4. **Use contractions** in English copy.

## Hard build constraints (apply to every HTML file we ship)

These are non-negotiable. If a brief asks for something that violates these, push back.

1. **No runtime CSS frameworks via CDN.** Never use `<script src="https://cdn.tailwindcss.com">` or any equivalent. That CDN is for prototyping only and adds a 3MB+ JS payload that destroys LCP. We ship custom inline `<style>` blocks (AI-built, human-reviewed; no framework runtime). Tailwind, Bootstrap, Bulma, Pico — none belong in production output.
2. **No CDN scripts at all** except: Google Fonts (preconnect + stylesheet), Pexels images (CDN URLs OK), and explicitly-allowed libraries we choose case-by-case (e.g., a small Chart.js or three.js when the build genuinely needs it).
3. **Real product photos required.** A fashion site without product photos is wireframe-tier. A real-estate site without property shots is wireframe-tier. Use Pexels CDN URLs at minimum, base64-embed when local files are provided. CSS gradients are NEVER an acceptable substitute for images on product, portfolio, or gallery cards.
4. **No marquee scrolling text bars.** Dated 2018 e-comm trope. If you need to convey shipping/return/promo info, use a static notice bar.
5. **No fake placeholder phone numbers** like `+57 300 000 0000`. Either use the real number, or omit the number, or write `[client phone]` as an obvious placeholder.
6. **Footer must include:**
   - For Colombian-facing sites: NIT, registered address, Cámara de Comercio compliance line
   - For all sites: "Sitio web por PymeWebPro" (Spanish) or "Built by PymeWebPro" (English) credit, linking to https://pymewebpro.com
7. **Sub-1s LCP is a baseline, not a stretch goal.** Critical CSS inlined, fonts preconnected, images width/height locked, lazy-loading below the fold, no render-blocking JS.
8. **Self-contained single-file HTML.** All CSS in `<style>`, all JS in `<script>`. The mockup pipeline wraps each file as a JS template literal — external dependencies break this.
9. **Lighthouse 100 across Performance, Accessibility, Best Practices, SEO** at launch. If any score drops below 95, fix before shipping.
10. **Schema.org JSON-LD baseline.** Every site ships with at minimum: Organization, WebSite, Service (one per pricing tier), and FAQPage blocks. Inline `<script type="application/ld+json">` in head. Any inline JSON-LD must have its SHA-256 hash added to the CSP allowlist in `_headers` for sites served by Cloudflare Pages.
11. **Security headers baseline (Cloudflare Pages sites).** `_headers` must include: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` zeroing out unused features, and a `Content-Security-Policy` with hash-locked inline scripts. Goal is qualys.ssllabs.com A+ on day one.

### Pre-deploy validation

Run `npm run check` from `portal/`. The check pipeline includes:
- `check:worker` — every JS file in src/ parses cleanly
- `check:spa` — the Babel-transpiled SPA template literal parses cleanly
- `check:standards` — every `manual-mockups/<slug>/index.html` validates against the build constraints above

Any failure blocks deploy. Don't bypass with `--no-verify` — fix the underlying issue.

## Brand voice rules

These apply to all copy on every site we ship.

- **Restrained over edgy.** Daga's "quiet confidence" beats "Vestida para arruinarles la noche." We don't sell trying-too-hard.
- **Honest over aspirational.** "Why we cost less" beats "disrupting the industry." Real numbers (LCP 0.84s) beat vague claims (super fast).
- **Specific over generic.** "Cloudflare Workers · 330+ edge locations" beats "enterprise-grade infrastructure."
- **Confident over hedged.** "We don't ship sites we're not proud of" beats "we strive to deliver excellence."

## Common AI mistakes that show up when sessions skip the memory

If you find yourself reaching for any of these patterns, stop and reconsider:

- Tailwind CDN (see build constraint #1)
- CSS gradients in place of product photos (see build constraint #3)
- Marquee bars (see build constraint #4)
- Em dashes (see writing rule #1)
- "Marketplace" claims with no marketplace mechanics
- Edgy product naming for sensual/luxury brands ("Veneno", "Medusa", "Latigazo" — leans tasteless)
- Fake addresses and phone numbers
- Generic stock copy like "made with passion in Medellín"
- Skipping favicon, OG image, schema.org JSON-LD
- Skipping the NIT footer block on Colombian sites

When in doubt, look at how Daga, BWI, or Espacio Dental handle the equivalent moment. Those are the reference quality bar.

## Glossary highlights

| Term | Meaning |
|------|---------|
| **manual mockup** | Self-contained HTML site served from `mockups.pymewebpro.com/<slug>/` |
| **the worker** | Cloudflare Workers code at `~/code/pymewebpro/portal/` |
| **the SPA** | React admin in `src/index.js` (Babel standalone) |
| **Lanzar final** | Deploy customer site to production (Essential/Pro clients) |
| **wizard intake** | The step-by-step client onboarding flow |
| **Essential / Pro** | The two pricing tiers · $390.000 COP / $690.000 COP one-time, Colombia-only |
| **mockups subdomain** | mockups.pymewebpro.com |
→ Full glossary: `memory/glossary.md`
