// mockup-template.js · 2026-05-27 · mockup v2
//
// Renders the dynamic /demo/:lead_id page from the JSON blob stored in
// leads.mockup_data by mockup-generator.js. Designed to read like a real
// SMB sales page (the Central Farma hand-built one is the reference):
// real services, real photos, real address, real WhatsApp, real IG.
//
// Sections (all optional except hero + footer):
//   1. Sticky top bar · logo + nav anchors + WhatsApp button
//   2. Preview ribbon · "Vista previa por PymeWebPro, no es tu sitio real"
//   3. Hero · h1 + subhead + 3 chips + photo grid (1-3 photos)
//   4. Services grid · 3-5 cards from copy.services
//   5. Featured service · optional, with kicker + title + body + checklist
//   6. Delivery / domicilios · optional, with 3-step flow
//   7. Visit · address, hours, WhatsApp, IG
//   8. Footer · short blurb + PymeWebPro credit
//
// House rules: no em-dashes, Spanish primary (target_lang in mockup_data
// controls which strings get emitted for chrome). Inline CSS so the page
// is self-contained and doesn't fight CSP.

const BRAND_PHONE_WA = "573014047722"; // PymeWebPro · the "Hablar con PymeWebPro" CTA in the ribbon

export function renderMockupV2(lead, mockup) {
  const data = mockup || {};
  const copy = data.copy || {};
  const images = data.images || {};
  const facts = data.facts || {};
  const lang = data.target_lang === "en" ? "en" : "es";
  const t = strings(lang);

  const businessName = facts.business_name || lead.business_name || (lang === "en" ? "Your business" : "Tu negocio");
  const eyebrowFallback = [facts.category, facts.city].filter(Boolean).join(" · ");

  // Pull copy with safe fallbacks · the AI can omit sections.
  const hero = copy.hero || {};
  const heroEyebrow = hero.eyebrow || eyebrowFallback;
  const heroHeadline = hero.headline || (lang === "en" ? businessName + ", clear and on mobile." : businessName + ", claro y en el celular.");
  const heroSub = hero.subhead || (lang === "en"
    ? "A simple sales page that turns visitors into WhatsApp conversations."
    : "Una página simple que convierte visitas en conversaciones de WhatsApp.");
  const heroChips = Array.isArray(hero.chips) && hero.chips.length ? hero.chips.slice(0, 4) : [];
  const heroCta = hero.cta_primary || (lang === "en" ? "Message us" : "Escríbenos");

  const services = Array.isArray(copy.services) ? copy.services.filter((s) => s && s.name).slice(0, 5) : [];
  const featured = copy.featured_service;
  const delivery = copy.delivery;
  const contact = copy.contact || {};
  const footerBlurb = copy.footer_blurb || "";

  // Image picks · prefer real photos from the bank. The hero is now a
  // rotating carousel that cycles through every gallery image (with hero
  // images first), so even leads with 2-3 real photos look alive instead of
  // static. Mike: "maybe we always put in a rotating image carousel as well."
  const heroSeeds = (Array.isArray(images.hero) ? images.hero : []).map((h) => h && h.src).filter(Boolean);
  const gallerySeeds = (Array.isArray(images.gallery) ? images.gallery : []).map((g) => g && g.src).filter(Boolean);
  const _seen = new Set();
  const carouselImgs = [];
  for (const u of [...heroSeeds, ...gallerySeeds]) {
    const stem = u.split("?")[0];
    if (_seen.has(stem)) continue; _seen.add(stem);
    carouselImgs.push(u);
    if (carouselImgs.length >= 8) break;
  }
  const heroImgs = carouselImgs.slice(0, 3); // backwards-compat var name used downstream in this fn scope
  const galleryImgs = carouselImgs;          // backwards-compat
  const logo = images.logo || null;

  // WhatsApp + IG · prefer copy.contact, fall back to lead facts.
  const wa = digitsOnly(contact.whatsapp || facts.whatsapp || lead.whatsapp || lead.phone);
  const ig = (contact.instagram || (facts.instagram_handle ? "@" + facts.instagram_handle : ""))
    .replace(/^@@+/, "@");
  const igHandle = ig.replace(/^@/, "");

  const addrLines = Array.isArray(contact.address_lines) && contact.address_lines.length
    ? contact.address_lines
    : (facts.address ? [facts.address] : []);
  const hoursLines = Array.isArray(contact.hours_lines) && contact.hours_lines.length
    ? contact.hours_lines
    : (Array.isArray(facts.hours) ? facts.hours : []);

  const reviewBanner = data.diagnostics && data.diagnostics.copy_ok === false
    ? '<div style="background:#FFE9DF;color:#A8381A;padding:.6rem 1rem;text-align:center;font-size:.85rem">' + esc(t.errorBuilding) + "</div>"
    : "";

  // ---- assemble HTML --------------------------------------------------
  const html = [];
  html.push("<!doctype html>");
  html.push('<html lang="' + lang + '"><head>');
  html.push('<meta charset="utf-8">');
  html.push('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
  html.push("<title>" + esc(businessName) + " · " + esc(t.previewTitle) + "</title>");
  html.push('<meta name="robots" content="noindex,nofollow">');
  html.push('<meta property="og:title" content="' + esc(businessName + " · " + t.previewTitle) + '">');
  html.push('<meta property="og:type" content="website">');
  html.push('<meta property="og:description" content="' + esc(heroSub) + '">');
  if (heroImgs[0]) html.push('<meta property="og:image" content="' + esc(heroImgs[0]) + '">');
  html.push(STYLES);
  html.push("</head><body>");
  html.push(renderRibbon(businessName, lang, t));
  html.push(renderTopBar(businessName, logo, wa, lang, t));
  html.push(renderHero({ eyebrow: heroEyebrow, headline: heroHeadline, sub: heroSub, chips: heroChips, cta: heroCta, wa, heroImgs: carouselImgs, lang, t }));
  if (services.length) html.push(renderServices(services, t, lang));
  if (featured && featured.title) html.push(renderFeatured(featured, t));
  if (delivery && delivery.title) html.push(renderDelivery(delivery, t));
  html.push(renderVisit({ addrLines, hoursLines, wa, ig, igHandle, t, lang, mapsUrl: facts.maps_url || null }));
  html.push(renderFooter(businessName, footerBlurb, addrLines, hoursLines, wa, ig, igHandle, t));
  html.push(renderChatbot({ businessName, logo, wa, lang, t }));
  html.push(reviewBanner);
  html.push("<script>");
  html.push("fetch('/api/demo/' + " + JSON.stringify(lead.id) + " + '/seen', {method:'POST'}).catch(function(){});");
  // Carousel · cross-fade every 5s, pause on hover, dot indicators clickable.
  html.push("(function(){");
  html.push("  var cs=document.querySelector('.carousel[data-cs-count]');");
  html.push("  if(!cs) return;");
  html.push("  var n=parseInt(cs.getAttribute('data-cs-count'),10)||0; if(n<2) return;");
  html.push("  var slides=cs.querySelectorAll('.cs-slide'); var dots=cs.querySelectorAll('.cs-dot'); var i=0; var t=null; var paused=false;");
  html.push("  function go(to){ slides[i].classList.remove('active'); if(dots[i]) dots[i].classList.remove('active'); i=(to+n)%n; slides[i].classList.add('active'); if(dots[i]) dots[i].classList.add('active'); }");
  html.push("  function tick(){ if(!paused) go(i+1); }");
  html.push("  t=setInterval(tick,5000);");
  html.push("  cs.addEventListener('mouseenter',function(){paused=true;});");
  html.push("  cs.addEventListener('mouseleave',function(){paused=false;});");
  html.push("  dots.forEach(function(d){ d.addEventListener('click',function(){ var to=parseInt(d.getAttribute('data-cs-i'),10)||0; go(to); paused=true; setTimeout(function(){paused=false;},8000); }); });");
  html.push("})();");
  // Chatbot · opens/closes the panel, posts to /api/demo-chat/:lead_id with
  // the full message history each turn (server is stateless).
  const greeting = (typeof t.chat_greeting === "function" ? t.chat_greeting(businessName) : ("Hola! Soy el asistente de " + businessName + "."));
  const chatJsCtx = {
    leadId: lead.id,
    greeting,
    placeholder: t.chat_placeholder,
    typing: t.chat_typing,
    errorMsg: t.chat_error,
    send: t.chat_send,
  };
  html.push("(function(){");
  html.push("  var CTX=" + JSON.stringify(chatJsCtx) + ";");
  html.push("  var bubble=document.querySelector('[data-d=\"chatopen\"]');");
  html.push("  var panel=document.querySelector('[data-d=\"chatpanel\"]');");
  html.push("  if(!bubble||!panel) return;");
  html.push("  var body=panel.querySelector('[data-d=\"chatbody\"]'); var inp=panel.querySelector('[data-d=\"chatinput\"]'); var send=panel.querySelector('[data-d=\"chatsend\"]'); var close=panel.querySelector('[data-d=\"chatclose\"]');");
  html.push("  var msgs=[];");
  html.push("  function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\\'':'&#39;'})[c];});}");
  html.push("  function row(role,text,extra){var d=document.createElement('div');d.className='chat-msg '+role+(extra||'');d.textContent=text;body.appendChild(d);body.scrollTop=body.scrollHeight;return d;}");
  html.push("  function open(){panel.classList.add('open');bubble.style.display='none';panel.setAttribute('aria-hidden','false');setTimeout(function(){inp.focus();},150);if(!msgs.length){row('bot',CTX.greeting);}}");
  html.push("  function shut(){panel.classList.remove('open');bubble.style.display='';panel.setAttribute('aria-hidden','true');}");
  html.push("  bubble.addEventListener('click',open);");
  html.push("  close.addEventListener('click',shut);");
  // Any [data-d=\"cta-chat\"] on the page (hero CTA etc) opens the chat
  // instead of routing to WhatsApp. We capture clicks during the bubbling
  // phase so even CTAs rendered later (if any) still wire up.
  html.push("  document.querySelectorAll('[data-d=\"cta-chat\"]').forEach(function(b){ b.addEventListener('click',function(e){ e.preventDefault(); open(); }); });");
  html.push("  async function submit(){");
  html.push("    var text=(inp.value||'').trim(); if(!text) return;");
  html.push("    inp.value=''; send.disabled=true;");
  html.push("    row('user',text);");
  html.push("    msgs.push({role:'user',content:text});");
  html.push("    var typing=row('bot',CTX.typing,' typing');");
  html.push("    try{");
  html.push("      var r=await fetch('/api/demo-chat/'+CTX.leadId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:msgs})});");
  html.push("      var data=await r.json();");
  html.push("      typing.remove();");
  html.push("      if(!r.ok||!data.ok){ row('bot',data.error?CTX.errorMsg+' ('+data.error+')':CTX.errorMsg); }");
  html.push("      else { row('bot',data.reply); msgs.push({role:'assistant',content:data.reply}); }");
  html.push("    }catch(e){ typing.remove(); row('bot',CTX.errorMsg); }");
  html.push("    send.disabled=false; inp.focus();");
  html.push("  }");
  html.push("  send.addEventListener('click',submit);");
  html.push("  inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});");
  html.push("})();");
  html.push("</script>");
  html.push("</body></html>");
  return html.join("\n");
}

// ---- sections ----------------------------------------------------------

function renderRibbon(name, lang, t) {
  return '<div class="pwp-ribbon">' +
    '<span>' + esc(t.preview_for) + " " + '<b>' + esc(name) + '</b> · ' + esc(t.ribbon_note) + '</span>' +
    ' <a href="https://wa.me/' + BRAND_PHONE_WA + '" target="_blank" rel="noopener">' + esc(t.talk_to_pwp) + " ›" + "</a>" +
    '</div>';
}

function renderTopBar(name, logo, wa, lang, t) {
  const logoHtml = logo
    ? '<img src="' + esc(logo) + '" alt="" class="logo">'
    : '<span class="logo logo-text">' + esc(initials(name)) + '</span>';
  // WhatsApp button intentionally removed from the topbar · the floating
  // chatbot bottom-right is the primary interaction. WhatsApp links still
  // live in the Visit section + footer for redundancy.
  return '<header class="topbar"><div class="wrap"><a class="brand" href="#top">' + logoHtml + '<span class="brand-name">' + esc(name) + '</span></a><nav><a href="#services">' + esc(t.nav_services) + '</a><a href="#visit">' + esc(t.nav_visit) + '</a></nav></div></header>';
}

function renderHero({ eyebrow, headline, sub, chips, cta, wa, heroImgs, lang, t }) {
  const chipsHtml = chips.length
    ? '<div class="chips">' + chips.map((c) => '<span class="chip">' + esc(c) + '</span>').join("") + '</div>'
    : "";
  // Hero CTA opens the chatbot panel · NOT WhatsApp. The bot handles the
  // first question and only escalates to WA when needed (per Mike: the
  // primary interaction on the page is the chatbot).
  const ctaHtml = '<a class="cta" href="#" data-d="cta-chat">' + esc(cta) + " →" + '</a>';

  // Rotating carousel · always rendered, even with 0 images (it falls back to
  // a brand-coloured gradient placeholder). Multiple images crossfade every
  // 5s with dot indicators. Pauses on hover. JS lives in the inline script
  // at the bottom of the template so we keep it self-contained.
  let carouselHtml = "";
  if (heroImgs.length === 0) {
    carouselHtml = '<div class="carousel placeholder"></div>';
  } else {
    const slides = heroImgs.map((u, i) =>
      '<div class="cs-slide' + (i === 0 ? " active" : "") + '" style="background-image:url(\'' + esc(u) + '\')"></div>'
    ).join("");
    const dots = heroImgs.length > 1
      ? '<div class="cs-dots">' + heroImgs.map((_, i) => '<button class="cs-dot' + (i === 0 ? " active" : "") + '" data-cs-i="' + i + '" aria-label="' + esc(t.slide || "slide") + " " + (i + 1) + '"></button>').join("") + '</div>'
      : "";
    carouselHtml = '<div class="carousel" data-cs-count="' + heroImgs.length + '">' + slides + dots + '</div>';
  }

  return '<section class="hero" id="top">' +
    '<div class="wrap">' +
      '<div class="hero-text">' +
        (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : "") +
        '<h1>' + esc(headline) + '</h1>' +
        '<p class="sub">' + esc(sub) + '</p>' +
        chipsHtml +
        ctaHtml +
      '</div>' +
      carouselHtml +
    '</div>' +
  '</section>';
}

function renderServices(services, t) {
  return '<section class="services" id="services"><div class="wrap">' +
    '<div class="section-kicker">' + esc(t.services_kicker) + '</div>' +
    '<h2>' + esc(t.services_title) + '</h2>' +
    '<div class="svc-grid">' +
      services.map((s) => '<div class="svc"><h3>' + esc(s.name) + '</h3>' + (s.body ? '<p>' + esc(s.body) + '</p>' : "") + '</div>').join("") +
    '</div>' +
  '</div></section>';
}

function renderFeatured(f, t) {
  const checklist = Array.isArray(f.checklist) && f.checklist.length
    ? '<div class="feat-checklist"><div class="feat-kicker">' + esc(t.feat_checklist_kicker) + '</div><ul>' +
      f.checklist.map((c) => '<li>' + esc(c) + '</li>').join("") + '</ul></div>'
    : "";
  return '<section class="featured"><div class="wrap">' +
    (f.kicker ? '<div class="section-kicker">' + esc(f.kicker) + '</div>' : "") +
    '<h2>' + esc(f.title) + '</h2>' +
    (f.body ? '<p class="feat-body">' + esc(f.body) + '</p>' : "") +
    checklist +
  '</div></section>';
}

function renderDelivery(d, t) {
  const steps = Array.isArray(d.steps) && d.steps.length
    ? '<div class="steps">' +
      d.steps.slice(0, 4).map((s) => '<div class="step"><div class="step-n">' + esc(s.n || "") + '</div><h4>' + esc(s.title || "") + '</h4><p>' + esc(s.body || "") + '</p></div>').join("") +
      '</div>'
    : "";
  return '<section class="delivery"><div class="wrap">' +
    '<div class="section-kicker">' + esc(t.delivery_kicker) + '</div>' +
    '<h2>' + esc(d.title) + '</h2>' +
    (d.body ? '<p class="del-body">' + esc(d.body) + '</p>' : "") +
    steps +
  '</div></section>';
}

function renderVisit({ addrLines, hoursLines, wa, ig, igHandle, t, lang, mapsUrl }) {
  const addrBlock = addrLines.length
    ? '<div class="visit-block"><div class="vb-kicker">' + esc(t.visit_address) + '</div>' +
      addrLines.map((l) => '<div>' + esc(l) + '</div>').join("") +
      (mapsUrl ? ' <a class="visit-link" href="' + esc(mapsUrl) + '" target="_blank" rel="noopener">' + esc(t.open_maps) + " →" + '</a>' : "") +
      '</div>'
    : "";
  const hoursBlock = hoursLines.length
    ? '<div class="visit-block"><div class="vb-kicker">' + esc(t.visit_hours) + '</div>' + hoursLines.map((l) => '<div>' + esc(l) + '</div>').join("") + '</div>'
    : "";
  const waBlock = wa
    ? '<div class="visit-block"><div class="vb-kicker">WhatsApp</div><a class="visit-link" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">+' + esc(formatPhone(wa)) + '</a></div>'
    : "";
  const igBlock = ig
    ? '<div class="visit-block"><div class="vb-kicker">Instagram</div><a class="visit-link" href="https://instagram.com/' + esc(igHandle) + '" target="_blank" rel="noopener">@' + esc(igHandle) + '</a></div>'
    : "";
  return '<section class="visit" id="visit"><div class="wrap">' +
    '<div class="section-kicker">' + esc(t.visit_kicker) + '</div>' +
    '<h2>' + esc(t.visit_title) + '</h2>' +
    '<div class="visit-grid">' + addrBlock + hoursBlock + waBlock + igBlock + '</div>' +
  '</div></section>';
}

function renderFooter(name, blurb, addrLines, hoursLines, wa, ig, igHandle, t) {
  return '<footer><div class="wrap">' +
    '<div class="foot-brand">' + esc(name) + '</div>' +
    (blurb ? '<div class="foot-blurb">' + esc(blurb) + '</div>' : "") +
    '<div class="foot-grid">' +
      (addrLines.length ? '<div><h5>' + esc(t.visit_address) + '</h5>' + addrLines.map((l) => '<div>' + esc(l) + '</div>').join("") + (hoursLines.length ? hoursLines.map((l) => '<div>' + esc(l) + '</div>').join("") : "") + '</div>' : "") +
      ((wa || ig) ? '<div><h5>' + esc(t.contact_us) + '</h5>' + (wa ? '<div><a href="https://wa.me/' + esc(wa) + '">WhatsApp · ' + esc(formatPhone(wa)) + '</a></div>' : "") + (ig ? '<div><a href="https://instagram.com/' + esc(igHandle) + '">Instagram · @' + esc(igHandle) + '</a></div>' : "") + '</div>' : "") +
    '</div>' +
    '<div class="foot-credit">© ' + new Date().getFullYear() + " " + esc(name) + ' · ' + esc(t.credit_made_by) + ' <a href="https://pymewebpro.com" target="_blank" rel="noopener">PymeWebPro</a></div>' +
  '</div></footer>';
}

// Floating chatbot · the page's only piece of interactive AI. Backed by
// /api/demo-chat/:lead_id which reads the lead's mockup_data and answers in
// the business's voice. Falls back to a WhatsApp handoff when needed.
function renderChatbot({ businessName, logo, wa, lang, t }) {
  const logoHtml = logo
    ? '<img class="ch-logo" src="' + esc(logo) + '" alt="">'
    : '<div class="ch-logo" style="display:flex;align-items:center;justify-content:center;font-weight:800;color:#A8381A;font-size:.8rem">' + esc(initials(businessName)) + '</div>';
  const waLink = wa
    ? '<div class="chat-wa-row">' + esc(t.chat_or_text) + ' <a href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">' + esc(t.chat_open_wa) + " →" + '</a></div>'
    : "";
  const assistantName = (lang === "en" ? "Assistant" : "Asistente") + " · " + businessName;
  return '<button class="chat-bubble" data-d="chatopen" aria-label="' + esc(t.chat_aria) + '"><span class="cb-ic">💬</span>' + esc(t.chat_bubble) + '</button>' +
    '<div class="chat-panel" data-d="chatpanel" aria-hidden="true">' +
      '<div class="chat-head">' +
        logoHtml +
        '<div class="ch-name"><b>' + esc(assistantName) + '</b><span>● ' + esc(t.chat_online) + '</span></div>' +
        '<button class="ch-x" data-d="chatclose" aria-label="' + esc(t.chat_close_aria) + '">×</button>' +
      '</div>' +
      '<div class="chat-body" data-d="chatbody"></div>' +
      '<div class="chat-foot">' +
        '<div class="chat-input-row">' +
          '<input type="text" data-d="chatinput" placeholder="' + esc(t.chat_placeholder) + '" autocomplete="off">' +
          '<button data-d="chatsend">' + esc(t.chat_send) + "</button>" +
        '</div>' +
        waLink +
      '</div>' +
    '</div>';
}

// ---- strings (es / en) ----------------------------------------------------

function strings(lang) {
  if (lang === "en") return {
    previewTitle: "Sample page (PymeWebPro)",
    preview_for: "Preview for",
    ribbon_note: "PymeWebPro sample, not your real site",
    talk_to_pwp: "Talk to PymeWebPro",
    wa_button: "Message us",
    nav_services: "Services",
    nav_visit: "Visit",
    services_kicker: "What we do",
    services_title: "What we offer.",
    feat_checklist_kicker: "What to bring",
    delivery_kicker: "Delivery",
    visit_kicker: "Stop by",
    visit_title: "Find us.",
    visit_address: "Address",
    visit_hours: "Hours",
    open_maps: "Open in Maps",
    contact_us: "Contact",
    credit_made_by: "Made by",
    errorBuilding: "Auto-generation incomplete. PymeWebPro will polish this version before sending.",
    chat_bubble: "Ask us anything",
    chat_aria: "Open chat with the assistant",
    chat_close_aria: "Close chat",
    chat_online: "Online · powered by AI",
    chat_placeholder: "Write your question...",
    chat_send: "Send",
    chat_or_text: "Prefer text?",
    chat_open_wa: "Open WhatsApp",
    chat_greeting: function (name) { return "Hi! I'm the assistant for " + name + ". I can help with services, hours, location, and how to reach us. What do you need?"; },
    chat_typing: "Typing...",
    chat_error: "Sorry, something went wrong. Try again in a moment, or reach us on WhatsApp.",
  };
  return {
    previewTitle: "Página de ejemplo (PymeWebPro)",
    preview_for: "Vista previa para",
    ribbon_note: "Ejemplo hecho por PymeWebPro, no es tu sitio real",
    talk_to_pwp: "Hablar con PymeWebPro",
    wa_button: "Escríbenos",
    nav_services: "Servicios",
    nav_visit: "Visítanos",
    services_kicker: "Qué hacemos",
    services_title: "Lo que ofrecemos.",
    feat_checklist_kicker: "Qué traer",
    delivery_kicker: "Domicilios",
    visit_kicker: "Pásate por la tienda",
    visit_title: "Visítanos.",
    visit_address: "Dirección",
    visit_hours: "Horario",
    open_maps: "Abrir en Maps",
    contact_us: "Contacto",
    credit_made_by: "Página hecha por",
    errorBuilding: "Generación incompleta · PymeWebPro pulirá esta versión antes de enviarla.",
    chat_bubble: "Pregúntanos",
    chat_aria: "Abrir chat con el asistente",
    chat_close_aria: "Cerrar chat",
    chat_online: "En línea · atendido por IA",
    chat_placeholder: "Escribe tu pregunta...",
    chat_send: "Enviar",
    chat_or_text: "¿Prefieres escribir?",
    chat_open_wa: "Abrir WhatsApp",
    chat_greeting: function (name) { return "¡Hola! Soy el asistente de " + name + ". Te puedo ayudar con servicios, horario, ubicación y cómo contactarnos. ¿Qué necesitas?"; },
    chat_typing: "Escribiendo...",
    chat_error: "Algo falló, vuelve a intentar en un momento o escríbenos por WhatsApp.",
  };
}

// ---- helpers --------------------------------------------------------------

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function formatPhone(d) {
  if (!d) return "";
  if (d.length === 12 && d.indexOf("57") === 0) {
    return "57 " + d.slice(2, 5) + " " + d.slice(5, 8) + " " + d.slice(8);
  }
  return d;
}

function initials(name) {
  return String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
}

// ---- inline styles --------------------------------------------------------

const STYLES = `<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;font-family:'Inter Tight',system-ui,-apple-system,'Segoe UI',sans-serif;color:#1A1612;background:#F2E9D5;line-height:1.55}
.wrap{max-width:1100px;margin:0 auto;padding:0 1.4rem}
.pwp-ribbon{background:#1A1612;color:#F2E9D5;text-align:center;font-size:.78rem;padding:.45rem 1rem}
.pwp-ribbon a{color:#F2896A;text-decoration:none;margin-left:.5rem}
.pwp-ribbon a:hover{color:#fff}
.topbar{position:sticky;top:0;background:rgba(251,247,236,.96);backdrop-filter:blur(8px);border-bottom:1px solid rgba(26,22,18,.12);z-index:20}
.topbar .wrap{display:flex;align-items:center;gap:1rem;padding:.7rem 1.4rem}
.topbar .brand{display:flex;align-items:center;gap:.55rem;text-decoration:none;color:#1A1612;font-weight:700}
.topbar .logo{width:34px;height:34px;border-radius:8px;object-fit:cover;background:#E8DFC8;border:1px solid rgba(26,22,18,.14)}
.topbar .logo-text{display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:800;color:#A8381A;background:#FFE9DF}
.topbar .brand-name{font-size:.98rem}
.topbar nav{display:flex;gap:1rem;margin-left:auto}
.topbar nav a{color:rgba(26,22,18,.6);text-decoration:none;font-size:.88rem}
.topbar nav a:hover{color:#1A1612}
.topbar .wa-btn{margin-left:auto;background:#D24A1D;color:#fff;text-decoration:none;font-weight:600;padding:.45rem .85rem;border-radius:8px;font-size:.85rem}
.topbar .wa-btn:hover{background:#A8381A}
.hero{padding:3.2rem 0 2.4rem}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:2.4rem;align-items:center}
@media(max-width:780px){.hero .wrap{grid-template-columns:1fr}}
.eyebrow{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#A8381A;font-weight:700;margin:0 0 .8rem}
.hero h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.9rem,4vw,3rem);line-height:1.12;margin:0 0 1rem;font-weight:600}
.hero .sub{font-size:1.05rem;color:#3A2F26;margin:0 0 1.3rem;max-width:36ch}
.hero .chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1.3rem}
.hero .chip{font-size:.78rem;background:rgba(210,74,29,.1);color:#A8381A;border-radius:999px;padding:.3rem .75rem;font-weight:600}
.hero .cta{display:inline-block;background:#1A1612;color:#fff;text-decoration:none;font-weight:600;padding:.7rem 1.2rem;border-radius:10px;font-size:.95rem}
.hero .cta:hover{background:#3A2F26}
.hero-imgs.single img{width:100%;height:380px;object-fit:cover;border-radius:14px;background:#E8DFC8}
.hero-imgs.grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.7rem;height:380px}
.hero-imgs.grid img{width:100%;height:100%;object-fit:cover;border-radius:12px;background:#E8DFC8}
.hero-imgs.grid .hi-0{grid-row:1 / span 2}
/* Rotating carousel · hero photo slot. Cross-fades every 5s. */
.carousel{position:relative;width:100%;height:420px;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#D24A1D 0%,#1A1612 100%)}
.carousel.placeholder{background:linear-gradient(135deg,#D24A1D 0%,#A8381A 60%,#1A1612 100%)}
.cs-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .8s ease-in-out}
.cs-slide.active{opacity:1}
.cs-dots{position:absolute;left:0;right:0;bottom:.7rem;display:flex;justify-content:center;gap:.4rem;z-index:2}
.cs-dot{width:8px;height:8px;border-radius:50%;border:0;background:rgba(255,255,255,.45);padding:0;cursor:pointer;transition:background .2s,transform .2s}
.cs-dot.active{background:#fff;transform:scale(1.3)}
.cs-dot:hover{background:rgba(255,255,255,.85)}
@media(max-width:780px){.carousel{height:320px}}
.section-kicker{font-size:.74rem;text-transform:uppercase;letter-spacing:.1em;color:#A8381A;font-weight:700;margin:0 0 .5rem}
section{padding:2.6rem 0;border-top:1px solid rgba(26,22,18,.08)}
section h2{font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.55rem,3vw,2.25rem);margin:0 0 1.4rem;line-height:1.15;font-weight:600;max-width:24ch}
.svc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.2rem}
.svc{background:#FBF7EC;border:1px solid rgba(26,22,18,.1);border-radius:14px;padding:1.3rem 1.4rem}
.svc h3{margin:0 0 .4rem;font-size:1.1rem;font-weight:700}
.svc p{margin:0;font-size:.92rem;color:#3A2F26}
.featured{background:#FBF7EC;border-top:1px solid rgba(26,22,18,.08);border-bottom:1px solid rgba(26,22,18,.08)}
.feat-body{max-width:60ch;font-size:1rem;color:#3A2F26}
.feat-checklist{margin-top:1.3rem;background:#fff;border:1px solid rgba(26,22,18,.1);border-radius:12px;padding:1.1rem 1.3rem;max-width:520px}
.feat-kicker{font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(26,22,18,.55);font-weight:700;margin:0 0 .5rem}
.feat-checklist ul{margin:0;padding:0 0 0 1.1rem}
.feat-checklist li{margin:0 0 .35rem;font-size:.92rem}
.delivery .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1.4rem}
.delivery .step{background:#FBF7EC;border:1px solid rgba(26,22,18,.1);border-radius:14px;padding:1.2rem}
.delivery .step-n{font-family:Georgia,serif;font-size:1.8rem;color:#D24A1D;font-weight:700;line-height:1}
.delivery .step h4{margin:.6rem 0 .35rem;font-size:1rem}
.delivery .step p{margin:0;font-size:.9rem;color:#3A2F26}
.visit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.4rem;margin-top:1rem}
.visit-block{background:#FBF7EC;border:1px solid rgba(26,22,18,.1);border-radius:12px;padding:1.1rem 1.3rem;font-size:.95rem;line-height:1.5}
.vb-kicker{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(26,22,18,.55);font-weight:700;margin:0 0 .5rem}
.visit-link{color:#A8381A;text-decoration:none;font-weight:600}
.visit-link:hover{color:#D24A1D}
footer{background:#1A1612;color:#F2E9D5;padding:2rem 0 1.4rem;margin-top:2rem}
footer a{color:#F2896A;text-decoration:none}
footer a:hover{color:#fff}
.foot-brand{font-weight:700;font-size:1rem;margin:0 0 .35rem}
.foot-blurb{color:rgba(242,233,213,.7);font-size:.9rem;margin:0 0 1.2rem;max-width:60ch}
.foot-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.4rem;margin-bottom:1.2rem}
.foot-grid h5{margin:0 0 .4rem;font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(242,233,213,.5);font-weight:700}
.foot-grid div div{font-size:.9rem;color:rgba(242,233,213,.85);margin:.1rem 0}
.foot-credit{font-size:.76rem;color:rgba(242,233,213,.5);border-top:1px solid rgba(242,233,213,.1);padding-top:.9rem}
/* Floating chatbot widget · grounded in the lead's mockup_data via demo-chat.js */
.chatbot{position:fixed;right:1.1rem;bottom:1.1rem;z-index:50;font-family:inherit}
.chat-bubble{position:fixed;right:1.1rem;bottom:1.1rem;z-index:50;display:flex;align-items:center;gap:.55rem;background:#D24A1D;color:#fff;border:0;padding:.7rem 1.1rem .7rem .9rem;border-radius:999px;font-weight:600;font-size:.92rem;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.25);font-family:inherit}
.chat-bubble:hover{background:#A8381A}
.chat-bubble .cb-ic{font-size:1.1rem;line-height:1}
.chat-panel{position:fixed;right:1.1rem;bottom:1.1rem;width:360px;max-width:calc(100vw - 2rem);height:520px;max-height:calc(100vh - 2rem);background:#FBF7EC;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;z-index:51}
.chat-panel.open{display:flex}
.chat-head{background:#1A1612;color:#F2E9D5;padding:.7rem .9rem;display:flex;align-items:center;gap:.6rem}
.chat-head .ch-logo{width:32px;height:32px;border-radius:50%;object-fit:cover;background:#FFE9DF;flex:none}
.chat-head .ch-name{flex:1;display:flex;flex-direction:column;line-height:1.2}
.chat-head .ch-name b{font-size:.92rem;color:#fff}
.chat-head .ch-name span{font-size:.7rem;color:#A6D49A}
.chat-head .ch-x{background:none;border:0;color:rgba(242,233,213,.7);font-size:1.2rem;cursor:pointer;line-height:1;padding:.1rem .3rem}
.chat-body{flex:1 1 auto;overflow-y:auto;padding:.9rem;display:flex;flex-direction:column;gap:.55rem;background:#FBF7EC}
.chat-msg{max-width:84%;padding:.55rem .8rem;border-radius:14px;font-size:.9rem;line-height:1.4;white-space:pre-wrap;overflow-wrap:break-word}
.chat-msg.bot{background:#fff;border:1px solid rgba(26,22,18,.1);align-self:flex-start;border-bottom-left-radius:4px}
.chat-msg.user{background:#D24A1D;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.chat-msg.typing{color:#A8381A;font-style:italic;font-size:.85rem}
.chat-foot{background:#FBF7EC;border-top:1px solid rgba(26,22,18,.1);padding:.6rem .7rem;display:flex;flex-direction:column;gap:.5rem}
.chat-input-row{display:flex;gap:.4rem}
.chat-input-row input{flex:1;font:inherit;font-size:.92rem;padding:.55rem .7rem;border:1px solid rgba(26,22,18,.15);border-radius:8px;background:#fff;color:#1A1612}
.chat-input-row input:focus{outline:none;border-color:#D24A1D}
.chat-input-row button{background:#D24A1D;color:#fff;border:0;border-radius:8px;padding:.55rem .9rem;font-weight:600;cursor:pointer;font-family:inherit;font-size:.9rem}
.chat-input-row button:disabled{opacity:.5;cursor:default}
.chat-wa-row{font-size:.72rem;color:rgba(26,22,18,.55);text-align:center}
.chat-wa-row a{color:#A8381A;font-weight:600;text-decoration:none}
.chat-wa-row a:hover{text-decoration:underline}
@media(max-width:480px){.chat-panel{width:calc(100vw - 1.4rem);right:.7rem;bottom:.7rem;height:calc(100vh - 1.4rem)}}
</style>`;
