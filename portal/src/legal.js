// legal.js — auto-generates Política de Tratamiento de Datos Personales (Ley 1581 de 2012)
// and Términos y Condiciones for each customer site. Spanish + optional English.
//
// LEGAL TEMPLATE NOTE: this is a reasonable starter that covers Ley 1581 de 2012,
// Decreto 1377 de 2013, and Decreto 1074 de 2015 (Colombian habeas data framework).
// It is NOT a substitute for review by a Colombian attorney, but it is significantly
// more complete than what most small Colombian businesses actually publish.

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function legalShell({ title, body, primary, ink, bg, language, businessName, parentPath }) {
  return `<!doctype html>
<html lang="${language}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>${esc(title)} · ${esc(businessName)}</title>
<style>
:root{--primary:${primary || "#003893"};--ink:${ink || "#0a1840"};--bg:${bg || "#fbfaf6"};--muted:#5e6883;--line:#e5e0c9}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65}
.wrap{max-width:780px;margin:0 auto;padding:30px 24px 60px}
.back{color:var(--primary);text-decoration:none;font-size:.9rem}.back:hover{text-decoration:underline}
h1{font-family:Georgia,serif;font-size:2rem;letter-spacing:-.01em;margin:18px 0 8px}
h2{font-family:Georgia,serif;font-size:1.25rem;margin:28px 0 8px}
h3{font-size:1rem;margin:18px 0 6px}
p,li{font-size:.97rem;color:var(--ink)}
small{color:var(--muted);font-size:.85rem}
hr{border:0;border-top:1px solid var(--line);margin:30px 0}
.note{padding:14px 16px;background:#fff;border:1px solid var(--line);border-radius:10px}
ul,ol{padding-left:22px}
</style>
</head><body><div class="wrap">
<a class="back" href="${parentPath}">← ${language === "en" ? "Back to home" : "Volver al inicio"}</a>
${body}
</div></body></html>`;
}

// ─── Privacy policy (Spanish — Ley 1581 de 2012) ───────────────────────────
export function renderPrivacyEs(data) {
  const businessName = data.businessName || "[empresa]";
  const nit = data.nit || "[NIT/cédula no proporcionado]";
  const email = data.email || "[correo no proporcionado]";
  const address = data.address || "[dirección no proporcionada]";
  const phone = data.phone || "";
  const repr = data.legalRepresentative || "";
  const today = new Date().toISOString().slice(0, 10);

  const body = `
<h1>Política de Tratamiento de Datos Personales</h1>
<p><small>Última actualización: ${today}</small></p>

<div class="note">
<p>Esta política describe cómo <strong>${esc(businessName)}</strong> recolecta, usa, almacena y protege sus datos personales conforme a la <strong>Ley 1581 de 2012</strong>, el <strong>Decreto 1377 de 2013</strong> y el <strong>Decreto 1074 de 2015</strong> de la República de Colombia.</p>
</div>

<h2>1. Responsable del tratamiento</h2>
<ul>
  <li><strong>Razón social:</strong> ${esc(businessName)}</li>
  <li><strong>NIT / Identificación:</strong> ${esc(nit)}</li>
  ${repr ? `<li><strong>Representante legal:</strong> ${esc(repr)}</li>` : ""}
  <li><strong>Domicilio:</strong> ${esc(address)}</li>
  <li><strong>Correo electrónico:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></li>
  ${phone ? `<li><strong>Teléfono:</strong> ${esc(phone)}</li>` : ""}
</ul>

<h2>2. Datos personales que tratamos</h2>
<p>A través de este sitio web podemos recolectar las siguientes categorías de datos personales, según el tipo de interacción que usted tenga con nosotros:</p>
<ul>
  <li><strong>Datos de identificación y contacto:</strong> nombre, correo electrónico, teléfono, ciudad.</li>
  <li><strong>Datos de navegación:</strong> dirección IP, tipo de navegador, páginas visitadas, fecha y hora de acceso, mediante herramientas analíticas (por ejemplo, Google Analytics).</li>
  <li><strong>Datos de marketing:</strong> dirección de correo electrónico cuando usted decide suscribirse a nuestro boletín.</li>
  <li><strong>Datos comerciales:</strong> información que usted comparta a través de formularios de contacto, reservas o solicitudes.</li>
</ul>
<p>No recolectamos datos sensibles (Ley 1581, art. 5) salvo que usted los suministre voluntariamente.</p>

<h2>3. Finalidades del tratamiento</h2>
<p>Sus datos personales serán tratados con las siguientes finalidades:</p>
<ol>
  <li>Atender sus consultas, solicitudes y reclamos.</li>
  <li>Enviar información comercial, promocional o publicitaria propia, únicamente si usted la ha autorizado expresamente (suscripción al boletín o casilla de aceptación).</li>
  <li>Cumplir con obligaciones legales, contables y tributarias.</li>
  <li>Mejorar nuestros servicios y la experiencia de uso del sitio web mediante análisis estadístico.</li>
  <li>Prevenir el fraude y proteger la seguridad del sitio.</li>
</ol>

<h2>4. Derechos del titular (habeas data)</h2>
<p>Como titular de los datos personales, usted tiene derecho a:</p>
<ul>
  <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales.</li>
  <li><strong>Solicitar prueba</strong> de la autorización otorgada para el tratamiento.</li>
  <li><strong>Ser informado</strong> sobre el uso que se le ha dado a sus datos.</li>
  <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la Ley 1581 de 2012.</li>
  <li><strong>Revocar la autorización</strong> y/o solicitar la supresión del dato cuando no se respeten los principios, derechos y garantías constitucionales y legales.</li>
  <li><strong>Acceder en forma gratuita</strong> a sus datos personales que hayan sido objeto de tratamiento.</li>
</ul>

<h2>5. Procedimiento para ejercer sus derechos</h2>
<p>Para ejercer cualquiera de los derechos anteriores, puede enviarnos su solicitud, indicando claramente el derecho que desea ejercer y adjuntando copia de su documento de identidad, a:</p>
<ul>
  <li><strong>Correo electrónico:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></li>
  ${address && address !== "[dirección no proporcionada]" ? `<li><strong>Correspondencia:</strong> ${esc(address)}</li>` : ""}
</ul>
<p>Daremos respuesta a su solicitud en un plazo máximo de <strong>quince (15) días hábiles</strong> contados desde el día siguiente a su recepción, conforme al artículo 14 de la Ley 1581 de 2012.</p>

<h2>6. Cookies y tecnologías similares</h2>
<p>Este sitio puede utilizar cookies propias y de terceros (por ejemplo, Google Analytics o Meta Pixel) con fines analíticos y publicitarios. Usted puede deshabilitar las cookies desde la configuración de su navegador. La continuación de la navegación implica la aceptación del uso de estas tecnologías para las finalidades descritas.</p>

<h2>7. Transferencia y transmisión de datos</h2>
<p>Sus datos podrán ser transferidos o transmitidos a proveedores de servicios tecnológicos (hosting, email, analítica, pasarelas de pago) que actúan como Encargados del Tratamiento bajo nuestra instrucción y bajo deberes contractuales de confidencialidad y seguridad. Cuando dicha transferencia implique países sin nivel adecuado de protección, exigiremos garantías equivalentes conforme al artículo 26 de la Ley 1581 de 2012.</p>

<h2>8. Seguridad de la información</h2>
<p>Adoptamos medidas técnicas, humanas y administrativas razonables para proteger sus datos contra acceso no autorizado, pérdida, alteración o uso indebido. Pese a estas medidas, ninguna transmisión por Internet o sistema de almacenamiento puede garantizarse 100% seguro.</p>

<h2>9. Vigencia</h2>
<p>La presente política rige a partir de la fecha de su publicación. Sus datos personales serán conservados durante el tiempo necesario para cumplir las finalidades descritas y las obligaciones legales aplicables, tras lo cual serán suprimidos de forma segura.</p>

<h2>10. Modificaciones</h2>
<p>Nos reservamos el derecho de modificar esta política en cualquier momento. Los cambios serán publicados en esta misma página con indicación de la fecha de actualización.</p>

<hr>
<small>Para infracciones a la Ley 1581 de 2012 puede acudir a la Superintendencia de Industria y Comercio (SIC) — Carrera 13 No. 27-00, Bogotá D.C., o a través de www.sic.gov.co.</small>
`;
  return legalShell({
    title: "Política de Privacidad",
    body, language: "es", businessName,
    primary: data.primary, ink: data.ink, bg: data.bg,
    parentPath: "../",
  });
}

// ─── Privacy policy (English) ─────────────────────────────────────────────
export function renderPrivacyEn(data) {
  const businessName = data.businessName || "[business]";
  const nit = data.nit || "[Tax ID not provided]";
  const email = data.email || "[email not provided]";
  const address = data.address || "[address not provided]";
  const today = new Date().toISOString().slice(0, 10);
  const repr = data.legalRepresentative || "";

  const body = `
<h1>Privacy Policy</h1>
<p><small>Last updated: ${today}</small></p>

<div class="note">
<p>This policy describes how <strong>${esc(businessName)}</strong> collects, uses, stores and protects your personal data in accordance with Colombia's <strong>Law 1581 of 2012</strong> (habeas data), <strong>Decree 1377 of 2013</strong>, and <strong>Decree 1074 of 2015</strong>.</p>
</div>

<h2>1. Data Controller</h2>
<ul>
  <li><strong>Legal name:</strong> ${esc(businessName)}</li>
  <li><strong>Tax ID:</strong> ${esc(nit)}</li>
  ${repr ? `<li><strong>Legal representative:</strong> ${esc(repr)}</li>` : ""}
  <li><strong>Address:</strong> ${esc(address)}</li>
  <li><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></li>
</ul>

<h2>2. Personal data we process</h2>
<ul>
  <li>Identification and contact data (name, email, phone, city)</li>
  <li>Browsing data (IP, browser, pages visited) via analytics tools</li>
  <li>Marketing data (newsletter email, only if you subscribe)</li>
  <li>Commercial data (information you provide via forms, bookings, requests)</li>
</ul>

<h2>3. Purposes</h2>
<ol>
  <li>Respond to your inquiries and requests.</li>
  <li>Send commercial or promotional information, only with your express consent.</li>
  <li>Comply with legal, accounting and tax obligations.</li>
  <li>Improve our services through statistical analysis.</li>
  <li>Prevent fraud and protect site security.</li>
</ol>

<h2>4. Your rights (habeas data)</h2>
<ul>
  <li>Know, update and correct your personal data.</li>
  <li>Request proof of the authorization granted.</li>
  <li>Be informed about the use given to your data.</li>
  <li>File complaints with the Superintendency of Industry and Commerce (SIC) of Colombia.</li>
  <li>Revoke authorization and/or request data deletion when applicable.</li>
  <li>Free access to personal data subject to processing.</li>
</ul>

<h2>5. How to exercise your rights</h2>
<p>Send us your request — clearly stating which right you wish to exercise and including a copy of your ID — to <a href="mailto:${esc(email)}">${esc(email)}</a>. We'll respond within fifteen (15) business days as required by Article 14 of Law 1581 of 2012.</p>

<h2>6. Cookies</h2>
<p>This site may use first- and third-party cookies (e.g. Google Analytics, Meta Pixel) for analytics and advertising. You can disable cookies in your browser settings.</p>

<h2>7. Data transfer</h2>
<p>Your data may be shared with service providers (hosting, email, analytics, payments) acting as Data Processors under contractual confidentiality and security obligations.</p>

<h2>8. Security</h2>
<p>We adopt reasonable technical, human and administrative measures to protect your data. No internet transmission can be guaranteed 100% secure.</p>

<h2>9. Validity & changes</h2>
<p>This policy is effective from the date of publication. We may update it at any time; changes will be posted on this page with an updated date.</p>

<hr>
<small>For violations of Colombian Law 1581 of 2012 you may contact the Superintendency of Industry and Commerce (SIC) at www.sic.gov.co.</small>
`;
  return legalShell({
    title: "Privacy Policy", body, language: "en", businessName,
    primary: data.primary, ink: data.ink, bg: data.bg, parentPath: "../",
  });
}

// ─── Terms of use (Spanish) ──────────────────────────────────────────────
export function renderTermsEs(data) {
  const businessName = data.businessName || "[empresa]";
  const nit = data.nit || "[NIT no proporcionado]";
  const email = data.email || "[correo no proporcionado]";
  const today = new Date().toISOString().slice(0, 10);

  const body = `
<h1>Términos y Condiciones de Uso</h1>
<p><small>Última actualización: ${today}</small></p>

<h2>1. Aceptación</h2>
<p>El acceso y uso de este sitio web implica la aceptación plena y sin reservas de los presentes Términos y Condiciones. Si usted no está de acuerdo, le solicitamos abstenerse de utilizar este sitio.</p>

<h2>2. Identificación del titular</h2>
<p>Este sitio web es operado por <strong>${esc(businessName)}</strong>, NIT/Identificación ${esc(nit)}, en Colombia.</p>

<h2>3. Uso permitido</h2>
<p>Usted se compromete a usar el sitio de forma lícita, sin atentar contra los derechos de terceros, sin introducir virus o código malicioso y sin intentar acceder a áreas restringidas. Cualquier uso indebido podrá resultar en la suspensión del acceso y en las acciones legales correspondientes.</p>

<h2>4. Propiedad intelectual</h2>
<p>Todos los contenidos del sitio (textos, imágenes, marca, logo, diseño) son propiedad de <strong>${esc(businessName)}</strong> o se utilizan con autorización del titular. Se prohíbe su reproducción, distribución o modificación sin consentimiento previo y por escrito.</p>

<h2>5. Contenido de terceros y enlaces</h2>
<p>Este sitio puede contener enlaces a sitios de terceros. No nos hacemos responsables del contenido, las políticas o las prácticas de dichos sitios. La inclusión de un enlace no implica respaldo.</p>

<h2>6. Limitación de responsabilidad</h2>
<p>El sitio se proporciona "tal cual". No garantizamos disponibilidad ininterrumpida ni la ausencia de errores. En la medida permitida por la ley, no seremos responsables por daños indirectos, lucro cesante o pérdidas de oportunidad derivadas del uso o imposibilidad de uso del sitio.</p>

<h2>7. Tratamiento de datos personales</h2>
<p>El tratamiento de sus datos personales se rige por nuestra <a href="./politica-privacidad.html">Política de Privacidad</a>, que forma parte integral de estos Términos.</p>

<h2>8. Modificaciones</h2>
<p>Podemos modificar estos Términos en cualquier momento. La versión vigente será siempre la publicada en esta página, con su fecha de actualización.</p>

<h2>9. Ley aplicable y jurisdicción</h2>
<p>Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia será resuelta por los jueces competentes de la ciudad de domicilio del titular del sitio.</p>

<h2>10. Contacto</h2>
<p>Para cualquier consulta, escríbanos a <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>
`;
  return legalShell({
    title: "Términos y Condiciones",
    body, language: "es", businessName,
    primary: data.primary, ink: data.ink, bg: data.bg, parentPath: "../",
  });
}

// ─── Terms of use (English) ─────────────────────────────────────────────
export function renderTermsEn(data) {
  const businessName = data.businessName || "[business]";
  const nit = data.nit || "[Tax ID not provided]";
  const email = data.email || "[email not provided]";
  const today = new Date().toISOString().slice(0, 10);

  const body = `
<h1>Terms of Use</h1>
<p><small>Last updated: ${today}</small></p>

<h2>1. Acceptance</h2>
<p>By accessing and using this website you accept these Terms in full. If you don't agree, please don't use this site.</p>

<h2>2. Site operator</h2>
<p>This site is operated by <strong>${esc(businessName)}</strong>, Tax ID ${esc(nit)}, Colombia.</p>

<h2>3. Permitted use</h2>
<p>You agree to use the site lawfully, without infringing third-party rights, introducing malicious code, or attempting to access restricted areas.</p>

<h2>4. Intellectual property</h2>
<p>All content (text, images, brand, logo, design) is the property of <strong>${esc(businessName)}</strong> or used with the owner's permission. Reproduction, distribution or modification without prior written consent is prohibited.</p>

<h2>5. Third-party content & links</h2>
<p>This site may link to third-party sites. We're not responsible for their content or policies; inclusion of a link doesn't imply endorsement.</p>

<h2>6. Limitation of liability</h2>
<p>The site is provided "as is". We don't guarantee uninterrupted availability or freedom from errors. To the extent permitted by law, we'll not be liable for indirect or consequential damages.</p>

<h2>7. Personal data</h2>
<p>Processing of your personal data is governed by our <a href="./privacy.html">Privacy Policy</a>, which forms part of these Terms.</p>

<h2>8. Changes</h2>
<p>We may modify these Terms at any time. The current version is the one published on this page.</p>

<h2>9. Governing law</h2>
<p>These Terms are governed by the laws of the Republic of Colombia. Any dispute will be resolved by the competent courts of the site operator's place of domicile.</p>

<h2>10. Contact</h2>
<p>For inquiries, contact us at <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>
`;
  return legalShell({
    title: "Terms of Use", body, language: "en", businessName,
    primary: data.primary, ink: data.ink, bg: data.bg, parentPath: "../",
  });
}

// ─── robots.txt + sitemap.xml ─────────────────────────────────────────────
export function renderRobots(siteUrl) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

export function renderSitemap(siteUrl, isBilingual) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `${siteUrl}/`,
    `${siteUrl}/politica-privacidad.html`,
    `${siteUrl}/terminos.html`,
  ];
  if (isBilingual) {
    urls.push(`${siteUrl}/en/`, `${siteUrl}/en/privacy.html`, `${siteUrl}/en/terms.html`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
}
