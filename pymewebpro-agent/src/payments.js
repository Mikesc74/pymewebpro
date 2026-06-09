// payments.js · Wompi deposit link creation.
// Mirrors pymewebpro-portal/src/payments.js but ALWAYS charges 30% (deposit
// mode). Writes lead + payment rows into PORTAL_DB so the existing portal
// webhook (handleWompiWebhook) handles approval and conversion identically.

const PLAN_PRICES_COP = {
  esencial: 400_000,
  pro: 690_000,
};

export const PLAN_LABELS = {
  esencial: "La página de ventas",
  pro: "Plan Crecimiento",
};

const DEPOSIT_RATIO = 0.30;

function uuid() { return crypto.randomUUID(); }

export function formatCop(amount) {
  return "$" + Math.round(amount).toLocaleString("es-CO");
}

export function computeDeposit(plan) {
  const planPrice = PLAN_PRICES_COP[plan];
  if (!planPrice) return null;
  const depositCop = Math.round(planPrice * DEPOSIT_RATIO);
  return {
    plan,
    plan_price_cop: planPrice,
    deposit_cop: depositCop,
    deposit_cents: depositCop * 100,
    currency: "COP",
  };
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a deposit-mode Wompi checkout link for the named plan.
 * Inserts a lead in PORTAL_DB.leads and a payment in PORTAL_DB.payments so the
 * existing webhook fires when Wompi approves the deposit.
 *
 * Returns { checkout_url, deposit_cop, plan, lead_id, payment_id, reference }.
 */
export async function createDepositPayment({
  env,
  conversationId,
  plan,
  contactName,
  contactEmail,
  businessName,
  phone,
  language = "es",
}) {
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) {
    throw new Error("WOMPI credentials not configured on pymewebpro-agent");
  }
  const quote = computeDeposit(plan);
  if (!quote) throw new Error(`Unknown plan: ${plan}`);

  const portal = env.PORTAL_DB;
  const leadId = uuid();
  const paymentId = uuid();
  const now = Date.now();

  // 1. Create the lead in PORTAL_DB.leads. Source = 'valentina-agent' so we
  //    can filter these in the portal admin later. metadata holds the
  //    conversation id + deposit flag for traceability.
  const metadata = JSON.stringify({
    source: "valentina-agent",
    conversation_id: conversationId,
    deposit_mode: true,
    deposit_ratio: DEPOSIT_RATIO,
    plan_full_price_cop: quote.plan_price_cop,
  });
  await portal.prepare(
    `INSERT INTO leads (id, source, name, email, phone, business_name, message, language, status, plan, hosting, metadata, created_at, updated_at)
     VALUES (?, 'valentina-agent', ?, ?, ?, ?, ?, ?, 'new', ?, 'none', ?, ?, ?)`
  ).bind(
    leadId,
    contactName || null,
    contactEmail || null,
    phone || null,
    businessName || null,
    `Deposit captured via Valentina (web/WhatsApp). Conversation ${conversationId}.`,
    language,
    plan,
    metadata,
    now, now,
  ).run();

  // 2. Build Wompi reference + signature. The `-dep` suffix marks this as a
  //    deposit-mode payment. The portal webhook treats the reference as
  //    opaque, so this is informational only.
  const reference = `pwp-${leadId}-${now.toString(36)}-dep`;
  const amountInCents = quote.deposit_cents;
  const currency = "COP";
  const signaturePayload = `${reference}${amountInCents}${currency}${env.WOMPI_INTEGRITY}`;
  const signature = await sha256(signaturePayload);

  // 3. Insert the payment row in PORTAL_DB.payments. Status starts pending.
  await portal.prepare(
    `INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, discount_applied, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'none', 0, 'pending', ?, ?)`
  ).bind(paymentId, leadId, reference, amountInCents, currency, plan, now, now).run();

  // 4. Build the Wompi checkout URL.
  const redirectUrl = `${env.APP_URL}/c/${leadId}?status=back`;
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    "currency": currency,
    "amount-in-cents": String(amountInCents),
    "reference": reference,
    "signature:integrity": signature,
    "redirect-url": redirectUrl,
  });
  if (contactEmail) params.set("customer-data:email", contactEmail);
  if (contactName || businessName) params.set("customer-data:full-name", contactName || businessName);
  if (phone) params.set("customer-data:phone-number", String(phone).replace(/[^0-9]/g, ""));

  const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

  // 5. Record the intent in AGENT_DB.deposit_intents for analytics.
  await env.AGENT_DB.prepare(
    `INSERT INTO deposit_intents
       (id, conversation_id, portal_lead_id, portal_payment_id, plan, amount_cop, reference, checkout_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(uuid(), conversationId, leadId, paymentId, plan, quote.deposit_cop, reference, checkoutUrl, now).run();

  return {
    checkout_url: checkoutUrl,
    deposit_cop: quote.deposit_cop,
    plan_full_price_cop: quote.plan_price_cop,
    plan,
    lead_id: leadId,
    payment_id: paymentId,
    reference,
  };
}
