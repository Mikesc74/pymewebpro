# Lead-capture audit · pymewebpro.com static site

Date: 2026-05-16. Read-only audit. No source files modified.

Scope: the 19 pages listed in the brief (Spanish home, English home, /start, /recursos, /tienda, /sitios-web, /sitios-web-por-industria, 3 city pages, 12 industry-city landings).

Lead endpoint shared by all forms: `POST https://portal.pymewebpro.com/api/leads`. The portal accepts `utm_source`, `utm_medium`, `utm_campaign` as top-level fields plus `extra` (object) for arbitrary metadata. None of the static pages currently send any UTM, gclid, or fbclid value.

Single WhatsApp number across the site: `+57 301 404 7722` (Santiago), linked as `https://wa.me/573014047722` with NO prefilled `?text=` parameter on any page.

Single Cal.com link across the site: `https://cal.com/mike-chartrand/15min` with NO prefill query string (no `name=`, `email=`, `notes=`) on any page.

Single mailto address: `hello@pymewebpro.com`.

## Summary table

| Page | Surface | Type | Endpoint | Fields collected | UTMs? | Page context? | WA# / Cal prefill | Notes |
|---|---|---|---|---|---|---|---|---|
| /index.html (ES home) | Hero pill | Cal link | cal.com/mike-chartrand/15min | n/a | no | no | no prefill | Top of page |
| /index.html | Hero pill | WA link | wa.me/573014047722 | n/a | no | no | no prefill text | Top of page |
| /index.html | Pricing CTAs | internal link | /start/?plan=esencial, /start/?plan=pro | n/a | no | plan only | n/a | Routes to /start form |
| /index.html | "El Pedido" form | HTML form (JS fetch) | portal.pymewebpro.com/api/leads | name, email, about (textarea), company_website (honeypot) | no | source="pymewebpro_v4", page=location.pathname, language="es" | n/a | No phone, no business name, no industry, no city |
| /index.html | Form alt-paths | Cal + WA | cal.com / wa.me | n/a | no | no | no prefill | Below form |
| /index.html | Footer | Cal + WA + mailto | as above + mailto:hello@pymewebpro.com | n/a | no | no | no prefill | Bottom of page |
| /en/index.html | Hero pill | Cal + WA | same URLs | n/a | no | no | no prefill | English variant |
| /en/index.html | "The Ask" form | HTML form (JS fetch) | portal.pymewebpro.com/api/leads | name, email, about, company_website (honeypot) | no | source="pymewebpro_v4", page, language="en" | n/a | Same gaps as ES. On success, redirects to `portal/c/{lead_id}` (ES form does NOT redirect, just shows confirmation) |
| /en/index.html | Footer | Cal + WA + mailto | same | n/a | no | no | no prefill | |
| /start/index.html | Lead form | HTML form (JS fetch) | portal.pymewebpro.com/api/leads | name, email, business_name, company_website (honeypot) | no | source="pymewebpro_start", page="/start/", language="es", extra={plan, hosting} (plan from ?plan= query, hosting derived) | n/a | Quotes prices in BOTH CAD and COP based on Cloudflare geo. Violates Mike's COP-only rule. No phone, no industry, no city |
| /start/index.html | Alt-paths | Cal + WA | same | n/a | no | no | no prefill | |
| /recursos/index.html | none | mailto only (footer) | mailto:hello@pymewebpro.com | n/a | n/a | n/a | n/a | Pure download page. No lead capture. PDF downloads are not gated. No name/email capture on any PDF. |
| /tienda/index.html | Lead form | HTML form (JS fetch) | portal.pymewebpro.com/api/leads | name, email, about (textarea), company_website (honeypot) | no | source="pymewebpro_tienda", page="/tienda/", language="es", extra={plan:"ecommerce", hosting:"annual"} | n/a | No phone, no platform preference (Shopify vs custom), no product count, no city |
| /tienda/index.html | Footer | Cal + WA + mailto | same | n/a | no | no | no prefill | |
| /sitios-web/index.html | Lead form | HTML form (JS fetch) | portal.pymewebpro.com/api/leads | name, email, about, company_website (honeypot) | no | source="pymewebpro_sitios_web", page="/sitios-web/", language="es", extra={plan:"website", hosting:"annual"} | n/a | No phone, no page-count signal, no industry, no city |
| /sitios-web/index.html | Footer | Cal + WA + mailto | same | n/a | no | no | no prefill | |
| /sitios-web-por-industria/index.html | none | mailto only (footer) | mailto:hello@pymewebpro.com | n/a | n/a | n/a | n/a | Hub page. CTAs route to home `#cta-final` (a hash that does not exist on the home page · the home form has `id="lead-form"` inside `id="ask"`). Broken anchor. |
| /medellin/index.html | none | mailto only (footer) | mailto:hello@pymewebpro.com | n/a | n/a | n/a | n/a | All CTAs route to `https://pymewebpro.com/#cta-final` (broken anchor, see above) |
| /bogota/index.html | none | mailto only (footer) | mailto:hello@pymewebpro.com | n/a | n/a | n/a | n/a | Same |
| /barranquilla/index.html | none | mailto only (footer) | mailto:hello@pymewebpro.com | n/a | n/a | n/a | n/a | Same |
| /sitio-web-clinicas-dentales-medellin/ | none | mailto only (footer) | mailto:hello@pymewebpro.com | n/a | n/a | n/a | n/a | CTAs `#cta-final` (broken) |
| /sitio-web-clinicas-dentales-bogota/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-clinicas-dentales-barranquilla/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-abogados-medellin/ | none | mailto only (in body, not footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-abogados-bogota/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-abogados-barranquilla/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-hoteles-boutique-medellin/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-hoteles-boutique-bogota/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-hoteles-boutique-barranquilla/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-empresas-turismo-medellin/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-empresas-turismo-bogota/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |
| /sitio-web-empresas-turismo-barranquilla/ | none | mailto only (footer) | as above | n/a | n/a | n/a | n/a | Same |

## Gaps

### Critical: 15 of 19 audited pages have ZERO direct lead capture

- All 12 industry-city landing pages (the highest-intent, lowest-funnel surfaces, the ones meant to receive paid traffic) have no form, no WhatsApp link in the body, no Cal.com link. They have one mailto in the footer. All their CTAs point to `https://pymewebpro.com/#cta-final`.
- The 3 city pages (medellin, bogota, barranquilla) have the same problem.
- The /sitios-web-por-industria hub has the same problem.

### Critical: `#cta-final` is a broken anchor

The home page form lives at `id="ask"` (inside `<section id="ask">`). It does not have an element with `id="cta-final"`. 16 of the 19 audited pages link CTAs to `https://pymewebpro.com/#cta-final`. Users land on the home page top, not on the form. This is silently losing every click from every industry/city landing page.

### Zero UTM / click-id capture site-wide

- No form on any audited page reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, or `fbclid` from the URL and forwards it to the portal.
- The portal `POST /api/leads` endpoint already accepts `utm_source`, `utm_medium`, `utm_campaign` at the top level (see `portal/src/index.js` line 1035), so the data model is ready · the static pages just don't send anything.
- Result: when paid traffic starts running, there is no way to attribute a lead to a campaign, ad set, or creative. Channel ROI is unknowable.

### Zero landing-page context passed to forms

- No form sends industry (dental / legal / hotels / tourism) or city (medellin / bogota / barranquilla) as structured fields. The portal `extra` field only carries `plan` and `hosting`.
- Even if the industry pages had their own forms, the existing form templates would still need to be edited to inject industry+city as hidden fields. Today the only form that varies its payload by page is /start (sends `extra.plan`).
- Result: when Santi opens a lead in the portal he sees `page="/start/"` or `page="/sitios-web/"` but never `industry="dental"` and `city="medellin"`.

### Every WhatsApp link is unattributable

- All 8 `wa.me/573014047722` instances across the home, /en, /start, /tienda, /sitios-web go to a plain URL with NO `?text=` prefill.
- When a user clicks WhatsApp Santiago from the dental-medellin page (when those pages get a WA link added) vs from the home page, Santi sees the same blank chat. He cannot route the conversation, cannot greet by industry, cannot reference the page they came from.

### Every Cal.com link is unattributable

- All Cal.com links use the bare `cal.com/mike-chartrand/15min` URL with no `name=`, `email=`, `notes=`, or `metadata.industry=` query params.
- Mike sees a calendar booking with the visitor's manually-typed answers to whatever questions are in the Cal.com booking form. No source attribution.

### Fields the studio should collect but isn't

Every form is the same minimal 3-field shape (name, email, free-text textarea). Missing:

- **Phone / WhatsApp number.** Critical in Colombia. Email is a weak primary channel; WhatsApp is how SMBs actually close.
- **Business name.** Only /start asks for it. The home `ask` form, /sitios-web, and /tienda do not.
- **Industry.** Either auto-injected (when the form lives on an industry page) or dropdown.
- **City.** Same.
- **Current website (URL field, not honeypot).** "What's your current site, if any?" tells Santi within 5 seconds whether this is a redesign or net-new build, and lets him pull it up before the first call.
- **Timeline.** "When do you need it live?" (this week / this month / next 1-3 months / just exploring) is the single best qualifier for studio capacity planning.
- **Budget signal.** Even a soft "Approx budget" radio (under $400k COP / $400-700k / $700k-1.5M / above $1.5M) lets Santi triage incoming leads against the Essential $390k / Pro $690k / Sitio web $1.49M tiers without an awkward first-call conversation.

### Inconsistency between forms

- Field count varies: home=3, /en=3, /start=3 (with `business_name`), /tienda=3, /sitios-web=3.
- Status copy varies: ES home shows "Recibido. Mike o Santiago le responderán..."; EN home redirects to `portal.pymewebpro.com/c/{lead_id}`; /start also redirects; /tienda and /sitios-web do NOT redirect. Inconsistent post-submit UX.
- `source` field values are inconsistent: `pymewebpro_v4`, `pymewebpro_start`, `pymewebpro_tienda`, `pymewebpro_sitios_web`. No documented convention.

### House-style violation in /start

The /start page renders prices in CAD (`$500 CAD`, `$150 CAD`, `$800 CAD`, `$240 CAD`) for any visitor whose Cloudflare geo is not CO. This violates the Colombia-only / COP-only rule in `/Users/mikec-home/code/CLAUDE.md`. (Flagged for awareness · outside audit scope to fix.)

### Honeypot field is correct but underused

The `company_website` hidden honeypot is implemented consistently on all 5 forms. Good. But the real "current website" question (a legitimate signal) is missing, so the honeypot name is wasted naming-wise.

### Recursos: ungated PDFs, no lead capture

`/recursos/` ships 2 live PDFs (`guia-dominio.pdf`, `guia-google-sin-pagar.pdf`) as direct downloads. No email gate. This is consistent with the page's "sin formularios, sin registros" promise so it may be deliberate · but it means content downloads do not produce leads. Worth a deliberate decision rather than a default.

## Recommended minimum field set

For a Colombian SMB studio that needs to qualify a lead in 2 messages, every form should collect:

1. **Nombre** · text, required.
2. **WhatsApp** · tel, required, format `+57 ...`. This is the channel that closes. Email second.
3. **Correo** · email, required.
4. **Negocio** · text, required. (Name of the business, not free-text "tell us about your business".)
5. **¿Tiene sitio web actual?** · URL field, optional. If filled, the studio can pull it up before the call.
6. **¿Cuándo lo necesita?** · radio: "Ya / Este mes / 1-3 meses / Solo explorando". One question, four buttons, no typing.
7. **Mensaje** · textarea, optional. Free text for context.

Hidden / auto-injected on every form:

- `industry` · `dental` / `legal` / `hoteles_boutique` / `turismo` / `general`. Hardcoded per industry landing page.
- `city` · `medellin` / `bogota` / `barranquilla` / `otra`. Hardcoded per page when on a city or industry-city landing.
- `landing_slug` · the URL slug of the page (e.g. `sitio-web-clinicas-dentales-medellin`).
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` · read from `URLSearchParams` on page load and stickied to `sessionStorage` (so a UTM survives if the user clicks around before submitting).
- `gclid`, `fbclid` · same treatment.
- `referrer` · `document.referrer` if cross-origin.
- `page` and `language` · already done.

That's 7 visible fields and ~10 hidden fields. The visible count is unchanged from today (still 4-5 fields the user types/picks) but the qualifying data tripled.

## Recommended WhatsApp prefill template

Pattern: every industry-city page injects a different `?text=` parameter so Santi knows the context from the very first message before the visitor types anything.

Format (URL-encoded):

```
https://wa.me/573014047722?text={prefilled-spanish-greeting}
```

Per industry-city, decoded text:

| Page | Prefilled text |
|---|---|
| /sitio-web-clinicas-dentales-medellin/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-clinicas-dentales-medellin. Tengo una clínica dental en Medellín y me gustaría una página de ventas. |
| /sitio-web-clinicas-dentales-bogota/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-clinicas-dentales-bogota. Tengo una clínica dental en Bogotá y me gustaría una página de ventas. |
| /sitio-web-clinicas-dentales-barranquilla/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-clinicas-dentales-barranquilla. Tengo una clínica dental en Barranquilla y me gustaría una página de ventas. |
| /sitio-web-abogados-medellin/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-abogados-medellin. Tengo una firma de abogados en Medellín y quisiera ver una página de ventas. |
| /sitio-web-abogados-bogota/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-abogados-bogota. Tengo una firma de abogados en Bogotá y quisiera ver una página de ventas. |
| /sitio-web-abogados-barranquilla/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-abogados-barranquilla. Tengo una firma de abogados en Barranquilla y quisiera ver una página de ventas. |
| /sitio-web-hoteles-boutique-medellin/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-hoteles-boutique-medellin. Tengo un hotel boutique en Medellín y quisiera ver el plan. |
| /sitio-web-hoteles-boutique-bogota/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-hoteles-boutique-bogota. Tengo un hotel boutique en Bogotá y quisiera ver el plan. |
| /sitio-web-hoteles-boutique-barranquilla/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-hoteles-boutique-barranquilla. Tengo un hotel boutique en Barranquilla y quisiera ver el plan. |
| /sitio-web-empresas-turismo-medellin/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-empresas-turismo-medellin. Tengo una empresa de turismo en Medellín y quisiera una página de ventas. |
| /sitio-web-empresas-turismo-bogota/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-empresas-turismo-bogota. Tengo una empresa de turismo en Bogotá y quisiera una página de ventas. |
| /sitio-web-empresas-turismo-barranquilla/ | Hola Santiago, vengo de pymewebpro.com/sitio-web-empresas-turismo-barranquilla. Tengo una empresa de turismo en Barranquilla y quisiera una página de ventas. |
| /medellin/ | Hola Santiago, vengo de pymewebpro.com/medellin. Tengo un negocio en Medellín y quisiera ver opciones de página web. |
| /bogota/ | Hola Santiago, vengo de pymewebpro.com/bogota. Tengo un negocio en Bogotá y quisiera ver opciones de página web. |
| /barranquilla/ | Hola Santiago, vengo de pymewebpro.com/barranquilla. Tengo un negocio en Barranquilla y quisiera ver opciones de página web. |
| /tienda/ | Hola Santiago, vengo de pymewebpro.com/tienda. Estoy pensando en una tienda en línea para mi negocio. |
| /sitios-web/ | Hola Santiago, vengo de pymewebpro.com/sitios-web. Quisiera ver opciones para un sitio web completo. |
| /sitios-web-por-industria/ | Hola Santiago, vengo de pymewebpro.com/sitios-web-por-industria y quisiera más información. |
| / (ES home) | Hola Santiago, vengo de pymewebpro.com y quisiera más información sobre la página de ventas. |
| /en/ | Hi Santiago, I came from pymewebpro.com/en and I would like more info on the sales page. |
| /start/ | Hola Santiago, estoy en pymewebpro.com/start eligiendo plan y tengo una pregunta antes de pagar. |

Same pattern, fewer keystrokes: `Hola Santiago, vengo de {url}. Tengo {industry} en {city} y quisiera {product}.` Three slots. Easy to generate from a 12-row JS object literal at build time.

## Recommended Cal.com prefill

Same idea, fewer params. Cal.com supports `?name=`, `?email=`, `?notes=` query strings. Pre-populate `notes` per page:

```
https://cal.com/mike-chartrand/15min?notes={url-encoded summary}
```

Examples:

- dental + medellin: `notes=Clínica dental en Medellín. Vino de /sitio-web-clinicas-dentales-medellin.`
- legal + bogota: `notes=Firma de abogados en Bogotá. Vino de /sitio-web-abogados-bogota.`

Mike sees the context in the booking confirmation email and on the Cal.com event detail page. No second-guessing what the call is about before he clicks join.
