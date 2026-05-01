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

// Plan-picker behavior. Two places use .btn-reserve[data-plan]:
//   1. The pricing cards higher up — clicking jumps to #contacto, which is
//      a server-side anchor scroll. The plan cards in the contact section
//      ARE the source of truth, so we just store the picked plan in a
//      hidden input + update the in-form summary + scroll the form into
//      view if data-focus="form" (only true for the in-section cards,
//      since the pricing-card buttons rely on the URL hash for scroll).
//   2. The contact-section plan cards themselves.
// Either path ends with: hidden input is set, summary is updated, submit
// is enabled, label changes from "Pick a plan first" to "Continue to payment".
(function bindReserveButtons(){
  const buttons = document.querySelectorAll('.btn-reserve[data-plan]');
  if (!buttons.length) return;

  // Combined plan+hosting key → human label (sent via hidden input → portal
  // normalizes "Esencial"/"Crecimiento" to "esencial"/"pro" and
  // "mensual"/"anual" to "monthly"/"annual" before computing the quote).
  const PLAN_LABELS = {
    es: {
      'esencial:none':        { name: 'Esencial',                       price: '$390.000 COP',          form: 'Esencial ($390k)' },
      'esencial:monthly':     { name: 'Esencial + Hosting mensual',     price: '$390.000 + $30.000/mes', form: 'Esencial + Hosting mensual ($390k + $30k/mes)' },
      'esencial:annual':      { name: 'Esencial + Hosting anual',       price: '$660.000 COP',          form: 'Esencial + Hosting anual ($660k)' },
      'crecimiento:annual':   { name: 'Crecimiento',                    price: '$690.000 COP',          form: 'Crecimiento ($690k)' },
    },
    en: {
      'esencial:none':        { name: 'Essential',                      price: '$390,000 COP',          form: 'Esencial ($390k)' },
      'esencial:monthly':     { name: 'Essential + Monthly hosting',    price: '$390,000 + $30,000/mo', form: 'Esencial + Hosting mensual ($390k + $30k/mes)' },
      'esencial:annual':      { name: 'Essential + Annual hosting',     price: '$660,000 COP',          form: 'Esencial + Hosting anual ($660k)' },
      'crecimiento:annual':   { name: 'Growth',                         price: '$690,000 COP',          form: 'Crecimiento ($690k)' },
    },
  };
  const lang = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const labels = PLAN_LABELS[lang];

  const planInput = document.getElementById('planHidden');
  const hostingInput = document.getElementById('hostingHidden');
  const summary = document.getElementById('planSummary');
  const summaryName = document.getElementById('planSummaryName');
  const changeBtn = document.getElementById('changePlan');
  const submitBtn = document.getElementById('contactSubmit');

  function setPackage(planKey, hostingKey) {
    const lookup = `${planKey}:${hostingKey}`;
    const meta = labels[lookup];
    if (!meta) return;
    if (planInput) planInput.value = meta.form;
    if (hostingInput) hostingInput.value = hostingKey;
    if (summary && summaryName) {
      summary.classList.remove('is-empty');
      summaryName.textContent = meta.name + ' · ' + meta.price;
    }
    if (changeBtn) changeBtn.style.display = '';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.dataset.payLabel;
    }
    // Visually highlight the picked card in the contact section
    document.querySelectorAll('.cta-plan-card[data-plan]').forEach(c => {
      const isMatch = c.dataset.plan === planKey && (c.dataset.hosting || 'none') === hostingKey;
      c.classList.toggle('is-selected', isMatch);
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      const hosting = btn.dataset.hosting || 'none';
      // Only handle our known package combinations. Anything else (legacy
      // pricing-card buttons without data-hosting, or a 'hosting' card that
      // links to /hosting.html) just navigates normally.
      if (!labels[`${plan}:${hosting}`]) return;
      setPackage(plan, hosting);

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

  // "Change plan" → scroll back to the cards
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      const cards = document.querySelector('.cta-plan-cards');
      if (cards) cards.scrollIntoView({behavior:'smooth', block:'center'});
    });
  }
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
    `WhatsApp: ${data.get('whatsapp') || ''}\n` +
    `Plan: ${data.get('plan') || ''}`
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

// Hide the WhatsApp floater while the contact form is on-screen. On iPhone
// SE width (375px) the floater's 60px circle + 24px right margin overlaps
// the form submit button, which is annoying and risks a mistap.
(function bindFloaterHide(){
  const floater = document.querySelector('.wa-float');
  const contact = document.getElementById('contacto');
  if (!floater || !contact || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      floater.classList.toggle('hide-on-form', e.isIntersecting);
    });
  }, { threshold: 0.15 });
  io.observe(contact);
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
