// functions/api/lead.js — Cloudflare Pages Function for the v4 lead form.
//
// Receives the POST from Section 06 (The Ask), validates, honeypot-checks,
// rate-limits per IP via KV (optional), and emails the lead to both founders.
//
// Default recipients (hardcoded fallback):
//   ventas@pymewebpro.com
//   mike@mikec.pro
//
// Environment variables (set in Cloudflare Pages dashboard -> Settings -> Environment variables):
//   RESEND_API_KEY       Required for emails to actually send (https://resend.com)
//   RESEND_FROM          From address (e.g. "PymeWebPro <leads@pymewebpro.com>"). Defaults to onboarding@resend.dev for testing.
//   LEAD_NOTIFY_EMAIL    (Optional) Override recipients, comma-separated. Defaults to ventas@pymewebpro.com,mike@mikec.pro
//   LEAD_WEBHOOK_URL     (Optional) Also POST to a Slack/Discord/Make/Zapier webhook
//
// Optional KV binding (Pages Settings -> Functions -> KV namespace bindings):
//   LEADS_KV             Bind to enable per-IP rate limiting (5 submissions / hour)

const DEFAULT_RECIPIENTS = ["ventas@pymewebpro.com", "mike@mikec.pro"];
const DEFAULT_FROM = "PymeWebPro Leads <onboarding@resend.dev>"; // override with RESEND_FROM once DNS verified

const ALLOWED_ORIGINS = [
  "https://pymewebpro.com",
  "https://www.pymewebpro.com",
  "https://mockups.pymewebpro.com",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin")) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

  let data;
  try {
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const fd = await request.formData();
      data = Object.fromEntries(fd.entries());
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers });
  }

  // Honeypot: real humans never fill this hidden field.
  if (data.company_website && String(data.company_website).trim().length > 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  // Validate
  const required = ["name", "email", "about"];
  const missing = required.filter(k => !data[k] || String(data[k]).trim().length === 0);
  if (missing.length) {
    return new Response(JSON.stringify({ error: "Missing fields: " + missing.join(", ") }), { status: 400, headers });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers });
  }

  // Rate limit per IP (5/hour) if KV is bound
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.LEADS_KV) {
    const key = "rl:" + ip;
    const count = parseInt((await env.LEADS_KV.get(key)) || "0", 10);
    if (count >= 5) {
      return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers });
    }
    await env.LEADS_KV.put(key, String(count + 1), { expirationTtl: 3600 });
  }

  const country = request.headers.get("CF-IPCountry") || "XX";
  const ua = request.headers.get("User-Agent") || "";
  const ts = new Date().toISOString();
  const referer = request.headers.get("Referer") || "";

  const lead = {
    ts,
    ip,
    country,
    referer,
    name: String(data.name).slice(0, 200),
    email: String(data.email).slice(0, 200),
    about: String(data.about).slice(0, 3000),
    ua,
  };

  // Always log so leads are recoverable from wrangler tail even if email fails.
  console.log("[lead]", JSON.stringify(lead));

  // Email via Resend
  let emailSent = false;
  if (env.RESEND_API_KEY) {
    const recipients = (env.LEAD_NOTIFY_EMAIL || DEFAULT_RECIPIENTS.join(","))
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const from = env.RESEND_FROM || DEFAULT_FROM;
    const subject = "New lead: " + lead.name + " (" + lead.country + ")";
    const html = "<h2>New PymeWebPro lead</h2>"
      + "<p><b>Name:</b> " + esc(lead.name) + "</p>"
      + '<p><b>Email:</b> <a href="mailto:' + esc(lead.email) + '">' + esc(lead.email) + "</a></p>"
      + "<p><b>About:</b><br>" + esc(lead.about).replace(/\n/g, "<br>") + "</p>"
      + (lead.referer ? "<p><b>Came from:</b> " + esc(lead.referer) + "</p>" : "")
      + '<hr><p style="color:#888;font-size:12px">' + esc(lead.country) + " &middot; " + esc(lead.ip) + " &middot; " + esc(lead.ts) + "</p>";
    const text = [
      "New PymeWebPro lead (" + lead.country + ")",
      "",
      "Name:  " + lead.name,
      "Email: " + lead.email,
      "",
      "About:",
      lead.about,
      "",
      lead.referer ? "Came from: " + lead.referer : "",
      "",
      lead.country + " | " + lead.ip + " | " + lead.ts,
    ].filter(Boolean).join("\n");
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: recipients,
          reply_to: lead.email,
          subject,
          html,
          text,
        }),
      });
      emailSent = resp.ok;
      if (!resp.ok) {
        const body = await resp.text();
        console.error("[lead] resend failed:", resp.status, body);
      }
    } catch (e) {
      console.error("[lead] resend error:", e && e.message);
    }
  } else {
    console.warn("[lead] RESEND_API_KEY not set; lead logged but not emailed");
  }

  // Optional secondary webhook (Slack / Discord / Make / Zapier)
  if (env.LEAD_WEBHOOK_URL) {
    const text = [
      "*New PymeWebPro lead* (" + lead.country + ")",
      "*Name:* " + lead.name,
      "*Email:* " + lead.email,
      "*About:* " + lead.about,
      "_at_ " + lead.ts,
    ].join("\n");
    try {
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, content: text, lead }),
      });
    } catch (e) {
      console.error("[lead] webhook error:", e && e.message);
    }
  }

  return new Response(JSON.stringify({ ok: true, emailSent }), { status: 200, headers });
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
