# pymewebpro-agent · Valentina (PWP sales agent)

Cloudflare Worker. Forked from `~/code/catalina/` 2026-05-18. Pared down to a
focused PymeWebPro sales agent: she does NOT qualify hard, she captures the
contact, sells the ONE product, and drives to a 30% Wompi deposit or a call with Santi.

## What she does

- Greets visitors in Spanish (mirrors English if they open in English).
- Captures name + phone + email first (capture_contact), in both paths.
- Explains the offer: la página de ventas $400.000 COP (incluye la Ficha de Google), 3 adicionales a $75.000 c/u (catálogo, catálogo/menú PDF, bilingüe), y planes mensuales opcionales (hosting $30.000, Plan de presencia $59.000, Plan de ventas $150.000 con el chatbot/asistente 24/7).
- Generates a Wompi checkout link for the 30% deposit ($120.000 COP).
- Or books a 15-min call with Santi (list_call_slots → book_call).
- Escalates to Mike (or Santi if message is Spanish-tilted) on demand.

Hard rules from the master CLAUDE.md apply:
- No em dashes, anywhere.
- COP only. Never USD, never CAD.
- Brief, no marketing-speak, honest framing.
- Mike's Canadian nationality is a personal fact, not market positioning.

## Architecture

- Worker route: `valentina.pymewebpro.com` (custom domain).
- D1 `pymewebpro-agent-db` (binding `AGENT_DB`): conversations, messages,
  deposit_intents.
- D1 `pymewebpro-portal` (binding `PORTAL_DB`): she writes lead + payment
  rows here so the existing `handleWompiWebhook` in pymewebpro-portal
  handles approval and conversion identically for both surfaces.
- Anthropic Claude Sonnet 4.6 via tool use (`ANTHROPIC_MODEL`).
- Embed widget served at `GET /widget.js` (same pattern as Catalina).
- Web chat: `POST /chat`.
- WhatsApp: `GET/POST /whatsapp/webhook`.

## Tools

0. `capture_contact(contact_name, phone, contact_email, business_name?)` · called
   FIRST in both paths (pay or call), persists the contact onto the conversation
   row (contact_name/contact_phone/contact_email/business_name) so Santi can follow
   up even if they go quiet. Does NOT create a portal lead (that happens on deposit,
   to avoid duplicate leads).
1. `generate_wompi_deposit_link(contact_name, contact_email, business_name, phone)`
   · Writes a lead + payment row in PORTAL_DB, computes the Wompi signature,
   returns a checkout URL pre-filled with customer data. The reference suffix
   `-dep` marks it as a deposit (vs full-price) payment. phone is now required.
2. `list_call_slots(timezone, days_ahead)` + `book_call(slot_iso, name, email, timezone, note)` · direct Google Calendar booking on **Santi's** calendar (Santi does the PWP calls; host hardcoded to santi), ported from Catalina (`gcal.js` + `scheduling.js`). list_call_slots reads freeBusy and offers real open 15-min slots; book_call creates the event with the prospect as attendee + a Google Meet link, and Google emails the invite. Replaced the old `schedule_call` (dead Cal.com link). Used when a prospect wants a human, a walkthrough/demo, or hesitates.
3. `send_plan_brief()` · Returns a short Spanish summary of the one product
   (what's included incl. Ficha de Google), the 3 add-ons @ $75k, and the
   monthly plans (hosting / presencia / ventas).
4. `escalate_to_human(reason, summary, target?)` · WA pings Mike (default)
   or Santi with conversation summary and deep link.

Demos: the prompt's DEMOS AND EXAMPLES block lets Valentina share real live example sites (espacio-dental + revo-cafe mockups, inviersol.com) and offer a walkthrough call, instead of dodging a "demo" request.

## Common workflows

Apply the migration:

```bash
cd ~/code/pymewebpro-agent && wrangler d1 create pymewebpro-agent-db
# copy the database_id into wrangler.toml, then:
wrangler d1 execute pymewebpro-agent-db --remote --file=migrations/0001_initial.sql
```

Set secrets:

```bash
cd ~/code/pymewebpro-agent
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put WOMPI_PUBLIC_KEY     # same value as on pymewebpro-portal
wrangler secret put WOMPI_INTEGRITY      # same value as on pymewebpro-portal
wrangler secret put WA_ACCESS_TOKEN      # after Meta number provisioning
wrangler secret put WA_VERIFY_TOKEN
wrangler secret put GCAL_CLIENT_ID            # call booking; same value as catalina
wrangler secret put GCAL_CLIENT_SECRET        # same value as catalina
wrangler secret put SANTI_GCAL_REFRESH_TOKEN   # REQUIRED · Santi does PWP calls; mint via Catalina /admin/gcal-auth
# MIKE_GCAL_REFRESH_TOKEN is not used for PymeWebPro booking.
```

To mint Santi's token: open `https://catalina.medellin.guide/admin/gcal-auth` (Basic auth: `colguide` / `INBOX_PASSWORD`), click the Santi button, have Santi sign in to his calendar Google account and approve. The callback page prints the `wrangler secret put SANTI_GCAL_REFRESH_TOKEN` command + token. Run it on this worker (and catalina). Same `GCAL_CLIENT_ID`/`GCAL_CLIENT_SECRET` is shared, so one token works on both.

Deploy:

```bash
cd ~/code/pymewebpro-agent && wrangler deploy
```

## Wompi reference format

`pwp-<leadId>-<timestamp36>-dep` · the `-dep` suffix flags Valentina-origin
deposits. The portal webhook ignores this suffix when looking up the payment
row by reference.

## Updating the portal CSP

When embedding `https://valentina.pymewebpro.com/widget.js` on `pymewebpro.com`,
update `_headers` in the marketing repo to allow:
- `script-src` += `https://valentina.pymewebpro.com`
- `connect-src` += `https://valentina.pymewebpro.com`

## Recent changes

Add an entry every time you push.

- **2026-05-25** · **Valentina no longer takes payment · capture + schedule a call only (Mike's decision).** Mike: for this segment, don't collect payment on the website. "Valentina collects information and schedules a call"; "any payment links will be created by me and shared via Santi." Changes: `src/tools.js` removed the `generate_wompi_deposit_link` tool (definition, executor `runGenerateWompiDepositLink`, dispatch case) and its `./payments.js` import (createDepositPayment/computeDeposit/formatCop/PLAN_LABELS now unused); `payments.js` left in the repo unused in case self-serve checkout is ever rewired. Tool set is now capture_contact → send_plan_brief → list_call_slots → book_call → escalate_to_human. `send_plan_brief` text folded (no à la carte add-ons; the extras live inside the two monthly plans: Presencia +bilingüe, Ventas +vitrina 30/+catálogo/+reporte). `src/agent.js` system prompt rewritten: YOUR JOB is now capture contact then book a call with Santi (no deposit path); "NO À LA CARTE ADD-ONS"; monthly plans updated; tools list + pitch example + "HOW PAYMENT WORKS"/"AFTER YOU BOOK THE CALL"/"WHAT YOU DO NOT DO" reworded so she describes payment (30/70 via Wompi) but never sends a link · Santi sends it after the call. `node --check` clean on all src/*.js, zero `generate_wompi` refs left, em-dash 0. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`. **Test:** chat on pymewebpro.com (web + WhatsApp), confirm she captures name/phone/email then books a call and never offers a pay link.
- **2026-05-25** · **New `POST /lead` endpoint for the homepage "free example" preview (Mike).** The tablet-mockup modal on pymewebpro.com captures name + WhatsApp + business + industry + offer and POSTs them here (origin already in ALLOWED_ORIGINS, so CORS is clean). `src/index.js` inserts a row into PORTAL_DB.leads with source `preview-tablet`, status `new`, plan `esencial`, hosting `none`, and metadata {source, industry, offer, color}. Wrapped in try/catch so a schema hiccup never breaks the visitor flow (always returns {ok:true} + CORS). Mirrors the leads insert in payments.js. `node --check` clean. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.
- **2026-05-25** · **Widget: launcher relabeled "Got a question?" + proactive pulse-then-bubble nudge (Mike).** (1) Launcher label changed from "Talk to Valentina / Habla con Valentina" to **"Got a question? / ¿Tienes una pregunta?"** in `src/widget.js.txt`. (2) New proactive engagement for visitors who do not click: ~2.2s after load the launcher does a one-shot attention bounce (`.vt-attention`, scale+translate, 3x), then ~6s after load, if still no engagement, a dismissible teaser bubble appears next to it: ES "¿Buscas una página para tu negocio?", EN "Looking for a website for your business?". Clicking the bubble opens the chat; the × dismisses it. Fires **once per session** (sessionStorage `valentina_nudge_seen`) and is cancelled the instant the user clicks the launcher or opens the panel. Motion/text cue only (no color-coding, colorblind-safe). Styles added to `src/widget.css` (`.vt-attention`, `@keyframes vtAttention`, `.vt-nudge`/`-msg`/`-x`, mobile + prefers-reduced-motion overrides). `node --check` clean (via .cjs copy), em-dash 0. The widget is an external script from valentina.pymewebpro.com, so no pymewebpro.com CSP hash change. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-24 (later)** · **Valentina: no discovery, straight to the close (Mike).** She was asking discovery questions after capturing contact ("¿qué quieres lograr con la página?"). Mike: once contact is captured, go RIGHT to the binary close. `src/agent.js` YOUR JOB + CAPTURING sections rewritten: capture name+phone+email, then in ONE message ask "¿te genero el link del depósito (30%, $120.000) y arrancamos, o prefieres hablar primero con alguien?" → (a) generate_wompi_deposit_link or (b) list_call_slots/book_call. Explicit "do NOT interview, do NOT ask what they want to achieve." If they ask price/what's-included, send_plan_brief then return to the close. `src/widget.js.txt` start-intent greeting now opens by asking for contact (name + WhatsApp) instead of "¿a qué se dedica tu negocio?". node --check clean, em-dash 0. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-24 (later)** · **Valentina realigned to the current offer + two-outcome objective + contact-first capture (Mike).** Her system prompt + plan brief were still on the OLD offer (GBP $90k add-on, GA4 $120k, CRM $190k, copywriting $150k, catálogo $180k, PDF $50k, página adicional/revisión, chatbot $190k+$80k/mes, "page is one-time, no monthly"). Rewrote `src/agent.js` + `src/tools.js` to match what shipped: base $390k INCLUDES the Ficha de Google; the only à la carte add-ons are 3 @ $75k (catálogo simple, catálogo/menú descargable PDF, versión bilingüe); optional monthly plans = hosting $30k / Plan de presencia $59k / Plan de ventas $150k (chatbot lives INSIDE Plan de ventas, the website bot answers + pushes the customer to WhatsApp, no separate build/run fee). **Objective rewritten** to two outcomes: (a) ready → Wompi deposit, or (b) wants to talk → book Santi. **Contact-first:** new `capture_contact(contact_name, phone, contact_email, business_name?)` tool (in `tools.js`, dispatched in runTool) persists name/phone/email to the conversation row; `db.js` updateConversationContact whitelist now allows `contact_phone`; `generate_wompi_deposit_link` now REQUIRES phone. Prompt instructs: get name+phone+email and call capture_contact BEFORE the deposit link or call slots, in both paths. Fixed leftover stale bits (elevator-pitch prices, "Página adicional" ref, literal em-dash in the no-em-dash rule). Note: capture_contact deliberately does NOT create a portal lead (avoids duplicate leads vs the deposit path); early non-converting contacts live on the conversation/inbox. `node --check` clean, em-dash 0, stale-offer sweep clean. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-24** · **Widget: `data-valentina-open` now carries an intent, "start" opens in get-started mode (Mike).** Previously every CTA called `openPanel()` and showed one generic greeting. Now the delegated click handler reads the attribute value and passes it: `openPanel(trigger.getAttribute("data-valentina-open") || "")`. `openPanel(intent)` picks the opening bot line, when `intent === "start"` Valentina leads straight into onboarding ("¡Listo! Empecemos con tu página de ventas... ¿cómo se llama tu negocio y a qué se dedica?" / EN "Great, let's get started... what's your business called and what does it do?"); otherwise the usual greeting. Both greetings are now bilingual off `isEn` (the default was ES-only before). The pymewebpro.com "Empezar ahora / Start now" CTA was updated to `data-valentina-open="start"`. File: `src/widget.js.txt` (the text source imported by `widget.js`). No agent/DB change, the canned greeting drives the lead-in and the existing discovery + plan-brief + deposit tools take over on the user's first reply. `node --check` passes, em-dash scan clean. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-21 (later x3)** · **WhatsApp product layout · channel-aware formatting (Mike: "lay out the product a little better").** On WhatsApp Valentina was dumping the product as a wall of text because the system prompt said "always plain text, no markdown, no bullet points" (correct for the web widget, which shows raw asterisks; wrong for WhatsApp, which renders them). `src/agent.js` systemPrompt now computes `isWhatsApp = conversation?.channel === "whatsapp"` and a `formattingBlock` that replaces the old CHANNEL section: on WhatsApp she uses `*bold*` for the product name + key prices and real line-break "- " bullets for the includes/add-ons with blank lines between sections (still leading with the outcome, then one question); on web chat she stays plain text. `node --check src/agent.js` passes. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-21 (later x2)** · **Direct Google Calendar booking + real demos.** Two prospect-facing fixes after Mike caught Valentina (1) dodging a "can I get a demo" with "we're pre-launch, nothing to show" and (2) pasting the dead `cal.com/medellinguide/intro` link for "I'd like to meet with Mike" (the demo he meant was a walkthrough call). Ported Catalina's calendar stack: new `src/gcal.js` (host-aware OAuth/freeBusy/createEvent, mike|santi) + `src/scheduling.js` (listSlots/bookSlot/pickReadableSlots). Replaced `schedule_call` with `list_call_slots` + `book_call` in `tools.js`; book_call creates the event on the chosen host's calendar with a Meet link and emails the invite. Prompt: new DEMOS AND EXAMPLES block (offer a walkthrough call via the calendar tools, and may share live example sites: espacio-dental + revo-cafe mockups, inviersol.com), updated tool list, and the "don't share URLs" rule now allows the example links + a Meet link after book_call. Removed dead `CAL_BOOKING_URL` var. **Booking is SANTI-only (Santi does the PymeWebPro calls; both tools hardcode host='santi'). Secrets: `GCAL_CLIENT_ID`, `GCAL_CLIENT_SECRET` (same as catalina) + `SANTI_GCAL_REFRESH_TOKEN`. Mike didn't have Santi's token, so mint it via Catalina's `/admin/gcal-auth` (authorize as Santi → the page prints the `wrangler secret put SANTI_GCAL_REFRESH_TOKEN` command). `MIKE_GCAL_REFRESH_TOKEN` not used here.** Deploy: set them + `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-21 (later)** · **Fixed Valentina going silent on some WhatsApp messages (webhook body read race).** `wrangler tail` showed `WA webhook bad JSON: TypeError: Can't read from request stream after response has been sent.` Root cause in `src/index.js`: the POST `/whatsapp/webhook` route returned `200` to Meta and parsed `request.json()` inside the backgrounded `ctx.waitUntil(handleInboundWhatsApp(request))`, but Workers close the request stream the moment the Response is sent. Buffered payloads parsed in time (she replied); larger/unbuffered ones threw and were dropped (silence), which is why only "certain" messages went unanswered. **Fix:** parse the body in the route handler BEFORE returning 200, then pass the parsed `payload` into `handleInboundWhatsApp(payload, env)` (signature changed from `(request, env)`, removed its internal `request.json()`); the slow agent loop still runs in `waitUntil`. `node --check src/index.js` passes. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-21** · **Valentina is LIVE on WhatsApp (+57 324 6353033).** Meta WhatsApp business verification approved (NorteSur Consulting portfolio), so we activated Valentina's pre-built WhatsApp path. Meta-side: created System User `valentina-bot` (Admin) with Full control of the PymeWebPro app + the PymeWebPro WABA (id `2299742950797416`); generated a never-expiring System User token; subscribed the app to the WABA (`POST /{WABA}/subscribed_apps` → `{"success":true}`); registered the number on the Cloud API (`POST /{phone-number-id}/register` with a 2-step PIN). **Config fix:** `wrangler.toml` `WA_PHONE_NUMBER_ID` was wrong (`1123889274140934`, the id shown in the WhatsApp Manager UI) and corrected to the real Cloud-API phone-number id **`1121669684367915`** (found via `GET /{WABA}/phone_numbers`). Also corrected the unused `WHATSAPP_NUMBER` display var from Santi's personal number to `+573246353033`. Secrets set: `WA_ACCESS_TOKEN`, `WA_VERIFY_TOKEN`. Webhook `https://valentina.pymewebpro.com/whatsapp/webhook`, subscribed to `messages`. Verified end-to-end (inbound text → agent → reply). **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy` (done). **Follow-up (do soon):** rotate `WA_ACCESS_TOKEN` since the setup token was pasted into chat · on valentina-bot click Revoke tokens, Generate a fresh one, `wrangler secret put WA_ACCESS_TOKEN`, redeploy.

- **2026-05-20 (later x3)** · **Sales voice · lead with the outcome, not a feature list (Mike).** Added a "HOW TO PITCH" section to the `src/agent.js` system prompt: name the feature, then translate it into what it does for the prospect's business (turn visitors into leads who message/call/book/order, route them straight to WhatsApp/phone), adapt to their business + language, and always follow facts with a short "what that means for you" line + a soft question. Includes an adaptable Spanish example (outcome → price/30-70/guarantee → optional add-ons → one question). Kept honest: explicitly no speed/perfection overclaims (consistent with the no-sub-1s-promise rule). `npm run check` passes; no stray em dashes. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-20 (later x2)** · **Single-product pivot · Valentina now sells ONE product + à la carte add-ons (Mike: "why dont we offer one marketing page with addons").** Collapsed Essential/Pro into one product everywhere in the agent. `src/agent.js` system prompt: "THE TWO PLANS" → "THE PRODUCT" (La página de ventas $390.000, deposit $117.000, balance $273.000, includes 6-step page + booking + Maps + SEO + privacy analytics + 1 month hosting + 2 rounds); new ADD-ONS block (GBP $90k, advanced analytics GA4+GTM+Pixel $120k, CRM $190k, bilingual $75k, copywriting $150k, simple catalog $180k via portal, PDF button $50k, extra page $50k, extra revision $90k, chatbot $190k+$80k/mes); new "OUT OF SCOPE BUT QUOTABLE" (real store, blog → escalate); "DEPOSIT LINK COVERS THE BASE PAGE" rule (add-ons go on the final quote, not folded into the Wompi deposit). `src/tools.js`: `send_plan_brief` now takes no args and returns one base-page brief + the add-on menu (ES + EN); `generate_wompi_deposit_link` drops the `plan` param (executor hardcodes the portal key `plan="esencial"` so payments.js still prices the base at $390k/$117k). `src/payments.js`: `PLAN_LABELS.esencial` "Plan Esencial" → "La página de ventas" (kept the unused `pro` price/label for backward-compat so old links don't 500). Wompi/portal contract unchanged. `npm run check` passes (all src parse cleanly); zero Essential/Pro/$690 left in agent.js/tools.js. **NOT deployed.** **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-20 (later)** · **Chatbot moved out of Pro → optional add-on on both tiers (Mike).** `agent.js`: removed the chatbot from Pro's included features and from the Pro positioning line; replaced the "renewal $110.000/mes" section with "the funnel is a one-time purchase, sin suscripción mensual" (hosting is included + prepaid, not a forced subscription) and a "CHATBOT IS AN ADD-ON" section ($190.000 once + $80.000/mes, both tiers, the only thing that adds a monthly). `tools.js`: Pro briefs (ES + EN) drop the chatbot from the included list and the $110.000 combined figure; now state the funnel is one-time and the chatbot is an optional add-on. `npm run check` passes (no $110.000, no chatbot-in-Pro left). Deploy: `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-20** · **Aligned Valentina's plans to the sales guide (source of truth: `~/code/pymewebpro-sales/`).** `src/agent.js` system prompt + `src/tools.js` plan briefs updated. **Chatbot:** added to Pro's included features; documented as an Essential add-on ($190.000 once + $80.000/mes); new RENEWAL section so she states recurring facts (hosting+support $30.000/mes or $300.000/año saving two months; chatbot run fee $80.000/mes, ~300 conversations fair-use; a chatbot funnel renews at $110.000/mes) and a hard rule to ALWAYS disclose the chatbot monthly before closing a Pro or Essential+chatbot. The chatbot is the one exception to "sin suscripción mensual". **Booking:** moved from Pro-only to standard on BOTH plans (embed an existing tool, not a custom engine). **GBP:** moved Essential→Pro. **Maps + testimonials + privacy-first analytics:** stay Essential/standard. **Domain caveat:** added "the domain itself is the client's cost". Fixed the stale `tools.js` send_plan_brief description ("both bundle 1 year" → Essential 1 month, Pro 1 year). Still COP-only, Essential/Pro names. `npm run check` passes (all src parse cleanly). **NOT deployed.** **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-19** · **Template-literal hardening · widget JS + CSS moved out of template literals.** Cross-project hardening pass triggered by the pymewebpro-portal SPA outage on the same day (see `~/code/pymewebpro/CLAUDE.md` 2026-05-19 later x10/x11 and `~/code/PLATFORM.md`). Migrated `src/widget.js` two static template literals into sibling files: `WIDGET_JS` (5.6KB, 144 lines, 0 interpolations) → `src/widget.js.txt`, and `WIDGET_CSS` (4.6KB, 38 lines, 0 interpolations) → `src/widget.css`. `wrangler.toml` now has `[[rules]] type="Text" globs=["**/*.txt", "**/*.css"]` so both bundle at build time as module imports. `src/widget.js` replaces the two `export const ... = \`...\`` blocks with `import ... from "./widget.css|widget.js.txt"; export const ... = ...;`. Also added `[build] command = "npm run check"` to `wrangler.toml` + a `"check"` script (parses every src/*.js) + `"predeploy": "npm run check"` to `package.json` so the check fires on every deploy path. **Deploy:** `cd ~/code/pymewebpro-agent && wrangler deploy`. **Verify:** load pymewebpro.com, confirm Valentina's chat launcher appears and the panel opens.

- **2026-05-18 (later x3)** · Gemini hybrid · conversation history compression. New `src/gemini.js` (trimmed copy of Catalina's: `callGemini` + `compressConversationHistory`; no `summarizePageForClaude` or `compressSearchResults` since Valentina has no fetch_page / search tools). `src/agent.js` imports `compressConversationHistory`; in `chatTurn`, when assembled messages array exceeds `HISTORY_COMPRESS_THRESHOLD` (20), the oldest `length - HISTORY_KEEP_RECENT` are folded into one Gemini-summarized user message while the most recent 12 stay verbatim. Falls back to raw history if `GEMINI_API_KEY` unset or Gemini errors. `wrangler.toml` adds `GEMINI_MODEL = "gemini-2.0-flash"` to `[vars]` and documents `GEMINI_API_KEY` as an optional secret (reuse Catalina's key). Deploy: `cd ~/code/pymewebpro-agent && wrangler deploy`.

- **2026-05-18 (later x2)** · Anthropic prompt caching for Valentina. `src/agent.js` `chatTurn` now passes `system` and the last tool with `cache_control: { type: "ephemeral" }` so subsequent turns within a 5-minute window pay 10% of the input price for the cached system+tools tokens. No new secrets, no migrations. Deploy: `wrangler deploy`.

- **2026-05-18 (later)** · `data-valentina-open` delegated click handler in the embedded widget. Any element on `pymewebpro.com` with `data-valentina-open` attribute opens the chat panel on click. CSP-friendly (no inline `onclick` needed) since the handler is attached from the worker-served `widget.js`. Used by the header CTA and form-section CTAs on the marketing site. Companion change: `pymewebpro/index.html` (ES + EN) header CTA + chapter-06 form section replaced with `data-valentina-open` triggers, form removed.

- **2026-05-18** · Initial scaffold. Forked from `~/code/catalina/`, pared to a focused PymeWebPro sales agent: 4 tools (`send_plan_brief`, `generate_wompi_deposit_link`, `schedule_call`, `escalate_to_human`), Spanish-first voice with bilingual fallback, 30% deposit via Wompi using the existing `pymewebpro-portal` D1 (so the existing `handleWompiWebhook` handles approval and conversion). D1 `pymewebpro-agent-db` (own state) + `pymewebpro-portal` (shared with portal worker). Web chat widget served at `valentina.pymewebpro.com/widget.js` and embedded on `pymewebpro.com`. WhatsApp webhook wired but pending Meta number provisioning.
