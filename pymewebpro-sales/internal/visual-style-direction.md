# Visual style direction

Internal (English). The look-and-feel rules for every piece of sales collateral. The collateral itself is a sales argument: if it looks like a productized digital company, the prospect believes the product is productized. If it looks like a freelancer's Canva export, no script will recover it.

The feeling we are buying with design: **modern, minimalist, premium, conversion-focused, operationally mature.** A prospect should look at the one-pager and the quote and think "these people have a system," before they read a single word.

---

## Brand system (use exactly this)

This matches the PymeWebPro brand so the collateral and the product feel like one company.

- **Accent:** `#FF5C2E` (orange). One accent only. It marks the brand, the price, and the primary CTA. Nothing else competes with it.
- **Ink (text):** near-black, `#14110F` or similar. Not pure black.
- **Surface:** warm off-white, `#FBF8F4` / `#FFFFFF`. Generous whitespace.
- **Lines / borders:** soft warm grey, low contrast. Hairline borders, not heavy boxes.
- **Type pairing:**
  - Display + body: **Inter Tight** (tight, modern, confident).
  - Mono: **JetBrains Mono** for labels, prices, the `<pymewebpro/>` mark, and anything that should read as "engineered."
- **Brand mark:** `<pymewebpro/>` in mono for headers/footers; `<pwp/>` for tight spaces.
- **Pricing always in COP** with full thousand separators: `$400.000 COP` (the page), `$150.000 COP/mes` (the monthly plan). Never USD/CAD, never abbreviated to "400k" in client-facing surfaces.

## Layout principles

- **Whitespace is the premium signal.** Crowded equals cheap. Let sections breathe.
- **One primary action per screen.** The page funnels to a single CTA, the same way the product does. Practice what we sell.
- **Hairline structure.** Define sections with space and thin rules, not heavy cards, drop shadows, or boxes-in-boxes.
- **Mono for the engineered details.** Prices, plan labels, "approx. 48h," section eyebrows. It signals system and precision.
- **Restrained motion.** A subtle hover or transition is fine. No carousels, no parallax theatrics, no animated counters. Respect `prefers-reduced-motion`.
- **Mobile first.** Reps will open these on a phone in front of a client. It has to look right at 380px.

## Tone of the visuals (and the words on them)

- **Confident, not loud.** "Fixed scope. Live in about 48 hours." beats "AMAZING WEBSITES FAST!!!"
- **Specific, not vague.** Real numbers (sub-1s load, 2 revision rounds, ~48h) beat adjectives.
- **Honest, not aspirational.** No fabricated client counts, no fake testimonials, no "trusted by hundreds."
- **Outcome-led.** The headline is about the client's leads and first impression, not about "websites."

## Hard avoid list

These are the tells of "cheap freelancer" or "generic agency." None of them appear in our collateral.

- Stock-photo handshakes, generic "team at laptops," globe-with-network graphics.
- Gradient-on-gradient backgrounds, neon glows, glassmorphism overload.
- More than one accent color, or rainbow service icons.
- Buzzwords: "world-class," "premier," "leading," "cutting-edge," "vibrant ecosystem," "synergy," "unlock," "leverage" (as a verb), "navigate" (as a metaphor), "in today's fast-paced world," "we are passionate about."
- Walls of text. Long paragraphs where a tight line would do.
- Clip-art icons, emoji as design elements, marquee scrolling bars.
- Drop shadows everywhere, heavy borders, 2012-era card grids.
- Em dashes anywhere. Use commas, periods, colons, parentheses, " · ".
- Any currency that is not COP.

## Quality bar reference

When unsure how a moment should look, match the restraint of the live pymewebpro.com site and the studio's reference mockups (Daga Parfum, BWI, Espacio Dental). Quiet confidence, real photos where photos are needed, hairline structure, one accent, lots of air. That is the bar. If a design choice would look out of place next to those, it is wrong.

## Practical defaults for the HTML pieces

- System font stack fallback if Google Fonts is blocked: `Inter Tight` then `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`; mono falls back to `ui-monospace, SFMono-Regular, Menlo, monospace`.
- Self-contained single file. All CSS in a `<style>` block, all JS in a `<script>` block. No CDN frameworks (no Tailwind CDN, no Bootstrap). Google Fonts link is the only allowed external.
- Accessible: real contrast, focus states on interactive elements, semantic HTML, labels on inputs.
- Print-friendly: the one-pager and a generated quote should print cleanly to PDF for reps who want a leave-behind.
