# Memory · PymeWebPro Studio

This file is the hot cache. Claude reads this first on every session in `~/code/pymewebpro/`.
Full glossary and rich context live in `./memory/`.

## HARD RULE: Colombia-only market, COP-only pricing

**PymeWebPro serves Colombian SMBs only.** This is a Colombian company, billed in COP, marketed to Colombian customers, operating from Medellín.

**The demographic is Colombian. ALWAYS quote money in Colombian pesos (COP), and ONLY in COP.** This rule applies to:
- Every page on pymewebpro.com (Spanish and English versions)
- Every blog post, guide, or article we publish
- Every chat response when discussing pricing, costs, budgets, examples, or competitor benchmarks
- Every client proposal, invoice, email, social post

A Colombian reader does NOT need a USD conversion. Don't include one. When citing international tool costs (Ahrefs, SEMrush, Meta Ads, Beehiiv, etc.), do the conversion to COP at the prevailing TRM (roughly $4.000 COP/USD as of mid-2026) and quote ONLY the COP figure. No "(~$129 USD)" parenthetical, no "USD" label, no mixed-currency tables. Pure COP, period.

The only exception: industry-standard ratio statistics where the unit cancels out (e.g. "email ROI is roughly $36 to $42 per $1 spent") can remain as a ratio without forcing a COP conversion, because the figure is a ratio not a price the reader pays.

Do NOT:
- Quote prices in CAD or USD as the primary unit on any pymewebpro asset
- Position the studio as serving NA / Canada / US / LATAM clients
- Mention London, Ontario as a business location
- Frame pymewebpro as bilingual for "two markets"
- Reference Wise, Stripe, or NA payment rails as our payment methods

DO:
- Quote prices in COP, with full thousand-separator formatting (`$390.000 COP`, `$20 million COP`)
- Treat Mike's Canadian nationality as a personal fact about the founder, not a market positioning
- Treat any English copy on pymewebpro as a courtesy for English-speaking Colombian residents / expats, not as an NA-market funnel
- Reference Wompi (cards, PSE, bank transfer) as the payment method
- Frame the studio as "Colombian web design studio" or "diseño web en Colombia"

## Me

**Michael Chartrand** ("Mike") · Canadian citizen by nationality, full-time resident of Medellín, Founder & Legal Representative of **Norte Sur Consulting S.A.S.**, doing business as **PymeWebPro**.
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

Do NOT describe the studio as "solo operator" or imply Mike works alone · Santiago is a real, named partner who shares profit and is publicly named in the FAQ + privacy policy as a person with access to client records.

## Studio · One-line

PymeWebPro = a Medellín-based, AI-leveraged web design studio that ships custom-coded sales pages on Cloudflare for Colombian SMBs at a fraction of agency pricing.

## Location

- **Medellín, Antioquia, Colombia** · studio · design, code & deploy · Colombian clients billed in COP via Wompi.

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

- **30% deposit to start** · no design or development begins until deposit clears ($117.000 COP Essential / $207.000 COP Pro)
- **70% on launch** · site sits on staging URL; DNS to client domain not connected until balance clears
- Payments via **Wompi** (cards, PSE, bank transfer) in COP only
- **30-day money-back guarantee post-launch:** site goes offline + full refund within 14 days if client unhappy. After 30 days, fee is non-refundable.

Switched from 50/50 to 30/70 on 2026-05-05. Lower psychological barrier to start (productized service, not custom agency build), DNS gating on the 70% balance still protects against non-payment.

→ Full strategy + economics: `memory/context/studio.md`

## Brand identity

| Mark | Use |
|------|-----|
| `<pymewebpro/>` | Site header, footer, email, invoices |
| `<pwp/>` | Favicon, social profile pic, app icon |
| `#FF5C2E` | Single accent (orange) · bracket color in small format |
| Inter Tight + JetBrains Mono | Display / mono pair |
→ Full design system: `memory/context/brand.md`

## Pipeline · "manual mockup"

Build process for every client site:
1. Write self-contained HTML in `manual-mockups/<slug>/index.html`
2. Run `node portal/scripts/rebuild-mockups.mjs` · auto-discovers wired mockups from `portal/src/manual-mockups.js` imports and regenerates each `portal/src/manual-mockups-<slug>.js` module from its source HTML (base64-embeds local jpg/png references, applies template-literal escapes). Avoids the trap of hardcoded site lists going stale.
3. New site only: add the import + map entry to `portal/src/manual-mockups.js`, add the file to `portal/package.json` `check:worker` script
4. `npm run check` → verify
5. `npm run deploy` → goes live at `mockups.pymewebpro.com/<slug>/`
→ Full pipeline: `memory/context/pipeline.md`

## Prospect mockups · build playbook for Claude in Cowork

When Mike says `build mockup for <slug>`, this is the procedure. The studio admin captures the brief in D1; Cowork (you, Claude) does the actual design + build work. Each mockup is bespoke, never template-driven · Mike will reject anything that looks recycled from another build.

### Step 1 · Get the brief

The brief lives in D1 table `mockup_prospects` (uuid 93fc7e21-713c-4479-bb55-69ae05c275dc on the `pymewebpro-portal` db) and includes: business_name, instagram_url, facebook_url, tiktok_url, website_url, style_brief, owner_name, owner_whatsapp, cal_link, notes, chatbot_system_prompt, status. Claude in the Cowork sandbox CANNOT query D1 directly (no Cloudflare creds, admin API is Access-gated). Two paths to obtain the brief:
- Ask Mike to copy-paste it. Fastest.
- Have him export from the studio admin at `colguides.com/portal/pymewebpro/admin/mockups/<slug>`.

If `notes` has content, READ IT FIRST. That's Mike's running feedback log from prior iterations.

### Step 2 · Study the brand

Always do this before designing. Skipping it is what produces template-y output.
- WebFetch usually fails on Instagram/Facebook/TikTok (JS-rendered shells). Either ask Mike for screenshots of the IG profile + 3-4 grid posts + a story, or use the Claude-in-Chrome MCP if the extension is installed.
- Their existing website (if any) WebFetches fine and tells you their actual copy voice, layout instincts, what they highlight.
- Extract from sources: logo + palette (use the actual hex of the dominant color, not "green"), typography vibe in their graphics, photography style (photo-driven vs type-and-icon driven), voice (formal vs warm, paisa-friendly vs neutral), what services they emphasize, brand archetype (caregiver, expert, friend, etc).
- Confirm with Mike before designing: address, hours, services, anything the owner specifically wants featured. Don't fabricate operational details · clearly placeholder anything you don't know.

### Step 3 · Pick the design direction

- Spanish primary. Only add English secondary if the brief explicitly says so (expat-facing).
- Pick a type pairing distinct from existing mockups so the studio's work doesn't look interchangeable. Current pairings in use: see `manual-mockups/*/index.html`. Avoid copying.
- Pick 4-6 brand colors with explicit hex values. Don't reach for the generic teal/coral palette by default.
- Decide photo vs type-and-icon driven. If the brand's IG is graphic-heavy (badges, callouts, illustration), type-and-icon often beats photo. If they shoot a lot of product/people, photo-driven works.
- The "voice" of CTAs and copy must match the brand archetype. A caregiver pharmacy ("Tu droguería de confianza") doesn't speak the same way as a parfumerie ("Vestida para arruinarles la noche").

### Step 4 · Build the bespoke HTML

Write `manual-mockups/<slug>/index.html`. Hard constraints:
- Fully self-contained: inline CSS, optional inline JS, no external CSS framework.
- Allowed externals: Google Fonts preconnect + stylesheet, the brand's logo file embedded via `rebuild-mockups.mjs` base64 pipeline.
- No em dashes anywhere in user-visible text.
- Mobile-first, breakpoint at ~780-880px depending on layout.
- Honor `prefers-reduced-motion`, include `@media print` cleanup, semantic HTML.
- JSON-LD: at minimum LocalBusiness + relevant Service.
- Chat widget mandatory: floating fab + slide-up panel + JS that POSTs to `/api/chat/<slug>` and handles `[ORDER]` / `[HANDOFF]` markers → wa.me link. Reuse the structure from `manual-mockups/central-farma-drogueria/index.html`.
- All visible CTAs route to the chat agent (`data-action="open-chat"`), NOT directly to WhatsApp. Contact info cards and footer can show WhatsApp as data.

### Step 5 · Image handling

Gemini Imagen generates good photos but mangles embedded text (logos on signage, license plates, etc). When Mike provides images:
- They land as PNGs from Imagen. Compress to JPG in the sandbox:
  ```bash
  cd /sessions/bold-keen-davinci/mnt/code/pymewebpro/manual-mockups/<slug>
  for f in hero-*.png; do
    convert "$f" -resize "1000x>" -strip -quality 82 -interlace JPEG "${f%.png}.jpg"
  done
  ```
  Targets: ~100-200KB per JPG, max width 1000px, quality 82.
- Logo files: keep as PNG (transparency matters), ~100KB or smaller. Use it via `background-image:url('./logo-mark.png')` in CSS so the rebuild script base64-embeds it ONCE and every touchpoint reuses it via the class.
- For per-photo brand overlays (CF badge on a delivery crate, fake clean license plate), use absolutely-positioned overlay elements scoped to a specific slide via `[data-slide="N"]` attribute selectors. Be ready to iterate on percentage positioning from screenshots Mike sends. Don't guess pixel-precise on the first try.

### Step 6 · Lessons learned (gotchas to avoid)

- **`aspect-ratio` collapses to zero when all children are `position:absolute`.** Use the `padding-top:<ratio>%` trick instead (e.g. `padding-top:125%` for 4:5). The CF gallery silently rendered at zero height for half a day because of this.
- **Imagen embeds garbled text in plates/signs.** Don't ask Imagen to render specific brand text (it auto-completes to plausible existing brands · "CF" became "COLOMBIA FAST CF"). Generate clean blank surfaces and overlay branding via CSS.
- **CSP set by `withSecurityHeaders` in `portal/src/index.js`** restricts what scripts can load. Cloudflare's Web Analytics beacon is allowed via the explicit `static.cloudflareinsights.com` addition. If you load any new third-party (analytics, fonts beyond Google, etc), update the CSP allowlist there.
- **Heavy base64 bundles are fine.** Existing mockups range from 28KB to 1.7MB. Lighthouse doesn't penalize inline images the way it penalizes blocking HTTP waterfalls.
- **Stale "por WhatsApp" copy.** When the agent is the front door, every "escríbenos por WhatsApp" and "pídenos por WhatsApp" in user-visible copy must be swapped. Keep WhatsApp framing only in (a) the chat widget's error fallback and footer disclaimer, (b) contact-info cards as data.
- **The studio admin's auto-synthesized chatbot prompt is too thin.** Once a mockup is past the first draft, populate `chatbot_system_prompt` with real (or plausibly-made-up-for-mockup) FAQ data: products carried, prices, coverage zones, services. Otherwise the agent escalates every specific question to WhatsApp, defeating its own purpose.

### Step 7 · Quality gate (blocks deploy)

```bash
cd ~/code/pymewebpro/portal
node scripts/check-standards.mjs
```

Must return 0 FAILs. WARN-level issues (Organization JSON-LD regex, og:title, NIT block for Colombian sites) are acceptable as long as they're considered. Production mockups generally have 2-3 standing WARNs.

### Step 8 · Wire into the registry

For a NEW slug:
1. Append `import { <camelCase>Html } from "./manual-mockups-<flatslug>.js";` to `portal/src/manual-mockups.js`.
2. Add the entry to the `MANUAL_MOCKUPS` map in the same file.
3. Create an empty placeholder file at `portal/src/manual-mockups-<flatslug>.js` so the rebuild script has somewhere to write.
4. Add the slug to `toolListMockups()` in `portal/src/chief-of-staff.js` so the studio's chief-of-staff agent knows about it.

For an EXISTING slug being re-built (iteration): no registry changes needed.

### Step 9 · Rebuild + deploy

```bash
cd ~/code/pymewebpro/portal
node scripts/rebuild-mockups.mjs          # base64-embed images, regenerate bundle
node scripts/check-standards.mjs           # block on FAILs
wrangler deploy                            # ~5s to ship
cd .. && git add -A && \
  git commit -m "<slug>: <short summary of what changed>" && \
  git push                                 # for posterity
```

Live URL: `https://mockups.pymewebpro.com/<slug>/`.

### Step 10 · Confirm with Mike + log

- Paste the live URL + a 3-line summary of what shipped (sections, visual direction, anything to verify on his end).
- Tell Mike to flip the prospect's `status` from `brief` to `live` in the studio admin once the URL renders correctly. This keeps the listing honest AND lets the "Copy build prompt" button auto-detect `revise` vs `build` on next iteration.
- Add a Recent changes entry at the top of `~/code/pymewebpro/CLAUDE.md`. Date, slug, files touched, deploy command, any follow-ups.
- The first build is rarely the last. Mike iterates via the `notes` textarea on the prospect's admin row. Next session reads those notes first.

### Step 11 · Generic chatbot

The chat widget on every prospect mockup talks to `mockups.pymewebpro.com/api/chat/<slug>` (handler at `portal/src/prospect-chat.js`). It auto-synthesizes a Spanish system prompt from the brief unless `chatbot_system_prompt` is set on the D1 row. After the first build:
- Draft a real FAQ-style system prompt as a `chatbot-prompt.md` file alongside the index.html (so it's checked into git).
- Tell Mike: `cat manual-mockups/<slug>/chatbot-prompt.md | pbcopy`, then paste into the System prompt textarea in studio admin, save.
- The agent picks it up on next request (no deploy needed; D1 reads are live).

## Production marketing site

The studio's primary site at **pymewebpro.com** is Spanish-primary, Colombian-market only. Served by Cloudflare Pages directly from the repo root: **`index.html`** (Spanish, primary) and **`en/index.html`** (English secondary). Edit those files directly. There is no longer a `manual-mockups/pymewebpro-v4/` build-source folder, no `scripts/build-bilingual.mjs`, no `npm run build:bilingual` step. `check:standards` (run by `npm run check`) validates both root files in-place.

ES (primary): $390.000 / $690.000 COP, Wompi payments, Colombian-market copy.
EN (secondary courtesy): optional English version for English-speaking Colombian residents and expats. Same COP pricing. Same Colombian-market positioning. NOT an NA-market funnel.

Single footer with Medellín location and the Norte Sur NIT block.

**Section 4 "La Prueba" testimonials** ship three Google reviews in a 3-column grid at desktop/tablet (single column on mobile): Patrick Detzner (Schedulator), Orlando de La Flor Ferrari (Blue Whale International), Santiago Florez (Inviersol).

**`builds-grid` below the reviews** points at the public-facing URL for each build. Live customer sites use their real domain (Schedulator → schedulator2.vercel.app, Inviersol → inviersol.com), concept mockups use `mockups.pymewebpro.com/<slug>/`.

## Active client mockups (6 wired)

Three former entries (`schedulator`, `inviersol`, all `pymewebpro-*` variants) were removed from the mockups registry on 2026-05-18 because they're either now live on their own domains or no longer needed.

| Slug | Brand | Sector | Status |
|------|-------|--------|--------|
| `blues-kitchen` | The Blues Kitchen | Events venue | Live, photos embedded |
| `daga-parfum` | Daga Parfum | Luxury fragrance e-comm | Live |
| `blue-whale-international` | BWI Talent | Finance + tech recruiting | Live, refocused 2026-05 |
| `espacio-dental` | Espacio Dental | Dental clinic (expat-targeted) | Live |
| `marena` | Marena | Fashion retail (cold outreach) | Live |
| `start` | PymeWebPro /start | Tutorial walkthrough page | Live |
→ Per-client briefs: `memory/projects/`

Plus three `medellin-guide*` variants for the sibling guide network.

All sites with a navbar (i.e. all except `start`) ship a **working hamburger drawer**: 3-bar toggle → animated X, slide-in `.nav-drawer` from right with brand-tinted scrim, body scroll lock, close on link/scrim/Escape. Brand colors per site via `--accent`, `--ink`, `--line` vars.

## Tech stack

- Cloudflare Workers (single worker `pymewebpro-portal`)
- D1 (SQLite), R2 (storage), KV
- Wrangler CLI · `npm run deploy`
- Worker source: `~/code/pymewebpro/portal/src/`
- Manual mockup HTML sources: `~/code/pymewebpro/manual-mockups/`

### Master portal subpath mount (2026-05-13)

The same `pymewebpro-portal` worker also serves the studio admin under the master portal at **colguides.com/portal/pymewebpro/*** (Mike + Santi only, Cloudflare Access-gated). Mechanism:

- Wrangler route `colguides.com/portal/pymewebpro/*` directs traffic to this worker.
- The fetch handler detects `colguides.com` host + the `/portal/pymewebpro` prefix, strips it from `url.pathname`, reconstructs the Request, and lets the existing router see root-relative paths unchanged.
- After the response is built, `rewriteForPwpSubpath()` rewrites Location redirects and HTML `href`/`action`/`src` attributes to prepend the prefix, and injects `<script>window.PWP_BASE="/portal/pymewebpro";</script>` into HTML responses.
- The SPA reads `window.PWP_BASE` via the `pwpBase()` / `pwpStripBase()` / `pwpPush()` / `pwpReplace()` helpers at the top of the inlined React app. All fetch helpers (`api`, `adminApi`), direct `fetch('/api/...')` calls, and the client-side router prepend the base on writes and strip it on reads.

Adding a new direct `fetch('/api/...')` or `window.location.href = '/...'` anywhere in the SPA? Always wrap the path: `pwpBase() + '/api/...'`. Otherwise it'll 404 under the master portal mount while still working on `portal.pymewebpro.com`.

`portal.pymewebpro.com` is retained as the legacy URL during the cutover and will be removed from `wrangler.toml` routes once the master portal is verified.

## Payments · what we accept

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
- **Updated 2026-05-20 per Mike:** "Canadian-owned" IS allowed as a subtle trust signal (and London, Ontario can be listed as "the Canadian studio" beside the Medellín studio). Do NOT lead with it and do NOT imply superiority over Colombians. The market is still Colombian SMBs only, billed in COP. Mike being Canadian and a leader are facts; Santiago is a paisa partner.
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

1. **No runtime CSS frameworks via CDN.** Never use `<script src="https://cdn.tailwindcss.com">` or any equivalent. That CDN is for prototyping only and adds a 3MB+ JS payload that destroys LCP. We ship custom inline `<style>` blocks (AI-built, human-reviewed; no framework runtime). Tailwind, Bootstrap, Bulma, Pico · none belong in production output.
2. **No CDN scripts at all** except: Google Fonts (preconnect + stylesheet), Pexels images (CDN URLs OK), and explicitly-allowed libraries we choose case-by-case (e.g., a small Chart.js or three.js when the build genuinely needs it).
3. **Real product photos required.** A fashion site without product photos is wireframe-tier. A real-estate site without property shots is wireframe-tier. Use Pexels CDN URLs at minimum, base64-embed when local files are provided. CSS gradients are NEVER an acceptable substitute for images on product, portfolio, or gallery cards.
4. **No marquee scrolling text bars.** Dated 2018 e-comm trope. If you need to convey shipping/return/promo info, use a static notice bar.
5. **No fake placeholder phone numbers** like `+57 300 000 0000`. Either use the real number, or omit the number, or write `[client phone]` as an obvious placeholder.
6. **Footer must include:**
   - For Colombian-facing sites: NIT, registered address, Cámara de Comercio compliance line
   - For all sites: "Sitio web por PymeWebPro" (Spanish) or "Built by PymeWebPro" (English) credit, linking to https://pymewebpro.com
7. **Sub-1s LCP is a baseline, not a stretch goal.** Critical CSS inlined, fonts preconnected, images width/height locked, lazy-loading below the fold, no render-blocking JS.
8. **Self-contained single-file HTML.** All CSS in `<style>`, all JS in `<script>`. The mockup pipeline wraps each file as a JS template literal · external dependencies break this.
9. **Lighthouse 100 across Performance, Accessibility, Best Practices, SEO** at launch. If any score drops below 95, fix before shipping.
10. **Schema.org JSON-LD baseline.** Every site ships with at minimum: Organization, WebSite, Service (one per pricing tier), and FAQPage blocks. Inline `<script type="application/ld+json">` in head. Any inline JSON-LD must have its SHA-256 hash added to the CSP allowlist in `_headers` for sites served by Cloudflare Pages.
11. **Security headers baseline (Cloudflare Pages sites).** `_headers` must include: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` zeroing out unused features, and a `Content-Security-Policy` with hash-locked inline scripts. Goal is qualys.ssllabs.com A+ on day one.

### Pre-deploy validation

Run `npm run check` from `portal/`. The check pipeline includes:
- `check:worker` · every JS file in src/ parses cleanly
- `check:spa` · the Babel-transpiled SPA template literal parses cleanly
- `check:standards` · every `manual-mockups/<slug>/index.html` validates against the build constraints above

Any failure blocks deploy. Don't bypass with `--no-verify` · fix the underlying issue.

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
- Edgy product naming for sensual/luxury brands ("Veneno", "Medusa", "Latigazo" · leans tasteless)
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

## Recent changes

- **2026-05-20 (later x8)** · **Chatbot reframed from Pro feature to optional add-on (ES + EN).** Per Mike, the chatbot is now an add-on on either plan, not included in Pro. Removed "Chatbot de captura de leads" / "Lead-capture chatbot" from the Pro card includes; replaced the Pro-card chatbot note (which said renewal becomes $110.000/mes) with an add-on note ("optional add-on on any plan: $80.000 COP/mo; the funnel is one-time, only the chatbot adds a monthly"). No `$110.000` left on the site. CSP unchanged (only `<li>`/`<p>` content, no inline script/style blocks), `refresh-csp-hashes.py` reports in sync; `check:standards` green on both files. Part of a cross-surface pass (also guide docs + Valentina). Deploy: `git push`.
- **2026-05-20 (later x7)** · **Trimmed 4 FAQ questions + reworded the FAQ heading (ES + EN).** Removed "is this just a one-page website", "who actually builds it", "can you write the copy or do I need to", and "what happens after launch" from both the visible `<details>` accordion and the FAQPage JSON-LD (kept visible + schema in sync, so Google sees no orphan FAQ entries). Two of the four were in the schema (one-page, who-builds); the other two were visible-only. Heading "Antes de decir que sí." / "Before you say yes." → "Preguntas frecuentes." / "Frequently asked questions." (default; easy to reword). Ran `refresh-csp-hashes.py` (JSON-LD is inline). `check:standards` green on both files. Deploy: `git push`.
- **2026-05-20 (later x6)** · **Footer "< web />" logo bug fixed for good + automated guard so it cannot regress again.** Root cause of the recurring regression (3rd time): the brand CSS is inline-duplicated in each language file, and the `footer.site .brand{color:#FBF7F0}` light override existed only in `index.html` (ES), never in `en/index.html` (EN). On EN the brand inherited the default dark `.brand` color (#1B1410) on the dark footer, so "pyme"/"pro" went invisible and only orange "web" survived. Fix: added the three `footer.site .brand` rules to `en/index.html`. **Prevention:** added a FAIL-severity check to `portal/scripts/check-standards.mjs` ("Footer brand legible on dark footer") that asserts BOTH production pages contain the light `footer.site .brand` override; it ran red on EN before the fix (proven to catch it) and green after. It runs on every deploy via the `predeploy: npm run check` hook, so a missing override now blocks the build. Ran `refresh-csp-hashes.py` (EN style block changed). Deploy: `git push`. Durable follow-up (bigger): the underlying cause is per-language inline-CSS duplication with no sync; extracting a shared stylesheet (or a check that diffs the ES/EN `<style>` blocks) would prevent the whole class of ES/EN drift, not just this rule.
- **2026-05-20 (later x5)** · **Fixed the Guides breadcrumb 404 on the traffic pillar.** The pillar pages (`guides/traffic/index.html` + `en/guides/traffic/index.html`) had their "Guías"/"Guides" breadcrumb (visible nav + JSON-LD BreadcrumbList) pointing at bare `/guides/` (and `/en/guides/`), which has no index page → 404. Repointed both to `/guides/traffic/` (the pillar hub, which is what all 10 sub-guides already use for that crumb). Ran `refresh-csp-hashes.py` (JSON-LD is an inline script, so its hash changed). No bare `/guides/` links remain anywhere. Deploy: `git push`. Follow-up option: build a real `/guides/` index hub if we want a dedicated listing page.
- **2026-05-20 (later x4)** · **Restored the Valentina chat widget on the marketing site (it had been dropped).** Re-added `<script src="https://valentina.pymewebpro.com/widget.js" defer></script>` before `</body>` in `index.html` + `en/index.html`. The embed was removed back in commit `9825262` ("flatten build:bilingual indirection") and the loss only became visible on the live site after the later x3 push triggered a fresh deploy. CSP already allowed `valentina.pymewebpro.com` in script-src/style-src/connect-src, and external `<script src>` is not hash-locked, so NO CSP refresh was needed. `check:standards` still ✓ on both files. The `data-valentina-open` CTA triggers from the older Valentina-first layout were NOT restored (the page currently uses the lead-form layout); the floating chat launcher works on its own. Deploy: `git push`.
- **2026-05-20 (later x3)** · **Marketing site aligned to the sales guide · CAD nuked, COP-only, product facts synced.** Reconciled `index.html` (ES) + `en/index.html` (EN) to the new sales system (source of truth: `~/code/pymewebpro-sales/`). **Currency:** removed every CAD figure, deleted the `geo-co`/`geo-na` geo-toggle (CSS rules + the `/cdn-cgi/trace` IIFE block in both files) and all `price-na` spans; the site is now COP-only everywhere (hero, topbar, plan cards, deposits, FAQ, footer, schema priceCurrency 390000/690000 COP, areaServed ["CO"]). **Positioning (per Mike):** Canadian-owned kept as a SUBTLE trust signal, not the headline, no superiority tone. "Liderazgo canadiense / North American account management" why-us block reframed to "Un estudio real, con entidad en Colombia · propiedad canadiense + socio paisa, los dos en Medellín". Footer + founder bio note Mike is "canadiense en Medellín hace 15 años". London, Ontario kept as "Estudio canadiense / Canadian studio" beside the Medellín studio (restored in footer + schema address). **Product facts:** chatbot added to Pro card + $80k/mo run-fee + $110k/mo renewal note; booking/citas moved to BOTH plans (was Pro-only); GBP moved Essential→Pro; Maps stays Essential; testimonials + privacy-first analytics confirmed standard; renewal $270.000/año (25%) → $300.000/año (ahorra dos meses) in body + schema FAQ; "no un chatbot" contact promise softened to "una persona real, no una respuesta automática". **CSP:** ran `python3 scripts/refresh-csp-hashes.py` (67 scripts / 17 styles) since inline script/style content changed. **Verify:** `cd portal && npm run check:standards` → both root files ✓, 0 fails; zero em dashes; zero CAD/USD. **NOT deployed.** **Deploy:** `git add -A && git commit -m "Align marketing site to sales guide: COP-only, product facts" && git push`. Also updated the Canadian-positioning rule in this file + `~/code/CLAUDE.md` (Canadian-owned now allowed as subtle trust signal).
- **2026-05-20 (later x2)** · **Landing-page-fit scoring lens + server-side bulk prospecting (~5,000 broad-SMB pull).** New broader thesis: even businesses WITH good sites need conversion landing pages, so a digitally-mature business is a PRIME landing-page customer. Added a SECOND independent score alongside the existing `computeFitScore` (which rewards no-site, unchanged). **Migration** `migrations/0009_landing_score.sql` (NOT 0008 · `0008_mockup_prospects.sql` already existed; renumbered to avoid clobbering it): adds `leads.landing_score REAL` + `leads.landing_heat TEXT` (idx on landing_heat) and a new `prospecting_jobs` table (id/status/target/inserted/skipped/cursor/cities/verticals/notes/timestamps, idx on status) so a cron can chew a large pull and resume from a JSON cursor. **enrich.js:** new `export function computeLandingScore(lead)` (pure, +25 reachable site, +15 social, +15 reviews>=50, +10 rating>=4, +15 phone/WA, +10 address, +10 followers>=1000, cap 100, same heat tiers); wired into `enrichLead` 'full' mode so it writes landing_heat/landing_score in the same UPDATE. **prospecting.js:** expanded SEED map to 25 broad-SMB verticals (kept original 4 ICPs) + 5 metros (Medellín/Bogotá/Barranquilla/Cali/Cartagena); the load path now writes BOTH scores on every insert; added `export async function runBulkProspectBatch(env,{maxPlacesCalls})` (loads oldest running job, resumes cursor, paginates Places via nextPageToken, dedups by place_id then name+city, inserts source='outbound' with dual scores + metadata{bulk_job_id,...}, one summary `activities` row per run, caps 60 Places + 400 inserts/run, separate KV cap `prospecting:bulk:<date>` at 2000/day) plus HTTP routes `POST /api/admin/prospecting/bulk-start` and `GET /api/admin/prospecting/bulk-status` (covered by the existing `/api/admin/prospecting` catch-all mount, no new mount needed). **index.js scheduled():** imports `runBulkProspectBatch`, branches on `event.cron` (14:00 = cadence sweep, every run including 14:00 = bulk batch), both in try/catch + ctx.waitUntil. **wrangler.toml:** `crons = ["0 14 * * *", "0 */2 * * *"]`. Uses existing `env.GOOGLE_PLACES_API_KEY` (no new secret). `node --check` clean on all 3 JS files; zero em dashes; no USD/CAD. **NOT deployed, migration NOT applied.** **Apply + deploy:** `cd portal && wrangler d1 execute pymewebpro-portal --remote --file=migrations/0009_landing_score.sql && wrangler deploy`. **Arm a 5000 job (D1):** see report / use `POST /api/admin/prospecting/bulk-start {"target":5000}` (defaults to all 25 verticals x 5 cities). Then the 2-hourly cron drains it.
- **2026-05-20 (later)** · **Fixed footer brand mark invisible ("< web />" bug).** `footer.site .brand` was inheriting `color:#1B1410` from the `.brand` CSS rule (dark on dark footer background). Inline `style="color:#FBF7F0"` on the `<a>` and `.word` spans was present in the HTML but Chrome's CSSOM was not applying it via `setAttribute`. Fix: added explicit CSS rules `footer.site .brand{color:#FBF7F0}`, `footer.site .brand .br{color:#7A6957}`, and `footer.site .brand:hover .br{color:#FF5C2E}` to override the default `.brand` dark color in the footer context. Removed the now-redundant inline style attributes from the footer brand HTML. Files: `index.html`. Deploy: `git add -A && git commit -m "Fix footer brand visibility" && git push`.

- **2026-05-20** · **Second prospect mockup built via the playbook · `revo-cafe` (Café Rev).** Café de especialidad + brunch en Cra 73 #4-6, Medellín · @caferevmedellin. First mockup built via the new "Copy build prompt" button workflow from the studio admin. Brand-aware bespoke build: mint-teal capybara palette + terracotta accent (their food-photo warmth), Playfair Display italic + Work Sans (distinct from CF's Fraunces+Inter), Spanish paisa-friendly voice, no template inheritance. Hero rotates 3 cropped JPGs from their IG (salmon bagel · bagel platter · interior) on a 5/6 aspect padding-top frame. Sections: hero with "Café en tu barrio" tagline · brunch (3-card menu, Smoked Salmon Bagel + Chili Cheese Omelette + Mini bagel platter) · café especialidad with cold brew tonic + "Blindfolded latte test" sticker · domicilios y para llevar (3-step + coverage pills in Estadio/Laureles/Belén La Mota) · el espacio · **The Capy Project Foundation** dedicated callout linking to @thecapyproject in Orocué, Casanare (real conservation partner, not decoration) · visítanos · footer + chat fab routed to the asistente at `/api/chat/revo-cafe`. Image processing: 6 IG screenshots cropped with `convert` (cutting IG UI) and quality-82 JPGs (~600KB total). **Placeholders for Mike to confirm via iteration notes:** owner first name (used "Alejo"), owner WhatsApp digits (used `573001234567`), exact hours (used Lun-Dom 8-8), delivery coverage barrios. **Files added:** `manual-mockups/revo-cafe/{index.html, hero-*.jpg, menu-*.jpg, mascot-sticker.jpg}` (6 JPGs + HTML), `portal/src/manual-mockups-revocafe.js` (auto-generated). **Files changed:** `portal/src/manual-mockups.js` (registered slug), `portal/src/chief-of-staff.js` (toolListMockups). Bundle: 45KB raw / 1077KB bundled. **Deploy:** `cd portal && npm run check && wrangler deploy`. **Next:** Mike confirms owner name/WA/hours, flips status to `live`, writes the chatbot_system_prompt with the Café Rev menu + Capy Project context.
- **2026-05-19 (later x13)** · **Path-aware CSP for /manual-mockups/* · fixes unstyled mockup pages.** Followup to x12. After moving mockups to pymewebpro.com Pages, every mockup rendered unstyled because the `functions/_middleware.js` Pages function applies the marketing site's **hash-locked CSP** to every HTML response. The hash collector (`refresh-csp-hashes.py`) explicitly excludes `manual-mockups/` from its scan, so the mockup's inline `<style>` blocks have hashes NOT in `STYLE_HASHES`, and the browser silently blocks them. Symptom: mockup pages load but appear without any CSS. Fix: added `CSP_MOCKUPS` in `functions/_middleware.js`, a relaxed policy with `'unsafe-inline'` on style-src and script-src (mockups are sales previews · self-contained, no shared style system, regenerating hashes per mockup would be churn). The middleware now switches policy based on `URL.pathname.startsWith("/manual-mockups/")`: mockups get `CSP_MOCKUPS`, everything else gets the hash-locked `CSP`. Same guardrails on connect-src (mockups can POST to `mockups.pymewebpro.com/api/*` + Valentina) and frame-ancestors / object-src. **Deploy:** `git add -A && git commit -m "Path-aware CSP for /manual-mockups/" && git push` · Pages auto-deploys in ~30s. **Verify:** open `https://pymewebpro.com/manual-mockups/espacio-dental/` · should now render with full styling. Check DevTools Network → Response Headers for `Content-Security-Policy` containing `'unsafe-inline'`.
- **2026-05-19 (later x12)** · **Mockups moved off the worker · served by pymewebpro.com Pages.** Worker hit Cloudflare's 3MB free-tier size limit (5587KB upload) because `portal/src/manual-mockups-*.js` files bloated to 1-1.7MB each from base64-inlined photos. New architecture: mockup HTML + photos live in `~/code/pymewebpro/manual-mockups/<slug>/` and deploy automatically via the existing pymewebpro.com Cloudflare Pages project on every `git push`. URLs are now `https://pymewebpro.com/manual-mockups/<slug>/`. Worker just 301-redirects `mockups.pymewebpro.com/<slug>/` → the Pages URL so existing share links keep working. Chat / lead / contact API endpoints stay on the worker at `mockups.pymewebpro.com/api/*`; mockup HTML calls them via absolute URLs (`https://mockups.pymewebpro.com/api/...`) with new CORS headers (`Access-Control-Allow-Origin: https://pymewebpro.com`) for the cross-origin POSTs. **Files touched:** `portal/src/manual-mockups.js` (giant import map replaced with `MOCKUP_SLUGS` Set + backwards-compat Proxy for `MANUAL_MOCKUPS[slug]` truthiness checks), `portal/src/mockups.js` (GET handler now redirects, API handlers CORS-wrapped, inviersol.com dead-host returns 404), `portal/package.json` (`check:worker` no longer parses the 10 deleted `manual-mockups-*.js` files), `manual-mockups/<slug>/index.html` × 5 (relative `/api/` → absolute `https://mockups.pymewebpro.com/api/`). New helper: `portal/scripts/_one-off-rewrite-mockup-urls.mjs`. The 10 orphaned `portal/src/manual-mockups-*.js` files are no longer imported (wrangler tree-shakes them out) but the sandbox couldn't delete them · Mike should `rm portal/src/manual-mockups-{blueskitchen,bluewhale,centralfarma,dagaparfum,espaciodental,marena,medellinguide,medellinguideboutique,revocafe,start}.js` when convenient, plus retire `portal/scripts/rebuild-mockups.mjs` (no longer needed). **Bundle size: 5587KB → ~500KB.** **Deploy:** `cd portal && wrangler deploy` (worker), then back at repo root `git add -A && git commit -m "Move mockups to Pages-served URLs" && git push` (Pages deploys revo-cafe + the URL-rewritten HTML). **Verify:** `https://pymewebpro.com/manual-mockups/espacio-dental/` (200 OK), `https://mockups.pymewebpro.com/espacio-dental/` (301 to Pages), `https://colguides.com/portal/pymewebpro/admin#funnel` (SPA mounts).
- **2026-05-19 (later x11)** · **Eliminated the FRONTEND_HTML escape-collision bug class · SPA moved out of the template literal.** Followup to x10. The 3000-line `const FRONTEND_HTML = \`...\`` block in `portal/src/index.js` is the SECOND time this session a stray `\n` (or `\t`, or `\${`) inside the literal silently corrupted the served SPA at worker boot. Real fix: SPA now lives in `portal/src/frontend.html` as a plain file, imported at the top of `index.js` via `import FRONTEND_HTML from "./frontend.html";`. Wrangler bundles it at build time via a new `[[rules]] type="Text"` block in `portal/wrangler.toml`. Zero runtime cost, identical bundle size, but escape-collision is now structurally impossible · template-literal eval no longer touches the SPA bytes. Also added `[build] command = "npm run check"` to `wrangler.toml` so the check fires on EVERY `wrangler deploy` (npm's `predeploy` only fires on `npm run deploy`, which is how x7 slipped past). Updated `scripts/check-spa.mjs` to read `src/frontend.html` directly (with a backstop that falls back to the old template-literal extractor if the file is missing). `scripts/extract-frontend-html.mjs` is the one-off migration tool that produced `frontend.html`. **Deploy:** `cd portal && npm run check && wrangler deploy` · the `[build]` hook will also re-run check during deploy. **Verify:** `https://colguides.com/portal/pymewebpro/admin#funnel` mounts and renders. **Files:** `portal/src/index.js` (replaced template literal block with import), `portal/src/frontend.html` (new, 215KB), `portal/wrangler.toml` ([[rules]] + [build]), `portal/scripts/check-spa.mjs` (reads .html now), `portal/scripts/extract-frontend-html.mjs` (new, one-off).
- **2026-05-19 (later x10)** · **Fixed blank `/portal/pymewebpro/admin` page · unescaped `\n` inside `FRONTEND_HTML` template literal.** `portal/src/index.js` line 3521 had `return lines.join('\n');` inside the inline React JSX (the `buildPrompt()` helper added in "later x7"). Because that line lives inside the `FRONTEND_HTML = \`...\`` template literal, `\n` was eval'd to a real newline at worker boot, then served to the browser as `lines.join('<newline>');` · an unterminated string constant. Babel-standalone threw `Unterminated string constant. (1753:26)` while transpiling, the entire `<script type="text/babel">` block bailed, and `ReactDOM.createRoot(...)` never ran. Symptom: Master Portal header strip renders fine (it's injected outside the React tree), body underneath is blank cream. Fix: `'\n'` → `'\\n'` in the source so the template literal renders `\n` and the browser-side JS reads it as the newline escape. `npm run check:spa` now passes (this is exactly the bug `scripts/check-spa.mjs` was written to catch · the pre-deploy `npm run check` chain runs it, but the x7 deploy must have bypassed `predeploy`). **Deploy:** `cd portal && npm run check && wrangler deploy`. **Verify:** open `https://colguides.com/portal/pymewebpro/admin#funnel`, confirm the SPA mounts and the funnel tab loads. **Follow-up:** double-check `predeploy: npm run check` is actually firing on `wrangler deploy`, since this slipped past once.
- **2026-05-19 (later x9)** · **Traffic-guides series complete · 11 bilingual sub-guides shipped.** Built out the full "Cómo generar tráfico" / "How to drive traffic" series: pillar (#01) plus 10 deep-dives (#02 Google Ads, #03 Meta Ads, #04 SEO local + GBP, #05 WhatsApp Business + catálogo, #06 voz a voz + referidos, #07 email marketing, #08 afiliados, #09 ferias y eventos, #10 prensa local, #11 visibilidad en búsqueda con IA). 22 new files: 11 ES at `guides/<slug>/index.html` and 11 EN at `en/guides/<slug>/index.html` (slugs differ per language: voz-a-voz/word-of-mouth, afiliados/affiliates, ferias-eventos/trade-shows, prensa-local/local-pr, busqueda-ia/ai-search). Each is self-contained HTML matching the pillar's design system (sticky TOC, hero stats grid, channel-meta key/value boxes, do/don't dual columns, numbered step cards, color-coded callouts, comparison tables, dark code blocks, CTA-block dark gradient, series-list cross-linking all 11 entries with current page marked). Visual richness per Mike's request: heavy use of accent color, varied H2/H3/H4 hierarchy, italic Fraunces for emphasis, bold pull-outs, no walls of prose. Topics reshaped from the original NA-leaning roadmap (Reddit, LinkedIn personal brand, newsletter sponsorships dropped) to Colombian-SMB reality (WhatsApp Business, voz a voz, ferias locales, Habeas Data compliance in email guide, Colombian press outlets in PR guide, etc.). All in COP only · ratio-stat exceptions kept per the COP-only rule. Earlier in the day also: added "Cómo conseguir visitantes / How to get visitors" `.nav-pill` to the left of the lang-switch on both homepages + all guide pages, and added acronym-primer `.channel-meta` blocks (CPC, CPM, CTR, CPA, ROAS, AOV, LTV, CAC, plus CBO/CAPI/LAL on Meta) to both pillars + Google Ads + Meta Ads sub-guides. **Build approach:** first 6 files written manually via Write tool, last 11 via a Python templater (`build_guides.py` + `guides_content.py` in scratch outputs dir, not committed) that shares the CSS block and only varies content per guide · saved ~80% of context budget. **Verification:** zero em dashes, zero USD/CAD/dollar references, zero banned words across all 22 files. **Deploy:** `git add -A && git commit -m "Add traffic guides 05-11 (bilingual)" && python3 scripts/refresh-csp-hashes.py && git add functions/_middleware.js && git commit --amend --no-edit && git push` · CSP hook caught 28 new inline `<script>` JSON-LD hashes + 3 inline `<style>` hashes, all auto-added by the refresh script. Live at `pymewebpro.com/guides/<slug>/` and `pymewebpro.com/en/guides/<slug>/`. Pillar series-list at the bottom of both pillars now links all 10 sub-guides (no more "próximamente" / "coming soon"). Commit: `bac6964`.
- **2026-05-19 (later x8)** · **Removed inviersol.com routes from pymewebpro-portal `wrangler.toml`.** Edited `portal/wrangler.toml` to drop `{ pattern = "inviersol.com/*", zone_name = "inviersol.com" }` and `{ pattern = "www.inviersol.com/*", zone_name = "inviersol.com" }`. Replaced with a comment block explaining the trap: inviersol.com now lives on its own dedicated Cloudflare Pages project (`inviersol`, repo `~/code/Inviersol/`), and pymewebpro-portal has zero per-host logic for inviersol, so any deploy with those routes declared causes pymewebpro-portal to hijack inviersol.com and serve empty 200s for every request. Symptom is the entire site going dark while `inviersol.pages.dev` still serves fine. Today's pymewebpro-portal deploy at 19:33 UTC re-attached the routes (wrangler syncs routes from wrangler.toml on every deploy) and took inviersol offline ~10 minutes after we'd brought it back. **Deploy:** no immediate redeploy needed · the manual route deletion in the inviersol.com zone stays in effect as long as no one redeploys pymewebpro-portal from an older checkout of this repo. Next time pymewebpro-portal IS deployed, wrangler will reconcile and the routes will stay gone. See `~/code/Inviersol/CLAUDE.md` Recent changes 2026-05-19 (later) for full incident write-up.
- **2026-05-19 (later x7)** · **Studio admin: "Copy build prompt" button on mockup detail page.** Click → assembles a Cowork-ready prompt from form state (slug, brief, social URLs, owner contact, style brief, iteration notes, chatbot-prompt presence) and writes it to clipboard. Mike clicks → switches to Cowork → pastes → Claude has the full brief inline and follows the playbook without a separate "paste the brief" step. Prompt auto-uses `build` for first-time prospects (no chatbot_system_prompt + status != live) and `revise` for follow-ups, so existing live mockups don't get rebuilt from scratch. New state: `copiedAt` toast for "✓ Build prompt copied to clipboard". File: `portal/src/index.js` MockupProspectDetail · adds `buildPrompt()` + `copyBuildPrompt()` + the button with `<Copy>` icon between Save and Archive, plus an updated hint string. Also patched the build playbook (Step 10) to remind future builds to flip prospect status from `brief` to `live` after first deploy so the listing stays honest. Deploy: `cd portal && wrangler deploy`.
- **2026-05-19 (later x6)** · **CRM WhatsApp templates · replaced 4 generic cold-outreach openers with 5 problem-led versions.** Edited `WA_TEMPLATES` in `portal/src/crm.js` (lines ~3783). Removed: `cold-hot`, `cold-dead`, `cold-hotel`, `cold-restaurant` (all generic "tiene mucho potencial" type pitches). Added: `cold-slow` (sitio carga lento en celular), `cold-no-cta` (no boton de WhatsApp ni CTA clara), `cold-seo` (no aparece bien en Google), `cold-no-site` (no encontre sitio propio), `cold-broken` (sitio no carga bien o desactualizado). Each opens with a specific observable problem on the prospect's site instead of a vague pitch · the hook is "I looked at your site and noticed X" rather than "we can help you." Kept the 4 follow-up templates (after-quote, followup-3day, followup-week, final-touch) untouched. Style matches existing templates: informal "tu", ASCII Spanish (no accents to avoid WA URL-encoding issues), `{business}` substitution, single-line. All include the pymewebpro.com URL at the end. **Deploy:** `cd portal && wrangler deploy`. **Verify:** open colguides.com/portal/pymewebpro/admin/crm, click ▾ next to any contact's WhatsApp button, confirm the picker now shows the 5 new openers + 4 follow-ups.
- **2026-05-19 (later x5)** · **Commit 2 of 3 of the mockup-prospects pipeline · build playbook landed in CLAUDE.md.** Added a "Prospect mockups · build playbook for Claude in Cowork" section (after "Pipeline · manual mockup"). Documents the 11-step procedure a future Claude session follows when it hears `build mockup for <slug>`: get brief from D1 via Mike, study sources, pick bespoke design direction, build HTML, handle images (compress PNGs to JPGs, Imagen text gotchas, CSS overlays), avoid the documented gotchas (aspect-ratio + absolute children collapses, CSP allowlist, stale WA copy), run check-standards, wire into registry, deploy, log to changelog, populate `chatbot_system_prompt` with real FAQ. Captures lessons from the CF build so the next prospect doesn't re-derive them.
- **2026-05-19 (later x4)** · **CF mockup · chat agent is the front door, WhatsApp CTAs replaced.** Nav, hero, and visit-panel buttons no longer dump to wa.me. They open the chat panel via `data-action="open-chat"` (JS extracted `openPanel` to a shared dispatcher). Customer talks to the agent first; the agent decides if/when to escalate to Carlos via the existing `[ORDER]` / `[HANDOFF]` markers → wa.me link. WhatsApp links in the contact info cards + footer stay (those are contact data, not action CTAs). **Substantive system prompt drafted** at `manual-mockups/central-farma-drogueria/chatbot-prompt.md` (~1900 tokens of Spanish brand-aware FAQ: products carried, prices, delivery zones, payment methods, inyectología services + costs, escalation rules). Mock data, plausibly Colombian, marked clearly as approximate so Carlos can replace with real figures. **Studio admin SPA gains a `chatbot_system_prompt` textarea** in the chatbot section of MockupProspectDetail · 14 rows, monospace, with a live char/token counter, so Mike can paste/iterate the prompt from the UI without SQL. Save payload + API already accept the field. **Deploy:** `cd portal && wrangler deploy`. **Next:** Mike pastes the chatbot-prompt.md contents into the new admin textarea on the CF row, saves, tests chat. If the agent still escalates too eagerly, tighten the HANDOFF criteria section of the prompt.
- **2026-05-19 (later x3)** · **CF mockup hero gallery + real logo.** Replaced the SVG monogram-on-green-ring hero graphic with a 4:5 rotating photo carousel (2s crossfade, hover-pause, pauses when tab is hidden, respects `prefers-reduced-motion`). Three Gemini-generated photos: `hero-pharmacist.jpg` (Diana P., handing a box to a customer), `hero-delivery.jpg` (delivery driver lifting helmet next to scooter), `hero-injection.jpg` (Paula R. administering a vaccine). All shot to read as the same studio session. Compressed from ~6MB raw PNG to ~424KB total JPG (q=82, 1000px max) via `convert` in sandbox. **Per-slide overlays** composited only when the delivery slide is active: a white circular CF logo badge (`.crate-badge` at `left:30%, top:62%, width:16%`) sits on the green delivery crate, and a synthetic Colombian motorcycle plate (`.plate-cover` showing "FAR42M", positioned over the AI-garbled original) covers up Imagen's mangled plate text. **Real CF logo wired everywhere.** Logo image `logo-mark.png` (97KB) base64-embedded ONCE via CSS `background-image` on `.brand-mark`, then reused across nav, footer, hero badge, chat avatar, crate overlay. Spans/divs are now empty with `role="img"` + Spanish `aria-label`. **Final bundle: 1125KB** (vs. espacio-dental at 1725KB). Position tuning for crate badge + plate cover is eyeballed · needs visual fine-tune after deploy. **Deploy:** `cd portal && wrangler deploy`. **Note:** original .png hero files are still on disk in `manual-mockups/central-farma-drogueria/` (sandbox can't delete). Mike to `rm hero-*.png` manually.
- **2026-05-19 (later x2)** · **Generic prospect chat agent · Commit 3 of the mockup-prospects pipeline.** Every prospect mockup now gets a real chat agent that answers questions, takes orders, and hands off to the owner by WhatsApp · without per-brand code. Endpoint: `POST mockups.pymewebpro.com/api/chat/<slug>`. **Files added:** `portal/src/prospect-chat.js` (loads `mockup_prospects` row by slug, auto-synthesizes a Spanish system prompt from `business_name` + `style_brief` + `owner_name` + `owner_whatsapp` + `cal_link` unless `chatbot_system_prompt` column is set as a manual override; runs Claude Haiku 4.5; detects `[ORDER: items=...; address=...; phone=...]` and `[HANDOFF: reason=...]` markers in the reply and converts them to a `wa.me` link with a pre-filled message to the owner; returns `{reply, wa_link?, mode}`). **Files changed:** `portal/src/mockups.js` imports + dispatches `handleProspectChat` for any path matching `/api/chat/<slug>` on `mockups.pymewebpro.com`, ordered after the hardcoded espacio-dental matcher so legacy traffic keeps working. **CF mockup wired to the new agent:** replaced the placeholder WhatsApp fab in `manual-mockups/central-farma-drogueria/index.html` with a full chat panel · slide-up modal, brand-green header with "CF" avatar + live indicator, message bubbles, typing dots, error states, WhatsApp CTA when the agent emits an ORDER/HANDOFF marker. Mobile: full-screen modal. Bundle: 32KB → 41KB raw. **Espacio Dental NOT cut over** in this commit · keeps its hardcoded `espacio-dental-chat.js` (different language flow, different booking marker) until a separate migration commit. **Secret:** uses existing `env.ANTHROPIC_API_KEY` already set on the worker. **Deploy:** `cd portal && wrangler deploy`. **Follow-ups:** "Generate system prompt" button in the studio admin SPA (let Mike review/edit the auto-synthesized prompt before going live); cut espacio-dental over to the generic handler once we've verified the Spanish flow on CF; rate limiting per IP; "Open in WhatsApp now" passthrough button at top of chat for users who just want to skip the bot.
- **2026-05-19 (later x1)** · **First prospect mockup built via the new workflow · `central-farma-drogueria`.** Brief came in through the studio admin (status: brief, IG @centralfarmamed, owner Carlos, WA 573023877739). Built bespoke at `manual-mockups/central-farma-drogueria/index.html` (~31KB raw, 32KB bundled). Spanish-only (neighborhood market, not expats). Type-and-icon driven (no photos) to match their actual IG aesthetic which is graphic-driven, hit Lighthouse-100 prereqs, and keep page weight tiny. Sections: nav · hero with CF monogram in brand-green ring · 3-card services (domicilios, inyectología, productos) · inyectología deep-dive with "qué traer" checklist · 3-step domicilios + coverage pills · address/hours/WA/IG cards + visit CTA · footer · floating WA fab. JSON-LD: Pharmacy + Service (Inyectología) + OpeningHoursSpecification. Brand palette extracted from CF wordmark (`#2E8B6A` green, `#0E2A4D` navy, `#D7E8F4` soft blue, `#F8EFD4` cream). Type pairing: Fraunces (display, opsz 144) + Inter (body), distinct from existing 8 mockups. WhatsApp fab is a placeholder · gets replaced with the generic chat agent in Commit 3 of the mockup-prospects pipeline. **Files added:** `manual-mockups/central-farma-drogueria/index.html`, `portal/src/manual-mockups-centralfarma.js` (auto-generated by rebuild-mockups). **Files changed:** `portal/src/manual-mockups.js` (imported + registered slug), `portal/src/chief-of-staff.js` (added to `toolListMockups` static list). Quality gate: `check-standards` passes 0 FAILs · only the standard "Has Organization JSON-LD" WARN that affects 5 other production mockups (Pharmacy is a schema.org subtype of Organization, so this is regex-only and not a real SEO issue). **Deploy:** `cd portal && wrangler deploy`. **Follow-ups:** in the admin form, flip status to `live`. Mike + Carlos to confirm payment-method copy on the domicilios section (currently says "tú decides cómo pagar al recibir", neutral) and the inyectología pricing line (currently honest "consulta el costo por WhatsApp"). Phase 2 hardening: per-mockup HTTP-header CSP via mockups.js (currently only `<meta>` CSP via inline tags possible).
- **2026-05-19** · **Mockup-prospects pipeline · Commit 1 of 3.** New workflow for sales-prospect mockups: Mike fills in a brief in the studio admin (`/portal/pymewebpro/admin` → Mockups tab), then asks Claude in Cowork to build the bespoke site at `manual-mockups/<slug>/index.html`. The portal is a brief tracker, NOT a generator · per Mike's quality bar, every site is hand-built in Cowork to bespoke + A+ security + 100 Lighthouse + <1s load. **Files added:** `portal/migrations/0008_mockup_prospects.sql` (new `mockup_prospects` table: slug, business_name, instagram_url, facebook_url, tiktok_url, website_url, style_brief, owner_name, owner_whatsapp, cal_link, notes, chatbot_system_prompt, status, created_at, updated_at; seeds an `espacio-dental` row for the Commit 3 chat cutover), `portal/src/mockup-prospects.js` (CRUD handler exporting `handleMockupProspects`; admin-only; soft-delete via `status='archived'`). **Files changed:** `portal/src/mockups.js` imports + dispatches `handleMockupProspects` before the existing `/api/admin/mockups` matchers. `portal/src/index.js` SPA gains a Mockups tab (Palette icon) with list view, new-mockup modal, and full detail/edit page (brief fields + chatbot fields + iteration-notes textarea). New state: `mockups`, `mockupDetail`, `showNewMockup`. New routes: `/admin/mockups`, `/admin/mockups/<slug>`. New components: `MockupRow`, `NewMockupModal`, `MockupProspectDetail`. **Apply + deploy:** `cd portal && wrangler d1 execute pymewebpro-portal --remote --file=migrations/0008_mockup_prospects.sql && wrangler deploy`. **Commit 2 (next):** Cowork-side build playbook lives in CLAUDE.md so Claude can build mockups from a brief by slug. **Commit 3:** generic `prospect-chat.js` reads brand profile from `mockup_prospects` by slug, replacing the hardcoded `espacio-dental-chat.js`.
- **2026-05-18** · Section 4 testimonials + builds-grid + flattened build:bilingual indirection. Added Santiago Florez (Inviersol) as third Google review on pymewebpro.com (ES + EN), switched section 4 grid to 3 columns desktop/tablet, smaller card padding/font, single column on mobile. Pointed Schedulator build tile at `schedulator2.vercel.app` and added Inviersol tile pointing at `inviersol.com` (both live clients, not mockups). **Removed slugs from `MANUAL_MOCKUPS`:** `schedulator`, `inviersol`, `pymewebpro-ca`, `pymewebpro-v1`, `pymewebpro-v3`, `pymewebpro-v3-es`, `pymewebpro-v3-fr`, `pymewebpro-v4`, `pymewebpro-v4-es`. Registry now 9 slugs (6 client/concept mockups + 3 medellin-guide variants + start). **Flattened production build:** root `index.html` + `en/index.html` are now the actual source of truth. Deleted the indirection: removed `npm run build:bilingual` from the `check` chain. `check:standards` now validates the root files in-place as "pymewebpro.com (ES)" and "(EN)" entries. CLAUDE.md was previously stale: it claimed `manual-mockups/pymewebpro-ca/index.html` was source-of-truth when build:bilingual actually sourced from `pymewebpro-v4`/`-es`. Cost a wasted hour. **DNS:** Mike re-added a proxied A record for `mockups.pymewebpro.com` (was missing entirely, which had killed every "See the build" tile on the homepage). **Files Mike still needs to `rm` manually** (cowork sandbox can't delete): `manual-mockups/{inviersol,schedulator,pymewebpro-ca,pymewebpro-v1,pymewebpro-v3,pymewebpro-v3-es,pymewebpro-v3-fr,pymewebpro-v4,pymewebpro-v4-es}/`, `scripts/{build-bilingual,promote-v4}.mjs`, `portal/src/manual-mockups-{inviersol,schedulator,pymewebproca,pymewebprov1,pymewebprov3,pymewebprov3es,pymewebprov3fr,pymewebprov4,pymewebprov4es}.js`. Also synced the static slug list in `portal/src/chief-of-staff.js` `toolListMockups()` with the new registry. Deploy: `cd portal && wrangler deploy` (worker), `git push` (Pages).
