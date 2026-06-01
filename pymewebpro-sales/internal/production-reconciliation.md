# Production reconciliation punch-list

> **SUPERSEDED (2026-06-01).** Everything below describes a 2026-05-20 reconciliation against the OLD model (Essential/Pro tiers, à la carte chatbot at $80.000/mes, $30.000/mes hosting, etc.). That model is RETIRED. The current model is a single bundle: ONE product **La página de ventas $400.000 COP** (incluye la Ficha de Google + el primer mes del plan) with a 30/70 split ($120.000 / $280.000), plus ONE optional **Plan mensual $150.000 COP/mes todo incluido** (hosting, Ficha de Google activa, versión bilingüe, soporte WhatsApp, hasta 2 cambios/mes, asistente 24/7, vitrina de 30 productos, catálogo descargable, reporte mensual). There are no tiers and no standalone add-ons. The prices, tier names, chatbot run fee, and renewal figures in the body below are HISTORICAL ONLY: do not quote them to clients. Kept as a record of what was done on 2026-05-20.

---

Internal (English). Decision: **the sales guide is the source of truth.** This was the exact list of edits to bring the live site and Valentina in line with the guide.

**STATUS: EXECUTED 2026-05-20 (edited in the repos, NOT yet deployed).** All sections below were applied to `~/code/pymewebpro/index.html` + `en/index.html` (marketing site) and `~/code/pymewebpro-agent/src/{agent.js,tools.js}` (Valentina). One change of plan during execution: Mike kept "Canadian-owned" as a subtle trust signal and London, Ontario as "the Canadian studio" (so the A1 CAD/Canadian strip became "remove CAD + NA-market targeting, keep Canadian-owned as a quiet trust signal"). To ship: marketing site `git push` (Pages auto-deploys, CSP hashes already refreshed); Valentina `cd ~/code/pymewebpro-agent && wrangler deploy`. The remaining open item is the testimonials/analytics question, now resolved (standard on both).

Last checked against production: 2026-05-20.

---

## Decisions (Mike, 2026-05-20)

1. **Plan names → RESOLVED: keep Essential / Pro.** The guide has been renamed from Basic/Advanced to Essential/Pro to match production. No name change needed in production.
2. **Chatbot → RESOLVED: it is a real product.** The chatbot belongs in Pro (and as an Essential add-on) with the $80.000/mes run fee. When production is updated, remove the live site's "No un chatbot" line and reword "sin suscripción mensual" (see A3).
3. **Booking → RESOLVED: standard on both tiers.** Booking/appointment integration (embed and style one scheduling tool the client uses, e.g. Cal.com or Calendly) is now included in both Essential and Pro, not an add-on. The guide reflects this. A custom booking engine is still outside the model. **Production action:** make sure booking is listed as included in BOTH the Esencial and Pro briefs (Valentina currently has it in Pro only) and in both plan cards on the live site.
4. **IVA → RESOLVED: IVA incluido.** Added to the guide's prices (one-pager, configurator, add-on menu, scope boundaries, rulebook, script) to match production + Valentina.

## Essential / Pro inclusion split → RESOLVED (Mike, 2026-05-20), with one production action

Mike confirmed the split. The guide now reflects it:

- **Google Maps embed → Essential** (and inherited by Pro).
- **Google Business Profile setup → Pro only.**
- **Click-to-call → both tiers.**
- **Domain connection + SSL → both tiers.** We set up the domain and SSL; the domain registration/renewal fee is the client's cost (we help them get one if they do not have it). This caveat must appear wherever the domain is mentioned.

**Production action (B5):** Valentina's current Essential brief (`tools.js` ~72/74) lists Google Business Profile setup under Essential. Mike moved GBP to Pro, so production must follow: remove GBP from the Esencial brief and add it to the Pro brief. Add the domain-cost caveat to both briefs and to the live site (we set up the domain, the client pays for it). Maps embed stays in Essential, click-to-call + domain + SSL stay in both, which already matches Valentina.

**Still to confirm with Mike:** Valentina's Essential also lists a **testimonials section** and **privacy-first analytics**, which are not yet in the guide's Essential. Decide whether to add them to the guide's Essential (likely yes, they are part of the real build) or drop them from production. Note: privacy-first analytics (e.g. Cloudflare Web Analytics) is distinct from the GA4/GTM/Pixel "Paquete de analítica" that is a Pro feature / Essential add-on, so both can coexist.

---

## A · Live marketing site

Files: `~/code/pymewebpro/index.html` (ES, primary) and `~/code/pymewebpro/en/index.html` (EN, must get the same pass, not yet line-checked here). Hash-locked CSP via `functions/_middleware.js`: after editing inline content, re-run `python3 scripts/refresh-csp-hashes.py` before pushing.

### A1 · Strip CAD and the NA / Canadian positioning (house-rule violation, fix regardless)

The live site currently shows CAD prices and Canadian-market positioning, which breaks the COP-only / Colombia-only hard rule.

- Schema JSON-LD: `priceCurrency":"CAD"` and `areaServed":["CA","US","CO"]` on both Service blocks (around lines 47 and 50). Change currency to COP with the COP price, areaServed to `["CO"]`.
- `<span class="price-na">$500 CAD</span>` / `$800 CAD` appear in: hero eyebrow (~411), lede (~450), Essential card price (~767), Pro card price (~791), the "why we cost less" answer (~974), footer blurb (~1013). Remove the `price-na` CAD spans (and the CSS toggle that shows them) so only the COP figure renders.
- "Liderazgo canadiense" / "Canadian leadership" in og:description (~18) and footer (~1013), and the `$500 compra lo que antes costaba $5.000` NA line (~974). Replace with the COP-only framing already used elsewhere ("$390.000 compra lo que antes costaba $3.900.000").

### A2 · Renewal price $270.000 → $300.000

- FAQ answer "¿Cuánto cuesta el hosting...?" (~60 in schema, ~986 in body) and the "qué recibo" answer (~982) say `$270.000 COP/año ... ahorra 25%`. Change to `$300.000 COP/año (ahorra dos meses)` to match the guide. Keep "IVA incluido."
- The `/hosting` page (separate file) has the same figure, update it too.

### A3 · Chatbot (depends on decision 2)

If the chatbot becomes a tier feature:

- Add "Chatbot de captura de leads" to the Pro card includes list (~794-798).
- Remove the "No un chatbot" line in the contact section (~911) and reword the "sin suscripción mensual" line (~932) so it says "no lock-in / cancelable" rather than "no monthly," since a chatbot funnel now renews at $110.000/mes.
- Add a line (FAQ or Pro card footnote) disclosing: a funnel with a chatbot renews at $110.000/mes (hosting + support + chatbot) after the included year.

### A4 · Booking (standard on both)

Booking is included in both tiers. Add the booking/appointment integration line to BOTH the Essential and Pro plan cards on the live site (it currently sits in Pro only). Do not list it as an add-on.

---

## B · Valentina (sales agent)

Files: `~/code/pymewebpro-agent/src/agent.js` (system prompt) and `~/code/pymewebpro-agent/src/tools.js` (plan briefs). Deploy: `cd ~/code/pymewebpro-agent && wrangler deploy`. She is COP-only already (agent.js ~68), good.

### B1 · Fix the stale hosting line

- `tools.js` ~line 11 (send_plan_brief description) says "Both bundle 1 year of hosting." That contradicts her own Essential = 1 month (agent.js ~53). Change to "Essential bundles 1 month, Pro bundles 1 year."

### B2 · Chatbot (depends on decision 2)

- `agent.js` Pro definition (~55-60): add the chatbot to Pro's included features.
- `agent.js` Essential definition (~41-53): note the chatbot is available as an add-on on Essential.
- Add a hard rule to the system prompt: whenever a plan with a chatbot is quoted, disclose the recurring run fee. A funnel with a chatbot renews at $110.000/mes (hosting + support $30.000 + chatbot $80.000), fair-use ~300 conversations/mes, overage billed. Never present the chatbot as one-time-only.
- `tools.js` Pro brief (ES ~85, EN ~87): add the chatbot and the recurring disclosure. Add a chatbot add-on line to the Essential brief if you want her to upsell it.

### B3 · Renewal facts

- Give Valentina the renewal numbers so she can answer "what happens after the included period": hosting + support $30.000/mes or $300.000/año (saves two months); +$80.000/mes if the funnel has a chatbot; $110.000/mes combined. (Currently her briefs do not state renewal pricing at all.)

### B4 · Booking (standard on both)

- Booking is included in both tiers. Add the booking integration to the Esencial brief too (tools.js ~72/74); it is already in the Pro brief. Do not present it as an add-on.

---

## C · Consistency checklist (run after edits)

- No CAD / USD / "dollar" anywhere on pymewebpro.com (ES + EN) or in Valentina.
- No em dashes introduced.
- Renewal reads $300.000/año everywhere (site, Valentina, guide).
- Chatbot is described identically in the guide, the site, and Valentina (same inclusions, same $80.000/mes, same ~300-conversation fair-use, same $110.000/mes combined renewal).
- Plan names match across all three surfaces (per decision 1).
- After site edits: `python3 scripts/refresh-csp-hashes.py` then push. After Valentina edits: `wrangler deploy`.
- Per the studio discipline rule, add Recent changes entries to `~/code/pymewebpro/CLAUDE.md` (site) and note any platform change in `~/code/PLATFORM.md`.
