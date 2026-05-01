// blueprint.js — parameterized landing template (blueprint-1).
// Pure function; returns the full HTML string for a mockup.
// Plan-aware: Growth tier renders extra sections and injects tracking.
// Sections wrapped with data-section so the comment widget can anchor to them.

const FALLBACK = {
  businessName: "Su Negocio",
  tagline: "Lo que hacemos, en una frase memorable.",
  industry: "Servicios",
  services: ["Servicio uno", "Servicio dos", "Servicio tres"],
  primary: "#003893",
  accent: "#fcd116",
  ink: "#0a1840",
  bg: "#fbfaf6",
  language: "es",
};

const T_ES = {
  contact: "Contáctenos", whatsapp: "WhatsApp", call: "Llamar ahora",
  services: "Lo que hacemos", gallery: "Galería", about: "Sobre nosotros",
  getInTouch: "Hablemos", phone: "Teléfono", email: "Email",
  address: "Dirección", hours: "Horario",
  testimonials: "Lo que dicen nuestros clientes",
  bookings: "Agende su cita", bookNow: "Reservar ahora",
  catalog: "Vea nuestro catálogo en WhatsApp",
  download: "Descargar",
  newsletter: "Reciba nuestras novedades",
  newsletterCta: "Suscribirme",
  newsletterPlaceholder: "Su correo electrónico",
  newsletterThanks: "¡Gracias por suscribirse!",
  faq: "Preguntas frecuentes",
};
const T_EN = {
  contact: "Contact us", whatsapp: "WhatsApp", call: "Call now",
  services: "What we do", gallery: "Gallery", about: "About us",
  getInTouch: "Get in touch", phone: "Phone", email: "Email",
  address: "Address", hours: "Hours",
  testimonials: "What our clients say",
  bookings: "Book a time", bookNow: "Book now",
  catalog: "See our WhatsApp catalog",
  download: "Download",
  newsletter: "Get our news",
  newsletterCta: "Subscribe",
  newsletterPlaceholder: "Your email",
  newsletterThanks: "Thanks for subscribing!",
  faq: "Frequently asked questions",
};

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isPro(plan) {
  return String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
}

export function renderBlueprint1(input, opts) {
  const i = { ...FALLBACK, ...(input || {}) };
  const plan = (opts && opts.plan) || i.plan || "esencial";
  const pro = isPro(plan);
  const t = i.language === "en" ? T_EN : T_ES;
  const services = (i.services && i.services.length ? i.services : FALLBACK.services);
  const gallery = i.galleryUrls || [];
  const phoneLink = i.ctaPhone ? `tel:${i.ctaPhone}` : "#contacto";
  const waLink = i.ctaWhatsapp ? `https://wa.me/${String(i.ctaWhatsapp).replace(/[^\d]/g, "")}` : "#contacto";

  // Plan-gated content (Growth = pro tier)
  const testimonials = i.testimonials || [];                 // [{ name, quote, role }, …]
  const bookingsUrl = pro ? (i.bookingsUrl || "") : "";      // Calendly / Cal.com / Google Calendar URL
  const pdfUrl = pro ? (i.pdfUrl || "") : "";                // catalog / menu PDF
  const pdfLabel = pro ? (i.pdfLabel || (i.language === "en" ? "Catalog" : "Catálogo")) : "";
  const newsletter = pro && (i.newsletterUrl || i.newsletterEnabled);
  const waCatalogUrl = pro ? (i.waCatalogUrl || "") : "";
  const faqs = pro ? (i.faqs || []) : [];                    // [{ q, a }, …]
  const ga4Id = pro ? (i.ga4Id || "") : "";
  const metaPixelId = pro ? (i.metaPixelId || "") : "";

  // ─── JSON-LD (LocalBusiness on both, FAQPage on Growth) ────────────────
  const ldLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": i.businessName,
    "description": i.tagline,
    "url": i.canonicalUrl || undefined,
    "telephone": i.phone || undefined,
    "email": i.email || undefined,
    "image": i.logoUrl || undefined,
    "address": i.address ? { "@type": "PostalAddress", "streetAddress": i.address } : undefined,
    "openingHours": i.hours || undefined,
    "sameAs": [i.instagram, i.facebook].filter(Boolean),
  };
  const jsonLdBlocks = [renderJsonLd(ldLocalBusiness)];
  if (faqs.length) {
    jsonLdBlocks.push(renderJsonLd({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })),
    }));
  }

  // ─── Tracking pixels (Growth only, only if IDs present) ────────────────
  const ga4Tag = ga4Id ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(ga4Id)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(ga4Id)}');</script>` : "";
  const metaPixelTag = metaPixelId ? `
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(metaPixelId)}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${esc(metaPixelId)}&ev=PageView&noscript=1"/></noscript>` : "";

  return `<!doctype html>
<html lang="${i.language}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(i.businessName)} · ${esc(i.tagline)}</title>
<meta name="description" content="${esc(i.tagline)}">
<meta name="theme-color" content="${esc(i.primary)}">
<meta property="og:title" content="${esc(i.businessName)}">
<meta property="og:description" content="${esc(i.tagline)}">
<meta property="og:type" content="website">
${i.canonicalUrl ? `<meta property="og:url" content="${esc(i.canonicalUrl)}"><link rel="canonical" href="${esc(i.canonicalUrl)}">` : ""}
${i.logoUrl ? `<meta property="og:image" content="${esc(i.logoUrl)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Fraunces:opsz,wght@9..144,700;9..144,800&display=swap" rel="stylesheet">
${jsonLdBlocks.join("\n")}
${ga4Tag}
${metaPixelTag}
<style>
:root{--primary:${i.primary};--accent:${i.accent};--ink:${i.ink};--bg:${i.bg};--muted:#5e6883;--line:#e5e0c9}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55}
a{color:inherit}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:#fff;padding:8px 12px;border-radius:6px;z-index:9999}
h1,h2,h3{font-family:Fraunces,Georgia,serif;letter-spacing:-.02em;line-height:1.05;margin:0}
h1{font-size:clamp(2.4rem,6vw,4.8rem);font-weight:800}h2{font-size:clamp(1.8rem,4vw,3rem)}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.nav{display:flex;align-items:center;justify-content:space-between;padding:18px 24px}
.nav .logo{font-family:Fraunces,serif;font-weight:800;font-size:1.4rem}
.btn{display:inline-block;padding:12px 22px;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;text-decoration:none;border:0;cursor:pointer;font:inherit;font-weight:700}
.btn.alt{background:var(--accent);color:var(--ink)}
.btn.outline{background:transparent;color:var(--primary);border:2px solid var(--primary)}
.hero{padding:60px 0 80px}.hero h1{margin-bottom:20px}
.lead{font-size:1.2rem;color:var(--muted);max-width:640px;margin-bottom:30px}
.cta-row{display:flex;gap:14px;flex-wrap:wrap}
.section{padding:64px 0;border-top:1px solid var(--line)}
.section h2{margin-bottom:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:30px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px}
.card h3{font-family:Fraunces,serif;margin-bottom:8px;font-size:1.25rem}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:24px}
.gallery img{width:100%;height:200px;object-fit:cover;border-radius:12px}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:24px}
.testimonial{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px}
.testimonial blockquote{margin:0 0 12px;font-style:italic;font-size:1.05rem;color:var(--ink)}
.testimonial cite{font-style:normal;font-weight:600;color:var(--primary)}
.testimonial small{display:block;color:var(--muted);margin-top:2px}
.booking-frame{margin-top:24px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
.booking-frame iframe{width:100%;height:680px;border:0;display:block}
.newsletter{background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px;margin-top:24px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.newsletter form{display:flex;gap:8px;flex-wrap:wrap;flex:1;min-width:260px}
.newsletter input{flex:1;min-width:200px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font:inherit}
.faq-list{margin-top:24px}.faq-list details{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin-bottom:10px}
.faq-list summary{cursor:pointer;font-weight:600;font-family:Fraunces,serif;font-size:1.1rem;list-style:none}
.faq-list summary::-webkit-details-marker{display:none}
.faq-list summary::after{content:'+';float:right;font-size:1.4rem;color:var(--primary)}
.faq-list details[open] summary::after{content:'×'}
.faq-list p{margin:12px 0 0;color:var(--muted)}
.contact{background:var(--primary);color:#fff;border-radius:18px;padding:40px;margin:40px 0}
.contact a{color:var(--accent)}
footer{padding:30px 24px;color:var(--muted);font-size:.9rem;text-align:center}
@media (max-width:600px){.section{padding:44px 0}.contact{padding:28px}}
</style>
</head>
<body>
<a class="skip" href="#main">${i.language === "en" ? "Skip to content" : "Saltar al contenido"}</a>

<header class="nav" data-section="nav">
  <div class="logo">${i.logoUrl ? `<img src="${esc(i.logoUrl)}" alt="${esc(i.businessName)}" style="height:40px;width:auto">` : esc(i.businessName)}</div>
  <a class="btn" href="${esc(waLink)}" rel="noopener">${t.contact}</a>
</header>

<main id="main">
<section class="hero wrap" data-section="hero">
  <h1>${esc(i.businessName)}</h1>
  <p class="lead">${esc(i.tagline)}</p>
  <div class="cta-row">
    <a class="btn" href="${esc(waLink)}" rel="noopener">${t.whatsapp}</a>
    <a class="btn alt" href="${esc(phoneLink)}">${t.call}</a>
    ${bookingsUrl ? `<a class="btn outline" href="${esc(bookingsUrl)}" rel="noopener" target="_blank">${t.bookNow}</a>` : ""}
  </div>
</section>

<section class="section wrap" data-section="services">
  <h2>${t.services}</h2>
  <div class="cards">
    ${services.map((s) => typeof s === "string"
      ? `<div class="card"><h3>${esc(s)}</h3></div>`
      : `<div class="card"><h3>${esc(s.title)}</h3>${s.body ? `<p>${esc(s.body)}</p>` : ""}</div>`
    ).join("")}
  </div>
</section>

${gallery.length ? `<section class="section wrap" data-section="gallery">
  <h2>${t.gallery}</h2>
  <div class="gallery">${gallery.map((u, idx) => `<img src="${esc(u)}" alt="${esc(i.businessName)} ${idx+1}" loading="lazy">`).join("")}</div>
</section>` : ""}

${testimonials.length ? `<section class="section wrap" data-section="testimonials">
  <h2>${t.testimonials}</h2>
  <div class="testimonials-grid">
    ${testimonials.map(tm => `
      <div class="testimonial">
        <blockquote>"${esc(tm.quote)}"</blockquote>
        <cite>${esc(tm.name)}</cite>
        ${tm.role ? `<small>${esc(tm.role)}</small>` : ""}
      </div>`).join("")}
  </div>
</section>` : ""}

${pro && bookingsUrl ? `<section class="section wrap" data-section="bookings">
  <h2>${t.bookings}</h2>
  <div class="booking-frame">
    <iframe src="${esc(bookingsUrl)}" loading="lazy" title="${t.bookings}"></iframe>
  </div>
</section>` : ""}

${pro && pdfUrl ? `<section class="section wrap" data-section="catalog">
  <h2>${esc(pdfLabel)}</h2>
  <p style="margin-top:12px"><a class="btn" href="${esc(pdfUrl)}" target="_blank" rel="noopener">${t.download} ${esc(pdfLabel)} (PDF)</a></p>
</section>` : ""}

${pro && waCatalogUrl ? `<section class="section wrap" data-section="wa-catalog">
  <h2>${t.catalog}</h2>
  <p style="margin-top:12px"><a class="btn" href="${esc(waCatalogUrl)}" target="_blank" rel="noopener">${t.catalog} →</a></p>
</section>` : ""}

${newsletter ? `<section class="section wrap" data-section="newsletter">
  <h2>${t.newsletter}</h2>
  <div class="newsletter">
    <form action="${esc(i.newsletterUrl || "")}" method="POST" target="_blank" rel="noopener">
      <input type="email" name="email" required placeholder="${t.newsletterPlaceholder}" aria-label="${t.newsletterPlaceholder}">
      <button class="btn" type="submit">${t.newsletterCta}</button>
    </form>
  </div>
</section>` : ""}

${faqs.length ? `<section class="section wrap" data-section="faq">
  <h2>${t.faq}</h2>
  <div class="faq-list">
    ${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
  </div>
</section>` : ""}

<section class="section wrap" data-section="about">
  <h2>${t.about}</h2>
  <p>${esc(i.industry)}. ${esc(i.tagline)}</p>
</section>

<section class="wrap" data-section="contact" id="contacto">
  <div class="contact">
    <h2 style="color:#fff;margin-bottom:18px">${t.getInTouch}</h2>
    ${i.phone ? `<p>${t.phone}: <a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></p>` : ""}
    ${i.email ? `<p>${t.email}: <a href="mailto:${esc(i.email)}">${esc(i.email)}</a></p>` : ""}
    ${i.address ? `<p>${t.address}: ${esc(i.address)}</p>` : ""}
    ${i.hours ? `<p>${t.hours}: ${esc(i.hours)}</p>` : ""}
    ${i.instagram ? `<p>Instagram: <a href="${esc(i.instagram)}" rel="noopener">${esc(i.instagram)}</a></p>` : ""}
    ${i.facebook ? `<p>Facebook: <a href="${esc(i.facebook)}" rel="noopener">${esc(i.facebook)}</a></p>` : ""}
  </div>
</section>
</main>

<footer>© ${new Date().getFullYear()} ${esc(i.businessName)} · Hecho con PymeWebPro · <a href="/politica-privacidad">${i.language === "en" ? "Privacy" : "Privacidad"}</a></footer>
</body></html>`;
}

function renderJsonLd(obj) {
  // Strip undefined keys so JSON-LD stays clean
  const clean = JSON.parse(JSON.stringify(obj));
  return `<script type="application/ld+json">${JSON.stringify(clean)}</script>`;
}

export const BLUEPRINTS = {
  "blueprint-1": renderBlueprint1,
};
