# Stitch · skip by default

We tested Google Stitch (`stitch.withgoogle.com`) on 2026-05-28 and decided NOT to make it part of the mockup pipeline. This doc exists so future Claude sessions don't re-litigate the decision.

## Why we skip it

- **Output looks templated.** Generic hero photo, orange CTA, three-icon trust row, "© 2024" footer. Every PymeWebPro mockup that ships looks recycled if we use this. Our studio's edge is bespoke design · Stitch undercuts it.
- **It invents content.** In the test run it fabricated a brand name ("Directo & Claro") and a social-proof stat ("Más de 200 negocios confían"). We can't ship that. Honest-framing rule.
- **It can't read the brand sources.** No IG access, no website read, no logo extraction. The visual decisions that make a mockup feel custom come from studying the brand · Stitch doesn't.
- **Port cost is the same.** Output is React/Tailwind. Our pipeline is inline-CSS HTML. We hand-port either way, and writing from scratch is faster than translating.
- **Claude in Cowork already does the visual decisions.** Palette, type pairing, section density · same speed, with the brand sources actually read.

## When it might still be worth it

Rare. Use only for:
- True greenfield brainstorming when the brief gives zero direction AND no brand sources exist.
- Showing Santi 2-3 palette/typography directions when neither of us has an opinion yet (a hand-coded comp does this better; Stitch is the lazy fallback).

If neither applies, skip Stitch entirely and go straight to `manual-mockups/<slug>/index.html`.

## The script is still here

`portal/scripts/stitch-prompt.mjs` builds a Stitch-ready prompt from a brief. It's preserved as opt-in. Run it manually if one of the rare cases above applies:

```bash
pbpaste | node portal/scripts/stitch-prompt.mjs
# or
node portal/scripts/stitch-prompt.mjs --slug my-slug --name "My Business" --sector "..." --voice "..." --colors "#..." --lang es
```

The prompt encodes our hard constraints (Spanish-primary, no em dashes, banned-word list, COP-only pricing, chat-first CTAs, mobile-first, no template palettes) · use it instead of pasting briefs raw.

Treat any Stitch output as a reference image only, never a build artifact. Strip all invented brand names, stats, dates, and copy before porting. The chat widget, JSON-LD, CSP, base64 image pipeline, and hamburger drawer live in our codebase · Stitch knows nothing about them.

## Decision log

- 2026-05-28 · added to pipeline as Step 3.5 in CLAUDE.md (x114).
- 2026-05-28 · same-day reversal after live test on a Central Farma brief: output was generic, invented content, and offered no acceleration over writing the HTML directly. Demoted to edge-case tool. Step 3.5 removed from CLAUDE.md.
