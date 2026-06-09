// portal.js — client-facing dashboard (bilingual ES/EN)
// Routes: GET /portal, POST /portal/login, GET /portal/*, GET /portal/api/*
// Language: cookie `pwp_lang` (es|en), default es. Toggle in the header.

import { sendWhatsAppText } from './wa-send.js';
import { handleAdmin } from './admin.js';
import { encryptToken } from './cryptoutil.js';

const SESSION_TTL = 60 * 60 * 8; // 8 hours

/* ---- i18n ---- */

function getLang(request) {
  const c = request.headers.get('Cookie') || '';
  const m = c.match(/pwp_lang=(es|en)/);
  return m ? m[1] : 'es';
}

const T = {
  es: {
    menu: 'Menu', dashboard: 'Dashboard', conversations: 'Conversaciones',
    knowledge: 'Conocimiento', settings: 'Configuracion', install: 'Instalar widget',
    how_to: 'Como usar', by: 'por PymeWebPro',
    // dashboard
    dash_sub: 'Resumen de la semana', st_convs: 'Conversaciones', st_leads: 'Prospectos',
    st_to_wa: 'A WhatsApp', st_appts: 'Citas agendadas', last7: 'ultimos 7 dias',
    recent: 'Conversaciones recientes', no_convs: 'Aun no hay conversaciones',
    // conversations
    convs_sub: 'Tus chats de la web y de WhatsApp, en un solo lugar',
    who_wa: 'WhatsApp', who_web: 'Visitante web', no_messages: 'Sin mensajes',
    badge_attn: 'Necesita atencion', badge_human: 'Tu respondes', badge_new: 'Nuevo',
    search_ph: 'Buscar por nombre, numero o texto...', search_btn: 'Buscar', no_results: 'Sin resultados',
    f_open: 'Abiertas', f_attention: 'Necesita atencion', f_unread: 'Sin leer', f_closed: 'Cerradas', f_all: 'Todos',
    close_conv: 'Cerrar', reopen_conv: 'Reabrir',
    delete_data: 'Eliminar datos de esta conversacion',
    confirm_delete: 'Eliminar de forma permanente todos los mensajes de esta conversacion? Esta accion no se puede deshacer.',
    // detail
    back: 'Volver a la bandeja', loading: 'Cargando...', reply_ph: 'Escribe una respuesta...',
    send: 'Enviar', contact_wa: 'Contacto de WhatsApp', contact_web: 'Visitante web',
    pill_human: 'Tu llevas el chat', pill_bot: 'El asistente responde',
    btn_return: 'Devolver al asistente', btn_take: 'Tomar el control',
    hint_paused: 'El asistente esta en pausa. Tus respuestas van directo a la persona.',
    hint_active: 'El asistente responde solo. Si escribes una respuesta, tomas el control.',
    who_you: 'Tu', who_assistant: 'Asistente',
    not_delivered_24h: 'No entregado · pasaron mas de 24h, el cliente debe escribir primero',
    not_delivered: 'No entregado',
    attachment: 'Archivo adjunto',
    // time
    t_now: 'ahora',
    // knowledge
    know_sub: 'Lo que sabe tu asistente',
    know_desc: 'Escribe aqui todo lo que el asistente necesita saber sobre tu negocio: productos, precios, zonas de entrega, horarios, preguntas frecuentes. Cuanto mas detalle, mejores respuestas.',
    know_label: 'Informacion del negocio',
    know_ph: 'Ejemplo:\nProductos: arreglos florales, bouquets, coronas.\nPrecios: desde $80.000 COP.\nZona de entrega: Medellin y area metropolitana.\nHorario: lunes a sabado 8am - 6pm...',
    save: 'Guardar cambios', saving: 'Guardando...', saved: 'Cambios guardados.',
    save_err: 'Error al guardar.', err: 'Error.',
    // settings
    set_sub: 'Ajustes de tu asistente',
    bot_name_label: 'Nombre del asistente',
    bot_name_hint: 'El nombre que ven tus clientes en el chat. Puedes ponerle el que prefieras.',
    wa_pub_label: 'WhatsApp del negocio (publico)',
    wa_pub_hint: 'El numero al que el asistente envia a los clientes. Incluye el codigo de pais.',
    booking_label: 'Enlace para agendar citas',
    booking_hint: 'Tu enlace de Cal.com, Calendly u otro. Si lo pones, el asistente ofrece este enlace cuando alguien quiere agendar. Si lo dejas vacio, usa un formulario simple.',
    color_label: 'Color del chat',
    color_hint: 'El color principal del chat en tu sitio. Ponlo igual al de tu marca.',
    viewing_as: 'Viendo como', back_to_admin: 'Volver al admin',
    alerts_section: 'Avisos cuando un cliente escribe',
    alerts_desc: 'Te avisamos cuando un cliente escribe y aun nadie ha respondido. Un solo aviso por conversacion, con una pausa de 30 minutos.',
    alerts_enable: 'Activar avisos',
    email_label: 'Email para avisos', email_ph: 'tucorreo@ejemplo.com',
    notify_wa_label: 'WhatsApp para avisos (privado)',
    notify_wa_hint: 'Puede ser tu numero personal. Tambien se usa cuando el asistente necesita ayuda.',
    quiet_label: 'Horas en silencio (sin avisos)', quiet_from: 'Desde', quiet_to: 'hasta',
    quiet_tz: 'hora de Colombia',
    quiet_hint: 'Ej: 21 a 7 = sin avisos de 9pm a 7am. Deja ambos vacios para recibir avisos a cualquier hora.',
    shop_section: 'Integracion con tu tienda',
    shop_desc: 'Conecta tu tienda Shopify para que el asistente pueda consultar el estado de los pedidos (pago, preparacion, envio y entrega). Solo lectura: el asistente nunca modifica nada.',
    connected: 'Conectada', to: 'a',
    shop_domain_label: 'Dominio de la tienda',
    token_label: 'Token de acceso (Admin API)',
    token_ph_keep: '•••••••• (sin cambios)',
    token_hint: 'Crea una app personalizada en Shopify con permisos read_orders y read_fulfillments, y pega aqui el token.',
    token_hint_keep: 'Dejalo vacio para conservar el actual.',
    btn_connect: 'Conectar tienda', btn_update: 'Actualizar conexion', btn_disconnect: 'Desconectar',
    store_connected: 'Tienda conectada.', confirm_disconnect: 'Desconectar la tienda Shopify?',
    // widget
    widget_sub: 'Como agregar el asistente a tu sitio',
    widget_desc1: 'Copia este codigo y pegalo justo antes del cierre',
    widget_desc2: 'en tu sitio web. El chat aparecera automaticamente.',
    install_code: 'Codigo de instalacion', copy: 'Copiar codigo', copied: 'Copiado al portapapeles.',
    // login
    login_sub: 'Ingresa tu token de acceso para ver tus conversaciones y gestionar tu asistente.',
    token_access: 'Token de acceso', token_access_hint: 'Tu token fue enviado por PymeWebPro al activar el plan.',
    enter: 'Entrar', token_required: 'Token requerido.', token_invalid: 'Token invalido. Verifica con PymeWebPro.',
    // manual
    manual_sub: 'Guia rapida del asistente',
  },
  en: {
    menu: 'Menu', dashboard: 'Dashboard', conversations: 'Conversations',
    knowledge: 'Knowledge', settings: 'Settings', install: 'Install widget',
    how_to: 'How to use', by: 'by PymeWebPro',
    dash_sub: 'This week at a glance', st_convs: 'Conversations', st_leads: 'Leads',
    st_to_wa: 'To WhatsApp', st_appts: 'Appointments booked', last7: 'last 7 days',
    recent: 'Recent conversations', no_convs: 'No conversations yet',
    convs_sub: 'Your web and WhatsApp chats, all in one place',
    who_wa: 'WhatsApp', who_web: 'Web visitor', no_messages: 'No messages',
    badge_attn: 'Needs attention', badge_human: 'You are replying', badge_new: 'New',
    search_ph: 'Search by name, number or text...', search_btn: 'Search', no_results: 'No results',
    f_open: 'Open', f_attention: 'Needs attention', f_unread: 'Unread', f_closed: 'Closed', f_all: 'All',
    close_conv: 'Close', reopen_conv: 'Reopen',
    delete_data: 'Delete this conversation data',
    confirm_delete: 'Permanently delete all messages in this conversation? This cannot be undone.',
    back: 'Back to inbox', loading: 'Loading...', reply_ph: 'Type a reply...',
    send: 'Send', contact_wa: 'WhatsApp contact', contact_web: 'Web visitor',
    pill_human: 'You are handling this', pill_bot: 'The assistant is replying',
    btn_return: 'Hand back to assistant', btn_take: 'Take over',
    hint_paused: 'The assistant is paused. Your replies go straight to the customer.',
    hint_active: 'The assistant replies on its own. If you type a reply, you take over.',
    who_you: 'You', who_assistant: 'Assistant',
    not_delivered_24h: 'Not delivered · over 24h passed, the customer must write first',
    not_delivered: 'Not delivered',
    attachment: 'Attachment',
    t_now: 'now',
    know_sub: 'What your assistant knows',
    know_desc: 'Write here everything the assistant needs to know about your business: products, prices, delivery areas, hours, FAQs. The more detail, the better the answers.',
    know_label: 'Business information',
    know_ph: 'Example:\nProducts: floral arrangements, bouquets, wreaths.\nPrices: from $80.000 COP.\nDelivery area: Medellin and metro area.\nHours: Mon to Sat 8am - 6pm...',
    save: 'Save changes', saving: 'Saving...', saved: 'Changes saved.',
    save_err: 'Could not save.', err: 'Error.',
    set_sub: 'Your assistant settings',
    bot_name_label: 'Assistant name',
    bot_name_hint: 'The name your customers see in the chat. Set it to whatever you like.',
    wa_pub_label: 'Business WhatsApp (public)',
    wa_pub_hint: 'The number the assistant sends customers to. Include the country code.',
    booking_label: 'Booking link',
    booking_hint: 'Your Cal.com, Calendly or similar link. If set, the assistant offers it when someone wants to book. If empty, it uses a simple form.',
    color_label: 'Chat colour',
    color_hint: 'The main colour of the chat on your site. Match it to your brand.',
    viewing_as: 'Viewing as', back_to_admin: 'Back to admin',
    alerts_section: 'Alerts when a customer writes',
    alerts_desc: 'We alert you when a customer writes and nobody has replied yet. One alert per conversation, with a 30-minute pause.',
    alerts_enable: 'Enable alerts',
    email_label: 'Alert email', email_ph: 'youremail@example.com',
    notify_wa_label: 'Alert WhatsApp (private)',
    notify_wa_hint: 'Can be your personal number. Also used when the assistant needs help.',
    quiet_label: 'Quiet hours (no alerts)', quiet_from: 'From', quiet_to: 'to',
    quiet_tz: 'Colombia time',
    quiet_hint: 'E.g. 21 to 7 = no alerts from 9pm to 7am. Leave both empty to get alerts anytime.',
    shop_section: 'Connect your store',
    shop_desc: 'Connect your Shopify store so the assistant can check order status (paid, preparing, shipped and delivered). Read-only: the assistant never changes anything.',
    connected: 'Connected', to: 'to',
    shop_domain_label: 'Store domain',
    token_label: 'Access token (Admin API)',
    token_ph_keep: '•••••••• (unchanged)',
    token_hint: 'Create a custom app in Shopify with read_orders and read_fulfillments scopes, and paste the token here.',
    token_hint_keep: 'Leave empty to keep the current one.',
    btn_connect: 'Connect store', btn_update: 'Update connection', btn_disconnect: 'Disconnect',
    store_connected: 'Store connected.', confirm_disconnect: 'Disconnect the Shopify store?',
    widget_sub: 'How to add the assistant to your site',
    widget_desc1: 'Copy this code and paste it right before the closing',
    widget_desc2: 'tag on your website. The chat appears automatically.',
    install_code: 'Install code', copy: 'Copy code', copied: 'Copied to clipboard.',
    login_sub: 'Enter your access token to see your conversations and manage your assistant.',
    token_access: 'Access token', token_access_hint: 'Your token was sent by PymeWebPro when your plan was activated.',
    enter: 'Sign in', token_required: 'Token required.', token_invalid: 'Invalid token. Check with PymeWebPro.',
    manual_sub: 'Quick guide to your assistant',
  },
};

function t(lang, key) {
  return (T[lang] && T[lang][key]) ?? T.es[key] ?? key;
}

export async function handlePortal(request, env) {
  const url  = new URL(request.url);
  const path = url.pathname.replace(/^\/portal\/?/, '') || '';
  const lang = getLang(request);

  // API routes (JSON)
  if (path.startsWith('api/')) {
    return handleApi(path.slice(4), request, env);
  }

  // PymeWebPro admin console (own credential, separate from client logins)
  if (path === 'admin' || path.startsWith('admin/')) {
    return handleAdmin(request, env, { CSS, escHtml });
  }

  // Login page
  if (path === '' || path === 'login') {
    if (request.method === 'POST') return handleLogin(request, env);
    return loginPage(lang);
  }

  // All other portal pages require auth
  const clientId = await getSessionClient(request, env);
  if (!clientId) {
    return Response.redirect(url.origin + '/portal/login', 302);
  }

  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(clientId).first();
  if (!client) return Response.redirect(url.origin + '/portal/login', 302);
  // If an admin opened this portal via impersonation, show a banner + way back.
  client.__asAdmin = /pwp_admin=/.test(request.headers.get('Cookie') || '');

  if (path === 'dashboard' || path === '') return dashboardPage(client, env, lang);
  if (path === 'conversations') return conversationsPage(client, env, lang, url);
  if (path.startsWith('conversations/')) {
    const convId = path.slice('conversations/'.length);
    return conversationDetailPage(client, convId, env, lang);
  }
  if (path === 'conocimiento') return conocimientoPage(client, lang);
  if (path === 'configuracion') return configuracionPage(client, env, lang);
  if (path === 'widget') return widgetPage(client, url.origin, lang);
  if (path === 'manual') return manualPage(client, lang);

  return new Response('Not found', { status: 404 });
}

/* ---- Auth ---- */

async function handleLogin(request, env) {
  const lang = getLang(request);
  const form = await request.formData().catch(() => null);
  const token = form?.get('token')?.trim();
  if (!token) return loginPage(lang, t(lang, 'token_required'));

  const client = await env.DB.prepare('SELECT id, name FROM clients WHERE portal_token = ? AND active = 1')
    .bind(token).first();
  if (!client) return loginPage(lang, t(lang, 'token_invalid'));

  const sessionToken = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO sessions (token, client_id, expires_at) VALUES (?, ?, datetime("now", "+8 hours"))'
  ).bind(sessionToken, client.id).run();

  return new Response('', {
    status: 302,
    headers: {
      Location: '/portal/dashboard',
      'Set-Cookie': `pwp_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
    },
  });
}

async function getSessionClient(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match  = cookie.match(/pwp_session=([^;]+)/);
  if (!match) return null;
  const row = await env.DB.prepare(
    'SELECT client_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(match[1]).first();
  return row?.client_id || null;
}

/* ---- API handlers (JSON) ---- */

async function handleApi(path, request, env) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const clientId = await getSessionClient(request, env);
  if (!clientId) return json({ error: 'Unauthorized' }, 401);

  if (path === 'stats') {
    const [convCount, leadCount, routedWa, routedBook, waiting] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as n FROM conversations WHERE client_id = ? AND started_at >= datetime('now','-7 days')").bind(clientId).first(),
      env.DB.prepare("SELECT COUNT(*) as n FROM leads WHERE client_id = ? AND ts >= datetime('now','-7 days')").bind(clientId).first(),
      env.DB.prepare("SELECT COUNT(*) as n FROM leads WHERE client_id = ? AND routed_to='whatsapp' AND ts >= datetime('now','-7 days')").bind(clientId).first(),
      env.DB.prepare("SELECT COUNT(*) as n FROM leads WHERE client_id = ? AND routed_to='booking' AND ts >= datetime('now','-7 days')").bind(clientId).first(),
      env.DB.prepare("SELECT COUNT(*) as n FROM conversations WHERE client_id = ? AND unread = 1").bind(clientId).first(),
    ]);
    return json({ conversations: convCount.n, leads: leadCount.n, routed_wa: routedWa.n, routed_booking: routedBook.n, waiting: waiting.n });
  }

  if (path === 'conversations') {
    const rows = await env.DB.prepare(
      "SELECT id, channel, contact_name, started_at, last_message_at, status, needs_human, bot_paused, unread, (SELECT content FROM messages WHERE conversation_id=conversations.id AND role='user' ORDER BY ts DESC LIMIT 1) as last_user_msg FROM conversations WHERE client_id = ? ORDER BY needs_human DESC, last_message_at DESC LIMIT 100"
    ).bind(clientId).all();
    return json(rows.results || []);
  }

  if (path.startsWith('conversations/')) {
    const rest = path.slice('conversations/'.length);
    const [convId, action] = rest.split('/');

    const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ? AND client_id = ?')
      .bind(convId, clientId).first();
    if (!conv) return json({ error: 'Not found' }, 404);

    if (action === 'reply' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const text = (body.text || '').trim();
      if (!text) return json({ error: 'text required' }, 400);

      // WhatsApp can only receive a free-form message within 24h of the customer's
      // last inbound. Outside that window Meta blocks it (would need an approved template).
      let delivery = 'sent';
      if (conv.channel === 'whatsapp' && conv.contact_phone) {
        if (within24h(conv.last_inbound_at)) {
          const client = await env.DB.prepare('SELECT wa_sender FROM clients WHERE id = ?').bind(clientId).first();
          if (client?.wa_sender) {
            const res = await sendWhatsAppText(env, client.wa_sender, conv.contact_phone, text);
            delivery = (res && res.ok) ? 'sent' : 'failed';
          } else {
            delivery = 'failed';
          }
        } else {
          delivery = 'blocked_24h';
        }
      }

      await env.DB.batch([
        env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content, channel, delivery, ts) VALUES (?, ?, "human", ?, ?, ?, datetime("now"))')
          .bind(crypto.randomUUID(), convId, text, conv.channel, delivery),
        env.DB.prepare('UPDATE conversations SET last_message_at = datetime("now"), bot_paused = 1, needs_human = 0, unread = 0, status = "human" WHERE id = ?')
          .bind(convId),
      ]);

      return json({ ok: true, delivery });
    }

    if (action === 'takeover' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const paused = body.paused ? 1 : 0;
      await env.DB.prepare('UPDATE conversations SET bot_paused = ?, needs_human = CASE WHEN ? = 1 THEN 0 ELSE needs_human END WHERE id = ?')
        .bind(paused, paused, convId).run();
      return json({ ok: true, bot_paused: paused });
    }

    if (action === 'read' && request.method === 'POST') {
      await env.DB.prepare('UPDATE conversations SET unread = 0, last_alert_at = NULL WHERE id = ?').bind(convId).run();
      return json({ ok: true });
    }

    if (action === 'close' && request.method === 'POST') {
      await env.DB.prepare("UPDATE conversations SET status = 'closed', closed_at = datetime('now'), needs_human = 0, unread = 0 WHERE id = ?").bind(convId).run();
      return json({ ok: true });
    }

    if (action === 'reopen' && request.method === 'POST') {
      await env.DB.prepare("UPDATE conversations SET status = 'active', closed_at = NULL WHERE id = ?").bind(convId).run();
      return json({ ok: true });
    }

    // Habeas Data: hard-delete a contact's conversation data on request.
    if (action === 'delete' && request.method === 'POST') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(convId),
        env.DB.prepare('DELETE FROM leads WHERE conversation_id = ?').bind(convId),
        env.DB.prepare('DELETE FROM conversations WHERE id = ?').bind(convId),
      ]);
      return json({ ok: true });
    }

    const after = url.searchParams.get('after');
    const cols = 'role, content, ts, delivery, media_url, media_type';
    const messages = after
      ? await env.DB.prepare(`SELECT ${cols} FROM messages WHERE conversation_id = ? AND ts > ? ORDER BY ts ASC`).bind(convId, after).all()
      : await env.DB.prepare(`SELECT ${cols} FROM messages WHERE conversation_id = ? ORDER BY ts ASC`).bind(convId).all();
    return json({ messages: messages.results || [], bot_paused: conv.bot_paused, channel: conv.channel });
  }

  // Authenticated media proxy: re-fetch a Twilio media URL (which needs Basic auth)
  // so the owner can view an image/file the customer sent. Restricted to Twilio
  // hosts and to media that belongs to one of this client's conversations.
  if (path === 'media') {
    const u = url.searchParams.get('u') || '';
    if (!/^https:\/\/([a-z0-9-]+\.)*twilio\.com\//i.test(u) && !/^https:\/\/media\.twiliocdn\.com\//i.test(u)) {
      return json({ error: 'bad url' }, 400);
    }
    const owns = await env.DB.prepare(
      'SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.client_id = ? AND m.media_url = ? LIMIT 1'
    ).bind(clientId, u).first();
    if (!owns) return json({ error: 'not found' }, 404);
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return json({ error: 'no creds' }, 500);
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
    const r = await fetch(u, { headers: { Authorization: 'Basic ' + auth } });
    if (!r.ok) return json({ error: 'fetch failed' }, 502);
    return new Response(r.body, {
      status: 200,
      headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' },
    });
  }

  if (path === 'knowledge' && request.method === 'POST') {
    const body = await request.json();
    await env.DB.prepare('UPDATE clients SET knowledge = ? WHERE id = ?')
      .bind(body.knowledge || '', clientId).run();
    return json({ ok: true });
  }

  if (path === 'settings' && request.method === 'POST') {
    const body = await request.json();
    const toHour = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = parseInt(v, 10);
      return (isNaN(n) || n < 0 || n > 23) ? null : n;
    };
    const color = /^#[0-9a-fA-F]{3,8}$/.test((body.widget_color || '').trim()) ? body.widget_color.trim() : null;
    await env.DB.prepare(
      'UPDATE clients SET wa_number = ?, notify_wa = ?, notify_email = ?, bot_name = ?, booking_url = ?, widget_color = ?, alerts_enabled = ?, quiet_start = ?, quiet_end = ? WHERE id = ?'
    ).bind(
      body.wa_number || null,
      body.notify_wa || null,
      (body.notify_email || '').trim() || null,
      (body.bot_name || '').trim() || null,
      (body.booking_url || '').trim() || null,
      color,
      body.alerts_enabled ? 1 : 0,
      toHour(body.quiet_start),
      toHour(body.quiet_end),
      clientId
    ).run();
    return json({ ok: true });
  }

  if (path === 'integrations/shopify' && request.method === 'POST') {
    const body = await request.json();
    const shop  = (body.shop_domain || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const token = (body.api_token || '').trim();

    if (!shop) {
      await env.DB.prepare("UPDATE integrations SET active = 0 WHERE client_id = ? AND kind = 'shopify'").bind(clientId).run();
      return json({ ok: true, disconnected: true });
    }
    if (token) {
      const enc = await encryptToken(env, token);
      await env.DB.prepare(
        "INSERT INTO integrations (client_id, kind, shop_domain, api_token, active, created_at) VALUES (?, 'shopify', ?, ?, 1, datetime('now')) ON CONFLICT(client_id, kind) DO UPDATE SET shop_domain = excluded.shop_domain, api_token = excluded.api_token, active = 1"
      ).bind(clientId, shop, enc).run();
    } else {
      const existing = await env.DB.prepare("SELECT api_token FROM integrations WHERE client_id = ? AND kind = 'shopify'").bind(clientId).first();
      if (!existing) return json({ error: 'token required for first connection' }, 400);
      await env.DB.prepare("UPDATE integrations SET shop_domain = ?, active = 1 WHERE client_id = ? AND kind = 'shopify'").bind(shop, clientId).run();
    }
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

// Public endpoint (no auth) — called by the widget when a visitor submits the scheduling form
export async function handleSchedule(request, env) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors }); }

  const { client_id, conversation_id, name, contact, preferred_time } = body;
  if (!client_id || !name || !contact) {
    return new Response(JSON.stringify({ error: 'client_id, name, contact required' }), { status: 400, headers: cors });
  }

  const intent = JSON.stringify({ name, contact, preferred_time: preferred_time || '' });

  await env.DB.batch([
    env.DB.prepare('INSERT INTO leads (id, client_id, conversation_id, visitor_name, intent, routed_to, ts) VALUES (?, ?, ?, ?, ?, "cita", datetime("now"))')
      .bind(crypto.randomUUID(), client_id, conversation_id || null, name, intent),
    ...(conversation_id ? [
      env.DB.prepare('UPDATE conversations SET status = "routed_cita", last_message_at = datetime("now") WHERE id = ?')
        .bind(conversation_id)
    ] : []),
  ]);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

/* ---- Pages ---- */

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#e8e8e8;color:#1a1a1a;font-size:14px;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}

  .shell{display:flex;min-height:100vh}

  .sidebar{width:240px;background:#2e3440;display:flex;flex-direction:column;position:fixed;top:0;bottom:0;left:0;overflow-y:auto}
  .sb-brand{padding:24px 20px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
  .sb-logo{display:flex;align-items:center;gap:10px}
  .sb-logo-mark{width:32px;height:32px;background:rgba(255,255,255,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sb-logo-mark svg{width:16px;height:16px;fill:#fff}
  .sb-logo-name{font-size:14px;font-weight:600;color:#fff;letter-spacing:-.01em}
  .sb-logo-by{font-size:10px;color:rgba(255,255,255,.4);margin-top:1px}
  .sb-nav{padding:14px 12px;flex:1}
  .sb-section{font-size:10px;font-weight:600;color:rgba(255,255,255,.3);letter-spacing:.08em;text-transform:uppercase;padding:8px 8px 4px;margin-top:4px}
  .sb-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;color:rgba(255,255,255,.55);font-size:13px;font-weight:500;margin-bottom:2px;transition:all .12s}
  .sb-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.9)}
  .sb-item.active{background:rgba(255,255,255,.13);color:#fff;font-weight:600}
  .sb-icon{width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;opacity:.7}
  .sb-icon svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .sb-item.active .sb-icon{opacity:1}
  .sb-foot{padding:16px 20px;border-top:1px solid rgba(255,255,255,.08)}
  .sb-client-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.85);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sb-client-domain{font-size:11px;color:rgba(255,255,255,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sb-pwp-link{display:block;margin-top:10px;font-size:11px;color:rgba(255,255,255,.3);text-align:center;transition:color .1s}
  .sb-pwp-link:hover{color:rgba(255,255,255,.7)}

  .main{margin-left:240px;flex:1;padding:32px 36px;max-width:960px}
  .page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px}
  .page-title{font-size:22px;font-weight:600;color:#1a1a1a;letter-spacing:-.02em}
  .page-sub{font-size:13px;color:#888;margin-top:3px}
  .header-tools{display:flex;align-items:center;gap:10px;flex-shrink:0}
  .help-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#2e3440;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px 13px;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.05)}
  .help-link:hover{background:#f7f7f7}
  .lang-toggle{display:inline-flex;border:1px solid #ddd;border-radius:8px;overflow:hidden;flex-shrink:0;background:#fff}
  .lang-toggle a{padding:8px 11px;font-size:12px;font-weight:700;color:#999;cursor:pointer}
  .lang-toggle a.active{background:#2e3440;color:#fff}

  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
  .stat{background:#fff;border:1px solid #ddd;border-radius:12px;padding:18px 20px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .stat-label{font-size:10px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
  .stat-val{font-size:28px;font-weight:700;color:#1a1a1a;letter-spacing:-.02em;line-height:1}
  .stat-sub{font-size:11px;color:#aaa;margin-top:5px}

  .section-label{font-size:10px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px}

  .card{background:#fff;border:1px solid #ddd;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .card-body{padding:20px 24px}
  .card-desc{font-size:13px;color:#666;line-height:1.6;margin-bottom:20px;max-width:540px}

  .conv-row{display:flex;align-items:center;gap:14px;padding:13px 18px;border-bottom:1px solid #f5f5f5;cursor:pointer;transition:background .1s}
  .conv-row:last-child{border-bottom:none}
  .conv-row:hover{background:#fafafa}
  .conv-info{flex:1;min-width:0}
  .conv-preview{font-size:13px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .conv-date{font-size:11px;color:#aaa;flex-shrink:0}
  .conv-empty{padding:32px 20px;text-align:center;color:#aaa;font-size:13px}

  .pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 9px;border-radius:999px;font-weight:500}

  .form-group{margin-bottom:18px}
  .form-label{font-size:12px;font-weight:600;color:#444;margin-bottom:6px;display:block}
  .form-hint{font-size:11px;color:#aaa;margin-top:4px}
  .form-input{width:100%;padding:10px 13px;border:1px solid #ddd;border-radius:8px;font-size:13px;background:#fff;outline:none;transition:border-color .15s;color:#1a1a1a;font-family:inherit}
  .form-input:focus{border-color:#2e3440;box-shadow:0 0 0 3px rgba(46,52,64,.08)}
  textarea.form-input{min-height:200px;resize:vertical;line-height:1.6}

  .btn{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;border:none;background:#2e3440;color:#fff;cursor:pointer;transition:all .15s;font-family:inherit}
  .btn:hover{background:#3b4252;box-shadow:0 2px 8px rgba(0,0,0,.2)}
  .btn:active{transform:translateY(1px)}
  .btn-ghost{background:#fff;color:#444;border:1px solid #ddd}
  .btn-ghost:hover{background:#f7f7f7}
  .save-status{margin-left:12px;font-size:12px;color:#888;font-style:italic}

  .code-block{background:#f7f7f7;border:1px solid #ddd;border-radius:8px;padding:16px;font-family:'Menlo','Consolas',monospace;font-size:12px;color:#444;word-break:break-all;line-height:1.7}

  .msg-thread{display:flex;flex-direction:column;gap:10px;padding:20px}
  .bubble-wrap{display:flex;flex-direction:column}
  .bubble-wrap.user{align-items:flex-end}
  .bubble-wrap.assistant{align-items:flex-start}
  .bubble{display:inline-block;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.55;max-width:78%;word-break:break-word}
  .bubble-user{background:#2e3440;color:#fff;border-bottom-right-radius:3px}
  .bubble-assistant{background:#f0f0f0;color:#1a1a1a;border-bottom-left-radius:3px}
  .msg-ts{font-size:10px;color:#aaa;margin-top:3px}

  .back-link{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:#888;margin-bottom:18px;font-weight:500;transition:color .1s}
  .back-link:hover{color:#1a1a1a}

  .login-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#2e3440;padding:20px}
  .login-card{background:#fff;border-radius:20px;padding:44px 40px;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.3)}
  .login-icon{width:52px;height:52px;background:#2e3440;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:20px}
  .login-icon svg{width:24px;height:24px;fill:#fff}
  .login-title{font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-.02em;margin-bottom:4px}
  .login-sub{font-size:13px;color:#666;margin-bottom:28px;line-height:1.5}
  .login-footer{margin-top:20px;text-align:center;font-size:11px;color:#aaa}
  .login-footer a{color:#aaa;text-decoration:underline;text-underline-offset:2px}
  .login-footer a:hover{color:#444}
  .alert{padding:11px 14px;border-radius:8px;background:#fff8e6;border:1px solid #ffe0a0;color:#7a5200;font-size:13px;margin-bottom:20px;font-weight:500}
  .alert-error{background:#fff0f0;border-color:#ffd0d0;color:#991b1b}

  .divider{height:1px;background:#ebebeb;margin:20px 0}

  .conv-name{font-size:13px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .conv-row.conv-unread{background:#fbfaf6}
  .conv-row.conv-unread .conv-preview{color:#1a1a1a;font-weight:500}
  .conv-meta{display:flex;align-items:center;gap:8px;flex-shrink:0}
  .ch-badge{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ch-wa{background:#e7f8ec;color:#128c4b}
  .ch-web{background:#eef0f4;color:#2e3440}

  .pill-attn{background:#b45309;color:#fff;font-weight:600}
  .pill-human{background:#1f2937;color:#fff;font-weight:600}
  .pill-bot{background:#fff;color:#1f2937;border:1px solid #c7ccd4}
  .pill-new{background:#1d4ed8;color:#fff;font-weight:600}

  .conv-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  .conv-head .ch-badge{width:38px;height:38px}
  .conv-head-name{font-size:16px;font-weight:600;color:#1a1a1a}
  .conv-head-sub{font-size:12px;color:#888;margin-top:1px}
  .conv-head-actions{margin-left:auto;display:flex;align-items:center;gap:10px}
  .btn-sm{padding:7px 13px;font-size:12px}

  .chat-card{display:flex;flex-direction:column}
  .chat-card .msg-thread{max-height:440px;overflow-y:auto}
  .bubble-wrap.human{align-items:flex-end}
  .bubble-human{background:#128c4b;color:#fff;border-bottom-right-radius:3px}
  .who-tag{font-size:10px;color:#aaa;margin-bottom:2px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
  .reply-row{display:flex;gap:10px;padding:14px 18px;border-top:1px solid #eee;align-items:flex-end}
  .reply-input{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px 13px;font-size:13px;font-family:inherit;resize:none;outline:none;max-height:120px;line-height:1.5}
  .reply-input:focus{border-color:#2e3440;box-shadow:0 0 0 3px rgba(46,52,64,.08)}
  .reply-hint{padding:0 18px 14px;font-size:11px;color:#aaa}

  .nav-badge{margin-left:auto;background:#b45309;color:#fff;font-size:11px;font-weight:700;border-radius:999px;padding:1px 7px;min-width:18px;text-align:center}

  /* inbox search + filters */
  .search-row{display:flex;gap:10px;align-items:center;margin-bottom:12px}
  .fbar{display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap}
  .fbar-sep{width:1px;height:18px;background:#ddd;margin:0 4px}
  .fchip{font-size:12px;font-weight:600;color:#666;background:#fff;border:1px solid #ddd;border-radius:999px;padding:5px 12px}
  .fchip:hover{background:#f5f5f5}
  .fchip.active{background:#2e3440;color:#fff;border-color:#2e3440}

  /* admin impersonation banner */
  .admin-banner{background:#b45309;color:#fff;font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:8px;margin-bottom:18px}
  .admin-banner a{color:#fff;text-decoration:underline;text-underline-offset:2px}

  .manual h2{font-size:15px;font-weight:600;margin:22px 0 8px;color:#1a1a1a}
  .manual p{font-size:13.5px;color:#444;line-height:1.65;margin-bottom:8px}
  .manual .step{font-weight:600;color:#1a1a1a}

  /* admin console */
  .admin-wrap{max-width:1000px;margin:0 auto;padding:32px 28px}
  .admin-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;gap:12px}
  .admin-title{font-size:20px;font-weight:700;color:#1a1a1a}
  .atable{width:100%;border-collapse:collapse;font-size:13px}
  .atable th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#888;font-weight:600;padding:10px 12px;border-bottom:1px solid #eee}
  .atable td{padding:11px 12px;border-bottom:1px solid #f3f3f3;vertical-align:middle}
  .atable tr:hover td{background:#fafafa}
  .atable .muted{color:#999;font-size:12px}
  .atable .cname{font-weight:600;color:#1a1a1a}
  .tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#eef0f4;color:#2e3440;font-weight:600;margin-right:4px}
  .tag-on{background:#e7f8ec;color:#128c4b}
  .tag-off{background:#f3f3f3;color:#aaa}
  .tag-amber{background:#b45309;color:#fff}
  .token-box{font-family:'Menlo','Consolas',monospace;font-size:12px;background:#f7f7f7;border:1px solid #ddd;border-radius:6px;padding:8px 10px;word-break:break-all}
`;

const CHAT_ICON = `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 4V5z"/></svg>`;

function nav(active, client, lang) {
  const ICONS = {
    dashboard:     '<svg viewBox="0 0 14 14"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>',
    conversations: '<svg viewBox="0 0 14 14"><path d="M1 2a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H4l-3 3V2z"/></svg>',
    conocimiento:  '<svg viewBox="0 0 14 14"><path d="M7 1a4 4 0 014 4c0 2-1.5 3.5-3 4v1H6v-1C4.5 8.5 3 7 3 5a4 4 0 014-4z"/><line x1="6" y1="12" x2="8" y2="12"/></svg>',
    configuracion: '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="2"/><path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.5 2.5l.7.7M10.8 10.8l.7.7M2.5 11.5l.7-.7M10.8 3.2l.7-.7"/></svg>',
    widget:        '<svg viewBox="0 0 14 14"><rect x="1" y="4" width="12" height="9" rx="1"/><path d="M4 4V2a3 3 0 016 0v2"/></svg>',
  };
  const items = [
    ['dashboard',     t(lang, 'dashboard')],
    ['conversations', t(lang, 'conversations')],
    ['conocimiento',  t(lang, 'knowledge')],
    ['configuracion', t(lang, 'settings')],
    ['widget',        t(lang, 'install')],
  ];
  return `
    <div class="sidebar">
      <div class="sb-brand">
        <div class="sb-logo">
          <div class="sb-logo-mark">${CHAT_ICON}</div>
          <div class="sb-logo-text">
            <div class="sb-logo-name">Angela</div>
            <div class="sb-logo-by">${t(lang, 'by')}</div>
          </div>
        </div>
      </div>
      <nav class="sb-nav">
        <div class="sb-section">${t(lang, 'menu')}</div>
        ${items.map(([slug, label]) =>
          `<a class="sb-item${active === slug ? ' active' : ''}" href="/portal/${slug}"><span class="sb-icon">${ICONS[slug]}</span>${label}${slug === 'conversations' ? '<span class="nav-badge" id="nav-waiting" style="display:none"></span>' : ''}</a>`
        ).join('')}
      </nav>
      <div class="sb-foot">
        <div class="sb-client-name">${escHtml(client.name)}</div>
        ${client.domain ? `<div class="sb-client-domain">${escHtml(client.domain)}</div>` : ''}
        <a class="sb-pwp-link" href="https://pymewebpro.com" target="_blank" rel="noopener">pymewebpro.com</a>
      </div>
    </div>`;
}

function page(title, subtitle, body, active, client, lang) {
  return new Response(`<!DOCTYPE html><html lang="${lang}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escHtml(title)} · Angela</title>
    <style>${CSS}</style>
  </head><body>
    <div class="shell">
      ${nav(active, client, lang)}
      <main class="main">
        ${client.__asAdmin ? `<div class="admin-banner">${t(lang, 'viewing_as')} <b>${escHtml(client.name)}</b> &nbsp;·&nbsp; <a href="/portal/admin">${t(lang, 'back_to_admin')}</a></div>` : ''}
        <div class="page-header">
          <div>
            <h1 class="page-title">${escHtml(title)}</h1>
            ${subtitle ? `<div class="page-sub">${subtitle}</div>` : ''}
          </div>
          <div class="header-tools">
            ${active === 'manual' ? '' : `<a class="help-link" href="/portal/manual">&#9432; ${t(lang, 'how_to')}</a>`}
            <div class="lang-toggle">
              <a class="${lang === 'es' ? 'active' : ''}" onclick="setLang('es')">ES</a>
              <a class="${lang === 'en' ? 'active' : ''}" onclick="setLang('en')">EN</a>
            </div>
          </div>
        </div>
        ${body}
      </main>
    </div>
    <script>
      function setLang(l){ document.cookie = 'pwp_lang=' + l + ';path=/;max-age=31536000;samesite=lax'; location.reload(); }
      (function(){
        function refreshWaiting(){
          fetch('/portal/api/stats').then(function(r){return r.json();}).then(function(d){
            var b = document.getElementById('nav-waiting');
            if (!b) return;
            if (d && d.waiting > 0){ b.textContent = d.waiting; b.style.display = 'inline-block'; }
            else { b.style.display = 'none'; }
          }).catch(function(){});
        }
        refreshWaiting();
        setInterval(refreshWaiting, 15000);
      })();
    </script>
  </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function dashboardPage(client, env, lang) {
  const [convCount, leadCount, routedWa, routedBook] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as n FROM conversations WHERE client_id = ? AND started_at >= datetime('now','-7 days')").bind(client.id).first(),
    env.DB.prepare("SELECT COUNT(*) as n FROM leads WHERE client_id = ? AND ts >= datetime('now','-7 days')").bind(client.id).first(),
    env.DB.prepare("SELECT COUNT(*) as n FROM leads WHERE client_id = ? AND routed_to='whatsapp' AND ts >= datetime('now','-7 days')").bind(client.id).first(),
    env.DB.prepare("SELECT COUNT(*) as n FROM leads WHERE client_id = ? AND routed_to='cita' AND ts >= datetime('now','-7 days')").bind(client.id).first(),
  ]);
  const recentConvs = await env.DB.prepare(
    "SELECT id, channel, contact_name, started_at, last_message_at, status, needs_human, bot_paused, unread, (SELECT content FROM messages WHERE conversation_id=conversations.id ORDER BY ts DESC LIMIT 1) as last_msg FROM conversations WHERE client_id = ? ORDER BY needs_human DESC, last_message_at DESC LIMIT 8"
  ).bind(client.id).all();

  const rows = (recentConvs.results || []).map(c => convRow(c, lang)).join('');

  const body = `
    <div class="stats">
      <div class="stat"><div class="stat-label">${t(lang, 'st_convs')}</div><div class="stat-val">${convCount.n}</div><div class="stat-sub">${t(lang, 'last7')}</div></div>
      <div class="stat"><div class="stat-label">${t(lang, 'st_leads')}</div><div class="stat-val">${leadCount.n}</div><div class="stat-sub">${t(lang, 'last7')}</div></div>
      <div class="stat"><div class="stat-label">${t(lang, 'st_to_wa')}</div><div class="stat-val">${routedWa.n}</div><div class="stat-sub">${t(lang, 'last7')}</div></div>
      <div class="stat"><div class="stat-label">${t(lang, 'st_appts')}</div><div class="stat-val">${routedBook.n}</div><div class="stat-sub">${t(lang, 'last7')}</div></div>
    </div>
    <div class="section-label">${t(lang, 'recent')}</div>
    <div class="card">${rows || `<div class="conv-empty">${t(lang, 'no_convs')}</div>`}</div>`;

  return page(t(lang, 'dashboard'), t(lang, 'dash_sub'), body, 'dashboard', client, lang);
}

async function conversationsPage(client, env, lang, url) {
  const q       = (url.searchParams.get('q') || '').trim();
  const status  = url.searchParams.get('status') || 'open';   // open | attention | unread | closed
  const channel = url.searchParams.get('channel') || 'all';   // all | web | whatsapp

  let where = 'client_id = ?';
  const binds = [client.id];
  if (status === 'closed') where += " AND status = 'closed'";
  else {
    where += " AND status != 'closed'";
    if (status === 'attention') where += ' AND needs_human = 1';
    if (status === 'unread') where += ' AND unread = 1';
  }
  if (channel === 'web' || channel === 'whatsapp') { where += ' AND channel = ?'; binds.push(channel); }
  if (q) {
    where += " AND (contact_name LIKE ? OR contact_phone LIKE ? OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = conversations.id AND m.content LIKE ?))";
    const like = '%' + q + '%';
    binds.push(like, like, like);
  }

  const convs = await env.DB.prepare(
    `SELECT id, channel, contact_name, started_at, last_message_at, status, needs_human, bot_paused, unread, (SELECT content FROM messages WHERE conversation_id=conversations.id ORDER BY ts DESC LIMIT 1) as last_msg FROM conversations WHERE ${where} ORDER BY needs_human DESC, last_message_at DESC LIMIT 100`
  ).bind(...binds).all();

  const rows = (convs.results || []).map(c => convRow(c, lang)).join('');

  // filter chips (preserve q + channel; status switches)
  const chip = (key, val, label, cur) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (channel !== 'all') params.set('channel', channel);
    if (val) params.set(key, val);
    return `<a class="fchip${cur === val ? ' active' : ''}" href="/portal/conversations?${params.toString()}">${escHtml(label)}</a>`;
  };
  const statusChips = [
    chip('status', 'open', t(lang, 'f_open'), status),
    chip('status', 'attention', t(lang, 'f_attention'), status),
    chip('status', 'unread', t(lang, 'f_unread'), status),
    chip('status', 'closed', t(lang, 'f_closed'), status),
  ].join('');

  const chChip = (val, label) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status !== 'open') params.set('status', status);
    if (val) params.set('channel', val);
    return `<a class="fchip${channel === val ? ' active' : ''}" href="/portal/conversations?${params.toString()}">${escHtml(label)}</a>`;
  };
  const channelChips = [chChip('all', t(lang, 'f_all')), chChip('web', 'Web'), chChip('whatsapp', 'WhatsApp')].join('');

  const body = `
    <form method="GET" action="/portal/conversations" class="search-row">
      <input class="form-input" type="search" name="q" value="${escHtml(q)}" placeholder="${t(lang, 'search_ph')}" style="max-width:300px">
      ${status !== 'open' ? `<input type="hidden" name="status" value="${escHtml(status)}">` : ''}
      ${channel !== 'all' ? `<input type="hidden" name="channel" value="${escHtml(channel)}">` : ''}
      <button class="btn btn-ghost btn-sm" type="submit">${t(lang, 'search_btn')}</button>
    </form>
    <div class="fbar">${statusChips}<span class="fbar-sep"></span>${channelChips}</div>
    <div class="card">${rows || `<div class="conv-empty">${q ? t(lang, 'no_results') : t(lang, 'no_convs')}</div>`}</div>`;

  return page(t(lang, 'conversations'), t(lang, 'convs_sub'), body, 'conversations', client, lang);
}

// One row in the inbox list. Colour-blind safe: every status carries an icon + text label.
function convRow(c, lang) {
  const who = escHtml(c.contact_name || (c.channel === 'whatsapp' ? t(lang, 'who_wa') : t(lang, 'who_web')));
  const preview = escHtml(c.last_msg || t(lang, 'no_messages'));
  const badges = [];
  if (c.needs_human) badges.push(`<span class="pill pill-attn">&#9888; ${t(lang, 'badge_attn')}</span>`);
  if (c.bot_paused)  badges.push(`<span class="pill pill-human">&#128100; ${t(lang, 'badge_human')}</span>`);
  if (c.unread && !c.needs_human) badges.push(`<span class="pill pill-new">&#9679; ${t(lang, 'badge_new')}</span>`);
  return `
    <a class="conv-row${c.unread ? ' conv-unread' : ''}" href="/portal/conversations/${escHtml(c.id)}">
      <span class="ch-badge ch-${c.channel === 'whatsapp' ? 'wa' : 'web'}" title="${c.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}">${channelIcon(c.channel)}</span>
      <div class="conv-info">
        <div class="conv-name">${who}</div>
        <div class="conv-preview">${preview}</div>
      </div>
      <div class="conv-meta">
        ${badges.join(' ')}
        <span class="conv-date">${relTime(c.last_message_at || c.started_at, lang)}</span>
      </div>
    </a>`;
}

function channelIcon(channel) {
  if (channel === 'whatsapp') {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15l-1.4 5 5.1-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.5-5.9c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 01-1.9-1.2 7.2 7.2 0 01-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 00-.7.3c-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
}

async function conversationDetailPage(client, convId, env, lang) {
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ? AND client_id = ?')
    .bind(convId, client.id).first();
  if (!conv) return new Response('Not found', { status: 404 });

  const who = escHtml(conv.contact_name || (conv.channel === 'whatsapp' ? t(lang, 'contact_wa') : t(lang, 'contact_web')));
  const chLabel = conv.channel === 'whatsapp' ? 'WhatsApp' : 'Web';
  const phone = conv.contact_phone ? ` · ${escHtml(conv.contact_phone)}` : '';

  const L = {
    pill_human: '&#128100; ' + t(lang, 'pill_human'),
    pill_bot: '&#129302; ' + t(lang, 'pill_bot'),
    btn_return: t(lang, 'btn_return'),
    btn_take: t(lang, 'btn_take'),
    hint_paused: t(lang, 'hint_paused'),
    hint_active: t(lang, 'hint_active'),
    who_you: t(lang, 'who_you'),
    who_assistant: t(lang, 'who_assistant'),
    no_messages: t(lang, 'no_messages'),
    not_delivered_24h: t(lang, 'not_delivered_24h'),
    not_delivered: t(lang, 'not_delivered'),
    attachment: t(lang, 'attachment'),
  };

  const body = `
    <a href="/portal/conversations" class="back-link">&#8592; ${t(lang, 'back')}</a>

    <div class="conv-head">
      <span class="ch-badge ch-${conv.channel === 'whatsapp' ? 'wa' : 'web'}">${channelIcon(conv.channel)}</span>
      <div>
        <div class="conv-head-name">${who}</div>
        <div class="conv-head-sub">${chLabel}${phone}</div>
      </div>
      <div class="conv-head-actions">
        <span id="mode-pill" class="pill"></span>
        <button id="toggle-bot" class="btn btn-ghost btn-sm" onclick="toggleBot()"></button>
        <button id="close-btn" class="btn btn-ghost btn-sm" onclick="toggleClose()">${conv.status === 'closed' ? t(lang, 'reopen_conv') : t(lang, 'close_conv')}</button>
      </div>
    </div>

    <div class="card chat-card">
      <div class="msg-thread" id="thread"><div class="conv-empty">${t(lang, 'loading')}</div></div>
      <div class="reply-row">
        <textarea id="reply" class="reply-input" rows="1" placeholder="${t(lang, 'reply_ph')}"></textarea>
        <button class="btn" id="send-reply" onclick="sendReply()">${t(lang, 'send')}</button>
      </div>
      <div class="reply-hint" id="reply-hint"></div>
    </div>

    <div style="margin-top:6px"><button class="btn btn-ghost btn-sm" onclick="deleteData()" style="color:#991b1b">${t(lang, 'delete_data')}</button></div>

    <script>
      var CONV = ${JSON.stringify(convId)};
      var CONFIRM_DELETE = ${JSON.stringify(t(lang, 'confirm_delete'))};
      var L = ${JSON.stringify({ ...L, close: t(lang, 'close_conv'), reopen: t(lang, 'reopen_conv') })};
      var botPaused = ${conv.bot_paused ? 'true' : 'false'};
      var closed = ${conv.status === 'closed' ? 'true' : 'false'};
      var lastTs = '';

      function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}

      function renderMode(){
        var pill = document.getElementById('mode-pill');
        var btn  = document.getElementById('toggle-bot');
        var hint = document.getElementById('reply-hint');
        if (botPaused){
          pill.className = 'pill pill-human';
          pill.innerHTML = L.pill_human;
          btn.textContent = L.btn_return;
          hint.textContent = L.hint_paused;
        } else {
          pill.className = 'pill pill-bot';
          pill.innerHTML = L.pill_bot;
          btn.textContent = L.btn_take;
          hint.textContent = L.hint_active;
        }
      }

      function bubble(m){
        var cls = m.role === 'user' ? 'user' : (m.role === 'human' ? 'human' : 'assistant');
        var tag = m.role === 'human' ? '<div class="who-tag">'+esc(L.who_you)+'</div>' : (m.role === 'assistant' ? '<div class="who-tag">'+esc(L.who_assistant)+'</div>' : '');
        var media = '';
        if (m.media_url){
          var mu = '/portal/api/media?u=' + encodeURIComponent(m.media_url);
          if ((m.media_type||'').indexOf('image') === 0) media = '<img src="'+mu+'" style="max-width:220px;border-radius:8px;margin-top:6px;display:block">';
          else media = '<a href="'+mu+'" target="_blank" rel="noopener" style="display:block;margin-top:6px;font-size:12px;text-decoration:underline">'+esc(L.attachment)+'</a>';
        }
        var deliv = '';
        if (m.delivery === 'blocked_24h') deliv = '<div class="msg-ts" style="color:#b45309">&#9888; '+esc(L.not_delivered_24h)+'</div>';
        else if (m.delivery === 'failed') deliv = '<div class="msg-ts" style="color:#b45309">&#9888; '+esc(L.not_delivered)+'</div>';
        return '<div class="bubble-wrap '+cls+'">'+tag+'<div class="bubble bubble-'+cls+'">'+esc(m.content)+media+'</div><div class="msg-ts">'+esc(m.ts)+'</div>'+deliv+'</div>';
      }

      function load(initial){
        var u = '/portal/api/conversations/'+CONV + (lastTs ? '?after='+encodeURIComponent(lastTs) : '');
        fetch(u).then(function(r){return r.json();}).then(function(d){
          var msgs = d.messages || [];
          if (typeof d.bot_paused !== 'undefined'){ botPaused = !!d.bot_paused; renderMode(); }
          var thread = document.getElementById('thread');
          if (initial) thread.innerHTML = '';
          if (initial && msgs.length === 0){ thread.innerHTML = '<div class="conv-empty">'+esc(L.no_messages)+'</div>'; return; }
          msgs.forEach(function(m){
            thread.insertAdjacentHTML('beforeend', bubble(m));
            lastTs = m.ts;
          });
          if (msgs.length) thread.scrollTop = thread.scrollHeight;
        });
      }

      function sendReply(){
        var ta = document.getElementById('reply');
        var text = ta.value.trim();
        if (!text) return;
        ta.value = '';
        fetch('/portal/api/conversations/'+CONV+'/reply', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ text: text })
        }).then(function(r){return r.json();}).then(function(){
          botPaused = true; renderMode(); load(false);
        });
      }

      function toggleBot(){
        var next = !botPaused;
        fetch('/portal/api/conversations/'+CONV+'/takeover', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ paused: next })
        }).then(function(r){return r.json();}).then(function(d){
          botPaused = !!d.bot_paused; renderMode();
        });
      }

      function deleteData(){
        if (!confirm(CONFIRM_DELETE)) return;
        fetch('/portal/api/conversations/'+CONV+'/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })
          .then(function(r){return r.json();}).then(function(){ location.href = '/portal/conversations'; });
      }

      function toggleClose(){
        var action = closed ? 'reopen' : 'close';
        fetch('/portal/api/conversations/'+CONV+'/'+action, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })
          .then(function(r){return r.json();}).then(function(){
            closed = !closed;
            document.getElementById('close-btn').textContent = closed ? L.reopen : L.close;
          });
      }

      document.getElementById('reply').addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendReply(); }
      });

      fetch('/portal/api/conversations/'+CONV+'/read', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      renderMode();
      load(true);
      setInterval(function(){ load(false); }, 5000);
    </script>`;

  return page(t(lang, 'conversations'), null, body, 'conversations', client, lang);
}

function conocimientoPage(client, lang) {
  const body = `
    <div class="card">
      <div class="card-body">
        <p class="card-desc">${t(lang, 'know_desc')}</p>
        <div class="form-group">
          <label class="form-label">${t(lang, 'know_label')}</label>
          <textarea class="form-input" id="knowledge" placeholder="${escHtml(t(lang, 'know_ph'))}">${escHtml(client.knowledge || '')}</textarea>
        </div>
        <button class="btn" onclick="save()">${t(lang, 'save')}</button>
        <span id="save-status" class="save-status"></span>
      </div>
    </div>
    <script>
      function save() {
        var status = document.getElementById('save-status');
        status.textContent = ${JSON.stringify(t(lang, 'saving'))};
        fetch('/portal/api/knowledge', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({knowledge: document.getElementById('knowledge').value})
        }).then(function(r) { return r.json(); }).then(function() {
          status.textContent = ${JSON.stringify(t(lang, 'saved'))};
          setTimeout(function(){ status.textContent = ''; }, 3000);
        }).catch(function() { status.textContent = ${JSON.stringify(t(lang, 'save_err'))}; });
      }
    </script>`;
  return page(t(lang, 'knowledge'), t(lang, 'know_sub'), body, 'conocimiento', client, lang);
}

async function configuracionPage(client, env, lang) {
  const shopify = await env.DB.prepare("SELECT shop_domain, active FROM integrations WHERE client_id = ? AND kind = 'shopify'").bind(client.id).first();
  const connected = shopify && shopify.active;

  const body = `
    <div class="card" style="max-width:520px">
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">${t(lang, 'bot_name_label')}</label>
          <input class="form-input" id="bot_name" type="text" value="${escHtml(client.bot_name || 'Angela')}" placeholder="Angela">
          <div class="form-hint">${t(lang, 'bot_name_hint')}</div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'color_label')}</label>
          <input id="widget_color" type="color" value="${/^#[0-9a-fA-F]{6}$/.test(client.widget_color || '') ? client.widget_color : '#1f1a14'}" style="width:54px;height:38px;border:1px solid #ddd;border-radius:8px;padding:2px;cursor:pointer;vertical-align:middle">
          <div class="form-hint">${t(lang, 'color_hint')}</div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'wa_pub_label')}</label>
          <input class="form-input" id="wa" type="text" value="${escHtml(client.wa_number || '')}" placeholder="+573001234567">
          <div class="form-hint">${t(lang, 'wa_pub_hint')}</div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'booking_label')}</label>
          <input class="form-input" id="booking_url" type="text" value="${escHtml(client.booking_url || '')}" placeholder="https://cal.com/tunegocio">
          <div class="form-hint">${t(lang, 'booking_hint')}</div>
        </div>
        <div class="divider"></div>
        <button class="btn" onclick="save()">${t(lang, 'save')}</button>
        <span id="save-status" class="save-status"></span>
      </div>
    </div>

    <div class="section-label" style="margin-top:6px">${t(lang, 'alerts_section')}</div>
    <div class="card" style="max-width:520px">
      <div class="card-body">
        <p class="card-desc">${t(lang, 'alerts_desc')}</p>
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:9px;cursor:pointer">
            <input type="checkbox" id="alerts_enabled" ${client.alerts_enabled === 0 ? '' : 'checked'} style="width:16px;height:16px">
            ${t(lang, 'alerts_enable')}
          </label>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'email_label')}</label>
          <input class="form-input" id="notify_email" type="email" value="${escHtml(client.notify_email || '')}" placeholder="${t(lang, 'email_ph')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'notify_wa_label')}</label>
          <input class="form-input" id="notify_wa" type="text" value="${escHtml(client.notify_wa || '')}" placeholder="+573001234567">
          <div class="form-hint">${t(lang, 'notify_wa_hint')}</div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'quiet_label')}</label>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="form-hint" style="margin:0">${t(lang, 'quiet_from')}</span>
            <input class="form-input" id="quiet_start" type="number" min="0" max="23" value="${client.quiet_start ?? ''}" placeholder="21" style="width:80px">
            <span class="form-hint" style="margin:0">${t(lang, 'quiet_to')}</span>
            <input class="form-input" id="quiet_end" type="number" min="0" max="23" value="${client.quiet_end ?? ''}" placeholder="7" style="width:80px">
            <span class="form-hint" style="margin:0">${t(lang, 'quiet_tz')}</span>
          </div>
          <div class="form-hint">${t(lang, 'quiet_hint')}</div>
        </div>
        <button class="btn" onclick="save()">${t(lang, 'save')}</button>
        <span id="save-status2" class="save-status"></span>
      </div>
    </div>

    <div class="section-label" style="margin-top:6px">${t(lang, 'shop_section')}</div>
    <div class="card" style="max-width:520px">
      <div class="card-body">
        <p class="card-desc">
          ${t(lang, 'shop_desc')}
          ${connected ? `<br><b style="color:#128c4b">&#10003; ${t(lang, 'connected')}</b> ${t(lang, 'to')} ` + escHtml(shopify.shop_domain) : ''}
        </p>
        <div class="form-group">
          <label class="form-label">${t(lang, 'shop_domain_label')}</label>
          <input class="form-input" id="shop_domain" type="text" value="${escHtml(shopify?.shop_domain || '')}" placeholder="mitienda.myshopify.com">
        </div>
        <div class="form-group">
          <label class="form-label">${t(lang, 'token_label')}</label>
          <input class="form-input" id="shop_token" type="password" placeholder="${connected ? t(lang, 'token_ph_keep') : 'shpat_...'}">
          <div class="form-hint">${t(lang, 'token_hint')} ${connected ? t(lang, 'token_hint_keep') : ''}</div>
        </div>
        <button class="btn" onclick="saveShopify()">${connected ? t(lang, 'btn_update') : t(lang, 'btn_connect')}</button>
        ${connected ? `<button class="btn btn-ghost" onclick="disconnectShopify()" style="margin-left:8px">${t(lang, 'btn_disconnect')}</button>` : ''}
        <span id="shop-status" class="save-status"></span>
      </div>
    </div>

    <script>
      var MSG = { saving: ${JSON.stringify(t(lang, 'saving'))}, saved: ${JSON.stringify(t(lang, 'saved'))}, err: ${JSON.stringify(t(lang, 'err'))}, store_connected: ${JSON.stringify(t(lang, 'store_connected'))}, confirm_disconnect: ${JSON.stringify(t(lang, 'confirm_disconnect'))} };
      function save() {
        var s1 = document.getElementById('save-status');
        var s2 = document.getElementById('save-status2');
        if (s1) s1.textContent = MSG.saving;
        if (s2) s2.textContent = MSG.saving;
        fetch('/portal/api/settings', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            wa_number: document.getElementById('wa').value,
            notify_wa: document.getElementById('notify_wa').value,
            notify_email: document.getElementById('notify_email').value,
            bot_name: document.getElementById('bot_name').value,
            booking_url: document.getElementById('booking_url').value,
            widget_color: document.getElementById('widget_color').value,
            alerts_enabled: document.getElementById('alerts_enabled').checked,
            quiet_start: document.getElementById('quiet_start').value,
            quiet_end: document.getElementById('quiet_end').value
          })
        }).then(function(r) { return r.json(); }).then(function() {
          if (s1) s1.textContent = MSG.saved;
          if (s2) s2.textContent = MSG.saved;
          setTimeout(function(){ if(s1)s1.textContent=''; if(s2)s2.textContent=''; }, 3000);
        }).catch(function() { if(s1)s1.textContent=MSG.err; if(s2)s2.textContent=MSG.err; });
      }
      function saveShopify() {
        var status = document.getElementById('shop-status');
        status.textContent = MSG.saving;
        fetch('/portal/api/integrations/shopify', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ shop_domain: document.getElementById('shop_domain').value, api_token: document.getElementById('shop_token').value })
        }).then(function(r) { return r.json(); }).then(function(d) {
          status.textContent = d.ok ? MSG.store_connected : (d.error || MSG.err);
          if (d.ok) setTimeout(function(){ location.reload(); }, 900);
        }).catch(function() { status.textContent = MSG.err; });
      }
      function disconnectShopify() {
        if (!confirm(MSG.confirm_disconnect)) return;
        fetch('/portal/api/integrations/shopify', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ shop_domain: '', api_token: '' })
        }).then(function(r){ return r.json(); }).then(function(){ location.reload(); });
      }
    </script>`;
  return page(t(lang, 'settings'), t(lang, 'set_sub'), body, 'configuracion', client, lang);
}

function widgetPage(client, origin, lang) {
  const snippet = `<script src="${origin}/widget.js?c=${client.id}" defer></script>`;
  const body = `
    <div class="card" style="max-width:620px">
      <div class="card-body">
        <p class="card-desc">
          ${t(lang, 'widget_desc1')} <code style="font-family:monospace;font-size:12px;background:#f3f4f6;padding:2px 5px;border-radius:4px">&lt;/body&gt;</code> ${t(lang, 'widget_desc2')}
        </p>
        <div class="section-label">${t(lang, 'install_code')}</div>
        <div class="code-block" id="snippet">${escHtml(snippet)}</div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:12px">
          <button class="btn btn-ghost" onclick="copy()">${t(lang, 'copy')}</button>
          <span id="copy-status" class="save-status"></span>
        </div>
      </div>
    </div>
    <script>
      function copy() {
        navigator.clipboard.writeText(${JSON.stringify(snippet)}).then(function() {
          document.getElementById('copy-status').textContent = ${JSON.stringify(t(lang, 'copied'))};
          setTimeout(function(){ document.getElementById('copy-status').textContent = ''; }, 2500);
        });
      }
    </script>`;
  return page(t(lang, 'install'), t(lang, 'widget_sub'), body, 'widget', client, lang);
}

function manualPage(client, lang) {
  const name = escHtml(client.bot_name || 'Angela');
  const es = `
    <div class="card"><div class="card-body manual">
      <p>${name} es tu asistente: responde a tus clientes en tu sitio web y por WhatsApp, y te avisa cuando alguien necesita tu atencion. Aqui esta lo basico.</p>
      <h2>1. La bandeja de conversaciones</h2>
      <p>En <span class="step">Conversaciones</span> ves todos los chats, los de la web y los de WhatsApp, en un solo lugar. Los mas recientes y los que necesitan atencion aparecen primero. Cada uno muestra el canal, el nombre o numero del cliente, y una etiqueta:</p>
      <p>&#9888; <b>Necesita atencion</b>: el asistente pidio tu ayuda. &#128100; <b>Tu respondes</b>: tomaste el control. &#9679; <b>Nuevo</b>: hay un mensaje sin abrir. El numero junto a "Conversaciones" en el menu es cuantas conversaciones tienen mensajes sin abrir.</p>
      <h2>2. Responder tu mismo (tomar el control)</h2>
      <p>Abre una conversacion y escribe en el recuadro de respuesta, o pulsa <span class="step">Tomar el control</span>. El asistente se queda callado y tus mensajes le llegan al cliente directo (por la web o por WhatsApp, segun el canal). Para que el asistente vuelva a responder solo, pulsa <span class="step">Devolver al asistente</span>.</p>
      <h2>3. Entrenar al asistente (Conocimiento)</h2>
      <p>En <span class="step">Conocimiento</span> escribe todo lo que el asistente debe saber: productos, precios, zonas de entrega, horarios, preguntas frecuentes. Cuanto mas detalle, mejores respuestas. Si no sabe algo, dice "permiteme un momento" y te avisa.</p>
      <h2>4. Avisos cuando un cliente escribe</h2>
      <p>En <span class="step">Configuracion</span> activas los avisos y pones tu email y tu WhatsApp. Cuando un cliente escribe y nadie ha respondido, te llega un aviso con un enlace directo a la conversacion. Recibes un solo aviso por conversacion, con una pausa de 30 minutos para no llenarte de mensajes. Puedes definir horas en silencio (por ejemplo de 9pm a 7am) en las que no quieres recibir avisos.</p>
      <h2>5. Ponerle nombre a tu asistente</h2>
      <p>En <span class="step">Configuracion</span> puedes cambiar el nombre que ven tus clientes en el chat. Por defecto es ${name}.</p>
      <h2>6. Estado de pedidos (si usas Shopify)</h2>
      <p>Si conectas tu tienda Shopify en <span class="step">Configuracion</span>, el asistente puede decirle a tus clientes en que va su pedido (pago, preparacion, envio y entrega). Solo lectura: nunca modifica nada. El cliente da su numero de pedido y el correo de compra para verificar.</p>
      <h2>7. Instalar el asistente en tu sitio</h2>
      <p>En <span class="step">Instalar widget</span> copias un codigo y lo pegas en tu sitio web. El chat aparece automaticamente.</p>
      <h2>8. Mas funciones</h2>
      <p>En <span class="step">Conversaciones</span> puedes buscar por nombre, numero o texto, filtrar por estado o canal, y cerrar una conversacion cuando termine. En <span class="step">Configuracion</span> puedes cambiar el color del chat, poner un enlace para agendar citas y conectar tu tienda Shopify. El chat de tu sitio muestra un enlace a la politica de privacidad.</p>

      <p style="margin-top:22px;color:#888">Si tienes dudas, escribe a PymeWebPro y te ayudamos.</p>
    </div></div>`;
  const en = `
    <div class="card"><div class="card-body manual">
      <p>${name} is your assistant: it answers your customers on your website and on WhatsApp, and alerts you when someone needs your attention. Here are the basics.</p>
      <h2>1. The conversation inbox</h2>
      <p>Under <span class="step">Conversations</span> you see every chat, web and WhatsApp, in one place. The most recent ones and the ones that need attention show first. Each shows the channel, the customer's name or number, and a label:</p>
      <p>&#9888; <b>Needs attention</b>: the assistant asked for your help. &#128100; <b>You are replying</b>: you took over. &#9679; <b>New</b>: there is an unopened message. The number next to "Conversations" in the menu is how many conversations have unread messages.</p>
      <h2>2. Reply yourself (take over)</h2>
      <p>Open a conversation and type in the reply box, or press <span class="step">Take over</span>. The assistant stays quiet and your messages go straight to the customer (over web or WhatsApp, depending on the channel). To let the assistant answer on its own again, press <span class="step">Hand back to assistant</span>.</p>
      <h2>3. Train the assistant (Knowledge)</h2>
      <p>Under <span class="step">Knowledge</span> write everything the assistant should know: products, prices, delivery areas, hours, FAQs. The more detail, the better the answers. If it does not know something, it says "one moment please" and alerts you.</p>
      <h2>4. Alerts when a customer writes</h2>
      <p>Under <span class="step">Settings</span> you turn alerts on and add your email and WhatsApp. When a customer writes and nobody has replied, you get an alert with a direct link to the conversation. You get one alert per conversation, with a 30-minute pause so you are not flooded. You can set quiet hours (for example 9pm to 7am) when you do not want alerts.</p>
      <h2>5. Name your assistant</h2>
      <p>Under <span class="step">Settings</span> you can change the name your customers see in the chat. The default is ${name}.</p>
      <h2>6. Order status (if you use Shopify)</h2>
      <p>If you connect your Shopify store under <span class="step">Settings</span>, the assistant can tell your customers where their order is (paid, preparing, shipped and delivered). Read-only: it never changes anything. The customer gives their order number and purchase email to verify.</p>
      <h2>7. Install the assistant on your site</h2>
      <p>Under <span class="step">Install widget</span> you copy a snippet and paste it on your website. The chat appears automatically.</p>
      <h2>8. More features</h2>
      <p>Under <span class="step">Conversations</span> you can search by name, number or text, filter by status or channel, and close a conversation when it's done. Under <span class="step">Settings</span> you can change the chat colour, add a booking link, and connect your Shopify store. Your site's chat shows a link to the privacy policy.</p>

      <p style="margin-top:22px;color:#888">If you have questions, write to PymeWebPro and we will help.</p>
    </div></div>`;
  return page(t(lang, 'how_to') + ' ' + (client.bot_name || 'Angela'), t(lang, 'manual_sub'), lang === 'en' ? en : es, 'manual', client, lang);
}

function loginPage(lang, error) {
  return new Response(`<!DOCTYPE html><html lang="${lang}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Angela · Acceso</title>
    <style>${CSS}</style>
  </head><body>
    <div class="login-bg">
      <div class="login-card">
        <div class="login-icon">${CHAT_ICON}</div>
        <div class="login-title">Angela</div>
        <div class="login-sub">${t(lang, 'login_sub')}</div>
        ${error ? `<div class="alert alert-error">${escHtml(error)}</div>` : ''}
        <form method="POST" action="/portal/login">
          <div class="form-group">
            <label class="form-label">${t(lang, 'token_access')}</label>
            <input class="form-input" name="token" type="password" placeholder="••••••••••••" autofocus required>
            <div class="form-hint">${t(lang, 'token_access_hint')}</div>
          </div>
          <button class="btn" type="submit" style="width:100%;justify-content:center">${t(lang, 'enter')}</button>
        </form>
        <div class="login-footer">
          <a onclick="setLang('es')" style="cursor:pointer${lang === 'es' ? ';font-weight:700;color:#444' : ''}">ES</a>
          &nbsp;·&nbsp;
          <a onclick="setLang('en')" style="cursor:pointer${lang === 'en' ? ';font-weight:700;color:#444' : ''}">EN</a>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <a href="https://pymewebpro.com" target="_blank" rel="noopener">pymewebpro.com</a>
        </div>
      </div>
    </div>
    <script>function setLang(l){ document.cookie='pwp_lang='+l+';path=/;max-age=31536000;samesite=lax'; location.reload(); }</script>
  </body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---- Helpers ---- */

export function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// True if the timestamp is within the last 24h (WhatsApp free-form send window).
function within24h(ts) {
  if (!ts) return false;
  const t = Date.parse(String(ts).replace(' ', 'T') + 'Z');
  return !isNaN(t) && (Date.now() - t) < 24 * 60 * 60 * 1000;
}

function relTime(ts, lang) {
  if (!ts) return '';
  try {
    const diff = Date.now() - new Date(ts + 'Z').getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t(lang, 't_now');
    if (m < 60) return lang === 'en' ? `${m}m ago` : `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return lang === 'en' ? `${h}h ago` : `hace ${h}h`;
    const d = Math.floor(h / 24);
    return lang === 'en' ? `${d}d ago` : `hace ${d}d`;
  } catch { return ts; }
}
