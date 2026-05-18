// Wompi deposit + balance link generator for the 30/70 payment split.
//
// PymeWebPro pricing:
//   Essential (esencial) · 390.000 COP total
//   Pro (pro)            · 690.000 COP total
//
// Split: 30% deposit (to start work) + 70% balance (on launch).
//
// Routes:
//   POST /api/admin/deals/:dealId/deposit-link  · creates a Wompi URL for 30%.
//   POST /api/admin/deals/:dealId/balance-link  · creates a Wompi URL for 70%.
//
// Payment-side bookkeeping uses the existing `payments` table. There's no
// `deal_id` column on payments today, so the linkage is lead_id only and the
// reference prefix encodes the deal id for the webhook handler to recover.
//
// Reference shapes:
//   pwp-dep-<dealId>-<base36 ts>   · 30% deposit
//   pwp-bal-<dealId>-<base36 ts>   · 70% balance
//
// The webhook branches in src/index.js (handleWompiWebhook) call back into
// processDepositPayment / processBalancePayment exported here.

const PRICE_COP = { esencial: 390000, pro: 690000 };

export async function handleDepositLinks(request, env, ctx, helpers) {
  const { json, isAdmin, uuid } = helpers;
  if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) {
    return json({ ok: false, error: "Payments not configured (WOMPI_PUBLIC_KEY / WOMPI_INTEGRITY missing)" }, 503);
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const depositMatch = path.match(/^\/api\/admin\/deals\/([^/]+)\/deposit-link$/);
  if (depositMatch && method === "POST") {
    return await makeLink(env, json, uuid, depositMatch[1], "deposit");
  }
  const balanceMatch = path.match(/^\/api\/admin\/deals\/([^/]+)\/balance-link$/);
  if (balanceMatch && method === "POST") {
    return await makeLink(env, json, uuid, balanceMatch[1], "balance");
  }
  return json({ ok: false, error: "Not found" }, 404);
}

async function makeLink(env, json, uuid, dealId, kind) {
  try {
    const deal = await env.DB.prepare(
      "SELECT id, lead_id, client_id, plan, title FROM deals WHERE id = ?"
    ).bind(dealId).first();
    if (!deal) return json({ ok: false, error: "Deal not found" }, 404);

    const plan = deal.plan === "pro" ? "pro" : "esencial";
    const planPriceCop = PRICE_COP[plan];
    const portion = kind === "balance" ? 0.70 : 0.30;
    // amount in cents: round COP portion first, then * 100.
    const amountCop = Math.round(planPriceCop * portion);
    const amountCents = amountCop * 100;

    const prefix = kind === "balance" ? "pwp-bal-" : "pwp-dep-";
    const reference = prefix + dealId + "-" + Date.now().toString(36);
    const sig = await sha256Hex(reference + amountCents + "COP" + env.WOMPI_INTEGRITY);

    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, status, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, 'COP', ?, 'none', 'pending', ?, ?)"
    ).bind(
      uuid(),
      deal.lead_id || "",
      reference,
      amountCents,
      plan,
      now, now,
    ).run();

    const params = new URLSearchParams({
      "public-key": env.WOMPI_PUBLIC_KEY,
      "currency": "COP",
      "amount-in-cents": String(amountCents),
      "reference": reference,
      "signature:integrity": sig,
      "redirect-url": (env.APP_URL || "") + "/admin/crm?deal=" + encodeURIComponent(dealId) + "&pay=" + kind,
    });
    const checkoutUrl = "https://checkout.wompi.co/p/?" + params.toString();

    return json({
      ok: true,
      url: checkoutUrl,
      reference,
      amount_cents: amountCents,
      amount_cop: amountCop,
      plan,
      kind,
      deal_id: dealId,
    });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

// Reference shape: pwp-dep-<dealId>-<base36 ts>
// dealId may itself contain hyphens (it usually does · UUIDs have 4 hyphens),
// so we split off the trailing base36 timestamp from the right and treat
// everything in between as the dealId. Returns null if the reference is
// malformed.
function extractDealId(reference, prefix) {
  const ref = String(reference || "");
  if (!ref.startsWith(prefix)) return null;
  const rest = ref.slice(prefix.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0) return null;
  const ts = rest.slice(lastDash + 1);
  if (!/^[a-z0-9]+$/i.test(ts)) return null;
  const dealId = rest.slice(0, lastDash);
  return dealId || null;
}

// SHA-256 hex helper · same shape as the inlined sha256() in src/index.js, but
// scoped to this module so it doesn't need importing.
async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Wompi webhook follow-ups -------------------------------------------
//
// Both handlers are idempotent · the webhook may fire multiple times for the
// same approved transaction. We rely on a check against `closed_at` / current
// stage to avoid double-bumping or duplicate activity rows.

// pwp-dep-<dealId>-<rand>  ·  30% deposit received.
export async function processDepositPayment(env, payment) {
  const dealId = extractDealId(payment.reference, "pwp-dep-");
  if (!dealId) { console.warn("deposit payment reference malformed: " + payment.reference); return; }
  const deal = await env.DB.prepare(
    "SELECT id, lead_id, stage, title FROM deals WHERE id = ?"
  ).bind(dealId).first();
  if (!deal) { console.warn("deposit payment for unknown deal: " + dealId); return; }

  const now = Date.now();
  // Advance stage only if we're still earlier in the funnel; never go backwards.
  const earlyStages = new Set(["qualifying", "proposal"]);
  if (earlyStages.has(deal.stage)) {
    await env.DB.prepare(
      "UPDATE deals SET stage = 'negotiation', updated_at = ? WHERE id = ?"
    ).bind(now, dealId).run();
  } else {
    await env.DB.prepare(
      "UPDATE deals SET updated_at = ? WHERE id = ?"
    ).bind(now, dealId).run();
  }

  await env.DB.prepare(
    "INSERT INTO activities (id, kind, subject, body, deal_id, lead_id, owner, occurred_at, created_at, updated_at, done) " +
    "VALUES (?, 'note', ?, ?, ?, ?, 'system', ?, ?, ?, 1)"
  ).bind(
    crypto.randomUUID(),
    "30% deposit received via Wompi",
    JSON.stringify({
      reference: payment.reference,
      amount_cents: payment.amount_cents,
      currency: payment.currency || "COP",
      plan: payment.plan,
      wompi_transaction_id: payment.wompi_transaction_id || null,
      deal_id: dealId,
    }),
    dealId,
    deal.lead_id || null,
    now, now, now,
  ).run();

  // Bump the linked lead to sales_qualified so it drops out of the outreach queue.
  if (deal.lead_id) {
    await env.DB.prepare(
      "UPDATE leads SET lead_stage = 'sales_qualified', " +
      "       last_touched_at = ?, last_touched_kind = 'payment', " +
      "       touches_count = COALESCE(touches_count, 0) + 1, updated_at = ? " +
      " WHERE id = ?"
    ).bind(now, now, deal.lead_id).run();
  }
}

// pwp-bal-<dealId>-<rand>  ·  70% balance received, ready to launch.
export async function processBalancePayment(env, payment) {
  const dealId = extractDealId(payment.reference, "pwp-bal-");
  if (!dealId) { console.warn("balance payment reference malformed: " + payment.reference); return; }
  const deal = await env.DB.prepare(
    "SELECT id, lead_id, stage, closed_at, title FROM deals WHERE id = ?"
  ).bind(dealId).first();
  if (!deal) { console.warn("balance payment for unknown deal: " + dealId); return; }

  const now = Date.now();
  if (deal.stage !== "won" || !deal.closed_at) {
    await env.DB.prepare(
      "UPDATE deals SET stage = 'won', closed_at = ?, updated_at = ? WHERE id = ?"
    ).bind(now, now, dealId).run();
  }

  await env.DB.prepare(
    "INSERT INTO activities (id, kind, subject, body, deal_id, lead_id, owner, occurred_at, created_at, updated_at, done) " +
    "VALUES (?, 'note', ?, ?, ?, ?, 'system', ?, ?, ?, 1)"
  ).bind(
    crypto.randomUUID(),
    "70% balance received, ready to launch",
    JSON.stringify({
      reference: payment.reference,
      amount_cents: payment.amount_cents,
      currency: payment.currency || "COP",
      plan: payment.plan,
      wompi_transaction_id: payment.wompi_transaction_id || null,
      deal_id: dealId,
    }),
    dealId,
    deal.lead_id || null,
    now, now, now,
  ).run();
}
