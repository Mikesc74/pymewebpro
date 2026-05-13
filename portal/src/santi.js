// santi.pymewebpro.com · sales enablement single-page site for Santiago.
// Served by the pymewebpro-portal Worker when the request hostname matches.
// No external dependencies. All CSS inline. Bilingual (ES + EN) via a
// language toggle in the header. House style: no em dashes, no marketing-speak,
// real numbers (COP $390k Essential, COP $690k Pro, COP $150k/yr renewal).

export function santiPageHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Santi · PymeWebPro · Sitios web en 48 horas para PYMES</title>
<meta name="description" content="Sitios web profesionales para PYMES en Colombia y LATAM. Entrega en 48 horas. Desde COP $390.000. 1 ano de hosting y soporte incluidos." />
<meta property="og:title" content="Santi · PymeWebPro" />
<meta property="og:description" content="Sitios web profesionales en 48 horas. Desde COP $390.000." />
<meta property="og:image" content="https://pymewebpro.com/og-image.jpg" />
<style>
:root {
  --ink: #1A2032;
  --ink-soft: #5A6478;
  --bg: #FAFAF7;
  --accent: #FF5C2E;
  --accent-dark: #E84A1A;
  --line: #E5E2DA;
  --green: #16A34A;
  --blue: #2563EB;
  --amber: #D97706;
  --red: #DC2626;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 16px; line-height: 1.55;
  color: var(--ink); background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
.serif { font-family: Georgia, "Times New Roman", serif; font-weight: 400; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; }
img { max-width: 100%; height: auto; display: block; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* ===== Header ===== */
header.top {
  position: sticky; top: 0; z-index: 50;
  background: rgba(10,14,39,0.95);
  backdrop-filter: blur(8px);
  color: white;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
header.top .row {
  display: flex; align-items: center; gap: 1.25rem;
  max-width: 1100px; margin: 0 auto; padding: 0 1.25rem;
}
header.top .brand {
  display: flex; align-items: baseline; gap: 0.4rem;
  font-family: Georgia, serif; font-size: 1.05rem;
}
header.top .brand b { color: var(--accent); }
header.top .brand .santi {
  font-size: 0.7rem; color: rgba(255,255,255,0.55);
  text-transform: uppercase; letter-spacing: 0.12em;
  padding: 2px 8px; background: rgba(255,255,255,0.06);
  border-radius: 3px; margin-left: 0.5rem; font-family: inherit;
}
header.top nav {
  display: flex; gap: 1rem; margin-left: auto;
  font-size: 0.85rem;
}
header.top nav a {
  color: rgba(255,255,255,0.7); text-decoration: none;
}
header.top nav a:hover { color: var(--accent); }
header.top .lang {
  display: flex; gap: 2px; background: rgba(255,255,255,0.08);
  padding: 2px; border-radius: 4px;
}
header.top .lang button {
  background: transparent; border: none; color: rgba(255,255,255,0.6);
  padding: 0.25rem 0.55rem; font-size: 0.75rem;
  cursor: pointer; font-family: inherit; border-radius: 3px;
  letter-spacing: 0.05em;
}
header.top .lang button.active {
  background: var(--accent); color: white; font-weight: 700;
}
header.top a.wa-mini {
  background: #25D366; color: white !important;
  padding: 0.4rem 0.85rem; border-radius: 4px;
  font-size: 0.8rem; font-weight: 600; text-decoration: none;
  display: inline-flex; align-items: center; gap: 0.35rem;
}
header.top a.wa-mini:hover { background: #1FA851; text-decoration: none; }
@media (max-width: 720px) {
  header.top nav { display: none; }
}

/* ===== Hero ===== */
.hero {
  background: linear-gradient(140deg, #0A0E27 0%, #1A2032 60%, #2D2A1F 100%);
  color: white;
  padding: 4rem 0 5rem;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: ""; position: absolute; right: -120px; top: -120px;
  width: 400px; height: 400px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,92,46,0.3) 0%, transparent 70%);
}
.hero .wrap { position: relative; z-index: 1; }
.hero .tag {
  display: inline-block;
  background: rgba(255,92,46,0.18);
  color: var(--accent);
  padding: 0.35rem 0.8rem;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1.25rem;
}
.hero h1 {
  font-family: Georgia, serif;
  font-weight: 400;
  font-size: 3rem; line-height: 1.1;
  margin: 0 0 1rem;
  max-width: 800px;
}
.hero h1 .accent { color: var(--accent); }
.hero p.lead {
  font-size: 1.2rem; line-height: 1.5;
  color: rgba(255,255,255,0.78);
  max-width: 640px;
  margin: 0 0 2rem;
}
.hero .ctas {
  display: flex; gap: 0.75rem; flex-wrap: wrap;
}
.btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.9rem 1.5rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: transform 0.1s, background 0.15s;
  border: none; cursor: pointer; font-family: inherit;
}
.btn:hover { text-decoration: none; transform: translateY(-1px); }
.btn-primary { background: var(--accent); color: white !important; }
.btn-primary:hover { background: var(--accent-dark); }
.btn-wa { background: #25D366; color: white !important; }
.btn-wa:hover { background: #1FA851; }
.btn-ghost {
  background: transparent;
  color: white !important;
  border: 1px solid rgba(255,255,255,0.25);
}
.btn-ghost:hover { background: rgba(255,255,255,0.06); }
.hero .stats {
  display: flex; gap: 2rem; margin-top: 3rem; flex-wrap: wrap;
}
.hero .stats .stat {
  border-left: 2px solid var(--accent);
  padding-left: 0.85rem;
}
.hero .stats .num {
  font-family: Georgia, serif;
  font-size: 2.2rem; font-weight: 400;
  line-height: 1; color: white;
}
.hero .stats .label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 0.3rem;
}
@media (max-width: 640px) {
  .hero { padding: 3rem 0 3.5rem; }
  .hero h1 { font-size: 2.1rem; }
  .hero p.lead { font-size: 1.05rem; }
  .hero .stats { gap: 1.25rem; }
  .hero .stats .num { font-size: 1.7rem; }
}

/* ===== Pillars ===== */
.pillars {
  background: white;
  padding: 4rem 0;
  border-bottom: 1px solid var(--line);
}
.pillars-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}
.pillar {
  text-align: center;
}
.pillar .ic {
  width: 56px; height: 56px;
  background: rgba(255,92,46,0.1);
  color: var(--accent);
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  margin-bottom: 1rem;
}
.pillar h3 {
  font-family: Georgia, serif;
  font-weight: 400; font-size: 1.35rem;
  margin: 0 0 0.5rem;
}
.pillar p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.95rem;
}
@media (max-width: 720px) {
  .pillars-grid { grid-template-columns: 1fr; gap: 1.5rem; }
  .pillars { padding: 2.5rem 0; }
}

/* ===== Section ===== */
section.s { padding: 4.5rem 0; }
section.s.alt { background: white; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
section.s h2 {
  font-family: Georgia, serif;
  font-weight: 400;
  font-size: 2.3rem; line-height: 1.15;
  margin: 0 0 0.5rem;
}
section.s .sub {
  color: var(--ink-soft);
  font-size: 1.05rem;
  margin: 0 0 2rem;
  max-width: 700px;
}
@media (max-width: 640px) {
  section.s { padding: 3rem 0; }
  section.s h2 { font-size: 1.7rem; }
}

/* ===== Pricing ===== */
.pricing-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
.plan {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 2rem;
  position: relative;
  display: flex; flex-direction: column;
}
.plan.pro {
  border-color: var(--accent);
  box-shadow: 0 6px 20px rgba(255,92,46,0.1);
}
.plan .badge {
  position: absolute; top: -12px; right: 16px;
  background: var(--accent); color: white;
  padding: 0.3rem 0.8rem;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  border-radius: 12px;
}
.plan h3 {
  font-family: Georgia, serif;
  font-weight: 400;
  font-size: 1.7rem;
  margin: 0 0 0.25rem;
}
.plan .price {
  font-family: Georgia, serif;
  font-size: 2.5rem; line-height: 1;
  margin: 0.5rem 0 0.25rem;
  color: var(--ink);
}
.plan .price small {
  font-size: 1rem; color: var(--ink-soft);
  font-family: inherit;
}
.plan .meta {
  color: var(--ink-soft); font-size: 0.85rem;
  margin: 0 0 1.25rem;
}
.plan ul {
  list-style: none; padding: 0; margin: 0 0 1.5rem;
  flex: 1;
}
.plan ul li {
  padding: 0.5rem 0 0.5rem 1.7rem;
  position: relative;
  font-size: 0.93rem;
  border-bottom: 1px solid var(--line);
}
.plan ul li:last-child { border-bottom: none; }
.plan ul li::before {
  content: "✓"; position: absolute; left: 0; top: 0.5rem;
  color: var(--green); font-weight: 700;
}
.plan ul li.no::before { content: "·"; color: var(--ink-soft); }
.plan ul li.highlight {
  background: rgba(255,92,46,0.06);
  margin: 0 -1rem; padding-left: 2.7rem; padding-right: 1rem;
  border-radius: 4px;
}
.plan ul li.highlight::before { left: 1rem; }
.plan .cta-row { display: flex; gap: 0.5rem; }
@media (max-width: 720px) {
  .pricing-grid { grid-template-columns: 1fr; }
  .plan { padding: 1.5rem; }
  .plan .price { font-size: 2rem; }
}

/* ===== Timeline ===== */
.timeline {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0;
  overflow: hidden;
}
.timeline-row {
  display: grid;
  grid-template-columns: 130px 1fr 160px;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--line);
  align-items: start;
}
.timeline-row:last-child { border-bottom: none; }
.timeline-row .when {
  font-weight: 700; color: var(--accent);
  letter-spacing: 0.05em; font-size: 0.85rem;
  text-transform: uppercase;
}
.timeline-row .who {
  font-size: 0.78rem; color: var(--ink-soft);
  text-transform: uppercase; letter-spacing: 0.06em;
  text-align: right;
}
.timeline-row .what { font-size: 0.95rem; }
.timeline-row .what b { color: var(--ink); }
@media (max-width: 720px) {
  .timeline-row { grid-template-columns: 1fr; gap: 0.3rem; padding: 1rem; }
  .timeline-row .who { text-align: left; }
}

/* ===== Examples ===== */
.examples-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.example {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1.5rem;
  text-decoration: none !important;
  color: inherit;
  transition: transform 0.15s, box-shadow 0.15s;
  display: block;
}
.example:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  text-decoration: none !important;
}
.example .domain {
  font-family: Georgia, serif;
  font-size: 1.3rem;
  margin: 0 0 0.4rem;
  color: var(--accent);
}
.example .desc {
  color: var(--ink-soft);
  font-size: 0.88rem;
  margin: 0 0 0.6rem;
}
.example .pill {
  display: inline-block;
  background: rgba(22,163,74,0.1); color: var(--green);
  padding: 2px 8px; border-radius: 10px;
  font-size: 0.7rem; font-weight: 700;
}
@media (max-width: 720px) { .examples-grid { grid-template-columns: 1fr; } }

/* ===== Comparison ===== */
.compare {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow-x: auto;
}
.compare table {
  width: 100%; border-collapse: collapse; min-width: 720px;
}
.compare th, .compare td {
  padding: 0.85rem 1rem;
  text-align: center;
  border-bottom: 1px solid var(--line);
  font-size: 0.88rem;
}
.compare th {
  background: #FAFAF7;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.compare th.us {
  background: var(--accent); color: white;
}
.compare td:first-child {
  text-align: left;
  font-weight: 600;
}
.compare td.us {
  background: rgba(255,92,46,0.05);
  font-weight: 600;
  color: var(--accent);
}
.compare td.ok { color: var(--green); font-weight: 700; }
.compare td.bad { color: var(--red); }

/* ===== FAQ ===== */
.faq-list { display: flex; flex-direction: column; gap: 0.6rem; }
details.faq {
  background: white;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0;
}
details.faq summary {
  list-style: none;
  cursor: pointer;
  padding: 1rem 1.25rem;
  font-weight: 600;
  display: flex; justify-content: space-between; align-items: center;
  gap: 1rem;
}
details.faq summary::-webkit-details-marker { display: none; }
details.faq summary::after {
  content: "+"; font-size: 1.5rem; color: var(--accent);
  font-weight: 400; line-height: 1;
}
details.faq[open] summary::after { content: "−"; }
details.faq .answer {
  padding: 0 1.25rem 1.25rem;
  color: var(--ink-soft);
  font-size: 0.95rem;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
}

/* ===== Final CTA ===== */
.final-cta {
  background: linear-gradient(140deg, #FF5C2E 0%, #E84A1A 100%);
  color: white;
  padding: 4rem 0;
  text-align: center;
}
.final-cta h2 {
  font-family: Georgia, serif; font-weight: 400;
  font-size: 2.5rem; line-height: 1.15;
  margin: 0 0 0.5rem;
}
.final-cta p {
  font-size: 1.1rem; opacity: 0.95;
  max-width: 600px; margin: 0 auto 1.75rem;
}
.final-cta .btn-wa {
  background: white; color: var(--accent) !important;
  padding: 1rem 1.75rem; font-size: 1rem;
}
.final-cta .btn-wa:hover { background: #FFF6F2; }
.final-cta .santi-note {
  margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.85;
}
@media (max-width: 640px) {
  .final-cta h2 { font-size: 1.7rem; }
}

/* ===== Footer ===== */
footer.foot {
  background: var(--ink);
  color: rgba(255,255,255,0.55);
  padding: 2.5rem 0;
  font-size: 0.85rem;
}
footer.foot .row {
  display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 2rem;
}
footer.foot a { color: rgba(255,255,255,0.8); }
footer.foot h4 {
  color: white; font-size: 0.8rem; text-transform: uppercase;
  letter-spacing: 0.1em; margin: 0 0 0.75rem;
}
footer.foot .legal {
  border-top: 1px solid rgba(255,255,255,0.1);
  margin-top: 2rem; padding-top: 1.5rem;
  font-size: 0.75rem;
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
}
@media (max-width: 640px) {
  footer.foot .row { grid-template-columns: 1fr; }
}

/* ===== Language visibility ===== */
[data-lang="en"] { display: none; }
body.lang-en [data-lang="es"] { display: none; }
body.lang-en [data-lang="en"] { display: inherit; }
body.lang-en details.faq[data-lang="en"] { display: block; }

/* WhatsApp float button (mobile only) */
.wa-float {
  display: none;
  position: fixed; right: 1rem; bottom: 1rem; z-index: 40;
  background: #25D366; color: white !important;
  width: 56px; height: 56px;
  border-radius: 50%;
  align-items: center; justify-content: center;
  font-size: 1.7rem;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  text-decoration: none !important;
}
@media (max-width: 720px) { .wa-float { display: flex; } }
</style>
</head>
<body>

<header class="top">
  <div class="row">
    <div class="brand">
      Pyme<b>WebPro</b>
      <span class="santi">Santi</span>
    </div>
    <nav>
      <a href="#precios" data-lang="es">Precios</a>
      <a href="#pricing" data-lang="en">Pricing</a>
      <a href="#proceso" data-lang="es">48 horas</a>
      <a href="#process" data-lang="en">48 hours</a>
      <a href="#ejemplos" data-lang="es">Ejemplos</a>
      <a href="#examples" data-lang="en">Examples</a>
      <a href="#faq">FAQ</a>
    </nav>
    <div class="lang" role="group" aria-label="Language">
      <button id="lang-es" class="active" type="button">ES</button>
      <button id="lang-en" type="button">EN</button>
    </div>
    <a class="wa-mini" href="https://wa.me/573014047722?text=Hola%20Santi%2C%20quiero%20conocer%20m%C3%A1s%20sobre%20PymeWebPro" target="_blank" rel="noopener">WhatsApp</a>
  </div>
</header>

<!-- ===== HERO ===== -->
<section class="hero">
  <div class="wrap">
    <span class="tag" data-lang="es">PymeWebPro · Colombia y LATAM</span>
    <span class="tag" data-lang="en">PymeWebPro · Colombia and LATAM</span>

    <h1 data-lang="es">
      Sitio web profesional para tu negocio<br/>
      <span class="accent">en 48 horas.</span>
    </h1>
    <h1 data-lang="en">
      A professional website for your business<br/>
      <span class="accent">in 48 hours.</span>
    </h1>

    <p class="lead" data-lang="es">
      Hecho a medida. Optimizado para celular. Hosting y soporte
      incluidos. Para PYMES en Colombia y LATAM que quieren dejar de
      depender de Booking, Rappi o Instagram para conseguir clientes.
    </p>
    <p class="lead" data-lang="en">
      Custom-designed, mobile-optimized, hosting and support included.
      For SMBs in Colombia and Latin America ready to stop depending on
      Booking, Rappi, or Instagram to get customers.
    </p>

    <div class="ctas">
      <a class="btn btn-wa" data-lang="es"
         href="https://wa.me/573014047722?text=Hola%20Santi%2C%20quiero%20una%20cotizaci%C3%B3n%20de%20PymeWebPro"
         target="_blank" rel="noopener">
        Hablemos por WhatsApp →
      </a>
      <a class="btn btn-wa" data-lang="en"
         href="https://wa.me/573014047722?text=Hi%20Santi%2C%20I%27d%20like%20a%20PymeWebPro%20quote"
         target="_blank" rel="noopener">
        Message Santi on WhatsApp →
      </a>
      <a class="btn btn-ghost" href="#precios" data-lang="es">Ver precios</a>
      <a class="btn btn-ghost" href="#pricing" data-lang="en">See pricing</a>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="num">48 h</div>
        <div class="label" data-lang="es">de entrega</div>
        <div class="label" data-lang="en">delivery</div>
      </div>
      <div class="stat">
        <div class="num">$390k</div>
        <div class="label" data-lang="es">COP, plan Esencial</div>
        <div class="label" data-lang="en">COP, Essential plan</div>
      </div>
      <div class="stat">
        <div class="num">1 a 2</div>
        <div class="label" data-lang="es">anos de hosting</div>
        <div class="label" data-lang="en">years of hosting</div>
      </div>
      <div class="stat">
        <div class="num">30 / 70</div>
        <div class="label" data-lang="es">pago dividido</div>
        <div class="label" data-lang="en">payment split</div>
      </div>
    </div>
  </div>
</section>

<!-- ===== PILLARS ===== -->
<section class="pillars">
  <div class="wrap">
    <div class="pillars-grid">
      <div class="pillar">
        <div class="ic">⚡</div>
        <h3 data-lang="es">48 horas</h3>
        <h3 data-lang="en">48 hours</h3>
        <p data-lang="es">Desde el deposito y la entrega del contenido,
          tu sitio esta publicado en 48 horas. Sin esperar meses.</p>
        <p data-lang="en">From deposit and content handoff to live site
          in 48 hours. No waiting months.</p>
      </div>
      <div class="pillar">
        <div class="ic">✎</div>
        <h3 data-lang="es">Hecho a medida</h3>
        <h3 data-lang="en">Custom-designed</h3>
        <p data-lang="es">Diseno unico para tu negocio. No es una
          plantilla generica. Carga rapido en celular y en computador.</p>
        <p data-lang="en">A unique design for your business. Not a
          generic template. Fast on phone and desktop.</p>
      </div>
      <div class="pillar">
        <div class="ic">⛅</div>
        <h3 data-lang="es">Hosting incluido</h3>
        <h3 data-lang="en">Hosting included</h3>
        <p data-lang="es">1 ano (Esencial) o 2 anos (Pro) de hosting,
          SSL, soporte por WhatsApp y cambios menores incluidos.</p>
        <p data-lang="en">1 year (Essential) or 2 years (Pro) of hosting,
          SSL, WhatsApp support, and small changes included.</p>
      </div>
    </div>
  </div>
</section>

<!-- ===== PRICING ===== -->
<section class="s" id="precios">
  <div class="wrap">
    <span id="pricing" style="display:block;visibility:hidden;height:0"></span>
    <h2 data-lang="es">Dos planes claros. Precios en pesos colombianos.</h2>
    <h2 data-lang="en">Two clear plans. Prices in Colombian pesos.</h2>
    <p class="sub" data-lang="es">
      No hay sorpresas. El primer ano (Esencial) o los primeros dos anos
      (Pro) de hosting y soporte ya estan incluidos en el precio.
    </p>
    <p class="sub" data-lang="en">
      No surprises. The first year (Essential) or first two years (Pro)
      of hosting and support are already included in the price.
    </p>

    <div class="pricing-grid">
      <div class="plan">
        <h3>Esencial</h3>
        <div class="price">$390.000 <small>COP</small></div>
        <p class="meta" data-lang="es">Pago 30 / 70. Entrega en 48 horas.</p>
        <p class="meta" data-lang="en">30 / 70 payment. Delivered in 48 hours.</p>
        <ul>
          <li data-lang="es">Hasta 5 paginas</li>
          <li data-lang="en">Up to 5 pages</li>
          <li data-lang="es">Diseno a medida</li>
          <li data-lang="en">Custom design</li>
          <li data-lang="es">Optimizado para celular</li>
          <li data-lang="en">Mobile-optimized</li>
          <li data-lang="es">Formulario de contacto + WhatsApp</li>
          <li data-lang="en">Contact form + WhatsApp button</li>
          <li class="highlight" data-lang="es"><b>1 ano de hosting y soporte</b></li>
          <li class="highlight" data-lang="en"><b>1 year of hosting and support</b></li>
          <li data-lang="es">SEO basico + Google Analytics</li>
          <li data-lang="en">Basic SEO + Google Analytics</li>
          <li data-lang="es">Codigo fuente entregado al cliente</li>
          <li data-lang="en">Source code handed over to the client</li>
        </ul>
        <a class="btn btn-primary"
           href="https://wa.me/573014047722?text=Hola%20Santi%2C%20quiero%20el%20plan%20Esencial%20de%20PymeWebPro"
           target="_blank" rel="noopener">
          <span data-lang="es">Quiero el Esencial</span>
          <span data-lang="en">I want Essential</span>
        </a>
      </div>

      <div class="plan pro">
        <span class="badge" data-lang="es">Recomendado</span>
        <span class="badge" data-lang="en">Recommended</span>
        <h3>Pro</h3>
        <div class="price">$690.000 <small>COP</small></div>
        <p class="meta" data-lang="es">Pago 30 / 70. Entrega en 48 horas.</p>
        <p class="meta" data-lang="en">30 / 70 payment. Delivered in 48 hours.</p>
        <ul>
          <li data-lang="es">Hasta 10 paginas</li>
          <li data-lang="en">Up to 10 pages</li>
          <li data-lang="es">Todo lo del Esencial</li>
          <li data-lang="en">Everything in Essential</li>
          <li data-lang="es">Galeria de productos / servicios con filtros</li>
          <li data-lang="en">Gallery with filters</li>
          <li data-lang="es">Sistema de reservas o citas integrado</li>
          <li data-lang="en">Booking / appointment system</li>
          <li data-lang="es">Pasarela de pago Wompi (PSE, Nequi, tarjetas)</li>
          <li data-lang="en">Wompi payment gateway (PSE, Nequi, cards)</li>
          <li data-lang="es">SEO avanzado + blog opcional</li>
          <li data-lang="en">Advanced SEO + optional blog</li>
          <li class="highlight" data-lang="es"><b>2 anos de hosting y soporte</b></li>
          <li class="highlight" data-lang="en"><b>2 years of hosting and support</b></li>
        </ul>
        <a class="btn btn-primary"
           href="https://wa.me/573014047722?text=Hola%20Santi%2C%20quiero%20el%20plan%20Pro%20de%20PymeWebPro"
           target="_blank" rel="noopener">
          <span data-lang="es">Quiero el Pro</span>
          <span data-lang="en">I want Pro</span>
        </a>
      </div>
    </div>

    <p style="margin-top:1.5rem;color:var(--ink-soft);font-size:0.9rem;text-align:center" data-lang="es">
      Renovacion anual de hosting y soporte despues del periodo incluido: <b>$150.000 COP por ano</b>.
      Sin candado: si quieres llevarte el sitio a otro hosting, te entregamos el codigo.
    </p>
    <p style="margin-top:1.5rem;color:var(--ink-soft);font-size:0.9rem;text-align:center" data-lang="en">
      Hosting and support renewal after the included period: <b>COP $150,000 per year</b>.
      No lock-in: if you want to move your site elsewhere, we hand over the code.
    </p>
  </div>
</section>

<!-- ===== TIMELINE / PROCESS ===== -->
<section class="s alt" id="proceso">
  <div class="wrap">
    <span id="process" style="display:block;visibility:hidden;height:0"></span>
    <h2 data-lang="es">Como funcionan las 48 horas</h2>
    <h2 data-lang="en">How the 48-hour delivery works</h2>
    <p class="sub" data-lang="es">
      El reloj arranca cuando recibimos el deposito del 30% y tu
      contenido (textos, fotos, datos). No antes. Si necesitas tiempo
      para preparar el contenido, esperamos tranquilos.
    </p>
    <p class="sub" data-lang="en">
      The clock starts when we receive the 30% deposit and your content
      (copy, photos, info). Not before. If you need time to prepare
      content, we wait.
    </p>

    <div class="timeline">
      <div class="timeline-row">
        <div class="when" data-lang="es">Antes</div>
        <div class="when" data-lang="en">Before</div>
        <div class="what">
          <span data-lang="es"><b>Llamada inicial de 20 minutos.</b> Entendemos tu negocio. Cotizacion en PDF el mismo dia. Contrato firmado y deposito del 30%.</span>
          <span data-lang="en"><b>20-minute discovery call.</b> We understand your business. PDF quote same day. Contract signed and 30% deposit paid.</span>
        </div>
        <div class="who" data-lang="es">Santi + cliente</div>
        <div class="who" data-lang="en">Santi + client</div>
      </div>
      <div class="timeline-row">
        <div class="when">Hora 0</div>
        <div class="what">
          <span data-lang="es"><b>Entregas tu contenido.</b> Textos, fotos, datos de contacto, marca, referencias visuales. El cronometro arranca.</span>
          <span data-lang="en"><b>You deliver your content.</b> Copy, photos, contact details, brand, visual references. The clock starts.</span>
        </div>
        <div class="who" data-lang="es">Cliente</div>
        <div class="who" data-lang="en">Client</div>
      </div>
      <div class="timeline-row">
        <div class="when">0 – 12 h</div>
        <div class="what">
          <span data-lang="es"><b>Construimos la primera version completa</b> con tu contenido. Sin esperar; arrancamos de una.</span>
          <span data-lang="en"><b>We build the first complete version</b> using your content. No waiting around.</span>
        </div>
        <div class="who" data-lang="es">Mike (diseno + codigo)</div>
        <div class="who" data-lang="en">Mike (design + code)</div>
      </div>
      <div class="timeline-row">
        <div class="when">12 h</div>
        <div class="what">
          <span data-lang="es"><b>Te enviamos un enlace privado de preview</b> por WhatsApp para que revises.</span>
          <span data-lang="en"><b>We send you a private preview link</b> over WhatsApp for review.</span>
        </div>
        <div class="who" data-lang="es">Equipo</div>
        <div class="who" data-lang="en">Team</div>
      </div>
      <div class="timeline-row">
        <div class="when">12 – 24 h</div>
        <div class="what">
          <span data-lang="es"><b>Revisas y pides ajustes</b> (una ronda incluida). Nos consolidas el feedback en un solo mensaje.</span>
          <span data-lang="en"><b>You review and request changes</b> (one round included). Consolidate feedback into a single message.</span>
        </div>
        <div class="who" data-lang="es">Cliente</div>
        <div class="who" data-lang="en">Client</div>
      </div>
      <div class="timeline-row">
        <div class="when">24 – 36 h</div>
        <div class="what">
          <span data-lang="es"><b>Aplicamos los cambios.</b> Probamos en celular, tablet y computador.</span>
          <span data-lang="en"><b>We apply your changes.</b> Test on phone, tablet, and desktop.</span>
        </div>
        <div class="who">Mike</div>
        <div class="who">Mike</div>
      </div>
      <div class="timeline-row">
        <div class="when">36 – 42 h</div>
        <div class="what">
          <span data-lang="es"><b>Configuracion del dominio y SSL.</b> Pruebas finales de carga y formularios.</span>
          <span data-lang="en"><b>Domain configuration and SSL.</b> Final QA on load times and forms.</span>
        </div>
        <div class="who">Mike</div>
        <div class="who">Mike</div>
      </div>
      <div class="timeline-row">
        <div class="when">42 – 48 h</div>
        <div class="what">
          <span data-lang="es"><b>Publicacion en vivo.</b> Capacitacion de 20 minutos. Pago final del 70%.</span>
          <span data-lang="en"><b>Site goes live.</b> 20-minute walkthrough. Final 70% payment.</span>
        </div>
        <div class="who" data-lang="es">Santi + cliente</div>
        <div class="who" data-lang="en">Santi + client</div>
      </div>
      <div class="timeline-row">
        <div class="when" data-lang="es">Despues</div>
        <div class="when" data-lang="en">After</div>
        <div class="what">
          <span data-lang="es"><b>1 ano (Esencial) o 2 anos (Pro)</b> de hosting y soporte ya incluidos. Cambios menores y monitoreo por WhatsApp.</span>
          <span data-lang="en"><b>1 year (Essential) or 2 years (Pro)</b> of hosting and support already included. Small changes and monitoring via WhatsApp.</span>
        </div>
        <div class="who" data-lang="es">Equipo PymeWebPro</div>
        <div class="who" data-lang="en">PymeWebPro team</div>
      </div>
    </div>

    <p style="margin-top:1.5rem;color:var(--ink-soft);font-size:0.9rem" data-lang="es">
      <b>Como logramos 48 horas:</b> usamos un set de bloques de diseno
      probados (hero, galeria, formulario, mapa, reservas) que ensamblamos
      a medida de tu negocio. Es como un sastre que ya tiene cortes
      perfectos de tela y los combina para tus medidas.
    </p>
    <p style="margin-top:1.5rem;color:var(--ink-soft);font-size:0.9rem" data-lang="en">
      <b>How we hit 48 hours:</b> we use a library of proven design blocks
      (hero, gallery, contact form, map, booking) that we assemble custom.
      Think of it as a tailor who already has perfectly-cut fabric and
      combines it to your measurements.
    </p>
  </div>
</section>

<!-- ===== EXAMPLES ===== -->
<section class="s" id="ejemplos">
  <div class="wrap">
    <span id="examples" style="display:block;visibility:hidden;height:0"></span>
    <h2 data-lang="es">Ejemplos en produccion</h2>
    <h2 data-lang="en">Live examples</h2>
    <p class="sub" data-lang="es">
      Tres sitios nuestros que estan en linea hoy. Hechos con la misma
      metodologia que usariamos para tu negocio.
    </p>
    <p class="sub" data-lang="en">
      Three of our own sites currently in production. Built with the
      same approach we'd use for your business.
    </p>

    <div class="examples-grid">
      <a class="example" href="https://medellin.guide" target="_blank" rel="noopener">
        <div class="domain">medellin.guide</div>
        <p class="desc" data-lang="es">Guia de expatriados para Medellin. 24 paginas de contenido largo, formulario de leads, chat AI integrado.</p>
        <p class="desc" data-lang="en">Expat guide to Medellin. 24 long-form articles, lead capture, AI chat integrated.</p>
        <span class="pill" data-lang="es">Activo</span>
        <span class="pill" data-lang="en">Live</span>
      </a>
      <a class="example" href="https://inviersol.com" target="_blank" rel="noopener">
        <div class="domain">inviersol.com</div>
        <p class="desc" data-lang="es">INVIERSOL SAS. Vendedor de parasoles y sombrillas en Envigado. Formulario de cotizacion, galeria, contacto.</p>
        <p class="desc" data-lang="en">INVIERSOL SAS. Umbrellas and outdoor shading vendor in Envigado. Quote form, gallery, contact.</p>
        <span class="pill" data-lang="es">Cliente Pro</span>
        <span class="pill" data-lang="en">Pro plan client</span>
      </a>
      <a class="example" href="https://thecartagena.guide" target="_blank" rel="noopener">
        <div class="domain">thecartagena.guide</div>
        <p class="desc" data-lang="es">Guia de Cartagena para visitantes. Estructura modular, 100% optimizada para celular, multilingue.</p>
        <p class="desc" data-lang="en">Cartagena guide for visitors. Modular structure, fully mobile-optimized, multilingual.</p>
        <span class="pill" data-lang="es">Activo</span>
        <span class="pill" data-lang="en">Live</span>
      </a>
    </div>
  </div>
</section>

<!-- ===== COMPARISON ===== -->
<section class="s alt">
  <div class="wrap">
    <h2 data-lang="es">Por que PymeWebPro y no la competencia</h2>
    <h2 data-lang="en">Why PymeWebPro instead of the alternatives</h2>
    <p class="sub" data-lang="es">
      Tres alternativas tipicas que evaluan los duenos de negocio. Como
      nos comparamos honestamente:
    </p>
    <p class="sub" data-lang="en">
      Three alternatives business owners typically evaluate. Honest
      comparison:
    </p>

    <div class="compare">
      <table>
        <thead>
          <tr>
            <th data-lang="es"></th><th data-lang="en"></th>
            <th>Wix / Squarespace</th>
            <th data-lang="es">Freelancer</th>
            <th data-lang="en">Freelancer</th>
            <th data-lang="es">Agencia</th>
            <th data-lang="en">Agency</th>
            <th class="us">PymeWebPro</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-lang="es">Precio inicial</td>
            <td data-lang="en">Upfront price</td>
            <td>$60-120k/mes</td>
            <td>$200-500k</td>
            <td>$2M-8M</td>
            <td class="us">$390-690k</td>
          </tr>
          <tr>
            <td data-lang="es">Tiempo de entrega</td>
            <td data-lang="en">Delivery time</td>
            <td class="bad">DIY (semanas)</td>
            <td>2-4 semanas</td>
            <td>3-6 meses</td>
            <td class="us">48 horas</td>
          </tr>
          <tr>
            <td data-lang="es">Diseno hecho a medida</td>
            <td data-lang="en">Custom design</td>
            <td class="bad">No</td>
            <td>Varies</td>
            <td class="ok">Si</td>
            <td class="us">Si</td>
          </tr>
          <tr>
            <td data-lang="es">Codigo fuente entregado</td>
            <td data-lang="en">Source code handed over</td>
            <td class="bad">No</td>
            <td class="bad">A veces</td>
            <td>A veces</td>
            <td class="us">Si</td>
          </tr>
          <tr>
            <td data-lang="es">Soporte garantizado</td>
            <td data-lang="en">Guaranteed support</td>
            <td>Chat bot</td>
            <td class="bad">Riesgo</td>
            <td class="ok">Si (caro)</td>
            <td class="us">1-2 anos</td>
          </tr>
          <tr>
            <td data-lang="es">Contrato formal</td>
            <td data-lang="en">Formal contract</td>
            <td>Terms ToS</td>
            <td class="bad">Raro</td>
            <td class="ok">Si</td>
            <td class="us">Si</td>
          </tr>
          <tr>
            <td data-lang="es">Empresa registrada</td>
            <td data-lang="en">Registered business</td>
            <td>USA</td>
            <td class="bad">Persona</td>
            <td class="ok">Si</td>
            <td class="us">Si (Colombia)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class="s" id="faq">
  <div class="wrap">
    <h2 data-lang="es">Preguntas frecuentes</h2>
    <h2 data-lang="en">Frequently asked questions</h2>
    <p class="sub" data-lang="es">Las preguntas que mas escuchamos antes de cerrar un proyecto.</p>
    <p class="sub" data-lang="en">The questions we hear most before closing a project.</p>

    <div class="faq-list">

      <details class="faq" data-lang="es">
        <summary>Ya tengo Instagram y Facebook. ¿Para que un sitio web?</summary>
        <div class="answer">
          Cuando alguien busca tu negocio en Google, Instagram no
          aparece primero. Aparecen paginas web. Tu Instagram es
          excelente para retener clientes que ya te conocen; un sitio
          web es para atraer clientes nuevos. Son complementarios, no
          se reemplazan.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>I already have Instagram and Facebook. Why a website?</summary>
        <div class="answer">
          When someone searches for your business on Google, Instagram
          doesn't show up at the top · web pages do. Your Instagram is
          great for retaining customers who already know you; a website
          attracts new ones. Complementary, not substitutes.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿48 horas? Suena muy rapido, ¿es real?</summary>
        <div class="answer">
          Tres cosas. Primero, no son 48 horas de cero a perfecto;
          revisas el avance a la mitad y pides ajustes. Segundo, lo
          que toma semanas en otras agencias es esperar el contenido
          del cliente; cuando tu contenido esta listo, construir es
          rapido. Tercero, usamos bloques de diseno probados que
          ensamblamos a medida, no empezamos de cero cada vez.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>48 hours? That feels too fast · is it real?</summary>
        <div class="answer">
          Three things. First, it's not 48 hours of zero-to-perfect:
          you review halfway through and request adjustments. Second,
          what takes weeks elsewhere is waiting for client content;
          once your content is ready, building is fast. Third, we use
          proven design blocks assembled to your measurements · we
          don't start from scratch each time.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿Y si no me gusta el diseno?</summary>
        <div class="answer">
          El proceso incluye una ronda de revisiones a la mitad del
          plazo. A las 12 horas te enviamos la primera version. Si
          necesitas ajustes, los aplicamos en las siguientes 12-24
          horas. Si despues de eso no estamos alineados, te devolvemos
          el deposito. No tienes ningun riesgo.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>What if I don't like the design?</summary>
        <div class="answer">
          The process includes a revision round at the halfway point.
          At hour 12 we send you the first version. If you need
          adjustments, we apply them in the next 12-24 hours. If we're
          still not aligned after that, we refund the deposit. No risk
          to you.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿Que pasa despues del periodo de hosting incluido?</summary>
        <div class="answer">
          Renovacion anual de hosting y soporte: $150.000 COP por ano.
          Incluye hosting Cloudflare, SSL renovado, copias de
          seguridad, monitoreo 24/7, cambios menores de contenido, y
          soporte tecnico por WhatsApp. Si prefieres no renovar, te
          entregamos el codigo y puedes llevar el sitio a otro hosting.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>What happens after the included hosting period ends?</summary>
        <div class="answer">
          Annual renewal: COP $150,000 per year. Includes Cloudflare
          hosting, SSL renewal, automatic backups, 24/7 uptime
          monitoring, small content changes, and WhatsApp support. If
          you'd rather not renew, we hand over the code and you can
          move to another host.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿Aceptan pago en efectivo o solo bancos?</summary>
        <div class="answer">
          Aceptamos: transferencia bancaria (Bancolombia, Davivienda,
          etc.), Nequi, PSE, efectivo, y tarjeta de credito via Wompi.
          Todo se factura electronicamente.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>Cash, transfer, or card?</summary>
        <div class="answer">
          We accept: bank transfer (Bancolombia, Davivienda, etc.),
          Nequi, PSE, cash, and credit card via Wompi. Everything is
          invoiced electronically.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿Como se que no me van a estafar?</summary>
        <div class="answer">
          Somos una empresa colombiana registrada: <b>Norte Sur
          Consulting S.A.S.</b>, NIT <b>901.956.771-1</b>, con
          domicilio en Medellin. Te enviamos la camara de comercio si
          la pides. Contrato formal antes de cualquier pago. El 70%
          del precio lo pagas solo cuando el sitio ya esta publicado y
          funcionando. Si no entregamos, no nos pagas.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>How do I know you won't scam me?</summary>
        <div class="answer">
          We're a registered Colombian company: <b>Norte Sur Consulting
          S.A.S.</b>, NIT <b>901.956.771-1</b>, based in Medellin. We
          can send you the company registration on request. Formal
          contract before any payment. You pay 70% of the price only
          after the site is live and working. If we don't deliver, you
          don't pay.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿Que NO hacen?</summary>
        <div class="answer">
          No vendemos publicidad pagada (Google Ads, Facebook Ads).
          No hacemos disenno grafico aparte del sitio (logos, tarjetas,
          posts). No hacemos apps moviles nativas. No hacemos ecommerce
          con cientos de productos (para eso Shopify es mejor). Nos
          enfocamos en sitios web profesionales para PYMES, eso lo
          hacemos muy bien.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>What don't you do?</summary>
        <div class="answer">
          We don't run paid ad campaigns (Google Ads, Facebook Ads).
          We don't do graphic design beyond the website (logos, cards,
          social posts). We don't build native mobile apps. We don't do
          ecommerce with hundreds of SKUs (Shopify is better for that).
          We focus on professional websites for SMBs and do that well.
        </div>
      </details>

      <details class="faq" data-lang="es">
        <summary>¿Trabajan fuera de Colombia?</summary>
        <div class="answer">
          Nos enfocamos en el mercado latinoamericano, principalmente
          Colombia. Para otros paises de LATAM podemos trabajar, pero
          no atendemos clientes de Estados Unidos, Canada, Europa o
          Asia. No es nuestro mercado.
        </div>
      </details>
      <details class="faq" data-lang="en">
        <summary>Do you work outside Colombia?</summary>
        <div class="answer">
          We focus on the Latin American market, primarily Colombia.
          We can work with clients elsewhere in LATAM, but we don't
          take on clients from the US, Canada, Europe, or Asia. Not
          our market.
        </div>
      </details>

    </div>
  </div>
</section>

<!-- ===== FINAL CTA ===== -->
<section class="final-cta">
  <div class="wrap">
    <h2 data-lang="es">¿Listo para tener tu sitio en 48 horas?</h2>
    <h2 data-lang="en">Ready to have your site live in 48 hours?</h2>
    <p data-lang="es">
      Hablemos. Una llamada de 20 minutos y te mando la cotizacion
      el mismo dia. Sin compromiso, sin presion.
    </p>
    <p data-lang="en">
      Let's talk. A 20-minute call, quote sent the same day. No
      pressure, no commitment.
    </p>
    <a class="btn btn-wa"
       href="https://wa.me/573014047722?text=Hola%20Santi%2C%20quiero%20una%20cotizaci%C3%B3n%20de%20PymeWebPro"
       target="_blank" rel="noopener" data-lang="es">
       Escribele a Santi por WhatsApp →
    </a>
    <a class="btn btn-wa"
       href="https://wa.me/573014047722?text=Hi%20Santi%2C%20I%27d%20like%20a%20PymeWebPro%20quote"
       target="_blank" rel="noopener" data-lang="en">
       Message Santi on WhatsApp →
    </a>
    <p class="santi-note" data-lang="es">
      Santiago Santos · Socio comercial · <b>+57 301 404 7722</b> · hello@pymewebpro.com
    </p>
    <p class="santi-note" data-lang="en">
      Santiago Santos · Sales partner · <b>+57 301 404 7722</b> · hello@pymewebpro.com
    </p>
  </div>
</section>

<!-- ===== FOOTER ===== -->
<footer class="foot">
  <div class="wrap">
    <div class="row">
      <div>
        <h4>PymeWebPro</h4>
        <p data-lang="es">
          Sitios web profesionales para PYMES en Colombia y LATAM.
          Entrega en 48 horas. Hosting y soporte incluidos.
        </p>
        <p data-lang="en">
          Professional websites for SMBs in Colombia and Latin America.
          48-hour delivery. Hosting and support included.
        </p>
      </div>
      <div>
        <h4 data-lang="es">Contacto</h4>
        <h4 data-lang="en">Contact</h4>
        <p>
          <a href="https://wa.me/573014047722" target="_blank" rel="noopener">WhatsApp +57 301 404 7722</a><br/>
          <a href="mailto:hello@pymewebpro.com">hello@pymewebpro.com</a><br/>
          <a href="https://pymewebpro.com" target="_blank" rel="noopener">pymewebpro.com</a>
        </p>
      </div>
      <div>
        <h4 data-lang="es">Empresa</h4>
        <h4 data-lang="en">Company</h4>
        <p>
          Norte Sur Consulting S.A.S.<br/>
          NIT 901.956.771-1<br/>
          Medellin, Colombia
        </p>
      </div>
    </div>
    <div class="legal">
      <span>© 2026 Norte Sur Consulting S.A.S.</span>
      <span data-lang="es">Hecho a mano en Medellin</span>
      <span data-lang="en">Made by hand in Medellin</span>
    </div>
  </div>
</footer>

<a class="wa-float" href="https://wa.me/573014047722?text=Hola%20Santi%2C%20vi%20santi.pymewebpro.com" target="_blank" rel="noopener" aria-label="WhatsApp">
  💬
</a>

<script>
// Language toggle. Stored in localStorage so the choice persists.
(function() {
  const KEY = "pwp_santi_lang";
  const stored = localStorage.getItem(KEY);
  const userLang = (navigator.language || "es").slice(0,2).toLowerCase();
  const initial = stored || (userLang === "en" ? "en" : "es");
  setLang(initial);
  document.getElementById("lang-es").addEventListener("click", () => setLang("es"));
  document.getElementById("lang-en").addEventListener("click", () => setLang("en"));
  function setLang(l) {
    if (l === "en") document.body.classList.add("lang-en");
    else document.body.classList.remove("lang-en");
    document.documentElement.lang = l;
    document.getElementById("lang-es").classList.toggle("active", l === "es");
    document.getElementById("lang-en").classList.toggle("active", l === "en");
    localStorage.setItem(KEY, l);
  }
})();
</script>
</body>
</html>`;
}
