# Studio Context · PymeWebPro

The full picture of what PymeWebPro is, how it positions, and how it makes money.

## What we are

A Medellín-based, AI-leveraged web design studio that ships custom-coded sales pages for Colombian SMBs. Colombia-only market, COP-only pricing. Canadian ownership is a subtle trust signal, never the headline.

Operationally: a two-person studio (Mike + Santiago Santos, profit-share partner, both in Medellín) using Anthropic Claude as a force multiplier through every step of the build. No agency overhead.

## Founder

- **Michael Chartrand** ("Mike") · Canadian citizen, hasn't lived in Canada in 20+ years
- Based in Medellín, Antioquia, Colombia
- Email: mike@mikec.pro
- Two-person partnership with Santiago Santos (paisa, Medellín, profit-share partner)
- Use the full name "Michael Chartrand" on contracts, invoices, and any legal/financial document. "Mike" is fine for marketing copy and casual contexts.

## Legal entity

PymeWebPro is **NOT** a sole proprietorship. It is a **DBA (trade name)** under a registered Colombian SAS:

| Field | Value |
|-------|-------|
| Legal name | **Norte Sur Consulting S.A.S.** |
| Type | Sociedad por Acciones Simplificada (Colombian SAS) |
| NIT | **901.956.771-1** |
| Trade name (DBA) | **PymeWebPro** |
| Jurisdiction | Colombia |
| Principal office | Medellín, Antioquia, Colombia |
| Legal Representative | Michael Chartrand |

### When to use which name

| Context | Use |
|---------|-----|
| Public-facing marketing site, social media, email signature | **PymeWebPro** |
| Client contracts (party block) | **Norte Sur Consulting S.A.S.** doing business as **PymeWebPro** |
| Invoices to clients | Norte Sur Consulting S.A.S. (DBA PymeWebPro) · NIT 901.956.771-1 |
| Tax filings, Cámara de Comercio, regulatory | Norte Sur Consulting S.A.S. |
| Banking (Wompi, Colombian bank account) | Norte Sur Consulting S.A.S. |
| Mike's own signature on contracts | Michael Chartrand · Founder & Legal Representative |
| Casual chat, internal notes, team comms | Mike |

### Liability implication

Because the entity is an SAS (not a sole proprietorship), **liability is on the company, not on Mike personally** (corporate veil). This is meaningful for client contracts: any limitation-of-liability cap or warranty applies to Norte Sur Consulting S.A.S. as the contracting party.

### NIT in client-facing materials

Display NIT on:
- Footer of any PymeWebPro-branded site (compliance with Colombian Cámara de Comercio rules)
- Invoices
- Contracts (party block + Notices + signature footer)
- Habeas Data / privacy policy pages

## Legal / financial setup

- **Legal entity:** Norte Sur Consulting S.A.S., a registered Colombian SAS (NIT 901.956.771-1). PymeWebPro is the DBA.
- **Banking + payments:**
  - **Wompi** (COP) · Colombian bank transfers (PSE) and cards · the only PymeWebPro payment method
  - **Colombian bank account** · primary operating account
- **COP only.** PymeWebPro the studio bills exclusively in COP via Wompi. We do NOT bill in CAD or USD and do NOT use Wise or Stripe as a payment method.
- **Stripe is NOT a PymeWebPro payment method.** We can build Stripe Checkout INTO client sites (they own the merchant account, we wire the integration), but we don't accept Stripe ourselves.

## Pricing (single-product model, set 2026-05-20)

ONE product, NO à la carte add-ons. The base page includes the Ficha de Google (Google Business Profile), it is NOT an add-on. All paid extras now live inside ONE optional monthly plan. No Essential/Pro tiers. Colombia-only, COP-only. Source of truth for the offer: `~/code/pymewebpro-sales/`.

### The product

| Product | Price | Includes |
|---------|-------|----------|
| La página de ventas | $400.000 COP one-time, IVA incluido | Ficha de Google (Google Business Profile) configurada, custom 6-step conversion page with 1 primary CTA, WhatsApp button + click-to-call, contact form, click-to-call, Google Maps embed, booking/appointment integration (Cal.com/Calendly), testimonials section, SEO structure, privacy-first analytics, domain + SSL setup (domain cost is the client's), 1 month hosting + support, 2 revision rounds, live in ~48 hours |

### Optional monthly plan (after the included first month, no contract, cancel anytime)

ONE monthly plan, todo incluido (includes hosting). There are no standalone à la carte add-ons: every paid extra lives inside this single plan.

| Plan | Price | Includes |
|------|-------|----------|
| Plan mensual | $150.000 COP/mes | hosting + Ficha de Google activa y actualizada + versión bilingüe ES/EN + soporte por WhatsApp + hasta 2 cambios al mes + asistente de ventas 24/7 (un chatbot en la página que conoce el negocio, responde las preguntas de los clientes, los pasa al WhatsApp con un clic y agenda llamadas) + vitrina de hasta 30 productos + catálogo o menú descargable + reporte mensual con la actividad de los clientes |

A **ronda de revisión adicional** beyond the 2 included rounds is $90.000 COP (a per-revision charge, not an add-on). Out of scope, quoted separately / escalate (never a productized add-on): tienda en línea real (carrito, inventario, pagos), blog/CMS, sitio multi-página, apps, portales con login, membresías.

### Hosting after the included month

ONE monthly plan (includes hosting): Plan mensual $150.000 COP/mes, todo incluido.

### Payment terms

- **30% deposit to start** · no design or development work begins until deposit clears. On the base page that is $120.000 COP.
- **70% on launch** · site sits on staging URL until paid ($280.000 COP on the base page); DNS to client domain not connected until balance clears.
- Wompi in COP only (cards, PSE, bank transfer).

Switched from 50/50 to 30/70 on 2026-05-05. The lower barrier to start makes the buy decision easier while DNS gating on the 70% balance still protects against non-payment.

### Base-page payment breakdown

| Product | Full price | 30% deposit | 70% balance | Hosting included |
|---|---|---|---|---|
| La página de ventas | $400.000 COP | $120.000 COP | $280.000 COP | 1 month |

(Historical note: the studio previously ran a two-tier Essential/Pro model and an NA/CAD price list. Both are retired as of 2026-05-20. CAD pricing is no longer offered.)

### 30-day satisfaction guarantee

For 30 days after launch, if the client is unhappy for any reason, we:
1. Take the site offline (DNS disconnect, production deployment removed)
2. Refund the full fee to the original payment method within 14 days
3. Hand off a portable archive of the work in case they want to migrate it elsewhere

After 30 days, fee is non-refundable. Hosting is always month-to-month and cancellable anytime regardless.

### Reference: agency comparison
| Item | Typical agency | PymeWebPro |
|------|----------------|------------|
| Equivalent custom sales page | $5.000.000 COP+ | $400.000 COP |
| Timeline | 6–10 weeks | ~48 hours |
| Hosting | high monthly WordPress fee | Included, then el Plan mensual de $150.000 COP/mes |
| Tech | WordPress + plugins | Hand-coded HTML on Cloudflare |

## Unit economics

Build time: ~15 min per mockup (5 min brief + 10 min build with Claude). Wire-up amortizes to near-zero across multiple mockups deployed together.

At $400.000 COP/close, the bottleneck is outreach throughput, not build capacity (Claude+files makes that near-infinite). The constraint is qualified prospects per week, not mockups built per hour. The monthly plan (Plan mensual $150.000/mes, todo incluido) adds recurring revenue above the one-time $400.000 without adding meaningful build time.

## Positioning · the stack

1. **Medellín-based** → real, structural cost advantage (rent + salaries a fraction of a North American agency)
2. **AI-leveraged (Anthropic)** → speed + quality multiplier; explains the price without apology
3. **Paisa partner (Santiago) + Colombian SAS** → a real, local studio with a registered entity, not a freelancer
4. **Canadian ownership** → a subtle trust signal, never the headline, never positioned as superiority over Colombians

The narrative: "Estudio de diseño web en Medellín. Construido con Claude de Anthropic. Páginas de ventas custom por $400.000 COP, en vivo en ~48 horas."

## Why we cost less (the honest pitch)

Three pillars, deployed verbatim on the PymeWebPro CA site:
- **Geography** · Canadian-led, Medellín-built. Real structural cost advantage.
- **Tooling** · Anthropic AI as design partner. Capability still novel in 2026.
- **Stack** · No WordPress, no plugin subscriptions. Smaller cost base, smaller invoice.

This section is the conversion driver. Honest > marketing-speak.

## Target verticals (Colombian SMBs)

In priority order:
1. **Independent dental clinics** · Espacio Dental is proof. High-revenue customers, dentists obsess over patient acquisition.
2. **Boutique fitness / yoga / pilates** · design-conscious owners, willing to pay for quality, high LTV.
3. **Real estate agents without personal sites** · they all want one, brokerages don't always provide.
4. **Restaurants with Instagram-only presence** · fastest close, lower ticket, high volume.
5. **B&Bs / boutique hotels** · visual portfolio sells itself.

Avoid: chains, businesses with "marketing manager" job titles (they have process), highly-regulated SaaS / fintech (long sales cycle).

## Outreach motion

The "build mockup, then pitch" inversion:
1. Find SMBs without real websites (Google Business Profile with empty/social-only website field)
2. Build a custom mockup using their IG/FB content (15 min with Claude)
3. Push live to `mockups.pymewebpro.com/<slug>/`
4. Send WhatsApp/IG DM/email with the link: "Le armé una página de ventas de concepto para [negocio]. 30 segundos: [link]. Si le gusta, $400.000 COP, en vivo en ~48 horas."
5. Track open/reply/close in a tracker

### Sample outreach (Colombian Spanish, dental):
> Hola [nombre], soy Santiago de PymeWebPro, estudio de diseño web en Medellín. Vi que [clínica] todavía no tiene página web, solo Instagram, así que le armé un concepto rápido de cómo se vería: [mockup URL]. Sin compromiso, solo me pareció más útil que un correo en frío. Si le gusta, se la dejamos lista por $400.000 COP, en vivo en ~48 horas. · Santiago

### Tools for prospecting:
- **Outscraper** (~$30/mo) · Google Maps with website-null filter
- **Apollo** (free tier OK) · owner email/phone enrichment
- **Airtable / spreadsheet** · outreach tracker

## Risk · what NOT to overclaim

| Phrase | Honest | Overclaim |
|--------|--------|-----------|
| "Canadian-owned" | ✓ true · subtle trust signal only | leading with it as the headline |
| "Canadian founder" | ✓ true (personal fact) | framing it as superiority over Colombians |
| "Colombian SAS, NIT 901.956.771-1" | ✓ true | · |
| "Studio in Medellín" | ✓ true | claiming a separate physical office |
| "Pricing in COP, IVA incluido" | ✓ true (Wompi) | quoting CAD or USD anywhere |
| "Pago vía Wompi (PSE, cards)" | ✓ true | claiming Wise/Stripe as our payment rail |
| "Serving Colombian SMBs" | ✓ true | positioning as an NA / US / international studio |

## Positioning blurb (current, COP-only)

> PymeWebPro (DBA de Norte Sur Consulting S.A.S., NIT 901.956.771-1) es un estudio de diseño web en Medellín para PYMEs colombianas. Diseñamos, programamos y publicamos páginas de ventas custom alojadas en la red edge de Cloudflare. Un solo producto, la página de ventas, $400.000 COP (IVA incluido), con planes mensuales opcionales. Pago vía Wompi en COP. En vivo en ~48 horas. Mercado colombiano únicamente.

(Historical note: an earlier Wise Business KYB blurb described the studio as serving North America and Latin America with CAD pricing. That NA framing is retired. The studio is Colombia-only, COP-only, paid via Wompi.)
