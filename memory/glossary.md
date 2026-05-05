# Glossary · PymeWebPro

Workplace shorthand, internal terms, and project codenames.

## Internal terms

| Term | Meaning |
|------|---------|
| **manual mockup** | A hand-built static HTML site served as a single string from `mockups.pymewebpro.com/<slug>/`. Bypasses the auto-generator. Each registered in `MANUAL_MOCKUPS` map. |
| **the worker** | The single Cloudflare Worker `pymewebpro-portal`. Handles everything: portal SPA, admin, intake, manual mockups, customer sites under `*.sites.pymewebpro.com`. |
| **the SPA** | The React admin/portal interface, embedded as `FRONTEND_HTML` template literal inside `portal/src/index.js`. Uses React 18 + Babel standalone. |
| **the engine** | The original (now archived) auto-generator that built sites from intake forms. Folded into the portal. |
| **mockups subdomain** | `mockups.pymewebpro.com` — host-routed in `mockups.js`, serves any `MANUAL_MOCKUPS[slug]` entry. |
| **sites subdomain** | `*.sites.pymewebpro.com` — auto-published customer sites after "Lanzar final". |
| **Lanzar final** | Admin action that publishes a customer's bundled site to production at `<slug>.sites.pymewebpro.com`. |
| **wizard intake** | Step-by-step onboarding flow customers complete after paying. Replaced the old sidebar Portal. |
| **Project Portal** | Post-submit customer view: countdown to mockup ready, mockup iframe, revision counter. |
| **mockup ready email** | Resend transactional sent via `pushMockupToClient`. |
| **the brief** | First 5–10 minutes gathering brand info from a prospect's IG/FB before building their mockup. |
| **the pitch** | WhatsApp/IG DM/email sent with a mockup link to a prospect. |
| **the bracket logo** | The `<pymewebpro/>` wordmark (full size) and `<pwp/>` monogram (small format). |

## Pricing tiers

| Term | Meaning |
|------|---------|
| **Esencial** | Colombian Plan 1: $690.000 COP or $390.000 + $30K/mo hosting. Single-page marketing site. |
| **Crecimeinto** | Colombian Plan 2 (Growth): more sections + integrations. |
| **Essential** | NA tier: $500 CAD, single-page, 1 yr hosting. |
| **Pro** | NA tier: $800 CAD, multi-section + bilingual + integrations + 2 yr hosting. |

## Tech stack acronyms

| Term | Meaning |
|------|---------|
| **CF** | Cloudflare |
| **D1** | Cloudflare's SQLite-backed serverless DB |
| **R2** | Cloudflare's S3-equivalent object storage |
| **KV** | Cloudflare key-value store |
| **LCP** | Largest Contentful Paint (Lighthouse perf metric) |
| **TTFB** | Time To First Byte |
| **CSP** | Content Security Policy header |
| **HSTS** | HTTP Strict Transport Security |
| **PIPEDA** | Canadian privacy law (replaces GDPR for CA) |
| **Habeas Data** | Colombian privacy law (Ley 1581) |

## Project codenames

| Codename | Project / Client |
|----------|------------------|
| **Schedulator** | Patrick Detzner's B2B SaaS (elementary school class scheduling). schedulator.net. |
| **Blues Kitchen** | Bogotá events venue. theblueskitchen_co. |
| **Daga / Daga Parfum** | Medellín luxury fragrance brand (mockup, not real client yet). |
| **BWI / BWI Talent** | Blue Whale International — finance + tech recruiting platform. Founder Jorge Restrepo. |
| **Espacio Dental** | Itagüí dental clinic, expat-targeted (mockup, not real client yet). |
| **PWP CA** | PymeWebPro's own Canadian-market pitch site at mockups.pymewebpro.com/pymewebpro-ca/. |

## Nicknames → full names

| Short | Full |
|-------|------|
| **Mike** | Mike (founder, Canadian, mike@mikec.pro) |
| **Patrick** | Patrick Detzner (Schedulator founder, patrick.detzner@gmail.com) |
| **Santiago** | Contact at Blues Kitchen for hi-res photos |

## Tools

| Tool | Used for |
|------|----------|
| Cloudflare | Hosting, DNS, Workers, D1, R2, KV |
| Wrangler | Worker CLI (`npm run deploy`) |
| Stripe | Card payments (CAD, USD, COP) |
| Wise Business | Multi-currency banking (CAD + USD accounts) |
| Wompi | Colombian payment gateway (COP) |
| Resend | Transactional email |
| Pexels API | Stock photography for mockups |
| thum.io | Live URL screenshots (for portfolio thumbnails) |
| Anthropic Claude | Design + dev partner (this assistant) |
| Outscraper | Google Maps scraping for prospect lists |
| Apollo | Email enrichment for prospects |

## Acronyms / industry

| Term | Meaning |
|------|---------|
| **AUM** | Assets Under Management (BWI uses $1B+ AUM) |
| **IRR** | Internal Rate of Return (BWI cites 18.4%) |
| **CFA / CAIA** | Finance certifications (BWI benefit: $8K/yr learning budget covers these) |
| **MBB** | McKinsey, Bain, BCG (consulting firms — feeder for BWI's analyst roles) |
| **VC** | Venture Capital |
| **PE** | Private Equity |
| **SaaS** | Software as a Service |
| **B2B / B2C** | Business-to-business / Business-to-consumer |
| **SMB** | Small and Medium-sized Business (PymeWebPro's target market) |
| **PYME** | Spanish equivalent of SMB ("Pequeña Y Mediana Empresa") |
| **NIT** | Colombian tax ID |
| **CES** | Universidad CES (top Colombian dental school — Espacio Dental's credential) |

## Common file paths (workspace)

| Path | What |
|------|------|
| `~/code/pymewebpro/` | Studio root |
| `~/code/pymewebpro/portal/` | Cloudflare Worker source |
| `~/code/pymewebpro/portal/src/index.js` | Worker dispatcher + admin SPA |
| `~/code/pymewebpro/portal/src/mockups.js` | Mockups subdomain router + admin endpoints |
| `~/code/pymewebpro/portal/src/manual-mockups.js` | MANUAL_MOCKUPS registry |
| `~/code/pymewebpro/portal/src/manual-mockups-<slug>.js` | One per manual mockup (template-literal HTML strings) |
| `~/code/pymewebpro/portal/src/_archived/` | Deprecated modules (admin-chat, auto-gen, blueprint*) |
| `~/code/pymewebpro/manual-mockups/<slug>/index.html` | Source HTML for each manual mockup |
| `~/code/pymewebpro/CLAUDE.md` | This memory hot cache |
| `~/code/pymewebpro/memory/` | Deep memory (this directory) |
