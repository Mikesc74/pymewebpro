// src/payments.js
// Pricing, Wompi checkout creation, and webhook handling for the PymeWebPro portal.
// Reconstructed from the deployed bundle of `pymewebpro-portal` Worker on 2026-04-30.
//
// LAUNCH-OFFER PRICING (2026-04-30):
//   Esencial: 390.000 COP  (was 890.000)
//   Crecimiento (key=pro): 690.000 COP  (was 1.790.000)
// Hosting prices unchanged.
// 24-hour $100k discount DISABLED — the launch-offer pricing IS the discount.
// Setting WINDOW=0 means `now < deadline` is always false → discount_active = false
// → countdown banner and discount row are conditionally hidden in confirmationHtml.

import { sha256, uuid, randomToken, json } from "./utils.js";
import { sendEmail, logEvent } from "./utils.js";
import { paidInviteEn, paidInviteEs } from "./emails.js"; // see note in README

const DISCOUNT_WINDOW_MS = 0;
const DISCOUNT_AMOUNT_COP = 0;

const PLAN_PRICES_COP = {
  esencial: 390_000,    // launch offer — was 890_000
  pro: 690_000,         // launch offer — was 1_790_000 (display name: "Crecimiento")
};

const HOSTING_PRICES_COP = {
  annual: 270_000,
  monthly: 0,           // billed separately, not on Wompi
  none: 0,
};

export function computeQuote(lead) {
  const plan = lead.plan;
  const hosting = lead.hosting || "none";
  const planPrice = PLAN_PRICES_COP[plan] || 0;
  let hostingPrice = HOSTING_PRICES_COP[hosting] || 0;
  const hostingBundled = plan === "pro" && hosting === "annual";
  if (hostingBundled) hostingPrice = 0;

  const now = Date.now();
  const deadline = (lead.created_at || 0) + DISCOUNT_WINDOW_MS;
  const discountActive = planPrice > 0 && now < deadline;
  const discount = discountActive ? DISCOUNT_AMOUNT_COP : 0;
  const subtotal = planPrice + hostingPrice;
  const total = Math.max(0, subtotal - discount);

  return {
    plan,
    hosting,
    plan_price_cop: planPrice,
    hosting_price_cop: hostingPrice,
    hosting_bundled: hostingBundled,
    discount_active: discountActive,
    discount_cop: discount,
    discount_deadline: deadline,
    subtotal_cop: subtotal,
    total_cop: total,
    total_cents: total * 100, // Wompi expects cents
    currency: "COP",
    chargeable: planPrice > 0, // false if plan unknown
  };
}

export function planLabel(plan, lang = "es") {
  if (plan === "esencial") return "Plan Esencial";
  if (plan === "pro") return lang === "es" ? "Plan Crecimiento" : "Growth Plan";
  return lang === "es" ? "Plan no seleccionado" : "No plan selected";
}

export function hostingLabel(hosting, lang = "es") {
  if (lang === "es") {
    return ({ annual: "Hosting anual", monthly: "Hosting mensual", none: "Sin hosting" }[hosting]) || "Sin hosting";
  }
  return ({ annual: "Annual hosting", monthly: "Monthly hosting", none: "No hosting" }[hosting]) || "No hosting";
}

export function formatCop(amount) {
  return "$" + Math.round(amount).toLocaleString("es-CO");
}

// --- HTTP handlers --------------------------------------------------------

export async function handleConfirmPage(request, env, leadId) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return new Response(notFoundHtml(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const quote = computeQuote(lead);
  const lang = lead.language || "es";
  const url = new URL(request.url);
  const justReturned = url.searchParams.get("status") === "back";

  const lastPayment = await env.DB.prepare(
    "SELECT * FROM payments WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(leadId).first();

  const html = confirmationHtml({ lead, quote, lang, lastPayment, justReturned });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

export async function handleCreateCheckout(request, env, leadId) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
  if (!lead) return json({ error: "Lead not found" }, 404);

  const quote = computeQuote(lead);
  if (!quote.chargeable) {
    return json({ error: "Plan no seleccionado. Por favor escríbanos por WhatsApp para confirmar su plan." }, 400);
  }
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY) {
    return json({ error: "Payments not configured" }, 503);
  }

  const reference = `pwp-${leadId}-${Date.now().toString(36)}`;
  const amountInCents = quote.total_cents;
  const currency = "COP";
  const signaturePayload = `${reference}${amountInCents}${currency}${env.WOMPI_INTEGRITY}`;
  const signature = await sha256(signaturePayload);

  const paymentId = uuid();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO payments (id, lead_id, reference, amount_cents, currency, plan, hosting, discount_applied, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(
    paymentId, leadId, reference, amountInCents, currency,
    quote.plan, quote.hosting, quote.discount_active ? 1 : 0, now, now,
  ).run();

  const redirectUrl = `${env.APP_URL}/c/${leadId}?status=back`;
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    "currency": currency,
    "amount-in-cents": String(amountInCents),
    "reference": reference,
    "signature:integrity": signature,
    "redirect-url": redirectUrl,
  });
  if (lead.email) params.set("customer-data:email", lead.email);
  if (lead.name || lead.business_name) params.set("customer-data:full-name", lead.name || lead.business_name);
  if (lead.phone) params.set("customer-data:phone-number", String(lead.phone).replace(/[^0-9]/g, ""));

  const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;
  return json({
    ok: true,
    checkout_url: checkoutUrl,
    reference,
    amount_cents: amountInCents,
    discount_applied: quote.discount_active,
  });
}

export async function handleWompiWebhook(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const sig = body.signature || {};
  const props = Array.isArray(sig.properties) ? sig.properties : [];
  const timestamp = body.timestamp;
  if (!sig.checksum || !timestamp || !props.length || !env.WOMPI_EVENTS) {
    return json({ error: "Invalid signature payload" }, 400);
  }

  const concat = props.map((path) => {
    const parts = path.split(".");
    let v = body.data;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  }).join("");

  const expected = await sha256(concat + timestamp + env.WOMPI_EVENTS);
  if (expected.toLowerCase() !== String(sig.checksum).toLowerCase()) {
    console.error("Wompi webhook signature mismatch", { expected, got: sig.checksum });
    return json({ error: "Invalid signature" }, 401);
  }

  const tx = body.data?.transaction || {};
  const reference = tx.reference;
  const wompiId = tx.id;
  const status = (tx.status || "").toLowerCase();
  if (!reference) return json({ ok: true, ignored: "no reference" });

  const payment = await env.DB.prepare("SELECT * FROM payments WHERE reference = ?").bind(reference).first();
  if (!payment) {
    console.warn("Wompi event for unknown reference", reference);
    return json({ ok: true, ignored: "unknown reference" });
  }

  const now = Date.now();
  const newStatus = ["approved", "declined", "voided", "error", "pending"].includes(status) ? status : "pending";
  const paidAt = newStatus === "approved" ? now : null;
  await env.DB.prepare(
    `UPDATE payments
       SET wompi_transaction_id = ?,
           status = ?,
           paid_at = COALESCE(paid_at, ?),
           raw_event = ?,
           updated_at = ?
     WHERE id = ?`
  ).bind(wompiId || null, newStatus, paidAt, JSON.stringify(body), now, payment.id).run();

  if (newStatus === "approved") await convertLeadOnApproval(env, payment);
  return json({ ok: true, status: newStatus });
}

async function convertLeadOnApproval(env, payment) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(payment.lead_id).first();
  if (!lead) return;
  if (lead.status === "converted" && lead.converted_client_id) return;
  if (!lead.email || !lead.email.includes("@")) return;

  const existing = await env.DB.prepare("SELECT id FROM clients WHERE email = ?").bind(lead.email).first();
  let clientId;
  const now = Date.now();
  const lang = lead.language || "es";
  const businessName = lead.business_name || lead.name || null;

  if (existing) {
    clientId = existing.id;
  } else {
    clientId = uuid();
    await env.DB.prepare(
      `INSERT INTO clients (id, email, business_name, status, language, plan, created_at, updated_at, invited_by)
       VALUES (?, ?, ?, 'invited', ?, ?, ?, ?, ?)`
    ).bind(clientId, lead.email, businessName, lang, payment.plan || lead.plan || null, now, now, env.ADMIN_EMAIL || "admin").run();

    const token = randomToken(32);
    await env.TOKENS.put(`magic:${token}`, clientId, { expirationTtl: 60 * 60 * 24 * 7 });
    const loginUrl = `${env.APP_URL}/auth/verify?token=${token}`;
    const subject = lang === "es" ? "Pago recibido — comencemos su sitio web" : "Payment received — let's start your site";
    const html = lang === "es" ? paidInviteEs(loginUrl, businessName) : paidInviteEn(loginUrl, businessName);
    try { await sendEmail(env, { to: lead.email, subject, html }); }
    catch (e) { console.error("Paid invite email failed:", e); }
  }

  await env.DB.prepare(
    `UPDATE leads SET status = 'converted', converted_client_id = ?, updated_at = ? WHERE id = ?`
  ).bind(clientId, now, payment.lead_id).run();

  await logEvent(env, clientId, "payment_approved", {
    payment_id: payment.id,
    amount_cents: payment.amount_cents,
    plan: payment.plan,
    hosting: payment.hosting,
  });

  if (env.ADMIN_EMAIL) {
    try {
      await sendEmail(env, {
        to: env.ADMIN_EMAIL,
        subject: `💰 Payment received: ${businessName || lead.email}`,
        html: `<div style="font-family:Georgia,serif;padding:24px">
          <h2>Payment approved on Wompi</h2>
          <p><strong>${businessName || "(no business)"}</strong> — ${lead.email}</p>
          <p>Plan: <strong>${payment.plan}</strong> · Hosting: <strong>${payment.hosting}</strong></p>
          <p>Amount: <strong>${formatCop(payment.amount_cents / 100)} COP</strong>${payment.discount_applied ? " (discount applied)" : ""}</p>
          <p>Wompi tx: ${payment.wompi_transaction_id || "(pending)"}</p>
          <p><a href="${env.APP_URL}/admin/clients/${clientId}">Open client →</a></p>
        </div>`,
      });
    } catch (e) { console.error("Admin payment notify failed:", e); }
  }
}

// --- HTML helpers ---------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function notFoundHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>No encontrado · PymeWebPro</title>
  <style>body{font-family:Georgia,serif;background:#0a0e27;color:#fff;text-align:center;padding:80px 20px;margin:0}h1{color:#fbbf24;font-style:italic}</style></head>
  <body><h1>PymeWebPro</h1><p>No encontramos esta página.</p><p><a href="https://pymewebpro.com" style="color:#fbbf24">Volver al inicio</a></p></body></html>`;
}

// confirmationHtml() and statusPage() — see deployed bundle (lines 2398-2613).
// Omitted here for brevity; reconstruct from bundle if a full source rebuild is needed.
