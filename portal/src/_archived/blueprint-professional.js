// blueprint-professional.js — parameterized landing template (blueprint-professional).
// Pure function; returns the full HTML string for a mockup.
// Variant aimed at professional services: lawyers, accountants, advisors, consultants,
// notarías, agencies, B2B services. Conservative, trust-forward, credentials-led.
// Light theme (warm white), classic serif headings (Cormorant Garamond) + Inter body.
// Plan-aware: Growth tier renders extra sections (FAQ, team, blog).
// Sections wrapped with data-section so the comment widget can anchor to them.

const FALLBACK = {
  businessName: "Su Firma",
  tagline: "Asesoría profesional para empresas que quieren crecer.",
  industry: "Servicios profesionales",
  services: ["Área de práctica uno", "Área de práctica dos", "Área de práctica tres"],
  primary: "#0F2A4F",
  accent: "#a07a3a",
  ink: "#1a1a2e",
  bg: "#fafaf7",
  muted: "#5a6378",
  line: "#e8e3d8",
  language: "es",
};

const T_ES = {
  contact: "Contáctenos",
  bookConsult: "Agendar consulta",
  bookConsultShort: "Agendar",
  callNow: "Llamar",
  whatsapp: "WhatsApp",
  learnMore: "Conocer más",
  // Sections
  areas: "Áreas de práctica",
  about: "Quiénes somos",
  team: "Nuestro equipo",
  cases: "Casos de éxito",
  approach: "Cómo trabajamos",
  faq: "Preguntas frecuentes",
  consult: "Solicite una consulta",
  // Trust labels
  trustExperience: "años de experiencia",
  trustClients: "clientes asesorados",
  trustConfidential: "Confidencialidad garantizada",
  trustBilingual: "Asesoría en español e inglés",
  trustRegistered: "Registrado ante la Cámara de Comercio",
  // Form copy
  formIntro: "Cuéntenos sobre su caso. Respondemos con discreción en menos de 24 horas hábiles.",
  formName: "Nombre completo",
  formEmail: "Correo electrónico",
  formPhone: "Teléfono",
  formType: "Tipo de consulta",
  formMessage: "Describa brevemente su consulta",
  formSend: "Enviar consulta",
  formThanks: "Gracias. Le contactaremos en menos de 24 horas hábiles.",
  formError: "No pudimos enviar su consulta. Por favor inténtelo de nuevo.",
  // Misc
  skipToContent: "Saltar al contenido",
  navOpen: "Abrir menú",
  navClose: "Cerrar menú",
  bioFallback: "Profesional con amplia trayectoria en el sector, comprometido con resultados rigurosos y discreción para cada cliente.",
  approachStep1: "Diagnóstico inicial",
  approachStep2: "Estrategia y plan",
  approachStep3: "Ejecución y seguimiento",
  // Footer
  confidentiality: "Confidencialidad y datos personales",
  manageCookies: "Configurar cookies",
  privacy: "Política de Privacidad",
  terms: "Términos",
  // Hero
  heroEyebrow: "Asesoría profesional",
};

const T_EN = {
  contact: "Contact us",
  bookConsult: "Book a consultation",
  bookConsultShort: "Book",
  callNow: "Call",
  whatsapp: "WhatsApp",
  learnMore: "Learn more",
  areas: "Areas of practice",
  about: "About us",
  team: "Our team",
  cases: "Case studies",
  approach: "How we work",
  faq: "Frequently asked questions",
  consult: "Request a consultation",
  trustExperience: "years of practice",
  trustClients: "clients advised",
  trustConfidential: "Strict confidentiality",
  trustBilingual: "Advice in English & Spanish",
  trustRegistered: "Registered with the Chamber of Commerce",
  formIntro: "Tell us about your matter. We respond with discretion within 24 business hours.",
  formName: "Full name",
  formEmail: "Email address",
  formPhone: "Phone",
  formType: "Type of consultation",
  formMessage: "Briefly describe your matter",
  formSend: "Send inquiry",
  formThanks: "Thank you. We will contact you within 24 business hours.",
  formError: "We could not send your inquiry. Please try again.",
  skipToContent: "Skip to content",
  navOpen: "Open menu",
  navClose: "Close menu",
  bioFallback: "Seasoned professional committed to rigorous outcomes and absolute discretion for every client.",
  approachStep1: "Initial assessment",
  approachStep2: "Strategy & plan",
  approachStep3: "Execution & follow-up",
  confidentiality: "Confidentiality and personal data",
  manageCookies: "Manage cookies",
  privacy: "Privacy Policy",
  terms: "Terms",
  heroEyebrow: "Professional advisory",
};

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isPro(plan) {
  const p = String(plan || "").toLowerCase();
  return p === "pro" || p === "crecimiento" || p === "growth";
}

function getInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "??";
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

// Roman numerals 1..12 (we never list more than ~12 areas of practice).
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function roman(n) {
  return ROMAN[n] || String(n);
}

// Pick a JSON-LD type based on industry signals. Defaults to ProfessionalService.
function pickProfessionalType(industry) {
  const s = String(industry || "").toLowerCase();
  if (/abogad|lawyer|attorney|law firm|jur[ií]dic/.test(s)) return "Attorney";
  if (/contabil|contad|accounting|accountant|auditor/.test(s)) return "AccountingService";
  if (/financ|wealth|tax|tribut|impuest/.test(s)) return "FinancialService";
  if (/notar/.test(s)) return "Notary";
  return "ProfessionalService";
}

// Simple portrait-style avatar (circular, monogram). Used when no founder photo.
function portraitSvg(initials, primary, accent) {
  const i2 = String(initials || "??").slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="220" height="220" role="img" aria-label="${i2}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${esc(primary)}"/>
        <stop offset="100%" stop-color="${esc(accent || primary)}"/>
      </linearGradient>
    </defs>
    <circle cx="120" cy="120" r="116" fill="url(#bg)"/>
    <circle cx="120" cy="120" r="116" fill="none" stroke="${esc(accent || "#a07a3a")}" stroke-width="2" opacity=".55"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-family="Cormorant Garamond,Playfair Display,Georgia,serif" font-weight="500" font-size="92" fill="#fafaf7" letter-spacing="2">${i2}</text>
  </svg>`;
}

// Compact testimonial monogram (case-study card).
function avatarMonogram(initials, color) {
  const i2 = String(initials || "??").slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="44" height="44" role="img" aria-label="${i2}"><circle cx="40" cy="40" r="40" fill="${esc(color || "#0F2A4F")}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-family="Cormorant Garamond,Georgia,serif" font-weight="500" font-size="32" fill="#fff">${i2}</text></svg>`;
}

export function renderBlueprintProfessional(input, opts) {
  const i = { ...FALLBACK, ...(input || {}) };
  const plan = (opts && opts.plan) || i.plan || "esencial";
  const pro = isPro(plan);
  const t = i.language === "en" ? T_EN : T_ES;
  const services = (i.services && i.services.length ? i.services : FALLBACK.services);
  const initials = getInitials(i.businessName);
  const accent = i.accent || "#a07a3a";

  // ─── CTAs ──────────────────────────────────────────────────────────────
  // Priority: 1) bookingsUrl primary, else jump to lead form
  //           2) phone (call) as secondary
  //           3) whatsapp tertiary (smaller)
  const bookingsUrl = (i.tech && i.tech.bookingsUrl) || i.bookingsUrl || "";
  const primaryCtaLabel = t.bookConsult;
  const primaryCtaHref = bookingsUrl || "#consulta";
  const phone = i.phone || "";
  const phoneHref = phone ? `tel:${String(phone).replace(/[^+\d]/g, "")}` : "";
  const whatsappRaw = i.whatsapp || phone || "";
  const whatsappDigits = String(whatsappRaw).replace(/[^\d]/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "";

  // Both plans
  const testimonials = i.testimonials || [];
  const ga4Id = i.ga4Id || "";
  const metaPixelId = i.metaPixelId || "";

  // Lead form endpoint
  const leadFormEndpoint = i.leadFormEndpoint || (i.clientId ? `/api/lead/${i.clientId}` : "");

  // Crecimiento extras
  const blogPosts = pro ? (i.blogPosts || []) : [];
  const teamMembers = pro ? (i.teamMembers || []) : [];
  const faqs = pro ? (i.faqs || []) : [];

  // ─── Trust / credentials strip ─────────────────────────────────────────
  // Pull from intake fields, fall back to generic professional copy.
  const yearsInPractice = i.yearsInPractice || (i.business && i.business.yearsInPractice) || i.yearsExperience || "";
  const clientsServed = i.clientsServed || i.clientCount || "";
  const certifications = Array.isArray(i.certifications) ? i.certifications.filter(Boolean) : [];
  const barAdmissions = Array.isArray(i.barAdmissions) ? i.barAdmissions.filter(Boolean) : [];
  const licenses = Array.isArray(i.licenses) ? i.licenses.filter(Boolean) : [];

  const trustItems = [];
  if (yearsInPractice) {
    trustItems.push({ kind: "stat", num: `+${esc(String(yearsInPractice))}`, label: t.trustExperience });
  } else {
    trustItems.push({ kind: "stat", num: "+15", label: t.trustExperience });
  }
  if (clientsServed) {
    trustItems.push({ kind: "stat", num: `+${esc(String(clientsServed))}`, label: t.trustClients });
  } else {
    trustItems.push({ kind: "text", label: t.trustRegistered });
  }
  trustItems.push({ kind: "text", label: t.trustBilingual });
  trustItems.push({ kind: "text", label: t.trustConfidential });

  // Credential chips — flat list of strings.
  const credentials = [
    ...certifications,
    ...barAdmissions,
    ...licenses,
  ];

  // ─── About / founder bio ───────────────────────────────────────────────
  const legalRep = (i.business && i.business.legalRepresentative) || i.legalRepresentative || "";
  const founderBio = i.founderBio || i.bio || "";
  const aboutBody = i.aboutBody || i.about || "";

  // ─── Approach / how-we-work ────────────────────────────────────────────
  // Try intake.content.topics or whatYouDo split. Fall back to generic 3-step.
  let approachSteps = [];
  if (Array.isArray(i.approachSteps) && i.approachSteps.length >= 3) {
    approachSteps = i.approachSteps.slice(0, 3);
  } else {
    const raw = (typeof i.topics === "string" && i.topics.trim())
      ? i.topics
      : (i.content && i.content.topics) || (i.business && i.business.whatYouDo) || "";
    if (raw) {
      const parts = String(raw).split(/[·\.\n;,]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 3) approachSteps = parts.slice(0, 3);
    }
    if (!approachSteps.length) {
      approachSteps = [t.approachStep1, t.approachStep2, t.approachStep3];
    }
  }

  // ─── Section nav — only include rows that will render ──────────────────
  const navItems = [];
  navItems.push({ href: "#areas", label: t.areas });
  navItems.push({ href: "#quienes-somos", label: t.about });
  if (testimonials.length) navItems.push({ href: "#casos", label: t.cases });
  navItems.push({ href: "#como-trabajamos", label: t.approach });
  if (pro && faqs.length) navItems.push({ href: "#faq", label: t.faq });
  navItems.push({ href: "#consulta", label: t.consult });

  // ─── JSON-LD ────────────────────────────────────────────────────────────
  const businessId = (i.canonicalUrl || "") + "#business";
  const ldType = pickProfessionalType(i.industry);
  const ldBusiness = {
    "@context": "https://schema.org",
    "@type": ldType,
    "@id": businessId || undefined,
    "name": i.businessName,
    "description": i.tagline,
    "url": i.canonicalUrl || undefined,
    "image": i.logoUrl || undefined,
    "telephone": phone || undefined,
    "email": i.email || undefined,
    "address": i.address ? { "@type": "PostalAddress", "streetAddress": i.address } : undefined,
    "openingHours": i.hours || undefined,
    "sameAs": [i.instagram, i.facebook, i.twitter, i.linkedin].filter(Boolean),
  };
  const jsonLdBlocks = [renderJsonLd(ldBusiness)];
  for (const s of services) {
    const name = typeof s === "string" ? s : (s.title || s.name || "");
    if (!name) continue;
    jsonLdBlocks.push(renderJsonLd({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": name,
      "provider": businessId ? { "@id": businessId } : { "@type": "Organization", "name": i.businessName },
    }));
  }
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

  const trackerConfigTag = (ga4Id || metaPixelId) ? `
<script id="pwp-tracker-config" type="application/json">${JSON.stringify({ ga4Id: ga4Id || null, metaPixelId: metaPixelId || null })}</script>` : "";

  // Optional consultation-type dropdown options.
  const consultTypes = Array.isArray(i.consultationTypes) && i.consultationTypes.length
    ? i.consultationTypes
    : (Array.isArray(services) && services.length
        ? services.map(s => typeof s === "string" ? s : (s.title || s.name || "")).filter(Boolean).slice(0, 8)
        : []);

  return `<!doctype html>
<html lang="${i.language}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(i.businessName)} · ${esc(i.tagline)}</title>
<meta name="description" content="${esc(i.tagline)}">
<meta name="theme-color" content="${esc(i.bg)}">
<meta property="og:title" content="${esc(i.businessName)}">
<meta property="og:description" content="${esc(i.tagline)}">
<meta property="og:type" content="website">
${i.canonicalUrl ? `<meta property="og:url" content="${esc(i.canonicalUrl)}"><link rel="canonical" href="${esc(i.canonicalUrl)}">` : ""}
${i.logoUrl ? `<meta property="og:image" content="${esc(i.logoUrl)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
${jsonLdBlocks.join("\n")}
${trackerConfigTag}
<style>
/* Color tokens — light, conservative palette. The five brand vars
   (--primary, --ink, --bg, --muted, --line) come from the wizard. */
:root{
  --primary:${i.primary};
  --accent:${accent};
  --ink:${i.ink};
  --bg:${i.bg};
  --muted:${i.muted || "#5a6378"};
  --line:${i.line || "#e8e3d8"};
  --surface:#ffffff;
  --surface-2:#f5f1e8;
  --shadow-sm:0 2px 8px rgba(15,42,79,.06);
  --shadow-md:0 10px 28px -12px rgba(15,42,79,.18);
  --shadow-lg:0 24px 60px -24px rgba(15,42,79,.28);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  background:var(--bg);color:var(--ink);
  font-size:16.5px;line-height:1.65;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:#fff;color:var(--ink);padding:8px 12px;border-radius:4px;z-index:9999;border:1px solid var(--line)}

/* Typography — Cormorant Garamond serif headings, Inter body, narrow-tracked Inter eyebrows. */
h1,h2,h3,h4{font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-weight:500;letter-spacing:-.005em;line-height:1.15;margin:0;color:var(--ink)}
h1{font-size:clamp(2.4rem,4.6vw,3.8rem);font-weight:500;letter-spacing:-.01em}
h2{font-size:clamp(1.85rem,3.2vw,2.55rem);font-weight:500}
h3{font-size:1.18rem;font-weight:600;font-family:'Inter',sans-serif;letter-spacing:-.005em}
.serif-h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.45rem;letter-spacing:0}
p{margin:0;color:var(--ink)}
.wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.muted{color:var(--muted)}

/* Eyebrow — uppercase narrow-tracked Inter. */
.eyebrow{
  display:inline-block;
  font-family:'Inter',sans-serif;
  font-size:.74rem;font-weight:600;
  letter-spacing:.16em;text-transform:uppercase;
  color:var(--accent);
  margin-bottom:18px;
}

/* Underline accent under section headers. */
.section-head{max-width:720px;margin-bottom:48px}
.section-head h2{margin-bottom:14px;position:relative;padding-bottom:18px}
.section-head h2::after{
  content:"";display:block;
  width:48px;height:2px;background:var(--accent);
  position:absolute;bottom:0;left:0;
}
.section-head.center{text-align:center;margin-left:auto;margin-right:auto}
.section-head.center h2::after{left:50%;transform:translateX(-50%)}
.section-head p{color:var(--muted);font-size:1.02rem;line-height:1.65;margin-top:14px}

/* Buttons */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 26px;border-radius:2px;
  font-family:'Inter',sans-serif;font-weight:600;font-size:.92rem;
  letter-spacing:.02em;
  background:var(--primary);color:#fff;border:1px solid var(--primary);cursor:pointer;text-decoration:none;
  transition:background .2s ease,transform .15s ease,box-shadow .2s ease;
}
.btn:hover{background:#0a1f3d;box-shadow:var(--shadow-sm);transform:translateY(-1px)}
.btn.secondary{background:transparent;color:var(--primary);border-color:var(--primary)}
.btn.secondary:hover{background:var(--primary);color:#fff}
.btn.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.btn.ghost:hover{background:var(--surface-2);color:var(--primary);border-color:var(--accent)}
.btn-lg{padding:15px 30px;font-size:.96rem}

/* Sticky nav — formal, light, thin border. */
.nav{
  position:sticky;top:0;z-index:50;
  backdrop-filter:saturate(180%) blur(10px);
  background:rgba(250,250,247,.92);
  border-bottom:1px solid var(--line);
}
.nav-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:68px;padding:10px 24px;max-width:1180px;margin:0 auto}
.nav .logo{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.3rem;letter-spacing:.005em;color:var(--primary);flex-shrink:0;display:inline-flex;align-items:center;gap:12px}
.nav .logo .logo-mark{width:34px;height:34px;border-radius:50%;background:var(--primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:.95rem;letter-spacing:.02em}
.nav-links{display:flex;align-items:center;gap:28px;flex:1;justify-content:center;font-family:'Inter',sans-serif;font-size:.88rem;font-weight:500;letter-spacing:.01em}
.nav-links a{color:var(--muted);text-decoration:none;position:relative;padding:6px 0;transition:color .2s ease}
.nav-links a:hover,.nav-links a[aria-current="page"]{color:var(--primary)}
.nav-links a[aria-current="page"]::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:1px;background:var(--accent)}
.nav-cta{display:flex;gap:10px;align-items:center;flex-shrink:0}
.nav-toggle{display:none;background:transparent;border:1px solid var(--line);width:42px;height:42px;border-radius:2px;cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:0}
.nav-toggle-bar{display:block;width:18px;height:2px;background:var(--ink);transition:transform .2s ease,opacity .2s ease}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(2){opacity:0}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.mobile-nav{display:none;flex-direction:column;gap:0;padding:8px 24px 18px;border-top:1px solid var(--line);background:rgba(250,250,247,.98);backdrop-filter:saturate(180%) blur(10px)}
.mobile-nav.open{display:flex}
.mobile-nav a{padding:14px 4px;color:var(--ink);font-family:'Inter',sans-serif;font-weight:500;font-size:1rem;text-decoration:none;border-bottom:1px solid var(--line)}
.mobile-nav a:last-child{border-bottom:0}
@media(max-width:880px){.nav-links{display:none}.nav-toggle{display:inline-flex}}
section[id]{scroll-margin-top:84px}

/* Hero — split layout: serif headline left, portrait right. Quiet pattern in the bg. */
.hero{position:relative;padding:88px 0 72px;overflow:hidden}
.hero::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(${esc(i.line || "#e8e3d8")} 1px,transparent 1px),
    linear-gradient(90deg,${esc(i.line || "#e8e3d8")} 1px,transparent 1px);
  background-size:48px 48px;
  background-position:-1px -1px;
  opacity:.35;
  mask-image:radial-gradient(ellipse 80% 60% at 50% 30%,#000 30%,transparent 75%);
  -webkit-mask-image:radial-gradient(ellipse 80% 60% at 50% 30%,#000 30%,transparent 75%);
}
.hero-grid{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center}
.hero-text{max-width:620px}
.hero-eyebrow{display:inline-block;font-family:'Inter',sans-serif;font-size:.74rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:22px}
.hero-eyebrow::before{content:"";display:inline-block;width:24px;height:1px;background:var(--accent);vertical-align:middle;margin-right:12px;transform:translateY(-2px)}
.hero h1{margin-bottom:0}
.hero-sub{font-size:1.1rem;color:var(--muted);margin-top:22px;max-width:540px;line-height:1.65;font-family:'Inter',sans-serif}
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px;align-items:center}
.hero-ctas .btn-tertiary{
  font-size:.85rem;color:var(--muted);text-decoration:none;
  padding:8px 14px;border:0;background:transparent;
  font-family:'Inter',sans-serif;font-weight:500;
  display:inline-flex;align-items:center;gap:6px;
  transition:color .2s ease;
}
.hero-ctas .btn-tertiary:hover{color:var(--primary)}
.hero-art{position:relative;display:flex;align-items:center;justify-content:center}
.hero-portrait-frame{
  position:relative;width:280px;height:280px;border-radius:50%;
  background:var(--surface);
  box-shadow:var(--shadow-md);
  overflow:hidden;
  border:1px solid var(--line);
}
.hero-portrait-frame::before{
  content:"";position:absolute;inset:-12px;border-radius:50%;
  border:1px solid var(--accent);opacity:.45;pointer-events:none;
}
.hero-portrait-frame img,.hero-portrait-frame svg{width:100%;height:100%;display:block;object-fit:cover}
@media(max-width:960px){.hero{padding:60px 0 50px}.hero-grid{grid-template-columns:1fr;gap:42px}.hero-art{justify-content:flex-start}.hero-portrait-frame{width:220px;height:220px}}

/* Trust / credentials strip */
.trust{
  display:grid;grid-template-columns:repeat(4,1fr);gap:0;
  padding:0;
  border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  background:var(--surface);
}
.trust-item{
  padding:26px 22px;
  display:flex;flex-direction:column;gap:6px;
  text-align:left;
  border-right:1px solid var(--line);
}
.trust-item:last-child{border-right:0}
.trust-num{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:2rem;color:var(--primary);letter-spacing:-.005em;line-height:1.05}
.trust-text-only{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.15rem;color:var(--primary);line-height:1.25}
.trust-label{font-family:'Inter',sans-serif;font-size:.78rem;font-weight:500;color:var(--muted);letter-spacing:.04em}
@media(max-width:880px){.trust{grid-template-columns:repeat(2,1fr)}.trust-item:nth-child(2){border-right:0}.trust-item:nth-child(1),.trust-item:nth-child(2){border-bottom:1px solid var(--line)}}
@media(max-width:520px){.trust{grid-template-columns:1fr}.trust-item{border-right:0;border-bottom:1px solid var(--line)}.trust-item:last-child{border-bottom:0}}

/* Credential chips */
.credentials{display:flex;flex-wrap:wrap;gap:10px;padding:24px 0 0}
.credential-chip{
  display:inline-flex;align-items:center;gap:8px;
  padding:8px 14px;border:1px solid var(--line);border-radius:2px;
  background:var(--surface);
  font-family:'Inter',sans-serif;font-size:.82rem;color:var(--ink);font-weight:500;letter-spacing:.005em;
}
.credential-chip::before{
  content:"";display:inline-block;width:6px;height:6px;border-radius:50%;
  background:var(--accent);
}

/* Section rhythm */
.section{padding:96px 0;position:relative}
.section.alt{background:var(--surface)}
@media(max-width:600px){.section{padding:64px 0}}

/* Areas of practice — numbered list with roman numerals, 3-col grid. */
.areas-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:48px 36px}
.area{display:flex;flex-direction:column;gap:10px;padding-top:18px;border-top:1px solid var(--line)}
.area-num{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-weight:500;font-size:1.1rem;
  color:var(--accent);letter-spacing:.06em;
}
.area h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.4rem;letter-spacing:0;color:var(--ink);margin:0;line-height:1.2}
.area p{color:var(--muted);font-size:.94rem;line-height:1.6;font-family:'Inter',sans-serif}
@media(max-width:880px){.areas-grid{grid-template-columns:repeat(2,1fr);gap:36px 28px}}
@media(max-width:560px){.areas-grid{grid-template-columns:1fr;gap:28px}}

/* About / Quiénes somos — large prose block, optional bio image */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:flex-start}
.about-prose{font-family:'Inter',sans-serif;font-size:1.04rem;line-height:1.75;color:var(--ink)}
.about-prose p+p{margin-top:18px}
.about-prose .lede{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.45rem;font-weight:500;color:var(--primary);line-height:1.4;margin-bottom:22px}
.about-rep{
  background:var(--surface);
  border:1px solid var(--line);
  padding:32px 28px;
  display:flex;flex-direction:column;gap:14px;
  box-shadow:var(--shadow-sm);
}
.about-rep .rep-title{font-family:'Inter',sans-serif;font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.about-rep .rep-name{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.55rem;color:var(--ink);line-height:1.2}
.about-rep .rep-role{font-family:'Inter',sans-serif;font-size:.92rem;color:var(--muted)}
.about-rep .rep-bio{font-family:'Inter',sans-serif;font-size:.95rem;line-height:1.65;color:var(--ink)}
@media(max-width:880px){.about-grid{grid-template-columns:1fr;gap:36px}}

/* Team grid (Crecimiento) */
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:32px}
.team-member{display:flex;flex-direction:column;gap:10px;text-align:left}
.team-photo{width:120px;height:120px;border-radius:50%;background:var(--surface-2);overflow:hidden;border:1px solid var(--line)}
.team-photo img,.team-photo svg{width:100%;height:100%;object-fit:cover}
.team-name{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.25rem;color:var(--ink);margin-top:6px;line-height:1.2}
.team-role{font-family:'Inter',sans-serif;font-size:.86rem;color:var(--muted)}
@media(max-width:760px){.team-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.team-grid{grid-template-columns:1fr}}

/* Case studies */
.cases-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}
.case{
  background:var(--surface);
  border:1px solid var(--line);
  border-top:3px solid var(--accent);
  padding:28px 26px;
  display:flex;flex-direction:column;gap:16px;
  box-shadow:var(--shadow-sm);
  transition:transform .2s ease,box-shadow .2s ease;
}
.case:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
.case-meta{display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.case-avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;overflow:hidden}
.case-name{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.18rem;color:var(--ink);line-height:1.2}
.case-role{font-family:'Inter',sans-serif;font-size:.8rem;color:var(--muted);margin-top:2px}
.case-quote{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:1.08rem;line-height:1.55;color:var(--ink);margin:0;padding:0;border:0}
.case-quote::before{content:"\\201C";color:var(--accent);font-size:1.4rem;line-height:1;margin-right:2px;font-style:normal;font-weight:600}
.case-quote::after{content:"\\201D";color:var(--accent);font-size:1.4rem;line-height:1;margin-left:2px;font-style:normal;font-weight:600}
.case-outcome{
  font-family:'Inter',sans-serif;font-size:.86rem;color:var(--primary);font-weight:600;
  padding-top:12px;border-top:1px solid var(--line);
  letter-spacing:.005em;
}

/* Approach / how-we-work — roman-numeral steps */
.approach-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;position:relative}
.approach-step{padding:28px 26px;background:var(--surface);border:1px solid var(--line);position:relative}
.approach-step::before{
  content:"";position:absolute;top:0;left:0;width:40px;height:2px;background:var(--accent);
}
.approach-num{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:2.2rem;color:var(--accent);letter-spacing:.04em;line-height:1;margin-bottom:14px;display:block}
.approach-step h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.35rem;color:var(--ink);margin:0 0 8px;line-height:1.2}
.approach-step p{font-family:'Inter',sans-serif;font-size:.94rem;color:var(--muted);line-height:1.6}
@media(max-width:760px){.approach-steps{grid-template-columns:1fr;gap:18px}}

/* FAQ accordion (Crecimiento) */
.faq-list{display:flex;flex-direction:column;gap:0;max-width:780px}
.faq-list details{
  background:transparent;
  border-bottom:1px solid var(--line);
  padding:20px 0;
  transition:border-color .2s ease;
}
.faq-list details:first-child{border-top:1px solid var(--line)}
.faq-list summary{cursor:pointer;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.18rem;list-style:none;color:var(--ink);display:flex;justify-content:space-between;align-items:center;gap:12px}
.faq-list summary::-webkit-details-marker{display:none}
.faq-list summary::after{content:"+";color:var(--accent);font-weight:400;font-size:1.5rem;line-height:1;transition:transform .2s ease;font-family:'Inter',sans-serif}
.faq-list details[open] summary::after{content:"\\2013"}
.faq-list p{margin:14px 0 0;color:var(--muted);line-height:1.65;font-size:.96rem;font-family:'Inter',sans-serif}

/* Lead form / Solicite una consulta */
.lead-form-card{
  max-width:720px;margin:0 auto;
  background:var(--surface);
  border:1px solid var(--line);
  border-top:3px solid var(--accent);
  padding:48px 44px;
  box-shadow:var(--shadow-md);
}
.lead-form-card h2{margin-bottom:8px}
.lead-form-card .lead-intro{color:var(--muted);margin-bottom:28px;font-family:'Inter',sans-serif;font-size:.98rem;line-height:1.65}
.lead-form-card form{display:grid;gap:14px}
.lead-form-card .field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:560px){.lead-form-card{padding:32px 24px}.lead-form-card .field-row{grid-template-columns:1fr}}
.lead-form-card label.field-label{font-family:'Inter',sans-serif;font-size:.78rem;font-weight:600;color:var(--ink);letter-spacing:.04em;text-transform:uppercase;margin-bottom:-6px}
.lead-form-card input[type=text],
.lead-form-card input[type=email],
.lead-form-card input[type=tel],
.lead-form-card select,
.lead-form-card textarea{
  padding:13px 14px;
  background:var(--bg);
  border:1px solid var(--line);
  border-radius:2px;
  font-family:'Inter',sans-serif;font-size:.96rem;color:var(--ink);
  transition:border-color .2s ease,box-shadow .2s ease;
}
.lead-form-card input::placeholder,.lead-form-card textarea::placeholder{color:var(--muted);opacity:.7}
.lead-form-card input:focus,.lead-form-card select:focus,.lead-form-card textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(15,42,79,.1)}
.lead-form-card textarea{resize:vertical;min-height:120px}
.lead-form-card button[type=submit]{width:100%;justify-content:center;margin-top:8px}
.consent-row{display:flex;align-items:flex-start;gap:10px;font-family:'Inter',sans-serif;font-size:.82rem;color:var(--muted);line-height:1.5;cursor:pointer}
.consent-row a{color:var(--primary);text-decoration:underline}

/* Footer — formal, elegant */
footer.site-footer{
  border-top:1px solid var(--line);
  padding:48px 24px 28px;
  color:var(--muted);font-size:.86rem;
  background:var(--surface);
}
.footer-inner{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:36px;align-items:flex-start}
.footer-col h4{font-family:'Inter',sans-serif;font-size:.76rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);margin:0 0 14px}
.footer-col p,.footer-col a{font-family:'Inter',sans-serif;font-size:.88rem;line-height:1.65;color:var(--muted);text-decoration:none;display:block}
.footer-col a:hover{color:var(--primary)}
.footer-brand .brand-name{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.4rem;color:var(--primary);margin-bottom:10px;line-height:1.2}
.footer-bottom{max-width:1140px;margin:36px auto 0;padding-top:20px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:center;font-size:.82rem}
.footer-bottom a{color:var(--muted);text-decoration:none;margin-right:14px}
.footer-bottom a:hover{color:var(--primary)}
@media(max-width:760px){.footer-inner{grid-template-columns:1fr;gap:28px}}

/* Floating CTA — formal pill, brand color, no animation */
.cta-float{
  position:fixed;bottom:24px;right:24px;z-index:60;
  background:var(--primary);color:#fff;
  padding:13px 24px;border-radius:2px;
  font-family:'Inter',sans-serif;font-weight:600;font-size:.9rem;
  letter-spacing:.02em;
  box-shadow:var(--shadow-md);
  text-decoration:none;
  transition:background .2s ease,transform .15s ease,box-shadow .2s ease;
  border:1px solid var(--primary);
}
.cta-float:hover{background:#0a1f3d;transform:translateY(-1px);box-shadow:var(--shadow-lg)}
@media(max-width:560px){.cta-float{bottom:16px;right:16px;padding:11px 20px;font-size:.86rem}}
@media print{.cta-float{display:none}}

/* Cookie consent banner */
#pwp-consent{
  position:fixed;left:16px;right:16px;bottom:16px;
  max-width:560px;margin:0 auto;
  background:var(--surface);border:1px solid var(--line);
  border-radius:4px;
  box-shadow:var(--shadow-lg);
  padding:18px 20px;
  font-family:'Inter',sans-serif;display:none;z-index:9998;color:var(--ink);
}
#pwp-consent p{font-size:.9rem;color:var(--ink);margin:0 0 10px}
#pwp-consent a{color:var(--primary);text-decoration:underline}
#pwp-consent .consent-btns{display:flex;gap:8px;flex-wrap:wrap}
#pwp-consent button{font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer;padding:10px 18px;border-radius:2px}
#pwp-consent .accept-btn{background:var(--primary);color:#fff;border:1px solid var(--primary)}
#pwp-consent .reject-btn{background:transparent;color:var(--ink);border:1px solid var(--line)}
</style>
${i.adminCss ? `<style data-admin-overrides>\n${i.adminCss}\n</style>` : ""}
</head>
<body>
<a class="skip" href="#main">${esc(t.skipToContent)}</a>

<header class="nav" data-section="nav">
  <div class="nav-inner">
    <a class="logo" href="#main" aria-label="${esc(i.businessName)}">
      ${i.logoUrl
        ? `<img src="${esc(i.logoUrl)}" alt="${esc(i.businessName)}" style="height:36px;width:auto" width="160" height="36" decoding="async">`
        : `<span class="logo-mark" aria-hidden="true">${esc(initials)}</span><span>${esc(i.businessName)}</span>`}
    </a>
    <nav class="nav-links" aria-label="${i.language === "en" ? "Sections" : "Secciones"}">
      ${navItems.map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("")}
    </nav>
    <div class="nav-cta">
      ${i.bilingualAltHref ? `<a href="${esc(i.bilingualAltHref)}" style="color:var(--muted);font-weight:500;font-size:.86rem;text-decoration:none;letter-spacing:.02em">${i.language === "en" ? "Español" : "English"}</a>` : ""}
      <a class="btn" href="${esc(primaryCtaHref)}" rel="noopener">${esc(primaryCtaLabel)}</a>
      <button id="pwp-nav-toggle" class="nav-toggle" type="button" aria-label="${esc(t.navOpen)}" aria-expanded="false" aria-controls="pwp-mobile-nav">
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
      </button>
    </div>
  </div>
  <div class="mobile-nav" id="pwp-mobile-nav" hidden>
    ${navItems.map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("")}
  </div>
</header>

<main id="main">
<section class="hero" data-section="hero">
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-text">
        <p class="hero-eyebrow">${esc(i.industry || t.heroEyebrow)}</p>
        <h1>${esc(i.tagline || i.businessName)}</h1>
        <p class="hero-sub">${esc(i.heroSub || ((i.business && i.business.whatYouDo) || ""))}</p>
        <div class="hero-ctas">
          <a class="btn btn-lg" href="${esc(primaryCtaHref)}" rel="noopener">${esc(primaryCtaLabel)}</a>
          ${phoneHref ? `<a class="btn btn-lg secondary" href="${esc(phoneHref)}">${esc(t.callNow)}${phone ? ` · ${esc(phone)}` : ""}</a>` : `<a class="btn btn-lg secondary" href="#quienes-somos">${esc(t.learnMore)}</a>`}
          ${whatsappHref ? `<a class="btn-tertiary" href="${esc(whatsappHref)}" rel="noopener" target="_blank">${esc(t.whatsapp)}</a>` : ""}
        </div>
      </div>
      <div class="hero-art">
        <div class="hero-portrait-frame" aria-hidden="true">
          ${i.founderPhotoUrl
            ? `<img src="${esc(i.founderPhotoUrl)}" alt="${esc(legalRep || i.businessName)}" loading="eager" decoding="async" width="280" height="280">`
            : portraitSvg(initials, i.primary, accent)}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="wrap" data-section="trust" aria-label="${i.language === "en" ? "Credentials" : "Credenciales"}">
  <div class="trust">
    ${trustItems.map(it => {
      if (it.kind === "stat") {
        return `<div class="trust-item">
          <div class="trust-num">${it.num}</div>
          <div class="trust-label">${esc(it.label)}</div>
        </div>`;
      }
      return `<div class="trust-item">
        <div class="trust-text-only">${esc(it.label)}</div>
      </div>`;
    }).join("")}
  </div>
  ${credentials.length ? `<div class="credentials">
    ${credentials.map(c => `<span class="credential-chip">${esc(c)}</span>`).join("")}
  </div>` : ""}
</section>

<section class="section" data-section="areas" id="areas">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.areas)}</p>
      <h2>${esc(t.areas)}</h2>
      <p>${esc((i.business && i.business.whatYouDo) || i.tagline)}</p>
    </div>
    <div class="areas-grid">
      ${services.slice(0, 12).map((s, idx) => {
        const title = typeof s === "string" ? s : (s.title || s.name || "");
        const body = typeof s === "string" ? "" : (s.body || s.description || "");
        return `<article class="area">
          <span class="area-num">${roman(idx + 1)}</span>
          <h3>${esc(title)}</h3>
          ${body ? `<p>${esc(body)}</p>` : ""}
        </article>`;
      }).join("")}
    </div>
  </div>
</section>

<section class="section alt" data-section="quienes-somos" id="quienes-somos">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.about)}</p>
      <h2>${esc(t.about)}</h2>
    </div>
    <div class="about-grid">
      <div class="about-prose">
        ${aboutBody
          ? `<p class="lede">${esc(aboutBody.split(/\n+/)[0] || "")}</p>${aboutBody.split(/\n+/).slice(1).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("")}`
          : `<p class="lede">${esc(i.tagline)}</p><p>${esc((i.business && i.business.whatYouDo) || t.bioFallback)}</p>`}
      </div>
      ${legalRep ? `<aside class="about-rep">
        <p class="rep-title">${i.language === "en" ? "Managing partner" : "Representante legal"}</p>
        <p class="rep-name">${esc(legalRep)}</p>
        ${i.legalRepRole ? `<p class="rep-role">${esc(i.legalRepRole)}</p>` : ""}
        <p class="rep-bio">${esc(founderBio || t.bioFallback)}</p>
      </aside>` : (founderBio ? `<aside class="about-rep">
        <p class="rep-title">${i.language === "en" ? "Founder" : "Fundador(a)"}</p>
        <p class="rep-name">${esc(i.businessName)}</p>
        <p class="rep-bio">${esc(founderBio)}</p>
      </aside>` : "")}
    </div>
    ${pro && teamMembers.length ? `<div class="team-grid">
      ${teamMembers.map(m => {
        const tInitials = getInitials(m.name);
        const photo = m.photoUrl
          ? `<img src="${esc(m.photoUrl)}" alt="${esc(m.name || "")}" loading="lazy" decoding="async" width="120" height="120">`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="${esc(tInitials)}"><circle cx="40" cy="40" r="40" fill="${esc(i.primary)}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-family="Cormorant Garamond,Georgia,serif" font-weight="500" font-size="32" fill="#fff">${esc(tInitials)}</text></svg>`;
        return `<div class="team-member">
          <div class="team-photo">${photo}</div>
          <div class="team-name">${esc(m.name || "")}</div>
          ${m.role ? `<div class="team-role">${esc(m.role)}</div>` : ""}
        </div>`;
      }).join("")}
    </div>` : ""}
  </div>
</section>

${testimonials.length ? `<section class="section" data-section="casos" id="casos">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.cases)}</p>
      <h2>${esc(t.cases)}</h2>
    </div>
    <div class="cases-grid">
      ${testimonials.map(tm => {
        const tmInitials = getInitials(tm.name);
        const avatar = tm.avatarUrl
          ? `<img src="${esc(tm.avatarUrl)}" alt="${esc(tm.name || "")}" loading="lazy" decoding="async" width="44" height="44">`
          : avatarMonogram(tmInitials, i.primary);
        return `<article class="case">
          <div class="case-meta">
            <div class="case-avatar">${avatar}</div>
            <div>
              <div class="case-name">${esc(tm.name || "")}</div>
              ${tm.role ? `<div class="case-role">${esc(tm.role)}${tm.company ? ` · ${esc(tm.company)}` : ""}</div>` : (tm.company ? `<div class="case-role">${esc(tm.company)}</div>` : "")}
            </div>
          </div>
          ${tm.quote ? `<blockquote class="case-quote">${esc(tm.quote)}</blockquote>` : ""}
          ${tm.outcome ? `<div class="case-outcome">${esc(tm.outcome)}</div>` : (tm.quote && /\d/.test(tm.quote) ? "" : "")}
        </article>`;
      }).join("")}
    </div>
  </div>
</section>` : ""}

<section class="section alt" data-section="como-trabajamos" id="como-trabajamos">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.approach)}</p>
      <h2>${esc(t.approach)}</h2>
    </div>
    <div class="approach-steps">
      ${approachSteps.map((step, idx) => `
        <div class="approach-step">
          <span class="approach-num">${roman(idx + 1)}</span>
          <h3>${esc(step)}</h3>
        </div>`).join("")}
    </div>
  </div>
</section>

${pro && faqs.length ? `<section class="section" data-section="faq" id="faq">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.faq)}</p>
      <h2>${esc(t.faq)}</h2>
    </div>
    <div class="faq-list">
      ${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
    </div>
  </div>
</section>` : ""}

${leadFormEndpoint ? `<section class="section alt" data-section="lead-form" id="consulta">
  <div class="wrap">
    <div class="lead-form-card">
      <p class="eyebrow">${esc(t.consult)}</p>
      <h2>${esc(t.consult)}</h2>
      <p class="lead-intro">${esc(t.formIntro)}</p>
      <form id="pwp-lead-form">
        <div class="field-row">
          <input type="text" name="name" required placeholder="${esc(t.formName)}" aria-label="${esc(t.formName)}">
          <input type="email" name="email" required placeholder="${esc(t.formEmail)}" aria-label="${esc(t.formEmail)}">
        </div>
        <input type="tel" name="phone" placeholder="${esc(t.formPhone)}" aria-label="${esc(t.formPhone)}">
        ${consultTypes.length ? `<select name="consultation_type" aria-label="${esc(t.formType)}">
          <option value="">${esc(t.formType)}</option>
          ${consultTypes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
        </select>` : ""}
        <textarea name="message" required rows="5" placeholder="${esc(t.formMessage)}" aria-label="${esc(t.formMessage)}"></textarea>
        <input type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
        <label class="consent-row">
          <input type="checkbox" name="habeas_data_accepted" required style="margin-top:3px;flex-shrink:0">
          <span>${i.language === "en"
            ? `I authorize <strong>${esc(i.businessName)}</strong> to process my data to respond to my inquiry. <a href="./privacy.html">Privacy Policy</a> (Colombian Law 1581 of 2012).`
            : `Autorizo a <strong>${esc(i.businessName)}</strong> a tratar mis datos para responder mi consulta. <a href="./politica-privacidad.html">Política de Privacidad</a> (Ley 1581 de 2012).`}</span>
        </label>
        <button class="btn btn-lg" type="submit">${esc(t.formSend)}</button>
      </form>
      <p id="pwp-lead-msg" role="status" style="margin:14px 0 0;color:var(--muted);font-family:'Inter',sans-serif;font-size:.9rem;display:none"></p>
    </div>
  </div>
  <script>
  (function(){
    var f=document.getElementById('pwp-lead-form');var m=document.getElementById('pwp-lead-msg');
    if(!f)return;
    f.addEventListener('submit', async function(e){
      e.preventDefault();
      var fd=new FormData(f);
      var consent=f.elements['habeas_data_accepted'].checked;
      if(!consent){m.textContent=${JSON.stringify(i.language === "en" ? "Please accept the Privacy Policy to send." : "Por favor acepte la Política de Privacidad para enviar.")};m.style.display='block';m.style.color='#a04040';return;}
      f.querySelector('button[type=submit]').disabled=true;
      try{
        var r=await fetch(${JSON.stringify(leadFormEndpoint)},{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
          name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),message:fd.get('message'),
          consultation_type:fd.get('consultation_type')||null,
          habeas_data_accepted:true, company_url:fd.get('company_url'), source:location.href
        })});
        var j=await r.json();
        if(j.ok){m.textContent=${JSON.stringify(t.formThanks)};m.style.display='block';m.style.color='var(--muted)';f.reset();}
        else{m.textContent=(j.error||${JSON.stringify(t.formError)});m.style.display='block';m.style.color='#a04040';}
      }catch(_){m.textContent=${JSON.stringify(t.formError)};m.style.display='block';m.style.color='#a04040';}
      finally{f.querySelector('button[type=submit]').disabled=false;}
    });
  })();
  </script>
</section>` : ""}
</main>

<a class="cta-float" href="${esc(primaryCtaHref)}" aria-label="${esc(t.bookConsult)}">${esc(t.bookConsult)}</a>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-col footer-brand">
      <div class="brand-name">${esc(i.businessName)}</div>
      ${i.tagline ? `<p>${esc(i.tagline)}</p>` : ""}
      ${i.nit ? `<p style="margin-top:10px">NIT ${esc(i.nit)}</p>` : ""}
      ${i.camara ? `<p>${esc(i.camara)}</p>` : ""}
    </div>
    <div class="footer-col">
      <h4>${i.language === "en" ? "Contact" : "Contacto"}</h4>
      ${phone ? `<a href="${esc(phoneHref)}">${esc(phone)}</a>` : ""}
      ${i.email ? `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>` : ""}
      ${i.address ? `<p>${esc(i.address)}</p>` : ""}
      ${i.hours ? `<p style="margin-top:8px">${esc(i.hours)}</p>` : ""}
    </div>
    <div class="footer-col">
      <h4>${i.language === "en" ? "Connect" : "Síganos"}</h4>
      ${i.linkedin ? `<a href="${esc(i.linkedin)}" rel="noopener" target="_blank">LinkedIn</a>` : ""}
      ${i.facebook ? `<a href="${esc(i.facebook)}" rel="noopener" target="_blank">Facebook</a>` : ""}
      ${i.instagram ? `<a href="${esc(i.instagram)}" rel="noopener" target="_blank">Instagram</a>` : ""}
      ${i.twitter ? `<a href="${esc(i.twitter)}" rel="noopener" target="_blank">X / Twitter</a>` : ""}
    </div>
  </div>
  <div class="footer-bottom">
    <div>© ${new Date().getFullYear()} ${esc(i.businessName)}</div>
    <div>
      ${i.language === "en"
        ? `<a href="./privacy.html">${esc(t.confidentiality)}</a><a href="./privacy.html">${esc(t.privacy)}</a><a href="./terms.html">${esc(t.terms)}</a>`
        : `<a href="./politica-privacidad.html">${esc(t.confidentiality)}</a><a href="./politica-privacidad.html">${esc(t.privacy)}</a><a href="./terminos.html">${esc(t.terms)}</a>`}
      <a href="#" onclick="pwpManageConsent();return false">${esc(t.manageCookies)}</a>
    </div>
  </div>
</footer>

<!-- Cookie consent banner (Ley 1581) — gates GA4 + Meta Pixel until accept -->
<div id="pwp-consent">
  <p>
    ${i.language === "en"
      ? `We use <strong>analytics & marketing cookies</strong> (Google Analytics, Meta Pixel) to improve your experience. You can accept, reject, or read our <a href="./privacy.html">Privacy Policy</a>.`
      : `Usamos <strong>cookies de analítica y marketing</strong> (Google Analytics, Meta Pixel) para mejorar su experiencia. Puede aceptar, rechazar, o leer nuestra <a href="./politica-privacidad.html">Política de Privacidad</a>.`}
  </p>
  <div class="consent-btns">
    <button class="accept-btn" onclick="pwpConsent('accept')">${i.language === "en" ? "Accept" : "Aceptar"}</button>
    <button class="reject-btn" onclick="pwpConsent('reject')">${i.language === "en" ? "Reject" : "Rechazar"}</button>
  </div>
</div>
<script>
(function(){
  var KEY='pwp_consent';
  var stored = localStorage.getItem(KEY);
  if (!stored) { document.getElementById('pwp-consent').style.display='block'; }
  else if (stored === 'accept') { pwpLoadTrackers(); }
})();
function pwpConsent(v){
  localStorage.setItem('pwp_consent', v);
  document.getElementById('pwp-consent').style.display='none';
  if (v === 'accept') pwpLoadTrackers();
}
function pwpManageConsent(){
  localStorage.removeItem('pwp_consent');
  document.getElementById('pwp-consent').style.display='block';
}
function pwpLoadTrackers(){
  var cfgEl = document.getElementById('pwp-tracker-config');
  if (!cfgEl) return;
  var cfg; try { cfg = JSON.parse(cfgEl.textContent); } catch(e){ return; }
  if (cfg.ga4Id) {
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4Id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', cfg.ga4Id, { 'anonymize_ip': true });
  }
  if (cfg.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.metaPixelId);
    fbq('track', 'PageView');
  }
}
</script>

<!-- Section nav: mobile drawer toggle + IntersectionObserver active-link sync. -->
<script>
(function(){
  var btn = document.getElementById('pwp-nav-toggle');
  var drawer = document.getElementById('pwp-mobile-nav');
  var openLabel = ${JSON.stringify(t.navOpen)};
  var closeLabel = ${JSON.stringify(t.navClose)};
  function setOpen(open){
    if (!btn || !drawer) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? closeLabel : openLabel);
    if (open) { drawer.removeAttribute('hidden'); drawer.classList.add('open'); }
    else { drawer.classList.remove('open'); drawer.setAttribute('hidden',''); }
  }
  if (btn && drawer) {
    btn.addEventListener('click', function(){ setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    drawer.addEventListener('click', function(e){ if (e.target.tagName === 'A') setOpen(false); });
  }
  if (!('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a, .mobile-nav a'));
  if (!links.length) return;
  var sections = links
    .map(function(a){ var h = a.getAttribute('href'); return h && h.charAt(0) === '#' ? document.getElementById(h.slice(1)) : null; })
    .filter(Boolean);
  var seen = {};
  sections = sections.filter(function(s){ if (seen[s.id]) return false; seen[s.id] = 1; return true; });
  function setCurrent(id){
    links.forEach(function(a){
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  var visible = {};
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
    var bestId = null, bestRatio = 0;
    Object.keys(visible).forEach(function(id){
      if (visible[id] > bestRatio) { bestRatio = visible[id]; bestId = id; }
    });
    if (bestId) setCurrent(bestId);
  }, { rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
  sections.forEach(function(s){ io.observe(s); });
})();
</script>
</body></html>`;
}

function renderJsonLd(obj) {
  const clean = JSON.parse(JSON.stringify(obj));
  return `<script type="application/ld+json">${JSON.stringify(clean)}</script>`;
}
