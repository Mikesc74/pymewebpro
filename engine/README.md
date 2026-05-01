# PymeWebPro Engine

Single Cloudflare Worker that runs the entire pipeline:

```
landing CTA → Wompi checkout → webhook → intake portal (client)
              → admin dashboard (you) → mockup gen → share link → comments
              → revisions → second payment (upsell) → ship to Pages
```

## Stack

- Cloudflare Workers (router + all logic)
- D1 (`pymewebpro-engine`, id `1026bae2-cd6f-441b-866f-569cc1bc04ed`) — orders, projects, assets metadata, mockups, share links, revisions, upsells, admin sessions
- R2 (`pymewebpro-assets`) — uploaded logos/photos, generated mockup HTML bundles
- Anthropic API (Sonnet 4.6) — fills the blueprint with copy + colors
- Resend — emails to client + you
- Wompi — payments (sandbox first, then prod)

## First-time setup

```bash
cd engine
npm install
cp .dev.vars.example .dev.vars   # fill keys for local dev

# Set production secrets
wrangler secret put WOMPI_PUBLIC_KEY
wrangler secret put WOMPI_PRIVATE_KEY
wrangler secret put WOMPI_INTEGRITY_SECRET
wrangler secret put WOMPI_EVENTS_SECRET
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put ADMIN_PASSWORD
wrangler secret put SHARE_LINK_SECRET
wrangler secret put CLOUDFLARE_API_TOKEN

# Deploy
wrangler deploy
```

Bind the Worker to `engine.pymewebpro.com` (or any subdomain) via the Cloudflare dashboard
under Workers & Pages → engine → Settings → Triggers → Add Custom Domain.

## Routes

| Path                                    | Who    | Purpose                                |
|-----------------------------------------|--------|----------------------------------------|
| `GET  /api/checkout/initial?amount=…`  | public | Redirects to Wompi checkout            |
| `POST /api/wompi/webhook`               | Wompi  | HMAC-verified, source of truth         |
| `GET  /payment/return`                  | client | Pretty "we got your payment" page      |
| `GET/POST /intake/<token>`              | client | Magic-link intake form + uploads       |
| `GET  /preview/<signedToken>/`          | client | Mockup viewer + comment widget         |
| `GET  /preview/<signedToken>/asset/*`   | client | Mockup assets                          |
| `POST /preview/<signedToken>/comment`   | client | Submit revision comment                |
| `GET  /admin/login`                     | you    | Password login                         |
| `GET  /admin`                           | you    | Project dashboard                      |
| `GET  /admin/project/<id>`              | you    | Project view: intake, mockups, etc.    |
| `POST /admin/project/<id>/generate`     | you    | (Re)generate mockup with Claude        |
| `POST /admin/project/<id>/share`        | you    | Mint a 7-day signed share link         |
| `POST /admin/project/<id>/ship`         | you    | Mark delivered + create Pages project  |
| `POST /admin/revision/<id>/apply`       | you    | Re-run mockup with this comment as note |

## Local dev

```bash
wrangler dev          # http://localhost:8787
# In another terminal, simulate a Wompi event:
curl -X POST http://localhost:8787/api/wompi/webhook \
  -H 'content-type: application/json' \
  -d @test/fake-event.json
```

## Things still to wire (v2)

1. **Pages direct upload** — `deploy.ts` currently only marks delivered + creates the Pages project shell. Hook up the Pages create-deployment API or run `wrangler pages deploy <local-bundle>` from a CI step.
2. **Domain attach** — POST to `/accounts/.../pages/projects/<name>/domains` once the customer's DNS points at Cloudflare.
3. **Upsells UI** — table is there, no admin form to propose them yet. Add a small form in `adminProject`.
4. **Second payment flow** — `kind='upsell'` is wired in webhook. Add an admin action that mints a Wompi checkout for a sum of `proposed` upsells.
5. **More blueprints** — current = `blueprint-1` (parameterized landing). Add 3-4 more with different hero archetypes.
6. **WhatsApp delivery of intake link** — Twilio or WhatsApp Business API.
7. **Refund/disable flow** — endpoint that turns off the Pages deployment if a refund is processed inside the guarantee window.

## Schema

See `schema.sql`. Idempotent — re-runnable.
