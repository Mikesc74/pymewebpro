// Cloudflare Pages Function: receives form POSTs, emails the lead to Mike,
// and sends an auto-confirmation back to the customer.
//
// Required environment variable (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY  — from resend.com (free tier covers 3,000 emails/mo)
// Optional:
//   ADMIN_EMAIL     — defaults to mike@mikec.pro
//   FROM_EMAIL      — defaults to "PymeWebPro <noreply@pymewebpro.com>"

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

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Required fields
  if (!data.nombre || !data.email || !data.whatsapp) {
    return new Response(
      JSON.stringify({ error: "missing_fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // No API key configured: log & return graceful failure so frontend falls back to WhatsApp
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "email_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Lead capture failed:", err.message);
    return new Response(JSON.stringify({ error: "send_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Block other methods
export const onRequest = ({ request }) =>
  new Response("Method not allowed", { status: 405 });
