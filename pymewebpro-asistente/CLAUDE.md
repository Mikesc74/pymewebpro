# pymewebpro-asistente · El Asistente

AI chatbot add-on for PymeWebPro Plan de ventas clients.
Read ~/code/CLAUDE.md first (global rules, COP-only, no em dashes, etc.).

## What this is

A Cloudflare Worker that provides three things:

1. **Embeddable widget** (`GET /widget.js?c=CLIENT_ID`) — one script tag clients paste into their site.
2. **Chat API** (`POST /api/chat`) — takes a message, calls Claude Haiku with client knowledge base, stores conversation in D1, returns reply + optional routing action.
3. **Client portal** (`/portal/*`) — token-authenticated dashboard where clients see conversations, edit their knowledge base, and configure WA number / booking link.

## This is NOT a standalone product

El Asistente is part of Plan de ventas ($150.000 COP/mes). Not sold separately.
Do not position it as a standalone chatbot SaaS.

## Stack

- **Runtime:** Cloudflare Worker (`pymewebpro-asistente`)
- **Database:** D1 `asistente-db` (uuid: `2c74be5e-ccdc-4e6d-910c-d19168ec682f`)
- **AI:** Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic API
- **Domain:** `asistente.pymewebpro.com`
- **Secrets:** `ANTHROPIC_API_KEY` (wrangler secret put)

## Project structure

```
src/
  index.js      Main router (+ /wa/webhook, /api/poll)
  chat.js       Web chat wrapper (POST /api/chat) + poll (GET /api/poll)
  turn.js       Shared channel-aware assistant turn (used by web + WhatsApp)
  wa-send.js    WhatsApp Cloud API outbound + best-effort owner notify
  whatsapp.js   Multi-tenant inbound webhook, routes by phone_number_id
  widget.js     GET /widget.js generator (now polls for owner takeover replies)
  portal.js     /portal/* unified inbox + reply/takeover + knowledge + settings + Shopify connect
  shopify.js    Per-client Shopify order lookup + the lookup_order tool definition
  alerts.js     Owner alerts (customer wrote, nobody replied) via Resend + Twilio
migrations/
  001_init.sql       clients, conversations, messages, leads tables
  002_sessions.sql   portal session store
  003_unified_inbox.sql  channels, contact, takeover state, per-client WA config, integrations
wrangler.toml
package.json
CLAUDE.md
el_asistente_interno.pdf  (internal explainer for Mike + Santi)
```

## Routing logic

The chat AI uses three signal phrases at the end of a response:
- `[IR_A_WHATSAPP]` -> return wa.me link to client's WA number
- `[IR_A_CITA]` -> show the inline scheduling mini-form
- `[ESPERAR_HUMANO]` -> "Permiteme un momento, lo confirmo y te respondo." Sets the conversation `needs_human = 1`, surfaces it at the top of the owner's inbox, and best-effort pings the owner's `notify_wa`. This is the "please hold while I check" handoff.

These are stripped before displaying the text to the visitor.

## Channels + human takeover

The same conversation engine (`turn.js`) serves the web widget and WhatsApp. `conversations.channel` is `web` or `whatsapp`. WhatsApp runs over **Twilio** (BSP for the WhatsApp Business API). Twilio POSTs inbound messages (form-encoded) to one shared webhook (`/wa/webhook`); we route to the right client by the business sender number (Twilio's `To`) matched against `clients.wa_sender`. Outbound goes through Twilio's REST Messages API using `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`. The owner watches every conversation in the portal inbox and can take over: typing a reply (or pressing "Tomar el control") sets `bot_paused = 1`, the bot goes quiet, and the owner's messages are delivered to the visitor (WhatsApp via Twilio, web via the widget's `/api/poll` loop). "Devolver al asistente" hands control back.

## Deploy checklist

```bash
# 1. Create D1 database
wrangler d1 create asistente-db
# Copy the uuid into wrangler.toml

# 2. Run migrations
wrangler d1 execute asistente-db --remote --file=migrations/001_init.sql
wrangler d1 execute asistente-db --remote --file=migrations/002_sessions.sql

# 3. Set secret
wrangler secret put ANTHROPIC_API_KEY

# 4. Add DNS CNAME: asistente.pymewebpro.com -> pymewebpro-asistente.workers.dev (proxied)

# 5. Deploy
wrangler deploy
```

## Adding a new client

```sql
INSERT INTO clients (id, name, domain, wa_number, booking_url, knowledge, portal_token)
VALUES (
  'slug-del-cliente',
  'Nombre del Negocio',
  'sitio.com',
  '+573001234567',
  'https://cal.com/su-enlace',
  '',  -- they fill this in via the portal
  'TOKEN_ALEATORIO_SEGURO'
);
```

Send the client: their portal URL (`asistente.pymewebpro.com/portal`) + their token.

## Recent changes

- **2026-06-02 (later 15)** · **Phases 7 + 8.** Phase 7 QA: `npm test` 8/8 pass; the full esbuild bundle (real wrangler artifact) loads and serves every route (/privacidad, /privacy, /portal/login, /portal/admin, /widget.js, dashboard); migration chain 001..010 applies clean. Live sandbox checklist lives in `MANUAL.md` Part 3 (Mike to run). Phase 8: new `MANUAL.md` (operator runbook + client guide + test checklist) and the in-portal `/portal/manual` page got a "More features" section (search/filter/close, colour, booking, Shopify, privacy) in ES + EN. Files: MANUAL.md, portal.js.

- **2026-06-02 (later 14)** · **Phase 6 (automated tests).** Added `tests/asistente.test.mjs` (node:test, run with `npm test`), `"type":"module"` + `test` script in package.json. 8 tests covering: token encrypt/decrypt (+ legacy/wrong-key/no-key), Shopify order lookup verification (match/mismatch/not-found), rate limit + monthly cap boundaries, signal stripping, turn-engine media/cap escalation (asserts the model is NOT called), privacy notices (ES/EN), bilingual portal render, admin login gate. All pass. Not gated into `wrangler deploy` (run manually / in Phase 7).

- **2026-06-02 (later 13)** · **Phase 5 (security + compliance).** No migration. (a) Shopify tokens encrypted at rest: new `src/cryptoutil.js` (AES-256-GCM keyed off `TOKEN_ENC_KEY`); portal encrypts on save (prefix `enc:`), `turn.js` decrypts before use. Legacy plaintext still reads (safe rollout); if `TOKEN_ENC_KEY` is unset it falls back to plaintext with a warning. (b) Admin login brute-force limit: 5 attempts/IP/min via `checkIpRate` in `admin.js`. (c) Habeas Data (Ley 1581): public privacy notice at `/privacidad` (ES) + `/privacy` (EN) (`src/privacy.js`), linked from the widget footer; per-conversation hard-delete ("Eliminar datos" button -> `POST /portal/api/conversations/:id/delete` removes messages+leads+conversation); optional retention purge in the monthly cron (`DATA_RETENTION_MONTHS` var, default 0 = keep forever). New vars `DATA_RETENTION_MONTHS`, `PRIVACY_CONTACT`; new OPTIONAL secret `TOKEN_ENC_KEY` (recommended before storing a real Shopify token). Files: cryptoutil.js, privacy.js, portal.js, turn.js, admin.js, reports.js, index.js, widget.js, wrangler.toml. Deploy: `wrangler secret put TOKEN_ENC_KEY` (recommended), `wrangler deploy`. Verified encrypt/decrypt round-trip + legacy passthrough, privacy page, delete + purge.

- **2026-06-02 (later 12)** · **Phase 4.** (a) Per-client widget colour: migration `010_phase4.sql` adds `clients.widget_color`; `widget.js` fetches it (validated hex, default `#1f1a14`) and interpolates it as the launcher/header/user-bubble/send primary; the gold accent on route buttons is kept for contrast. Settings has a colour picker. (b) Admin impersonation banner: `handlePortal` sets `client.__asAdmin` when a `pwp_admin` cookie is present, and `page()` shows a "Viewing as <client> · Back to admin" bar (bilingual) so it's obvious you're viewing a client portal from the admin console. Files: widget.js, portal.js. Deploy: run migration 010, `wrangler deploy`. Verified colour injection (widget JS still parses) + banner in ES/EN.

- **2026-06-02 (later 11)** · **Phase 3.** (a) Monthly client activity report: new `src/reports.js` (`runMonthlyReports`) + a worker cron `0 13 1 * *` (1st of month, 08:00 Colombia) wired via `scheduled()` in `index.js`. For each active client with a `notify_email`, it emails last month's conversations (web/WhatsApp split), leads, and needs-attention count via Resend (Spanish). Skips clients with no activity. (b) Real call booking: per-client `booking_url` (Cal.com/Calendly etc.) re-surfaced in Settings; when the bot offers a cita, the web widget shows a "Reservar una cita" button to that link (falls back to the inline lead form if empty), and WhatsApp appends "Agenda aqui: <url>". `booking_url` already existed on the clients table from 001, so **Phase 3 needs NO migration** (009_phase3.sql is an intentional no-op). NOTE: this uses the client's own scheduling tool; full per-client Google Calendar sync (like Valentina) is a future option. Files: reports.js, index.js, turn.js, widget.js, portal.js, wrangler.toml (cron). Deploy: `wrangler deploy` (registers the cron; RESEND_API_KEY already set). Verified report generation + cita routing.

- **2026-06-02 (later 10)** · **Phase 2 (inbox at scale).** Migration `008_phase2.sql` adds `conversations.closed_at` + a status index. Conversation lifecycle: Close / Reopen button in the conversation header (`POST /portal/api/conversations/:id/close` + `/reopen`); closed convs drop out of the default inbox, and a closed WhatsApp thread starts fresh on the next inbound (getOrCreateWaConversation already excludes status='closed'). Inbox search + filters: the Conversaciones page now takes `?q=&status=&channel=` (status: open default / attention / unread / closed; channel: all / web / whatsapp; q searches contact name, phone, and message text). Filter chips + search box, bilingual. Removed the old 20s auto-reload (it clobbered searches). Files: portal.js. Deploy: run migration 008, `wrangler deploy`. Verified filters/search/close in ES + EN.

- **2026-06-02 (later 9)** · **Phase 1 production-correctness block.** Migration `007_phase1.sql`. New files `src/rate.js`, `src/media.js`.
  (1) WhatsApp 24h window: `conversations.last_inbound_at` is stamped on every customer inbound; the portal human-reply checks it and marks each message `delivery` = sent / blocked_24h / failed (new `messages.delivery` column). The conversation view shows "Not delivered · over 24h" so the owner knows a reply didn't go out. NOTE: actually sending outside the window still needs an approved Twilio Content template (not built); right now it's detect + surface only.
  (2) Inbound media: WhatsApp image/voice/file are no longer dropped (`messages.media_url` + `media_type`). Voice notes are transcribed via OpenAI Whisper when `OPENAI_API_KEY` is set (`media.js`), then run as normal text; otherwise (and for images/files) the bot sends a short acknowledgement, flags `needs_human`, and alerts the owner. The portal renders images via an authenticated `/portal/api/media` proxy (Twilio Basic auth, restricted to Twilio hosts + the client's own media).
  (3) Rate limiting + cost cap: per-IP per-minute limit on `/api/chat` (20/min, `rate_hits` table, hashed IP, fail-open); per-client monthly bot-reply cap (`clients.monthly_msg_cap`, default from `DEFAULT_MONTHLY_CAP` var = 3000, `usage_counters` table). Over cap, the bot stops calling Claude and escalates to a human with a canned "high demand" reply.
  `turn.js` gained the escalate-without-Claude path (media + cap), media columns, last_inbound_at, and usage bump. Files: turn.js, whatsapp.js, chat.js, portal.js, rate.js, media.js, wrangler.toml. New var `DEFAULT_MONTHLY_CAP`; new OPTIONAL secret `OPENAI_API_KEY`. Deploy: run migration 007, optionally `wrangler secret put OPENAI_API_KEY`, `wrangler deploy`. JS syntax-checked, migration chain + escalation/cap/rate paths verified.

- **2026-06-02 (later 8)** · **Admin console** for PymeWebPro (Mike + Santi) over all Angela clients, at `/portal/admin`. New `src/admin.js`, gated by a new `ADMIN_TOKEN` secret (separate from per-client `portal_token`; admin session stored in the `sessions` table under the sentinel `client_id = '__admin__'`, cookie `pwp_admin`). Dashboard lists every client with channels (Web always; WhatsApp if `wa_sender` set), conversation count, unread/"sin responder" count, alerts on/off, Shopify connected, active state. Actions: "Abrir portal" (impersonate, sets a `pwp_session` for that client and jumps to their dashboard; the admin cookie stays so `/portal/admin` is one hop back), "Editar", and "+ Nuevo cliente". Create/edit form covers id, name, domain, bot_name, wa_number, wa_sender, notify_email, notify_wa, active, and shows the client's login token with a "regenerate token" option, replacing the manual `INSERT INTO clients` SQL. `portal.js` routes `/portal/admin*` before client auth and injects `CSS` + `escHtml` into `handleAdmin(request, env, {CSS, escHtml})`. NOTE: admin.js must NOT import back from portal.js (a portal<->admin circular `const` import bundles fine in Node's native ESM but throws "cannot access before initialization" under wrangler/esbuild bundling, causing a worker-wide 1101; verified by running the esbuild bundle). No schema change. New secret: `ADMIN_TOKEN`. Deploy: `wrangler secret put ADMIN_TOKEN` then `wrangler deploy`. Note: this is a shared-secret gate on a public worker (no Cloudflare Access in front); fine for now, revisit if needed. **Admin auth is stateless** (HMAC-SHA256 of the cookie expiry signed with `ADMIN_TOKEN`, cookie `pwp_admin`), NOT a `sessions` row: D1 *does* enforce the `sessions.client_id -> clients(id)` foreign key, so a `client_id='__admin__'` session insert fails with `D1_ERROR: FOREIGN KEY constraint failed` (caused a 1101 on `/portal/admin/login`). Client sessions + "open portal" still use the `sessions` table because they reference real client ids. Admin console is English-only (internal); "Open portal" opens the client portal in a new tab. The New Client page shows a copy-pasteable onboarding prompt (`ONBOARD_PROMPT` in admin.js) covering the full wiring: confirm client row, Twilio WhatsApp (sandbox for testing AND the real production sender click-path via Messaging > Senders > WhatsApp senders + Meta approval), set wa_sender, client token + portal URL, widget snippet, knowledge, alerts, optional Shopify, end-to-end test.

- **2026-06-02 (later 7)** · WhatsApp webhook hardening: `/wa/webhook` now validates the `X-Twilio-Signature` header (base64 HMAC-SHA1 of the full URL + sorted param key/value pairs, keyed by `TWILIO_AUTH_TOKEN`) before processing; forged requests get 403. The old Account-SID check stays as defense in depth. New var `TWILIO_VALIDATE` (default "on"; set "off" to bypass for debugging). Algorithm verified against Twilio's documented test vector and cross-checked Web Crypto vs Node HMAC (identical output). Files: `src/whatsapp.js`. Deploy: `wrangler deploy`. Requires `TWILIO_AUTH_TOKEN` (already set).

- **2026-06-02 (later 6)** · Portal is now **bilingual (ES/EN)**. Language comes from a `pwp_lang` cookie (es|en), default Spanish; an ES/EN toggle sits in every page header (and on the login page footer) and just sets the cookie + reloads. All portal UI strings moved into a `T` dictionary with a `t(lang, key)` helper in `src/portal.js`; `lang` is threaded through every page builder, `nav()`, `convRow()`, `relTime()`, the conversation-detail inline script (via an injected `L` object), and the login page. The manual page has full ES + EN copy. Conversation content itself is untouched (stays whatever language the customer/bot used). No schema change. Files: `src/portal.js`. Deploy: `wrangler deploy`. Verified both languages render across dashboard, conversations, settings, manual, and login.

- **2026-06-02 (later 5)** · Portal polish: (1) a live "needs reply" counter on the Conversaciones nav item, fed by a new `waiting` field in `/portal/api/stats` (count of conversations with `unread = 1`), refreshed every 15s from every page via a small script in `page()`. High-contrast amber badge with the number (not colour-only). (2) A top-right "Como usar" help link on every portal page that opens a new `/portal/manual` page: a plain-language Spanish how-to (inbox, take control, knowledge, alerts, bot name, Shopify, install widget). No schema change. Files: `src/portal.js`. Deploy: `wrangler deploy`.

- **2026-06-02 (later 4)** · Owner alerts: ping the business owner when a customer writes in (web or WhatsApp) and nobody has replied yet. New `src/alerts.js` (`maybeAlertOwner`): fires on a new inbound when the conversation has no `human` reply, at most once per conversation per **30-min cooldown**, suppressed during **quiet hours (default 21:00–07:00 America/Bogota)** and when the per-client toggle is off. Email via **Resend**, WhatsApp via **Twilio** to the owner's own number. Wired into `turn.js` (runs right after the inbound is stored; gates the existing needs_human / paused nudges so the owner isn't double-pinged). Opening a conversation in the dashboard resets the cooldown (`/read` now also nulls `last_alert_at`). Migration `006_owner_alerts.sql`: `conversations.last_alert_at`; `clients.alerts_enabled` (default 1), `quiet_start` (default 21), `quiet_end` (default 7); `notify_email` already existed (003). Portal Configuracion gained an "Avisos cuando un cliente escribe" card (toggle, owner email, quiet-hours start/end); `notify_wa` moved into it. Alert content: business name, channel, customer name/number, message snippet, direct link to the conversation. New secret: `RESEND_API_KEY`; new var: `ALERT_EMAIL_FROM` (default `Angela <hola@pymewebpro.com>`, must be a Resend-verified sender). Deploy: run migration 006, set `RESEND_API_KEY`, `wrangler deploy`. Set a client's recipients in the portal Configuracion page or via SQL (`notify_email`, `notify_wa`). JS syntax-checked; migration chain + quiet-hours/cooldown logic validated.

- **2026-06-02 (later 3)** · Product renamed to **Angela** (marketed name) in the portal (sidebar, login, page titles), keeping "por PymeWebPro". Worker name `pymewebpro-asistente` and domain `asistente.pymewebpro.com` unchanged. Added per-client `bot_name` (migration `005_bot_name.sql`) so each client can rename the bot their visitors see (defaults to Angela): set in portal Configuracion, injected into the widget header + greeting (`widget.js` now async, looks up `bot_name`, cache lowered to 5 min) and into the system prompt ("Eres {bot_name}..."). Settings API saves `bot_name`. Deploy: run migration 005 then `wrangler deploy`.

- **2026-06-02 (later 2)** · Shopify order-status tool (per-client add-on). New `src/shopify.js`: `getShopifyIntegration`, `lookupOrder` (Admin REST `orders.json?name=...`, read-only, scopes `read_orders` + `read_fulfillments`, default API version `2025-10`), and the `ORDER_TOOL` Anthropic tool definition. `turn.js` now runs a real tool-use loop (`callClaude`) and exposes `lookup_order` ONLY to clients with an active `integrations` row (kind `shopify`); the system prompt gains order-status instructions when connected. Identity check: the tool only returns order data when the supplied email matches the order email, otherwise `matched:false` and the bot asks them to verify. Status maps to paid/preparing/shipped(+tracking)/delivered; live in-transit/delivered depends on the carrier. Portal Configuracion page gained a "Integracion con tu tienda" section (shop domain + Admin API token, connect/update/disconnect) writing to the `integrations` table via `POST /portal/api/integrations/shopify`; the token is write-only in the UI (never echoed back). No new migration (the `integrations` table shipped in 003). Deploy: `wrangler deploy`. Per client: connect in the portal Configuracion page or SQL-insert an `integrations` row. NOTE: per-client `api_token` is stored in D1 (acceptable, read-only scope); tested against a stubbed Shopify response (match / mismatch / not-found all correct). JS syntax-checked.

- **2026-06-02 (later)** · WhatsApp transport switched from Meta Cloud API to **Twilio** (Meta dev-account gates were blocking app creation). Rewrote `src/wa-send.js` (Twilio REST Messages API, Basic auth with `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`, `whatsapp:+E.164` addressing) and `src/whatsapp.js` (parse Twilio form-encoded inbound, route by the business sender `To` against `clients.wa_sender`, empty-TwiML ack + async REST reply, cheap AccountSid anti-spoof guard). Migration `004_twilio.sql` adds `clients.wa_sender` (+E.164); `wa_phone_number_id` left in place but unused. Portal human-reply now sends via `wa_sender`. New secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (the Meta `WA_ACCESS_TOKEN`/`WA_VERIFY_TOKEN` are now unused). Deploy: `wrangler d1 execute asistente-db --remote --file=migrations/004_twilio.sql`, set the two Twilio secrets, `wrangler deploy`, then in Twilio point each WhatsApp sender's inbound webhook at `https://asistente.pymewebpro.com/wa/webhook` and set `clients.wa_sender` to that sender's +E.164. Full X-Twilio-Signature validation is a hardening follow-up. JS syntax-checked, SQL validated against SQLite.

- **2026-06-02** · Unified inbox upgrade: web + WhatsApp in one gated portal, with live human takeover. New files: `src/turn.js` (shared channel-aware turn engine), `src/wa-send.js` (Cloud API outbound + owner notify), `src/whatsapp.js` (multi-tenant `/wa/webhook`, routed by `phone_number_id`). `chat.js` slimmed to a wrapper and gained `GET /api/poll` so the widget receives the owner's replies during takeover. Migration `003_unified_inbox.sql`: conversations += channel / contact_name / contact_phone / needs_human / bot_paused / unread; messages += channel (role may now be `human`); clients += wa_phone_number_id / notify_wa / notify_email; new `integrations` table (Shopify, ready but unused). Portal "Conversaciones" rebuilt as a single inbox across both channels with attention / takeover / new badges (icon + text, colour-blind safe per Mike); conversation detail got a live thread + reply box + "Tomar el control" / "Devolver al asistente" toggle. New system-prompt signal `[ESPERAR_HUMANO]` = "permiteme un momento" + flag `needs_human` + best-effort WhatsApp ping to the client owner. Settings adds the private `notify_wa` field. New var `PORTAL_BASE_URL`; new secrets needed: `WA_ACCESS_TOKEN`, `WA_VERIFY_TOKEN`. Deploy: `wrangler d1 execute asistente-db --remote --file=migrations/003_unified_inbox.sql`, set the two WA secrets, `wrangler deploy`, then per client provision their WhatsApp number on Meta Cloud API and set `clients.wa_phone_number_id`. JS syntax-checked + SQL validated against SQLite; NOT yet wired to a live client WhatsApp number. Shopify order-status tool still pending (integrations table is in place for it).

- **2026-05-29** · Portal redesign (professional silver/white, Inter font, box shadows, polished login card with icon, pymewebpro.com credit in sidebar + login footer). Scheduling changed from cal.com link routing to inline mini-form: widget shows a 3-field form (name, contact, preferred time) when `[IR_A_CITA]` triggers; form POSTs to new public `/api/schedule` endpoint which stores a lead with `routed_to='cita'` and JSON intent. `booking_url` removed from settings UI. `handleSchedule` exported from portal.js, wired into index.js. chat.js system prompt updated (no cal.com reference). Files: `src/portal.js`, `src/widget.js`, `src/chat.js`, `src/index.js`.

- **2026-05-28** · Initial build + deploy. D1 schema (clients, conversations, messages, leads, sessions), chat handler (Claude Haiku + routing signals), embeddable widget.js, client portal (dashboard, conversations, knowledge base editor, settings, embed code page). Internal PDF explainer generated. Worker deployed to `pymewebpro-asistente.workers.dev` + route `asistente.pymewebpro.com`. D1 `asistente-db` uuid `2c74be5e-ccdc-4e6d-910c-d19168ec682f`. ANTHROPIC_API_KEY secret set. Test client seeded (id: `test`, token: `test-token-123`). DNS CNAME pending.
