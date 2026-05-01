# PymeWebPro Portal — Recovery Notes

The Cloudflare Worker behind `portal.pymewebpro.com` handles payments (Wompi),
client intake, magic-link auth, the admin panel, and the deliverables tracker.

**As of 2026-04-30 the source repo is missing locally.** It used to live at
`pymewebpro-final/backend/` (per `Projects/PymeWebPro/PROCESS.md`) but isn't on
disk anywhere we can find. The deployed Worker still runs fine — only the
source is gone.

This folder is a partial recovery + a deploy plan.

---

## What's here

- `src/payments.js` — clean source for the payments module, **with the new
  launch-offer prices already applied** (390k Esencial / 690k Crecimiento).
  The other modules (`utils.js`, `auth.js`, `client.js`, `deliverables.js`,
  `admin.js`, `files.js`, `leads.js`, `frontend.js`, `index.js`) are NOT here
  — they need to be reconstructed from the deployed bundle if a full source
  rebuild is desired.
- `wrangler.toml` — deploy config with the real bindings (D1, KV, R2) pulled
  from the live Cloudflare account.

## What's missing

The full source. Specifically these modules referenced by the bundle:
`src/utils.js`, `src/auth.js`, `src/client.js`, `src/deliverables.js`,
`src/admin.js`, `src/files.js`, `src/leads.js`, `src/frontend.js`,
`src/index.js`. They exist inside the deployed Worker bundle but haven't been
extracted into separate files.

---

## How to fix prices on the live site — three paths

### Path A — Edit in the Cloudflare dashboard (fastest, ~3 minutes)

This is the recommended path right now. The Worker has an inline editor.

1. Go to https://dash.cloudflare.com/c98561adefb602704d4e7a6a1b7e7597/workers/services/view/pymewebpro-portal/production
2. Click **Edit code** (top right).
3. In the file tree on the left, open `src/payments.js`. (If the bundle is
   shown as a single `worker.js`, search inside it for `PLAN_PRICES_COP`.)
4. Find:
   ```js
   var PLAN_PRICES_COP = {
     esencial: 89e4,
     pro: 179e4
   };
   ```
5. Change to:
   ```js
   var PLAN_PRICES_COP = {
     esencial: 39e4,
     pro: 69e4
   };
   ```
6. Click **Save and deploy**.
7. Verify: open `https://portal.pymewebpro.com/c/<any-existing-lead-id>` and
   confirm the displayed total reflects the new price.

That's it. Wompi will charge the new amount on the next checkout.

### Path B — Reconstruct full source and `wrangler deploy` (slow, but proper)

Only if you want the source repo back.

1. From the Cloudflare dashboard, download the deployed Worker code (Quick
   Edit → copy whole bundle).
2. Save as `src/index.js` in this folder (replacing the bundle's single-file
   layout — the `// src/<module>.js` comments inside mark each module's start).
3. Optionally split each module back into its own `src/*.js` file using those
   markers as boundaries.
4. Apply the same `PLAN_PRICES_COP` edit shown in Path A.
5. Install wrangler: `npm install -g wrangler`
6. Login: `wrangler login`
7. Set secrets (one-time — values are in the dashboard under Settings →
   Variables → "Edit secret"):
   ```
   wrangler secret put ADMIN_TOKEN      --name pymewebpro-portal
   wrangler secret put RESEND_API_KEY   --name pymewebpro-portal
   wrangler secret put WOMPI_PUBLIC_KEY --name pymewebpro-portal
   wrangler secret put WOMPI_INTEGRITY  --name pymewebpro-portal
   wrangler secret put WOMPI_EVENTS     --name pymewebpro-portal
   ```
8. Deploy: `wrangler deploy`

### Path C — Treat the deployed bundle as source

The bundle is self-contained. Save it as `src/index.js`, edit the price
constants in place, and `wrangler deploy` with the `wrangler.toml` here.
Less clean than Path B but faster.

---

## Bindings reference (already configured on the live Worker)

| Binding | Type | Resource | ID |
|---|---|---|---|
| `DB` | D1 | `pymewebpro-portal` | `93fc7e21-713c-4479-bb55-69ae05c275dc` |
| `TOKENS` | KV | `pymewebpro-portal-TOKENS` | `47573834bfad418aa10b8f851a250a03` |
| `ASSETS` | R2 | `pymewebpro-client-assets` | (bucket name only) |

## Vars / secrets used

Plain-text vars (in `wrangler.toml`):
`APP_URL`, `FROM_EMAIL`, `ADMIN_EMAIL`, `WHATSAPP_NUMBER`

Secrets (only set via `wrangler secret put`):
`ADMIN_TOKEN`, `RESEND_API_KEY`, `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY`, `WOMPI_EVENTS`

---

## Why marketing site + portal must change in lockstep

The marketing site at `pymewebpro.com` shows the price on the pricing cards
(`index.html`). The portal at `portal.pymewebpro.com/c/<lead_id>` computes the
actual amount Wompi will charge.

If they disagree, buyers see one number on the marketing site, a different
number at checkout — refund / chargeback bait. As of 2026-04-30 the marketing
site has been updated to 390k / 690k. **The portal has not been updated yet.**
Until you do Path A above, hold off on pushing the marketing site to
production (or at least don't drive paid traffic to it).
