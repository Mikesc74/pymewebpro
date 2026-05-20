// manual-mockups.js · registry of mockup slugs served from
// pymewebpro.com/manual-mockups/<slug>/ (Cloudflare Pages).
//
// Previously this file imported the auto-generated `./manual-mockups-*.js`
// modules (each 100KB-1.7MB after photo base64-inlining), exposing them as
// `MANUAL_MOCKUPS[slug]` to be served inline by the worker. That pushed the
// worker bundle over the 3MB free-tier limit on 2026-05-19 and blocked the
// admin SPA fix from deploying.
//
// New architecture (2026-05-19):
//   1. Mockup HTML + photos live in `~/code/pymewebpro/manual-mockups/<slug>/`
//      and are deployed by the pymewebpro.com Cloudflare Pages project on
//      every git push. URL: https://pymewebpro.com/manual-mockups/<slug>/
//   2. The worker no longer bundles the HTML. Slug validation uses the
//      `MOCKUP_SLUGS` set below.
//   3. GET requests to `mockups.pymewebpro.com/<slug>/` 301-redirect to the
//      Pages URL · keeps existing share links working.
//   4. POST API endpoints (chat, lead, contact) still served by the worker.
//      Mockup HTML calls them via absolute URLs (https://mockups.pymewebpro.com/api/...).
//
// To add a new mockup: drop the HTML + assets in
// `~/code/pymewebpro/manual-mockups/<new-slug>/`, add the slug to MOCKUP_SLUGS
// below, git push. No more rebuild-mockups.mjs round-trip.

export const MOCKUP_SLUGS = new Set([
  "blues-kitchen",
  "daga-parfum",
  "blue-whale-international",
  "espacio-dental",
  "marena",
  "start",
  "medellin-guide",
  "medellin-guide-boutique",
  "central-farma-drogueria",
  "revo-cafe",
]);

// Backwards-compat shim: a few callers still read `MANUAL_MOCKUPS[slug]`
// expecting a truthy HTML string. Return a sentinel that's truthy but
// doesn't contain any HTML payload (so it can't accidentally get served).
// Callers should migrate to `MOCKUP_SLUGS.has(slug)` over time.
export const MANUAL_MOCKUPS = new Proxy({}, {
  get(_t, key) {
    if (typeof key !== "string") return undefined;
    return MOCKUP_SLUGS.has(key) ? true : undefined;
  },
  has(_t, key) {
    return typeof key === "string" && MOCKUP_SLUGS.has(key);
  },
  ownKeys() {
    return Array.from(MOCKUP_SLUGS);
  },
  getOwnPropertyDescriptor(_t, key) {
    if (typeof key === "string" && MOCKUP_SLUGS.has(key)) {
      return { enumerable: true, configurable: true, value: true };
    }
    return undefined;
  },
});
