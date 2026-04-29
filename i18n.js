// PymeWebPro · bilingual swap (ES ↔ EN)
// Source language is Spanish (in the HTML). Toggle replaces text nodes with EN.
// Persists in localStorage + ?lang=en query param. Auto-detects on first visit.

(function () {
  'use strict';

  // ─── translations ──────────────────────────────────────────────────────────
  // Keys are the trimmed Spanish text exactly as it appears in the HTML.
  // Values are the English translations. Multi-line / rich-HTML strings are
  // handled separately via [data-i18n-html] selectors below.
  const EN = {
    // ── nav ─────────────
    '¿Qué incluye?': "What's included",
    'Portafolio': 'Portfolio',
    'Nosotros': 'About',
    'Planes': 'Plans',
    'Proceso': 'Process',
    'Contacto': 'Contact',

    // ── hero ────────────
    '● Ya no hay excusa para no estar en internet': '● No more excuses for not being online',
    'Sitios web profesionales para pequeños negocios en Colombia. Nosotros lo construimos, usted recibe clientes nuevos por internet. Sin tecnicismos, sin sorpresas, sin pagar por lo que no necesita.':
      "Professional websites for small businesses in Colombia. We build it, you get new customers online. No jargon, no surprises, no paying for what you don't need.",
    'Quiero mi sitio web': 'I want my website',
    'Ver planes y precios': 'See plans & pricing',
    'Respuesta en menos de 24 horas. Sin compromiso.': 'Reply within 24 hours. No commitment.',
    'Esencial en 7 días · Pro en 14': 'Essential in 7 days · Pro in 14',
    'o le devolvemos su dinero': 'or your money back',
    'Desde $890.000 COP': 'From $890,000 COP',
    'pago único, sin sorpresas': 'one-time payment, no surprises',
    'Soporte siempre incluido': 'Support always included',
    'nosotros respondemos': 'we answer ourselves',

    // ── problem section ─
    'Por qué importa': 'Why it matters',
    'Negocios buenos. Sitios web malos.': 'Great businesses. Bad websites.',
    'Sus clientes lo buscan en Google. Lo que encuentran decide si llaman… o si pasan al siguiente.': "Your customers search for you on Google. What they find decides whether they call you… or move to the next listing.",
    'Lo que pierden hoy:': 'What you lose today:',
    'Clientes que no encuentran su número': "Customers who can't find your number",
    'Pedidos que se van a la competencia': 'Orders that go to your competition',
    'Llamadas a las 11pm que no contesta nadie': "11pm calls nobody answers",
    'Reservas que se hacen por WhatsApp con errores': 'WhatsApp bookings with mistakes',
    'Lo que ganan con un sitio bien hecho:': 'What you gain with a real site:',
    'Aparecen en Google cuando los buscan': 'Show up on Google when people search',
    'Reciben pedidos mientras duermen': 'Take orders while you sleep',
    'Se ven profesionales (porque lo son)': 'Look professional (because you are)',
    'Comparten un solo enlace en lugar de explicar todo': 'Share one link instead of explaining over and over',

    // ── what's included ─
    'Lo que armamos': 'What we build',
    'Sitios web profesionales,<br>listos para vender.': 'Professional websites,<br>ready to sell.',
    'Cada sitio incluye lo esencial para un negocio colombiano: aparecer en Google, recibir mensajes por WhatsApp, mostrar su catálogo y ganarse la confianza de clientes nuevos.':
      'Every site includes the essentials for a Colombian business: showing up on Google, taking WhatsApp messages, displaying your catalog, and earning new customers\' trust.',
    'Su propio dominio': 'Your own domain',
    'Su propio dominio, suyo para siempre': 'Your own domain, yours forever',
    'El dominio lo registra usted directamente (a su nombre, suyo para siempre). Le ayudamos a elegirlo y configurarlo. Costo aproximado: $50k–$150k/año según el dominio que escoja. Usted decide.':
      'You register the domain directly (in your name, yours forever). We help you pick it and set it up. Approximate cost: $50k–$150k/year depending on the domain. Your choice.',
    '¿Cómo funciona el dominio?': 'How does the domain work?',
    'El dominio lo registra usted directamente con el registrador, a su nombre. Suyo para siempre, no del nuestro. Le ayudamos a elegirlo y a configurarlo correctamente. Costo aproximado: $50.000 a $150.000 COP al año según el dominio que escoja, y usted decide.':
      'You register the domain directly with the registrar, in your name. Yours forever, not ours. We help you pick it and set it up correctly. Approximate cost: $50,000 to $150,000 COP per year depending on the domain, your choice.',
    'El dominio queda a su nombre. Suyo para siempre. Le ayudamos a elegirlo y configurarlo (registro ~$50k–$150k/año, lo paga usted al registrador)':
      'Domain stays in your name. Yours forever. We help you pick and configure it (registration ~$50k–$150k/yr, paid by you to the registrar)',
    'Listo para celular': 'Mobile-ready',
    '9 de cada 10 clientes lo van a buscar desde el celular. Su sitio se ve perfecto en cualquier pantalla.': '9 out of 10 customers will search from their phone. Your site looks perfect on any screen.',
    'SEO y seguridad': 'SEO & security',
    'HTTPS, código limpio y rápido, datos estructurados para Google, y respaldo automático todos los días. Su sitio es sólido y aparece bien posicionado.':
      'HTTPS, clean and fast code, structured data for Google, and daily automatic backups. Your site is solid and ranks well.',
    'Listo para Google': 'Google-ready',
    'Configurado desde el primer día para que sus clientes locales lo encuentren.': 'Configured from day one so local customers can find you.',

    // ── portfolio ───────
    'Trabajos recientes': 'Recent work',
    'Sitios que hemos construido': 'Sites we\'ve built',
    'Vea el tipo de sitio<br>que recibe usted.': 'See the kind of site<br>you\'ll get.',
    'Estos son sitios reales, en línea, que diseñamos, programamos y mantenemos. La misma calidad y la misma tecnología que usaríamos en el sitio de su negocio.':
      'These are real, live sites we designed, coded, and maintain. Same quality and same technology we\'d use for your business.',
    'Sitios reales,<br>resultados reales.': 'Real sites,<br>real results.',
    'Algunos de los proyectos que hemos lanzado para negocios colombianos.': "A few projects we've shipped for Colombian businesses.",
    'Visitar sitio': 'Visit site',
    'Visitar': 'Visit',
    'Ver el sitio →': 'View site →',
    'Guía de ciudad': 'City guide',
    'La guía más completa para visitar y vivir en Medellín. Más de 24 secciones, miles de visitas mensuales, primeros lugares en Google.':
      'The most complete guide for visiting and living in Medellín. 24+ sections, thousands of monthly visits, top Google rankings.',
    'La guía completa de Barranquilla. Barrios, restaurantes, eventos del Carnaval y vida diaria en la ciudad.':
      'The complete guide to Barranquilla. Neighborhoods, restaurants, Carnival events, and daily life.',
    'La guía definitiva de Cartagena para turistas y residentes. Más de 17 guías y creciendo.':
      'The definitive guide to Cartagena for tourists and residents. 17+ guides and growing.',
    'Sitio personal · Inglés': 'Personal site · English',
    'Sitio personal · Consultoría': 'Personal site · Consulting',

    // ── nosotros ────────
    'Hecho a la medida<br>desde Medellín.': 'Built by hand<br>from Medellín.',
    'No somos una agencia gigante con call-center en otro país. Somos dos personas que llevan años construyendo sitios web para negocios reales (restaurantes, talleres, peluquerías, profesionales) y entendemos cómo funciona la realidad colombiana: pago contado, WhatsApp como canal principal, márgenes ajustados, sin tiempo para perder.':
      "We're not a giant agency with a call center in another country. We're two people who have spent years building websites for real businesses (restaurants, garages, salons, professionals) and we understand the reality on the ground in Colombia: cash payments, WhatsApp as the main channel, tight margins, no time to waste.",
    'Cuando le respondemos un mensaje, le respondemos nosotros': 'When we reply to a message, we reply ourselves',
    ', no un bot, no un junior. Esa es la diferencia.': ', no bot, no junior. That\'s the difference.',
    'Co-fundador & Diseñador': 'Co-founder & Designer',
    'Co-fundador': 'Co-founder',
    'Construye y diseña los sitios. Diseño limpio, código rápido, todo lo técnico: dominios, hospedaje, certificados.':
      'Builds and designs the sites. Clean design, fast code, all the technical stuff: domains, hosting, certificates.',
    'Estrategia, ventas y la voz al otro lado del WhatsApp. Habla con cada cliente para entender el negocio antes de empezar.':
      'Strategy, sales, and the voice on the other end of WhatsApp. Talks to every client to understand the business before we start.',
    'Medellín, Colombia': 'Medellín, Colombia',
    'Canadiense': 'Canadian',
    'Colombiano': 'Colombian',

    // ── pricing ─────────
    'Planes y precios': 'Plans & pricing',
    'Pague una vez. Su sitio es suyo.<br>Sin contratos mensuales obligatorios.': 'Pay once. Your site is yours.<br>No mandatory monthly contracts.',
    'Elija un plan, lo construimos, se lo entregamos y queda 100% suyo. Si quiere que nosotros lo alojemos, lo monitoreemos y hagamos pequeños cambios cada mes, agregue el Plan Soporte opcional, cancelable cuando quiera.':
      "Pick a plan, we build it, we deliver it, and it's 100% yours. If you'd like us to host it, monitor it, and make small changes each month, add the optional Support Plan, cancel anytime.",
    'Esencial en 7 días, Pro en 14.': 'Essential in 7 days, Pro in 14.',
    'O le devolvemos su dinero. Sin excusas.': 'Or your money back. No excuses.',
    'Garantía de 30 días.': '30-day guarantee.',
    'Si no le gusta su sitio, le devolvemos su dinero. Sin preguntas.': "If you don't love your site, we refund your money. No questions asked.",
    'Ahorre': 'Save',
    'si paga el mismo día que llene el formulario': 'if you pay the same day you fill the form',
    'Sitio web': 'Website',
    'Esencial': 'Essential',
    'pago': 'one-time',
    'único, sin pagos mensuales': 'payment, no recurring fees',
    'Entrega en 7 días': 'Delivery in 7 days',
    'Entrega en 14 días': 'Delivery in 14 days',
    'Devolvemos su dinero si no le gusta': 'Money back if you don\'t like it',
    'o le devolvemos el dinero': 'or we refund you',
    'Sitio profesional de una página con hasta 8 secciones': 'Professional one-page site with up to 8 sections',
    'Asesoría y configuración del dominio (registro anual aparte, ~$50–150k COP/año)': 'Domain advice and setup (annual registration separate, ~$50–150k COP/year)',
    'Certificado SSL (HTTPS) incluido (su sitio seguro y verificado por Google)': 'SSL certificate (HTTPS) included (secure and Google-verified)',
    'Botón directo al WhatsApp del negocio': 'Direct WhatsApp button',
    'Diseño listo para celular': 'Mobile-ready design',
    'Google Analytics integrado': 'Google Analytics integrated',
    '1 ronda de cambios incluida': '1 revision round included',
    'SEO básico para Google': 'Basic SEO for Google',
    'Garantía de 30 días': '30-day guarantee',
    'Quiero el plan Esencial': 'I want the Essential plan',
    '★ Más completo': '★ Most complete',
    'Pro': 'Pro',
    'Todo lo del plan Esencial': 'Everything in Essential',
    'Hasta 14 secciones más sección de novedades': 'Up to 14 sections plus a news section',
    'Versión bilingüe (español + inglés)': 'Bilingual version (Spanish + English)',
    'Google Business Profile configurado y verificado': 'Google Business Profile set up and verified',
    'Sistema de agendamiento o reservas integrado': 'Booking or reservation system integrated',
    'Galería de fotos profesional': 'Professional photo gallery',
    'Formulario de contacto con confirmación automática al cliente': 'Contact form with automatic client confirmation',
    'Sección de testimonios o reseñas destacadas': 'Featured testimonials or reviews section',
    'Datos estructurados para que Google muestre horarios, ubicación y reseñas en los resultados': 'Structured data so Google shows your hours, location, and reviews',
    '3 rondas de cambios': '3 revision rounds',
    'Quiero el plan Pro': 'I want the Pro plan',
    'Plan Soporte (opcional)': 'Support Plan (optional)',
    'Hosting + monitoreo + cambios menores cada mes': 'Hosting + monitoring + small monthly changes',
    'desde $30k': 'from $30k',
    'COP/mes': 'COP/month',
    'Cancelable cuando quiera, sin penalidad.': 'Cancel anytime, no penalty.',
    'Quiero agregar Plan Soporte': 'I want to add the Support Plan',
    '¿Aún no sabe cuál? Hablemos 20 minutos por WhatsApp y le recomendamos el indicado, sin compromiso.':
      "Not sure which one? Let's talk for 20 minutes on WhatsApp and we'll recommend the right one, no commitment.",

    // ── network / testimonial ─
    'Para el negocio colombiano': 'For the Colombian business',
    '"Le pasé el enlace a tres clientes nuevos esta semana. Antes les explicaba todo por teléfono."':
      '"I sent the link to three new customers this week. I used to explain everything by phone."',
    'Negocio cliente, Medellín': 'Client business, Medellín',
    'Construyamos el suyo. Hablemos 20 minutos por WhatsApp, sin compromiso.': "Let's build yours. Talk 20 minutes on WhatsApp, no commitment.",
    'Empezar mi sitio': 'Start my site',

    // ── how it works ────
    'Cómo funciona': 'How it works',
    '20 minutos · WhatsApp': '20 minutes · WhatsApp',
    'Hablamos de su negocio': 'We talk about your business',
    'Nos cuenta qué hace y a quién atiende': 'You tell us what you do and who you serve',
    'Vemos qué necesita su sitio': 'We figure out what your site needs',
    'Le recomendamos el plan correcto': 'We recommend the right plan',
    'Sin compromiso, sin presión': 'No commitment, no pressure',
    '7 a 14 días': '7 to 14 days',
    'Construimos su sitio': 'We build your site',
    'Le mostramos el diseño antes': 'We show you the design first',
    'Escribimos los textos (o usamos los suyos)': 'We write the copy (or use yours)',
    'Conectamos su WhatsApp y Google': 'We connect your WhatsApp and Google',
    'Le entregamos un sitio listo para vender': 'We hand over a site ready to sell',
    'Día 1': 'Day 1',
    'Lanzamos y le entregamos las llaves': 'We launch and hand over the keys',
    'Su dominio queda en su nombre': 'Your domain is in your name',
    'Le mostramos cómo hacer cambios pequeños': 'We show you how to make small edits',
    'Soporte por WhatsApp para preguntas': 'WhatsApp support for questions',
    'Su sitio empieza a recibir clientes': 'Your site starts getting customers',

    // ── CTA / form ──────
    'Hablemos hoy mismo': "Let's talk today",
    'Llene el formulario': 'Fill out the form',
    'y le respondemos': "and we'll reply",
    'en pocas horas.': 'within a few hours.',
    'Sin compromiso. Le devolvemos la llamada o escribimos por el medio que prefiera, con una propuesta clara por escrito.':
      "No commitment. We'll call you back or write by your preferred channel, with a clear proposal in writing.",
    'Chat directo por WhatsApp': 'Direct WhatsApp chat',
    '+57 301 404 7722 · respuesta inmediata': '+57 301 404 7722 · instant reply',
    'Enviar correo': 'Send email',
    'ventas@pymewebpro.com': 'ventas@pymewebpro.com',
    'Llene este formulario': 'Fill out this form',
    'Le respondemos en pocas horas con una propuesta clara, sin compromiso.': "We'll reply within a few hours with a clear proposal, no commitment.",
    'Su nombre': 'Your name',
    'Ej: Juan Pérez': 'e.g. Juan Pérez',
    'Nombre de su negocio': 'Your business name',
    'Ej: Panadería La Esquina': 'e.g. Corner Bakery',
    'Correo': 'Email',
    'correo@ejemplo.com': 'you@example.com',
    'WhatsApp': 'WhatsApp',
    '+57 300 000 0000': '+57 300 000 0000',
    '¿Qué tipo de negocio tiene?': 'What kind of business do you have?',
    'Seleccione una opción…': 'Select an option…',
    'Restaurante / cafetería / panadería': 'Restaurant / café / bakery',
    'Peluquería / barbería / spa': 'Salon / barber / spa',
    'Taller / servicio técnico': 'Garage / repair shop',
    'Tienda / minimarket': 'Shop / mini-market',
    'Consultorio / odontología': 'Clinic / dental practice',
    'Servicios a domicilio': 'At-home services',
    'Profesional independiente': 'Independent professional',
    'Otro': 'Other',
    '¿Qué plan le interesa más?': 'Which plan interests you most?',
    'única vez': 'one-time',
    'No estoy seguro': "I'm not sure",
    'quiero asesoría': 'I want advice',
    '¿Quiere agregar el Plan Hosting (opcional)?': 'Want to add the Hosting Plan (optional)?',
    'Mensual': 'Monthly',
    'Sí, mensual': 'Yes, monthly',
    'Sí, anual': 'Yes, annual',
    'Anual prepagado': 'Annual prepaid',
    'COP/mes': 'COP/mo',
    'COP/año': 'COP/yr',
    '$270k/año (ahorro)': '$270k/yr (save)',
    'No por ahora': 'Not for now',
    'solo el sitio': 'site only',
    'Cuéntenos qué necesita (opcional)': 'Tell us what you need (optional)',
    'Tengo una panadería en Bogotá y quiero recibir pedidos por internet…': 'I have a bakery in Bogotá and want to take online orders…',
    'Enviar, me contactan hoy mismo →': 'Send, contact me today →',
    'Sus datos no se comparten con nadie. Sin compromiso.': "Your data isn't shared with anyone. No commitment.",
    'si no le gusta su sitio, le devolvemos su dinero.': "if you don't love your site, we refund your money.",
    '¡Listo, recibimos su mensaje!': 'Got it! We received your message!',
    'Le escribimos hoy mismo por WhatsApp o correo. Si quiere adelantar, también puede escribirnos directo.':
      "We'll reach out today via WhatsApp or email. If you'd like to get ahead, message us directly.",

    // ── footer ──────────
    'Servicios': 'Services',
    'Planes y precios': 'Plans & pricing',
    'Cómo funciona': 'How it works',
    'Hablemos': "Let's talk",
    'Para quién': 'For whom',
    'Restaurantes': 'Restaurants',
    'Peluquerías': 'Salons',
    'Talleres': 'Garages',
    'Tiendas': 'Shops',
    'consultorios': 'clinics',
    '© 2026 PymeWebPro.com · Pensado y construido para el negocio colombiano.': '© 2026 PymeWebPro.com · Designed and built for the Colombian business.',
    'Hecho con': 'Made with',
    'en Colombia': 'in Colombia',

    // ── shorter common phrases (placeholders, aria-labels)
    'Sitios web profesionales para pequeños negocios en Colombia': 'Professional websites for small businesses in Colombia',
  };

  // ─── helpers ──────────────────────────────────────────────────────────────
  function detectLang() {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('lang');
    if (fromUrl === 'en' || fromUrl === 'es') {
      try { localStorage.setItem('pwp_lang', fromUrl); } catch (e) {}
      return fromUrl;
    }
    let stored = null;
    try { stored = localStorage.getItem('pwp_lang'); } catch (e) {}
    if (stored === 'en' || stored === 'es') return stored;
    const browser = (navigator.language || 'es').toLowerCase();
    return browser.startsWith('en') ? 'en' : 'es';
  }

  function setUrlParam(lang) {
    const url = new URL(location.href);
    if (lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    history.replaceState({}, '', url.toString());
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;

    const root = document.body;
    if (lang !== 'en') {
      // Spanish is the source. Nothing to swap, just update toggle UI + URL.
      updateToggleUI(lang);
      return;
    }

    // Walk all leaf text nodes inside <body>; replace any whose trimmed value
    // matches a key in EN.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const t = node.nodeValue && node.nodeValue.trim();
        if (!t) return NodeFilter.FILTER_REJECT;
        // Skip script / style / noscript content
        const parentTag = node.parentNode && node.parentNode.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const replacements = [];
    let node;
    while ((node = walker.nextNode())) {
      const trimmed = node.nodeValue.trim();
      if (EN[trimmed]) {
        replacements.push([node, EN[trimmed]]);
      }
    }
    for (const [n, en] of replacements) {
      // Preserve surrounding whitespace
      const leading = n.nodeValue.match(/^\s*/)[0];
      const trailing = n.nodeValue.match(/\s*$/)[0];
      n.nodeValue = leading + en + trailing;
    }

    // Translate select/option text (treeWalker covers it, but be explicit)
    document.querySelectorAll('option').forEach(o => {
      const t = (o.textContent || '').trim();
      if (EN[t]) o.textContent = EN[t];
    });

    // Translate placeholders
    document.querySelectorAll('[placeholder]').forEach(el => {
      const ph = el.getAttribute('placeholder');
      if (EN[ph]) el.setAttribute('placeholder', EN[ph]);
    });

    // Translate aria-labels and titles
    ['aria-label', 'title', 'alt'].forEach(attr => {
      document.querySelectorAll('[' + attr + ']').forEach(el => {
        const v = el.getAttribute(attr);
        if (EN[v]) el.setAttribute(attr, EN[v]);
      });
    });

    // Replace specific rich-HTML elements that the text walker can't handle
    // cleanly because of inline tags (<br>, <em>, <span>, <strong>).
    const richReplacements = [
      // Hero h1
      { sel: '.hero h1',
        es: 'Su negocio<br>merece estar<br><span class="underline">en</span> <span class="accent">internet.</span>',
        en: 'Your business<br>belongs<br><span class="underline">on</span> <span class="accent">the internet.</span>' },
      // What we build h2
      { sel: '#incluye .section-head h2',
        es: 'Todo lo que necesita para que<br>su negocio venda por internet.',
        en: 'Everything you need to make<br>your business sell online.' },
      // Portfolio h2
      { sel: '#portafolio .section-head h2',
        es: 'Vea el tipo de sitio<br>que recibe usted.',
        en: 'See the kind of site<br>you\'ll get.' },
      // Nosotros h2
      { sel: '#nosotros .section-head h2',
        es: 'Hecho a la medida<br>desde Medellín.',
        en: 'Built by hand<br>from Medellín.' },
      // Pricing h2
      { sel: '#paquetes .section-head h2',
        es: 'Pague una vez. Su sitio es suyo.<br>Sin contratos mensuales obligatorios.',
        en: 'Pay once. Your site is yours.<br>No mandatory monthly contracts.' },
      // CTA / form h2
      { sel: '#contacto .cta-grid h2',
        es: 'Llene el formulario<br>y le respondemos<br>en pocas horas.',
        en: 'Fill out the form<br>and we\'ll reply<br>within a few hours.' },
      // Process h2
      { sel: '#proceso .section-head h2',
        es: 'Su sitio en vivo en <em style="color:var(--amber);font-style:italic">7 días</em><br>(Pro en 14). <span style="color:var(--blue)">O le devolvemos el dinero</span>.',
        en: 'Your site live in <em style="color:var(--amber);font-style:italic">7 days</em><br>(Pro in 14). <span style="color:var(--blue)">Or your money back</span>.' },
    ];
    for (const r of richReplacements) {
      document.querySelectorAll(r.sel).forEach(el => {
        const cur = el.innerHTML.trim().replace(/\s+/g, ' ');
        const target = r.es.trim().replace(/\s+/g, ' ');
        if (cur === target) el.innerHTML = r.en;
      });
    }

    updateToggleUI(lang);
  }

  function updateToggleUI(lang) {
    const btn = document.getElementById('langToggle');
    if (!btn) return;
    btn.setAttribute('data-lang', lang);
    btn.querySelector('.lang-current').textContent = lang.toUpperCase();
    btn.querySelector('.lang-other').textContent = (lang === 'en' ? 'es' : 'en').toUpperCase();
  }

  function toggle() {
    const cur = document.documentElement.lang || 'es';
    const next = cur === 'en' ? 'es' : 'en';
    try { localStorage.setItem('pwp_lang', next); } catch (e) {}
    setUrlParam(next);
    if (next === 'es') {
      // Reload to restore Spanish source content cleanly.
      location.reload();
    } else {
      applyLanguage('en');
    }
  }

  // ─── boot ─────────────────────────────────────────────────────────────────
  function boot() {
    const lang = detectLang();
    setUrlParam(lang);
    applyLanguage(lang);

    const btn = document.getElementById('langToggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
