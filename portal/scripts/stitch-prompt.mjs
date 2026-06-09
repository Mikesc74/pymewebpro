#!/usr/bin/env node
// portal/scripts/stitch-prompt.mjs
//
// Turn a mockup_prospects brief into a Stitch-ready prompt.
// Stitch (stitch.withgoogle.com) generates a multi-screen UI mockup + React
// code from a prompt. We use it as a first-draft accelerator: paste this prompt
// into Stitch, capture the visual direction + sectioning, then port to inline
// CSS HTML at manual-mockups/<slug>/index.html.
//
// Usage:
//   1. From the studio admin, copy the prospect brief as JSON (the "Copy brief"
//      button on /admin/mockups/<slug>) and pipe it in:
//        pbpaste | node portal/scripts/stitch-prompt.mjs
//      → prompt printed to stdout AND copied to clipboard (macOS pbcopy)
//
//   2. Or pass a JSON file:
//        node portal/scripts/stitch-prompt.mjs path/to/brief.json
//
//   3. Or use flags for an ad-hoc prompt (no brief file):
//        node portal/scripts/stitch-prompt.mjs \
//          --slug central-farma-drogueria \
//          --name "Central Farma Droguería" \
//          --sector "Droguería de barrio" \
//          --voice "caregiver, paisa-friendly, warm" \
//          --colors "#1E8F5A,#0F4F3A,#FFD66B" \
//          --lang es \
//          --sections "hero,servicios,inyectologia,domicilios,visitanos"
//
// Output: a single prompt block ready to paste into Stitch's chat.
//
// The prompt encodes our hard constraints (Spanish-primary by default,
// no em dashes, chat-first CTAs, 6-step conversion structure, mobile-first,
// Inter Tight / JetBrains Mono pairing on the studio site itself but per-brand
// pairing for prospect mockups, etc.). The Stitch output is NEVER deployed
// as-is · it informs the design direction; you still hand-write the final
// inline CSS HTML using the rules in CLAUDE.md.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DEFAULT_SECTIONS = [
  "hero",
  "what we do (services or product categories)",
  "social proof (testimonials, reviews, photos)",
  "differentiator (why us, our process, our values)",
  "contact + location (map, hours, WhatsApp, form)",
];

function parseArgs(argv) {
  const args = { flags: {}, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args.flags[key] = true;
      } else {
        args.flags[key] = next;
        i++;
      }
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

function readStdinSync() {
  try {
    const data = readFileSync(0, "utf8");
    return data && data.trim().length ? data : null;
  } catch {
    return null;
  }
}

function loadBrief({ flags, positional }) {
  // 1. file positional arg
  if (positional[0] && existsSync(positional[0])) {
    return JSON.parse(readFileSync(positional[0], "utf8"));
  }
  // 2. stdin (piped JSON from `pbpaste` or the admin "Copy brief" button)
  const stdin = readStdinSync();
  if (stdin) {
    try {
      return JSON.parse(stdin);
    } catch {
      // not JSON · treat as free-form style_brief
      return { style_brief: stdin };
    }
  }
  // 3. flags only · build a minimal brief
  if (flags.slug || flags.name) {
    return {
      slug: flags.slug,
      business_name: flags.name,
      style_brief: [
        flags.sector && `Sector: ${flags.sector}`,
        flags.voice && `Voice: ${flags.voice}`,
        flags.colors && `Colors: ${flags.colors}`,
        flags.notes && `Notes: ${flags.notes}`,
      ]
        .filter(Boolean)
        .join("\n"),
      __sections: flags.sections
        ? flags.sections.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      __lang: flags.lang || "es",
      __colors: flags.colors,
    };
  }
  console.error(
    "stitch-prompt: no brief provided. Pipe JSON via stdin, pass a JSON file, or use --slug/--name flags.",
  );
  process.exit(1);
}

function inferLang(brief, flags) {
  if (flags.lang) return flags.lang;
  if (brief.__lang) return brief.__lang;
  const sb = (brief.style_brief || "").toLowerCase();
  if (/\b(expat|english|bilingual|en\/es)\b/.test(sb)) return "bilingual";
  return "es";
}

function buildPrompt(brief, flags) {
  const lang = inferLang(brief, flags);
  const slug = brief.slug || flags.slug || "(no-slug)";
  const name = brief.business_name || flags.name || "(unnamed business)";
  const sections = brief.__sections || DEFAULT_SECTIONS;
  const styleBrief = (brief.style_brief || "").trim() || "(none provided)";
  const sources = [
    brief.instagram_url && `Instagram: ${brief.instagram_url}`,
    brief.facebook_url && `Facebook: ${brief.facebook_url}`,
    brief.tiktok_url && `TikTok: ${brief.tiktok_url}`,
    brief.website_url && `Existing site: ${brief.website_url}`,
  ]
    .filter(Boolean)
    .join("\n");

  const langLine =
    lang === "en"
      ? "All UI copy in English (for English-speaking Colombian residents / expats)."
      : lang === "bilingual"
        ? "Primary copy in Spanish (Colombia, paisa-friendly when natural). Provide an English secondary version of the same screens · same layout, copy translated."
        : "All UI copy in Spanish (Colombia, paisa-friendly when natural).";

  return `# Stitch design brief · ${name} (${slug})

I am designing a 1-page sales site for a Colombian small business. You are generating the visual direction + sectioning. I will hand-port your output to inline CSS HTML afterwards, so prioritize bold, specific design choices over generic responsive scaffolding.

## Business
- Name: ${name}
- ${langLine}
- Audience: Colombian customers (mobile-first, almost all traffic is from Android phones in Medellín / Bogotá / Cali).
- Money: prices in COP only, format like \`$400.000 COP\` or \`$1.200.000 COP\`. NEVER USD or "$X" alone.

## Brief from the client / studio
${styleBrief}

${sources ? `## Brand sources (study these before designing)\n${sources}\n` : ""}
## Sections to generate (one screen per section)
${sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Visual direction rules
- Pick 4-6 brand-specific hex colors (NOT generic teal/coral defaults). If the brief gives colors, honor them. Otherwise pull from the brand sources above.
- Pick a type pairing that fits the brand archetype (caregiver pharmacy ≠ luxury fragrance ≠ fashion retail ≠ trades/service). Examples of pairings already used by this studio (avoid copying): Inter Tight + JetBrains Mono, Fraunces + Inter, Playfair + Manrope.
- Decide photo-driven vs type-and-icon-driven based on the brand sources. If their Instagram is graphic-heavy badges and callouts, type-and-icon often wins. If they shoot product/people a lot, photo-driven.
- Mobile-first. Design for ~390px width first, then show the same screens at ~1200px.
- Honor \`prefers-reduced-motion\`.

## Hard copy rules (apply to every visible string in your output)
- NEVER use em dashes (—). Use commas, periods, colons, parentheses, or " · ".
- NEVER use these words/phrases: "delve", "tapestry", "navigate" as a metaphor, "in the realm of", "embark on a journey", "a testament to", "stands as", "fast-paced world", "in today's", "leverage" as a verb, "vibrant ecosystem", "unlock", "world-class", "premier", "leading".
- Sentence case headings (not Title Case) unless the brand specifically uses Title Case in their existing materials.
- Use contractions where the language allows.
- No marketing-speak. Plain, honest, specific. Show real numbers when possible.

## CTA pattern (very important)
- Every primary CTA button should read like a chat opener, not a "Send WhatsApp" link. Examples:
  - "Hablemos por chat" / "Talk to us"
  - "Pregúntale a [Owner first name]" / "Ask [Owner first name]"
  - "Agendar llamada" / "Book a 15-min call"
- Reserve raw "WhatsApp" framing for the footer contact card and one error-fallback inside a chat panel. Do NOT plaster "Escríbenos por WhatsApp" across hero + cards + footer · that's the old pattern.
- Show a floating chat FAB on every screen (bottom-right), with a slide-up panel that has an empty message list, an input row, and a "Powered by [Brand]" footer. The panel exists in the design but does not need real chat logic · I'll wire it to our \`/api/chat/${slug}\` endpoint on the HTML port.

## Output I want from you
1. The 5 screens listed above, designed as a single coherent page (think section-by-section).
2. Each screen at mobile (~390px) AND desktop (~1200px) widths.
3. A small style-tile screen at the top: color swatches with hex codes, type specimen with the chosen pairing, button states (default/hover/disabled), 2-3 icon examples.

Do NOT generate the chat widget's internal screens (message list with bot replies, etc). Do NOT generate a 404, settings page, or admin UI. Just the public sales page + style tile.

When you are done, I will read the React you produce as a reference, then I will hand-write the final \`manual-mockups/${slug}/index.html\` using inline CSS · my own constraints around CSP, JSON-LD, and the chat widget plumbing are non-negotiable and live in CLAUDE.md.
`;
}

function copyToClipboard(text) {
  // macOS only · silently no-op elsewhere
  const r = spawnSync("pbcopy", [], { input: text });
  return r.status === 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const brief = loadBrief(args);
  const prompt = buildPrompt(brief, args.flags);
  process.stdout.write(prompt);
  if (process.stdout.isTTY || true) {
    const ok = copyToClipboard(prompt);
    if (ok) {
      process.stderr.write("\n\n✓ prompt copied to clipboard · paste into stitch.withgoogle.com\n");
    } else {
      process.stderr.write("\n\n(pbcopy not available · prompt is above on stdout)\n");
    }
  }
}

main();
