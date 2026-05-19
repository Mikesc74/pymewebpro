// manual-mockups-centralfarma.js — auto-rebuilt by scripts/rebuild-mockups.mjs
// Source: manual-mockups/central-farma-drogueria/index.html
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["central-farma-drogueria"].

export const centralFarmaHtml = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2E8B6A">
<meta name="robots" content="noindex, nofollow">

<title>Central Farma Droguería · Simón Bolívar, Medellín · Domicilios gratis + Inyectología</title>
<meta name="description" content="Droguería de barrio en Simón Bolívar, Medellín. Domicilios gratuitos, servicio de inyectología profesional, y todos los productos de farmacia que necesitas. Lunes a Sábado de 9 a 7. WhatsApp 302 387 7739.">

<meta property="og:title" content="Central Farma Droguería · Tu droguería de confianza en Simón Bolívar">
<meta property="og:description" content="Domicilios gratis · Inyectología profesional · Lun a Sáb 9 a 7. Calle 42 #81-20, Medellín.">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CO">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap">

<style>
/* ─── Tokens · Central Farma palette pulled from their CF wordmark + IG graphics ─── */
:root{
  --brand:        #2E8B6A;   /* CF green */
  --brand-dark:   #1F6B51;
  --brand-50:     #E8F3EE;   /* very soft tint */
  --navy:         #0E2A4D;   /* their secondary, used in IG badges */
  --navy-dark:    #061633;
  --soft-blue:    #D7E8F4;   /* the pale blue pill backgrounds in their graphics */
  --cream:        #F8EFD4;   /* their cream highlight */
  --ink:          #142B3D;
  --ink-mute:     #5A6878;
  --paper:        #FDFCF8;
  --line:         rgba(20,43,61,.10);
  --shadow-sm:    0 1px 2px rgba(14,42,77,.06), 0 1px 1px rgba(14,42,77,.04);
  --shadow-md:    0 8px 24px rgba(14,42,77,.08), 0 2px 6px rgba(14,42,77,.05);
  --radius:       14px;
  --radius-sm:    8px;
  --serif:        'Fraunces', Georgia, 'Times New Roman', serif;
  --sans:         'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

/* ─── Reset + base ─── */
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
html,body{margin:0;padding:0}
body{
  background:var(--paper);
  color:var(--ink);
  font-family:var(--sans);
  font-size:17px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
img,svg{display:block;max-width:100%}
a{color:var(--brand-dark);text-decoration:none}
a:hover{color:var(--brand)}
button{font:inherit;cursor:pointer}
h1,h2,h3{font-family:var(--serif);font-weight:600;letter-spacing:-0.015em;line-height:1.1;color:var(--navy);margin:0}
h1{font-size:clamp(2.1rem,5.2vw,3.6rem);font-variation-settings:'opsz' 144;font-weight:600}
h2{font-size:clamp(1.7rem,3.6vw,2.4rem);font-variation-settings:'opsz' 96}
h3{font-size:1.25rem;font-variation-settings:'opsz' 36;font-weight:600}
p{margin:0 0 1rem}
section{padding:5rem 0}
.wrap{max-width:1140px;margin:0 auto;padding:0 1.5rem}

/* ─── Components ─── */
.eyebrow{
  font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;
  color:var(--brand-dark);font-weight:600;
  display:inline-flex;align-items:center;gap:.5rem;
  margin:0 0 1rem;
}
.eyebrow::before{content:'';display:inline-block;width:24px;height:1.5px;background:var(--brand)}

.btn{
  display:inline-flex;align-items:center;gap:.55rem;
  padding:.85rem 1.4rem;border-radius:var(--radius-sm);
  font-weight:600;font-size:.95rem;letter-spacing:-.005em;
  border:1.5px solid transparent;cursor:pointer;
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
  white-space:nowrap;
}
.btn-primary{background:var(--brand);color:#fff;box-shadow:var(--shadow-sm)}
.btn-primary:hover{background:var(--brand-dark);color:#fff;transform:translateY(-1px);box-shadow:var(--shadow-md)}
.btn-ghost{background:transparent;color:var(--navy);border-color:var(--line)}
.btn-ghost:hover{background:var(--brand-50);color:var(--brand-dark);border-color:var(--brand)}
.btn-lg{padding:1rem 1.6rem;font-size:1rem}
.btn .ico{width:18px;height:18px;flex:0 0 18px}

.card{
  background:#fff;border:1px solid var(--line);border-radius:var(--radius);
  padding:1.75rem;box-shadow:var(--shadow-sm);
  transition:transform .15s ease, box-shadow .15s ease;
}
.card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}

/* ─── Nav ─── */
.nav{
  position:sticky;top:0;z-index:50;
  background:rgba(253,252,248,.92);
  backdrop-filter:saturate(140%) blur(10px);
  -webkit-backdrop-filter:saturate(140%) blur(10px);
  border-bottom:1px solid var(--line);
}
.nav-inner{
  display:flex;align-items:center;justify-content:space-between;
  gap:1rem;padding:.85rem 1.5rem;max-width:1140px;margin:0 auto;
}
.brand{display:inline-flex;align-items:center;gap:.65rem;color:var(--navy);font-weight:700}
.brand-mark{width:38px;height:38px;flex:0 0 38px;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--serif);font-weight:700;font-size:1.05rem;letter-spacing:-.02em;box-shadow:var(--shadow-sm)}
.brand-name{font-family:var(--serif);font-size:1.05rem;font-weight:600;color:var(--navy);font-variation-settings:'opsz' 36}
.brand-sub{font-size:.7rem;color:var(--ink-mute);letter-spacing:.08em;text-transform:uppercase;display:block;margin-top:1px}
.brand-text{display:flex;flex-direction:column;line-height:1.15}

.nav-links{display:flex;align-items:center;gap:.3rem;list-style:none;margin:0;padding:0}
.nav-links a{
  padding:.45rem .8rem;border-radius:6px;font-size:.86rem;color:var(--navy);
  font-weight:500;letter-spacing:-.005em;
}
.nav-links a:hover{background:var(--brand-50);color:var(--brand-dark)}

.nav-cta{display:flex;align-items:center;gap:.5rem}

@media (max-width: 780px){
  .nav-links{display:none}
}

/* ─── Hero ─── */
.hero{padding:4rem 0 3.5rem;position:relative;overflow:hidden}
.hero-grid{
  display:grid;grid-template-columns:1.15fr .85fr;gap:3.5rem;
  align-items:center;
}
.hero h1{margin-bottom:1.25rem}
.hero p.lead{font-size:1.12rem;color:var(--ink);max-width:520px;margin-bottom:2rem}
.hero-ctas{display:flex;gap:.7rem;flex-wrap:wrap;margin-bottom:2rem}
.trust-strip{
  display:flex;flex-wrap:wrap;gap:.4rem .8rem;
  font-size:.85rem;color:var(--ink-mute);
}
.trust-strip span{display:inline-flex;align-items:center;gap:.4rem}
.trust-strip .dot{width:4px;height:4px;border-radius:50%;background:var(--brand);display:inline-block}

/* Brand graphic (right side of hero) */
.hero-graphic{
  position:relative;aspect-ratio:1/1;max-width:380px;margin-left:auto;
  display:flex;align-items:center;justify-content:center;
}
.hero-graphic .ring{
  position:absolute;inset:0;border-radius:50%;
  background:radial-gradient(circle at 30% 25%, var(--brand) 0%, var(--brand-dark) 75%);
  box-shadow:0 30px 60px -20px rgba(46,139,106,.45), inset 0 -4px 12px rgba(0,0,0,.12);
}
.hero-graphic .ring::after{
  content:'';position:absolute;inset:8px;border-radius:50%;
  border:2px solid rgba(255,255,255,.18);
}
.hero-graphic .monogram{
  position:relative;z-index:2;
  font-family:var(--serif);font-weight:700;font-size:clamp(7rem, 18vw, 11rem);
  color:#fff;letter-spacing:-.06em;line-height:.85;
  text-shadow:0 4px 14px rgba(0,0,0,.18);
  font-variation-settings:'opsz' 144;
}
.hero-graphic .icon-dot{position:absolute;color:rgba(255,255,255,.32)}
.hero-graphic .icon-dot.a{top:14%;right:8%;width:28px;height:28px}
.hero-graphic .icon-dot.b{bottom:18%;left:6%;width:36px;height:36px}
.hero-graphic .icon-dot.c{top:55%;right:-2%;width:22px;height:22px}
.hero-graphic .icon-dot.d{top:8%;left:18%;width:18px;height:18px;color:rgba(248,239,212,.55)}

@media (max-width: 880px){
  .hero{padding:2.5rem 0 2rem}
  .hero-grid{grid-template-columns:1fr;gap:2.5rem;text-align:left}
  .hero-graphic{margin:0 auto 0 0;max-width:280px}
}

/* ─── Servicios ─── */
.services{background:var(--brand-50);position:relative}
.services::before,.services::after{content:'';position:absolute;left:0;right:0;height:1px;background:var(--line)}
.services::before{top:0}
.services::after{bottom:0}
.svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-top:2.5rem}
.svc-card .ico-wrap{
  width:52px;height:52px;border-radius:12px;background:var(--brand);
  color:#fff;display:flex;align-items:center;justify-content:center;
  margin-bottom:1.1rem;
}
.svc-card .ico-wrap svg{width:26px;height:26px}
.svc-card h3{margin-bottom:.5rem}
.svc-card p{color:var(--ink-mute);font-size:.95rem;margin:0}

@media (max-width: 780px){.svc-grid{grid-template-columns:1fr;gap:1rem}}

/* ─── Inyectología (deep-dive section, the differentiator) ─── */
.inyect{background:var(--paper)}
.inyect-grid{
  display:grid;grid-template-columns:1.1fr .9fr;gap:3rem;align-items:start;
  margin-top:2rem;
}
.inyect h2{margin-bottom:1rem}
.inyect .lead{font-size:1.08rem;color:var(--ink);max-width:560px;margin-bottom:1.5rem}
.inyect .price-note{
  margin-top:1.5rem;padding:1.1rem 1.25rem;
  background:var(--cream);border-radius:var(--radius-sm);
  font-size:.95rem;color:var(--navy);
}
.inyect .price-note strong{color:var(--navy-dark)}

.checklist{
  list-style:none;margin:0;padding:1.75rem;
  background:#fff;border:1px solid var(--line);border-radius:var(--radius);
}
.checklist h3{font-size:1rem;color:var(--navy);margin-bottom:1rem;
  font-family:var(--sans);font-weight:600;letter-spacing:-.005em;text-transform:uppercase;font-size:.78rem;letter-spacing:.1em}
.checklist li{
  display:flex;gap:.7rem;padding:.6rem 0;border-bottom:1px solid var(--line);
  color:var(--ink);font-size:.95rem;
}
.checklist li:last-child{border-bottom:none}
.checklist li::before{
  content:'';flex:0 0 18px;width:18px;height:18px;border-radius:50%;
  background:var(--brand-50);
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232E8B6A' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>");
  background-size:11px 11px;background-position:center;background-repeat:no-repeat;
  margin-top:3px;
}

@media (max-width: 880px){.inyect-grid{grid-template-columns:1fr;gap:2rem}}

/* ─── Domicilios ─── */
.domic{background:var(--navy);color:rgba(255,255,255,.92);position:relative;overflow:hidden}
.domic h2,.domic h3{color:#fff}
.domic .eyebrow{color:var(--cream)}
.domic .eyebrow::before{background:var(--cream)}
.domic .lead{font-size:1.08rem;max-width:600px;color:rgba(255,255,255,.85);margin-bottom:2.5rem}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:1.5rem}
.step{position:relative;padding:1.75rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:var(--radius)}
.step-num{
  position:absolute;top:1.25rem;right:1.25rem;
  font-family:var(--serif);font-weight:700;font-size:2rem;color:rgba(216,232,244,.22);
  line-height:1;font-variation-settings:'opsz' 144;
}
.step h3{font-size:1.05rem;margin-bottom:.6rem;color:#fff}
.step p{color:rgba(255,255,255,.72);font-size:.92rem;margin:0;line-height:1.55}
.coverage{
  margin-top:2.5rem;display:flex;flex-wrap:wrap;gap:.6rem;
  font-size:.85rem;color:rgba(255,255,255,.72);
}
.coverage-pill{padding:.35rem .8rem;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:99px;color:rgba(255,255,255,.88)}

@media (max-width: 780px){.steps{grid-template-columns:1fr}}

/* ─── Visítanos ─── */
.visit{background:var(--paper)}
.visit-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:3rem;margin-top:2.5rem;align-items:start}
.info-cards{display:flex;flex-direction:column;gap:1rem}
.info-card{
  display:grid;grid-template-columns:44px 1fr;gap:1rem;
  padding:1.25rem 1.4rem;background:#fff;border:1px solid var(--line);
  border-radius:var(--radius);box-shadow:var(--shadow-sm);
}
.info-card .ico-wrap{
  width:44px;height:44px;border-radius:10px;background:var(--brand-50);
  color:var(--brand-dark);display:flex;align-items:center;justify-content:center;
}
.info-card .ico-wrap svg{width:22px;height:22px}
.info-card .label{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute);font-weight:600;margin-bottom:.25rem}
.info-card .value{font-size:1rem;color:var(--ink);font-weight:500;line-height:1.4}
.info-card a.value{color:var(--brand-dark)}
.info-card a.value:hover{color:var(--navy)}

.visit-cta{
  background:linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%);
  color:#fff;border-radius:var(--radius);padding:2rem;box-shadow:var(--shadow-md);
  position:relative;overflow:hidden;
}
.visit-cta::before{
  content:'';position:absolute;width:200px;height:200px;border-radius:50%;
  border:1.5px solid rgba(255,255,255,.12);top:-40px;right:-60px;
}
.visit-cta h3{color:#fff;font-size:1.4rem;margin-bottom:.6rem;position:relative}
.visit-cta p{color:rgba(255,255,255,.85);font-size:.95rem;margin-bottom:1.4rem;position:relative}
.visit-cta .btn{background:#fff;color:var(--brand-dark);border-color:#fff;position:relative}
.visit-cta .btn:hover{background:var(--cream);color:var(--navy-dark)}

@media (max-width: 880px){.visit-grid{grid-template-columns:1fr;gap:2rem}}

/* ─── Footer ─── */
footer{background:var(--navy-dark);color:rgba(255,255,255,.72);padding:3rem 0 2rem;font-size:.9rem}
.foot-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:2.5rem;margin-bottom:2.5rem}
footer .brand{color:#fff;margin-bottom:1rem}
footer .brand-name{color:#fff}
footer .brand-sub{color:rgba(255,255,255,.5)}
footer h4{font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.95);margin:0 0 1rem;font-weight:600}
footer ul{list-style:none;margin:0;padding:0}
footer li{padding:.25rem 0;color:rgba(255,255,255,.7)}
footer a{color:rgba(255,255,255,.85)}
footer a:hover{color:var(--cream)}
.foot-bottom{
  border-top:1px solid rgba(255,255,255,.10);padding-top:1.5rem;
  display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;
  font-size:.78rem;color:rgba(255,255,255,.5);
}
.foot-bottom a{color:rgba(255,255,255,.7)}

@media (max-width: 780px){.foot-grid{grid-template-columns:1fr;gap:2rem}}

/* ─── Chat widget (commit 1 placeholder · graceful WhatsApp fallback until commit 3 lands generic /api/chat/:slug) ─── */
.chat-fab{
  position:fixed;bottom:1.5rem;right:1.5rem;z-index:60;
  width:60px;height:60px;border-radius:50%;
  background:var(--brand);color:#fff;border:none;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 12px 28px rgba(46,139,106,.45), 0 4px 8px rgba(46,139,106,.25);
  transition:transform .2s ease, background .2s ease;
}
.chat-fab:hover{background:var(--brand-dark);transform:scale(1.05)}
.chat-fab:focus-visible{outline:3px solid var(--cream);outline-offset:3px}
.chat-fab svg{width:28px;height:28px}
.chat-fab .label{position:absolute;right:74px;bottom:50%;transform:translateY(50%);background:var(--navy-dark);color:#fff;font-size:.8rem;padding:.5rem .85rem;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s ease;font-weight:500}
.chat-fab:hover .label{opacity:1}
.chat-fab .label::after{content:'';position:absolute;top:50%;right:-5px;transform:translateY(-50%);width:0;height:0;border-left:5px solid var(--navy-dark);border-top:5px solid transparent;border-bottom:5px solid transparent}

/* Accessibility · honor reduced motion */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}
}

/* Print · clean reader version */
@media print{
  .nav,.chat-fab,.hero-graphic,footer{display:none}
  body{background:#fff;color:#000}
  section{padding:1rem 0;page-break-inside:avoid}
}
</style>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Pharmacy",
  "name": "Central Farma Droguería",
  "description": "Droguería de barrio en Simón Bolívar, Medellín. Domicilios gratuitos, servicio de inyectología profesional, y productos de farmacia.",
  "url": "https://mockups.pymewebpro.com/central-farma-drogueria/",
  "telephone": "+57 302 387 7739",
  "image": "https://mockups.pymewebpro.com/central-farma-drogueria/",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Calle 42 #81-20",
    "addressLocality": "Medellín",
    "addressRegion": "Antioquia",
    "postalCode": "050023",
    "addressCountry": "CO"
  },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "09:00",
    "closes": "19:00"
  }],
  "sameAs": ["https://www.instagram.com/centralfarmamed"]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Inyectología",
  "provider": {
    "@type": "Pharmacy",
    "name": "Central Farma Droguería"
  },
  "areaServed": {
    "@type": "City",
    "name": "Medellín"
  },
  "description": "Aplicación profesional de inyecciones intramusculares e intravenosas, con personal capacitado."
}
</script>
</head>
<body>

<!-- ─── Nav ─── -->
<header class="nav" aria-label="Navegación principal">
  <div class="nav-inner">
    <a href="#top" class="brand" aria-label="Central Farma Droguería · inicio">
      <span class="brand-mark" aria-hidden="true">CF</span>
      <span class="brand-text">
        <span class="brand-name">Central Farma</span>
        <span class="brand-sub">Droguería · Medellín</span>
      </span>
    </a>
    <nav>
      <ul class="nav-links">
        <li><a href="#servicios">Servicios</a></li>
        <li><a href="#inyectologia">Inyectología</a></li>
        <li><a href="#domicilios">Domicilios</a></li>
        <li><a href="#visitanos">Visítanos</a></li>
      </ul>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-primary" href="https://wa.me/573023877739?text=Hola%20Central%20Farma%2C%20quiero%20hacer%20un%20pedido" rel="noopener" aria-label="Pedir por WhatsApp">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        Pedir por WhatsApp
      </a>
    </div>
  </div>
</header>

<main id="top">

<!-- ─── Hero ─── -->
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <span class="eyebrow">Droguería · Simón Bolívar, Medellín</span>
      <h1>Tu droguería de confianza en el barrio.</h1>
      <p class="lead">Domicilios gratuitos, servicio de inyectología profesional y todo lo que necesitas para el cuidado de tu familia. Pídenos por WhatsApp y nosotros llegamos hasta tu puerta.</p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="https://wa.me/573023877739?text=Hola%20Central%20Farma%2C%20quiero%20hacer%20un%20pedido" rel="noopener">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          Pide o cotiza por WhatsApp
        </a>
        <a class="btn btn-ghost btn-lg" href="#servicios">
          Ver servicios
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>
      </div>
      <div class="trust-strip" aria-label="Resumen de servicios">
        <span><span class="dot"></span>Domicilios gratis</span>
        <span><span class="dot"></span>Inyectología profesional</span>
        <span><span class="dot"></span>Lun a Sáb · 9 a 7</span>
      </div>
    </div>

    <div class="hero-graphic" aria-hidden="true">
      <div class="ring"></div>
      <div class="monogram">CF</div>
      <svg class="icon-dot a" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9 2 7 4 7 7v3H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3h-1V7c0-3-2-5-5-5zm0 2c2 0 3 1.3 3 3v3H9V7c0-1.7 1-3 3-3z"/></svg>
      <svg class="icon-dot b" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-5-7-11a7 7 0 0 1 14 0c0 6-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
      <svg class="icon-dot c" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="9" width="18" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/></svg>
      <svg class="icon-dot d" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    </div>
  </div>
</section>

<!-- ─── Servicios ─── -->
<section id="servicios" class="services">
  <div class="wrap">
    <span class="eyebrow">Qué hacemos</span>
    <h2>Tres servicios, todos en el mismo lugar.</h2>

    <div class="svc-grid">
      <article class="card svc-card">
        <div class="ico-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="15" height="13" rx="1.5"/><path d="M16 9h4l3 3v6a1 1 0 0 1-1 1h-1"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="19" r="2.2"/></svg>
        </div>
        <h3>Domicilios gratuitos</h3>
        <p>Pídenos por WhatsApp y recibe en tu casa. Sin mínimo de pedido, sin cargo de envío en nuestra zona de cobertura en Simón Bolívar y barrios aledaños.</p>
      </article>

      <article class="card svc-card">
        <div class="ico-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18.5" y1="2" x2="22" y2="5.5"/><line x1="15" y1="5" x2="19" y2="9"/><path d="M5 19l-2 2"/><path d="M14.5 7L4 17.5 6.5 20 17 9.5"/><path d="M11 9l3 3"/></svg>
        </div>
        <h3>Inyectología profesional</h3>
        <p>Aplicación segura de inyecciones intramusculares e intravenosas, con personal capacitado y prácticas higiénicas estrictas. Trae tu receta médica.</p>
      </article>

      <article class="card svc-card">
        <div class="ico-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="9" height="10" rx="4.5"/><path d="M6.5 7v10"/><rect x="13" y="7" width="9" height="10" rx="4.5"/></svg>
        </div>
        <h3>Productos de farmacia</h3>
        <p>Medicamentos con y sin fórmula, cuidado personal, primeros auxilios, vitaminas, productos para el bebé y artículos de bienestar diario.</p>
      </article>
    </div>
  </div>
</section>

<!-- ─── Inyectología deep-dive ─── -->
<section id="inyectologia" class="inyect">
  <div class="wrap">
    <div class="inyect-grid">
      <div>
        <span class="eyebrow">El servicio que más nos piden</span>
        <h2>Inyectología, hecha con calma y profesionalismo.</h2>
        <p class="lead">Atendemos la aplicación de inyecciones recetadas por tu médico: antibióticos, vitaminas, refuerzos vitamínicos, y casos puntuales. Nuestro personal cumple con los protocolos de bioseguridad y trabaja con material desechable individual.</p>
        <p>Si no estás seguro de algo, escríbenos antes de venir. Te confirmamos por WhatsApp si podemos atender tu caso y qué necesitas traer.</p>
        <div class="price-note">
          <strong>¿Cuánto cuesta?</strong> El costo depende del tipo de aplicación. Escríbenos por WhatsApp con la información de tu receta y te damos el valor exacto antes de tu visita.
        </div>
      </div>
      <aside class="checklist" aria-label="Qué traer">
        <h3>Qué traer a tu visita</h3>
        <ul>
          <li>Tu fórmula o receta médica vigente.</li>
          <li>El medicamento o ampolla a aplicar.</li>
          <li>Documento de identidad.</li>
          <li>Si es para un menor de edad, ven con un adulto responsable.</li>
          <li>Si tienes dudas, escríbenos primero por WhatsApp.</li>
        </ul>
      </aside>
    </div>
  </div>
</section>

<!-- ─── Domicilios ─── -->
<section id="domicilios" class="domic">
  <div class="wrap">
    <span class="eyebrow">Domicilios</span>
    <h2>Pide y recibe sin moverte de casa.</h2>
    <p class="lead">Cobertura gratuita en Simón Bolívar y barrios cercanos. Hacemos el pedido contigo paso a paso por WhatsApp, así no se te olvida nada y confirmamos disponibilidad en el momento.</p>

    <div class="steps">
      <div class="step">
        <span class="step-num">01</span>
        <h3>Escríbenos</h3>
        <p>Mándanos un mensaje por WhatsApp con lo que necesitas. Puedes enviar foto de la receta o la lista en texto.</p>
      </div>
      <div class="step">
        <span class="step-num">02</span>
        <h3>Confirmamos</h3>
        <p>Te confirmamos disponibilidad, total a pagar y tiempo estimado. Tú decides cómo pagar al recibir.</p>
      </div>
      <div class="step">
        <span class="step-num">03</span>
        <h3>Llegamos a tu casa</h3>
        <p>Te lo entregamos directamente en la puerta. Sin costo de envío en nuestra zona habitual de cobertura.</p>
      </div>
    </div>

    <div class="coverage">
      <span class="coverage-pill">Simón Bolívar</span>
      <span class="coverage-pill">Sectores aledaños</span>
      <span class="coverage-pill">Sin mínimo de pedido</span>
      <span class="coverage-pill">Sin costo de envío</span>
    </div>
  </div>
</section>

<!-- ─── Visítanos ─── -->
<section id="visitanos" class="visit">
  <div class="wrap">
    <span class="eyebrow">Pásate por la tienda</span>
    <h2>Estamos a una llamada de distancia.</h2>

    <div class="visit-grid">
      <div class="info-cards">
        <div class="info-card">
          <div class="ico-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5-7-11a7 7 0 0 1 14 0c0 6-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          </div>
          <div>
            <div class="label">Dirección</div>
            <div class="value">Calle 42 #81-20<br>Simón Bolívar, Medellín, Antioquia 050023</div>
          </div>
        </div>

        <div class="info-card">
          <div class="ico-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div class="label">Horario</div>
            <div class="value">Lunes a Sábado · 9:00 a.m. a 7:00 p.m.<br><span style="color:var(--ink-mute);font-size:.88rem">Domingo cerrado</span></div>
          </div>
        </div>

        <div class="info-card">
          <div class="ico-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <div>
            <div class="label">WhatsApp</div>
            <a class="value" href="https://wa.me/573023877739" rel="noopener">+57 302 387 7739</a>
          </div>
        </div>

        <div class="info-card">
          <div class="ico-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/></svg>
          </div>
          <div>
            <div class="label">Instagram</div>
            <a class="value" href="https://www.instagram.com/centralfarmamed" rel="noopener">@centralfarmamed</a>
          </div>
        </div>
      </div>

      <div class="visit-cta">
        <h3>¿Lista la lista?</h3>
        <p>Escríbenos por WhatsApp y te confirmamos disponibilidad, total y tiempo de entrega. Sin compromiso.</p>
        <a class="btn btn-lg" href="https://wa.me/573023877739?text=Hola%20Central%20Farma%2C%20quiero%20cotizar" rel="noopener">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          Pide o cotiza
        </a>
      </div>
    </div>
  </div>
</section>

</main>

<!-- ─── Footer ─── -->
<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a href="#top" class="brand" aria-label="Central Farma · inicio">
          <span class="brand-mark" aria-hidden="true">CF</span>
          <span class="brand-text">
            <span class="brand-name">Central Farma</span>
            <span class="brand-sub">Droguería · Medellín</span>
          </span>
        </a>
        <p style="color:rgba(255,255,255,.6);font-size:.88rem;margin-top:1rem;max-width:320px">Tu droguería de confianza en Simón Bolívar. Domicilios, inyectología y productos para el cuidado de tu familia.</p>
      </div>

      <div>
        <h4>Visítanos</h4>
        <ul>
          <li>Calle 42 #81-20</li>
          <li>Simón Bolívar, Medellín</li>
          <li>Antioquia 050023</li>
          <li style="margin-top:.5rem">Lun a Sáb · 9 a.m. a 7 p.m.</li>
        </ul>
      </div>

      <div>
        <h4>Contáctanos</h4>
        <ul>
          <li><a href="https://wa.me/573023877739" rel="noopener">WhatsApp · 302 387 7739</a></li>
          <li><a href="https://www.instagram.com/centralfarmamed" rel="noopener">Instagram · @centralfarmamed</a></li>
        </ul>
      </div>
    </div>

    <div class="foot-bottom">
      <span>© <span id="year">2026</span> Central Farma Droguería · Medellín, Colombia</span>
      <span>Sitio web por <a href="https://pymewebpro.com" rel="noopener">PymeWebPro</a></span>
    </div>
  </div>
</footer>

<!-- ─── Floating WhatsApp button · placeholder for the AI chat agent landing in commit 3 ─── -->
<a class="chat-fab" href="https://wa.me/573023877739?text=Hola%20Central%20Farma%2C%20quiero%20preguntar%20algo" rel="noopener" aria-label="Habla con nosotros por WhatsApp">
  <span class="label">Habla con nosotros</span>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
</a>

<script>
// Year stamp in footer · tiny inline script, no external requests.
document.getElementById('year').textContent = new Date().getFullYear();
</script>

</body>
</html>

`;
