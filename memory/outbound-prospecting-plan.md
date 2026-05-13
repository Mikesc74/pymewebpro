# Outbound prospecting · plan

Cold-WhatsApp outbound to Colombian SMBs that have an active Instagram or Facebook presence but no website. Adapts the Catalina pattern (Cloudflare Worker + D1 + Claude tool-use + portal) to a sales motion instead of a concierge motion.

Status: planning · 2026-05-10

---

## Goal

Generate qualified, mockup-in-hand sales conversations with 30 to 50 Colombian SMBs per week. The agent's job is to qualify and book; the human's job (Santi for ES, Mike for EN) is to close. Success metric: 1 to 2 closed Essential or Pro sales per week from outbound, with under 10 minutes of human handling per closed deal.

We don't try to close in WhatsApp. We get to "yes, send me the proposal" and hand off.

---

## Architecture

Single addition to the existing `pymewebpro-portal` worker. No new worker, no new database. We already run on Cloudflare Workers + D1 + R2; everything fits.

```
pymewebpro-portal worker
├── existing: portal SPA, /lead, mockup serving
├── NEW: /outbound/*           admin UI for the prospect pipeline
├── NEW: /outbound/wa/inbound  webhook for WhatsApp replies (Meta Cloud API)
├── NEW: /outbound/scrape      ingest endpoint for Apify webhook payloads
└── NEW: scheduled trigger     daily cron at 9am COT, dispatches the day's queue
```

The reply handler reuses Catalina's Anthropic tool-use loop almost verbatim. Different system prompt, different toolset, same shape.

---

## Data model

Three new D1 tables. Migration file `0001_outbound.sql` in `~/code/pymewebpro/portal/migrations/`.

```sql
CREATE TABLE prospects (
  id              TEXT PRIMARY KEY,         -- ulid
  code            TEXT UNIQUE,              -- P123 format (Catalina-style)
  business_name   TEXT NOT NULL,
  category        TEXT,                     -- restaurante, salon, dental, etc.
  city            TEXT,                     -- medellin, bogota, cartagena, etc.
  country         TEXT DEFAULT 'CO',
  ig_handle       TEXT,                     -- without @
  ig_url          TEXT,
  fb_url          TEXT,
  follower_count  INTEGER,
  last_post_at    INTEGER,                  -- ms epoch
  bio             TEXT,
  phone           TEXT,                     -- E.164
  whatsapp        TEXT,                     -- E.164 (often same as phone)
  email           TEXT,
  has_website     INTEGER DEFAULT 0,        -- 0=no, 1=yes (we only target 0)
  source          TEXT,                     -- 'instagram', 'google_maps', 'manual'
  source_query    TEXT,                     -- "restaurantes el poblado"
  scraped_at      INTEGER,
  status          TEXT DEFAULT 'new',       -- new | mockup_ready | contacted | replied | qualified | won | lost | blocked | dnc
  mockup_slug     TEXT,                     -- key in manual-mockups
  mockup_url      TEXT,                     -- public URL we send in the opener
  first_contact_at INTEGER,
  last_contact_at  INTEGER,
  last_reply_at    INTEGER,
  contact_attempts INTEGER DEFAULT 0,
  notes           TEXT,                     -- agent-maintained, capped 240 chars
  assigned_to     TEXT,                     -- 'mike' | 'santi'
  language        TEXT DEFAULT 'es',
  created_at      INTEGER,
  updated_at      INTEGER
);

CREATE TABLE outbound_messages (
  id              TEXT PRIMARY KEY,
  prospect_id     TEXT REFERENCES prospects(id),
  direction       TEXT,                     -- 'outbound' | 'inbound'
  channel         TEXT DEFAULT 'whatsapp',
  template_name   TEXT,                     -- only set on outbound templates
  body            TEXT,
  wa_message_id   TEXT,
  status          TEXT,                     -- queued | sent | delivered | read | failed
  created_at      INTEGER
);

CREATE TABLE dnc (
  id              TEXT PRIMARY KEY,
  phone           TEXT UNIQUE,
  reason          TEXT,                     -- 'stop_keyword' | 'manual' | 'wa_blocked'
  added_at        INTEGER
);
```

Dedup keys at ingest: `phone` first, then `ig_handle`, then `business_name + city`.

---

## Sourcing pipeline

Two sources to start. Both run as Apify actors; we ingest the JSON output.

| Source | Actor | What we get |
|---|---|---|
| Instagram | `apify/instagram-profile-scraper` | handle, bio, follower count, contact button (often WA), last post date, website field |
| Google Maps | `compass/crawler-google-places` | business name, category, phone, website field, IG link in profile |

Two-step filter pipeline:

1. **Pre-filter at scrape time:** category whitelist, city, must have a public phone number.
2. **Post-filter at ingest:** drop any row where `has_website = 1`, drop any row where `last_post_at > 30 days ago`, drop anything in `dnc`, dedup against existing `prospects`.

Pilot category: `restaurante` in Medellín comunas Poblado, Laureles, Envigado. Easy to scrape, dense, visually compelling for mockups, big WhatsApp adoption. Roughly 800 to 1,200 raw prospects expected, of which 200 to 300 should pass the post-filter.

Cron: weekly Sunday night, output goes to a Cloudflare R2 bucket, worker ingest endpoint reads the latest dump.

---

## Mockup auto-generation

The differentiator. We don't pitch generically; we pitch with their site already drafted.

For each prospect that lands in `status='new'` with enough signal (bio, ≥3 IG image URLs), Claude generates a self-contained HTML mockup using the PymeWebPro template patterns already in `manual-mockups/`. Inputs:

- `business_name`, `category`, `city`
- `bio` (for the about section)
- 3 to 5 IG image URLs (used as background and gallery images)
- Default Wompi link, default WhatsApp CTA pointing at the prospect's own number

Output goes to `manual-mockups/p-{code}/index.html`, then through the existing `rebuild-mockups.mjs` pipeline. Public URL: `mockups.pymewebpro.com/p-{code}/`.

Budget: 30 to 50 mockups per day, ~$0.15 each in Claude tokens. ~$15 to $20/month.

Quality gate: human spot-check of the first 50, then automate. If a mockup fails the standards check (`npm run check:standards`), it's skipped and the prospect goes back to a manual queue.

---

## Outreach sequence

Three touches over 10 days. Stop on any reply, on STOP keyword, or on WhatsApp delivery failure.

| Day | Channel | Type | Body shape |
|---|---|---|---|
| 0 | WhatsApp template (marketing) | Cold opener with mockup link | "Hola {name}, vi @{handle}, las fotos de {specific thing} están muy buenas. Le armé una idea rápida de cómo se vería un sitio web para {business}: {mockup_url}. Sin compromiso, dígame qué piensa." |
| 3 | WhatsApp free-text (if 24h session open) or template | Soft follow-up | "¿Alcanzó a verlo?" |
| 10 | WhatsApp free-text or template | Polite drop | "Le dejo el link por si más adelante le interesa: {mockup_url}. Si necesita algo, escríbanos." |

Templates need Meta pre-approval (1 to 2 days). We register two: opener template and follow-up template. The drop can be sent inside an existing 24h window or as a third template if needed.

Sender persona: **Sandra de PymeWebPro** (or whatever name the team picks). Not Mike directly, not Santi directly. Frees them from inbox-reply pressure and lets the agent set the tone.

Hard rate limits:
- 9am to 7pm Bogotá time, Mon to Fri only
- Max 50 first-contact messages per day per WA number for the first 14 days
- Ramp to 150/day after Meta quality rating stays green for 2 consecutive weeks

---

## Reply handler (Claude agent)

When a reply hits `/outbound/wa/inbound`, the worker loads the prospect, the message thread, and runs Claude Sonnet 4.6 with tool use. System prompt summary:

> You are Sandra, an outbound rep for PymeWebPro. You just sent {business_name} a free website mockup at {mockup_url}. Your goal: qualify their interest and book a 15-min call with Santi (ES) or Mike (EN), or send a Wompi link if they're ready. Bilingual ES default, switch to EN if they reply in EN. Honest, warm, brief, no marketing-speak.

Tool set:

| Tool | What it does |
|---|---|
| `send_message` | Reply via WhatsApp |
| `update_prospect` | Set name, email, language, notes (capped 240 chars) |
| `book_consult` | Cal.com slot listing + booking, hands off to Santi by default |
| `send_wompi_link` | Direct payment link for the chosen tier (390k or 690k COP) |
| `mark_status` | Move prospect through pipeline (replied, qualified, won, lost) |
| `mark_dnc` | Honor STOP / NO MAS / PARAR / "no me interesa" |
| `escalate` | Hand off to Mike or Santi when conversation gets technical or large-deal |
| `schedule_followup` | Re-queue for N days out |

Same anti-repetition + URL-formatting + notes-discipline rules from Catalina. Reuse Catalina's `agent.js` patterns wholesale.

Hand-off triggers (escalate to Santi automatically):
- Prospect asks a technical question the agent isn't 100% on
- Prospect mentions a custom feature outside Essential/Pro scope
- Prospect names a competitor or asks for a custom quote
- Prospect goes silent after explicit interest (Sandra's not great at re-engagement)

---

## Portal

Add a fourth tab to the existing `pymewebpro-portal` admin SPA: **Outbound**. Same Sheets aesthetic as Catalina's portal, same domain-tab pattern but tabs are by category instead of source.

Views:

- **Now** · today's queue, recent replies, escalations waiting on Mike/Santi
- **Prospects** · spreadsheet view, filterable by city / category / status / source
- **Pipeline** · kanban: new → mockup_ready → contacted → replied → qualified → won/lost
- **Mockups** · grid view of generated mockups with screenshots, click to open

Manual override controls on every prospect row: reassign owner, send custom WA message (gets injected into the agent's context), pause prospect, mark DNC, regenerate mockup.

---

## Compliance

Colombia B2B outbound where the contact info comes from a public business profile is permitted under Ley 1581. We still keep clean records:

- Per-prospect source log: "scraped from {source} on {date}, public profile"
- STOP keywords (en/es): `STOP`, `PARAR`, `NO MAS`, `BAJA`, `CANCELAR`, `UNSUBSCRIBE` → auto-DNC
- Contact info verification at send time: re-check that IG profile is still public; skip if private
- Quiet hours hard-coded
- DNC list checked on every send, no exceptions

WhatsApp-specific risk management:
- Dedicated WA Business API number for outbound (not Catalina's number)
- Monitor Meta quality rating daily; pause sends if yellow, stop if red
- Personalized opener (named handle, named post reference) keeps block rate low

---

## Phased rollout

| Phase | Week | Scope | Exit criteria |
|---|---|---|---|
| 1 | 1 | Schema + ingest + Apify scrape of 200 Poblado restaurants | Prospects table populated, post-filter reduces to 60 to 80 candidates |
| 2 | 2 | Mockup auto-gen + spot-check first 20 | 18 of 20 mockups pass standards check |
| 3 | 3 | WA template approval + reply handler + portal Outbound tab | First 10 sends manually triggered, 0 wrong-number incidents, replies routed to Sandra agent |
| 4 | 4 | Scheduled cron at 20 sends/day | Quality rating green, ≥10% reply rate, ≥2 booked consults |
| 5 | Month 2 | Scale to 50/day, add salon + dental categories | First closed sale from outbound, ≥1 sale per week sustained |

If Phase 4 metrics miss (reply rate under 5%, or quality rating goes yellow), we pause and rework the opener before scaling.

---

## Cost estimate

| Line | Monthly |
|---|---|
| Apify (Instagram + Maps actors, ~2,000 raw scrapes) | ~$50 |
| Claude tokens · mockup generation (200/mo at $0.15) | ~$30 |
| Claude tokens · reply agent (100 conversations at $0.05) | ~$5 |
| WhatsApp marketing conversations (200 at ~$0.07) | ~$14 |
| Cloudflare Workers + D1 + R2 | $0 (existing budget) |
| Dedicated WA Business number (one-time setup, then carrier fee) | ~$5 |
| **Total** | **~$100/mo** |

Conservative revenue math: 200 sends → 30 replies (15%) → 5 closes (16% of replies) → 5 × 390k COP = ~1.95M COP/mo gross (~$490 USD). 5x ROI at the floor; closer to 10x if we hit the optimistic end.

---

## Decisions you need to make before Phase 1

1. **WhatsApp number for outbound.** New dedicated line, or reuse PymeWebPro's existing inbound WA? Strong recommendation: new line. Keeps the existing number clean and lets us throttle outbound independently.
2. **Sandra (persona).** Sandra de PymeWebPro? Carolina? María? Or use Santi's name directly? Persona gives more flexibility but is one degree dishonest; using Santi's name keeps it human but burns his inbox if it scales.
3. **Pilot category + city.** I recommend `restaurante` in Poblado / Laureles / Envigado. Alternatives: salones de belleza, clínicas dentales, inmobiliarias.
4. **Apify subscription.** ~$50/mo budget approval needed. Alternative is a custom scraper via Cloudflare Browser Rendering, more dev time, lower opex.
5. **Mockup URL pattern.** `mockups.pymewebpro.com/p-{code}/` (separate prefix from named-client mockups), or co-mingle?
6. **Cal.com handoff.** Santi has a Cal.com? If not, set one up first; the booking tool depends on it.

Once those are answered, Phase 1 is ~2 days of build work.

---

## What this is NOT

- Not bulk SMS. Channel is WhatsApp because that's where Colombian SMBs actually read business messages.
- Not generic spam. Every send carries a custom mockup URL specific to that prospect.
- Not a closer. The agent qualifies and books; the close happens in a 15-min call or an emailed proposal.
- Not for the guides network. Catalina handles concierge for medellin.guide; this is purely a PymeWebPro sales motion. Separate worker route, separate WA number, separate portal tab.
