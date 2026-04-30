// Mobile hamburger menu
(function bindNavToggle(){
  const btn = document.getElementById('navToggle');
  const panel = document.getElementById('mobileNav');
  if(!btn || !panel) return;
  function setOpen(open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if(open){ panel.removeAttribute('hidden'); panel.classList.add('open'); }
    else { panel.classList.remove('open'); panel.setAttribute('hidden',''); }
  }
  btn.addEventListener('click', () => {
    setOpen(btn.getAttribute('aria-expanded') !== 'true');
  });
  // Close when a nav link is tapped
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  // Close on Esc
  document.addEventListener('keydown', e => { if(e.key === 'Escape') setOpen(false); });
  // Close on resize above breakpoint
  window.addEventListener('resize', () => { if(window.innerWidth > 880) setOpen(false); });
})();

// Reveal on scroll. Two gotchas the original implementation hit:
//   1. threshold:.12 didn't fire until an element was 12% on-screen, which
//      a fast-scrolling mobile user could blow past — leaving a blank
//      cream gap before the section animated in.
//   2. Above-the-fold elements with .reveal start at opacity:0 in the CSS,
//      so any delay between DOM parse and JS run produced a flash of
//      invisible content.
// Fix: instantly reveal anything already visible (or about to be) on JS
// boot, then observe the rest with threshold:0 + rootMargin pre-fire.
// CSS adds a prefers-reduced-motion bypass for accessibility / WCAG 2.3.3.
(function setupReveal(){
  const all = document.querySelectorAll('.reveal');
  // 1. Fire immediately for anything already on-screen or within ~one viewport below
  all.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 100) el.classList.add('in');
  });
  // 2. Observer for the rest — pre-fires 200px before the element scrolls in
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  } else {
    // Old browsers — just reveal everything, no animation
    document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
  }
})();

// When user clicks "Reservar mi cupo →" on a plan card, preselect the
// matching radio button on the contact form (the href #contacto handles
// the scroll). Then re-trigger the submit-button-label sync.
// If the button has data-focus="form", also scroll the form into view and
// focus the first empty required field.
(function bindReserveButtons(){
  const buttons = document.querySelectorAll('.btn-reserve[data-plan]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      const radios = document.querySelectorAll('#contactForm input[name="plan"]');
      radios.forEach(r => {
        const v = (r.value||'').toLowerCase();
        if ((plan === 'esencial' && v.includes('esencial')) ||
            (plan === 'crecimiento' && (v.includes('crecimiento') || v.includes('pro')))) {
          r.checked = true;
          r.dispatchEvent(new Event('change', {bubbles:true}));
        }
      });
      // Pay-now buttons (in-section): scroll form into view + focus first empty required field
      if (btn.dataset.focus === 'form') {
        const form = document.getElementById('contactForm');
        if (form) {
          setTimeout(() => {
            form.scrollIntoView({behavior:'smooth', block:'center'});
            const firstEmpty = form.querySelector('input[required]:placeholder-shown, input[required]:not([value])');
            if (firstEmpty && !firstEmpty.value) {
              setTimeout(() => firstEmpty.focus({preventScroll:true}), 350);
            }
          }, 50);
        }
      }
    });
  });
})();

// Update the contact-form submit button label based on selected plan:
// paid plans → "Continuar al pago →", "No estoy seguro" → "Enviar, me contactan hoy mismo →".
(function syncCtaLabel(){
  const btn = document.getElementById('contactSubmit');
  if(!btn) return;
  const radios = document.querySelectorAll('#contactForm input[name="plan"]');
  function update(){
    let v = '';
    radios.forEach(r => { if (r.checked) v = (r.value||'').toLowerCase(); });
    const isPaid = v.includes('esencial') || v.includes('crecimiento') || v.includes('growth') || v.includes('pro');
    btn.innerHTML = isPaid ? btn.dataset.payLabel : btn.dataset.talkLabel;
  }
  radios.forEach(r => r.addEventListener('change', update));
  update();
})();

// Bottom contact form: POST to /api/contact (Cloudflare Pages Function);
// falls back to WhatsApp prefill if the API is unreachable.
async function submitForm(e){
  e.preventDefault();
  const f = document.getElementById('contactForm');
  const btn = f.querySelector('button[type="submit"]');
  const data = new FormData(f);
  const payload = Object.fromEntries(data);

  const originalLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Enviando...';

  try {
    const resp = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const result = await resp.json().catch(() => ({}));
      // Single mental model: server's response decides where the user goes.
      // Paid plan with a portal confirm URL → straight to pay page.
      // Otherwise → /gracias.html (mirrors what the no-JS native form post
      // already does via the server-side 303). The user is never left in an
      // ambiguous "did this work?" state — they always end up on a real page.
      window.location.href = result.confirm_url || '/gracias.html';
      return false;
    }
    console.warn('Contact API returned', resp.status);
  } catch (err) {
    console.warn('Contact API unreachable:', err);
  }

  // API call failed (network or 5xx). Don't pretend success and don't
  // auto-open a WhatsApp tab — both behaviors hide the failure and produce
  // the "form sent, nobody replied" pattern. Surface it inline and offer
  // WhatsApp as an explicit alternative the user can choose.
  btn.disabled = false;
  btn.innerHTML = originalLabel;
  showFormError(f, data);
  return false;
}

function showFormError(f, data) {
  let banner = f.querySelector('.form-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'form-error';
    banner.setAttribute('role', 'alert');
    banner.style.cssText =
      'background:#fce4e7;border:1px solid #ce1126;color:#7a0817;' +
      'padding:14px 18px;border-radius:10px;margin:0 0 16px;font-size:.95rem;line-height:1.5';
    const fields = f.querySelector('.form-fields');
    if (fields) fields.prepend(banner);
    else f.prepend(banner);
  }
  const msg = encodeURIComponent(
    'Hola, no pude enviar el formulario en pymewebpro.com.\n\n' +
    `Nombre: ${data.get('nombre') || ''}\n` +
    `Negocio: ${data.get('negocio') || ''}\n` +
    `WhatsApp: ${data.get('whatsapp') || ''}`
  );
  banner.innerHTML =
    'No pudimos enviar su mensaje en este momento. ' +
    'Escríbanos directo y le respondemos hoy mismo: ' +
    '<a href="https://wa.me/573014047722?text=' + msg + '" ' +
      'style="color:inherit;text-decoration:underline;font-weight:600" ' +
      'rel="noopener">WhatsApp +57 301 404 7722</a> · ' +
    '<a href="mailto:ventas@pymewebpro.com" ' +
      'style="color:inherit;text-decoration:underline;font-weight:600">ventas@pymewebpro.com</a>';
  banner.scrollIntoView({behavior: 'smooth', block: 'center'});
}

// Wire up contact form submit (was previously inline onsubmit attribute,
// removed for CSP compliance — script-src 'self' without 'unsafe-inline').
(function bindContactForm(){
  const f = document.getElementById('contactForm');
  if (!f) return;
  f.addEventListener('submit', submitForm);
})();

// Cookie / data-treatment consent banner (Ley 1581 + Decreto 1377).
// Pattern: show banner once on first visit; persist choice in localStorage
// under 'pwp_consent'. Set window.__pwpConsent so future trackers (GA4,
// Meta Pixel, etc.) can gate initialization on consent. Currently the site
// runs no third-party tracking, so this is purely informational — but it
// has to ship before any tracker does, not after.
(function bindCookieBanner(){
  const STORAGE_KEY = 'pwp_consent';
  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  // Always expose the current consent state for trackers to query.
  window.__pwpConsent = stored;

  // If a decision was already made, banner stays hidden. Otherwise reveal it.
  if (stored === 'accepted' || stored === 'rejected') return;
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  banner.removeAttribute('hidden');

  function decide(value){
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
    window.__pwpConsent = value;
    banner.setAttribute('hidden', '');
    if (value === 'accepted') {
      // Trackers can listen for this event to boot themselves once consent
      // is granted mid-session (instead of only on next page load).
      document.dispatchEvent(new CustomEvent('pwp:consent-granted'));
    }
  }

  document.getElementById('cookieAccept').addEventListener('click', () => decide('accepted'));
  document.getElementById('cookieReject').addEventListener('click', () => decide('rejected'));
})();
