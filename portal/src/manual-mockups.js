// manual-mockups.js — hand-written, fully-inlined static HTML mockups
// served from mockups.pymewebpro.com/<slug>/.
//
// These bypass the PYME auto-generator (which is tuned for Colombian
// small businesses) so we can hand-craft polished marketing sites for
// US/B2B clients whose product, tone, and audience don't fit that mold.
//
// Each entry is keyed by URL slug. The value is a complete HTML document
// (DOCTYPE → </html>) with every CSS rule and JS line inlined; only
// fonts and images may be loaded from external CDNs. To add a new mockup,
// write a render function below and append it to the MANUAL_MOCKUPS map
// at the bottom — no other code changes required.

import { bluesKitchenHtml } from "./manual-mockups-blueskitchen.js";
import { dagaParfumHtml } from "./manual-mockups-dagaparfum.js";
import { blueWhaleHtml } from "./manual-mockups-bluewhale.js";
import { espacioDentalHtml } from "./manual-mockups-espaciodental.js";
import { pymewebproCaHtml } from "./manual-mockups-pymewebproca.js";
import { pymewebproV1Html } from "./manual-mockups-pymewebprov1.js";
import { schedulatorHtml } from "./manual-mockups-schedulator.js";
import { marenaHtml } from "./manual-mockups-marena.js";
import { startHtml } from "./manual-mockups-start.js";

// ─── Registry ───────────────────────────────────────────────────────────────
// Keys must be lowercase, URL-safe slugs (a-z, 0-9, hyphen). Each value is a
// fully-rendered HTML string, served as-is from mockups.pymewebpro.com/<slug>/.

export const MANUAL_MOCKUPS = {
  schedulator: schedulatorHtml,
  "blues-kitchen": bluesKitchenHtml,
  "daga-parfum": dagaParfumHtml,
  "blue-whale-international": blueWhaleHtml,
  "espacio-dental": espacioDentalHtml,
  "pymewebpro-ca": pymewebproCaHtml,
  "pymewebpro-v1": pymewebproV1Html,
  marena: marenaHtml,
  start: startHtml,
};
