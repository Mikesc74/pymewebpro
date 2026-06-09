// widget.js — GET /widget.js?c=CLIENT_ID
// Returns a self-contained JS snippet that renders the chat bubble.
// No external dependencies. Injects its own CSS.

export async function handleWidget(request, env) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('c');

  if (!clientId) {
    return new Response('// Missing client id', { status: 400, headers: { 'Content-Type': 'application/javascript' } });
  }

  // Per-client bot display name + brand colour (clients set these in Settings).
  let botName = 'Angela';
  let color = '${color}';
  try {
    const row = await env.DB.prepare('SELECT bot_name, widget_color FROM clients WHERE id = ? AND active = 1').bind(clientId).first();
    if (row?.bot_name) botName = row.bot_name;
    if (row?.widget_color && /^#[0-9a-fA-F]{3,8}$/.test(row.widget_color)) color = row.widget_color;
  } catch { /* fall back to defaults */ }

  const origin = url.origin; // e.g. https://asistente.pymewebpro.com
  const js = buildWidgetJS(clientId, origin, botName, color);

  return new Response(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function buildWidgetJS(clientId, origin, botName, color) {
  return `
(function() {
  if (window.__pwpAsistente) return;
  window.__pwpAsistente = true;

  var CLIENT_ID   = ${JSON.stringify(clientId)};
  var API_ORIGIN  = ${JSON.stringify(origin)};
  var BOT_NAME    = ${JSON.stringify(botName || 'Angela')};
  var convId      = null;
  var open        = false;
  var lastTs      = '';      // server ts of the last message we have shown
  var pollTimer   = null;

  /* ---- Styles ---- */
  var css = \`
    #pwp-launcher {
      position: fixed; bottom: 24px; right: 24px; z-index: 99998;
      width: 52px; height: 52px; border-radius: 50%;
      background: ${color}; color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.18); transition: transform .15s ease;
    }
    #pwp-launcher:hover { transform: scale(1.07); }
    #pwp-launcher svg { width: 24px; height: 24px; }

    #pwp-box {
      position: fixed; bottom: 86px; right: 24px; z-index: 99997;
      width: 340px; max-width: calc(100vw - 32px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.13);
      display: none; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #pwp-box.pwp-open { display: flex; }

    #pwp-header {
      background: ${color}; color: #fdfaf2;
      padding: 14px 16px; font-size: 14px; font-weight: 600;
      display: flex; align-items: center; gap: 10px;
    }
    #pwp-header-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #c9a84c; flex-shrink: 0;
    }
    #pwp-header-name { flex: 1; }
    #pwp-close-btn {
      background: none; border: none; color: #fdfaf2; cursor: pointer;
      font-size: 20px; line-height: 1; padding: 0; opacity: .7;
    }
    #pwp-close-btn:hover { opacity: 1; }

    #pwp-messages {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 8px;
      min-height: 220px; max-height: 340px;
    }

    .pwp-msg {
      max-width: 82%; padding: 9px 13px; border-radius: 14px;
      font-size: 13.5px; line-height: 1.5; word-break: break-word;
    }
    .pwp-msg-user {
      align-self: flex-end; background: ${color}; color: #fdfaf2;
      border-bottom-right-radius: 4px;
    }
    .pwp-msg-assistant {
      align-self: flex-start; background: #f4f4f4; color: ${color};
      border-bottom-left-radius: 4px;
    }
    .pwp-msg-assistant.pwp-typing { opacity: .6; font-style: italic; }

    .pwp-route-btn {
      display: inline-block; margin-top: 8px; padding: 8px 14px;
      background: #c9a84c; color: #1f1a14; border-radius: 999px;
      font-size: 12.5px; font-weight: 600; text-decoration: none;
      transition: opacity .15s ease;
    }
    .pwp-route-btn:hover { opacity: .85; }

    #pwp-input-row {
      display: flex; gap: 8px; padding: 10px 12px;
      border-top: 1px solid #f0f0f0;
    }
    #pwp-foot { text-align: center; padding: 0 0 8px; }
    #pwp-foot a { font-size: 10px; color: #aaa; text-decoration: none; }
    #pwp-foot a:hover { text-decoration: underline; }
    #pwp-input {
      flex: 1; border: 1px solid #e0e0e0; border-radius: 999px;
      padding: 9px 14px; font-size: 13.5px; outline: none;
      font-family: inherit; background: #fafafa;
      transition: border-color .15s ease;
    }
    #pwp-input:focus { border-color: ${color}; background: #fff; }
    #pwp-send {
      width: 38px; height: 38px; border-radius: 50%; border: none;
      background: ${color}; color: #fff; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .15s ease;
    }
    #pwp-send:hover { opacity: .8; }
    #pwp-send svg { width: 16px; height: 16px; }
  \`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---- Launcher button ---- */
  var launcher = document.createElement('button');
  launcher.id = 'pwp-launcher';
  launcher.setAttribute('aria-label', 'Abrir chat');
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(launcher);

  /* ---- Chat box ---- */
  var box = document.createElement('div');
  box.id = 'pwp-box';
  box.innerHTML = \`
    <div id="pwp-header">
      <span id="pwp-header-dot"></span>
      <span id="pwp-header-name">Asistente</span>
      <button id="pwp-close-btn" aria-label="Cerrar">&times;</button>
    </div>
    <div id="pwp-messages"></div>
    <div id="pwp-input-row">
      <input id="pwp-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" />
      <button id="pwp-send" aria-label="Enviar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div id="pwp-foot"><a href="${origin}/privacidad" target="_blank" rel="noopener">Privacidad</a></div>
  \`;
  document.body.appendChild(box);

  var msgs   = document.getElementById('pwp-messages');
  var input  = document.getElementById('pwp-input');
  var sendBtn= document.getElementById('pwp-send');

  /* ---- Bot name ---- */
  document.getElementById('pwp-header-name').textContent = BOT_NAME;

  /* ---- Greeting ---- */
  addMsg('assistant', 'Hola, soy ' + BOT_NAME + '. En que te puedo ayudar hoy?');

  /* ---- Toggle ---- */
  launcher.addEventListener('click', function() { toggle(true); });
  document.getElementById('pwp-close-btn').addEventListener('click', function() { toggle(false); });

  function toggle(state) {
    open = state;
    box.classList.toggle('pwp-open', open);
    launcher.setAttribute('aria-label', open ? 'Cerrar chat' : 'Abrir chat');
    if (open) { input.focus(); }
  }

  /* ---- Send ---- */
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    showTyping();

    fetch(API_ORIGIN + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, conversation_id: convId, message: text }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      removeTyping();
      convId = data.conversation_id;
      if (data.server_ts) lastTs = data.server_ts;
      var replyText = (data.reply || '')
        .replace('[IR_A_WHATSAPP]', '')
        .replace('[IR_A_CITA]', '')
        .trim();
      if (replyText) addMsg('assistant', replyText, data.route);
      startPolling();
    })
    .catch(function() {
      removeTyping();
      addMsg('assistant', 'Hubo un problema. Por favor intenta de nuevo.');
    });
  }

  /* ---- Poll for replies typed by the business owner (human takeover) ---- */
  function startPolling() {
    if (pollTimer || !convId) return;
    pollTimer = setInterval(pollOnce, 3000);
  }
  function pollOnce() {
    if (!convId) return;
    fetch(API_ORIGIN + '/api/poll?conversation=' + encodeURIComponent(convId) + '&after=' + encodeURIComponent(lastTs))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        (d.messages || []).forEach(function(m) {
          addMsg('assistant', String(m.content || '').trim());
          lastTs = m.ts;
        });
      })
      .catch(function() {});
  }

  function addMsg(role, text, route) {
    var el = document.createElement('div');
    el.className = 'pwp-msg pwp-msg-' + role;
    el.textContent = text;

    if (route && route.type === 'whatsapp' && route.url) {
      var btn = document.createElement('a');
      btn.className = 'pwp-route-btn';
      btn.href = route.url;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = 'Continuar por WhatsApp';
      var wrapper = document.createElement('div');
      wrapper.appendChild(el);
      wrapper.appendChild(btn);
      msgs.appendChild(wrapper);
    } else if (route && route.type === 'cita') {
      var wrapper = document.createElement('div');
      wrapper.appendChild(el);
      if (route.url) {
        var bbtn = document.createElement('a');
        bbtn.className = 'pwp-route-btn';
        bbtn.href = route.url; bbtn.target = '_blank'; bbtn.rel = 'noopener';
        bbtn.textContent = 'Reservar una cita';
        wrapper.appendChild(bbtn);
      } else {
        wrapper.appendChild(buildCitaForm());
      }
      msgs.appendChild(wrapper);
    } else {
      msgs.appendChild(el);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function buildCitaForm() {
    var form = document.createElement('div');
    form.style.cssText = 'margin-top:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;';
    form.innerHTML = \`
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:2px">Agendar cita</div>
      <input class="pwp-cita-input" placeholder="Tu nombre" style="padding:8px 11px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none" />
      <input class="pwp-cita-input" placeholder="Telefono o email" style="padding:8px 11px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none" />
      <input class="pwp-cita-input" placeholder="Cuando prefieres? (dia y hora)" style="padding:8px 11px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none" />
      <button style="padding:9px;background:${color};color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Solicitar cita</button>
      <div class="pwp-cita-status" style="font-size:12px;color:#6b7280;display:none"></div>
    \`;
    var inputs = form.querySelectorAll('.pwp-cita-input');
    var submitBtn = form.querySelector('button');
    var status = form.querySelector('.pwp-cita-status');
    submitBtn.addEventListener('click', function() {
      var name = inputs[0].value.trim();
      var contact = inputs[1].value.trim();
      var time = inputs[2].value.trim();
      if (!name || !contact) { status.textContent = 'Por favor completa nombre y contacto.'; status.style.display='block'; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      fetch(API_ORIGIN + '/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, conversation_id: convId, name: name, contact: contact, preferred_time: time }),
      })
      .then(function(r) { return r.json(); })
      .then(function() {
        form.innerHTML = '<div style="font-size:13px;color:#15803d;padding:4px 0">Solicitud enviada. Te contactaremos pronto para confirmar.</div>';
      })
      .catch(function() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Solicitar cita';
        status.textContent = 'Error. Por favor intenta de nuevo.';
        status.style.display = 'block';
      });
    });
    return form;
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'pwp-msg pwp-msg-assistant pwp-typing';
    typingEl.textContent = 'Escribiendo...';
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function removeTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  /* ---- Expose launcher for external triggers ---- */
  window.pwpAsistenteOpen = function() { toggle(true); };
})();
`;
}
