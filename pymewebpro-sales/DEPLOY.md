# Deploy · ventas.pymewebpro.com

The rep-facing sales hub deploys to **ventas.pymewebpro.com** as a Cloudflare Pages project, gated by Cloudflare Access (you + Santi + sales reps). The Cowork sandbox has no Cloudflare credentials, so you run these on your machine.

## What gets deployed (and what does not)

`build-site.py` assembles a `dist/` folder with only the rep-facing material:

- `index.html` (the hub), `configurador.html`, `one-pager.html`, `PymeWebPro-Funnels.pdf`
- `docs/*.html` (rulebook, qualification, scope, add-on menu, script, generated from the markdown)
- `_headers` (noindex + basic hardening)

Never deployed (stay in the repo, Mike/Santi only): `internal/production-reconciliation.md`, `internal/visual-style-direction.md`, `README.md`, `one-pager-print.html`, `build-site.py`, `DEPLOY.md`.

## 1. Build

```bash
cd ~/code/pymewebpro-sales
python3 -m pip install markdown --break-system-packages   # once
python3 build-site.py
```

This regenerates `dist/`. Re-run it after editing any source file (the configurator, the docs, the hub).

## 2. Regenerate the PDF (only if you edit `one-pager-print.html`)

The PDF is already built. Only re-run this if you change the print source.

```bash
cd ~/code/pymewebpro-sales
python3 -m pip install weasyprint --break-system-packages   # once
export PATH="$PATH:$HOME/.local/bin"
python3 -c "from weasyprint import HTML; HTML('one-pager-print.html').write_pdf('PymeWebPro-Funnels.pdf')"
python3 build-site.py   # copy the new PDF into dist/
```

## 3. Create the Pages project (first time only)

```bash
cd ~/code/pymewebpro-sales
npx wrangler pages project create pymewebpro-ventas --production-branch main
```

## 4. Deploy

```bash
cd ~/code/pymewebpro-sales
npx wrangler pages deploy dist --project-name pymewebpro-ventas
```

This prints a `*.pages.dev` URL. Confirm it loads, then attach the custom domain.

## 5. Custom domain

Cloudflare dashboard is the reliable path:

1. Dashboard -> Workers & Pages -> `pymewebpro-ventas` -> Custom domains -> Set up a custom domain.
2. Enter `ventas.pymewebpro.com`. Cloudflare auto-creates the CNAME on the pymewebpro.com zone.

## 6. Gate it with Cloudflare Access (do this BEFORE sharing the URL)

Until this is on, the site is public. Set it up first.

1. Dashboard -> Zero Trust -> Access -> Applications -> Add an application -> Self-hosted.
2. Application domain: `ventas.pymewebpro.com`.
3. Policy: Allow. Include -> Emails -> add `mike@...`, `santiago@...`, and each sales rep's email. As you hire reps, add their email to this one policy (no redeploy needed).
4. Save. Test in an incognito window: you should hit the Access login before the hub loads.

You can mirror the same identity provider already used for `colguides.com/portal/*`.

## 7. Log it (studio discipline)

After it is live, add the new surface to the platform docs:

- `~/code/PLATFORM.md`: new Pages project `pymewebpro-ventas` at `ventas.pymewebpro.com` (Access-gated: Mike + Santi + reps), serves the internal sales hub. Add to the domains table and the static-sites table.
- A Recent changes note wherever you track this folder.

## Updating later

Edit the source files in `~/code/pymewebpro-sales/`, then:

```bash
cd ~/code/pymewebpro-sales
python3 build-site.py
npx wrangler pages deploy dist --project-name pymewebpro-ventas
```

The one-pager PDF link, the configurador, and all docs update on the next deploy. `functions/` at the project root is uploaded automatically by `wrangler pages deploy`.

---

## Comisiones tracker · first-time setup

The Comisiones tab at `/comisiones/` needs a D1 database and a binding on the Pages project. One-time steps:

### 1. Create the D1 database

```bash
cd ~/code/pymewebpro-sales
npx wrangler d1 create pymewebpro-commissions-db
```

Wrangler prints a `database_id`. Paste it into `wrangler.toml` (replace `REPLACE_AFTER_WRANGLER_D1_CREATE`).

### 2. Apply migrations (run BOTH against `--remote`)

```bash
cd ~/code/pymewebpro-sales
npx wrangler d1 execute pymewebpro-commissions-db --remote --file=migrations/0001_commissions_init.sql
npx wrangler d1 execute pymewebpro-commissions-db --remote --file=migrations/0002_seed_sellers.sql
```

The seed inserts Mike + Santi as admins. Add more sellers from the admin UI.

### 3. Bind the D1 database to the Pages project

```bash
cd ~/code/pymewebpro-sales
npx wrangler pages deploy dist --project-name pymewebpro-ventas
```

Wrangler reads `wrangler.toml` and sets the `DB` binding + `ADMIN_EMAILS` var on the project. (If the dashboard ever shows the binding missing, set it manually under Workers & Pages -> `pymewebpro-ventas` -> Settings -> Functions -> D1 database bindings: variable `DB` -> database `pymewebpro-commissions-db`.)

### 4. Verify identity flow

Open `https://ventas.pymewebpro.com/comisiones/` in an incognito window. Cloudflare Access should prompt for login, then the dashboard should show your name and the role pill (`admin` for Mike/Santi). If you see "No se pudo cargar", check that your email is in the Access policy for `ventas.pymewebpro.com`.

### 5. Add a new salesperson

1. Add their email to the Access policy for `ventas.pymewebpro.com` (Zero Trust -> Access -> Applications -> the ventas app -> Policy -> add email).
2. In the Comisiones panel, Equipo tab -> "+ Agregar vendedor" -> paste the same email and their name.
3. Their first login will work as soon as both are done.

### 6. Day-to-day use

- Each rep adds their prospects, records sales (auto-stages prospect to `ganado`), and registers monthly recurring charges as they happen.
- Admin marks payouts as paid on the day you actually transfer to the rep (after day 31 for initial sales). The dashboard shows `▶ Listo` for amounts eligible to pay today.
- Refunds within the 30-day MBG window: admin clicks Devolver on the sale. Any pending recurring is auto-voided. If the rep was already paid, the UI warns you that clawback is needed.
