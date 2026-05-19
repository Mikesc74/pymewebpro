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

## Recent changes

- **2026-05-19 (later x4)** · **CF mockup · chat agent is the front door, WhatsApp CTAs replaced.** Nav, hero, and visit-panel buttons no longer dump to wa.me. They open the chat panel via `data-action="open-chat"` (JS extracted `openPanel` to a shared dispatcher). Customer talks to the agent first; the agent decides if/when to escalate to Carlos via the existing `[ORDER]` / `[HANDOFF]` markers → wa.me link. WhatsApp links in the contact info cards + footer stay (those are contact data, not action CTAs). **Substantive system prompt drafted** at `manual-mockups/central-farma-drogueria/chatbot-prompt.md` (~1900 tokens of Spanish brand-aware FAQ: products carried, prices, delivery zones, payment methods, inyectología services + costs, escalation rules). Mock data, plausibly Colombian, marked clearly as approximate so Carlos can replace with real figures. **Studio admin SPA gains a `chatbot_system_prompt` textarea** in the chatbot section of MockupProspectDetail · 14 rows, monospace, with a live char/token counter, so Mike can paste/iterate the prompt from the UI without SQL. Save payload + API already accept the field. **Deploy:** `cd portal && wrangler deploy`. **Next:** Mike pastes the chatbot-prompt.md contents into the new admin textarea on the CF row, saves, tests chat. If the agent still escalates too eagerly, tighten the HANDOFF criteria section of the prompt.
- **2026-05-19 (later x3)** · **CF mockup hero gallery + real logo.** Replaced the SVG monogram-on-green-ring hero graphic with a 4:5 rotating photo carousel (2s crossfade, hover-pause, pauses when tab is hidden, respects `prefers-reduced-motion`). Three Gemini-generated photos: `hero-pharmacist.jpg` (Diana P., handing a box to a customer), `hero-delivery.jpg` (delivery driver lifting helmet next to scooter), `hero-injection.jpg` (Paula R. administering a vaccine). All shot to read as the same studio session. Compressed from ~6MB raw PNG to ~424KB total JPG (q=82, 1000px max) via `convert` in sandbox. **Per-slide overlays** composited only when the delivery slide is active: a white circular CF logo badge (`.crate-badge` at `left:30%, top:62%, width:16%`) sits on the green delivery crate, and a synthetic Colombian motorcycle plate (`.plate-cover` showing "FAR42M", positioned over the AI-garbled original) covers up Imagen's mangled plate text. **Real CF logo wired everywhere.** Logo image `logo-mark.png` (97KB) base64-embedded ONCE via CSS `background-image` on `.brand-mark`, then reused across nav, footer, hero badge, chat avatar, crate overlay. Spans/divs are now empty with `role="img"` + Spanish `aria-label`. **Final bundle: 1125KB** (vs. espacio-dental at 1725KB). Position tuning for crate badge + plate cover is eyeballed — needs visual fine-tune after deploy. **Deploy:** `cd portal && wrangler deploy`. **Note:** original .png hero files are still on disk in `manual-mockups/central-farma-drogueria/` (sandbox can't delete). Mike to `rm hero-*.png` manually.
- **2026-05-19 (later x2)** · **Generic prospect chat agent · Commit 3 of the mockup-prospects pipeline.** Every prospect mockup now gets a real chat agent that answers questions, takes orders, and hands off to the owner by WhatsApp · without per-brand code. Endpoint: `POST mockups.pymewebpro.com/api/chat/<slug>`. **Files added:** `portal/src/prospect-chat.js` (loads `mockup_prospects` row by slug, auto-synthesizes a Spanish system prompt from `business_name` + `style_brief` + `owner_name` + `owner_whatsapp` + `cal_link` unless `chatbot_system_prompt` column is set as a manual override; runs Claude Haiku 4.5; detects `[ORDER: items=...; address=...; phone=...]` and `[HANDOFF: reason=...]` markers in the reply and converts them to a `wa.me` link with a pre-filled message to the owner; returns `{reply, wa_link?, mode}`). **Files changed:** `portal/src/mockups.js` imports + dispatches `handleProspectChat` for any path matching `/api/chat/<slug>` on `mockups.pymewebpro.com`, ordered after the hardcoded espacio-dental matcher so legacy traffic keeps working. **CF mockup wired to the new agent:** replaced the placeholder WhatsApp fab in `manual-mockups/central-farma-drogueria/index.html` with a full chat panel · slide-up modal, brand-green header with "CF" avatar + live indicator, message bubbles, typing dots, error states, WhatsApp CTA when the agent emits an ORDER/HANDOFF marker. Mobile: full-screen modal. Bundle: 32KB → 41KB raw. **Espacio Dental NOT cut over** in this commit · keeps its hardcoded `espacio-dental-chat.js` (different language flow, different booking marker) until a separate migration commit. **Secret:** uses existing `env.ANTHROPIC_API_KEY` already set on the worker. **Deploy:** `cd portal && wrangler deploy`. **Follow-ups:** "Generate system prompt" button in the studio admin SPA (let Mike review/edit the auto-synthesized prompt before going live); cut espacio-dental over to the generic handler once we've verified the Spanish flow on CF; rate limiting per IP; "Open in WhatsApp now" passthrough button at top of chat for users who just want to skip the bot.
- **2026-05-19 (later x1)** · **First prospect mockup built via the new workflow · `central-farma-drogueria`.** Brief came in through the studio admin (status: brief, IG @centralfarmamed, owner Carlos, WA 573023877739). Built bespoke at `manual-mockups/central-farma-drogueria/index.html` (~31KB raw, 32KB bundled). Spanish-only (neighborhood market, not expats). Type-and-icon driven (no photos) to match their actual IG aesthetic which is graphic-driven, hit Lighthouse-100 prereqs, and keep page weight tiny. Sections: nav · hero with CF monogram in brand-green ring · 3-card services (domicilios, inyectología, productos) · inyectología deep-dive with "qué traer" checklist · 3-step domicilios + coverage pills · address/hours/WA/IG cards + visit CTA · footer · floating WA fab. JSON-LD: Pharmacy + Service (Inyectología) + OpeningHoursSpecification. Brand palette extracted from CF wordmark (`#2E8B6A` green, `#0E2A4D` navy, `#D7E8F4` soft blue, `#F8EFD4` cream). Type pairing: Fraunces (display, opsz 144) + Inter (body), distinct from existing 8 mockups. WhatsApp fab is a placeholder · gets replaced with the generic chat agent in Commit 3 of the mockup-prospects pipeline. **Files added:** `manual-mockups/central-farma-drogueria/index.html`, `portal/src/manual-mockups-centralfarma.js` (auto-generated by rebuild-mockups). **Files changed:** `portal/src/manual-mockups.js` (imported + registered slug), `portal/src/chief-of-staff.js` (added to `toolListMockups` static list). Quality gate: `check-standards` passes 0 FAILs · only the standard "Has Organization JSON-LD" WARN that affects 5 other production mockups (Pharmacy is a schema.org subtype of Organization, so this is regex-only and not a real SEO issue). **Deploy:** `cd portal && wrangler deploy`. **Follow-ups:** in the admin form, flip status to `live`. Mike + Carlos to confirm payment-method copy on the domicilios section (currently says "tú decides cómo pagar al recibir", neutral) and the inyectología pricing line (currently honest "consulta el costo por WhatsApp"). Phase 2 hardening: per-mockup HTTP-header CSP via mockups.js (currently only `<meta>` CSP via inline tags possible).
- **2026-05-19** · **Mockup-prospects pipeline · Commit 1 of 3.** New workflow for sales-prospect mockups: Mike fills in a brief in the studio admin (`/portal/pymewebpro/admin` → Mockups tab), then asks Claude in Cowork to build the bespoke site at `manual-mockups/<slug>/index.html`. The portal is a brief tracker, NOT a generator · per Mike's quality bar, every site is hand-built in Cowork to bespoke + A+ security + 100 Lighthouse + <1s load. **Files added:** `portal/migrations/0008_mockup_prospects.sql` (new `mockup_prospects` table: slug, business_name, instagram_url, facebook_url, tiktok_url, website_url, style_brief, owner_name, owner_whatsapp, cal_link, notes, chatbot_system_prompt, status, created_at, updated_at; seeds an `espacio-dental` row for the Commit 3 chat cutover), `portal/src/mockup-prospects.js` (CRUD handler exporting `handleMockupProspects`; admin-only; soft-delete via `status='archived'`). **Files changed:** `portal/src/mockups.js` imports + dispatches `handleMockupProspects` before the existing `/api/admin/mockups` matchers. `portal/src/index.js` SPA gains a Mockups tab (Palette icon) with list view, new-mockup modal, and full detail/edit page (brief fields + chatbot fields + iteration-notes textarea). New state: `mockups`, `mockupDetail`, `showNewMockup`. New routes: `/admin/mockups`, `/admin/mockups/<slug>`. New components: `MockupRow`, `NewMockupModal`, `MockupProspectDetail`. **Apply + deploy:** `cd portal && wrangler d1 execute pymewebpro-portal --remote --file=migrations/0008_mockup_prospects.sql && wrangler deploy`. **Commit 2 (next):** Cowork-side build playbook lives in CLAUDE.md so Claude can build mockups from a brief by slug. **Commit 3:** generic `prospect-chat.js` reads brand profile from `mockup_prospects` by slug, replacing the hardcoded `espacio-dental-chat.js`.
- **2026-05-18** · Section 4 testimonials + builds-grid + flattened build:bilingual indirection. Added Santiago Florez (Inviersol) as third Google review on pymewebpro.com (ES + EN), switched section 4 grid to 3 columns desktop/tablet, smaller card padding/font, single column on mobile. Pointed Schedulator build tile at `schedulator2.vercel.app` and added Inviersol tile pointing at `inviersol.com` (both live clients, not mockups). **Removed slugs from `MANUAL_MOCKUPS`:** `schedulator`, `inviersol`, `pymewebpro-ca`, `pymewebpro-v1`, `pymewebpro-v3`, `pymewebpro-v3-es`, `pymewebpro-v3-fr`, `pymewebpro-v4`, `pymewebpro-v4-es`. Registry now 9 slugs (6 client/concept mockups + 3 medellin-guide variants + start). **Flattened production build:** root `index.html` + `en/index.html` are now the actual source of truth. Deleted the indirection: removed `npm run build:bilingual` from the `check` chain. `check:standards` now validates the root files in-place as "pymewebpro.com (ES)" and "(EN)" entries. CLAUDE.md was previously stale: it claimed `manual-mockups/pymewebpro-ca/index.html` was source-of-truth when build:bilingual actually sourced from `pymewebpro-v4`/`-es`. Cost a wasted hour. **DNS:** Mike re-added a proxied A record for `mockups.pymewebpro.com` (was missing entirely, which had killed every "See the build" tile on the homepage). **Files Mike still needs to `rm` manually** (cowork sandbox can't delete): `manual-mockups/{inviersol,schedulator,pymewebpro-ca,pymewebpro-v1,pymewebpro-v3,pymewebpro-v3-es,pymewebpro-v3-fr,pymewebpro-v4,pymewebpro-v4-es}/`, `scripts/{build-bilingual,promote-v4}.mjs`, `portal/src/manual-mockups-{inviersol,schedulator,pymewebproca,pymewebprov1,pymewebprov3,pymewebprov3es,pymewebprov3fr,pymewebprov4,pymewebprov4es}.js`. Also synced the static slug list in `portal/src/chief-of-staff.js` `toolListMockups()` with the new registry. Deploy: `cd portal && wrangler deploy` (worker), `git push` (Pages).
