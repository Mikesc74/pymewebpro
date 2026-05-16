// ============================================================================
// Chief of Staff · widget flotante (bottom-right) en español
// ============================================================================
// Exporta una sola constante de HTML lista para inyectar antes de </body>
// en cualquier página admin (CRM + SPA).
//
// Requisitos en la página huésped:
//   - localStorage.getItem("pwp_admin") debe contener el bearer token admin
//     (lo que ya hacen tanto crm.js como FRONTEND_HTML).
//   - El origen debe ser portal.pymewebpro.com (misma origen que la API).
//
// Sin em dashes.
// ============================================================================

// El HTML lleva un <script> con código de cliente. Dentro de esa <script>
// cualquier interpolación literal "${...}" se escapa como "\${...}" para que
// el motor JS del navegador la vea como string template (en el caso del
// cliente) y no la confunda con interpolación del template literal externo.

export const CHIEF_OF_STAFF_WIDGET_HTML = `
<style id="cos-style">
  :root {
    --cos-accent: #FF5C2E;
    --cos-accent-soft: #FFEDE5;
    --cos-ink: #1A2032;
    --cos-ink-soft: #5A6478;
    --cos-line: #E7E6E1;
    --cos-bg: #FFFFFF;
    --cos-bg-soft: #FAFAF7;
  }
  #cos-launcher {
    position: fixed;
    right: 1.25rem;
    bottom: 1.25rem;
    z-index: 99999;
    width: 56px; height: 56px;
    border-radius: 999px;
    background: var(--cos-accent);
    color: #FFFFFF;
    border: none;
    box-shadow: 0 12px 28px rgba(255,92,46,0.32), 0 2px 6px rgba(0,0,0,0.10);
    cursor: pointer;
    display: none;
    align-items: center; justify-content: center;
    font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Inter Tight", system-ui, sans-serif;
    transition: transform 120ms ease;
  }
  #cos-launcher[data-ready="1"] { display: flex; }
  #cos-launcher:hover { transform: translateY(-1px) scale(1.03); }
  #cos-launcher svg { width: 24px; height: 24px; display: block; }
  #cos-launcher[data-open="1"] { background: var(--cos-ink); }

  #cos-panel {
    position: fixed;
    right: 1.25rem;
    bottom: 5.5rem;
    z-index: 99999;
    width: min(380px, calc(100vw - 2rem));
    height: min(560px, calc(100vh - 7rem));
    background: var(--cos-bg);
    border: 1px solid var(--cos-line);
    border-radius: 14px;
    box-shadow: 0 24px 60px rgba(10,14,39,0.20), 0 4px 12px rgba(10,14,39,0.08);
    display: none;
    flex-direction: column;
    overflow: hidden;
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
    color: var(--cos-ink);
  }
  #cos-panel[data-open="1"] { display: flex; }

  #cos-head {
    padding: 1rem 1.1rem;
    background: var(--cos-accent);
    color: #FFFFFF;
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.5rem;
    border-bottom: 1px solid rgba(0,0,0,0.10);
  }
  #cos-head .cos-title {
    font: 700 18px/1.2 "Inter Tight", -apple-system, system-ui, sans-serif;
    letter-spacing: 0.005em;
    color: #FFFFFF;
    text-shadow: 0 1px 0 rgba(0,0,0,0.15);
  }
  #cos-head .cos-sub {
    font-size: 13px;
    color: #FFFFFF;
    margin-top: 4px;
    font-weight: 600;
    opacity: 0.95;
  }
  #cos-head .cos-actions { display: flex; gap: 0.25rem; }
  #cos-head button {
    background: rgba(255,255,255,0.20);
    color: #FFFFFF;
    border: none;
    cursor: pointer;
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
  }
  #cos-head button:hover { background: rgba(255,255,255,0.35); }

  #cos-log {
    flex: 1; overflow-y: auto;
    padding: 0.85rem;
    background: var(--cos-bg-soft);
    display: flex; flex-direction: column; gap: 0.6rem;
  }
  .cos-msg {
    max-width: 86%;
    padding: 0.55rem 0.75rem;
    border-radius: 12px;
    font-size: 13.5px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .cos-msg.user {
    align-self: flex-end;
    background: var(--cos-accent);
    color: #FFFFFF;
    border-bottom-right-radius: 4px;
  }
  .cos-msg.assistant {
    align-self: flex-start;
    background: #FFFFFF;
    color: var(--cos-ink);
    border: 1px solid var(--cos-line);
    border-bottom-left-radius: 4px;
  }
  .cos-msg.system {
    align-self: center;
    background: transparent;
    color: var(--cos-ink-soft);
    font-size: 12px;
    font-style: italic;
  }
  .cos-msg.error {
    align-self: stretch;
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
    font-size: 12.5px;
  }
  .cos-typing {
    align-self: flex-start;
    display: inline-flex;
    gap: 4px;
    padding: 0.55rem 0.75rem;
    background: #FFFFFF;
    border: 1px solid var(--cos-line);
    border-radius: 12px;
    border-bottom-left-radius: 4px;
  }
  .cos-typing span {
    width: 6px; height: 6px; border-radius: 999px;
    background: var(--cos-ink-soft);
    opacity: 0.4;
    animation: cos-bounce 1.2s infinite ease-in-out;
  }
  .cos-typing span:nth-child(2) { animation-delay: 0.15s; }
  .cos-typing span:nth-child(3) { animation-delay: 0.30s; }
  @keyframes cos-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40% { transform: scale(1); opacity: 0.9; }
  }
  .cos-trace {
    align-self: flex-start;
    font-size: 11px;
    color: var(--cos-ink-soft);
    background: rgba(26,32,50,0.04);
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }

  #cos-input-row {
    border-top: 1px solid var(--cos-line);
    padding: 0.55rem;
    background: var(--cos-bg);
    display: flex;
    gap: 0.4rem;
    align-items: flex-end;
  }
  #cos-input {
    flex: 1;
    min-height: 34px;
    max-height: 120px;
    resize: none;
    border: 1px solid var(--cos-line);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font: 13.5px/1.4 -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
    color: var(--cos-ink);
    background: var(--cos-bg-soft);
    outline: none;
  }
  #cos-input:focus { border-color: var(--cos-accent); background: #FFFFFF; }
  #cos-send {
    background: var(--cos-accent);
    color: #FFFFFF;
    border: none;
    padding: 0 0.85rem;
    height: 34px;
    border-radius: 8px;
    cursor: pointer;
    font: 600 13px/1 "Inter Tight", system-ui, sans-serif;
  }
  #cos-send:disabled { opacity: 0.45; cursor: default; }

  #cos-foot {
    padding: 0.4rem 0.85rem;
    background: var(--cos-bg);
    border-top: 1px solid var(--cos-line);
    font-size: 10.5px;
    color: var(--cos-ink-soft);
    display: flex; justify-content: space-between; align-items: center;
  }
  #cos-foot button {
    background: transparent; border: none; cursor: pointer;
    color: var(--cos-ink-soft);
    font-size: 10.5px;
    text-decoration: underline;
    padding: 0;
  }
</style>

<button id="cos-launcher" type="button" aria-label="Abrir Chief of Staff">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a8 8 0 0 1-11.5 7.18L4 21l1.82-5.5A8 8 0 1 1 21 12z"/>
  </svg>
</button>

<div id="cos-panel" role="dialog" aria-label="Chief of Staff">
  <div id="cos-head">
    <div>
      <div class="cos-title">Chief of Staff</div>
      <div class="cos-sub">Jefe de gabinete · PymeWebPro</div>
    </div>
    <div class="cos-actions">
      <button id="cos-reset" type="button" title="Nueva conversación" aria-label="Nueva conversación">↺</button>
      <button id="cos-close" type="button" title="Cerrar" aria-label="Cerrar">×</button>
    </div>
  </div>
  <div id="cos-log"></div>
  <div id="cos-input-row">
    <textarea id="cos-input" rows="1" placeholder="Pregúntame algo · Enter para enviar"></textarea>
    <button id="cos-send" type="button">Enviar</button>
  </div>
  <div id="cos-foot">
    <span>Claude Sonnet · acceso de admin</span>
    <button id="cos-trace-toggle" type="button">trazas</button>
  </div>
</div>

<script>
(function() {
  if (window.__cosInited) return;
  window.__cosInited = true;

  var ADMIN_KEY = "pwp_admin";
  var HISTORY_KEY = "pwp_cos_history_v1";
  var SHOW_TRACE_KEY = "pwp_cos_show_trace";
  // Master-portal base prepended at call time so the widget works both on the
  // legacy portal.pymewebpro.com URL (where window.PWP_BASE is undefined) and
  // on colguides.com/portal/pymewebpro/* (where the worker injects it).
  var ENDPOINT = "/api/admin/chief-of-staff/chat";
  function cosEndpoint() { return (window.PWP_BASE || "") + ENDPOINT; }

  var launcher = document.getElementById("cos-launcher");
  var panel    = document.getElementById("cos-panel");
  var closeBtn = document.getElementById("cos-close");
  var resetBtn = document.getElementById("cos-reset");
  var log      = document.getElementById("cos-log");
  var input    = document.getElementById("cos-input");
  var sendBtn  = document.getElementById("cos-send");
  var traceBtn = document.getElementById("cos-trace-toggle");

  var showTrace = localStorage.getItem(SHOW_TRACE_KEY) === "1";
  var history = loadHistory();
  var busy = false;

  // Only show the launcher when an admin token is present in localStorage.
  // The SPA is the same HTML for clients and admins. Without this gate
  // clients would see the orange button and an unhelpful error if they
  // tapped it. Re-check periodically in case the user logs in mid-session.
  function refreshVisibility() {
    var tok = localStorage.getItem(ADMIN_KEY);
    if (tok) launcher.setAttribute("data-ready", "1");
    else {
      launcher.removeAttribute("data-ready");
      if (panel.getAttribute("data-open") === "1") closePanel();
    }
  }
  refreshVisibility();
  setInterval(refreshVisibility, 2000);
  window.addEventListener("storage", refreshVisibility);

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40))); } catch (e) {}
  }

  function renderAll() {
    log.innerHTML = "";
    if (!history.length) {
      addMsg("system", "Hola. Soy el jefe de gabinete. Puedo responder sobre la empresa, productos, arquitectura, clientes, y tomar acciones en el CRM. ¿En qué te ayudo?");
      return;
    }
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      if (m.role === "user") {
        var t = textFromContent(m.content);
        if (t) addMsg("user", t);
      } else if (m.role === "assistant") {
        var at = textFromContent(m.content);
        if (at) addMsg("assistant", at);
      }
    }
    scrollDown();
  }

  function textFromContent(c) {
    if (typeof c === "string") return c;
    if (!Array.isArray(c)) return "";
    var s = "";
    for (var i = 0; i < c.length; i++) {
      var b = c[i];
      if (b && b.type === "text" && b.text) s += b.text;
    }
    return s.trim();
  }

  function addMsg(kind, text) {
    var el = document.createElement("div");
    el.className = "cos-msg " + kind;
    el.textContent = text;
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function addTrace(name) {
    if (!showTrace) return null;
    var el = document.createElement("div");
    el.className = "cos-trace";
    el.textContent = "· " + name;
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function addTyping() {
    var el = document.createElement("div");
    el.className = "cos-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function openPanel() {
    panel.setAttribute("data-open", "1");
    launcher.setAttribute("data-open", "1");
    renderAll();
    setTimeout(function(){ input.focus(); }, 50);
  }
  function closePanel() {
    panel.removeAttribute("data-open");
    launcher.removeAttribute("data-open");
  }

  launcher.addEventListener("click", function() {
    if (panel.getAttribute("data-open") === "1") closePanel();
    else openPanel();
  });
  closeBtn.addEventListener("click", closePanel);
  resetBtn.addEventListener("click", function() {
    if (!confirm("¿Empezar una nueva conversación? Se borrará el historial actual.")) return;
    history = [];
    saveHistory();
    renderAll();
  });
  traceBtn.addEventListener("click", function() {
    showTrace = !showTrace;
    localStorage.setItem(SHOW_TRACE_KEY, showTrace ? "1" : "0");
    traceBtn.textContent = showTrace ? "ocultar trazas" : "trazas";
  });
  traceBtn.textContent = showTrace ? "ocultar trazas" : "trazas";

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  input.addEventListener("input", function() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
  sendBtn.addEventListener("click", send);

  async function send() {
    if (busy) return;
    var txt = input.value.trim();
    if (!txt) return;
    var token = localStorage.getItem(ADMIN_KEY);
    if (!token) {
      addMsg("error", "No hay token de admin guardado. Inicia sesión en /admin/crm primero.");
      return;
    }

    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "auto";

    addMsg("user", txt);
    history.push({ role: "user", content: txt });
    saveHistory();

    var typing = addTyping();

    try {
      var res = await fetch(cosEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({ messages: history }),
      });
      typing.remove();

      if (res.status === 401) {
        localStorage.removeItem(ADMIN_KEY);
        addMsg("error", "Tu sesión de admin caducó. Inicia sesión de nuevo en /admin/crm.");
        return;
      }

      if (res.status === 429) {
        addMsg("error", "Limite de velocidad de la API alcanzado. Espera un minuto y vuelve a intentar.");
        return;
      }

      var data;
      try { data = await res.json(); }
      catch (e) {
        addMsg("error", "Respuesta inválida del servidor (" + res.status + ").");
        return;
      }

      if (!res.ok || !data.ok) {
        var detail = (data && (data.detail || data.error)) || ("HTTP " + res.status);
        addMsg("error", "Error: " + detail);
        return;
      }

      if (Array.isArray(data.trace) && showTrace) {
        for (var i = 0; i < data.trace.length; i++) {
          addTrace(data.trace[i].name + (data.trace[i].ok ? " ✓" : " ✗"));
        }
      }

      if (Array.isArray(data.messages)) {
        history = data.messages;
        saveHistory();
      } else if (data.reply) {
        history.push({ role: "assistant", content: data.reply });
        saveHistory();
      }

      var reply = (data.reply || "").trim() || "(sin respuesta)";
      addMsg("assistant", reply);
    } catch (err) {
      typing.remove();
      addMsg("error", "Falla de red: " + (err && err.message ? err.message : err));
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }
})();
</script>
`;
