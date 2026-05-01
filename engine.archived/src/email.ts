// Resend email client. Falls back to console.log in dev if no key is set.
import { Env } from "./util";

async function send(env: Env, to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log("[email-disabled]", { to, subject, html });
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: "PymeWebPro <hola@pymewebpro.com>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!r.ok) console.error("resend error", await r.text());
}

export async function sendIntakeInviteEmail(env: Env, to: string, link: string): Promise<void> {
  const html = `<div style="font-family:system-ui;max-width:540px;margin:0 auto;padding:24px;color:#0a1840">
    <h1 style="font-family:Georgia,serif">¡Gracias por su pago!</h1>
    <p>Para empezar a construir su sitio necesitamos algunos datos suyos. El enlace es personal y no caduca:</p>
    <p><a href="${link}" style="display:inline-block;background:#003893;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Subir mis datos</a></p>
    <p style="color:#5e6883;font-size:.9rem">Si no funciona, copie esta dirección en su navegador:<br>${link}</p>
    <p>— Equipo PymeWebPro</p>
  </div>`;
  await send(env, to, "Su sitio web · siguiente paso", html);
}

export async function sendShareLinkToAdmin(env: Env, projectId: string, url: string): Promise<void> {
  const html = `<p>Mockup listo para revisión.</p>
    <p>Proyecto: <code>${projectId}</code></p>
    <p><a href="${url}">${url}</a></p>`;
  await send(env, env.ADMIN_EMAIL, "Mockup listo", html);
}

export async function sendDeliveryEmail(env: Env, to: string, finalUrl: string): Promise<void> {
  const html = `<div style="font-family:system-ui;max-width:540px;margin:0 auto;padding:24px;color:#0a1840">
    <h1 style="font-family:Georgia,serif">¡Su sitio está en línea!</h1>
    <p><a href="${finalUrl}">${finalUrl}</a></p>
    <p>En las próximas horas recibirá las instrucciones de soporte y renovación.</p>
  </div>`;
  await send(env, to, "Su sitio está en línea", html);
}
