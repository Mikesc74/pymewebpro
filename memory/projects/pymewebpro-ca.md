# Project · PymeWebPro CA (the studio's own NA-market site)

**Slug:** `pymewebpro-ca`
**Live URL:** mockups.pymewebpro.com/pymewebpro-ca/
**Module:** `portal/src/manual-mockups-pymewebproca.js` (~67 KB)

## What it is

PymeWebPro pitching itself to the Canadian / North American SMB market. Meta-site: a site that pitches what it sells, hosted on the same stack it sells.

## Pricing on display

- **Essential** $500 CAD one-time (1 yr hosting)
- **Pro** $800 CAD one-time (2 yr hosting + bilingual + integrations + 3 mo edits)
- Anchored against "Toronto Agency $4,500–$12,000 CAD"

## Logo system (THIS site uses the new logo)

- Header + footer: `<pymewebpro/>` bracket-locked wordmark (Inter Tight bold + JetBrains Mono brackets in muted gray)
- Favicon: `<pwp/>` SVG data URI (white pwp on dark bg, orange brackets) — embedded as `data:image/svg+xml,...` link
- No `[P] pymewebpro .com` lockup anymore (deprecated)

## Sections

1. **Top bar** — "Now booking July 2026 · 48-hour delivery · From $500 CAD"
2. **Header** — `<pymewebpro/>` logo + Menu items + "Get a Quote" CTA
3. **Hero** — "Enterprise-grade websites at small-business prices." with metric badges (Lighthouse 100/100/100, LCP <0.9s, A+, 48hr) + faux production dashboard (LCP 0.84s, Lighthouse 100, 330+ edge, 99.99% uptime)
4. **Logos strip** — "Built on the same stack as: Cloudflare · Anthropic · Stripe · Linear · Vercel"
5. **Tech stack** — 6 items + sticky sidebar with Lighthouse 100s
6. **Pricing** — Essential $500 / Pro $800 (featured dark card)
7. **The Honest Pitch** — 3 pillars (Geography / Tooling / Stack)
8. **Process** — 4 steps × 48 hours
9. **Recent Work** — 5 portfolio cards with **live thum.io screenshots** + "your site +6 days" 6th slot
10. **Comparison** — Toronto Agency $8,500 vs PymeWebPro Pro $800 (with red X overlay + "Not us" stamp on agency card)
11. **FAQ** — 8 items including "is it really $500", "Canadian-owned but built in Medellín", "what does Anthropic AI mean", revisions, ownership, French, ongoing edits, e-comm
12. **Final CTA** — dark, 20-min call, "no contract until you say go"
13. **Footer** — Canadian registered + Medellín ops + Cloudflare/Anthropic stack callouts

## Honesty caveats vs the "Canadian-owned" framing

This site says "Canadian-owned" which is true. It does NOT (yet) claim:
- "Canadian Inc." or "registered Canadian entity"
- "Full North American legal recourse"

Mike runs as Canadian-citizen sole proprietor with Wise Business CAD + USD accounts. To upgrade the framing fully, he'd register a Canadian sole proprietorship (~$60 CAD, ~30 min online).

Pending edits if Mike wants stronger Canadian framing later:
- Footer: "Registered in Canada" → "Canadian-owned · CAD/USD via Wise Business" (already done in some sections)
- Add payment line: "CAD or USD pricing · Pay via credit card or wire to our Wise account"

## Screenshots in portfolio

The 5 portfolio cards use **thum.io** for live URL screenshots:
```
https://image.thum.io/get/width/1200/crop/750/https://mockups.pymewebpro.com/<slug>/
```

Each card is also clickable and opens the live mockup in a new tab. First load takes ~3 sec while thum.io renders & caches; subsequent loads are instant.

If thum.io rate-limits or feels stale: switch to a paid screenshot API (urlbox, screenshotmachine ~$10/mo) or take manual screenshots and base64-embed them.

## Color/type (echoes brand.md but specific to this site)

- BG `#FFFFFF`, paper `#FAF9F6`, ink `#0A0A0B`
- Accent `#FF5C2E` (warm orange — Cloudflare-ish + maple-ish)
- Inter Tight + JetBrains Mono pairing
- Border-radius 10px
- Section padding `clamp(80px, 9vw, 130px)`

## Recent edits

- 2026-05: portfolio swapped from text-only previews to live thum.io screenshots
- 2026-05: changed "90 days" to "30 days" in portfolio section head
- 2026-05: added red X overlay + "Not us" stamp on Toronto Agency comparison card
- 2026-05: replaced [P] logo with `<pymewebpro/>` bracket wordmark + `<pwp/>` favicon
