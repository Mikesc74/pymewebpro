# Patch: add the mockup engine to pymewebpro-portal

This adds mockup generation, signed share links, comment widget, and ship-to-Pages
on top of the existing portal worker — without disturbing payments, intake, auth,
or the admin panel that's already running.

## What's already done (by the engine kickoff)

- D1 tables `mockups`, `mockup_shares`, `mockup_comments` created in
  `pymewebpro-portal` (id `93fc7e21-713c-4479-bb55-69ae05c275dc`).
  See `mockups-schema.sql` for the DDL.
- Two new source files:
  - `portal/src/blueprint.js` — parameterized landing template
  - `portal/src/mockups.js` — module that adds all the new routes

## What you do — three options

### Option A — Cloudflare dashboard inline editor (fastest, ~10 min)

The existing portal source was lost locally; you can edit the deployed bundle in
place. Adding the new module is a copy/paste job.

1. Open https://dash.cloudflare.com/c98561adefb602704d4e7a6a1b7e7597/workers/services/view/pymewebpro-portal/production/edit
2. In the file tree on the left, **add a new file** `blueprint.js` and paste the
   contents of `portal/src/blueprint.js` from this folder.
3. Add another new file `mockups.js` and paste the contents of `portal/src/mockups.js`.
4. Open `index.js` (or whichever file owns the top-level `fetch` handler).
   Near the top, add the import:
   ```js
   import { handleMockups } from "./mockups.js";
   ```
5. In the main `fetch(request, env, ctx)` handler, **before** the SPA fallthrough,
   insert:
   ```js
   const mockupResp = await handleMockups(request, env, ctx, {
     json, isAdmin, randomToken, uuid, sha256, escapeHtml,
   });
   if (mockupResp) return mockupResp;
   ```
   These helper names match what's already exported from your `utils.js`.
6. Add the new env secrets in Settings → Variables → Secrets:
   - `ANTHROPIC_API_KEY` (required for real generation; falls back to a dumb
     copy-only generator if missing, useful for testing)
   - `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (only needed when you
     actually ship to Pages)
7. **Save and deploy.**

### Option B — Reconstruct full source, then `wrangler deploy`

The recovered source is at `portal/src/index.js` (pulled from the live worker).
Lines 1-879 are bundler polyfills you can delete; the real code starts at the
first `// src/<module>.js` marker.

1. Split the bundle by `// src/<name>.js` markers into separate files
   (`utils.js`, `auth.js`, `client.js`, `deliverables.js`, `admin.js`,
   `files.js`, `leads.js`, `payments.js`, `frontend.js`, `index.js`).
2. Add `blueprint.js` and `mockups.js` from this folder.
3. Add the import + dispatcher hook to `index.js` as in Option A step 5.
4. `wrangler deploy` from `portal/`.

### Option C — Treat the bundle as a single source file

If splitting is too fiddly, just paste the contents of `mockups.js` and
`blueprint.js` directly at the bottom of the recovered `index.js` (above the
final `export default { fetch ... }`). Add the dispatcher hook. Deploy.

## New routes added

Public (signed share token in URL):

| Method | Path                          | Purpose                              |
|--------|-------------------------------|--------------------------------------|
| GET    | `/m/<token>/`                 | Mockup viewer + comment widget       |
| GET    | `/m/<token>/asset/<name>`     | Logo/photo asset for the mockup      |
| POST   | `/api/m/<token>/comment`      | Client submits a comment             |

Admin (Bearer ADMIN_TOKEN):

| Method | Path                                                    | Purpose                          |
|--------|---------------------------------------------------------|----------------------------------|
| POST   | `/api/admin/clients/<clientId>/mockups`                 | Generate new mockup version      |
| GET    | `/api/admin/clients/<clientId>/mockups`                 | List versions for a client       |
| GET    | `/api/admin/mockups/<id>`                               | Get one mockup + shares + comments |
| POST   | `/api/admin/mockups/<id>/share`                         | Mint a 7-day share link          |
| POST   | `/api/admin/mockups/<id>/regenerate`                    | Re-run with optional `instruction` body |
| GET    | `/api/admin/mockups/<id>/comments`                      | List comments                    |
| POST   | `/api/admin/mockups/<id>/ship`                          | Mark shipped + create Pages project |

## Admin SPA — minimum changes

The portal's admin panel is a React SPA in `frontend.js`. To expose the new
routes you'll add a small "Mockups" panel inside the existing client detail
view (`/admin/clients/:id`). Minimum useful UI:

- "Generar mockup" button → `POST /api/admin/clients/:id/mockups` → on success,
  navigate to the share-link panel
- For each mockup: "Compartir" → `POST /api/admin/mockups/:id/share` → display
  copy-able URL
- For each mockup: "Comentarios" → list from `GET /api/admin/mockups/:id/comments`
- For each mockup: "Lanzar final" → `POST /api/admin/mockups/:id/ship`

You can ship without this UI by using `curl` against the admin endpoints with
your `ADMIN_TOKEN` while the panel is being built.

## Flow recap (post-patch)

```
client pays via Wompi
  → existing webhook converts lead → client (status=invited)
  → existing magic-link email → client completes intake (submissions table)
  → client clicks "Submit" (status=submitted)
  → YOU open admin panel, click "Generar mockup"
  → mockup HTML written to R2 under mockups/<clientId>/<mockupId>/
  → YOU click "Compartir" → copy link → send to client (WhatsApp/email)
  → client opens /m/<token>/ → reviews → leaves comments via floating widget
  → YOU read comments in admin panel → click "Regenerar" with notes
  → repeat until happy
  → YOU click "Lanzar final" → Pages project created → shipped_url returned
```

## What's still v2

- Full Pages direct-upload (currently just creates the project shell + marks
  shipped). The R2 bundle exists; you can run `wrangler pages deploy` against
  it manually for now.
- Domain attach (POST to `/accounts/.../pages/projects/<name>/domains` once DNS
  points at Cloudflare).
- Upsells flow + second Wompi checkout for revisions / extra pages.
- Admin SPA UI for mockups.
- Image bg-removal for ugly logo uploads.

## Why we did it this way

The standalone `engine/` folder built earlier in the session duplicated the
portal's payments + intake + auth — separate D1, separate R2, separate Wompi
secrets. Two checkout systems would have been a refund/chargeback bait. The
graft keeps payments and customers in one database and adds only what the
portal genuinely lacked: the mockup generator, the share-link viewer, and the
ship-to-Pages action.
