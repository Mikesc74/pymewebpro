# Angela · Operator + Client Manual

Angela is PymeWebPro's client-facing AI chat assistant. It answers a business's
customers on their website and on WhatsApp, lets the business owner watch every
conversation and take over, and alerts them when someone is waiting. This manual
covers both how to run it (for Mike + Santi) and how clients use it.

The product is marketed as **Angela**. The worker is `pymewebpro-asistente`, the
database is `asistente-db`, and it lives at `asistente.pymewebpro.com`. WhatsApp
runs through Twilio.

---

## Part 1 · For PymeWebPro (operators)

### 1.1 The admin console

Go to `asistente.pymewebpro.com/portal/admin` and log in with the `ADMIN_TOKEN`.
You see every Angela client with their channels, conversation count, how many are
waiting unanswered, whether alerts and Shopify are on, and active state.

- **Open portal** opens that client's portal in a new tab (you're shown a "Viewing
  as <client>" banner so you know where you are).
- **Edit** opens the client's settings, including their login token (with a
  regenerate option).
- **+ New client** creates a client.

### 1.2 Onboarding a new client (end to end)

1. In the admin console, click **+ New client**. Fill in the Id (a slug like
   `flora-y-pez`), business name, domain, assistant name, and the WhatsApp fields.
   Press **Create client**. A login token is generated automatically.
2. Copy the onboarding prompt shown at the bottom of the New Client page and paste
   it to your AI assistant to walk through the rest. It covers everything below.
3. **WhatsApp.** Decide sandbox (testing) or a real sender (paying client).
   - *Sandbox:* Twilio Console -> Messaging -> Try it out -> Send a WhatsApp message.
     Join from your phone with the `join <code>` message. Under Sandbox settings set
     "When a message comes in" to `https://asistente.pymewebpro.com/wa/webhook`
     (HTTP POST). `wa_sender` is the shared sandbox number.
   - *Real sender:* Twilio Console -> Messaging -> Senders -> WhatsApp senders ->
     Create new sender. Buy a Twilio number or bring the client's number, submit the
     display name + business profile, wait for Meta approval (a day or two). Point
     that sender's inbound webhook at the same `/wa/webhook`. `wa_sender` is the
     approved number in +E.164.
4. Set `wa_sender` on the client (admin Edit form, or SQL).
5. Send the client their portal URL (`asistente.pymewebpro.com/portal`) and token.
6. The client (or you) pastes the widget snippet from their portal's Install page
   onto their site, fills the Knowledge page, and sets alert email/WhatsApp.
7. Connect Shopify if they want order lookups (see 1.4).
8. Test: send a web message and a WhatsApp message; confirm both land in the inbox.

### 1.3 What the assistant does on its own

- Answers from the client's Knowledge base, in the customer's language.
- Offers to continue on WhatsApp, or to book (see 1.5), when relevant.
- When it can't answer, it says "permiteme un momento" and flags the conversation
  for a human (and alerts the owner).
- **WhatsApp media:** voice notes are transcribed (if `OPENAI_API_KEY` is set) and
  answered; images/files get a short acknowledgement and escalate to a human.
- **Limits:** per-IP rate limit on web chat, and a monthly per-client reply cap
  (`DEFAULT_MONTHLY_CAP`, default 3000; override per client with `monthly_msg_cap`).
  Over the cap, the bot stops and escalates instead of running up cost.

### 1.4 Shopify order status (per client)

The client connects their store in portal Settings: their `.myshopify.com` domain
and a read-only Admin API token (custom app with `read_orders` + `read_fulfillments`).
The token is encrypted at rest (set `TOKEN_ENC_KEY` first). Once connected, the
assistant can tell a customer where their order is, after verifying the order number
matches the purchase email.

### 1.5 Bookings

If the client sets a **booking link** (Cal.com/Calendly) in Settings, the assistant
offers it: a "Reservar una cita" button on the web widget, and the link appended on
WhatsApp. If no link is set, the web widget shows a simple request form that becomes
a lead.

### 1.6 The 24-hour window (important)

WhatsApp only lets you send a free-form message within 24 hours of the customer's
last message. If the owner replies from the portal after that, the message is marked
**"No entregado"** in the conversation. To message someone outside that window you'd
need an approved Twilio template (not yet built). The reliable rule: reply while the
conversation is fresh.

### 1.7 Alerts, reports, retention

- **Owner alerts:** when a customer writes and nobody has replied, the owner gets an
  email (Resend) and a WhatsApp ping. One alert per conversation, 30-min cooldown,
  suppressed during the client's quiet hours, off if the toggle is off.
- **Monthly report:** on the 1st of each month, each active client with an alert
  email gets last month's numbers (conversations, web/WhatsApp split, leads,
  needs-attention count).
- **Retention:** off by default. Set `DATA_RETENTION_MONTHS` to auto-purge old
  conversations.

### 1.8 Privacy (Habeas Data)

Public notice at `/privacidad` (ES) and `/privacy` (EN), linked from the widget. To
delete a contact's data on request, open their conversation and press
"Eliminar datos" (hard delete).

### 1.9 Deploy runbook

```bash
cd ~/code/pymewebpro/pymewebpro-asistente

# apply any new migrations (idempotent; "duplicate column" on re-run is fine)
wrangler d1 execute asistente-db --remote --file=migrations/0XX_name.sql

# secrets (set once)
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put ADMIN_TOKEN
wrangler secret put OPENAI_API_KEY   # optional, voice notes
wrangler secret put TOKEN_ENC_KEY    # recommended before storing a Shopify token

wrangler deploy
npm test            # run the automated suite
wrangler tail pymewebpro-asistente --format pretty   # watch live logs
```

Vars live in `wrangler.toml`: `DEFAULT_MONTHLY_CAP`, `DATA_RETENTION_MONTHS`,
`PRIVACY_CONTACT`, `ALERT_EMAIL_FROM`, `TWILIO_VALIDATE`, `PORTAL_BASE_URL`.

---

## Part 2 · For clients (the portal)

The client logs in at `asistente.pymewebpro.com/portal` with their token. The portal
is bilingual (ES/EN toggle, top right) and has a "Como usar" guide built in.

- **Conversaciones:** every chat (web + WhatsApp) in one inbox, newest and
  needs-attention first. Search by name/number/text; filter by Open / Needs attention
  / Unread / Closed and by channel. The number on the menu item is how many are
  unread.
- **Take over:** open a chat and type, or press "Tomar el control" to pause the bot.
  Your replies go straight to the customer. "Devolver al asistente" hands it back.
  "Cerrar" archives the conversation.
- **Conocimiento:** everything the assistant should know (products, prices, hours,
  FAQs). More detail = better answers.
- **Configuracion:** assistant name, chat colour, public WhatsApp, booking link,
  alert email + WhatsApp, quiet hours, and the Shopify connection.
- **Instalar widget:** the snippet to paste on the website.

---

## Part 3 · Test checklist (live sandbox pass)

Run these on the sandbox after a deploy. Automated tests (`npm test`) cover the
logic; this covers the live path.

1. Web chat: open a site with the widget, send a question -> bot answers.
2. Web takeover: in the portal, open that chat, press "Tomar el control", reply ->
   the reply appears in the widget within a few seconds.
3. WhatsApp inbound: message the sandbox number -> bot answers, conversation appears
   in the inbox.
4. Voice note (if OPENAI_API_KEY set): send a voice note -> bot answers from the
   transcript.
5. Image: send a photo -> bot acknowledges, conversation flagged, image viewable in
   the portal.
6. Order lookup (if Shopify connected on a dev store): ask "where is order #1001"
   with the matching email -> correct status; wrong email -> no data revealed.
7. Alert: from a fresh conversation, confirm the owner gets the email/WhatsApp alert;
   a second message right after -> no alert (cooldown).
8. 24h flag: reply from the portal to a WhatsApp conversation older than 24h ->
   "No entregado" shown.
9. Close/search: close a conversation -> drops from the default inbox; search a word
   from a message -> the conversation is found.
10. Booking: set a booking link, trigger a cita -> "Reservar" button (web) / link
    (WhatsApp).
11. Admin: create a test client, open its portal (new tab + banner), edit + regen
    token.
12. Privacy: open `/privacidad`; in a conversation, "Eliminar datos" removes it.
