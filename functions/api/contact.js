// Cloudflare Pages Function: receives form POSTs, emails the lead to Mike,
// sends an auto-confirmation back to the customer, AND forwards the lead
// to the PymeWebPro Portal so it shows up in /admin/leads.
//
// Required environment variable (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY   — from resend.com (free tier covers 3,000 emails/mo)
// Optional:
//   ADMIN_EMAIL      — defaults to mike@mikec.pro
//   FROM_EMAIL       — defaults to "PymeWebPro <noreply@pymewebpro.com>"
//   PORTAL_URL       — defaults to https://portal.pymewebpro.com

const escape = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function sendEmail(env, payload) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text}`);
  }
  return resp.json();
}

// Content-type sniffing: native <form> POSTs are application/x-www-form-urlencoded
// (or multipart/form-data); the JS fetch from main.js sends application/json.
// We support both so the form still works with JS disabled.
const isFormPost = (req) => {
  const ct = req.headers.get("content-type") || "";
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
};

// Build a Response that either redirects (for native form posts — Post-Redirect-Get
// so a reload doesn't resubmit) or returns JSON (for JS fetch).
const respond = (request, formMode, jsonBody, redirectTo, status = 200) => {
  if (formMode) {
    const target = new URL(redirectTo || "/gracias.html", request.url).toString();
    return Response.redirect(target, 303);
  }
  return new Response(JSON.stringify(jsonBody), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const formMode = isFormPost(request);

  let data;
  try {
    if (formMode) {
      const form = await request.formData();
      data = Object.fromEntries(form);
    } else {
      data = await request.json();
    }
  } catch {
    return respond(
      request,
      formMode,
      { error: "invalid_body" },
      "/gracias.html?error=invalid",
      400
    );
  }

  // Honeypot — bots auto-fill any field they see. If the hidden 'website'
  // field has any value, silently 200 without sending or storing anything.
  if (data.website || data.url_field) {
    return respond(request, formMode, { success: true }, "/gracias.html");
  }

  // Required fields
  if (!data.nombre || !data.email || !data.whatsapp) {
    return respond(
      request,
      formMode,
      { error: "missing_fields" },
      "/gracias.html?error=missing",
      400
    );
  }

  // No API key configured: log & return graceful failure so frontend falls back to WhatsApp
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return respond(
      request,
      formMode,
      { error: "email_not_configured" },
      "/gracias.html?error=email",
      503
    );
  }

  const ADMIN_EMAIL = env.ADMIN_EMAIL || "mike@mikec.pro";
  const FROM_EMAIL = env.FROM_EMAIL || "PymeWebPro <noreply@pymewebpro.com>";

  const adminHtml = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0a1840;max-width:560px">
      <h2 style="color:#003893;margin-top:0">Nuevo lead desde pymewebpro.com</h2>
      <table style="border-collapse:collapse;width:100%;margin:14px 0">
        <tr><td style="padding:6px 0;color:#5e6883;width:140px">Nombre</td><td><strong>${escape(data.nombre)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#5e6883">Negocio</td><td>${escape(data.negocio || "-")}</td></tr>
        <tr><td style="padding:6px 0;color:#5e6883">Correo</td><td><a href="mailto:${escape(data.email)}">${escape(data.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#5e6883">WhatsApp</td><td><a href="https://wa.me/${escape(String(data.whatsapp).replace(/[^0-9]/g, ""))}">${escape(data.whatsapp)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#5e6883">Tipo de negocio</td><td>${escape(data.tipo || "-")}</td></tr>
        <tr><td style="padding:6px 0;color:#5e6883">Plan que le interesa</td><td><strong>${escape(data.plan || "No especificado")}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#5e6883">Plan Hosting</td><td><strong>${escape(data.hosting || "No especificado")}</strong></td></tr>
      </table>
      <h3 style="color:#003893;font-size:15px;margin-bottom:6px">Mensaje</h3>
      <p style="background:#f5f0e0;padding:14px;border-radius:8px;margin:0">${escape(data.mensaje || "(sin mensaje adicional)")}</p>
      <hr style="border:none;border-top:1px solid #e5e0c9;margin:24px 0">
      <p style="color:#5e6883;font-size:13px;margin:0">Responda a este correo para escribirle directamente a ${escape(data.nombre)}.</p>
    </div>
  `;

  const customerHtml = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1840;max-width:560px">
      <h2 style="color:#003893;margin-top:0">¡Gracias, ${escape(data.nombre)}!</h2>
      <p>Recibimos su mensaje y le responderemos <strong>hoy mismo</strong> por correo o WhatsApp.</p>
      <p>Si quiere adelantar la conversación, también puede escribirnos directo:</p>
      <p style="margin:18px 0">
        <a href="https://wa.me/573014047722" style="background:#25d366;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Escribir por WhatsApp →</a>
      </p>
      <p>Un saludo,<br><strong>El equipo de PymeWebPro</strong></p>
      <hr style="border:none;border-top:1px solid #e5e0c9;margin:24px 0">
      <p style="color:#5e6883;font-size:12px;margin:0">Este es un mensaje automático de pymewebpro.com. No es necesario responder.</p>
    </div>
  `;

  try {
    // 1. Notify admin (with reply-to set to the lead's email)
    await sendEmail(env, {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Nuevo lead PymeWebPro: ${data.nombre} (${data.negocio || data.tipo || "sin detalle"})`,
      html: adminHtml,
      reply_to: data.email,
    });

    // 2. Auto-confirmation to customer (don't fail the whole request if this fails)
    try {
      await sendEmail(env, {
        from: FROM_EMAIL,
        to: data.email,
        subject: "¡Recibimos su mensaje! · PymeWebPro",
        html: customerHtml,
      });
    } catch (err) {
      console.error("Customer confirmation failed:", err.message);
    }

    // 3. Forward the lead to the PymeWebPro Portal so it shows up in /admin/leads.
    //    silent_notify:true so the portal doesn't send its own admin email
    //    (Mike already got the rich one above).
    let leadId = null;
    try {
      const portalUrl = (env.PORTAL_URL || "https://portal.pymewebpro.com").replace(/\/$/, "");
      const portalRes = await fetch(`${portalUrl}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "contact_form",
          name: data.nombre,
          email: data.email,
          phone: data.whatsapp,
          business_name: data.negocio || null,
          message: data.mensaje || null,
          language: "es",
          page: data.page || "/",
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          extra: {
            tipo: data.tipo || null,
            plan: data.plan || null,
            hosting: data.hosting || null,
          },
          silent_notify: true,
        }),
      });
      if (portalRes.ok) {
        const portalData = await portalRes.json().catch(() => ({}));
        leadId = portalData.lead_id || null;
      }
    } catch (err) {
      // Don't fail the user request if the portal forward fails — they already
      // got their auto-confirmation and Mike already got the lead email.
      console.error("Portal lead forward failed:", err.message);
    }

    // Build the redirect URL to the confirmation/pay page if we got a lead_id
    // back from the portal AND they selected a chargeable plan.
    const portalUrl = (env.PORTAL_URL || "https://portal.pymewebpro.com").replace(/\/$/, "");
    const planText = String(data.plan || "").toLowerCase();
    const hasPaidPlan =
      planText.includes("esencial") ||
      planText.includes("crecimiento") ||
      planText.includes("growth") ||
      planText.includes("pro");
    const confirmUrl = leadId && hasPaidPlan ? `${portalUrl}/c/${leadId}` : null;

    return respond(
      request,
      formMode,
      { success: true, lead_id: leadId, confirm_url: confirmUrl },
      confirmUrl || "/gracias.html"
    );
  } catch (err) {
    console.error("Lead capture failed:", err.message);
    return respond(
      request,
      formMode,
      { error: "send_failed" },
      "/gracias.html?error=send",
      500
    );
  }
}

// Block other methods
export const onRequest = ({ request }) =>
  new Response("Method not allowed", { status: 405 });
