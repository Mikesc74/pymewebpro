# Memory · PymeWebPro Studio

This file is the hot cache. Claude reads this first on every session in `~/code/pymewebpro/`.
Full glossary and rich context live in `./memory/`.

## Me

**Michael Chartrand** ("Mike") — Canadian citizen, Founder & Legal Representative of **Norte Sur Consulting S.A.S.**, doing business as **PymeWebPro**.
- **Legal entity:** Norte Sur Consulting S.A.S. (Colombian Sociedad por Acciones Simplificada)
- **NIT:** 901.956.771-1
- **DBA / brand:** PymeWebPro
- **Based in:** Medellín, Antioquia, Colombia (build studio)
- **Family home:** London, Ontario, Canada (NA operations contact point — parents still live there)
- **Email:** mike@mikec.pro

PymeWebPro is the public-facing brand and trade name. Norte Sur Consulting S.A.S. is the contracting legal entity on all invoices, contracts, banking, and tax filings.

Solo operator. Web design studio targeting SMBs in Colombia, the US, and Canada.

## Studio · One-line

PymeWebPro = a Canadian-led, Medellín-built, AI-leveraged web design studio that ships custom-coded marketing sites on Cloudflare for a fraction of agency pricing.

## Two locations (public framing)

- **London, Ontario, Canada** — North American operations · client communications · contracts & billing in CAD/USD via Wise.
- **Medellín, Antioquia, Colombia** — build studio · design, code & deploy · LATAM clients billed in COP via Wompi.

Both addresses appear in the public footer. Mike personally works from Medellín; London is the family home and the NA-facing mailing address.

## Pricing (current)

| Market | Tier | Price |
|--------|------|-------|
| Colombia | Esencial | $690.000 COP one-time (incl. 1 yr hosting) |
| Colombia | Esencial alt | $390.000 COP + $30.000 COP/mo hosting |
| Canada / NA | Essential | $500 CAD one-time (incl. 1 yr hosting) |
| Canada / NA | Pro | $800 CAD one-time (incl. 2 yr hosting) |

**Both Essential and Pro are single-page, multi-section custom sites.** They have the same structural format. Pro adds: bilingual support (EN/FR or EN/ES), payment/booking/newsletter integrations, 2 years hosting (vs. 1), and 4 revisions (vs. 2). NOT a section-count difference.

## Hosting

- **CAD $15/mo or $180/yr** for ongoing hosting after the included period
- Essential includes 1 yr ($180 value) · Pro includes 2 yr ($360 value)
- Optional maintenance add-on: **$35/mo on top of hosting** (monthly content updates, security patches, minor design)
- Ad-hoc edits: **$75/hr CAD** (30-min minimum)

## Payment terms (both markets)

- **30% deposit to start** — no design or development begins until deposit clears (NA: $150 Essential / $240 Pro · LATAM: $207.000 Esencial / $324.000 Crecimiento)
- **70% on launch** — site sits on staging URL; DNS to client domain not connected until balance clears
- NA: Wise Business invoicing (cards, Apple/Google Pay, wires) in CAD or USD
- LATAM: Wompi (cards, PSE, bank transfer) in COP
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

The studio's primary site at **pymewebpro.com** is now the **bilingual EN/ES** version of the PymeWebPro CA mockup. It is served by Cloudflare Pages from the repo root `index.html` (sibling Pages project, not the Worker). The `/en/` legacy path redirects to `/?lang=en`. Source-of-truth HTML lives at `manual-mockups/pymewebpro-ca/index.html` — copy to repo root after edits and `git push` to deploy via Pages.

EN side: $500/$800 CAD, Wise Business, NA-market copy.
ES side: $690.000 COP, Wompi, LATAM-market copy.
Both share one footer with two locations (London + Medellín) and the Norte Sur NIT block.

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
| Wise Business | CAD + USD | NA clients · cards (1% domestic / 2.9% intl), Apple/Google Pay, wires |
| Wompi | COP | Colombian clients · bank transfers + cards |

**No Stripe account.** We do NOT use Stripe for our own payments. We CAN integrate Stripe into client sites (they provide their own merchant account). Don't list Stripe as a PymeWebPro payment method on any site.
→ Setup details: `memory/context/studio.md`

## Positioning · key phrases

- "Canadian founder. Medellín-built. AI-leveraged."
- "Enterprise tech at SMB pricing."
- "Custom-coded · Cloudflare-hosted · sub-1s LCP · 48-hour delivery."
- "We use Anthropic AI as a force multiplier — same craft, fraction of the time."
- Drop in Toronto Agency comparison: $8,500 vs $800.

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

1. **No runtime CSS frameworks via CDN.** Never use `<script src="https://cdn.tailwindcss.com">` or any equivalent. That CDN is for prototyping only and adds a 3MB+ JS payload that destroys LCP. We ship hand-tuned inline `<style>` blocks. Tailwind, Bootstrap, Bulma, Pico — none belong in production output.
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
| **Lanzar final** | Deploy customer site to production (Esencial/Crecimiento clients) |
| **wizard intake** | The step-by-step client onboarding flow |
| **Esencial / Crecimiento** | Two COP pricing tiers (Colombian market) |
| **mockups subdomain** | mockups.pymewebpro.com |
→ Full glossary: `memory/glossary.md`
