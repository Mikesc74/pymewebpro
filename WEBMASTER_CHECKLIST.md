# Webmaster's Checklist — pymewebpro.com

Consolidated from three audits conducted in late April–May 2026.

## Performance & Core Web Vitals
- Lighthouse / PageSpeed: LCP, INP, CLS, TTFB, FCP, total page weight
- Render-blocking inline CSS and Google Fonts
- Image weight and format (WebP/AVIF, responsive sizes)
- Font file count and variants
- `Cache-Control` headers (avoid `max-age=0` defeating CDN)
- CDN in front of origin (Cloudflare here)
- Real-world network conditions (3G/4G in target geography)
- Long tasks / main-thread work
- Scroll-triggered animations that fail to fire on fast scroll
- Lean payload target (~270 KB / few resources)

## SEO — Technical & On-Page
- Real `robots.txt` (not the homepage HTML at 200)
- Real `sitemap.xml` (not the homepage HTML at 200)
- Proper 404s — every nonexistent path was returning 200 with the homepage (soft-404 catastrophe; bait for `/wp-admin`, `/.env`, `/.git/HEAD`, `/backup.zip`)
- JSON-LD structured data (Organization, LocalBusiness, FAQ, Review/AggregateRating)
- Title, meta description, H1 hierarchy, canonical
- `og:locale` and `<title>` updating on locale change
- Sitemap depth — ship city/industry landing pages
- `sameAs` includes LinkedIn, GBP, social profiles
- Local SEO: Google Business Profile, NAP consistency
- Keyword targeting matched to local SMB intent

## Internationalization (ES / EN)
- Pre-render static `/` and `/en/` rather than JS locale toggle
- All strings translated (not Frankenstein "$890k única vez / Essential")
- `<title>` and `og:locale` swap with content
- Locale-aware number formats (COP thousands separator)
- Region-specific Spanish, not generic LatAm/Spain

## Security & Headers
- HTTPS + valid cert + HSTS
- CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy
- `www` → apex 301 redirect
- Form `method=post` to a real endpoint (never `method=get` to homepage — leaks PII via Referer)
- CSRF protection on forms
- No exposed `.env`, `.git`, admin paths, stack traces
- Honeypot on forms
- Mixed-content checks; dependency/CMS patching

## Privacy, Legal & Habeas Data (Ley 1581)
- Cookie consent banner with categories
- All non-essential trackers gated behind consent (analytics was firing before consent)
- Habeas Data consent checkbox on contact forms
- Privacy policy reflects what actually loads (don't list trackers you don't run)
- Cámara de Comercio + NIT visible
- Estatuto del Consumidor (Ley 1480) compliance — no fabricated testimonials

## Analytics & Conversion Tracking
- Privacy-friendly basics (Cloudflare Web Analytics)
- GA4 / Meta Pixel for `?campaign=` attribution (after consent)
- Event tracking on CTAs, form submits
- Exit-intent / retargeting only after consent

## Accessibility (WCAG AA)
- `<main>` and other landmarks
- Color contrast ≥ 4.5:1 (logo wordmark was 2.24:1)
- Alt text on images
- ARIA, keyboard nav, screen reader paths
- Tap target sizes on mobile

## UX, Design & Mobile
- Five-second test for value prop clarity
- Mobile-first review (most SMB traffic is mobile)
- Tap targets, sticky elements, form usability on mobile
- Cross-browser sanity (Chrome, Safari)
- Console errors, broken images, redirect chains
- Authentic imagery — no stock photos on a "made locally" panel

## Content, Copy & Localization
- Tone consistency — pick `usted` or `tú` and don't mix
- No truncated/Frankenstein sentences in the hero
- Speak to PyME pain (DIAN, facturación electrónica, payroll, cash flow)
- Plain language, benefits over features
- COP pricing format with period thousands separator
- Right product noun ("sitio web" vs "landing page")

## Trust, Credibility & Social Proof
- Real, named testimonials with quantified outcomes
- No self-referential case studies presented as arms-length clients
- Founder bios when client list is thin — founders ARE the trust signal
- Aggregate honesty stats ("1 cliente activo · garantía 30 días")
- Capture pre-launch baselines so testimonials can be quantified later
- Get testimonial usage rights in writing (perpetual, royalty-free, with Habeas Data authorization)
- WhatsApp Business as a contact channel
- Visible NIT, Cámara de Comercio registration, physical address, RUT
- Money-back / SLA guarantees prominently displayed

## Forms & Lead Capture
- POST to a real endpoint, never GET to homepage
- Honeypot + server-side validation
- Habeas Data consent checkbox
- Minimal required fields, autofill-friendly
- Clean up test leads from CRM after audit work

## Conversion Funnel
- Map landing → interest → consideration → conversion; find leak points
- CTA placement, frequency, clarity (no competing CTAs)
- Plan preselection logic
- Lead magnets / free trial / demo / guarantee

## Pricing & Products
- Transparent COP pricing
- IVA inclusion/exclusion stated next to each card
- Local payment methods (PSE, Nequi, Daviplata, tarjeta, cuotas)
- Tier anchoring with a clear upgrade path
- Benchmark against direct competitors (Alegra, Siigo, World Office, ContaPyme, Wompea, Muselab)
- Don't underprice differentiators (SLA, refund, bilingual, registered entity)

## Competitive Positioning
- Identify undercutters (Wompea $350k bundled hosting) and articulate counter-differentiators
- Lift up SLA, refund guarantee, registration, bilingual capability — they were latent

## Launch / GTM
- Cohort offer with visible decrementing scarcity
- Screen applicants for sector and city diversity
- Build founding-cohort sites in series, not parallel
- Re-use NIT + Cámara as anti-scam signals in posts
- Channel-by-channel inbound tracking ("¿Cómo se enteró?")
- Pin/re-share launch posts; tag connectors in follow-up comments, not the post
