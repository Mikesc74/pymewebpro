// manual-mockups-bluewhale.js — auto-rebuilt by scripts/rebuild-mockups.mjs
// Source: manual-mockups/blue-whale-international/index.html
//
// Imported by manual-mockups.js → MANUAL_MOCKUPS["blue-whale-international"].

export const blueWhaleHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blue Whale International · Comunidad de talento</title>
  <meta name="description" content="Blue Whale International. Súmate a nuestra comunidad de talento en finanzas, tecnología e inversión en Latinoamérica." />
  <meta name="theme-color" content="#0A1F3A" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --abyss:#040D1C;
      --navy:#0A1F3A;
      --navy-2:#0E2742;
      --steel:#243A57;
      --slate:#5A7390;
      --mist:#8FA3BD;
      --line:#1B3556;
      --line-light:#E5E9EE;
      --bone:#FAFAF7;
      --paper:#F2F1EC;
      --ink:#0A0F1A;
      --accent:#D4A24C;
      --accent-2:#B5863A;
      --accent-soft:rgba(212,162,76,0.12);
      --radius:4px;
      --maxw:1100px;
    }
    *,*::before,*::after { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body {
      margin:0;
      font-family:'Inter', system-ui, -apple-system, sans-serif;
      font-weight:400;
      color:var(--ink);
      background:var(--bone);
      line-height:1.6;
      -webkit-font-smoothing:antialiased;
    }
    h1,h2,h3 { font-family:'Inter Tight', 'Inter', sans-serif; font-weight:600; line-height:1.15; letter-spacing:-0.01em; margin:0 0 .5em; color:var(--navy); }
    h1 { font-size:clamp(2rem, 4.5vw, 3.4rem); }
    h2 { font-size:clamp(1.5rem, 3vw, 2.1rem); margin-bottom:.75em; }
    h3 { font-size:1.15rem; }
    p { margin:0 0 1em; color:var(--steel); }
    a { color:var(--navy); text-decoration:none; }
    a:hover { color:var(--accent-2); }
    .container { max-width:var(--maxw); margin:0 auto; padding:0 1.5rem; }

    /* NAV */
    .nav {
      position:sticky; top:0; z-index:50;
      background:rgba(250,250,247,0.92);
      backdrop-filter:blur(10px);
      border-bottom:1px solid var(--line-light);
    }
    .nav-inner {
      display:flex; align-items:center; justify-content:space-between;
      padding:1rem 1.5rem; max-width:var(--maxw); margin:0 auto;
    }
    .logo {
      display:flex; align-items:center; gap:.6rem;
      font-family:'Inter Tight', sans-serif; font-weight:700;
      color:var(--navy); font-size:1.05rem; letter-spacing:.02em;
    }
    .logo-mark {
      width:34px; height:34px;
      border:1.5px solid var(--accent);
      color:var(--accent);
      display:flex; align-items:center; justify-content:center;
      font-size:.78rem; letter-spacing:.05em; font-weight:700;
    }
    .nav-links { display:flex; gap:1.6rem; align-items:center; }
    .nav-links a {
      font-size:.92rem; color:var(--steel); font-weight:500;
    }
    .nav-links a:hover { color:var(--navy); }
    .nav-cta {
      background:var(--navy); color:var(--bone) !important;
      padding:.55rem 1rem; font-size:.88rem;
      font-weight:500; border-radius:var(--radius);
      transition:background .15s;
    }
    .nav-cta:hover { background:var(--accent-2); color:var(--bone) !important; }
    @media (max-width:720px) {
      .nav-links a:not(.nav-cta) { display:none; }
    }

    /* HERO */
    .hero {
      position:relative; overflow:hidden;
      color:var(--bone);
      padding:6rem 0 5.5rem;
      background:
        linear-gradient(135deg, rgba(10,31,58,0.85) 0%, rgba(14,39,66,0.78) 50%, rgba(36,58,87,0.6) 100%),
        url('https://images.pexels.com/photos/33126027/pexels-photo-33126027.jpeg') center/cover no-repeat;
    }
    .hero::before {
      content:''; position:absolute; inset:0;
      background:radial-gradient(circle at 80% 20%, rgba(212,162,76,0.18), transparent 60%);
      pointer-events:none;
    }
    .hero .container { position:relative; z-index:1; }
    .eyebrow {
      display:inline-block;
      font-family:'Inter Tight', sans-serif;
      font-size:.78rem; font-weight:600;
      letter-spacing:.18em; text-transform:uppercase;
      color:var(--accent); margin-bottom:1.25rem;
      padding:.4rem .8rem;
      border:1px solid rgba(212,162,76,0.35);
      border-radius:2px;
    }
    .hero h1 { color:var(--bone); max-width:780px; }
    .hero p.lede {
      font-size:1.15rem; color:var(--mist);
      max-width:640px; margin-top:1rem;
    }
    .hero-actions { margin-top:2rem; display:flex; gap:.85rem; flex-wrap:wrap; }
    .btn {
      display:inline-block;
      padding:.85rem 1.6rem;
      font-family:'Inter Tight', sans-serif;
      font-weight:500; font-size:.95rem;
      border-radius:var(--radius);
      cursor:pointer; border:none;
      transition:all .15s;
    }
    .btn-primary { background:var(--accent); color:var(--navy) !important; }
    .btn-primary:hover { background:#E2B45F; }
    .btn-ghost {
      background:transparent; color:var(--bone) !important;
      border:1px solid rgba(255,255,255,0.25);
    }
    .btn-ghost:hover { border-color:var(--accent); color:var(--accent) !important; }

    /* SECTION */
    section { padding:5rem 0; }
    .section-tag {
      font-family:'Inter Tight', sans-serif;
      font-size:.78rem; font-weight:600;
      letter-spacing:.18em; text-transform:uppercase;
      color:var(--accent-2); margin-bottom:.85rem;
      display:block;
    }

    /* INFORMATION */
    .info-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));
      gap:2rem; margin-top:2.5rem;
    }
    .info-card {
      padding:1.5rem; background:#fff;
      border:1px solid var(--line-light);
      border-radius:var(--radius);
    }
    .info-num {
      font-family:'Inter Tight', sans-serif;
      font-size:1.8rem; font-weight:700;
      color:var(--accent-2); display:block; margin-bottom:.4rem;
    }
    .info-card h3 { color:var(--navy); margin-bottom:.4rem; }
    .info-card p { font-size:.92rem; margin:0; color:var(--steel); }

    /* WHO WE ARE */
    .who { background:var(--paper); }
    .who-layout {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:3rem; align-items:center;
    }
    @media (max-width:760px) { .who-layout { grid-template-columns:1fr; } }
    .who-image {
      aspect-ratio:4/3;
      background:linear-gradient(135deg, var(--navy) 0%, var(--steel) 100%) center/cover no-repeat,
                 url('https://images.pexels.com/photos/7710050/pexels-photo-7710050.jpeg') center/cover;
      background-blend-mode:overlay;
      border-radius:var(--radius);
      box-shadow:0 20px 40px -20px rgba(10,31,58,0.35);
    }

    /* CLIENTS */
    .clients-strip {
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));
      gap:1.5rem; margin-top:2.5rem;
    }
    .client {
      display:flex; align-items:center; justify-content:center;
      padding:2rem 1rem; background:#fff;
      border:1px solid var(--line-light);
      border-radius:var(--radius);
      font-family:'Inter Tight', sans-serif;
      font-weight:600; font-size:1.05rem;
      color:var(--steel); letter-spacing:.02em;
      transition:all .2s;
    }
    .client:hover {
      color:var(--navy);
      border-color:var(--accent);
      transform:translateY(-2px);
    }

    /* CV FORM */
    .cv { background:var(--navy); color:var(--bone); }
    .cv h2 { color:var(--bone); }
    .cv .section-tag { color:var(--accent); }
    .cv p { color:var(--mist); }
    .cv-layout {
      display:grid;
      grid-template-columns:1fr 1.4fr;
      gap:3rem; margin-top:2.5rem;
    }
    @media (max-width:780px) { .cv-layout { grid-template-columns:1fr; } }
    .cv-form {
      background:var(--navy-2);
      padding:2rem; border-radius:var(--radius);
      border:1px solid var(--line);
    }
    .field { margin-bottom:1.1rem; }
    .field label {
      display:block; font-size:.82rem;
      letter-spacing:.06em; text-transform:uppercase;
      font-weight:500; color:var(--mist); margin-bottom:.4rem;
    }
    .field input, .field textarea {
      width:100%; padding:.7rem .85rem;
      background:var(--abyss); color:var(--bone);
      border:1px solid var(--line);
      border-radius:var(--radius);
      font-family:inherit; font-size:.95rem;
    }
    .field input:focus, .field textarea:focus {
      outline:none; border-color:var(--accent);
    }
    .field textarea { resize:vertical; min-height:90px; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    @media (max-width:520px) { .field-row { grid-template-columns:1fr; } }
    .file-input {
      padding:.7rem; background:var(--abyss);
      border:1px dashed var(--steel);
      border-radius:var(--radius); color:var(--mist);
      font-size:.88rem;
    }
    .consent {
      display:flex; gap:.6rem; align-items:flex-start;
      font-size:.82rem; color:var(--mist); margin:1rem 0 1.5rem;
    }
    .consent input { margin-top:.2rem; }
    .cv-form .btn-primary { width:100%; padding:.95rem; font-size:1rem; }
    .cv-info ul {
      list-style:none; padding:0; margin:1.5rem 0 0;
    }
    .cv-info li {
      padding:.7rem 0;
      border-bottom:1px solid var(--line);
      color:var(--mist); font-size:.92rem;
      display:flex; gap:.7rem; align-items:flex-start;
    }
    .cv-info li::before {
      content:'→'; color:var(--accent); font-weight:600;
    }

    /* CONTACT */
    .contact { background:var(--bone); }
    .contact-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
      gap:2rem; margin-top:2.5rem;
    }
    .contact-card {
      padding:1.5rem; background:#fff;
      border:1px solid var(--line-light);
      border-radius:var(--radius);
    }
    .contact-card .label {
      font-family:'Inter Tight', sans-serif;
      font-size:.75rem; letter-spacing:.15em;
      text-transform:uppercase; color:var(--accent-2);
      font-weight:600; margin-bottom:.5rem;
    }
    .contact-card a, .contact-card .value {
      color:var(--navy); font-weight:500;
      font-size:1rem; word-break:break-word;
    }
    .contact-card a:hover { color:var(--accent-2); }

    /* FOOTER */
    footer {
      background:var(--abyss); color:var(--mist);
      padding:2.5rem 0; font-size:.85rem;
    }
    .footer-inner {
      display:flex; flex-wrap:wrap; gap:1rem;
      justify-content:space-between; align-items:center;
    }
    footer .logo { color:var(--bone); }
  </style>
</head>
<body>

  <!-- NAV -->
  <nav class="nav">
    <div class="nav-inner">
      <a href="#top" class="logo">
        <span class="logo-mark">BWI</span>
        Blue Whale International
      </a>
      <div class="nav-links">
        <a href="#informacion">Información</a>
        <a href="#nosotros">Nosotros</a>
        <a href="#clientes">Clientes</a>
        <a href="#contacto">Contacto</a>
        <a href="#cv" class="nav-cta">Enviar CV</a>
      </div>
    </div>
  </nav>

  <!-- HERO -->
  <header class="hero" id="top">
    <div class="container">
      <span class="eyebrow">Comunidad de Talento</span>
      <h1>Súmate a la comunidad de Blue Whale International.</h1>
      <p class="lede">Construimos la próxima generación de inversión y tecnología en Latinoamérica. Si quieres formar parte, deja tu hoja de vida y nuestro equipo se pondrá en contacto cuando surja la oportunidad indicada.</p>
      <div class="hero-actions">
        <a href="#cv" class="btn btn-primary">Enviar mi CV</a>
        <a href="#nosotros" class="btn btn-ghost">Conocer más</a>
      </div>
    </div>
  </header>

  <!-- INFORMATION -->
  <section id="informacion">
    <div class="container">
      <span class="section-tag">Información</span>
      <h2>Qué es Blue Whale International.</h2>
      <p style="max-width:720px;">Una firma boutique de inversión y servicios financieros con presencia en Colombia, Perú, Panamá y México. Operamos mandatos en crédito privado, FinTech &amp; SaaS, inversiones tecnológicas y wealth management para family offices.</p>

      <div class="info-grid">
        <div class="info-card">
          <span class="info-num">4</span>
          <h3>Países</h3>
          <p>Bogotá, Lima, Panamá y CDMX.</p>
        </div>
        <div class="info-card">
          <span class="info-num">22</span>
          <h3>Personas</h3>
          <p>Equipo pequeño por diseño.</p>
        </div>
        <div class="info-card">
          <span class="info-num">5</span>
          <h3>Mesas</h3>
          <p>Crédito privado, FinTech, Tech, Wealth y Análisis.</p>
        </div>
        <div class="info-card">
          <span class="info-num">7+</span>
          <h3>Años</h3>
          <p>De trayectoria operando en LatAm.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- WHO WE ARE -->
  <section id="nosotros" class="who">
    <div class="container">
      <span class="section-tag">Quiénes somos</span>
      <div class="who-layout">
        <div>
          <h2>Una boutique pequeña, exigente y abierta.</h2>
          <p>Blue Whale International nació para hacer inversión latinoamericana de manera diferente: equipos chicos, mandatos reales, y profesionales que firman decisiones desde temprano en su carrera.</p>
          <p>Creemos en la cultura híbrida por defecto, en el comité abierto, y en pagar bien a quienes operan con dueñismo. No buscamos crecer por crecer: buscamos personas que quieran construir con nosotros, no para nosotros.</p>
          <p>Si compartes esa visión, queremos conocerte aunque hoy no tengamos un puesto abierto que encaje. La comunidad BWI es la primera puerta.</p>
        </div>
        <div class="who-image" role="img" aria-label="Equipo Blue Whale International"></div>
      </div>
    </div>
  </section>

  <!-- CLIENTS -->
  <section id="clientes">
    <div class="container">
      <span class="section-tag">Nuestros clientes</span>
      <h2>Operamos junto a fondos, family offices y compañías líderes en la región.</h2>
      <p style="max-width:720px;">Nuestros mandatos los ejecutamos con la confianza de instituciones que valoran la discreción, la disciplina y los resultados auditables.</p>

      <div class="clients-strip">
        <div class="client">Cliente 01</div>
        <div class="client">Cliente 02</div>
        <div class="client">Cliente 03</div>
        <div class="client">Cliente 04</div>
        <div class="client">Cliente 05</div>
        <div class="client">Cliente 06</div>
      </div>
      <p style="margin-top:1.5rem; font-size:.85rem; color:var(--slate);">Reemplaza estos bloques con los logos o nombres reales de tus clientes.</p>
    </div>
  </section>

  <!-- CV FORM -->
  <section id="cv" class="cv">
    <div class="container">
      <span class="section-tag">Únete a la comunidad</span>
      <h2>Envía tu hoja de vida.</h2>
      <p style="max-width:720px;">Completa el formulario y adjunta tu CV. Lo guardamos en nuestra base de talento y te contactamos cuando surja una oportunidad alineada con tu perfil.</p>

      <div class="cv-layout">
        <div class="cv-info">
          <h3 style="color:var(--bone); font-size:1.1rem;">Cómo trabajamos</h3>
          <ul>
            <li>Revisamos cada aplicación dentro de los primeros 10 días hábiles.</li>
            <li>Confidencialidad absoluta: tu información no se comparte fuera del equipo de talento.</li>
            <li>Cumplimos con la Ley 1581 de Habeas Data.</li>
            <li>Te respondemos a toda aplicación, con o sin posición abierta.</li>
            <li>Nunca cobramos comisiones ni honorarios al candidato.</li>
          </ul>
        </div>

        <form class="cv-form" action="mailto:talento@bluewhaleintl.com" method="POST" enctype="multipart/form-data" onsubmit="return alertSubmit(event)">
          <div class="field-row">
            <div class="field">
              <label for="nombre">Nombre completo</label>
              <input type="text" id="nombre" name="nombre" required />
            </div>
            <div class="field">
              <label for="email">Correo</label>
              <input type="email" id="email" name="email" required />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label for="telefono">Teléfono / WhatsApp</label>
              <input type="tel" id="telefono" name="telefono" />
            </div>
            <div class="field">
              <label for="pais">País</label>
              <input type="text" id="pais" name="pais" placeholder="Colombia, Perú, Panamá, México" />
            </div>
          </div>

          <div class="field">
            <label for="linkedin">LinkedIn (opcional)</label>
            <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/" />
          </div>

          <div class="field">
            <label for="cv">Adjuntar CV (PDF, DOC, DOCX, máx 5MB)</label>
            <input type="file" id="cv" name="cv" accept=".pdf,.doc,.docx" class="file-input" required />
          </div>

          <div class="field">
            <label for="motivacion">Por qué quieres unirte (opcional)</label>
            <textarea id="motivacion" name="motivacion" placeholder="Cuéntanos brevemente qué buscas y dónde crees que podrías aportar."></textarea>
          </div>

          <label class="consent">
            <input type="checkbox" required />
            <span>Acepto el tratamiento de mis datos personales conforme a la Ley 1581 de Habeas Data y autorizo a Blue Whale International a contactarme con oportunidades laborales.</span>
          </label>

          <button type="submit" class="btn btn-primary">Enviar mi CV</button>
        </form>
      </div>
    </div>
  </section>

  <!-- CONTACT -->
  <section id="contacto" class="contact">
    <div class="container">
      <span class="section-tag">Contáctanos</span>
      <h2>Hablemos.</h2>
      <p style="max-width:720px;">Para temas de talento, escribe a talento@bluewhaleintl.com. Para cualquier otro asunto, encuéntranos por los canales abajo.</p>

      <div class="contact-grid">
        <div class="contact-card">
          <div class="label">Email talento</div>
          <a href="mailto:talento@bluewhaleintl.com">talento@bluewhaleintl.com</a>
        </div>
        <div class="contact-card">
          <div class="label">Teléfono</div>
          <a href="tel:+573022354239">+57 302 235 4239</a>
        </div>
        <div class="contact-card">
          <div class="label">Oficina principal</div>
          <span class="value">Cra 9 #115-30, piso 18<br/>Bogotá, Colombia</span>
        </div>
        <div class="contact-card">
          <div class="label">Presencia regional</div>
          <span class="value">Bogotá · Lima · Panamá · CDMX</span>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <div class="container footer-inner">
      <div class="logo">
        <span class="logo-mark">BWI</span>
        Blue Whale International
      </div>
      <div>© <span id="year"></span> Blue Whale International S.A.S. · NIT 901.444.998-3</div>
    </div>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
    function alertSubmit(e) {
      e.preventDefault();
      alert('Gracias. En la versión final, conecta este formulario a tu backend o servicio (Formspree, Cloudflare Worker, etc.) para procesar el CV.');
      return false;
    }
  </script>
</body>
</html>

`;
