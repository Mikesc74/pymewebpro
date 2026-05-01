// blueprint.js — parameterized landing template (blueprint-1).
// Pure function; returns the full HTML string for a mockup.
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
};
const T_EN = {
  contact: "Contact us", whatsapp: "WhatsApp", call: "Call now",
  services: "What we do", gallery: "Gallery", about: "About us",
  getInTouch: "Get in touch", phone: "Phone", email: "Email",
  address: "Address", hours: "Hours",
};

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderBlueprint1(input) {
  const i = { ...FALLBACK, ...(input || {}) };
  const t = i.language === "en" ? T_EN : T_ES;
  const services = (i.services && i.services.length ? i.services : FALLBACK.services);
  const gallery = i.galleryUrls || [];
  const phoneLink = i.ctaPhone ? `tel:${i.ctaPhone}` : "#contacto";
  const waLink = i.ctaWhatsapp ? `https://wa.me/${String(i.ctaWhatsapp).replace(/[^\d]/g, "")}` : "#contacto";

  return `<!doctype html>
<html lang="${i.language}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(i.businessName)} · ${esc(i.tagline)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Fraunces:opsz,wght@9..144,700;9..144,800&display=swap" rel="stylesheet">
<style>
:root{--primary:${i.primary};--accent:${i.accent};--ink:${i.ink};--bg:${i.bg};--muted:#5e6883;--line:#e5e0c9}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55}
h1,h2,h3{font-family:Fraunces,Georgia,serif;letter-spacing:-.02em;line-height:1.05;margin:0}
h1{font-size:clamp(2.4rem,6vw,4.8rem);font-weight:800}h2{font-size:clamp(1.8rem,4vw,3rem)}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.nav{display:flex;align-items:center;justify-content:space-between;padding:18px 24px}
.nav .logo{font-family:Fraunces,serif;font-weight:800;font-size:1.4rem}
.btn{display:inline-block;padding:12px 22px;border-radius:10px;background:var(--primary);color:#fff;font-weight:700;text-decoration:none}
.btn.alt{background:var(--accent);color:var(--ink)}
.hero{padding:60px 0 80px}.hero h1{margin-bottom:20px}
.lead{font-size:1.2rem;color:var(--muted);max-width:640px;margin-bottom:30px}
.cta-row{display:flex;gap:14px;flex-wrap:wrap}
.section{padding:64px 0;border-top:1px solid var(--line)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:30px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px}
.card h3{font-family:Fraunces,serif;margin-bottom:8px;font-size:1.25rem}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:24px}
.gallery img{width:100%;height:200px;object-fit:cover;border-radius:12px}
.contact{background:var(--primary);color:#fff;border-radius:18px;padding:40px;margin:40px 0}
.contact a{color:var(--accent)}
footer{padding:30px 24px;color:var(--muted);font-size:.9rem;text-align:center}
</style>
</head>
<body>
<header class="nav" data-section="nav">
  <div class="logo">${i.logoUrl ? `<img src="${esc(i.logoUrl)}" alt="${esc(i.businessName)}" style="height:40px">` : esc(i.businessName)}</div>
  <a class="btn" href="${esc(waLink)}">${t.contact}</a>
</header>

<section class="hero wrap" data-section="hero">
  <h1>${esc(i.businessName)}</h1>
  <p class="lead">${esc(i.tagline)}</p>
  <div class="cta-row">
    <a class="btn" href="${esc(waLink)}">${t.whatsapp}</a>
    <a class="btn alt" href="${esc(phoneLink)}">${t.call}</a>
  </div>
</section>

<section class="section wrap" data-section="services">
  <h2>${t.services}</h2>
  <div class="cards">
    ${services.map((s) => `<div class="card"><h3>${esc(s)}</h3></div>`).join("")}
  </div>
</section>

${gallery.length ? `<section class="section wrap" data-section="gallery">
  <h2>${t.gallery}</h2>
  <div class="gallery">${gallery.map((u) => `<img src="${esc(u)}" alt="">`).join("")}</div>
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
    ${i.instagram ? `<p>Instagram: <a href="${esc(i.instagram)}">${esc(i.instagram)}</a></p>` : ""}
    ${i.facebook ? `<p>Facebook: <a href="${esc(i.facebook)}">${esc(i.facebook)}</a></p>` : ""}
  </div>
</section>

<footer>© ${new Date().getFullYear()} ${esc(i.businessName)} · Hecho con PymeWebPro</footer>
</body></html>`;
}

export const BLUEPRINTS = {
  "blueprint-1": renderBlueprint1,
};
