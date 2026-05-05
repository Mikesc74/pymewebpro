# Process Document — PymeWebPro Customer Funnel

**Owner:** Mike Chartrand (build, tech), Santiago Santos (sales, voice)
**Last Updated:** 2026-04-29
**Review Cadence:** Quarterly, or after every batch of 5 closed clients

---

## 1. Purpose

This document captures the end-to-end PymeWebPro funnel — from the moment a Colombian SMB first encounters the brand until their site is launched and they enter post-launch support. It exists to:

- Keep Mike and Santiago aligned on responsibilities at every stage.
- Make new-team-member onboarding (if/when we hire) deterministic.
- Surface failure modes so we can pre-empt them rather than discover them in production.
- Give us a baseline to measure against as the business scales.

## 2. Scope

**In scope**

- Marketing-site visit → lead capture → conversion → payment → onboarding → build → launch → handover.
- Both buyer paths: "Hablar primero" (warm conversation) and "Reservar mi cupo" (direct purchase).
- Both plans (Esencial, Crecimiento) and the optional Plan Hosting subscription.
- The supporting toolchain (Cloudflare, Wompi, Resend, the portal).

**Out of scope**

- Long-term content/blog production for clients on the Hosting Plan (handled in a separate operational runbook).
- Refund execution mechanics on the Wompi/bank side (handled via Wompi dashboard manually).
- Manual outbound prospecting if/when we add it.

## 3. Stack & Systems

| System | URL / Identifier | Role |
|---|---|---|
| Marketing site | pymewebpro.com | Cloudflare Pages, repo `Mikesc74/pymewebpro`, the front door |
| Portal | portal.pymewebpro.com | Cloudflare Worker (D1 + KV + R2), runs admin + client intake + payment flow |
| Admin dashboard | portal.pymewebpro.com/admin | Token-gated; clients, leads, WhatsApp clicks, deliverables tracker |
| Database | Cloudflare D1 (`pymewebpro-portal`) | Source of truth for clients, leads, payments, files, deliverables |
| File storage | Cloudflare R2 (`pymewebpro-client-assets`) | Logos, photos, references uploaded via the intake portal |
| Email | Resend (verified domain `pymewebpro.com`) | Transactional emails: lead notifications, magic links, payment confirmations |
| Payments | Wompi (Bancolombia, sandbox + prod) | Webhook-driven payment flow with 24-hour discount logic |
| WhatsApp | +57 301 404 7722 | Both inbound (from `/go/whatsapp` redirect) and Santiago's outbound |
| Marketing email forwarding | Cloudflare Email Routing | `ventas@pymewebpro.com` → personal inbox |

## 4. Funnel Map

```
                    [pymewebpro.com]
                         |
         +---------------+---------------+
         |                               |
  WhatsApp click                    Contact form
  (/go/whatsapp)                  (/api/contact)
         |                               |
         |                       /api/leads (silent_notify)
         |                               |
         v                               v
  Santi WhatsApp inbox            Lead in admin portal
  (manual reply)                  + email to Mike
         |                               |
         |               +---------------+---------------+
         |               |                               |
         |        plan = "No estoy seguro"        plan = Esencial / Crecimiento
         |               |                               |
         |               v                               v
         |        Manual follow-up                /c/<lead_id> confirm page
         |        (Santi → WhatsApp)              (24h countdown, $100k discount)
         |               |                               |
         |               v                               v
         |        Verbal close → manual           Wompi checkout
         |        Wompi link via WhatsApp                |
         |               |                               |
         +---------------+-------+-----------------------+
                                 |
                                 v
                         Wompi webhook → /api/payments/wompi-webhook
                                 |
                                 v
                         Lead → Client (auto-convert)
                         Magic-link email sent
                                 |
                                 v
                         Client opens portal, fills 6 sections
                         (business, contact, brand, visual, content, tech)
                         + uploads logo/photos to R2
                                 |
                                 v
                         Client hits Submit
                                 |
                                 v
                         BUILD CLOCK STARTS
                         (7d Esencial / 14d Crecimiento)
                                 |
                                 v
                         Build → review rounds → launch on sunegocio.com
                                 |
                                 v
                         Training (30 min) + handover
                                 |
                                 v
                         Post-launch: Plan Hosting (optional) or self-serve
```

## 5. RACI Matrix

| Stage | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Marketing site uptime + copy | Mike | Mike | Santiago | — |
| Inbound WhatsApp reply | Santiago | Santiago | Mike (technical questions) | — |
| Lead-form triage in `/admin/leads` | Santiago | Santiago | Mike | — |
| Quote / plan recommendation | Santiago | Santiago | Mike | — |
| Payment confirmation + auto-invite email | System (portal Worker) | Mike | — | Santi (via admin notify) |
| Client intake follow-up if stalled | Santiago | Santiago | Mike | — |
| Build + design | Mike | Mike | Santiago (client-voice questions) | Client |
| Review-round handling | Mike | Mike | Santiago, Client | — |
| Launch + DNS cutover | Mike | Mike | — | Santiago, Client |
| 30-min training session | Mike or Santi | Santiago | Mike | Client |
| Plan Hosting upsell | Santiago | Santiago | Mike | — |
| Deliverable tracker hygiene | Mike | Mike | — | Santiago |
| Refund execution | Mike | Mike | Santiago | Client |

## 6. Detailed Stages

### Stage 1 — Awareness

**Trigger:** Prospect lands on `pymewebpro.com` (Instagram, referral, Google, ad, business card).

**Steps:**

1. Hero loads with the new "Ya no hay excusa para no estar en internet" eyebrow + "Su negocio merece estar en internet" h1.
2. JavaScript decides language: `?lang=en` → English; localStorage → previous choice; `navigator.language` startsWith `en` → English; otherwise Spanish.
3. Visitor scrolls past "Lo que recibe" (12 mini-deliverable cards), "Sitios que hemos construido" (portfolio with INVIERSOL leading), "Nosotros" (Mike + Santiago + flags), "Casos de estudio" with real metrics, pricing.

**Outputs:** Either a click on `Hablar primero` (WhatsApp), `Reservar mi cupo` (form pre-select), or contact-section CTA.

**SLA:** Cloudflare Pages handles 100% uptime; all critical paths < 1s TTFB measured.

**Failure modes:**

- Pages deploy fails → check GitHub Actions / Cloudflare Pages dashboard.
- DNS issue → Cloudflare DNS dashboard, zone `pymewebpro.com`.
- Pricing badge / plan info out of sync with portal → both must be updated in lockstep (marketing site `index.html` + portal `payments.js`).

---

### Stage 2 — Lead Capture

There are **three** entry points:

#### 2A — Contact form on pymewebpro.com (`#contacto` section)

**Trigger:** Visitor fills the form and submits.

**Flow:**

1. Form POSTs to `/api/contact` (Cloudflare Pages Function — `functions/api/contact.js`).
2. Function checks honeypot (`website` hidden field). If filled → silent 200, drop. Bot defense.
3. Validates required fields: nombre, email, whatsapp.
4. Sends rich admin email to `ventas@pymewebpro.com` (Resend) with all selections.
5. Sends customer auto-confirmation in Spanish.
6. Forwards lead silently to portal `/api/leads` with `silent_notify: true` and the structured `extra` field (plan, hosting, tipo).
7. Receives back `lead_id` from portal.
8. If `data.plan` mentions Esencial / Crecimiento / Pro → returns `confirm_url` to frontend, which redirects to `https://portal.pymewebpro.com/c/<lead_id>`.
9. If plan = "No estoy seguro" → no redirect; UI shows the success state ("¡Listo, recibimos su mensaje!").

**Owner:** Santiago (responding); Mike (technical health of pipeline).

**SLA:** Email arrives at Mike within seconds (Resend); customer confirmation also instant.

**Failure modes:**

- Resend delivery failure → check Resend dashboard logs; admin still gets the lead in `/admin/leads`.
- Portal `/api/leads` 5xx → Pages function logs error but doesn't fail the customer flow; customer still sees success.
- Honeypot accidentally filled by autofill → reduces bot defense; review submissions if spam spikes.

#### 2B — WhatsApp click

**Trigger:** Visitor clicks any `/go/whatsapp?campaign=…` link (replaces all direct `wa.me/…` references on the site).

**Flow:**

1. GET `/go/whatsapp` on the portal Worker.
2. Worker logs an anonymous click row in `lead_clicks` (kind=whatsapp, campaign, IP-hash, user-agent, referrer).
3. Worker 302s to `https://wa.me/573014047722?text=<prefilled_message>`.
4. WhatsApp opens on the visitor's device with the prefilled message.
5. Santiago sees the message arrive.

**Owner:** Santiago.

**Attribution:** Each link uses a unique `campaign=` (hero_form, contact_section, floater, plan_esencial, plan_crecimiento, form_fallback, confirm_page, confirm_help). Visible in `/admin` → WhatsApp tab → totals by campaign.

**Failure modes:**

- Visitor's device has no WhatsApp installed → `wa.me` shows a "download WhatsApp" page; click is still logged.
- Outbound message contains characters WhatsApp doesn't like → test before changing prefilled text.

#### 2C — Direct portal form (rare)

A prospect lands directly at `portal.pymewebpro.com/c/<lead_id>` from a shared/forwarded link. Treated identically to a regular paid path; the lead row already exists.

---

### Stage 3 — Lead Triage

**Trigger:** New lead appears in `/admin/leads`.

**Steps:**

1. Santiago opens `/admin/leads`. Filter by status: `new`.
2. Reviews source (Form / WA click / Manual), name, business, plan interest, message.
3. Reaches out via the buyer's preferred channel:
   - If they came from form with WhatsApp filled → WhatsApp first.
   - If they came from WhatsApp click → conversation may already be active.
   - If only email → reply to the contact email.
4. Marks status: `contacted` once outreach is made.
5. If lead picked Esencial or Crecimiento, the confirm page already has their precomputed price + discount; Santiago can send the URL `https://portal.pymewebpro.com/c/<lead_id>` directly so they can pay on their own.
6. If qualified but stalled → leaves status `contacted`, adds notes in lead detail.
7. If not a fit → marks `dismissed` with note.

**Owner:** Santiago.

**SLA target:** First reply within 24 business hours (no public promise on the page; copy says "le respondemos cuanto antes" — honest framing).

**Failure modes:**

- Resend admin notification gets caught in spam → check `/admin/leads` daily as backup.
- Lead doesn't include phone → email reply only (and offer WhatsApp).
- Same lead submits twice → manually merge (delete dupe lead in admin).

---

### Stage 4 — Conversion (Payment Path)

**Trigger:** Lead lands on `/c/<lead_id>` (auto-redirect from form OR Santi-shared link).

**The page shows:**

- 24-hour countdown if within `lead.created_at + 24h`.
- Strike-through anchor (`$2.490k`) and current price (`$1.790k`) for Crecimiento.
- Plan name, hosting line ("incluido en plan Crecimiento" if applicable, "facturado por separado" if monthly hosting on Esencial).
- Total reflecting plan + hosting + discount logic.
- "Pagar con Wompi" button.

**On click:**

1. Frontend POSTs `/api/leads/:id/checkout`.
2. Worker computes the quote (plan price, hosting if applicable, $100k off if within 24h).
3. Worker generates a unique `reference` (`pwp-<lead_id>-<base36 timestamp>`).
4. Worker computes Wompi integrity signature: `sha256(reference + amount_in_cents + currency + WOMPI_INTEGRITY)`.
5. Worker inserts a `payments` row with status `pending`.
6. Worker returns the Wompi Web Checkout URL with all signed params (and prefills customer-data with email/name/phone).
7. Frontend redirects to Wompi.
8. Buyer completes payment on Wompi-hosted page (card / PSE / Nequi / Bancolombia Button / installments via their bank).
9. Wompi redirects back to `/c/<lead_id>?status=back` and POSTs an event to `/api/payments/wompi-webhook`.
10. Worker verifies the webhook signature using `WOMPI_EVENTS` secret (concat of `signature.properties` values + timestamp + secret, sha256 compare).
11. Worker updates the `payments` row, sets `status` to approved/declined/voided/error/pending.

**Owner:** System; Mike for tech failures; Santiago for buyer questions during checkout.

**SLAs:** Webhook fires within seconds of card auth; lead converts to client immediately on `approved`.

**Failure modes:**

- Webhook URL not configured in Wompi dashboard → payment succeeds on Wompi side but our portal never knows. Mike must manually verify in Wompi dashboard and run the conversion.
- Webhook signature fails → 401, Wompi will retry. Check `WOMPI_EVENTS` secret matches dashboard.
- Buyer abandons mid-checkout → the `pending` payment row sits indefinitely; the confirm page treats it as "abandoned" (only shows "Pago en proceso" if they returned via `?status=back`). Buyer can retry; a new `payments` row gets created on each attempt.
- Bank declines → webhook arrives with status `declined`. Buyer sees error; can retry. No client conversion happens.

---

### Stage 5 — Conversion (Talk-First Path)

**Trigger:** Lead's plan is "No estoy seguro" OR they came in via WhatsApp.

**Steps:**

1. Santiago has a 20-min WhatsApp / phone conversation. Discusses their business, recommends a plan.
2. Either:
   - Santiago sends them the form link with plan pre-selected, or
   - Santiago shares `/c/<lead_id>` directly if they already exist in the lead DB.
3. If they're not in the lead DB yet (came from cold WhatsApp), Santiago can manually create a lead in admin (future feature — for now, ask them to fill the form).
4. From here it's the same as Stage 4.

**Owner:** Santiago.

**Failure modes:**

- They want a custom feature that's not in either plan → escalate to Mike for scoping; possibly create a custom proposal outside the standard funnel.
- They want to pay differently (cash / transfer) → Santiago accommodates manually, Mike marks the deliverables and creates the client record by hand in admin.

---

### Stage 6 — Onboarding (Magic Link → Portal)

**Trigger:** Wompi webhook arrives with `transaction.updated` and `status=approved`.

**Automatic flow (`convertLeadOnApproval` in `payments.js`):**

1. Look up lead via `payment.lead_id`.
2. Idempotency check: if lead already converted, exit.
3. Validate lead has email.
4. Check for existing client with same email (return existing if so).
5. Otherwise create a new `clients` row: `status='invited'`, `language` from lead, `plan` from payment, `business_name` from lead.
6. Generate a 32-byte random magic-link token, store in KV with 7-day TTL.
7. Send the rich payment-confirmation email (Spanish or English depending on lead.language) with:
   - "✓ Pago recibido" header
   - Personalized thank-you
   - "El reloj arranca cuando complete su portal" (so the SLA is anchored to brief submission, not payment)
   - 3-step "what happens next"
   - Big gold "Abrir mi portal →" button (the magic link)
   - Checklist of what to have ready (logo, photos, colors, story)
   - WhatsApp number + reply-to support
8. Mark lead `status='converted'`, set `converted_client_id`.
9. Send admin notification email to Mike with payment details + link to admin client view.

**Buyer side:**

1. Receives the email at the address they used in Wompi checkout.
2. Clicks "Abrir mi portal →".
3. Magic-link verify endpoint exchanges the token for a 30-day session.
4. Lands on the intake portal.

**Owner:** System (auto). Santiago monitors that the email arrived (admin gets notified too).

**SLAs:**

- Email delivery: Resend status changes to `delivered` within seconds for verified domains.
- Magic link valid for 7 days.

**Failure modes:**

- Email lands in spam → buyer can't find it. Santiago can resend via WhatsApp or `/admin → resend invite`.
- Magic link expired → buyer hits `/auth/verify?token=<expired>` → portal shows "Invalid or expired link" → they can request a new one from `/login` (only works if their email is already in the `clients` table; cold emails are blocked because self-signup is OFF).
- Wompi confirms payment but no email arrives → check Resend dashboard for delivery status; check Worker logs (`wrangler tail`) for `Paid invite email failed`.

---

### Stage 7 — Client Intake

**Trigger:** Client clicks magic link, lands on intake portal.

**Steps:**

1. Six sections in the sidebar: business, contact, brand, visual, content, tech.
2. Each field auto-saves on blur (saving / saved indicator visible).
3. Brand Assets section accepts file uploads → POST to `/api/files/upload?category=logo|photo|reference|other`. R2 stores the file; D1 stores metadata.
4. Client may switch language EN/ES at any time (intake form is bilingual).
5. When ready, client hits "Enviar y Notificarnos" (ES) / "Submit & Notify Us" (EN).
6. Submit endpoint flips client status to `submitted`, sets `submitted_at`, sends admin notification.

**This is the moment the build clock starts.**

**Owner:** Client (filling); Santiago (gentle nudges if stalled); Mike (tech support if portal misbehaves).

**SLAs:** None on the client. Internal: if the intake is blank for 7+ days, Santiago checks in.

**Failure modes:**

- Client uploads a 30MB photo → blocked (25MB max, returns 413 with friendly message).
- Client uses an unsupported file type for upload → returns 415; surfaces friendly error.
- Session expired (30+ days) → client requests new magic link from `/login`.
- Client never submits → site can't be built. Santiago follows up at days 3, 7, 14.

---

### Stage 8 — Build & Design

**Trigger:** `clients.status = 'submitted'`.

**Steps:**

1. Mike opens `/admin/clients/<id>`. Reviews all 6 intake sections + uploaded files.
2. Mike updates the deliverables tracker:
   - Marks `setup_domain`, `setup_dns`, `setup_ssl` as `in_progress` once domain registration starts.
   - Marks `design_logo`, `design_brand_colors`, `design_typography` as `in_progress` during design.
3. Mike configures:
   - Domain registration help (or domain transfer guidance if they bought elsewhere). Domain stays in client's name.
   - Cloudflare DNS, Cloudflare Email Routing for `info@cliente.com → client_personal_email`.
   - GitHub repo for the new site (clone of starter template).
4. Mike designs the site (Esencial: 5 pages; Crecimiento: 11+ pages with blog, gallery, bookings, etc).
5. Santiago is the client-voice consultant: tone, copy nuances, audience-specific decisions.
6. After initial build, Mike publishes to a preview URL (e.g., `<client>-preview.pymewebpro.com` via Pages deploy) for client review.

**Owner:** Mike (build); Santiago (client communication, copy review).

**SLAs:**

- Esencial: 7 days from intake submission to first preview.
- Crecimiento: 14 days from intake submission to first preview.
- If late → automatic refund per the public guarantee (or partial — see Exceptions).

**Failure modes:**

- Client provides incomplete material (no logo, no photos) → Santiago coordinates: either client provides them, or we use AI-assisted design (Crecimiento includes this; Esencial would be a paid add-on).
- Domain not yet registered when build needs it → use a temporary subdomain (`<client>.pymewebpro.com`) for development; cut over at launch.
- Build complexity exceeds plan scope → flag immediately to Santiago, possibly upsell to Crecimiento or scope a paid add-on.

---

### Stage 9 — Review Rounds

**Trigger:** Client reviews preview URL.

**Steps:**

1. Client provides feedback via WhatsApp or email (text + screenshots).
2. Mike consolidates feedback, makes changes, redeploys preview.
3. Esencial: "2 rondas de cambios incluidas" — flag scope creep beyond round 2.
4. Crecimiento: "Hasta 5 rondas de cambios" — hard cap at 5; beyond that becomes a paid add-on or Plan Hosting territory.
5. Mike marks `design_approved` in the deliverables tracker once client signs off.

**Owner:** Mike.

**SLAs:** Each round turnaround < 48h.

**Failure modes:**

- Client demands rebuild → flag scope creep, refer back to original brief, possibly invoke 30-day money-back guarantee if irreconcilable.
- Client unresponsive → Santiago re-engages; pause clock isn't published but in practice we hold for 7 days then re-trigger.

---

### Stage 10 — Launch

**Trigger:** Client approves the final design.

**Steps:**

1. Mike runs the launch checklist (this is what the deliverables tracker enforces):
   - Domain DNS cutover (CNAME or A record updates).
   - SSL certificate provisioned (auto via Cloudflare).
   - Email forwarding `info@<domain>` → client's personal Gmail.
   - GA4 property created and embedded.
   - Search Console verified, sitemap submitted.
   - Google Maps embed working.
   - WhatsApp button + Maps + IG + FB social bar live.
   - For Crecimiento: GBP claimed/verified, Meta Pixel installed, conversion tracking goals configured, Core Web Vitals checked, schema.org structured data validated, blog/news section initialized, booking system wired (Calendly / Acuity / custom), PDF download present, email-capture integration live, WhatsApp Business catalog linked.
2. Mike marks each deliverable as `done` in the tracker. Deliverable items not relevant to client's setup (e.g., no PDF for a service business) marked `na`.
3. Mike publishes the live site at `<client>.com`.
4. Mike updates `clients.status = 'active'` and sets `submitted_at` if not already.
5. Mike or Santiago schedules a 30-min training call with the client.

**Owner:** Mike.

**SLAs:** Launch within 24h of final approval.

**Failure modes:**

- DNS propagation delays → up to 48h tail; communicate proactively.
- TLS issuance hiccup → manual SSL provisioning via Cloudflare dashboard.
- Client realizes they want changes post-launch → handled via Plan Hosting (small monthly changes) or paid add-on.

---

### Stage 11 — Training & Handover

**Trigger:** Site is live.

**Steps:**

1. Santiago (or Mike) leads a 30-min WhatsApp video call.
2. Walks the client through:
   - How to log into anything they own (domain registrar, Google Business Profile, Search Console, GA4).
   - How to send people to their site (link in IG bio, business cards, etc.).
   - How to make basic edits if they're on Esencial without Plan Hosting (we may give them a minimal CMS-like page or document static-edit instructions).
   - How to request changes (WhatsApp the team).
3. Hand-off documentation emailed (PDF or markdown summary).
4. Mike marks `close_training`, `close_handover`, `close_support_active` as `done`.

**Owner:** Santiago primary; Mike secondary for technical questions.

**Failure modes:**

- Client books call and ghosts → reschedule once; if they ghost again, send the documentation by email/WhatsApp and consider it delivered.
- Client wants changes during training → note them; if minor, do them on the spot; if substantial, treat as scope or upsell to Plan Hosting.

---

### Stage 12 — Post-Launch Support & Hosting Plan Upsell

**Trigger:** Launch complete.

**Steps:**

1. Santiago checks in 7 days post-launch via WhatsApp: "How's it going? Any questions?"
2. If client did not buy Plan Hosting at signup, this is the natural upsell moment. Pitch: "$30k/mes (cancela cuando quiera) o $270k/año — incluye monitoreo, backups, pequeños cambios cada mes, hosting en Cloudflare, respuesta prioritaria por WhatsApp."
3. If they accept, Mike configures recurring billing manually (Wompi doesn't yet support our subscriptions natively; track in spreadsheet for now until we wire it).
4. Crecimiento clients already have 1 year hosting bundled; at month 11 Santiago reaches out to renew.

**Owner:** Santiago.

**Failure modes:**

- Client churn before renewal → understand why, fix what we can.
- Crecimiento renewal lapses → site stays up (Cloudflare doesn't shut it down); we just don't get paid for hosting that month. Enforce reminder cadence at month 11.

---

## 7. Exceptions & Edge Cases

| Scenario | What to do |
|---|---|
| Refund requested within 30 days, dissatisfaction-based | Santiago acknowledges, no friction. Mike processes Wompi refund. Mark `clients.status = 'refunded'` (extend status enum), retain client record for audit. |
| Refund requested due to late delivery | Same as above; we own the SLA breach. |
| Client requests refund AND wants to keep the site | Decline refund or refund partial — needs case-by-case judgment. Document the decision in client notes. |
| Bank-side installments fail mid-cycle | That's between the client and their bank; we already received full payment. Inform client to resolve with their bank. |
| Lead pays through Wompi but webhook never fires | Mike checks Wompi dashboard daily. Manual conversion: insert client row, generate magic link via `wrangler d1 execute` or admin UI, send invite email manually. |
| Client wants a feature outside both plans | Santiago scopes a custom add-on price. Take payment via separate Wompi link. Track in client notes. |
| Same lead submits 3 forms | First creates a real lead; subsequent 409 conflicts (existing email). Manually merge any extra info into notes. |
| Honeypot accidentally trips on real human | If we see a sudden drop in form submissions, audit honeypot field for autofill conflicts; rename if needed. |
| Resend domain unverified | All emails fail silently. Verify in Resend → Domains. Re-publish DNS records to Cloudflare. |
| Cloudflare account goes down | Marketing site, portal, email forwarding all affected simultaneously. Set up status page next iteration. |
| Wompi disputes / chargebacks | Wompi will deduct the disputed amount and notify via dashboard. Reply with evidence (chat logs, signed approval, deliverable tracker showing completion). |

## 8. Metrics

| Metric | Target | Source | Cadence |
|---|---|---|---|
| Marketing site → form-fill rate | ≥ 2% | GA4 + portal `/admin/leads` | Weekly |
| Form-fill → paid conversion | ≥ 25% | `/admin/leads` count vs `payments WHERE status=approved` | Weekly |
| WhatsApp click → conversation rate | n/a (anonymous) | `/admin/clicks` totals + Santi's WhatsApp inbox | Monthly |
| Time from payment → intake submitted (median) | ≤ 5 days | `payments.paid_at` vs `clients.submitted_at` | Per-client |
| Time from intake submitted → launch (Esencial) | ≤ 7 days | `clients.submitted_at` vs `clients.status='active'` timestamp | Per-client |
| Time from intake submitted → launch (Crecimiento) | ≤ 14 days | same | Per-client |
| Refund rate | ≤ 5% | `clients.status='refunded'` vs total clients | Monthly |
| Plan Hosting attach rate | ≥ 30% of Esencial buyers; 100% of Crecimiento (1yr included) | `clients.plan` + hosting field | Monthly |
| Resend delivery rate | ≥ 99% | Resend dashboard | Weekly |
| Wompi approval rate | ≥ 90% | Wompi dashboard | Monthly |

## 9. Tools Quick-Reference

| What | Where | How |
|---|---|---|
| See new leads | portal.pymewebpro.com/admin → Leads tab | Admin token: 1Password |
| See payment | portal.pymewebpro.com/admin → Clients tab → click row | Admin token; Wompi dashboard for raw payment data |
| Track deliverables per client | `/admin/clients/<id>` → Entregables panel | Status dropdown per item; auto-saves |
| Resend a magic link | Lead detail or Client detail → Resend invite button | Email is fired immediately |
| Manually convert a stuck lead | Lead detail → Convert to Client | Creates client + sends magic link |
| See the WhatsApp click stream | `/admin/clicks` (rendered as `WhatsApp` tab) | Anonymous; aggregated by campaign |
| Update marketing copy | GitHub repo `Mikesc74/pymewebpro` → edit → push → CF Pages auto-deploys | Mike |
| Update portal logic | `pymewebpro-final/backend/` → `npx wrangler deploy` | Mike |
| Inspect raw DB | `npx wrangler d1 execute pymewebpro-portal --remote --command="..."` | Mike |
| Inspect file storage | Cloudflare R2 dashboard → `pymewebpro-client-assets` | Mike |

## 10. Related Documents

- Marketing site copy: `/Users/mikec-home/Documents/Claude/Projects/websites nusiness/index.html`
- Portal source: `pymewebpro-final/backend/src/`
- Deliverables master list: `pymewebpro-final/backend/src/deliverables.js`
- Deploy script: `pymewebpro-final/backend/deploy.sh`
- Wompi integration notes: `pymewebpro-final/backend/src/payments.js` (top comment block)

## 11. Open Items / Phase 2 Roadmap

- Expand intake form to capture Crecimiento-specific fields (booking provider, newsletter platform, blog topics, GBP existing-or-new, EN translation source, products for WA Business catalog).
- Add manual lead-creation UI in admin (currently must come through public form).
- Wire Plan Hosting recurring billing into Wompi or alternative provider.
- Add a per-client edit-plan UI so legacy clients without `plan` set can be updated.
- Build a lightweight CMS or static-edit instructions for Esencial clients without Plan Hosting.
- Status page / health check for the whole stack.
