// blueprint-saas.js — parameterized landing template (blueprint-saas).
// Pure function; returns the full HTML string for a mockup.
// Variant aimed at SaaS / B2B tech / professional-services clients.
// Dark theme, Inter sans-serif, left-aligned hero, feature grid, demo CTAs.
// Plan-aware: Growth tier renders extra sections.
// Sections wrapped with data-section so the comment widget can anchor to them.

const FALLBACK = {
  businessName: "Your Product",
  tagline: "The fastest way to ship.",
  industry: "Software",
  services: ["Feature one", "Feature two", "Feature three"],
  primary: "#7c5cff",
  accent: "#22d3ee",
  ink: "#f5f5f7",
  bg: "#0a0e1a",
  muted: "#9ca3af",
  line: "#1f2937",
  language: "es",
};

const T_ES = {
  contact: "Contáctanos",
  tryDemo: "Probar demo",
  bookDemo: "Reserva una demo",
  login: "Iniciar sesión",
  features: "Características",
  viewFeatures: "Ver características",
  pricing: "Precios",
  testimonials: "Lo que dicen nuestros clientes",
  faq: "Preguntas frecuentes",
  howItWorks: "Cómo funciona",
  contactSection: "Contacto",
  // Trust labels
  trustUsers: "usuarios activos",
  trustUptime: "uptime garantizado",
  trustSupport: "soporte en español",
  trustSecurity: "SOC 2 ready",
  // Form
  formTitle: "Reserva una demo",
  formIntro: "Cuéntanos sobre tu equipo y te mostramos cómo encaja.",
  formName: "Tu nombre",
  formEmail: "Email de trabajo",
  formPhone: "Teléfono (opcional)",
  formMessage: "¿Qué problema estás resolviendo?",
  formSend: "Solicitar demo",
  formThanks: "Gracias — te contactamos en menos de 24 horas.",
  formError: "No pudimos enviar el mensaje. Inténtalo de nuevo.",
  // Nav
  navFeatures: "Características",
  navHow: "Cómo funciona",
  navPricing: "Precios",
  navTestimonials: "Testimonios",
  navFaq: "FAQ",
  navContact: "Contacto",
  navOpen: "Abrir menú",
  navClose: "Cerrar menú",
  // Pricing fallback
  pricingFallbackTitle: "Listo para empezar",
  pricingFallbackBody: "Reserva una demo de 20 minutos y mostramos cómo encaja con tu equipo.",
  // Pricing card
  perMonth: "/ mes",
  // How-it-works fallback
  howStep1: "Conecta tus datos",
  howStep2: "Configura tu equipo",
  howStep3: "Empieza a generar",
  // Misc
  skipToContent: "Saltar al contenido",
};

const T_EN = {
  contact: "Contact us",
  tryDemo: "Try the demo",
  bookDemo: "Book a demo",
  login: "Sign in",
  features: "Features",
  viewFeatures: "See features",
  pricing: "Pricing",
  testimonials: "What our customers say",
  faq: "Frequently asked questions",
  howItWorks: "How it works",
  contactSection: "Contact",
  trustUsers: "active users",
  trustUptime: "uptime guarantee",
  trustSupport: "Spanish-speaking support",
  trustSecurity: "SOC 2 ready",
  formTitle: "Book a demo",
  formIntro: "Tell us about your team and we'll show you how it fits.",
  formName: "Your name",
  formEmail: "Work email",
  formPhone: "Phone (optional)",
  formMessage: "What problem are you solving?",
  formSend: "Request demo",
  formThanks: "Thanks — we'll be in touch within 24 hours.",
  formError: "Could not send the message. Please try again.",
  navFeatures: "Features",
  navHow: "How it works",
  navPricing: "Pricing",
  navTestimonials: "Testimonials",
  navFaq: "FAQ",
  navContact: "Contact",
  navOpen: "Open menu",
  navClose: "Close menu",
  pricingFallbackTitle: "Ready to get started?",
  pricingFallbackBody: "Book a 20-minute demo and we'll show you how it fits your team.",
  perMonth: "/ mo",
  howStep1: "Connect your data",
  howStep2: "Configure your team",
  howStep3: "Start shipping",
  skipToContent: "Skip to content",
};

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isPro(plan) {
  return String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
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

// Deterministic-but-varied integer hash for picking icons per feature.
function hashStr(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Fixed icon set — small SVG path data, currentColor. Pick by hash modulo length.
const FEATURE_ICONS = [
  // zap / lightning
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  // sparkle
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5 10.1 11.9 4.5 10l5.6-1.4L12 3z"/></svg>',
  // shield
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
  // chart / bar
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  // clock
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline></svg>',
  // check / circle
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>',
];

function pickIcon(seed) {
  return FEATURE_ICONS[hashStr(seed) % FEATURE_ICONS.length];
}

// Avatar initials placeholder for testimonials (small circular SVG).
function avatarSvg(initials, color) {
  const i2 = String(initials || "??").slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="48" height="48" role="img" aria-label="${i2}"><circle cx="40" cy="40" r="40" fill="${esc(color || "#7c5cff")}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Inter,system-ui,sans-serif" font-weight="700" font-size="32" fill="#fff">${i2}</text></svg>`;
}

// Browser-window chrome wrapper (Mac-style traffic lights).
function browserFrame(innerHtml) {
  return `<div class="browser-frame" aria-hidden="true">
    <div class="browser-bar">
      <span class="browser-dot" style="background:#ff5f56"></span>
      <span class="browser-dot" style="background:#ffbd2e"></span>
      <span class="browser-dot" style="background:#27c93f"></span>
    </div>
    <div class="browser-body">${innerHtml}</div>
  </div>`;
}

export function renderBlueprintSaas(input, opts) {
  const i = { ...FALLBACK, ...(input || {}) };
  const plan = (opts && opts.plan) || i.plan || "esencial";
  const pro = isPro(plan);
  const t = i.language === "en" ? T_EN : T_ES;
  const services = (i.services && i.services.length ? i.services : FALLBACK.services);
  const initials = getInitials(i.businessName);

  // CTAs — primary "Probar demo" (or login if loginUrl set), secondary "Ver características"
  const loginUrl = (i.tech && i.tech.loginUrl) || i.loginUrl || "";
  const demoUrl = i.demoUrl || "#contacto";
  const primaryCtaLabel = loginUrl ? t.login : t.tryDemo;
  const primaryCtaHref = loginUrl || demoUrl;
  const secondaryCtaLabel = t.viewFeatures;
  const secondaryCtaHref = "#features";

  // Both plans
  const testimonials = i.testimonials || [];
  const ga4Id = i.ga4Id || "";
  const metaPixelId = i.metaPixelId || "";

  // Crecimiento extras
  const blogPosts = pro ? (i.blogPosts || []) : [];
  const teamMembers = pro ? (i.teamMembers || []) : [];
  const faqs = pro ? (i.faqs || []) : [];

  // Pricing — only render when intake includes a pricing object
  const pricing = i.pricing && (i.pricing.price || i.pricing.title) ? i.pricing : null;

  // How-it-works derivation. Try intake.content.topics or whatYouDo split.
  // If we get fewer than 3 distinct steps we fall back to generic copy.
  let howSteps = [];
  if (Array.isArray(i.howSteps) && i.howSteps.length >= 3) {
    howSteps = i.howSteps.slice(0, 3);
  } else if (typeof i.topics === "string" && i.topics.trim()) {
    const parts = i.topics.split(/[·\.\n;,]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) howSteps = parts.slice(0, 3);
  }

  // Lead form endpoint — preserved from blueprint-1
  const leadFormEndpoint = i.leadFormEndpoint || (i.clientId ? `/api/lead/${i.clientId}` : "");

  // Trust signals — SaaS-flavored, derived where possible.
  const trustItems = [];
  if (i.stats && i.stats.users) {
    trustItems.push({ num: String(i.stats.users), label: t.trustUsers });
  } else if (i.clientCount) {
    trustItems.push({ num: `+${i.clientCount}`, label: t.trustUsers });
  } else {
    trustItems.push({ num: "+10K", label: t.trustUsers });
  }
  trustItems.push({ num: i.uptime || "99.9%", label: t.trustUptime });
  trustItems.push({ num: "ES/EN", label: t.trustSupport });
  trustItems.push({ num: "SOC 2", label: t.trustSecurity });

  // Section nav — only include rows that will render.
  const navItems = [];
  navItems.push({ href: "#features", label: t.navFeatures });
  if (howSteps.length === 3) navItems.push({ href: "#how-it-works", label: t.navHow });
  if (pricing) navItems.push({ href: "#pricing", label: t.navPricing });
  if (testimonials.length) navItems.push({ href: "#testimonials", label: t.navTestimonials });
  if (pro && faqs.length) navItems.push({ href: "#faq", label: t.navFaq });
  navItems.push({ href: "#contacto", label: t.navContact });

  // Hero product visual — image if uploaded, else feature-list mock.
  const heroImage = (i.galleryUrls && i.galleryUrls[0]) ? i.galleryUrls[0] : "";
  const heroImageAlt = (i.galleryAlts && i.galleryAlts[0]) ? i.galleryAlts[0] : i.businessName;
  const heroProductBody = heroImage
    ? `<img src="${esc(heroImage)}" alt="${esc(heroImageAlt)}" loading="eager" decoding="async" width="900" height="560" style="width:100%;height:auto;display:block">`
    : `<div class="hero-mock-list">
        ${services.slice(0, 4).map((s) => {
          const title = typeof s === "string" ? s : (s.title || s.name || "");
          return `<div class="hero-mock-row">
            <span class="hero-mock-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12 10 17 19 7"></polyline></svg>
            </span>
            <span class="hero-mock-text">${esc(title)}</span>
          </div>`;
        }).join("")}
      </div>`;

  // ─── JSON-LD ─────────────────────────────────────────────────────────────
  const businessId = (i.canonicalUrl || "") + "#business";
  // SoftwareApplication schema — variant default since we're targeting SaaS.
  const ldSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": businessId || undefined,
    "name": i.businessName,
    "description": i.tagline,
    "url": i.canonicalUrl || undefined,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "image": i.logoUrl || undefined,
    "offers": pricing && pricing.price ? {
      "@type": "Offer",
      "price": String(pricing.price).replace(/[^\d.]/g, "") || undefined,
      "priceCurrency": pricing.currency || "USD",
    } : undefined,
    "sameAs": [i.instagram, i.facebook, i.twitter, i.linkedin].filter(Boolean),
  };
  const jsonLdBlocks = [renderJsonLd(ldSoftware)];
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

  // Tracking config — gated behind cookie consent (preserved).
  const trackerConfigTag = (ga4Id || metaPixelId) ? `
<script id="pwp-tracker-config" type="application/json">${JSON.stringify({ ga4Id: ga4Id || null, metaPixelId: metaPixelId || null })}</script>` : "";

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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
${jsonLdBlocks.join("\n")}
${trackerConfigTag}
<style>
/* Color tokens. The five brand vars (--primary, --ink, --bg, --muted, --line)
   come from the wizard. In the SaaS variant --bg is dark, --ink is near-white. */
:root{
  --primary:${i.primary};
  --accent:${i.accent || "#22d3ee"};
  --ink:${i.ink};
  --bg:${i.bg};
  --muted:${i.muted || "#9ca3af"};
  --line:${i.line || "#1f2937"};
  --surface:#0f1628;
  --surface-2:#141d33;
  --shadow-sm:0 4px 16px rgba(0,0,0,.25);
  --shadow-md:0 14px 30px -10px rgba(0,0,0,.45);
  --shadow-lg:0 30px 80px -30px rgba(0,0,0,.55);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-feature-settings:"ss01","cv11";
  background:var(--bg);color:var(--ink);
  font-size:17px;line-height:1.6;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:#fff;color:#000;padding:8px 12px;border-radius:6px;z-index:9999}

/* Typography — Inter sans, tight tracking, heavy weight on headings. */
h1,h2,h3,h4{font-family:'Inter',system-ui,sans-serif;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin:0;color:var(--ink)}
h1{font-size:clamp(2.5rem,5vw,4rem);font-weight:700;letter-spacing:-.025em}
h2{font-size:clamp(1.9rem,3.4vw,2.6rem);font-weight:700}
h3{font-size:1.15rem;font-weight:600;letter-spacing:-.01em}
p{margin:0;color:var(--ink)}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.muted{color:var(--muted)}

/* Buttons */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:12px 22px;border-radius:10px;
  font-family:inherit;font-weight:600;font-size:.96rem;letter-spacing:-.005em;
  background:var(--primary);color:#fff;border:0;cursor:pointer;text-decoration:none;
  transition:transform .15s ease,box-shadow .2s ease,background .2s ease,opacity .2s ease;
}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -10px rgba(124,92,255,.55);opacity:.95}
.btn.secondary{background:transparent;color:var(--ink);border:1px solid var(--line)}
.btn.secondary:hover{background:var(--surface);border-color:rgba(255,255,255,.18)}
.btn.ghost{background:transparent;color:var(--ink);border:0;padding:12px 12px}
.btn.ghost:hover{color:var(--primary);background:transparent;transform:none;box-shadow:none}
.btn-lg{padding:14px 26px;font-size:1rem}

/* Nav */
.nav{
  position:sticky;top:0;z-index:50;
  backdrop-filter:saturate(180%) blur(12px);
  background:rgba(10,14,26,.72);
  border-bottom:1px solid var(--line);
}
.nav-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:64px;padding:10px 24px;max-width:1240px;margin:0 auto}
.nav .logo{font-family:'Inter',sans-serif;font-weight:700;font-size:1.1rem;letter-spacing:-.02em;color:var(--ink);flex-shrink:0;display:inline-flex;align-items:center;gap:10px}
.nav .logo .logo-mark{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,var(--primary),var(--accent));display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.78rem}
.nav-links{display:flex;align-items:center;gap:26px;flex:1;justify-content:center;font-family:'Inter',sans-serif;font-size:.92rem;font-weight:500}
.nav-links a{color:var(--muted);text-decoration:none;position:relative;padding:6px 0;transition:color .2s ease}
.nav-links a:hover,.nav-links a[aria-current="page"]{color:var(--ink)}
.nav-cta{display:flex;gap:10px;align-items:center;flex-shrink:0}
.nav-toggle{display:none;background:transparent;border:1px solid var(--line);width:40px;height:40px;border-radius:8px;cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:0}
.nav-toggle-bar{display:block;width:18px;height:2px;background:var(--ink);transition:transform .2s ease,opacity .2s ease}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(2){opacity:0}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.mobile-nav{display:none;flex-direction:column;gap:0;padding:8px 24px 16px;border-top:1px solid var(--line);background:rgba(10,14,26,.96);backdrop-filter:saturate(180%) blur(12px)}
.mobile-nav.open{display:flex}
.mobile-nav a{padding:14px 4px;color:var(--ink);font-family:'Inter',sans-serif;font-weight:500;font-size:1rem;text-decoration:none;border-bottom:1px solid var(--line)}
.mobile-nav a:last-child{border-bottom:0}
@media(max-width:880px){.nav-links{display:none}.nav-toggle{display:inline-flex}}
section[id]{scroll-margin-top:80px}

/* Hero — left-aligned, two columns, product visual on the right. */
.hero{position:relative;padding:90px 0 80px;overflow:hidden}
.hero::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(60% 50% at 88% 8%, rgba(124,92,255,.18), transparent 70%),
    radial-gradient(50% 50% at 5% 92%, rgba(34,211,238,.10), transparent 70%);
}
/* Hero background image — TWO independent layers so overlay opacity isn't
   eaten by the image's low opacity */
.hero-bg-img{position:absolute;inset:0;background-image:var(--hero-bg-url);background-size:cover;background-position:center;background-repeat:no-repeat;opacity:.07;mix-blend-mode:luminosity;pointer-events:none;z-index:0;filter:saturate(.5) blur(.5px)}
.hero-bg-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,14,26,.78) 0%,rgba(10,14,26,.96) 100%);pointer-events:none;z-index:1}
.hero-grid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1.05fr;gap:64px;align-items:center}
.hero-text{max-width:600px}
.hero-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.78rem;font-weight:600;letter-spacing:.04em;
  color:var(--muted);margin-bottom:20px;
  padding:6px 12px;border:1px solid var(--line);border-radius:999px;
  background:rgba(255,255,255,.02);
}
.hero-eyebrow::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 4px rgba(124,92,255,.18)}
.hero h1{margin-bottom:0}
.hero-sub{font-size:1.12rem;color:var(--muted);margin-top:20px;max-width:540px;line-height:1.6}
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}
.hero-art{position:relative}
.browser-frame{
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:14px;
  overflow:hidden;
  box-shadow:var(--shadow-lg);
  transform:rotate(-1.2deg) translateY(-4px);
  transition:transform .4s ease;
}
.browser-frame:hover{transform:rotate(0deg) translateY(-8px)}
.browser-bar{
  display:flex;align-items:center;gap:6px;
  padding:10px 14px;
  background:var(--surface-2);
  border-bottom:1px solid var(--line);
}
.browser-dot{width:11px;height:11px;border-radius:50%;display:inline-block}
.browser-body{padding:24px;min-height:280px}
.hero-mock-list{display:flex;flex-direction:column;gap:14px}
.hero-mock-row{
  display:flex;align-items:center;gap:14px;
  padding:14px 16px;
  background:rgba(255,255,255,.03);
  border:1px solid var(--line);
  border-radius:10px;
}
.hero-mock-check{
  display:inline-flex;align-items:center;justify-content:center;
  width:26px;height:26px;border-radius:50%;
  background:rgba(124,92,255,.15);color:var(--primary);
  flex-shrink:0;
}
.hero-mock-text{font-size:.96rem;color:var(--ink);font-weight:500}
@media(max-width:960px){.hero{padding:60px 0 50px}.hero-grid{grid-template-columns:1fr;gap:50px}.browser-frame{transform:none}}

/* Videos section — placed directly under hero for explainer-led pages */
.videos-section{padding:70px 0 30px}
.videos-section .section-head{margin-bottom:36px}
.videos-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.video-card{
  background:var(--surface);border:1px solid var(--line);border-radius:14px;
  overflow:hidden;transition:transform .25s,border-color .25s,box-shadow .25s;
  display:flex;flex-direction:column;
}
.video-card:hover{transform:translateY(-3px);border-color:rgba(124,92,255,.4);box-shadow:0 12px 28px rgba(0,0,0,.35)}
.video-frame{position:relative;width:100%;aspect-ratio:16/9;background:#0f1628;overflow:hidden}
.video-frame iframe{width:100%;height:100%;border:0;display:block}
.video-placeholder{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  background:linear-gradient(135deg,rgba(124,92,255,.10),rgba(34,211,238,.06));
}
.video-placeholder-icon{
  width:54px;height:54px;border-radius:50%;
  background:rgba(124,92,255,.18);color:var(--primary);
  display:inline-flex;align-items:center;justify-content:center;
  border:1px solid rgba(124,92,255,.3);
}
.video-placeholder-pill{
  font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;
  padding:4px 10px;border-radius:999px;
  background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--muted);
}
.video-meta{padding:18px 20px}
.video-title{font-size:1.05rem;font-weight:600;color:var(--ink);margin:0 0 6px;letter-spacing:-.01em}
.video-desc{font-size:.88rem;color:var(--muted);margin:0;line-height:1.55}
.video-num{
  position:absolute;top:14px;left:14px;z-index:2;
  font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;
  padding:4px 10px;border-radius:999px;
  background:rgba(0,0,0,.55);color:#fff;backdrop-filter:blur(8px);
}
@media(max-width:960px){.videos-grid{grid-template-columns:1fr;gap:18px}.videos-section{padding:50px 0 20px}}

/* External photos strip — "in the wild" / "in schools" supporting imagery */
.photos-strip{padding:60px 0 40px}
.photos-strip .section-head{margin-bottom:32px}
.photos-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.photo-tile{position:relative;aspect-ratio:4/3;border-radius:12px;overflow:hidden;background:#0f1628;border:1px solid var(--line);transition:transform .25s,box-shadow .25s}
.photo-tile:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,.35)}
.photo-tile img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}
.photo-tile:hover img{transform:scale(1.04)}
.photo-tile-caption{
  position:absolute;left:12px;right:12px;bottom:12px;
  font-size:.78rem;font-weight:600;color:#fff;
  padding:6px 10px;border-radius:6px;
  background:rgba(10,14,26,.72);backdrop-filter:blur(6px);
}
@media(max-width:960px){.photos-grid{grid-template-columns:1fr 1fr;gap:12px}.photos-strip{padding:40px 0 20px}}
@media(max-width:520px){.photos-grid{grid-template-columns:1fr}}

/* Trust row */
.trust{
  display:grid;grid-template-columns:repeat(4,1fr);gap:24px;
  padding:30px 0;
  border-top:1px solid var(--line);border-bottom:1px solid var(--line);
}
.trust-item{display:flex;flex-direction:column;gap:4px;text-align:left}
.trust-num{font-family:'Inter',sans-serif;font-weight:700;font-size:1.5rem;color:var(--ink);letter-spacing:-.015em;line-height:1.1}
.trust-label{font-size:.78rem;font-weight:500;color:var(--muted)}
@media(max-width:760px){.trust{grid-template-columns:repeat(2,1fr);gap:18px;padding:24px 0}.trust-num{font-size:1.2rem}}

/* Section rhythm */
.section{padding:90px 0;position:relative}
.section-head{max-width:680px;margin-bottom:48px}
.section-head h2{margin-bottom:14px}
.section-head p{color:var(--muted);font-size:1.05rem;line-height:1.6}
@media(max-width:600px){.section{padding:60px 0}}

/* Feature grid (replaces SMB services). */
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.feature{
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:14px;
  padding:28px 24px;
  display:flex;flex-direction:column;gap:12px;
  transition:transform .2s ease,border-color .2s ease,background .2s ease;
}
.feature:hover{transform:translateY(-2px);border-color:rgba(124,92,255,.4);background:var(--surface-2)}
.feature-icon{
  width:40px;height:40px;border-radius:10px;
  background:rgba(124,92,255,.12);color:var(--primary);
  display:inline-flex;align-items:center;justify-content:center;
}
.feature-icon svg{width:22px;height:22px}
.feature h3{margin:0}
.feature p{color:var(--muted);font-size:.95rem;line-height:1.55}
@media(max-width:880px){.features{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.features{grid-template-columns:1fr}}

/* How it works — 3 numbered steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;position:relative}
.step{padding:24px 0}
.step-num{
  font-family:'Inter',sans-serif;font-weight:700;font-size:.85rem;
  color:var(--primary);letter-spacing:.02em;
  margin-bottom:12px;
}
.step h3{margin-bottom:6px}
.step p{color:var(--muted);font-size:.96rem;line-height:1.55}
@media(max-width:760px){.steps{grid-template-columns:1fr;gap:16px}}

/* Pricing card */
.pricing-card{
  max-width:420px;margin:0 auto;
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:18px;
  padding:36px 32px;
  display:flex;flex-direction:column;gap:18px;
  box-shadow:var(--shadow-md);
}
.pricing-tier{font-size:.85rem;font-weight:600;color:var(--primary);letter-spacing:.02em}
.pricing-price{display:flex;align-items:baseline;gap:6px;font-family:'Inter',sans-serif}
.pricing-price .amount{font-size:3rem;font-weight:700;letter-spacing:-.025em;color:var(--ink)}
.pricing-price .period{font-size:1rem;color:var(--muted)}
.pricing-features{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
.pricing-features li{display:flex;align-items:flex-start;gap:10px;font-size:.95rem;color:var(--ink)}
.pricing-features svg{flex-shrink:0;color:var(--primary);margin-top:3px}
.pricing-card .btn{width:100%}

/* Pricing fallback CTA card */
.cta-card{
  max-width:760px;margin:0 auto;
  background:linear-gradient(135deg,var(--surface) 0%,var(--surface-2) 100%);
  border:1px solid var(--line);
  border-radius:18px;
  padding:48px 40px;
  text-align:center;
  display:flex;flex-direction:column;gap:16px;align-items:center;
}
.cta-card h2{margin:0}
.cta-card p{color:var(--muted);max-width:520px}

/* Testimonials */
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.testimonial{
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:14px;
  padding:24px 22px;
  display:flex;flex-direction:column;gap:14px;
}
.testimonial blockquote{
  margin:0;padding:0;
  font-size:.98rem;line-height:1.55;color:var(--ink);
  font-style:normal;font-weight:400;
}
.testimonial blockquote::before{content:"\\201C";color:var(--primary);font-weight:700;margin-right:2px}
.testimonial blockquote::after{content:"\\201D";color:var(--primary);font-weight:700;margin-left:2px}
.testimonial-meta{display:flex;align-items:center;gap:12px;padding-top:12px;border-top:1px solid var(--line)}
.testimonial-avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;overflow:hidden}
.testimonial-avatar svg{width:100%;height:100%;display:block}
.testimonial-name{font-size:.9rem;font-weight:600;color:var(--ink);line-height:1.2}
.testimonial-role{font-size:.78rem;color:var(--muted);margin-top:2px}

/* FAQ accordion */
.faq-list{display:flex;flex-direction:column;gap:10px;max-width:760px}
.faq-list details{
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:10px;
  padding:16px 20px;
  transition:border-color .2s ease;
}
.faq-list details[open]{border-color:rgba(124,92,255,.4)}
.faq-list summary{cursor:pointer;font-weight:600;font-size:1rem;list-style:none;color:var(--ink);display:flex;justify-content:space-between;align-items:center;gap:12px}
.faq-list summary::-webkit-details-marker{display:none}
.faq-list summary::after{content:"+";color:var(--muted);font-weight:400;font-size:1.4rem;line-height:1;transition:transform .2s ease}
.faq-list details[open] summary::after{content:"\\2013"}
.faq-list p{margin:12px 0 0;color:var(--muted);line-height:1.6;font-size:.96rem}

/* Lead form — single column on dark surface */
.lead-form-card{
  max-width:680px;margin:0 auto;
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:18px;
  padding:40px 36px;
  box-shadow:var(--shadow-md);
}
.lead-form-card h2{margin-bottom:8px}
.lead-form-card .lead-intro{color:var(--muted);margin-bottom:24px}
.lead-form-card form{display:grid;gap:12px}
.lead-form-card input[type=text],
.lead-form-card input[type=email],
.lead-form-card input[type=tel],
.lead-form-card textarea{
  padding:12px 14px;
  background:var(--bg);
  border:1px solid var(--line);
  border-radius:8px;
  font:inherit;font-size:.96rem;color:var(--ink);
  transition:border-color .2s ease,box-shadow .2s ease;
}
.lead-form-card input::placeholder,.lead-form-card textarea::placeholder{color:var(--muted);opacity:.7}
.lead-form-card input:focus,.lead-form-card textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(124,92,255,.18)}
.lead-form-card textarea{resize:vertical;min-height:110px}
.lead-form-card button[type=submit]{width:100%;justify-content:center}
.consent-row{display:flex;align-items:flex-start;gap:8px;font-size:.82rem;color:var(--muted);line-height:1.45;cursor:pointer}
.consent-row a{color:var(--primary);text-decoration:underline}

/* Footer */
footer.site-footer{
  border-top:1px solid var(--line);
  padding:28px 24px;
  color:var(--muted);font-size:.86rem;
  background:var(--bg);
}
.footer-inner{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
.footer-inner a{color:var(--muted);text-decoration:none}
.footer-inner a:hover{color:var(--ink)}

/* Floating CTA — discrete pill, brand color */
.cta-float{
  position:fixed;bottom:20px;right:20px;z-index:60;
  background:var(--primary);color:#fff;
  padding:12px 22px;border-radius:999px;
  font-family:'Inter',sans-serif;font-weight:600;font-size:.92rem;
  box-shadow:0 14px 30px -8px rgba(124,92,255,.55);
  text-decoration:none;
  transition:transform .2s ease,box-shadow .2s ease;
}
.cta-float:hover{transform:translateY(-2px);box-shadow:0 18px 36px -10px rgba(124,92,255,.7)}
@media(max-width:560px){.cta-float{bottom:14px;right:14px;padding:10px 18px;font-size:.88rem}}
@media print{.cta-float{display:none}}
</style>
${i.headlineColor || i.headlineStroke ? `<style data-headline-accent>\n.hero h1{${i.headlineColor ? `color:${esc(i.headlineColor)};` : ""}${i.headlineStroke ? `-webkit-text-stroke:1.5px ${esc(i.headlineStroke)};text-stroke:1.5px ${esc(i.headlineStroke)};paint-order:stroke fill;` : ""}}\n</style>` : ""}
${i.adminCss ? `<style data-admin-overrides>\n${i.adminCss}\n</style>` : ""}
</head>
<body>
<a class="skip" href="#main">${t.skipToContent}</a>

<header class="nav" data-section="nav">
  <div class="nav-inner">
    <a class="logo" href="#main" aria-label="${esc(i.businessName)}">
      ${i.logoUrl
        ? `<img src="${esc(i.logoUrl)}" alt="${esc(i.businessName)}" style="height:32px;width:auto" width="160" height="32" decoding="async">`
        : `<span class="logo-mark" aria-hidden="true">${esc(initials)}</span><span>${esc(i.businessName)}</span>`}
    </a>
    <nav class="nav-links" aria-label="${i.language === "en" ? "Sections" : "Secciones"}">
      ${navItems.map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("")}
    </nav>
    <div class="nav-cta">
      ${i.bilingualAltHref ? `<a href="${esc(i.bilingualAltHref)}" style="color:var(--muted);font-weight:500;font-size:.9rem;text-decoration:none">${i.language === "en" ? "Español" : "English"}</a>` : ""}
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
<section class="hero" data-section="hero"${i.heroBgUrl ? ` style="--hero-bg-url:url('${esc(i.heroBgUrl)}')"` : ""}>
  ${i.heroBgUrl ? `<div class="hero-bg-img" aria-hidden="true"></div><div class="hero-bg-overlay" aria-hidden="true"></div>` : ""}
  <div class="wrap">
    <div class="hero-grid">
      <div class="hero-text">
        <p class="hero-eyebrow">${esc(i.industry || t.features)}</p>
        <h1>${esc(i.businessName)}</h1>
        <p class="hero-sub">${esc(i.tagline)}</p>
        <div class="hero-ctas">
          <a class="btn btn-lg" href="${esc(primaryCtaHref)}" rel="noopener">${esc(primaryCtaLabel)}</a>
          <a class="btn btn-lg secondary" href="${esc(secondaryCtaHref)}">${esc(secondaryCtaLabel)}</a>
        </div>
      </div>
      <div class="hero-art">
        ${browserFrame(heroProductBody)}
      </div>
    </div>
  </div>
</section>

${(() => {
  // Videos section — renders 3 cards directly under hero. Each card either
  // embeds a YouTube video (privacy-enhanced no-cookie domain) or shows a
  // placeholder with a "Próximamente" pill so the layout is always visible.
  const videos = Array.isArray(i.videos) ? i.videos.slice(0, 3) : [];
  const defaultTitles = i.language === "en"
    ? [
        { title: "What it is", desc: "A 60-second overview of the product." },
        { title: "Why it matters", desc: "The benefits in plain language." },
        { title: "How it works", desc: "A walkthrough of the core flow." },
      ]
    : [
        { title: "Qué es", desc: "Una vista general del producto en 60 segundos." },
        { title: "Por qué importa", desc: "Los beneficios en lenguaje simple." },
        { title: "Cómo funciona", desc: "Un recorrido del flujo principal." },
      ];
  // Always render 3 cards; missing ones become placeholders.
  const slots = [0, 1, 2].map((idx) => {
    const v = videos[idx] || {};
    return {
      title: v.title || defaultTitles[idx].title,
      desc: v.desc || v.description || defaultTitles[idx].desc,
      url: v.url || "",
    };
  });
  // Convert a YouTube URL (any flavour) to an embed URL on the no-cookie domain.
  const ytEmbed = (url) => {
    if (!url) return "";
    const m1 = String(url).match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    const m2 = String(url).match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/);
    const m3 = String(url).match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
    const id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || "";
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : "";
  };
  return `<section class="section videos-section" data-section="videos" id="videos">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow-rule">${i.language === "en" ? "Watch & Learn" : "Mire y aprenda"}</p>
      <h2>${i.language === "en" ? "See it in action" : "Vea el producto en acción"}</h2>
    </div>
    <div class="videos-grid">
      ${slots.map((s, idx) => {
        const embed = ytEmbed(s.url);
        return `<article class="video-card">
          <div class="video-frame">
            <span class="video-num">${String(idx + 1).padStart(2, "0")}</span>
            ${embed
              ? `<iframe src="${esc(embed)}" title="${esc(s.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
              : `<div class="video-placeholder">
                  <div class="video-placeholder-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                  <span class="video-placeholder-pill">${i.language === "en" ? "Coming soon" : "Próximamente"}</span>
                </div>`
            }
          </div>
          <div class="video-meta">
            <h3 class="video-title">${esc(s.title)}</h3>
            <p class="video-desc">${esc(s.desc)}</p>
          </div>
        </article>`;
      }).join("")}
    </div>
  </div>
</section>`;
})()}

${(Array.isArray(i.externalGallery) && i.externalGallery.length > 0) ? `<section class="section photos-strip" data-section="photos" id="photos">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow-rule">${i.language === "en" ? "In the field" : "En la práctica"}</p>
      <h2>${i.language === "en" ? "Built for the people who run schools" : "Hecho para quienes hacen funcionar la escuela"}</h2>
    </div>
    <div class="photos-grid">
      ${i.externalGallery.slice(0, 6).map(p => `<div class="photo-tile">
        <img src="${esc(p.url)}" alt="${esc(p.caption || (i.language === "en" ? "Education in action" : "Educación en acción"))}" loading="lazy" decoding="async" width="800" height="600">
        ${p.caption ? `<div class="photo-tile-caption">${esc(p.caption)}</div>` : ""}
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<section class="wrap" data-section="trust" aria-label="${i.language === "en" ? "Trust signals" : "Sellos de confianza"}">
  <div class="trust">
    ${trustItems.map(it => `
      <div class="trust-item">
        <div class="trust-num">${esc(it.num)}</div>
        <div class="trust-label">${esc(it.label)}</div>
      </div>`).join("")}
  </div>
</section>

<section class="section" data-section="features" id="features">
  <div class="wrap">
    <div class="section-head">
      <h2>${esc(t.features)}</h2>
      <p>${esc(i.tagline)}</p>
    </div>
    <div class="features">
      ${services.map((s) => {
        const title = typeof s === "string" ? s : (s.title || s.name || "");
        const body = typeof s === "string" ? "" : (s.body || s.description || "");
        return `<article class="feature">
          <div class="feature-icon">${pickIcon(title)}</div>
          <h3>${esc(title)}</h3>
          ${body ? `<p>${esc(body)}</p>` : `<p>${esc(t.features)}.</p>`}
        </article>`;
      }).join("")}
    </div>
  </div>
</section>

${howSteps.length === 3 ? `<section class="section" data-section="how-it-works" id="how-it-works">
  <div class="wrap">
    <div class="section-head">
      <h2>${esc(t.howItWorks)}</h2>
    </div>
    <div class="steps">
      ${howSteps.map((step, idx) => `
        <div class="step">
          <div class="step-num">0${idx + 1}</div>
          <h3>${esc(step)}</h3>
        </div>`).join("")}
    </div>
  </div>
</section>` : ""}

${pricing ? `<section class="section" data-section="pricing" id="pricing">
  <div class="wrap">
    <div class="section-head" style="text-align:center;margin-left:auto;margin-right:auto">
      <h2>${esc(t.pricing)}</h2>
      ${pricing.subtitle ? `<p>${esc(pricing.subtitle)}</p>` : ""}
    </div>
    <div class="pricing-card">
      ${pricing.title ? `<div class="pricing-tier">${esc(pricing.title)}</div>` : ""}
      <div class="pricing-price">
        <span class="amount">${esc(pricing.price || "")}</span>
        <span class="period">${esc(pricing.period || t.perMonth)}</span>
      </div>
      ${Array.isArray(pricing.features) && pricing.features.length ? `<ul class="pricing-features">
        ${pricing.features.map(f => `<li>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 7"></polyline></svg>
          <span>${esc(f)}</span>
        </li>`).join("")}
      </ul>` : ""}
      <a class="btn btn-lg" href="#contacto">${esc(t.bookDemo)}</a>
    </div>
  </div>
</section>` : `<section class="section" data-section="cta" id="cta-banner">
  <div class="wrap">
    <div class="cta-card">
      <h2>${esc(t.pricingFallbackTitle)}</h2>
      <p>${esc(t.pricingFallbackBody)}</p>
      <a class="btn btn-lg" href="#contacto">${esc(t.bookDemo)}</a>
    </div>
  </div>
</section>`}

${testimonials.length ? `<section class="section" data-section="testimonials" id="testimonials">
  <div class="wrap">
    <div class="section-head">
      <h2>${esc(t.testimonials)}</h2>
    </div>
    <div class="testimonials-grid">
      ${testimonials.map(tm => {
        const tmInitials = getInitials(tm.name);
        const avatar = tm.avatarUrl
          ? `<img src="${esc(tm.avatarUrl)}" alt="${esc(tm.name || "")}" loading="lazy" decoding="async" width="48" height="48">`
          : avatarSvg(tmInitials, i.primary);
        return `<figure class="testimonial">
          <blockquote>${esc(tm.quote)}</blockquote>
          <figcaption class="testimonial-meta">
            <div class="testimonial-avatar">${avatar}</div>
            <div>
              <div class="testimonial-name">${esc(tm.name || "")}</div>
              ${tm.role ? `<div class="testimonial-role">${esc(tm.role)}${tm.company ? ` · ${esc(tm.company)}` : ""}</div>` : (tm.company ? `<div class="testimonial-role">${esc(tm.company)}</div>` : "")}
            </div>
          </figcaption>
        </figure>`;
      }).join("")}
    </div>
  </div>
</section>` : ""}

${pro && faqs.length ? `<section class="section" data-section="faq" id="faq">
  <div class="wrap">
    <div class="section-head">
      <h2>${esc(t.faq)}</h2>
    </div>
    <div class="faq-list">
      ${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
    </div>
  </div>
</section>` : ""}

${leadFormEndpoint ? `<section class="section" data-section="lead-form" id="contacto">
  <div class="wrap">
    <div class="lead-form-card">
      <h2>${esc(t.formTitle)}</h2>
      <p class="lead-intro">${esc(t.formIntro)}</p>
      <form id="pwp-lead-form">
        <input type="text" name="name" required placeholder="${esc(t.formName)}" aria-label="${esc(t.formName)}">
        <input type="email" name="email" required placeholder="${esc(t.formEmail)}" aria-label="${esc(t.formEmail)}">
        <input type="tel" name="phone" placeholder="${esc(t.formPhone)}" aria-label="${esc(t.formPhone)}">
        <textarea name="message" required rows="4" placeholder="${esc(t.formMessage)}" aria-label="${esc(t.formMessage)}"></textarea>
        <input type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
        <label class="consent-row">
          <input type="checkbox" name="habeas_data_accepted" required style="margin-top:3px;flex-shrink:0">
          <span>${i.language === "en"
            ? `I authorize <strong>${esc(i.businessName)}</strong> to process my data to respond to my inquiry. <a href="./privacy.html">Privacy Policy</a> (Colombian Law 1581 of 2012).`
            : `Autorizo a <strong>${esc(i.businessName)}</strong> a tratar mis datos para responder mi consulta. <a href="./politica-privacidad.html">Política de Privacidad</a> (Ley 1581 de 2012).`}</span>
        </label>
        <button class="btn btn-lg" type="submit">${esc(t.formSend)}</button>
      </form>
      <p id="pwp-lead-msg" role="status" style="margin:12px 0 0;color:var(--muted);font-size:.9rem;display:none"></p>
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
      if(!consent){m.textContent=${JSON.stringify(i.language === "en" ? "Please accept the Privacy Policy to send." : "Por favor acepte la Política de Privacidad para enviar.")};m.style.display='block';m.style.color='#fca5a5';return;}
      f.querySelector('button[type=submit]').disabled=true;
      try{
        var r=await fetch(${JSON.stringify(leadFormEndpoint)},{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
          name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),message:fd.get('message'),
          habeas_data_accepted:true, company_url:fd.get('company_url'), source:location.href
        })});
        var j=await r.json();
        if(j.ok){m.textContent=${JSON.stringify(t.formThanks)};m.style.display='block';m.style.color='var(--muted)';f.reset();}
        else{m.textContent=(j.error||${JSON.stringify(t.formError)});m.style.display='block';m.style.color='#fca5a5';}
      }catch(_){m.textContent=${JSON.stringify(t.formError)};m.style.display='block';m.style.color='#fca5a5';}
      finally{f.querySelector('button[type=submit]').disabled=false;}
    });
  })();
  </script>
</section>` : ""}
</main>

<a class="cta-float" href="#contacto" aria-label="${esc(t.bookDemo)}">${esc(t.bookDemo)}</a>

<footer class="site-footer">
  <div class="footer-inner">
    <div>
      ${i.nit ? `<strong>${esc(i.businessName)}</strong> · NIT ${esc(i.nit)}${i.address ? ` · ${esc(i.address)}` : ""}${i.camara ? ` · ${esc(i.camara)}` : ""}` : `<strong>${esc(i.businessName)}</strong>`}
    </div>
    <div>
      © ${new Date().getFullYear()} ${esc(i.businessName)} ·
      ${i.language === "en"
        ? `<a href="./privacy.html">Privacy</a> · <a href="./terms.html">Terms</a>`
        : `<a href="./politica-privacidad.html">Política de Privacidad</a> · <a href="./terminos.html">Términos</a>`}
      · <a href="#" onclick="pwpManageConsent();return false">${i.language === "en" ? "Manage cookies" : "Configurar cookies"}</a>
    </div>
  </div>
</footer>

<!-- Cookie consent banner (Ley 1581) — gates GA4 + Meta Pixel until accept -->
<div id="pwp-consent" style="position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.45);padding:18px 20px;font-family:Inter,system-ui,sans-serif;display:none;z-index:9998;color:var(--ink)">
  <p style="margin:0 0 10px;font-size:.92rem;color:var(--ink)">
    ${i.language === "en"
      ? `We use <strong>analytics & marketing cookies</strong> (Google Analytics, Meta Pixel) to improve your experience. You can accept, reject, or read our <a href="./privacy.html" style="color:var(--primary)">Privacy Policy</a>.`
      : `Usamos <strong>cookies de analítica y marketing</strong> (Google Analytics, Meta Pixel) para mejorar su experiencia. Puede aceptar, rechazar, o leer nuestra <a href="./politica-privacidad.html" style="color:var(--primary)">Política de Privacidad</a>.`}
  </p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="pwpConsent('accept')" style="background:var(--primary);color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;font:inherit">${i.language === "en" ? "Accept" : "Aceptar"}</button>
    <button onclick="pwpConsent('reject')" style="background:transparent;color:var(--ink);border:1px solid var(--line);padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;font:inherit">${i.language === "en" ? "Reject" : "Rechazar"}</button>
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
