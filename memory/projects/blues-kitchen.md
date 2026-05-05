# Project · The Blues Kitchen

**Slug:** `blues-kitchen`
**Live URL:** mockups.pymewebpro.com/blues-kitchen/
**Module:** `portal/src/manual-mockups-blueskitchen.js` (~568 KB with embedded photos)

## Client

- Real client (Bogotá events venue)
- Lead form posts to: `/api/lead/c2856181-ef69-41f7-8e6c-59faaa2cab32`
- WhatsApp: 573014047722
- NIT: 902046217-1
- Address: CR 35 No. 16 A Sur 194, Bogotá

## What it is

Wedding & events venue marketing site. Photo gallery, lead form, full Spanish localization. The venue does weddings, fog/dance shows, brand activations — the gallery shows real shots from past events.

## Brand identity

- **Palette:** dark midnight (`#1a1a2e`, `#0f0f1e`) + amber/gold accent (`#fbbf24`)
- **Tone:** dramatic, theatrical, evening
- **Typography:** big bold display + clean body
- **Currency:** COP

## Imagery

8 photos curated from 35+ Instagram screenshots (filtered out portal screenshots that contaminated the original folder):
- `hero-stage.jpg` — stage with concert lights
- `gallery-1-bride-lift.jpg`
- `gallery-2-fog-dance.jpg`
- `gallery-3-confetti.jpg` (largest, 86 KB)
- `gallery-4-cake.jpg` — currently UNUSED in HTML
- `gallery-5-projection.jpg`
- `gallery-6-branding.jpg`
- `gallery-7-decor.jpg`

All base64-embedded in the JS module (single-file, no R2 dependency).

## Notes

- Instagram-source photos are 327–554px wide → can pixelate at hero size. Recommend asking Santiago for hi-res via WhatsApp.
- One CSS unicode escape (`\201C` for left double quote) had to be double-escaped in the JS template literal.
- Footer credit added: "Sitio web por PymeWebPro" with gold link.
