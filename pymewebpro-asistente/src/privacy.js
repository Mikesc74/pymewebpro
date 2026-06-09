// privacy.js — public privacy notice (Colombia, Ley 1581 de 2012 · Habeas Data).
// Routes: GET /privacidad (ES), GET /privacy (EN). Linked from the widget.

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const STYLE = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,system-ui,-apple-system,sans-serif;background:#f4f4f4;color:#1a1a1a;line-height:1.65;font-size:15px}
  .wrap{max-width:680px;margin:0 auto;padding:48px 24px}
  h1{font-size:24px;margin-bottom:6px;letter-spacing:-.02em}
  .sub{color:#888;font-size:13px;margin-bottom:28px}
  h2{font-size:16px;margin:26px 0 8px}
  p{margin-bottom:10px;color:#333}
  a{color:#1d4ed8}
  .lang{margin-bottom:24px;font-size:13px}
  .foot{margin-top:36px;color:#aaa;font-size:12px;border-top:1px solid #e3e3e3;padding-top:16px}
`;

export function handlePrivacy(request, env) {
  const url = new URL(request.url);
  const lang = url.pathname.startsWith('/privacy') ? 'en' : 'es';
  const contact = env.PRIVACY_CONTACT || 'hola@pymewebpro.com';
  const html = lang === 'en' ? en(contact) : es(contact);
  return new Response(`<!DOCTYPE html><html lang="${lang}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${lang === 'en' ? 'Privacy Policy' : 'Politica de Privacidad'} · Angela</title>
    <style>${STYLE}</style></head><body><div class="wrap">${html}</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function es(contact) {
  return `
    <div class="lang"><b>Espanol</b> · <a href="/privacy">English</a></div>
    <h1>Politica de Privacidad</h1>
    <div class="sub">Asistente de chat "Angela" · operado por Norte Sur Consulting S.A.S. (PymeWebPro)</div>
    <p>Esta politica explica como tratamos tus datos cuando interactuas con el asistente de chat de un negocio, ya sea en su sitio web o por WhatsApp. Cumple con la Ley 1581 de 2012 (Habeas Data) de Colombia.</p>
    <h2>Quien es el responsable</h2>
    <p>Norte Sur Consulting S.A.S., NIT 901.956.771-1, Medellin, Colombia. El asistente "Angela" es la herramienta; el negocio con el que chateas es el responsable de tus datos y nosotros los tratamos en su nombre.</p>
    <h2>Que datos recopilamos</h2>
    <p>Cuando escribes al asistente guardamos el contenido de la conversacion y, si los compartes, tu nombre, numero de telefono o correo. En WhatsApp recibimos tu numero y tu nombre de perfil. No recopilamos datos sensibles de forma intencional; por favor no los compartas en el chat.</p>
    <h2>Para que los usamos</h2>
    <p>Para responder tus consultas, conectarte con el negocio, dar seguimiento a tu solicitud y mejorar el servicio. No vendemos tus datos.</p>
    <h2>Cuanto tiempo los conservamos</h2>
    <p>Conservamos las conversaciones mientras sean necesarias para atender tu solicitud y por el tiempo que el negocio lo requiera para su operacion. Puedes pedir su eliminacion en cualquier momento.</p>
    <h2>Tus derechos</h2>
    <p>Tienes derecho a conocer, actualizar, rectificar y suprimir tus datos, y a revocar la autorizacion. Para ejercerlos, escribe a <a href="mailto:${esc(contact)}">${esc(contact)}</a> indicando tu solicitud y el negocio con el que chateaste.</p>
    <div class="foot">Norte Sur Consulting S.A.S. · Medellin, Colombia</div>`;
}

function en(contact) {
  return `
    <div class="lang"><a href="/privacidad">Espanol</a> · <b>English</b></div>
    <h1>Privacy Policy</h1>
    <div class="sub">"Angela" chat assistant · operated by Norte Sur Consulting S.A.S. (PymeWebPro)</div>
    <p>This policy explains how we handle your data when you interact with a business's chat assistant, either on its website or over WhatsApp. It follows Colombia's Law 1581 of 2012 (Habeas Data).</p>
    <h2>Who is responsible</h2>
    <p>Norte Sur Consulting S.A.S., NIT 901.956.771-1, Medellin, Colombia. "Angela" is the tool; the business you chat with is the data controller and we process the data on its behalf.</p>
    <h2>What we collect</h2>
    <p>When you message the assistant we store the conversation content and, if you share them, your name, phone number or email. On WhatsApp we receive your number and profile name. We do not intentionally collect sensitive data; please do not share it in the chat.</p>
    <h2>How we use it</h2>
    <p>To answer your questions, connect you with the business, follow up on your request, and improve the service. We do not sell your data.</p>
    <h2>How long we keep it</h2>
    <p>We keep conversations as long as needed to handle your request and for as long as the business requires for its operations. You can ask for deletion at any time.</p>
    <h2>Your rights</h2>
    <p>You have the right to access, update, correct and delete your data, and to withdraw consent. To exercise them, write to <a href="mailto:${esc(contact)}">${esc(contact)}</a> with your request and the business you chatted with.</p>
    <div class="foot">Norte Sur Consulting S.A.S. · Medellin, Colombia</div>`;
}
