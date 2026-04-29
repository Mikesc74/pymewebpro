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
    'Casos': 'Cases',
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
    'Le respondemos cuanto antes. Sin compromiso.': "We'll reply as soon as we can. No commitment.",
    'Esencial en 7 días · Crecimiento en 14': 'Essential in 7 days · Growth in 14',
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
    'Cliente reciente · Industria · Envigado': 'Recent client · Industrial · Envigado',
    'Empresa de parasoles, toldos y mantenimiento con más de 19 años en Envigado. Lanzamos su nuevo sitio web profesional para llegar a clientes en toda Colombia.':
      'Awnings, shades, and maintenance company with 19+ years in Envigado. We launched their new professional website to reach customers across Colombia.',

    // case studies
    'Métricas reales': 'Real metrics',
    'Números concretos,<br>no promesas vagas.': 'Concrete numbers,<br>not vague promises.',
    'Estos son nuestros propios sitios. Lo construimos así, lo medimos así, y así construiremos el suyo.':
      'These are our own sites. We build them this way, we measure them this way, and we will build yours the same way.',
    'Guía de ciudad · Medellín': 'City guide · Medellín',
    'Una guía completa de la ciudad: barrios, restaurantes, salud, eventos, mudanzas. Construida con el mismo stack y proceso que usamos en sus sitios.':
      'A complete city guide: neighborhoods, restaurants, healthcare, events, relocation. Built with the same stack and process we use for your sites.',
    'tiempo de respuesta del servidor': 'server response time',
    'peso de la página de inicio': 'home page weight',
    'páginas indexadas en Google': 'pages indexed on Google',
    'esquemas estructurados para SEO local': 'structured-data schemas for local SEO',
    'SSL + Cloudflare CDN global': 'SSL + Cloudflare global CDN',
    'responsive para celular': 'mobile-responsive',
    'Visitar sitio →': 'Visit site →',
    'Consultoría B2B · Salesforce': 'B2B consulting · Salesforce',
    'Sitio corporativo bilingüe para una consultora B2B con presencia en EE.UU., Colombia y México. Diseño limpio, respuesta veloz, mensaje al grano.':
      'Bilingual corporate site for a B2B consultancy with presence in the US, Colombia, and Mexico. Clean design, fast response, message on point.',
    'tiempo total de carga': 'total page load time',
    'idiomas (español + inglés)': 'languages (Spanish + English)',
    'scripts de terceros que ralentizan': 'third-party scripts slowing the site',
    'Mediciones tomadas con curl desde un servidor en Estados Unidos. Su sitio se construye con el mismo stack: Cloudflare, HTML/CSS optimizado, sin frameworks pesados.':
      'Measurements taken with curl from a server in the United States. Your site is built with the same stack: Cloudflare, optimized HTML/CSS, no heavy frameworks.',

    // ── nosotros ────────
    'Hecho a la medida<br>desde Medellín.': 'Built by hand<br>from Medellín.',
    'No somos una agencia gigante con call-center en otro país. Somos dos personas que llevan años construyendo sitios web para negocios reales (restaurantes, talleres, peluquerías, profesionales) y entendemos cómo funciona la realidad colombiana: pago contado, WhatsApp como canal principal, márgenes ajustados, sin tiempo para perder.':
      "We're not a giant agency with a call center in another country. We're two people who have spent years building websites for real businesses (restaurants, garages, salons, professionals) and we understand the reality on the ground in Colombia: cash payments, WhatsApp as the main channel, tight margins, no time to waste.",
    'Cuando le respondemos un mensaje, le respondemos nosotros': 'When we reply to a message, we reply ourselves',
    ', no un bot, no un junior. Esa es la diferencia.': ', no bot, no junior. That\'s the difference.',
    'Correo profesional': 'Professional email',
    'redirigido a su Gmail (sin costo adicional)': 'forwarded to your Gmail (no extra cost)',
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
    'Pague una vez. Su sitio es suyo. Sin contratos mensuales obligatorios.': 'Pay once. Your site is yours. No mandatory monthly contracts.',
    'Elija un plan, lo construimos, se lo entregamos y queda 100% suyo. Si quiere que nosotros lo alojemos, lo monitoreemos y hagamos pequeños cambios cada mes, agregue el Plan Soporte opcional, cancelable cuando quiera.':
      "Pick a plan, we build it, we deliver it, and it's 100% yours. If you'd like us to host it, monitor it, and make small changes each month, add the optional Support Plan, cancel anytime.",
    'Esencial en 7 días, Crecimiento en 14.': 'Essential in 7 days, Growth in 14.',
    'Entrega 7–14 días': 'Delivery 7–14 days',
    'o reembolso': 'or refund',
    '−$100.000': '−$100,000',
    'si paga hoy': 'if you pay today',
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
    'Páginas listas:': 'Pages ready:',
    'Inicio, servicios, sobre nosotros, contacto y ubicación': 'Home, services, about us, contact and location',
    'Asesoría y configuración del dominio (registro anual aparte, ~$50–150k COP/año)': 'Domain advice and setup (annual registration separate, ~$50–150k COP/year)',
    'Certificado SSL (HTTPS) incluido (su sitio seguro y verificado por Google)': 'SSL certificate (HTTPS) included (secure and Google-verified)',
    'Botón directo al WhatsApp del negocio': 'Direct WhatsApp button',
    'Mapa de Google integrado con su ubicación': 'Google Maps embed with your location',
    'Barra social: WhatsApp, Instagram, Facebook y Google Maps en un clic desde el celular': 'Social bar: WhatsApp, Instagram, Facebook and Google Maps in one tap on mobile',
    'Galería de fotos para mostrar su negocio': 'Photo gallery to showcase your business',
    'Sección de testimonios o reseñas de sus clientes': 'Testimonials or customer reviews section',
    'Diseño listo para celular': 'Mobile-ready design',
    'Google Analytics integrado': 'Google Analytics integrated',
    '2 rondas de cambios incluidas': '2 revision rounds included',
    'SEO básico para Google': 'Basic SEO for Google',
    'Indexado en Google en 7 días, meta tags optimizadas por página, sitemap automático y carga en menos de 1 segundo':
      'Indexed on Google within 7 days, optimized meta tags per page, automatic sitemap, and page load under 1 second',
    '+ Google Analytics, Search Console, sitemap.xml y robots.txt configurados.': '+ Google Analytics, Search Console, sitemap.xml, and robots.txt configured.',
    '+ Google Analytics, Search Console, sitemap.xml, robots.txt y herramientas estándar.': '+ Google Analytics, Search Console, sitemap.xml, robots.txt, and standard tooling.',
    'Garantía de 30 días': '30-day guarantee',
    'Quiero el plan Esencial': 'I want the Essential plan',
    'Respuesta prioritaria por WhatsApp (los clientes con Plan Hosting van primero en la cola)': 'Priority WhatsApp support (Hosting Plan clients jump to the front of the queue)',
    'Hablar primero': 'Talk first',
    '20 min, gratis': '20 min, free',
    'Reservar mi cupo': 'Reserve my spot',
    'Pagar ahora': 'Pay now',
    '¿Puedo pagar a cuotas?': 'Can I pay in installments?',
    'Sí. En la pantalla de pago puede diferir su tarjeta de crédito hasta en 3, 6 o más cuotas sin costo adicional para nosotros. Su banco se encarga del cobro mensual; nosotros recibimos el pago completo y arrancamos su sitio el mismo día.':
      'Yes. On the payment screen you can split your credit card payment into 3, 6, or more installments at no extra charge. Your bank handles the monthly billing; we receive full payment and start your site the same day.',
    '★ Más completo': '★ Most complete',
    'Crecimiento': 'Growth',
    'Lanzamiento': 'Launch price',
    'Todo lo del plan Esencial': 'Everything in Essential',
    '1 año de hosting incluido': '1 year of hosting included',
    '(valor $270.000 COP)': '(value $270,000 COP)',
    'Todo lo del plan Esencial, más:': 'Everything in Essential, plus:',
    'Páginas adicionales:': 'Additional pages:',
    'Blog/Noticias, galería ampliada, reservas, reseñas, equipo y FAQ': 'Blog/News, extended gallery, bookings, reviews, team, and FAQ',
    'Sección de Blog/Noticias real (publica sus propias entradas cuando quiera)':
      'Real Blog/News section (publish your own posts whenever you want)',
    'Logo nuevo o refresh con diseño asistido por IA': 'New logo or refresh with AI-assisted design',
    'Catálogo de WhatsApp Business enlazado (si vende productos)': 'WhatsApp Business catalog linked (if you sell products)',
    'Conversion tracking: Meta Pixel + GA4 con metas de conversión configuradas': 'Conversion tracking: Meta Pixel + GA4 with conversion goals configured',
    'Versión bilingüe (español + inglés)': 'Bilingual version (Spanish + English)',
    'Google Business Profile configurado y verificado': 'Google Business Profile set up and verified',
    'Sistema de agendamiento o reservas integrado': 'Booking or reservation system integrated',
    'PDF descargable (menú, catálogo o ficha técnica) optimizado para celular': 'Downloadable PDF (menu, catalog, or tech sheet) optimized for mobile',
    'Captura de correos integrada (suscripciones a newsletter o promociones)': 'Built-in email capture (newsletter or promo signups)',
    'Formulario de contacto con confirmación automática al cliente': 'Contact form with automatic client confirmation',
    'Datos estructurados para que Google muestre horarios, ubicación y reseñas en los resultados': 'Structured data so Google shows your hours, location, and reviews',
    'Optimización de velocidad y rendimiento (Core Web Vitals)': 'Speed and performance optimization (Core Web Vitals)',
    'Rondas de cambios ilimitadas hasta su aprobación': 'Unlimited revision rounds until you approve',
    'Quiero el plan Crecimiento': 'I want the Growth plan',
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

    // ── how it works (4-step process) ─────────────────────────────────
    'Cómo funciona': 'How it works',
    '2 minutos': '2 minutes',
    'Reserve su cupo': 'Reserve your spot',
    'Llene el formulario o hablemos primero por WhatsApp': 'Fill out the form or talk first on WhatsApp',
    'Elige plan: Esencial o Crecimiento': 'Pick a plan: Essential or Growth',
    'Pague en línea con tarjeta o cuotas': 'Pay online with card or installments',
    'O agende una llamada de 20 min, sin compromiso': 'Or book a 20-min call, no commitment',
    'A su ritmo': 'At your own pace',
    'Reciba su portal privado': 'Get your private portal',
    'Le enviamos un enlace privado a su correo': 'We email you a private link',
    'Sube su logo, fotos y colores de marca': 'Upload your logo, photos, and brand colors',
    'Nos cuenta su visión: tono, público, contenido': 'Tell us your vision: tone, audience, content',
    'Todo guardado automáticamente, completa cuando pueda': 'Everything saved automatically — finish whenever',
    '7 a 14 días': '7 to 14 days',
    'Construimos su sitio': 'We build your site',
    'Diseñamos a partir de su visión y materiales': 'We design from your vision and materials',
    'Escribimos los textos (o pulimos los suyos)': 'We write the copy (or polish yours)',
    'Conectamos WhatsApp, Google Maps y Analytics': 'We connect WhatsApp, Google Maps, and Analytics',
    'Usted aprueba cada paso': 'You approve every step',
    'Día del lanzamiento': 'Launch day',
    'Salimos al aire': 'We go live',
    'Su sitio publicado en sunegocio.com': 'Your site live at yourbusiness.com',
    'Le enseñamos a usarlo en 30 minutos': 'We teach you to use it in 30 minutes',
    'Soporte por WhatsApp incluido': 'WhatsApp support included',
    'Su sitio empieza a recibir clientes': 'Your site starts getting customers',

    // ── CTA / form ──────
    'Hablemos hoy mismo': "Let's talk today",
    'Llene el formulario': 'Fill out the form',
    'y le respondemos': "and we'll reply",
    'en pocas horas.': 'within a few hours.',
    'Reserve su sitio web': 'Reserve your website',
    'en menos de 2 minutos.': 'in under 2 minutes.',
    'Si elige un plan, le mostramos su precio final con el descuento aplicado y puede pagar al instante. Si todavía no está seguro, le contactamos por WhatsApp cuanto antes, sin compromiso.':
      "If you pick a plan, we'll show you the final price with the discount applied and you can pay instantly. If you're not sure yet, we'll reach out on WhatsApp as soon as we can, no commitment.",
    'Sin compromiso. Le devolvemos la llamada o escribimos por el medio que prefiera, con una propuesta clara por escrito.':
      "No commitment. We'll call you back or write by your preferred channel, with a clear proposal in writing.",
    'Chat directo por WhatsApp': 'Direct WhatsApp chat',
    '+57 301 404 7722 · le respondemos cuanto antes': '+57 301 404 7722 · we reply as soon as we can',
    'Enviar correo': 'Send email',
    'ventas@pymewebpro.com': 'ventas@pymewebpro.com',
    'Llene este formulario': 'Fill out this form',
    'Le respondemos cuanto antes con una propuesta clara, sin compromiso.': "We'll reply as soon as we can with a clear proposal, no commitment.",
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
    '¿Quiere agregar el Plan Hosting?': 'Want to add the Hosting Plan?',
    '(Crecimiento ya incluye 1 año gratis)': '(Growth already includes 1 year free)',
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
    'Continuar al pago →': 'Continue to payment →',
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

    // ── hero mock-browser ────────────────────────────────────────────────
    'https://sunombre.com': 'https://yourbrand.com',
    'SU NEGOCIO': 'YOUR BUSINESS',
    'Inicio · Servicios · Contacto': 'Home · Services · Contact',
    'Bienvenido a su nuevo sitio web profesional': 'Welcome to your new professional website',
    'Diseño moderno, rápido y listo para convertir visitantes en clientes.': 'Modern, fast design ready to convert visitors into customers.',
    'Solicitar información →': 'Request info →',
    'Posicionado': 'Ranked',
    'Visible en Google': 'Visible on Google',
    'Formularios': 'Forms',
    'Leads al correo': 'Leads to email',
    'Rápido': 'Fast',
    'PSI 100/100': 'PSI 100/100',
    '© 2026 Su Negocio': '© 2026 Your Business',
    'WhatsApp · Email · Maps': 'WhatsApp · Email · Maps',
    'Cargado en 0.8s': 'Loaded in 0.8s',
    'Nuevo lead recibido': 'New lead received',

    // ── problem section ─────────────────────────────────────────────────
    'El problema': 'The problem',
    'Hoy en Colombia, si su negocio no está en Google, no existe.': "Today in Colombia, if your business isn't on Google, it doesn't exist.",
    'Sus vecinos, sus clientes y su próxima venta están buscando en el celular antes de salir de casa. Si no lo encuentran a usted, encuentran a la competencia.': 'Your neighbors, your customers, and your next sale are searching on their phone before leaving home. If they don\'t find you, they find your competition.',
    'Si solo está en Instagram o Facebook…': 'If you\'re only on Instagram or Facebook…',
    'Está construyendo en terreno alquilado.': 'You\'re building on rented land.',
    'Las redes sociales no son suyas. Si Instagram cambia el algoritmo o le cierra la cuenta, pierde todos sus clientes. Un sitio web propio nadie se lo quita.': 'Social media platforms aren\'t yours. If Instagram changes its algorithm or closes your account, you lose all your customers. A site you own can\'t be taken away.',
    'Si no aparece en Google…': 'If you don\'t show up on Google…',
    'Para sus clientes, no existe.': 'To your customers, you don\'t exist.',
    'Cuando alguien busca en Google "panadería en mi barrio" o "taller mecánico cerca", aparecen otros. Sin un sitio web propio, usted ni siquiera entra al juego.': 'When someone searches "bakery near me" or "mechanic close by," others show up. Without a site of your own, you\'re not even in the game.',
    'Si cierra el local a las 8 p.m.…': 'If your shop closes at 8 p.m.…',
    'Su negocio deja de vender.': 'Your business stops selling.',
    'Pero los clientes siguen buscando en el celular. Un sitio web con WhatsApp y formulario de contacto sigue trabajando, y al otro día usted abre con mensajes y pedidos esperando.': 'But customers keep searching on their phones. A site with WhatsApp and a contact form keeps working, and the next morning you open up with messages and orders waiting.',
    'de los colombianos buscan en Google antes de elegir un negocio local': 'of Colombians search Google before choosing a local business',
    '9 de 10': '9 in 10',
    'no compran si el negocio no tiene sitio web propio': "won't buy if the business doesn't have its own website",

    // ── what's included headline ────────────────────────────────────────
    'Lo que recibe': 'What you get',
    'Todo lo que necesita para que su negocio venda por internet.': 'Everything you need to make your business sell online.',

    // ── build mini cards (compact "what's included" grid) ──────────────
    'Dominio propio': 'Own domain',
    'a su nombre, suyo para siempre': 'in your name, yours forever',
    'info@sunegocio → su Gmail': 'info@yourbiz → your Gmail',
    'Mapa de Google': 'Google Maps',
    'integrado con su ubicación': 'embedded with your location',
    'Barra social': 'Social bar',
    'WhatsApp, IG, FB y Maps': 'WhatsApp, IG, FB and Maps',
    'Galería de fotos': 'Photo gallery',
    'muestre su negocio': 'showcase your business',
    'Testimonios': 'Testimonials',
    'reseñas de sus clientes': 'reviews from your customers',
    'SSL / HTTPS': 'SSL / HTTPS',
    'su sitio seguro y verificado': 'secure and verified site',
    'Diseño para celular': 'Mobile design',
    'se ve perfecto en cualquier pantalla': 'looks perfect on every screen',
    'Indexado en 7 días': 'Indexed in 7 days',
    'meta tags + sitemap automático': 'meta tags + auto sitemap',
    'Velocidad <1s': 'Speed under 1s',
    'carga ultrarrápida': 'ultra-fast load',
    'Rondas de cambios': 'Revision rounds',
    '2 con Esencial · ilimitadas con Crecimiento': '2 with Essential · unlimited with Growth',
    'incluidas': 'included',
    'incluida': 'included',
    'Garantía 30 días': '30-day guarantee',
    'dinero de vuelta si no le gusta': 'money back if you don\'t love it',

    // ── portfolio cards (full descriptions) ─────────────────────────────
    'Vea el tipo de sitio que recibe usted.': 'See the kind of site you\'ll get.',
    'medellin.guide': 'medellin.guide',
    'barranquilla.guide': 'barranquilla.guide',
    'thecartagena.guide': 'thecartagena.guide',
    'mikec.pro': 'mikec.pro',
    'nortesurconsulting.com': 'nortesurconsulting.com',
    'Sitio personal y portafolio profesional. Diseño minimalista, contenido en inglés, optimizado para velocidad y SEO.':
      'Personal site and professional portfolio. Minimalist design, English content, optimized for speed and SEO.',
    'Consultoría empresarial': 'Business consulting',
    'Sitio corporativo de consultoría. Diseño moderno, enfocado a generar contactos calificados y comunicar credibilidad.':
      'Corporate consulting site. Modern design focused on generating qualified leads and communicating credibility.',
    '¿Listo para tener uno como estos?': 'Ready to have one like these?',
    'Quiero el mío →': 'I want mine →',

    // ── case-studies headline (rewritten) ───────────────────────────────
    'Números concretos, no promesas vagas.': 'Concrete numbers, not vague promises.',

    // ── pricing trust badges + delivery pill ────────────────────────────
    '🎁': '🎁',
    'O le devolvemos su dinero. Sin excusas.': 'Or your money back. No excuses.',
    'pago': 'one-time',
    'único, sin pagos mensuales': 'payment, no monthly fees',
    'Entrega en 7 días desde su brief, o le devolvemos el dinero': 'Delivery in 7 days from your brief, or we refund you',
    'Entrega en 14 días desde su brief, o le devolvemos el dinero': 'Delivery in 14 days from your brief, or we refund you',
    'desde su brief, o le devolvemos el dinero': 'from your brief, or we refund you',
    'desde su brief': 'from your brief',
    'Lanzamiento': 'Launch price',

    // ── plan card extras (mixed inline content) ─────────────────────────
    'Páginas listas:': 'Pages ready:',
    'Inicio, servicios, sobre nosotros, contacto y ubicación': 'Home, services, about us, contact and location',
    'info@sunegocio.com': 'info@yourbusiness.com',
    'redirigido a su Gmail (sin costo adicional)': 'forwarded to your Gmail (no extra cost)',
    'Correo profesional': 'Professional email',
    'El dominio queda a su nombre. Suyo para siempre. Le ayudamos a elegirlo y configurarlo (registro ~$50k–$150k/año, lo paga usted al registrador)':
      'Domain stays in your name. Yours forever. We help you pick and configure it (registration ~$50k–$150k/yr, paid by you to the registrar)',
    'Páginas adicionales:': 'Additional pages:',
    'Blog/Noticias, galería ampliada, reservas, reseñas, equipo y FAQ': 'Blog/News, extended gallery, bookings, reviews, team, and FAQ',
    'Garantía de 30 días.': '30-day guarantee.',
    'Devolvemos su dinero si no le gusta': 'Money back if you don\'t love it',
    '(valor $270.000 COP)': '(value $270,000 COP)',
    '+ Google Analytics, Search Console, sitemap.xml y robots.txt configurados.': '+ Google Analytics, Search Console, sitemap.xml, and robots.txt configured.',
    '+ Google Analytics, Search Console, sitemap.xml, robots.txt y herramientas estándar.': '+ Google Analytics, Search Console, sitemap.xml, robots.txt, and standard tooling.',

    // ── plan CTAs + sub-text ────────────────────────────────────────────
    'Hablar primero': 'Talk first',
    '· 20 min, gratis': '· 20 min, free',
    'Reservar mi cupo →': 'Reserve my spot →',

    // ── support card ────────────────────────────────────────────────────
    'Plan Soporte (opcional)': 'Support Plan (optional)',
    'Hosting + monitoreo + cambios menores cada mes': 'Hosting + monitoring + small monthly changes',
    'COP/mes': 'COP/mo',
    'Cancelable cuando quiera, sin penalidad.': 'Cancel anytime, no penalty.',
    'Hospedaje + soporte': 'Hosting + support',
    'Plan Hosting': 'Hosting Plan',
    'cancele cuando quiera, sin contrato': 'cancel anytime, no contract',
    'Hospedaje en la red global de Cloudflare (la misma que usan grandes empresas)': 'Hosting on the global Cloudflare network (the same one big companies use)',
    'Hospedaje ultrarrápido': 'Ultra-fast hosting',
    'en la red global de Cloudflare (la misma que usan grandes empresas)': 'on the global Cloudflare network (the same one big companies use)',
    '99.9% de disponibilidad garantizada, carga en menos de 1 segundo': '99.9% uptime guarantee, page load under 1 second',
    'Protección anti-ataques (DDoS, hackers, bots)': 'Attack protection (DDoS, hackers, bots)',
    'Monitoreo 24/7 de su sitio': '24/7 site monitoring',
    'Pequeños cambios cada mes (horarios, fotos, textos, ofertas)': 'Small monthly changes (hours, photos, copy, offers)',
    'Backups automáticos y reporte mensual de visitas': 'Automatic backups and monthly visit report',
    'Agregar Plan Hosting': 'Add Hosting Plan',
    '$270.000 COP / año prepagado': '$270,000 COP / year prepaid',
    'Mejor valor': 'Best value',
    'Ahorra $90.000 (3 meses gratis)': 'Save $90,000 (3 months free)',

    // ── pricing footer note ─────────────────────────────────────────────
    '¿Aún no sabe cuál? Hablemos 20 minutos por WhatsApp y le recomendamos el indicado, sin compromiso.': "Not sure which one? Let's talk 20 minutes on WhatsApp and we'll recommend the right one, no commitment.",

    // ── network / FAQ section ───────────────────────────────────────────
    'Preguntas frecuentes': 'Frequently asked questions',
    'Lo que nos preguntan los dueños de negocio.': 'What business owners ask us.',
    '¿Y si no sé nada de tecnología?': 'What if I don\'t know anything about tech?',
    'Justo para eso estamos nosotros. Usted no toca ni una línea de código. Le pedimos sus fotos, sus textos (o los escribimos nosotros), y le entregamos el sitio listo y funcionando.':
      "That's exactly what we're here for. You don't touch a single line of code. We ask for your photos and copy (or we write it for you), and we hand over the site ready to go.",
    '¿Qué pasa después de lanzar?': 'What happens after launch?',
    'Le entregamos su sitio funcionando y le enseñamos a manejarlo. Si quiere que nosotros lo alojemos, lo monitoreemos y le hagamos pequeños cambios cada mes, puede agregar el Plan Hosting opcional, sin contrato.':
      'We hand over the site running and show you how to manage it. If you want us to host it, monitor it, and make small monthly changes, you can add the optional Hosting Plan, no contract.',

    // ── process section steps ───────────────────────────────────────────
    'Día 1': 'Day 1',
    'Lanzamos y le entregamos las llaves': 'We launch and hand over the keys',
    'Su dominio queda en su nombre': 'Your domain stays in your name',
    'Le mostramos cómo hacer cambios pequeños': 'We show you how to make small edits',
    'Soporte por WhatsApp para preguntas': 'WhatsApp support for questions',
    'Su sitio empieza a recibir clientes': 'Your site starts getting customers',

    // ── form / contact section extras ───────────────────────────────────
    'Hablemos hoy mismo': "Let's talk today",
    'Reserve su sitio web en menos de 2 minutos.': 'Reserve your website in under 2 minutes.',

    // ── footer ──────────────────────────────────────────────────────────
    'Pensado y construido para el negocio colombiano.': 'Designed and built for the Colombian business.',
    'Hecho con ❤ en Colombia': 'Made with ❤ in Colombia',
    'Restaurantes, peluquerías, talleres, tiendas y más.': 'Restaurants, salons, garages, shops, and more.',
    'Peluquerías &amp; spas': 'Salons & spas',
    'Tiendas &amp; consultorios': 'Shops & clinics',
    'Tiendas & consultorios': 'Shops & clinics',
    'Peluquerías & spas': 'Salons & spas',

    // ── lang toggle ─────────────────────────────────────────────────────
    'Toggle language': 'Toggle language',
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
      // Normalize internal whitespace (newlines + indentation collapse to single
      // space) so paragraphs in the HTML match their single-line keys.
      const normalized = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (EN[normalized]) {
        replacements.push([node, EN[normalized]]);
      }
    }
    for (const [n, en] of replacements) {
      // Preserve leading/trailing whitespace to keep adjacent inline content tidy
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
      // What we build h2 (no <br>; handled by text-walker via single-line key)
      // Portfolio h2
      { sel: '#portafolio .section-head h2',
        es: 'Vea el tipo de sitio<br>que recibe usted.',
        en: 'See the kind of site<br>you\'ll get.' },
      // Nosotros h2
      { sel: '#nosotros .section-head h2',
        es: 'Hecho a la medida<br>desde Medellín.',
        en: 'Built by hand<br>from Medellín.' },
      // Pricing h2 (no <br>; handled by text-walker via single-line key)
      // CTA / form h2
      { sel: '#contacto .cta-grid h2',
        es: 'Reserve su sitio web<br>en menos de 2 minutos.',
        en: 'Reserve your website<br>in under 2 minutes.' },
      // Process h2
      { sel: '#proceso .section-head h2',
        es: 'Su sitio en vivo en <em style="color:var(--amber);font-style:italic">7 días</em><br>(Crecimiento en 14). <span style="color:var(--blue)">O le devolvemos el dinero</span>.',
        en: 'Your site live in <em style="color:var(--amber);font-style:italic">7 days</em><br>(Growth in 14). <span style="color:var(--blue)">Or your money back</span>.' },
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
