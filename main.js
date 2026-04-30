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

// Reveal on scroll
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// Hero form: opens WhatsApp prefilled with name + phone
function submitHeroForm(e){
  e.preventDefault();
  const f = document.getElementById('heroForm');
  const data = new FormData(f);
  const msg = encodeURIComponent(`Hola, soy ${data.get('nombre')}. Quiero un sitio web para mi negocio. Mi WhatsApp: ${data.get('whatsapp')}`);
  window.open(`https://portal.pymewebpro.com/go/whatsapp?campaign=hero_form&text=${msg}`,'_blank');
  f.classList.add('sent');
  return false;
}

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
      // If we got a confirm_url back AND they picked a paid plan, redirect them
      // to the pay page where they can lock in the $100k discount within 24h.
      if (result.confirm_url) {
        window.location.href = result.confirm_url;
        return false;
      }
      // Otherwise (no plan selected, "No estoy seguro"), just show success state.
      f.classList.add('sent');
      return false;
    }
    // server-side problem: fall through to WhatsApp fallback
    console.warn('Contact API returned', resp.status);
  } catch (err) {
    console.warn('Contact API unreachable:', err);
  }

  btn.disabled = false;
  btn.innerHTML = originalLabel;

  // Fallback: open WhatsApp prefilled with all answers
  const msg = encodeURIComponent(
`Hola, vengo del sitio web pymewebpro.com.

Nombre: ${data.get('nombre')}
Negocio: ${data.get('negocio')}
Correo: ${data.get('email')}
WhatsApp: ${data.get('whatsapp')}
Tipo de negocio: ${data.get('tipo')}
Plan que me interesa: ${data.get('plan')||'No especificado'}
Plan Hosting: ${data.get('hosting')||'No especificado'}

Mensaje: ${data.get('mensaje')||'(sin mensaje adicional)'}`
  );
  window.open(`https://portal.pymewebpro.com/go/whatsapp?campaign=form_fallback&text=${msg}`,'_blank');
  f.classList.add('sent');
  return false;
}

// Wire up contact form submit (was previously inline onsubmit attribute,
// removed for CSP compliance — script-src 'self' without 'unsafe-inline').
(function bindContactForm(){
  const f = document.getElementById('contactForm');
  if (!f) return;
  f.addEventListener('submit', submitForm);
})();
