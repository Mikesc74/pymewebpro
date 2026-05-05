# Project · Schedulator

**Slug:** `schedulator`
**Live URL:** mockups.pymewebpro.com/schedulator/
**Real domain:** schedulator.net (redirects to schedulator2.vercel.app — SvelteKit app)
**Module:** `portal/src/manual-mockups-schedulator.js` (~45 KB) — converted from inline `renderSchedulator()` function to standard JS module pattern in v21.
**Source HTML:** `manual-mockups/schedulator/index.html`

## Client

- **Patrick Detzner** · founder
- patrick.detzner@gmail.com
- Based: USA
- Legal entity: **Streamline Swimming Solutions LLC** (footer credit)

## What it actually is — corrected

A focused single-purpose tool for laying out an **elementary school's year-long specials schedule.** Drag-and-drop layout, with cross-side instant updates (move a class on the grade side, the specialist's schedule auto-updates).

**Think of it as:** a specialized Google Sheets that does one thing — schedule specials — and does it well.

## What it is NOT (do not fabricate these)

These are anti-features. Mike accidentally added them in earlier mockup versions and Patrick course-corrected:

| ❌ Don't claim | Reality |
|----------------|---------|
| FERPA compliance | Not applicable — no student data |
| SIS integration (PowerSchool, Infinite Campus) | None, intentionally |
| CSV roster import | None |
| Teacher absence handling | Not in scope — only handles the static yearly schedule |
| Real-time collaboration | None |
| Parent-facing portal | None |
| Sharing options | None — workflow ends with PDF export emailed to staff |
| Multi-user editing | Single-user only |
| District-wide reporting | None |
| "Auto-detects conflicts" | Not framed this way — it's just visual clarity from cross-side updates |

## Real product features

- **Two views:** Schedule View + Set Up View (toggle Alt+V)
- **Configurable:** unlimited specials, grade levels, teachers, blocks (with rename and recolor)
- **Default + Alternate Blocks:** for Pre-K shorter classes, Wednesday early-release, etc.
- **The Wand Tool:** click-to-fill / click-to-clear — fastest way to lay out empty schedule
- **Click-then-Click Swap:** select a class, click another, swap positions. Different behavior on grade-side (specials swap) vs specials-side (grade/teacher swap)
- **Drop-down assignment:** click a cell to pick a special; right-click for block-time override
- **Cloud Save (paid):** schedules saved to user account, accessible from any browser, multiple drafts/copies
- **JSON Download/Upload (free):** portability for demo users; handoff between accounts
- **Print to PDF:** the canonical export — staff get the schedule as an emailed PDF
- **Keyboard shortcuts:** Alt+V (view), Alt+S (save), Alt+C (copy), Alt+O (open), Alt+D (download), Alt+U (upload), Alt+P (print)

## Live URLs

- **App:** `https://schedulator.net` → redirects to `https://schedulator2.vercel.app/`
- **Demo:** `https://schedulator.net/demo` (full app, no save-to-cloud)
- **Login (Stripe signup):** `https://schedulator.net/login`
- **About + Tutorial routes:** `https://schedulator.net/about`, `/tutorial`

The app is a SvelteKit SPA. All routes 200-respond and are client-rendered.

## Marketing site structure (v21)

Patrick wants the marketing site to mirror his original 4-section format:

1. **Header** — color-coded nav (Demo=red, About=purple, Tutorial=blue, Login=green) — these match the Specials brand colors
2. **Hero** — un-angled screenshot via thum.io of `schedulator.net/demo`
3. **Demo section** — explains free demo, CTA → `schedulator.net/demo`
4. **About section** — Patrick's actual founder origin story (PE teacher, watched colleague spend dozens of hours)
5. **Tutorial section** — 6-card breakdown of the specialized tools (Wand, Swap, Block-Time Override, Default+Alt Blocks, Cloud Save, Print/Portability) — NOT a full walkthrough since most users figure out basics in 10 min
6. **Login / Pricing section** — two cards: Free Demo ($0) vs Subscription ($5/mo placeholder, "TBD on Stripe"). CTA → `schedulator.net/login`
7. **Contact section** — form sends to `patrick.detzner@gmail.com`. Has a "I'd like to schedule a meeting" toggle. Email > Calendly per Patrick's preference (US audience, email is more ubiquitous than WhatsApp)
8. **FAQ** — 8 honest answers including factual corrections about FERPA/SIS/sharing/absences
9. **Footer** — © 2026 Streamline Swimming Solutions LLC

## Brand identity (Schedulator-specific)

- **Aesthetic:** dark, technical, generous whitespace (svelte.dev as reference)
- **Background:** deep navy/black (`#0a0e1a`)
- **Color system:** the four Specials default colors, mapped to the four nav buttons:
  - Demo → red `#ef4444` (also Art default color)
  - About → purple `#a855f7` (also Music default color)
  - Tutorial → blue `#3b82f6` (also PE default color)
  - Login → green `#22c55e` (also STEM default color)
- **Note:** these are *defaults* — users can rename/recolor any special. The site previously claimed "four colors" hard-cap which is wrong.
- **Display:** Inter Tight (700, tight tracking)
- **Body:** Inter
- **Mono:** JetBrains Mono (for nav labels, eyebrows, technical bits)

## Status

- v20 shipped to Patrick (initial pitch)
- v21 (current) — major Patrick-feedback revision:
  - Stripped fabricated FERPA/SIS/absence/CSV claims
  - Restructured to 4-section Demo/About/Tutorial/Login matching original site
  - Real demo + login URLs wired up
  - Patrick's actual About copy used verbatim
  - Tutorial section focuses on specialized tools only
  - Contact form replaces WhatsApp/Calendly (US audience prefers email)
  - Hero screenshot un-angled (thum.io live render)
  - Footer corrected to Streamline Swimming Solutions LLC
- Converted from inline `renderSchedulator()` function to standard JS module pattern (consistent with all other manual mockups)

## Recent history

- 2026-05: v21 rebuild — Patrick-feedback round
- 2026-05: confirmed mockup ready email was successfully sent (after Resend silent-failure bug fix)
- 2026-05: SPA stage routing bug fixed — submitted clients now correctly land on Project Portal instead of wizard
