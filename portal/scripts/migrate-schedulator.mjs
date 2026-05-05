#!/usr/bin/env node
// migrate-schedulator.mjs — one-off migration: move Schedulator off the
// embedded MANUAL_MOCKUPS pipeline and into the standard `mockups` table
// served from R2 at manual/<clientId>/<mockupId>/index.html.
//
// PRE-REQUISITES (set as env vars before running):
//   ADMIN_TOKEN  - the production ADMIN_TOKEN secret
//   APP_URL      - https://portal.pymewebpro.com  (default if unset)
//
// Usage from the portal/ directory:
//   ADMIN_TOKEN="$(wrangler secret get ADMIN_TOKEN)" node scripts/migrate-schedulator.mjs
//
// What it does:
//   1. Reads the embedded Schedulator HTML from src/manual-mockups.js
//   2. Generates a new mockup UUID
//   3. POSTs the HTML to /api/admin/clients/<clientId>/manual-mockup/upload
//   4. POSTs to .../manual-mockup/finalize to create the mockup row
//   5. Prints next steps so Mike can SQL-update shipped_at/status afterward
//      (we don't auto-ship; Mike should review the row first.)
//
// Idempotent: if the mockup ID already exists, finalize will short-circuit.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEDULATOR_CLIENT_ID = "8b181604-dc2c-4734-94b9-f6b433c8172a";
const APP_URL = process.env.APP_URL || "https://portal.pymewebpro.com";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("Set ADMIN_TOKEN env var before running.");
  process.exit(1);
}

async function main() {
  const mod = await import(path.join(__dirname, "..", "src", "manual-mockups.js"));
  const html = mod.MANUAL_MOCKUPS.schedulator;
  if (!html || typeof html !== "string") {
    console.error("MANUAL_MOCKUPS.schedulator missing or malformed.");
    process.exit(1);
  }
  const mockupId = crypto.randomUUID();
  console.log("[migrate-schedulator] mockup_id =", mockupId);
  console.log("[migrate-schedulator] html length =", html.length);

  // Step 1: upload index.html
  const uploadUrl = `${APP_URL}/api/admin/clients/${SCHEDULATOR_CLIENT_ID}/manual-mockup/upload`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "text/html; charset=utf-8",
      "X-Mockup-Id": mockupId,
      "X-Filename": "index.html",
    },
    body: html,
  });
  const uploadJson = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    console.error("Upload failed:", uploadRes.status, uploadJson);
    process.exit(1);
  }
  console.log("[migrate-schedulator] upload ok:", uploadJson);

  // Step 2: finalize → create mockup row
  const finalizeUrl = `${APP_URL}/api/admin/clients/${SCHEDULATOR_CLIENT_ID}/manual-mockup/finalize`;
  const finRes = await fetch(finalizeUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mockup_id: mockupId }),
  });
  const finJson = await finRes.json().catch(() => ({}));
  if (!finRes.ok) {
    console.error("Finalize failed:", finRes.status, finJson);
    process.exit(1);
  }
  console.log("[migrate-schedulator] finalize ok:", finJson);

  console.log("\nNEXT STEPS (run via wrangler d1 execute pymewebpro-portal):");
  console.log("  -- Mark this mockup as already shipped to the client and live:");
  console.log(`  UPDATE mockups SET shipped_at = strftime('%s','now'), status='shipped' WHERE id = '${mockupId}';`);
  console.log("\nOptional: also publish via /api/admin/mockups/<id>/ship if you want it under <slug>.sites.pymewebpro.com.");
}

main().catch(e => { console.error(e); process.exit(1); });
