# PymeWebPro portal · code brief for extension work

Snapshot date: 2026-05-16. All citations are relative to `~/code/pymewebpro/portal/`.

The worker source is a single concatenated file `src/index.js` (~4799 lines) reconstructed from the deployed esbuild bundle, plus a few sibling modules imported at the top of `src/index.js` (`crm.js`, `enrich.js`, `proposal-generator.js`, `chief-of-staff.js`, `chief-of-staff-widget.js`, `chief-of-staff-knowledge.js`, `cos-loader.js`, `site-audit.js`, `santi.js`, `mockups.js`, plus the long list of `manual-mockups-*.js`).

---

## Current schema

Column definitions reconstructed from `migrations/0001`-`0006` plus the inferred-schema comments at `src/index.js:4738-4799`. Tables existed before the migrations; the inferred header is the canonical record for the original CREATE TABLE.

### `leads` (src/index.js:4771-4779 + migrations 0002, 0003, 0005)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT PK | no | (caller-provided uuid) | `crypto.randomUUID()` |
| `source` | TEXT | yes | - | One of `contact_form`, `whatsapp_click`, `whatsapp_message`, `manual`, `cold_research` (bulk import) |
| `name` | TEXT | yes | - | Contact name |
| `email` | TEXT | yes | - | Lowercased; spam-filtered |
| `phone` | TEXT | yes | - | Normalized to `+57XXXXXXXXXX` by `coerce()` in `crm.js:267` and `enrich.js:252` |
| `business_name` | TEXT | yes | - | |
| `message` | TEXT | yes | - | Free text from contact form |
| `language` | TEXT | yes | - | `en` or `es` |
| `status` | TEXT | yes | - | Legacy lifecycle: `new`/`contacted`/`converted`/`dismissed` (`src/index.js:930`) |
| `plan` | TEXT | yes | - | `esencial`/`pro`/`NULL` |
| `hosting` | TEXT | yes | - | `annual`/`monthly`/`none` |
| `notes` | TEXT | yes | - | |
| `metadata` | TEXT (JSON) | yes | - | `{ referrer, user_agent, page, utm_*, ip_hash, extra }` |
| `converted_client_id` | TEXT | yes | - | FK to `clients.id` after conversion |
| `created_at` | INTEGER (ms) | no | - | |
| `updated_at` | INTEGER (ms) | no | - | |
| **`lead_stage`** | TEXT | yes | `'raw'` (then renamed to `'new'` by 0003) | `new`/`contacted`/`marketing_qualified`/`sales_qualified`/`disqualified` |
| `last_touched_at` | INTEGER (ms) | yes | - | |
| `last_touched_kind` | TEXT | yes | - | `call`/`whatsapp`/`email`/etc. |
| `touches_count` | INTEGER | yes | 0 | |
| `next_action` | TEXT | yes | - | Short string |
| `next_action_due` | INTEGER (ms) | yes | - | |
| **`heat`** | TEXT | yes | - | `HOT`/`WARM`/`COLD`/`DEAD` (enrichment) |
| `score` | REAL | yes | - | 0-100 outreach score |
| `category` | TEXT | yes | - | Hotel/Café/Restaurante/etc. |
| `city` | TEXT | yes | - | |
| `instagram` | TEXT | yes | - | Handle or URL |
| `whatsapp` | TEXT | yes | - | Normalized `+57XXXXXXXXXX` |
| `current_site` | TEXT | yes | - | URL of existing site |
| `cms` | TEXT | yes | - | e.g. `site_unreachable`, `wordpress`, etc. |
| `motion` | TEXT | yes | - | `new_build`/`upgrade` |
| `address` | TEXT | yes | - | |
| `suggested_pitch` | TEXT | yes | - | Pre-written WA opener |
| `followers` | INTEGER | yes | - | |
| `on_today_list` | INTEGER | yes | 0 | 0/1 flag for the "today's outreach" view |
| **`facebook_url`** | TEXT | yes | - | (migration 0005) |
| `x_url` | TEXT | yes | - | |
| `tiktok_url` | TEXT | yes | - | |

Indexes: `lead_stage`, `last_touched_at DESC`, `next_action_due`, `heat`, `city`, `motion`, `on_today_list`.

### `clients` (src/index.js:4742-4751)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT PK | no | uuid | |
| `email` | TEXT UNIQUE | no | - | Used to dedupe on convert/upsert |
| `business_name` | TEXT | yes | - | |
| `status` | TEXT | yes | - | `invited`/`in_progress`/`submitted`/`active` |
| `language` | TEXT | yes | - | `en`/`es` |
| `plan` | TEXT | yes | - | `esencial`/`pro` |
| `site_url` | TEXT | yes | - | Live URL once published |
| `site_health` | TEXT (JSON) | yes | - | Last `performSiteCheck()` result |
| `deliverables_state` | TEXT (JSON) | yes | - | `{ [key]: pending|in_progress|done|na }` |
| `submitted_at` | INTEGER (ms) | yes | - | When intake POSTed |
| `created_at`, `updated_at` | INTEGER (ms) | no | - | |
| `invited_by` | TEXT | yes | - | |
| `hosting_expires_at` | INTEGER (sec) | yes | - | Used by `processHostingPayment` (src/index.js:1393) |
| `hosting_period` | TEXT | yes | - | `monthly`/`annual` |
| `custom_domain`, `live_slug`, `live_published`, `live_disabled` | derived | - | - | Attached at runtime from `live_sites` (src/index.js:765-773) |

### `deals` (migration 0001 + 0005)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT PK | no | - | uuid |
| `title` | TEXT | no | - | Required on insert (`crm.js:55`) |
| `lead_id` | TEXT | yes | - | FK leads.id |
| `client_id` | TEXT | yes | - | FK clients.id |
| `stage` | TEXT | no | `qualifying` | `qualifying`/`proposal`/`negotiation`/`won`/`lost` |
| `plan` | TEXT | yes | - | `esencial`/`pro`/`custom` |
| `value_cad_cents` | INTEGER | yes | - | Legacy CAD price. PymeWebPro is COP-only now. |
| `value_cop_cents` | INTEGER | yes | - | |
| `probability` | INTEGER | no | 25 | 0-100 |
| `expected_close` | INTEGER (ms) | yes | - | |
| `owner` | TEXT | no | `mike` | `mike`/`santi` |
| `source` | TEXT | yes | - | |
| `next_action` | TEXT | yes | - | |
| `next_action_due` | INTEGER (ms) | yes | - | |
| `notes` | TEXT | yes | - | |
| `created_at`, `updated_at` | INTEGER (ms) | no | unixepoch()*1000 | |
| `closed_at` | INTEGER (ms) | yes | - | Set when stage=won|lost |
| **`proposal_mockup_html`** | TEXT | yes | - | (0005) The model-generated single-file site, served at `/proposal-mockup/:dealId` |
| `proposal_html` | TEXT | yes | - | The printable proposal page with iframe + pricing, served at `/admin/proposal/:dealId` |
| `proposal_generated_at` | INTEGER (ms) | yes | - | |
| `proposal_status` | TEXT | yes | - | `pending`/`generating`/`ready`/`error` |

Indexes: `stage`, `owner`, `lead_id`, `client_id`, `expected_close`.

### `activities` (migration 0001)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT PK | no | - | |
| `kind` | TEXT | no | - | `call`/`whatsapp`/`email`/`meeting`/`note`/`task`/`enrichment` (enrich.js writes this) |
| `subject` | TEXT | no | - | |
| `body` | TEXT | yes | - | |
| `lead_id`, `client_id`, `deal_id` | TEXT | yes | - | |
| `owner` | TEXT | no | `mike` | `mike`/`santi`/`system` (enrich) |
| `outcome` | TEXT | yes | - | `positive`/`neutral`/`negative`/`no_response` |
| `occurred_at` | INTEGER (ms) | no | now | |
| `due_at` | INTEGER (ms) | yes | - | For `kind='task'` |
| `done` | INTEGER | no | 0 | 0/1 |
| `created_at`, `updated_at` | INTEGER (ms) | no | now | |

Indexes: `lead_id`, `client_id`, `deal_id`, `occurred_at DESC`, `due_at`, `kind`.

---

## Current `enrich.js`

File: `src/enrich.js` (274 lines, all of it).

**Sources.** Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`, `enrich.js:10`) with the built-in `web_search_20250305` tool (`enrich.js:186`, `max_uses: 3`). No Google Places, no direct fetches, no scraping. The model is given the business name + city + category and told to look at the business's own site, Instagram bio, Google Maps listing, and Facebook page.

**Fields written back to `leads`** (`enrich.js:208-218`). Patch is "only fill fields the lead doesn't already have":

- `phone` (normalized to `+57XXXXXXXXXX` via `normalizePhone`)
- `whatsapp` (falls back to the discovered phone if no explicit WA returned)
- `email` (lowercased; must contain `@`; gmail/hotmail/etc. discouraged in prompt but not blocked)
- `instagram` (cleaned to `@handle`)
- `facebook_url`
- `current_site`
- `updated_at`

Also logs an `activities` row with `kind='enrichment'`, `owner='system'`, subject `"Auto-enriched: <field list>"`, body = JSON-stringified patch (`enrich.js:236-246`).

**Bindings/secrets required.**
- `env.ANTHROPIC_API_KEY` (worker secret) · `enrich.js:17`
- `env.TOKENS` (KV namespace) · for `enrich:count:<YYYY-MM-DD>` daily counter (`enrich.js:41,119,137`). 500/day hard cap.
- `env.DB` (D1) · reads/writes `leads`, writes `activities`.

**API surface** (mounted at `/api/admin/enrich/*`, `enrich.js:22-34`):

- `GET  /api/admin/enrich/status` · daily usage + leads-needing-enrichment count, grouped by heat.
- `POST /api/admin/enrich/preview` · dry-run a single lead by `{id}`, returns `would_fill` without writing.
- `POST /api/admin/enrich/run` · enrich an explicit `{ids: [...]}` array, max 25.
- `POST /api/admin/enrich/priority` · auto-pick top N leads (HOT > DEAD > WARM > COOL > COLD, then `on_today_list`, then `score`) where `lead_stage NOT IN ('sales_qualified','disqualified')` AND missing phone/WA/email/instagram (`enrich.js:97-108`).

**Failure modes / what's NOT enriched.**

- No Google Places lookup, so no canonical address, no rating, no opening hours, no `place_id`.
- No `x_url` or `tiktok_url` writes (the model isn't prompted for them).
- No `category` inference, no `cms` detection, no `current_site` reachability check (the import already wrote `cms='site_unreachable'` for ~5k rows; enrich doesn't update it).
- No score/heat recalculation after enrichment.
- No follower-count or social-traffic estimate.
- Free-email providers (`gmail.com`/`hotmail.com`/etc.) are discouraged in the prompt but accepted if nothing else exists.
- Anthropic web_search has only 3 max uses per call · for nuanced businesses with multiple locations the model may pick the wrong city.
- Hard 500/day cap, no queue, no retry; failed lookups don't bump a "tried-and-failed" counter so the same lead will be re-tried on the next priority run.

---

## Worker bindings + secrets

From `wrangler.toml`:

**D1.** `DB` → `pymewebpro-portal` (id `93fc7e21-713c-4479-bb55-69ae05c275dc`).

**KV.** `TOKENS` → id `47573834bfad418aa10b8f851a250a03`. Used for magic-link tokens, rate limits, enrichment daily counter.

**R2.** `ASSETS` → bucket `pymewebpro-client-assets`. Used for `files` table uploads.

**Vars (plain text, visible).**
- `APP_URL = "https://colguides.com/portal/pymewebpro"`
- `FROM_EMAIL = "PymeWebPro <noreply@pymewebpro.com>"`
- `ADMIN_EMAIL = "hello@pymewebpro.com"`
- `WHATSAPP_NUMBER = "+573014047722"` (Santi's personal number, used for `/go/whatsapp` redirect, NOT for sending)
- `CATALINA_AGENT_URL = "https://catalina.medellin.guide/api/agent"`
- `COS_EMAIL_FROM`, `COS_EMAIL_REPLY_TO`
- `TASKS_PORTAL_URL = "https://tasks.colguides.com"`
- `TASKS_ACCESS_CLIENT_ID = "ebf6ce7ef81ee9f7cb28774011630ce4.access"`

**Secrets (set via `wrangler secret put`).**
- `ADMIN_TOKEN` · Bearer token for all `/api/admin/*` routes (`utils.js`/`isAdmin` at `src/index.js:129`)
- `RESEND_API_KEY` · transactional email
- `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY`, `WOMPI_EVENTS` · Colombian payment gateway
- `ANTHROPIC_API_KEY` · used by `enrich.js`, `proposal-generator.js`, `chief-of-staff.js`
- `COS_SHARED_SECRET` · cross-worker auth to Catalina's `/api/agent` (for traffic analytics + CoS tools)
- `TASKS_ACCESS_CLIENT_SECRET` · Cloudflare Access service-token secret for `tasks.colguides.com`

**Routes.**
- `*.sites.pymewebpro.com/*` (tenant subdomain namespace, custom domain)
- `mockups.pymewebpro.com/*`
- `santi.pymewebpro.com` (custom_domain, auto-DNS)
- `inviersol.com/*`, `www.inviersol.com/*`
- `colguides.com/portal/pymewebpro/*` (master-portal mount, Access-gated, path-rewritten via `rewriteForPwpSubpath` at `src/index.js:4642`)
- `www.colguides.com/portal/pymewebpro/*`
- (`portal.pymewebpro.com` was retired 2026-05-13.)

---

## Existing API endpoints related to leads

Mounted in `src/index.js` fetch handler at lines 4448-4474.

Public:

- `POST /api/leads` · `captureLead()` at `src/index.js:1005`. Public contact-form ingress: rate-limited, honeypot, `looksLikeSpam()` filter, writes a `new` lead, emails admin via Resend.
- `GET  /go/whatsapp` · `handleWhatsAppRedirect()` at `:956`. Logs a `lead_clicks` row, 302s to `wa.me/<WHATSAPP_NUMBER>`.
- `GET  /c/:leadId` · `handleConfirmPage()` at `:1237`. Customer-facing checkout page rendered server-side with Wompi pricing.
- `POST /api/leads/:leadId/checkout` · `handleCreateCheckout()` at `:1256`. Requires `authorization_accepted: true`; writes a `payments` row, returns a Wompi checkout URL.
- `POST /api/payments/wompi-webhook` · `handleWompiWebhook()` at `:1306`. On approved status calls `convertLeadOnApproval()` which upserts a client + sends invite email + marks lead `converted`.

Admin (`Bearer ADMIN_TOKEN` required):

- `GET    /api/admin/leads` · `listLeads()` at `:1071`. Filterable by `?status=`, `?source=`, `?limit=`. Returns rows + per-status counts.
- `GET    /api/admin/leads/:id` · `getLead()` at `:1090`. Parses `metadata` JSON.
- `PATCH  /api/admin/leads/:id` · `updateLead()` at `:1096`. Only `status` and `notes` editable through THIS endpoint (CRM endpoint below is wider).
- `DELETE /api/admin/leads/:id` · `deleteLead()` at `:1112`.
- `POST   /api/admin/leads/:id/convert` · `convertLead()` at `:1117`. Creates/links a `clients` row, mints a 7-day magic-link, emails the invite, flips lead to `converted`.
- `GET    /api/admin/clicks` · `listClicks()` at `:1146`. Returns WhatsApp click log.
- `GET    /api/admin/crm/grid` · `loadGrid()` in `crm.js:90`. Returns all 4 tables in one shot (8000 leads, 500 of each other table).
- `GET    /api/admin/crm/leads` (and other tables) · `listRows()` in `crm.js:136`. `?search=` does LIKE on `name/email/business_name/notes/message`.
- `POST   /api/admin/crm/leads` · `createRow()` in `crm.js:165`. Whitelisted columns at `crm.js:23-35`.
- `PATCH  /api/admin/crm/leads/:id` · `updateRow()` in `crm.js:202`. Whitelist + `coerce()` (auto-normalizes phones, parses dates).
- `DELETE /api/admin/crm/leads/:id` · `deleteRow()` in `crm.js:234`.
- `GET    /api/admin/enrich/status` · `enrich.js:39`.
- `POST   /api/admin/enrich/preview|run|priority` · `enrich.js:67-113`.
- `POST   /api/admin/proposals/:dealId/generate` · `proposal-generator.js:32`. Generates the mockup + printable proposal for a deal (NOT a lead, but the deal pulls its linked lead's social URLs into the brief at `proposal-generator.js:108`).

---

## Hooks for extension

### 1. Outbound prospecting loader

**Recommendation:** new file `src/prospecting.js`, mounted before the `/api/admin/*` catch-all in `src/index.js` fetch handler around line 4472 (right after the `enrich` mount):

```js
import { handleProspecting } from "./prospecting.js";
// ...
if (path.startsWith("/api/admin/prospecting")) {
  return cors(await handleProspecting(request, env, ctx, { json, isAdmin, uuid }));
}
```

Routes to expose (mirrors `enrich.js`'s shape):

- `POST /api/admin/prospecting/load` · body `{ source: 'csv'|'google_places', payload: ... }`, writes rows via `INSERT OR IGNORE INTO leads (...) VALUES (...)` (same shape as `migrations/0004_import_colombia_prospects.sql` lines 8-15). Use `lead_stage='new'`, `source='cold_research'` or a new value (and update `VALID_SOURCES` at `src/index.js:931`).
- `GET  /api/admin/prospecting/sources` · summary of current sources/categories/cities.
- `POST /api/admin/prospecting/dedupe-preview` · cheap dry-run that LIKE-matches `business_name + city` against existing leads.

This keeps the bulk-import logic out of `crm.js` (which is per-row) and out of `enrich.js` (which is per-existing-row). Bindings needed: only `env.DB` and `env.ADMIN_TOKEN`. No new secrets.

### 2. v2 enricher (Google Places + site detection + social + scoring)

**Recommendation:** extend `enrich.js` rather than create a sibling, because the daily KV counter, the priority-picker SQL, and the activity-log convention should all stay shared. Add a new mode flag:

- Add `env.GOOGLE_PLACES_API_KEY` as a new wrangler secret (a Places key already exists in the Catalina worker · same Cloudflare account, just `wrangler secret put` it here too).
- Inside `enrichLead()` at `enrich.js:150`, before the Anthropic call, branch on a new `mode` param (`'web_search'` (current) | `'places'` | `'full'`).
- `'places'` path: call `https://places.googleapis.com/v1/places:searchText` with the business name + city + ` Colombia`. Pull `formattedAddress`, `internationalPhoneNumber`, `websiteUri`, `userRatingCount`, `rating`, `regularOpeningHours`, `id` (`place_id`). Patch keys to add: `address`, `phone` (normalize), `current_site`, plus possibly new schema columns `place_id`, `rating`, `review_count`.
- `'site-detection'` step: fetch `current_site` with a 12s `AbortController` (same pattern as `performSiteCheck()` at `src/index.js:657`) and inspect headers + a small HTML window for `wp-content`/`shopify`/`webflow`/`wix`/etc. to fill `cms`. If unreachable, set `cms='site_unreachable'`.
- `'social'` step: keep using Anthropic web_search but expand the prompt to also fill `x_url`, `tiktok_url`, and `followers` (already in the schema, never written today).
- `'scoring'` step: a small JS helper that returns `{heat, score}` from `{cms, current_site, followers, category, motion}`. Run it at the end of every enrichment, write to `heat` and `score`. Today's HOT/WARM/COLD/DEAD values are present in the imported data (migration 0004) but never recomputed.
- New activity rows: keep `kind='enrichment'` and put the mode in `subject` (e.g. `"Auto-enriched (places): phone, address, current_site"`).

Migration needed: `migrations/0007_enrich_v2.sql` adding `place_id TEXT`, `rating REAL`, `review_count INTEGER`. (Schema is ALTER-friendly; existing migrations all use idempotent ALTER COLUMN.)

### 3. "Draft first-touch WA message" generator

**Recommendation:** new route in a new file `src/outreach.js`, mounted right after the enrich mount at `src/index.js:4472`:

```js
if (path.startsWith("/api/admin/outreach")) {
  return cors(await handleOutreach(request, env, ctx, { json, isAdmin }));
}
```

Endpoints:

- `POST /api/admin/outreach/draft` · body `{ lead_id }`. Pulls the lead's `business_name`, `category`, `city`, `current_site`, `cms`, `motion`, `suggested_pitch`, `language`. Calls Claude with a short system prompt ("Eres Santi escribiendo el primer WhatsApp a un prospecto colombiano. ES neutro, sin em dashes, sin marketing-speak, 3-4 frases, termina con una pregunta abierta."). Returns `{ text, debug: { prompt, model, tokens } }`. Does NOT send. Mike or Santi paste it into WhatsApp themselves.
- `POST /api/admin/outreach/send` · OPTIONAL second step that uses the existing Catalina dispatcher (`env.CATALINA_AGENT_URL` + `env.COS_SHARED_SECRET`, see `handleTrafficProxy` at `src/index.js:4586`) to call `send_whatsapp` · this reuses the existing CoS pattern with shared-secret auth and avoids duplicating WA Cloud API plumbing.

Use the exact Anthropic-call pattern from `enrich.js:176-189` (single-shot, no streaming, no tools for v1). Model: `claude-haiku-4-5-20251001` is fine and cheap for one-shot drafts; switch to `claude-sonnet-4-5` if the drafts feel thin.

Also write an `activities` row with `kind='whatsapp'`, `owner='santi'` (or whoever), `outcome=null`, `body=<the draft>` so the funnel shows the touch even before send.

### 4. Wompi deposit link generator

**Recommendation:** extend `payments.js`-equivalent code (currently inlined into `src/index.js:1189-1483`). The studio uses a 30/70 deposit split; today the public `handleCreateCheckout` (`:1256`) only handles the full-price flow.

Pattern to follow: the existing `checkoutUpgrade()` (`:421`) and `checkoutHosting()` (`:442`) already do exactly this · they each compute an `amount_cents`, sign with SHA-256, INSERT into `payments` with a custom `reference` prefix, and return a Wompi URL.

Add to `handleAdminLeads` or to a new admin endpoint `POST /api/admin/deals/:dealId/deposit-link`:

```js
const planPriceCop = deal.plan === "pro" ? 690000 : 390000;
const depositCents = Math.round(planPriceCop * 0.30) * 100;  // 30%
const reference = `pwp-dep-${dealId}-${Date.now().toString(36)}`;
const sig = await sha256(`${reference}${depositCents}COP${env.WOMPI_INTEGRITY}`);
await env.DB.prepare(
  `INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, 'COP', ?, 'none', 'pending', ?, ?)`
).bind(uuid(), deal.lead_id || '', reference, depositCents, deal.plan || 'esencial', Date.now(), Date.now()).run();
const url = `https://checkout.wompi.co/p/?${new URLSearchParams({
  "public-key": env.WOMPI_PUBLIC_KEY,
  "currency": "COP",
  "amount-in-cents": String(depositCents),
  "reference": reference,
  "signature:integrity": sig,
  "redirect-url": `${env.APP_URL}/c/${deal.lead_id}?status=back`,
}).toString()}`;
```

Then the existing `handleWompiWebhook()` (`:1306`) already routes by reference prefix · add a `pwp-dep-` branch alongside `pwp-upg-` and `pwp-host-` to call a new `processDepositPayment(env, payment)` that marks the deal `stage='negotiation'` (or whatever), writes an `activities` row with `kind='note'` + `subject='30% deposit received'`, and optionally bumps the linked lead to `lead_stage='sales_qualified'`.

For the balance (70% at launch) use the same pattern with reference prefix `pwp-bal-`. Migration needed: optional `payments.deal_id TEXT` column if you want clean joins (today `payments.lead_id` is the only FK and is set to `''` for upgrade/hosting payments).

No new secrets · `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY`, `WOMPI_EVENTS` are already set.

---

## Anthropic call pattern

Three modules already call the API; they all use the same shape (single-shot, non-streaming, parse text blocks). The canonical minimal version is in `enrich.js:176-204`:

```js
const resp = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",   // or "claude-sonnet-4-5" for higher-quality
    max_tokens: 1024,
    // Optional: system: "...",
    // Optional: tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    messages: [{ role: "user", content: prompt }],
  }),
});
if (!resp.ok) throw new Error("Anthropic " + resp.status + ": " + (await resp.text()).slice(0, 300));
const data = await resp.json();
const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
```

Variants in the codebase:
- `proposal-generator.js:165` uses `claude-sonnet-4-5`, `max_tokens: 8192`, dedicated `system` parameter, no tools, strips ` ```html ` fences.
- `chief-of-staff.js:18` uses `claude-sonnet-4-5` with a long tools array and a `MAX_TOOL_ITERATIONS = 8` loop · this is the pattern to copy if any new feature needs tool-use (e.g. a multi-step lead-research agent).

System prompt convention: put role + house-style rules (`no em dashes ever`, `Colombia-only, COP-only`, `no marketing-speak`) up top, knowledge dump at the bottom; see `chief-of-staff.js:23-187` for the canonical example.

---

Brief written to `/Users/mikec-home/code/pymewebpro/_audits/portal-code-brief-2026-05-16.md`.
