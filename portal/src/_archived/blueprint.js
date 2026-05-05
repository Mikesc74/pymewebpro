// blueprint.js — parameterized landing template (blueprint-1).
// Pure function; returns the full HTML string for a mockup.
// Plan-aware: Growth tier renders extra sections and injects tracking.
// Sections wrapped with data-section so the comment widget can anchor to them.

import { renderBlueprintSaas } from "./blueprint-saas.js";
import { renderBlueprintProfessional } from "./blueprint-professional.js";

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
  // Visual structure copy
  eyHero: "Bienvenidos",
  eyServices: "Servicios",
  eyTestimonials: "Voces de clientes",
  eyGallery: "Galería",
  eyContact: "Hablemos",
  eyAbout: "Quiénes somos",
  eyTeam: "Nuestro equipo",
  eyFaq: "Dudas frecuentes",
  eyBlog: "Bitácora",
  eyDownloads: "Descargas",
  eyBookings: "Reservas",
  eyForm: "Formulario",
  formIntro: "Cuéntenos qué necesita",
  formIntroBody: "Respondemos por WhatsApp o correo en menos de 24 horas hábiles. Sin compromiso.",
  trustMade: "Hecho en Medellín",
  trustPay: "Pago seguro Wompi",
  trustSupport: "Soporte WhatsApp",
  trustLaw: "Ley 1581 cumplida",
  yearsLabel: "años de oficio",
  ratingLabel: "según clientes",
  cityLabel: "Sede principal",
  clientsLabel: "clientes felices",
  // Section nav labels (sticky header)
  navServices: "Servicios",
  navGallery: "Galería",
  navTestimonials: "Testimonios",
  navBlog: "Blog",
  navTeam: "Equipo",
  navDownloads: "Descargas",
  navFaq: "FAQ",
  navContact: "Contacto",
  navOpen: "Abrir menú",
  navClose: "Cerrar menú",
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
  // Visual structure copy
  eyHero: "Welcome",
  eyServices: "Services",
  eyTestimonials: "Client voices",
  eyGallery: "Gallery",
  eyContact: "Get in touch",
  eyAbout: "About us",
  eyTeam: "Our team",
  eyFaq: "Common questions",
  eyBlog: "Journal",
  eyDownloads: "Downloads",
  eyBookings: "Bookings",
  eyForm: "Contact form",
  formIntro: "Tell us what you need",
  formIntroBody: "We reply by WhatsApp or email within 24 business hours. No strings attached.",
  trustMade: "Made in Medellín",
  trustPay: "Secure Wompi checkout",
  trustSupport: "WhatsApp support",
  trustLaw: "Law 1581 compliant",
  yearsLabel: "years in business",
  ratingLabel: "client rating",
  cityLabel: "Headquarters",
  clientsLabel: "happy clients",
  // Section nav labels (sticky header)
  navServices: "Services",
  navGallery: "Gallery",
  navTestimonials: "Testimonials",
  navBlog: "Blog",
  navTeam: "Team",
  navDownloads: "Downloads",
  navFaq: "FAQ",
  navContact: "Contact",
  navOpen: "Open menu",
  navClose: "Close menu",
};

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isPro(plan) {
  return String(plan || "").toLowerCase() === "pro" || String(plan || "").toLowerCase() === "crecimiento" || String(plan || "").toLowerCase() === "growth";
}

// WCAG-style luminance for a #rrggbb color (returns 0..1).
// Used to pick whether the brand color is dark enough to use as a full-bleed
// section background or whether we fall back to a default deep navy.
function luminance(hex) {
  const m = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(m)) return 0.5;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function pad2(n) { return String(n).padStart(2, "0"); }

// Derive 2-letter initials for placeholders.
// "La Equina Bakery" -> "LE", "Café Test E2E" -> "CT", "X" -> "X", "" -> "??"
function getInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "??";
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

// Lighten/darken a hex by a delta (-1..1). Returns #rrggbb.
function shadeHex(hex, delta) {
  const m = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(m)) return "#" + m;
  let r = parseInt(m.slice(0, 2), 16);
  let g = parseInt(m.slice(2, 4), 16);
  let b = parseInt(m.slice(4, 6), 16);
  const adj = (c) => {
    const v = delta < 0 ? c * (1 + delta) : c + (255 - c) * delta;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  r = adj(r); g = adj(g); b = adj(b);
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

// Rotate the hue of a hex color by N degrees. Used to vary gallery placeholders
// per index without re-rolling the brand palette.
function rotateHue(hex, deg) {
  const m = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(m)) return "#" + m;
  let r = parseInt(m.slice(0, 2), 16) / 255;
  let g = parseInt(m.slice(2, 4), 16) / 255;
  let b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  h = (h + deg) % 360; if (h < 0) h += 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; }
  else if (h < 120) { rp = x; gp = c; }
  else if (h < 180) { gp = c; bp = x; }
  else if (h < 240) { gp = x; bp = c; }
  else if (h < 300) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  const to = (v) => Math.max(0, Math.min(255, Math.round((v + mm) * 255)))
    .toString(16).padStart(2, "0");
  return "#" + to(rp) + to(gp) + to(bp);
}

// Self-contained SVG placeholder. Renders the business initials over a brand-
// colored background with a subtle decorative pattern. `kind` switches the
// pattern (tile = stripes/dots/shape rotation per idx; avatar = circular crop).
// Returns a raw <svg ...> string suitable for inlining into HTML.
function placeholderSvg({ initials, color, idx, w, h, kind }) {
  const i2 = String(initials || "??").slice(0, 2).toUpperCase();
  const k = kind || "tile";
  const ix = Number.isFinite(idx) ? idx : 0;
  const W = w || 800;
  const H = h || 800;
  // Vary hue 10° per idx so gallery tiles aren't carbon copies.
  const base = rotateHue(color || "#003893", (ix % 6) * 10);
  const dark = shadeHex(base, -0.35);
  const fontSize = Math.round(Math.min(W, H) * 0.42);
  const id = `ph${ix}`;
  // Pattern alternates per idx: 0 stripes-down, 1 dots, 2 stripes-up, 3 chevron, repeat
  const variant = ix % 4;
  let pattern = "";
  if (variant === 0) {
    pattern = `<defs><pattern id="${id}p" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="22" stroke="#fff" stroke-opacity=".10" stroke-width="6"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#${id}p)"/>`;
  } else if (variant === 1) {
    pattern = `<defs><pattern id="${id}p" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="3" fill="#fff" fill-opacity=".14"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#${id}p)"/>`;
  } else if (variant === 2) {
    pattern = `<defs><pattern id="${id}p" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="22" stroke="#fff" stroke-opacity=".10" stroke-width="6"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#${id}p)"/>`;
  } else {
    pattern = `<circle cx="${Math.round(W*0.82)}" cy="${Math.round(H*0.18)}" r="${Math.round(Math.min(W,H)*0.22)}" fill="#fff" fill-opacity=".10"/><circle cx="${Math.round(W*0.16)}" cy="${Math.round(H*0.82)}" r="${Math.round(Math.min(W,H)*0.28)}" fill="#fff" fill-opacity=".08"/>`;
  }

  if (k === "avatar") {
    // Circular avatar (used for team photos). Crop via clip-path circle.
    const r = Math.min(W, H) / 2;
    const fs = Math.round(Math.min(W, H) * 0.44);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${i2}"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${base}"/><stop offset="100%" stop-color="${dark}"/></linearGradient><clipPath id="${id}c"><circle cx="${W/2}" cy="${H/2}" r="${r}"/></clipPath></defs><g clip-path="url(#${id}c)"><rect width="${W}" height="${H}" fill="url(#${id}g)"/>${pattern}<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Fraunces,Georgia,serif" font-style="italic" font-weight="700" font-size="${fs}" fill="#fff">${i2}</text></g></svg>`;
  }

  // Default: rectangular tile (gallery / hero).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${i2}"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${base}"/><stop offset="100%" stop-color="${dark}"/></linearGradient><radialGradient id="${id}r" cx="80%" cy="20%" r="60%"><stop offset="0%" stop-color="#d4a017" stop-opacity=".40"/><stop offset="100%" stop-color="#d4a017" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${id}g)"/><rect width="${W}" height="${H}" fill="url(#${id}r)"/>${pattern}<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Fraunces,Georgia,serif" font-style="italic" font-weight="700" font-size="${fontSize}" fill="#fff" fill-opacity=".92">${i2}</text></svg>`;
}

// Returns a data: URL embedding the SVG (for use in `src` attributes / `url()`).
function placeholderDataUrl(args) {
  const svg = placeholderSvg(args);
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
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
  const initials = getInitials(i.businessName);

  // Both plans
  const testimonials = i.testimonials || [];                 // [{ name, quote, role }, …]
  const ga4Id = i.ga4Id || "";                               // Esencial gets the wiring too
  const metaPixelId = i.metaPixelId || "";

  // Crecimiento extras (proOnly): blog · extended gallery · PDF downloads · team · FAQ
  const blogPosts = pro ? (i.blogPosts || []) : [];          // [{ title, slug, excerpt, body, date }]
  const pdfUrl = pro ? (i.pdfUrl || "") : "";                // catalog / menu PDF (single — see pdfDownloads for plural)
  const pdfDownloads = pro ? (i.pdfDownloads || []) : [];    // [{ url, label }]
  const pdfLabel = pro ? (i.pdfLabel || (i.language === "en" ? "Downloads" : "Descargas")) : "";
  const teamMembers = pro ? (i.teamMembers || []) : [];      // [{ name, role, bio, photoUrl }]
  const faqs = pro ? (i.faqs || []) : [];                    // [{ q, a }, …]
  // Legacy fields preserved for now (not in spec but harmless if unset)
  const bookingsUrl = pro ? (i.bookingsUrl || "") : "";
  const newsletter = pro && (i.newsletterUrl || i.newsletterEnabled);
  const waCatalogUrl = pro ? (i.waCatalogUrl || "") : "";

  // Lead form endpoint — posts to the worker which forwards to client's email via Resend
  const leadFormEndpoint = i.leadFormEndpoint || (i.clientId ? `/api/lead/${i.clientId}` : "");

  // Whether the gallery section will render. Always render so the layout feels
  // complete — when the client uploaded no photos, fall back to 4 branded SVG
  // placeholders. Galleries with photos always include them as-is.
  const galleryHasPhotos = gallery.length > 0;
  const galleryPlaceholderCount = galleryHasPhotos ? 0 : 4;
  const galleryWillRender = galleryHasPhotos || galleryPlaceholderCount > 0;

  // Section nav items — only include rows that will actually render. Order
  // matches reading order on the page.
  const navItems = [];
  navItems.push({ href: "#servicios", label: t.navServices });
  if (galleryWillRender) navItems.push({ href: "#galeria", label: t.navGallery });
  if (testimonials.length) navItems.push({ href: "#testimonios", label: t.navTestimonials });
  if (pro && blogPosts.length) navItems.push({ href: "#blog", label: t.navBlog });
  if (pro && teamMembers.length) navItems.push({ href: "#equipo", label: t.navTeam });
  if (pro && (pdfDownloads.length || pdfUrl)) navItems.push({ href: "#descargas", label: t.navDownloads });
  if (pro && faqs.length) navItems.push({ href: "#faq", label: t.navFaq });
  navItems.push({ href: "#contacto", label: t.navContact });

  // Visual accent computation. If the brand color is dark enough, use it as the
  // dark-block background; else fall back to a default deep navy that always
  // hits AA contrast against white text. (Spec: luminance < 0.5 → use brand.)
  const primaryLum = luminance(i.primary);
  const darkBlock = primaryLum < 0.5 ? i.primary : "#1a1a2e";

  // Eyebrow line above the hero H1 — derived from industry where possible.
  const heroEyebrow = i.heroEyebrow || (i.industry ? `${i.industry}${i.address && /\bMedellín\b/i.test(i.address) ? " · Medellín" : ""}` : t.eyHero);

  // Trust signals row — derived where possible, fall back to brand-safe defaults.
  // Wizard doesn't currently collect foundedYear / rating; if/when it does
  // these become real numbers automatically.
  const currentYear = new Date().getFullYear();
  const trustItems = [];
  if (i.foundedYear && Number(i.foundedYear) > 1900) {
    trustItems.push({ num: `+${Math.max(1, currentYear - Number(i.foundedYear))}`, label: t.yearsLabel });
  } else {
    trustItems.push({ num: "+200", label: t.clientsLabel });
  }
  trustItems.push({ num: i.rating ? `${i.rating}★` : "4.9★", label: t.ratingLabel });
  if (i.address) {
    const cityMatch = String(i.address).match(/([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+)$/);
    const city = cityMatch ? cityMatch[1].trim() : "Medellín";
    trustItems.push({ num: city, label: t.cityLabel });
  } else {
    trustItems.push({ num: "Medellín", label: t.cityLabel });
  }
  trustItems.push({ num: i.language === "en" ? "GA4 + SSL" : "GA4 + SSL", label: t.trustSupport });

  // Hero accent: image if provided, otherwise inline decorative SVG so the
  // hero never looks empty. Uses brand colors for the gradient.
  const heroImage = (i.galleryUrls && i.galleryUrls[0]) ? i.galleryUrls[0] : "";
  const heroImageAlt = (i.galleryAlts && i.galleryAlts[0]) ? i.galleryAlts[0] : i.businessName;
  // Hero placeholder SVG — branded backdrop, initials in big italic Fraunces,
  // 1-2 abstract geometric shapes. Always paired with #1a1a2e in the gradient so
  // there's a visible top-to-bottom shift even when --primary equals --dark.
  const heroDark = shadeHex(i.primary, -0.45);
  const heroSvg = `<svg class="hero-art-svg" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${esc(i.primary)}"/>
        <stop offset="100%" stop-color="${esc(heroDark)}"/>
      </linearGradient>
      <radialGradient id="hg2" cx="80%" cy="20%" r="60%">
        <stop offset="0%" stop-color="#d4a017" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#d4a017" stop-opacity="0"/>
      </radialGradient>
      <pattern id="hgp" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="28" stroke="#fff" stroke-opacity=".07" stroke-width="6"/>
      </pattern>
    </defs>
    <rect width="400" height="500" fill="url(#hg1)"/>
    <rect width="400" height="500" fill="url(#hgp)"/>
    <rect width="400" height="500" fill="url(#hg2)"/>
    <circle cx="320" cy="120" r="70" fill="#fff" fill-opacity=".10"/>
    <circle cx="80" cy="380" r="110" fill="#fff" fill-opacity=".07"/>
    <path d="M0 380 Q 200 280 400 360 L 400 500 L 0 500 Z" fill="#fff" fill-opacity=".07"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Fraunces,Georgia,serif" font-style="italic" font-weight="800" font-size="220" fill="#fff" fill-opacity=".92">${esc(initials)}</text>
  </svg>`;

  // ─── JSON-LD (LocalBusiness on every site, FAQPage if FAQs, Service per service) ──
  const businessId = (i.canonicalUrl || "") + "#business";
  const ldLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": businessId || undefined,
    "name": i.businessName,
    "description": i.tagline,
    "url": i.canonicalUrl || undefined,
    "telephone": i.phone || undefined,
    "email": i.email || undefined,
    "image": i.logoUrl || undefined,
    "address": i.address ? { "@type": "PostalAddress", "streetAddress": i.address, "addressCountry": "CO" } : undefined,
    "openingHours": i.hours || undefined,
    "taxID": i.nit || undefined,
    "sameAs": [i.instagram, i.facebook].filter(Boolean),
  };
  const jsonLdBlocks = [renderJsonLd(ldLocalBusiness)];
  // Service entries — one per service in the list
  for (const s of services) {
    const name = typeof s === "string" ? s : (s.title || s.name || "");
    if (!name) continue;
    jsonLdBlocks.push(renderJsonLd({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": name,
      "provider": businessId ? { "@id": businessId } : { "@type": "LocalBusiness", "name": i.businessName },
      "areaServed": i.address ? { "@type": "Country", "name": "Colombia" } : undefined,
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

  // ─── Tracking pixels — GATED behind cookie consent (Ley 1581) ────────────
  // The actual scripts only run after the visitor clicks Accept on the banner.
  // We embed the IDs as data-* attributes so the banner script can pick them up
  // and dynamically inject the trackers ONLY when consent is given.
  const trackerConfigTag = (ga4Id || metaPixelId) ? `
<script id="pwp-tracker-config" type="application/json">${JSON.stringify({ ga4Id: ga4Id || null, metaPixelId: metaPixelId || null })}</script>` : "";
  const ga4Tag = "";
  const metaPixelTag = "";

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
${trackerConfigTag}
<style>
/* Color tokens. The five brand vars (--primary, --ink, --bg, --muted, --line)
   come from the wizard so the entire visual system flows through. --accent stays
   for legacy callers. --dark is computed from luminance: brand color if dark
   enough, else navy fallback so the dark accent blocks always have AA text. */
:root{
  --primary:${i.primary};
  --accent:${i.accent || "#fcd116"};
  --ink:${i.ink};
  --bg:${i.bg};
  --muted:${i.muted || "#5e6883"};
  --line:${i.line || "#e5e0c9"};
  --dark:${darkBlock};
  --gold:#d4a017;
  --shadow-sm:0 4px 20px rgba(10,24,64,.06);
  --shadow-md:0 14px 30px -10px rgba(10,24,64,.18);
  --shadow-lg:0 30px 80px -30px rgba(10,24,64,.25);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:#fff;padding:8px 12px;border-radius:6px;z-index:9999}

/* Typography — Fraunces italic display + Inter body, marketing-site bar. */
h1,h2,h3,h4{font-family:'Fraunces',Georgia,serif;font-weight:700;letter-spacing:-.02em;line-height:1.08;margin:0}
h1{font-size:clamp(2.5rem,6vw,5rem);font-weight:800;font-style:italic}
h2{font-size:clamp(2rem,4.4vw,3.4rem);font-style:italic}
h3{font-size:1.35rem;font-weight:600}
p{margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}

/* Eyebrow — small caps gold tag, sits above section headings. */
.eyebrow{
  display:inline-flex;align-items:center;gap:10px;
  font-family:'Inter',sans-serif;font-size:.74rem;font-weight:700;
  letter-spacing:.18em;text-transform:uppercase;
  color:var(--gold);
  margin:0 0 18px;
}
.eyebrow::before{content:"";display:inline-block;width:24px;height:2px;background:var(--gold)}
.eyebrow.on-dark{color:#e8c97a}
.eyebrow.on-dark::before{background:#e8c97a}

/* Section dividers — thin gold rule between rhythmic blocks. */
.divider{display:flex;justify-content:center;padding:36px 0 0}
.divider::before{content:"";display:block;width:80px;height:2px;background:var(--gold);opacity:.7;border-radius:2px}

/* Buttons */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:14px 26px;border-radius:12px;font-family:inherit;font-weight:700;font-size:1rem;
  background:var(--primary);color:#fff;border:0;cursor:pointer;
  text-decoration:none;
  box-shadow:0 12px 26px -10px rgba(10,24,64,.32);
  transition:transform .2s ease,box-shadow .2s ease,background .2s ease;
}
.btn:hover{transform:translateY(-2px);box-shadow:0 18px 34px -12px rgba(10,24,64,.4)}
.btn.alt{background:var(--accent);color:var(--ink);box-shadow:0 12px 26px -10px rgba(212,160,23,.45)}
.btn.outline{background:transparent;color:var(--primary);border:2px solid var(--primary);box-shadow:none}
.btn.outline:hover{background:var(--primary);color:#fff}
.btn.on-dark{background:#fff;color:var(--ink)}
.btn.on-dark.outline{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5)}
.btn.on-dark.outline:hover{background:#fff;color:var(--ink)}

/* Nav */
.nav{
  position:sticky;top:0;z-index:50;
  backdrop-filter:saturate(180%) blur(14px);
  background:rgba(251,250,246,.78);
  border-bottom:1px solid rgba(10,24,64,.06);
}
.nav-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:72px;padding:12px 24px;max-width:1240px;margin:0 auto}
.nav .logo{font-family:'Fraunces',serif;font-weight:800;font-size:1.3rem;letter-spacing:-.02em;color:var(--ink);font-style:italic;flex-shrink:0}
.nav .logo .logo-accent{color:var(--gold)}
/* Section nav links — center column between logo and CTAs. */
.nav-links{display:flex;align-items:center;gap:22px;flex:1;justify-content:center;font-family:'Inter',sans-serif;font-size:.9rem;font-weight:600}
.nav-links a{color:var(--ink);opacity:.8;text-decoration:none;position:relative;padding:6px 0;transition:opacity .2s ease}
.nav-links a::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;background:var(--primary);opacity:0;transform:scaleX(.4);transform-origin:center;transition:opacity .2s ease,transform .2s ease;border-radius:2px}
.nav-links a:hover{opacity:1}
.nav-links a:hover::after,.nav-links a[aria-current="page"]::after{opacity:1;transform:scaleX(1)}
.nav-links a[aria-current="page"]{opacity:1}
.nav-cta{display:flex;gap:10px;align-items:center;flex-shrink:0}
/* Mobile hamburger — hidden on desktop, replaces inline links on ≤780px. */
.nav-toggle{display:none;background:transparent;border:1px solid var(--line);width:42px;height:42px;border-radius:10px;cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:0}
.nav-toggle-bar{display:block;width:18px;height:2px;background:var(--ink);transition:transform .2s ease,opacity .2s ease}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(1){transform:translateY(6px) rotate(45deg)}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(2){opacity:0}
.nav-toggle[aria-expanded="true"] .nav-toggle-bar:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.mobile-nav{display:none;flex-direction:column;gap:0;padding:8px 24px 16px;border-top:1px solid var(--line);background:rgba(251,250,246,.96);backdrop-filter:saturate(180%) blur(14px)}
.mobile-nav.open{display:flex}
.mobile-nav a{padding:14px 4px;color:var(--ink);font-family:'Inter',sans-serif;font-weight:600;font-size:1rem;text-decoration:none;border-bottom:1px solid var(--line)}
.mobile-nav a:last-child{border-bottom:0}
.mobile-nav a[aria-current="page"]{color:var(--primary)}
@media(max-width:780px){.nav-links{display:none}.nav-toggle{display:inline-flex}}
/* Anchor jumps shouldn't slide content under the sticky nav. */
section[id]{scroll-margin-top:90px}

/* Hero — display heading + accent imagery / SVG decoration. */
.hero{position:relative;padding:90px 0 80px;overflow:hidden}
.hero::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(60% 50% at 88% 8%, rgba(212,160,23,.16), transparent 70%),
    radial-gradient(50% 50% at 5% 92%, rgba(10,24,64,.07), transparent 70%);
}
.hero-grid{position:relative;display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}
.hero h1{margin-bottom:0}
.hero-sub{font-size:1.18rem;color:var(--muted);margin-top:24px;max-width:560px;line-height:1.6}
.hero-ctas{display:flex;gap:14px;flex-wrap:wrap;margin-top:36px}
.hero-art{position:relative;border-radius:24px;overflow:hidden;box-shadow:var(--shadow-lg);aspect-ratio:4/5;background:linear-gradient(135deg,var(--primary),var(--ink))}
.hero-art img{width:100%;height:100%;object-fit:cover;display:block}
.hero-art-svg{width:100%;height:100%;display:block}
@media(max-width:880px){.hero{padding:60px 0 50px}.hero-grid{grid-template-columns:1fr;gap:40px}.hero-art{aspect-ratio:5/4;max-width:520px;margin:0 auto}}

/* Trust signals row — between hero and services. */
.trust{
  display:grid;grid-template-columns:repeat(4,1fr);gap:24px;
  padding:30px 0;margin-top:0;
  border-top:1px solid var(--line);border-bottom:1px solid var(--line);
}
.trust-item{display:flex;flex-direction:column;gap:4px;text-align:left}
.trust-num{font-family:'Fraunces',serif;font-style:italic;font-weight:800;font-size:1.6rem;color:var(--gold);line-height:1.1}
.trust-label{font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
@media(max-width:760px){.trust{grid-template-columns:repeat(2,1fr);gap:18px;padding:24px 0}.trust-num{font-size:1.3rem}}

/* Section rhythm */
.section{padding:90px 0;position:relative}
.section.dark{background:var(--dark);color:#fff}
.section.dark h2,.section.dark h3{color:#fff}
.section.dark .lead,.section.dark p{color:rgba(255,255,255,.78)}
.section-head{max-width:760px;margin-bottom:48px}
.section-head p{color:var(--muted);font-size:1.05rem;margin-top:18px;line-height:1.65}
.section.dark .section-head p{color:rgba(255,255,255,.8)}
@media(max-width:600px){.section{padding:60px 0}}

/* Service cards — elevated, numbered, hover lift. */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px;margin-top:8px}
.card{
  background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px 26px;
  box-shadow:var(--shadow-sm);
  transition:transform .25s ease,box-shadow .25s ease;
  position:relative;display:flex;flex-direction:column;gap:10px;
}
.card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.card-num{
  font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.18em;
  text-transform:uppercase;color:var(--gold);line-height:1;margin-bottom:4px;
}
.card h3{font-family:'Fraunces',serif;font-weight:600;font-size:1.25rem;letter-spacing:-.01em;color:var(--ink)}
.card p{color:var(--muted);font-size:.96rem;line-height:1.6}

/* Gallery — masonry-ish: every 3rd image taller. */
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));grid-auto-rows:200px;gap:14px;margin-top:8px}
.gallery a{display:block;overflow:hidden;border-radius:14px;box-shadow:var(--shadow-sm)}
.gallery img,.gallery svg{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
.gallery a:hover img,.gallery a:hover svg{transform:scale(1.05)}
.gallery a:nth-child(3n+1){grid-row:span 2}
@media(max-width:600px){.gallery{grid-auto-rows:160px}.gallery a:nth-child(3n+1){grid-row:span 1}}

/* Testimonials — quote cards on dark accent background. */
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;margin-top:8px}
.testimonial{
  position:relative;background:#fff;color:var(--ink);
  border-radius:18px;padding:34px 28px 26px;
  box-shadow:var(--shadow-md);
  display:flex;flex-direction:column;gap:18px;
}
.testimonial::before{
  content:'\\201C';position:absolute;top:6px;left:18px;
  font-family:'Fraunces',serif;font-style:italic;font-weight:800;font-size:5.5rem;line-height:1;
  color:var(--gold);opacity:.28;pointer-events:none;
}
.testimonial blockquote{
  margin:0;padding-left:0;
  font-family:'Fraunces',serif;font-style:italic;font-weight:400;
  font-size:1.08rem;line-height:1.55;color:var(--ink);
  position:relative;z-index:1;
}
.testimonial figcaption,.testimonial .meta{
  display:flex;flex-direction:column;gap:2px;
  padding-top:14px;border-top:1px solid var(--line);
}
.testimonial cite{font-style:normal;font-weight:700;font-size:.95rem;color:var(--ink);letter-spacing:-.005em}
.testimonial small{font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}

/* Booking iframe */
.booking-frame{margin-top:8px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff;box-shadow:var(--shadow-sm)}
.booking-frame iframe{width:100%;height:680px;border:0;display:block}

/* Newsletter (Crecimiento) */
.newsletter{
  background:#fff;border:1px solid var(--line);border-radius:18px;padding:32px;
  box-shadow:var(--shadow-sm);
}

/* FAQ accordion */
.faq-list{margin-top:8px;display:flex;flex-direction:column;gap:12px}
.faq-list details{
  background:#fff;border:1px solid var(--line);border-radius:14px;
  padding:18px 22px;
  box-shadow:var(--shadow-sm);
  transition:box-shadow .2s ease;
}
.faq-list details[open]{box-shadow:var(--shadow-md)}
.faq-list summary{cursor:pointer;font-family:'Fraunces',serif;font-weight:600;font-size:1.1rem;list-style:none;color:var(--ink)}
.faq-list summary::-webkit-details-marker{display:none}
.faq-list summary::after{content:'+';float:right;font-size:1.5rem;color:var(--primary);font-family:'Inter',sans-serif;font-weight:300;line-height:1}
.faq-list details[open] summary::after{content:'\\2013'}
.faq-list p{margin:14px 0 0;color:var(--muted);line-height:1.65}

/* Lead form — split card on cream bg. */
.lead-form-card{
  background:#fff;border-radius:24px;
  border:1px solid var(--line);
  box-shadow:var(--shadow-md);
  display:grid;grid-template-columns:1fr 1.1fr;
  overflow:hidden;
  margin-top:8px;
}
.lead-form-intro{
  padding:48px 40px;
  background:linear-gradient(160deg,var(--bg) 0%,#fff 100%);
  border-right:1px solid var(--line);
  display:flex;flex-direction:column;justify-content:center;
}
.lead-form-intro h2{font-size:clamp(1.7rem,3vw,2.4rem);margin-bottom:14px}
.lead-form-intro p{color:var(--muted);font-size:1rem;line-height:1.65}
.lead-form-pane{padding:48px 40px}
.lead-form-pane form{display:grid;gap:14px}
.lead-form-pane input[type=text],
.lead-form-pane input[type=email],
.lead-form-pane input[type=tel],
.lead-form-pane textarea{
  padding:14px 16px;border:1.5px solid var(--line);border-radius:10px;
  font:inherit;font-size:.98rem;color:var(--ink);background:#fff;
  transition:border-color .2s ease,box-shadow .2s ease;
}
.lead-form-pane input:focus,
.lead-form-pane textarea:focus{
  outline:none;border-color:var(--primary);
  box-shadow:0 0 0 4px rgba(0,56,147,.12);
}
.lead-form-pane textarea{resize:vertical;min-height:110px}
.lead-form-pane button[type=submit]{width:100%;justify-content:center}
@media(max-width:760px){.lead-form-card{grid-template-columns:1fr}.lead-form-intro{border-right:0;border-bottom:1px solid var(--line);padding:32px 28px}.lead-form-pane{padding:32px 28px}}

/* Footer contact block — dark, contained card-feel. */
.contact-block{
  background:var(--dark);color:#fff;
  border-radius:24px;padding:56px 48px;
  box-shadow:var(--shadow-lg);
  display:grid;grid-template-columns:1.1fr 1fr;gap:40px;
  margin:0 0 60px;
}
.contact-block h2{color:#fff;margin-bottom:14px}
.contact-block p{color:rgba(255,255,255,.82);margin:6px 0;font-size:.98rem}
.contact-block a{color:#fff;text-decoration:underline;text-decoration-color:rgba(255,255,255,.4);text-underline-offset:3px}
.contact-block a:hover{text-decoration-color:#fff}
@media(max-width:760px){.contact-block{grid-template-columns:1fr;padding:36px 28px}}

footer{padding:30px 24px;color:var(--muted);font-size:.9rem;text-align:center}

/* Floating WhatsApp — fixed bottom-right green pill. */
.wa-float{
  position:fixed;bottom:24px;right:24px;z-index:60;
  width:60px;height:60px;border-radius:50%;
  background:#25d366;color:#fff;
  display:grid;place-items:center;
  box-shadow:0 14px 30px -8px rgba(37,211,102,.55);
  transition:transform .25s ease;
  animation:wa-pulse 2.5s ease-in-out infinite;
}
.wa-float:hover{transform:scale(1.08);animation-play-state:paused}
.wa-float svg{width:30px;height:30px;fill:#fff}
@keyframes wa-pulse{
  0%,100%{box-shadow:0 14px 30px -8px rgba(37,211,102,.55),0 0 0 0 rgba(37,211,102,.45)}
  50%{box-shadow:0 14px 30px -8px rgba(37,211,102,.55),0 0 0 14px rgba(37,211,102,0)}
}
@media(prefers-reduced-motion:reduce){.wa-float{animation:none}}
@media print{.wa-float{display:none}}
</style>
${i.adminCss ? `<style data-admin-overrides>\n${i.adminCss}\n</style>` : ""}
</head>
<body>
<a class="skip" href="#main">${i.language === "en" ? "Skip to content" : "Saltar al contenido"}</a>

<header class="nav" data-section="nav">
  <div class="nav-inner">
    <a class="logo" href="#main" aria-label="${esc(i.businessName)}">${i.logoUrl
      ? `<img src="${esc(i.logoUrl)}" alt="${esc(i.businessName)}" style="height:40px;width:auto" width="160" height="40" decoding="async">`
      : (() => {
          // Wordmark fallback — Fraunces italic with the last 3 chars in gold.
          const name = String(i.businessName || "");
          const accentLen = Math.min(3, name.length);
          const head = name.slice(0, name.length - accentLen);
          const tail = name.slice(name.length - accentLen);
          return `${esc(head)}<span class="logo-accent">${esc(tail)}</span>`;
        })()}</a>
    <nav class="nav-links" aria-label="${i.language === "en" ? "Sections" : "Secciones"}">
      ${navItems.map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("")}
    </nav>
    <div class="nav-cta">
      ${i.bilingualAltHref ? `<a href="${esc(i.bilingualAltHref)}" style="color:var(--ink);font-weight:600;font-size:.9rem;text-decoration:none">${i.language === "en" ? "Español" : "English"}</a>` : ""}
      <a class="btn" href="${esc(waLink)}" rel="noopener">${t.contact}</a>
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
      <div>
        <p class="eyebrow">${esc(heroEyebrow)}</p>
        <h1>${esc(i.businessName)}</h1>
        <p class="hero-sub">${esc(i.tagline)}</p>
        <div class="hero-ctas">
          <a class="btn" href="${esc(waLink)}" rel="noopener">${t.whatsapp}</a>
          <a class="btn outline" href="${esc(phoneLink)}">${t.call}</a>
          ${bookingsUrl ? `<a class="btn alt" href="${esc(bookingsUrl)}" rel="noopener" target="_blank">${t.bookNow}</a>` : ""}
        </div>
      </div>
      <div class="hero-art">
        ${heroImage
          ? `<img src="${esc(heroImage)}" alt="${esc(heroImageAlt)}" loading="eager" decoding="async" width="800" height="1000">`
          : heroSvg}
      </div>
    </div>
  </div>
</section>

<section class="wrap" data-section="trust" aria-label="${i.language === "en" ? "Trust signals" : "Sellos de confianza"}">
  <div class="trust">
    ${trustItems.map(it => `
      <div class="trust-item">
        <div class="trust-num">${esc(it.num)}</div>
        <div class="trust-label">${esc(it.label)}</div>
      </div>`).join("")}
  </div>
</section>

<section class="section" data-section="services" id="servicios">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">01 / ${esc(t.eyServices)}</p>
      <h2>${t.services}</h2>
    </div>
    <div class="cards">
      ${services.map((s, idx) => {
        const title = typeof s === "string" ? s : (s.title || "");
        const body = typeof s === "string" ? "" : (s.body || "");
        return `<div class="card">
          <div class="card-num">${pad2(idx + 1)}</div>
          <h3>${esc(title)}</h3>
          ${body ? `<p>${esc(body)}</p>` : ""}
        </div>`;
      }).join("")}
    </div>
  </div>
</section>

${testimonials.length ? `<section class="section dark" data-section="testimonials" id="testimonios">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow on-dark">02 / ${esc(t.eyTestimonials)}</p>
      <h2>${t.testimonials}</h2>
    </div>
    <div class="testimonials-grid">
      ${testimonials.map(tm => `
        <figure class="testimonial">
          <blockquote>${esc(tm.quote)}</blockquote>
          <figcaption>
            <cite>${esc(tm.name)}</cite>
            ${tm.role ? `<small>${esc(tm.role)}</small>` : ""}
          </figcaption>
        </figure>`).join("")}
    </div>
  </div>
</section>` : ""}

${galleryWillRender ? `<section class="section" data-section="gallery" id="galeria">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">03 / ${esc(t.eyGallery)}</p>
      <h2>${t.gallery}</h2>
    </div>
    <div class="gallery">${galleryHasPhotos
      ? gallery.map((u, idx) => {
          const altText = (i.galleryAlts && i.galleryAlts[idx]) ? i.galleryAlts[idx] : `${i.businessName} ${idx+1}`;
          // Wrap in <a> so we can target hover/scale on the container while the
          // <img> retains explicit dimensions for CLS-free reservation.
          return `<a><img src="${esc(u)}" alt="${esc(altText)}" loading="lazy" decoding="async" width="800" height="800"></a>`;
        }).join("")
      : Array.from({ length: galleryPlaceholderCount }, (_, idx) => {
          // Branded SVG placeholder — varies hue per index so the row reads as
          // a curated set rather than 4 identical tiles.
          const svg = placeholderSvg({ initials, color: i.primary, idx, w: 800, h: 800, kind: "tile" });
          return `<a aria-hidden="true">${svg}</a>`;
        }).join("")
    }</div>
  </div>
</section>` : ""}

${pro && bookingsUrl ? `<section class="section" data-section="bookings">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyBookings)}</p>
      <h2>${t.bookings}</h2>
    </div>
    <div class="booking-frame">
      <iframe src="${esc(bookingsUrl)}" loading="lazy" title="${t.bookings}"></iframe>
    </div>
  </div>
</section>` : ""}

${pro && pdfUrl ? `<section class="section" data-section="catalog">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyDownloads)}</p>
      <h2>${esc(pdfLabel)}</h2>
    </div>
    <p><a class="btn" href="${esc(pdfUrl)}" target="_blank" rel="noopener">${t.download} ${esc(pdfLabel)} (PDF)</a></p>
  </div>
</section>` : ""}

${pro && waCatalogUrl ? `<section class="section" data-section="wa-catalog">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">WhatsApp</p>
      <h2>${t.catalog}</h2>
    </div>
    <p><a class="btn" href="${esc(waCatalogUrl)}" target="_blank" rel="noopener">${t.catalog} →</a></p>
  </div>
</section>` : ""}

${newsletter && i.newsletterEndpoint ? `<section class="section" data-section="newsletter">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Newsletter</p>
      <h2>${t.newsletter}</h2>
    </div>
    <div class="newsletter" style="display:flex;flex-direction:column;align-items:stretch;gap:14px">
    <form id="pwp-newsletter" style="display:flex;flex-direction:column;gap:10px;width:100%">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="email" name="email" required placeholder="${t.newsletterPlaceholder}" aria-label="${t.newsletterPlaceholder}" style="flex:1;min-width:200px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font:inherit">
        <button class="btn" type="submit">${t.newsletterCta}</button>
      </div>
      <!-- Honeypot: humans never see/fill this; bots usually do -->
      <input type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <label style="display:flex;align-items:flex-start;gap:8px;font-size:.82rem;color:var(--muted);line-height:1.45;cursor:pointer">
        <input type="checkbox" name="habeas_data_accepted" required style="margin-top:3px;flex-shrink:0">
        <span>${i.language === "en"
          ? `I authorize <strong>${esc(i.businessName)}</strong> to process my email address to send me commercial communications. I can revoke this authorization at any time by replying STOP. See the <a href="./privacy.html" style="color:var(--primary)">Privacy Policy</a> (Colombian Law 1581 of 2012).`
          : `Autorizo a <strong>${esc(i.businessName)}</strong> a tratar mi correo electrónico para enviarme comunicaciones comerciales. Puedo revocar esta autorización en cualquier momento respondiendo STOP. Ver <a href="./politica-privacidad.html" style="color:var(--primary)">Política de Privacidad</a> (Ley 1581 de 2012).`}</span>
      </label>
    </form>
    <p id="pwp-newsletter-msg" role="status" style="margin:0;color:var(--muted);font-size:.9rem;display:none"></p>
  </div>
  <script>
  (function(){
    var f=document.getElementById('pwp-newsletter');var m=document.getElementById('pwp-newsletter-msg');
    if(!f)return;
    f.addEventListener('submit', async function(e){
      e.preventDefault();
      var email=f.email.value.trim();if(!email)return;
      var honeypot=f.elements['company_url'].value;
      var consent=f.elements['habeas_data_accepted'].checked;
      if(!consent){m.textContent=${JSON.stringify(i.language === "en" ? "Please accept the Privacy Policy to subscribe." : "Por favor acepte la Política de Privacidad para suscribirse.")};m.style.display='block';m.style.color='#a30d1f';return;}
      f.querySelector('button[type=submit]').disabled=true;
      try{
        var r=await fetch(${JSON.stringify(i.newsletterEndpoint)},{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email, habeas_data_accepted:true, company_url:honeypot, clause_version:'v1.0-2026-04-30'})});
        var j=await r.json();
        if(j.ok){m.textContent=${JSON.stringify(t.newsletterThanks)};m.style.display='block';m.style.color='var(--muted)';f.reset();}
        else{m.textContent=(j.error||'Error');m.style.display='block';m.style.color='#a30d1f';}
      }catch(_){m.textContent='Error';m.style.display='block';m.style.color='#a30d1f';}
      finally{f.querySelector('button[type=submit]').disabled=false;}
    });
  })();
  </script>
  </div>
</section>` : ""}

${pro && teamMembers.length ? `<section class="section" data-section="team" id="equipo">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyTeam)}</p>
      <h2>${i.language === "en" ? "Our team" : "Nuestro equipo"}</h2>
    </div>
    <div class="cards">
      ${teamMembers.map((m, idx) => {
        // Avatar: real photo if uploaded, else circular SVG with member's initials.
        const memberInitials = getInitials(m.name);
        const avatar = m.photoUrl
          ? `<img src="${esc(m.photoUrl)}" alt="${esc(m.name)}" loading="lazy" decoding="async" width="200" height="200" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:12px">`
          : `<div style="width:120px;height:120px;margin-bottom:12px" aria-hidden="true">${placeholderSvg({ initials: memberInitials, color: i.primary, idx, w: 200, h: 200, kind: "avatar" })}</div>`;
        return `<div class="card">
        ${avatar}
        <h3>${esc(m.name)}</h3>
        ${m.role ? `<p style="color:var(--primary);font-weight:600;margin:4px 0">${esc(m.role)}</p>` : ""}
        ${m.bio ? `<p>${esc(m.bio)}</p>` : ""}
      </div>`;
      }).join("")}
    </div>
  </div>
</section>` : ""}

${pro && pdfDownloads.length ? `<section class="section" data-section="downloads" id="descargas">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyDownloads)}</p>
      <h2>${esc(pdfLabel)}</h2>
    </div>
    <div class="cards">
      ${pdfDownloads.map((d, idx) => `<div class="card">
        <div class="card-num">${pad2(idx + 1)}</div>
        <h3>${esc(d.label || (i.language === "en" ? "Download" : "Descarga"))}</h3>
        <p style="margin-top:12px"><a class="btn" href="${esc(d.url)}" target="_blank" rel="noopener">${i.language === "en" ? "Download PDF" : "Descargar PDF"}</a></p>
      </div>`).join("")}
    </div>
  </div>
</section>` : (pro && pdfUrl ? `<section class="section" data-section="downloads" id="descargas">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyDownloads)}</p>
      <h2>${esc(pdfLabel)}</h2>
    </div>
    <p><a class="btn" href="${esc(pdfUrl)}" target="_blank" rel="noopener">${i.language === "en" ? "Download" : "Descargar"} ${esc(pdfLabel)} (PDF)</a></p>
  </div>
</section>` : "")}

${pro && blogPosts.length ? `<section class="section" data-section="blog" id="blog">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyBlog)}</p>
      <h2>${i.language === "en" ? "Blog" : "Blog"}</h2>
    </div>
    <div class="cards">
      ${blogPosts.slice(0, 6).map(p => `<article class="card">
        <h3><a href="${esc(p.slug ? './blog/' + p.slug + '.html' : '#')}" style="color:inherit;text-decoration:none">${esc(p.title)}</a></h3>
        ${p.date ? `<p style="color:var(--muted);font-size:.85rem;margin:4px 0">${esc(p.date)}</p>` : ""}
        ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}
      </article>`).join("")}
    </div>
  </div>
</section>` : ""}

${faqs.length ? `<section class="section" data-section="faq" id="faq">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyFaq)}</p>
      <h2>${t.faq}</h2>
    </div>
    <div class="faq-list">
      ${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
    </div>
  </div>
</section>` : ""}

<!-- Lead form — Esencial section. Submits to /api/lead/<clientId>; worker forwards to client's email via Resend.
     Visual structure: split card with intro pane on the left and the form on the right.
     The HTML field structure / endpoint / honeypot / habeas-data checkbox are unchanged. -->
${leadFormEndpoint ? `<section class="section" data-section="lead-form" id="contacto">
  <div class="wrap">
    <div class="lead-form-card">
      <div class="lead-form-intro">
        <p class="eyebrow">${esc(t.eyForm)}</p>
        <h2>${esc(t.formIntro)}</h2>
        <p>${esc(t.formIntroBody)}</p>
      </div>
      <div class="lead-form-pane">
        <form id="pwp-lead-form">
          <input type="text" name="name" required placeholder="${i.language === "en" ? "Your name" : "Su nombre"}" aria-label="${i.language === "en" ? "Your name" : "Su nombre"}">
          <input type="email" name="email" required placeholder="${i.language === "en" ? "Your email" : "Su correo"}" aria-label="${i.language === "en" ? "Your email" : "Su correo"}">
          <input type="tel" name="phone" placeholder="${i.language === "en" ? "Phone (optional)" : "Teléfono (opcional)"}" aria-label="${i.language === "en" ? "Phone" : "Teléfono"}">
          <textarea name="message" required rows="4" placeholder="${i.language === "en" ? "Your message" : "Su mensaje"}" aria-label="${i.language === "en" ? "Your message" : "Su mensaje"}"></textarea>
          <input type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:.82rem;color:var(--muted);line-height:1.45;cursor:pointer">
            <input type="checkbox" name="habeas_data_accepted" required style="margin-top:3px;flex-shrink:0">
            <span>${i.language === "en"
              ? `I authorize <strong>${esc(i.businessName)}</strong> to process my data to respond to my inquiry. <a href="./privacy.html" style="color:var(--primary)">Privacy Policy</a> (Colombian Law 1581 of 2012).`
              : `Autorizo a <strong>${esc(i.businessName)}</strong> a tratar mis datos para responder mi consulta. <a href="./politica-privacidad.html" style="color:var(--primary)">Política de Privacidad</a> (Ley 1581 de 2012).`}</span>
          </label>
          <button class="btn" type="submit">${i.language === "en" ? "Send message" : "Enviar mensaje"}</button>
        </form>
        <p id="pwp-lead-msg" role="status" style="margin:12px 0 0;color:var(--muted);font-size:.9rem;display:none"></p>
      </div>
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
      if(!consent){m.textContent=${JSON.stringify(i.language === "en" ? "Please accept the Privacy Policy to send." : "Por favor acepte la Política de Privacidad para enviar.")};m.style.display='block';m.style.color='#a30d1f';return;}
      f.querySelector('button[type=submit]').disabled=true;
      try{
        var r=await fetch(${JSON.stringify(leadFormEndpoint)},{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
          name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),message:fd.get('message'),
          habeas_data_accepted:true, company_url:fd.get('company_url'), source:location.href
        })});
        var j=await r.json();
        if(j.ok){m.textContent=${JSON.stringify(i.language === "en" ? "Thanks — we'll be in touch shortly." : "Gracias — le respondemos pronto.")};m.style.display='block';m.style.color='var(--muted)';f.reset();}
        else{m.textContent=(j.error||'Error');m.style.display='block';m.style.color='#a30d1f';}
      }catch(_){m.textContent='Error';m.style.display='block';m.style.color='#a30d1f';}
      finally{f.querySelector('button[type=submit]').disabled=false;}
    });
  })();
  </script>
</section>` : ""}

${pro ? `<section class="section" data-section="about">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${esc(t.eyAbout)}</p>
      <h2>${t.about}</h2>
    </div>
    <p style="max-width:720px;font-size:1.05rem;color:var(--muted);line-height:1.7">${esc(i.industry)}. ${esc(i.tagline)}</p>
  </div>
</section>` : ""}

<section class="wrap" data-section="contact" id="contact-info">
  <div class="contact-block">
    <div>
      <p class="eyebrow on-dark">${esc(t.eyContact)}</p>
      <h2>${t.getInTouch}</h2>
      <p style="color:rgba(255,255,255,.78);max-width:420px;margin-top:8px">${esc(i.tagline)}</p>
    </div>
    <div>
      ${i.phone ? `<p><strong style="font-weight:600">${t.phone}:</strong> <a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></p>` : ""}
      ${i.email ? `<p><strong style="font-weight:600">${t.email}:</strong> <a href="mailto:${esc(i.email)}">${esc(i.email)}</a></p>` : ""}
      ${i.address ? `<p><strong style="font-weight:600">${t.address}:</strong> ${esc(i.address)}</p>` : ""}
      ${i.hours ? `<p><strong style="font-weight:600">${t.hours}:</strong> ${esc(i.hours)}</p>` : ""}
      ${i.instagram ? `<p><strong style="font-weight:600">Instagram:</strong> <a href="${esc(i.instagram)}" rel="noopener">${esc(i.instagram)}</a></p>` : ""}
      ${i.facebook ? `<p><strong style="font-weight:600">Facebook:</strong> <a href="${esc(i.facebook)}" rel="noopener">${esc(i.facebook)}</a></p>` : ""}
    </div>
  </div>
</section>
</main>

<!-- Floating WhatsApp button — opens the same waLink. Hidden on print. -->
<a class="wa-float" href="${esc(waLink)}" rel="noopener" aria-label="${t.whatsapp}">
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.385.7 4.6 1.9 6.466L4 29l7.74-1.86A11.95 11.95 0 0 0 16 27c6.628 0 12-5.373 12-12S22.629 3 16.001 3zm0 21.6a9.55 9.55 0 0 1-4.872-1.337l-.348-.207-4.59 1.103 1.131-4.476-.227-.36A9.55 9.55 0 0 1 6.4 15c0-5.292 4.308-9.6 9.6-9.6s9.6 4.308 9.6 9.6-4.308 9.6-9.6 9.6zm5.27-7.193c-.288-.144-1.703-.84-1.967-.936-.264-.096-.456-.144-.648.145-.192.288-.745.935-.913 1.127-.168.193-.336.217-.624.072-.288-.144-1.215-.448-2.314-1.428-.855-.762-1.432-1.703-1.6-1.991-.168-.288-.018-.444.126-.588.13-.13.288-.336.432-.504.144-.168.192-.288.288-.48.096-.193.048-.36-.024-.504-.072-.144-.648-1.561-.888-2.137-.234-.561-.471-.485-.648-.494l-.553-.01a1.06 1.06 0 0 0-.768.36c-.264.288-1.008.985-1.008 2.401 0 1.417 1.032 2.785 1.176 2.977.144.193 2.034 3.106 4.93 4.354.69.298 1.227.476 1.646.61.692.221 1.32.19 1.818.115.555-.083 1.703-.696 1.943-1.367.24-.672.24-1.248.168-1.367-.072-.12-.264-.193-.552-.337z"/>
  </svg>
</a>

<footer style="padding:30px 24px;color:var(--muted);font-size:.9rem;text-align:center">
  ${i.nit ? `<div style="margin-bottom:8px"><strong>${esc(i.businessName)}</strong> · NIT ${esc(i.nit)}${i.address ? ` · ${esc(i.address)}` : ""}${i.camara ? ` · ${esc(i.camara)}` : ""}</div>` : ""}
  © ${new Date().getFullYear()} ${esc(i.businessName)} · ${i.language === "en" ? "Built with PymeWebPro" : "Hecho con PymeWebPro"} ·
  ${i.language === "en"
    ? `<a href="./privacy.html">Privacy</a> · <a href="./terms.html">Terms</a>`
    : `<a href="./politica-privacidad.html">Política de Privacidad</a> · <a href="./terminos.html">Términos</a>`}
  · <a href="#" onclick="pwpManageConsent();return false">${i.language === "en" ? "Manage cookies" : "Configurar cookies"}</a>
</footer>

<!-- Cookie consent banner (Ley 1581) — gates GA4 + Meta Pixel until accept -->
<div id="pwp-consent" style="position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:18px 20px;font-family:Inter,system-ui,sans-serif;display:none;z-index:9998">
  <p style="margin:0 0 10px;font-size:.92rem;color:var(--ink)">
    ${i.language === "en"
      ? `We use <strong>analytics & marketing cookies</strong> (Google Analytics, Meta Pixel) to improve your experience. You can accept, reject, or read our <a href="./${i.language === "en" ? "privacy.html" : "politica-privacidad.html"}" style="color:var(--primary)">Privacy Policy</a>.`
      : `Usamos <strong>cookies de analítica y marketing</strong> (Google Analytics, Meta Pixel) para mejorar su experiencia. Puede aceptar, rechazar, o leer nuestra <a href="./politica-privacidad.html" style="color:var(--primary)">Política de Privacidad</a>.`}
  </p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="pwpConsent('accept')" style="background:var(--primary);color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;font:inherit">${i.language === "en" ? "Accept" : "Aceptar"}</button>
    <button onclick="pwpConsent('reject')" style="background:transparent;color:var(--primary);border:1px solid var(--primary);padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;font:inherit">${i.language === "en" ? "Reject" : "Rechazar"}</button>
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
  // Google Analytics 4
  if (cfg.ga4Id) {
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4Id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', cfg.ga4Id, { 'anonymize_ip': true });
  }
  // Meta Pixel
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
  // Mobile hamburger drawer.
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
  // Active section indicator — highlight the nav link for whichever section
  // is currently dominant in the viewport. aria-current="page" drives styling.
  if (!('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a, .mobile-nav a'));
  if (!links.length) return;
  var byHref = {};
  links.forEach(function(a){
    var h = a.getAttribute('href') || '';
    if (!byHref[h]) byHref[h] = [];
    byHref[h].push(a);
  });
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
  }, { rootMargin: '-90px 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
  sections.forEach(function(s){ io.observe(s); });
})();
</script>
</body></html>`;
}

function renderJsonLd(obj) {
  // Strip undefined keys so JSON-LD stays clean
  const clean = JSON.parse(JSON.stringify(obj));
  return `<script type="application/ld+json">${JSON.stringify(clean)}</script>`;
}

export const BLUEPRINTS = {
  "blueprint-1": renderBlueprint1,
  "blueprint-saas": renderBlueprintSaas,
  "blueprint-professional": renderBlueprintProfessional,
};

// Re-export so callers can import { renderBlueprintSaas } from blueprint.js.
export { renderBlueprintSaas, renderBlueprintProfessional };

// Industry detector — returns the blueprint key best suited for this intake.
// Precedence:
//   1) blueprint-saas (software / cloud / API signals)
//   2) blueprint-professional (lawyers, accountants, advisors, agencies)
//   3) blueprint-1 (warm cream/serif SMB default)
export function inferBlueprintKey(intake) {
  const haystack = [
    intake?.business?.bizName,
    intake?.business?.tagline,
    intake?.business?.whatYouDo,
    intake?.business?.audience,
    intake?.content?.tone,
    intake?.content?.topics,
    intake?.tech?.domain,
  ].filter(Boolean).join(" ").toLowerCase();

  const saasSignals = [
    "software", "app", "saas", "plataforma", "platform", "system", "sistema",
    "dashboard", "api", "tool", "herramienta", "integration", "automatización",
    "b2b", "enterprise", "cloud", "subscription", "suscripción", "license",
    "developer", "desarrollador", "código", "code", ".io", ".dev", ".tech",
  ];
  // Strong negative signals (override): physical-place businesses
  const smbSignals = [
    "cafetería", "café", "panadería", "restaurante", "salón", "salon", "tienda",
    "barbería", "bakery", "restaurant", "shop", "store", "boutique", "consultorio",
  ];
  // Professional-services signals: legal, accounting, financial, advisory, agencies.
  const professionalSignals = [
    "abogado", "abogada", "lawyer", "attorney", "law firm",
    "contador", "contadora", "accountant", "accounting", "contabilidad",
    "asesor", "asesora", "advisor", "consultoría", "consulting", "consultant",
    "agencia", "agency",
    "notaría", "notary",
    "auditor", "auditing",
    "financiero", "financial advisor", "wealth management",
    "tax", "impuestos",
    "estrategia", "strategy", "consultor", "advisory",
  ];

  let saasHits = 0, smbHits = 0, profHits = 0;
  for (const s of saasSignals) if (haystack.includes(s)) saasHits++;
  for (const s of smbSignals) if (haystack.includes(s)) smbHits++;
  for (const s of professionalSignals) if (haystack.includes(s)) profHits++;

  // Existing rule, untouched: SaaS wins first if it has >=2 hits and beats SMB.
  if (saasHits >= 2 && saasHits > smbHits) return "blueprint-saas";

  // Professional services next: requires >=2 prof signals AND outweighs SMB hits.
  if (profHits >= 2 && smbHits < profHits) return "blueprint-professional";

  return "blueprint-1";
}
