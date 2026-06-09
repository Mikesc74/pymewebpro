// pipeline.js -- Production pipeline view for PymeWebPro studio admin
// Route: GET /admin/pipeline
// API:   GET  /api/admin/pipeline/clients
//        POST /api/admin/pipeline/clients
//        POST /api/admin/pipeline/:id/stage   { stage }
//        POST /api/admin/pipeline/:id/action  { action, payload }

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Stage definitions ----------

const STAGES = [
  { id: 'new_client',          label: 'Client',         desc: 'Send 30% deposit link',          action: 'send_deposit',    actionLabel: 'Send Deposit Link' },
  { id: 'deposit_sent',        label: 'Deposit (30%)',  desc: 'Waiting for deposit payment',    action: 'confirm_deposit', actionLabel: 'Confirm Payment' },
  { id: 'deposit_paid',        label: 'Assets',         desc: 'Send intake wizard link',         action: 'send_wizard',     actionLabel: 'Send Wizard Link' },
  { id: 'wizard_sent',         label: 'Assets',         desc: 'Waiting for client assets',       action: 'confirm_assets',  actionLabel: 'Mark Assets Received' },
  { id: 'assets_received',     label: 'Generate',       desc: 'Build the site',                  action: 'open_builder',    actionLabel: 'Open Builder' },
  { id: 'approved',            label: 'Chatbot',        desc: 'Configure AI assistant',          action: 'open_chatbot',    actionLabel: 'Configure Chatbot' },
  { id: 'site_generated',      label: 'Approval',       desc: 'Send preview to client',          action: 'send_preview',    actionLabel: 'Send Preview Link' },
  { id: 'approval_sent',       label: 'Approval',       desc: 'Waiting for sign-off',            action: 'confirm_approval',actionLabel: 'Mark Approved' },
  { id: 'gbp_setup',           label: 'Google Profile', desc: 'Set up Google Business Profile',  action: 'confirm_gbp',     actionLabel: 'Mark GBP Active' },
  { id: 'gbp_active',          label: 'Google Profile', desc: 'GBP live and optimized',          action: null,              actionLabel: null },
  { id: 'chatbot_configured',  label: 'Final Payment',  desc: 'Send 70% balance link',           action: 'send_balance',    actionLabel: 'Send Balance Link' },
  { id: 'balance_sent',        label: 'Final Payment',  desc: 'Waiting for balance',             action: 'confirm_balance', actionLabel: 'Confirm Payment' },
  { id: 'balance_paid',        label: 'Live',           desc: 'Connect domain and launch',       action: 'go_live',         actionLabel: 'Go Live' },
  { id: 'live',                label: 'Live',           desc: 'Site is live',                    action: null,              actionLabel: null },
];

// Display columns (some stages share a column label)
const COLUMNS = [
  { label: 'Client',         stages: ['new_client'] },
  { label: 'Deposit (30%)',  stages: ['deposit_sent'] },
  { label: 'Assets',         stages: ['deposit_paid', 'wizard_sent'] },
  { label: 'Generate',       stages: ['assets_received'] },
  { label: 'Chatbot',        stages: ['approved'] },
  { label: 'Approval',       stages: ['site_generated', 'approval_sent'] },
  { label: 'Google Profile', stages: ['gbp_setup', 'gbp_active'] },
  { label: 'Final Payment',  stages: ['chatbot_configured', 'balance_sent'] },
  { label: 'Live',           stages: ['balance_paid', 'live'] },
];

const STAGE_ORDER = STAGES.map(s => s.id);

function stageIndex(stageId) { return STAGE_ORDER.indexOf(stageId); }
function columnIndex(stageId) { return COLUMNS.findIndex(c => c.stages.includes(stageId)); }

// ---------- AI mockup generation ----------

const MOCKUP_SYSTEM_PROMPT = `You are an expert web designer and copywriter building a production-quality single-page HTML sales website for a Colombian small business. This is a real client preview, not a demo.

CRITICAL:
- Output ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>. Nothing before or after.
- All copy must be in Colombian Spanish (warm, professional, no lorem ipsum, no placeholders).
- Use the client's exact business name, services, contact details, and brand language throughout.
- Apply the provided brand colors. If none given, choose a premium palette that fits the business type.
- The design must look hand-crafted and specific to this business, not generic.

STRUCTURE (in this order):
1. HERO: full-viewport, strong specific headline (not "Tu mejor opcion"), subheadline, primary CTA
2. SERVICES: 3-6 cards in a grid, each with a Unicode icon, name, 2-3 sentence description
3. ABOUT: 2-column layout with compelling business story and a visual (CSS gradient card)
4. SOCIAL PROOF: 2-3 testimonial cards (use provided testimonials or invent credible ones matching the business type)
5. CONTACT: contact details, hours, address in a clean grid
6. FOOTER: business name, tagline, social links, copyright

DESIGN RULES:
- Typography: load one Google Font from fonts.googleapis.com that fits the brand (Inter, Raleway, Playfair Display, Nunito, etc.)
- All CSS inline in a <style> block: no external CSS files
- Mobile-responsive with CSS Grid and Flexbox: no frameworks
- Smooth scroll, subtle hover transitions
- For images: styled CSS gradient div with emoji and label inside (e.g. <div class="img-placeholder"><span>📸</span><span>Nuestro equipo</span></div>). Never use <img> tags or placeholder services.
- WhatsApp CTA: fixed bottom-right circular button (#25D366) if a WhatsApp number is provided
- No generic marketing-speak ("el mejor", "calidad insuperable") - be specific and credible

REQUIRED CSS RULES — these must appear in your <style> block, no exceptions:
- body must have BOTH background-color AND color set explicitly (never rely on browser defaults). Example: body { background-color: #0f0f0f; color: #f5f5f5; font-family: ...; }
- Every section that uses a different background must also declare its own color for the text inside it.
- If using CSS custom properties (--var), confirm every property is actually used and resolves to a visible contrast combination.

QUALITY BAR: The result should look like a $500 USD Shopify-quality page: clean whitespace, intentional typography scale, consistent color palette, professional layout. A prospective client should feel confident hiring this business after seeing it.`;

function buildBriefText(client, sections, files, buildNotes) {
  const SECTION_LABELS = {
    business: 'Datos del negocio', contact: 'Contacto', brand: 'Marca',
    visual: 'Imagenes', content: 'Contenido', tech: 'Tecnico', growth: 'Crecimiento'
  };
  const FIELD_LABELS = {
    bizName: 'Nombre del negocio', nit: 'NIT', legalRepresentative: 'Representante legal',
    tagline: 'Eslogan', whatYouDo: 'Que hace el negocio', audience: 'Publico objetivo',
    phone: 'Telefono', whatsapp: 'WhatsApp', email: 'Correo', address: 'Direccion',
    instagram: 'Instagram', fb: 'Facebook',
    colors: 'Colores de marca', fonts: 'Tipografias preferidas',
    refSites: 'Sitios de referencia',
    tone: 'Tono de voz', topics: 'Temas clave', pages: 'Paginas requeridas', testimonials: 'Testimonios',
    domain: 'Dominio', hosting: 'Hosting', emailLocalPart: 'Correo profesional',
    emailForwardTo: 'Reenviar correo a', ga4Id: 'GA4 ID', metaPixelId: 'Meta Pixel ID',
    blogTopics: 'Blog', pdfLabel: 'PDF', teamBios: 'Equipo', faqs: 'Preguntas frecuentes'
  };
  const SECTION_ORDER = ['business', 'contact', 'brand', 'visual', 'content', 'tech', 'growth'];

  const lines = [];
  lines.push('=== BRIEF DEL CLIENTE PARA PYMEWEBPRO ===');
  lines.push('');
  lines.push('NEGOCIO: ' + (client.business_name || ''));
  lines.push('PLAN: ' + (client.plan || 'esencial'));
  lines.push('');

  SECTION_ORDER.forEach(sectionId => {
    const sectionData = sections[sectionId];
    if (!sectionData) return;
    const nonEmpty = Object.entries(sectionData).filter(([k, v]) =>
      v && String(v).trim() && !['__logoUpload', '__photosWithAlts', '__pdfUpload'].includes(k)
    );
    if (!nonEmpty.length) return;
    lines.push('[' + (SECTION_LABELS[sectionId] || sectionId) + ']');
    nonEmpty.forEach(([key, value]) => {
      const label = FIELD_LABELS[key] || key;
      lines.push('  ' + label + ': ' + String(value).replace(/\n/g, ' | '));
    });
    lines.push('');
  });

  const logos = files.filter(f => f.category === 'logo');
  const photos = files.filter(f => f.category === 'photo');
  const pdfs = files.filter(f => f.category === 'pdf');
  lines.push('[Archivos del cliente]');
  lines.push('  Logo: ' + logos.length + ' archivo(s)' + (logos.length ? ' - ' + logos.map(f => f.filename).join(', ') : ''));
  lines.push('  Fotos: ' + photos.length + ' foto(s)' + (photos.length ? ' - ' + photos.map(f => f.filename).join(', ') : ''));
  lines.push('  PDFs: ' + pdfs.length);
  lines.push('');

  if (buildNotes && buildNotes.trim()) {
    lines.push('[Instrucciones del equipo PymeWebPro]');
    lines.push(buildNotes.trim().replace(/\n/g, '\n  '));
    lines.push('');
  }

  lines.push('=== FIN DEL BRIEF ===');
  lines.push('');
  lines.push('Genera ahora la pagina web completa. Usa toda la informacion anterior.');
  lines.push('Si falta informacion especifica, inventala de manera creible basandote en el tipo de negocio.');
  lines.push('Recuerda: Colombia, pesos COP, telefono con prefijo colombiano, tono calido y profesional.');

  return lines.join('\n');
}

// ---------- API handlers ----------

export async function handlePipelineApi(path, request, env) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  // GET /clients
  if (path === 'clients' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT id, email, business_name, plan, production_stage,
              deposit_link, deposit_amount, deposit_paid_at,
              wizard_link, preview_url,
              balance_link, balance_amount, balance_paid_at,
              domain, wa_number, stage_updated_at, created_at,
              intake_assets, deliverables_state, mockup_generated_at
       FROM clients ORDER BY created_at DESC`
    ).all();
    return json(rows.results || []);
  }

  // POST /clients
  if (path === 'clients' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { business_name, email, plan } = body;
    if (!business_name) return json({ error: 'business_name required' }, 400);
    const id = business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO clients (id, business_name, email, plan, status, language, production_stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'invited', 'es', 'new_client', ?, ?)`
    ).bind(id, business_name, email || null, plan || 'esencial', now, now).run();
    return json({ ok: true, id });
  }

  // GET /:id/intake - fetch submitted intake sections + uploaded files for the generate panel
  const intakeMatch = path.match(/^([^/]+)\/intake$/);
  if (intakeMatch && request.method === 'GET') {
    const clientId = intakeMatch[1];
    const [subs, files] = await Promise.all([
      env.DB.prepare('SELECT section, data FROM submissions WHERE client_id = ?').bind(clientId).all(),
      env.DB.prepare('SELECT id, category, filename, mime_type, size_bytes, uploaded_at FROM files WHERE client_id = ? ORDER BY uploaded_at ASC').bind(clientId).all(),
    ]);
    const sections = {};
    for (const row of (subs.results || [])) {
      try { sections[row.section] = JSON.parse(row.data); } catch {}
    }
    return json({ sections, files: files.results || [] });
  }

  // POST /:id/stage
  const stageMatch = path.match(/^([^/]+)\/stage$/);
  if (stageMatch && request.method === 'POST') {
    const id = stageMatch[1];
    const body = await request.json().catch(() => ({}));
    const { stage } = body;
    if (!STAGE_ORDER.includes(stage)) return json({ error: 'Invalid stage' }, 400);
    await env.DB.prepare(
      `UPDATE clients SET production_stage = ?, stage_updated_at = ? WHERE id = ?`
    ).bind(stage, Date.now(), id).run();
    return json({ ok: true, stage });
  }

  // POST /:id/action
  const actionMatch = path.match(/^([^/]+)\/action$/);
  if (actionMatch && request.method === 'POST') {
    const id = actionMatch[1];
    const body = await request.json().catch(() => ({}));
    const { action, payload } = body;

    const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
    if (!client) return json({ error: 'Not found' }, 404);

    if (action === 'save_deposit_link') {
      await env.DB.prepare(
        `UPDATE clients SET deposit_link = ?, deposit_amount = ?, production_stage = ?, stage_updated_at = ? WHERE id = ?`
      ).bind(payload.link, payload.amount || null, 'deposit_sent', Date.now(), id).run();
      await sendPipelineEmail(env, {
        to: client.email,
        subject: 'Comencemos con tu sitio web — PymeWebPro',
        html: depositEmailHtml(client, payload.link, payload.amount),
      });
      return json({ ok: true });
    }

    if (action === 'confirm_deposit') {
      const now = Date.now();
      await env.DB.prepare(
        `UPDATE clients SET production_stage = 'deposit_paid', stage_updated_at = ?,
         deposit_paid_at = ?, deposit_amount = ? WHERE id = ?`
      ).bind(now, now, payload.amount || null, id).run();
      return json({ ok: true });
    }

    if (action === 'save_wizard_link') {
      // Generate a fresh 7-day direct-login token every time this is called.
      // Caller passes payload.send_email = true to also send the email to the client.
      const token = randomToken(32);
      await env.TOKENS.put(`magic:${token}`, id, { expirationTtl: 60 * 60 * 24 * 7 });
      const link = `https://portal.pymewebpro.com/auth/verify?token=${token}`;
      await env.DB.prepare('UPDATE clients SET wizard_link = ?, production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind(link, 'wizard_sent', Date.now(), id).run();
      if (payload && payload.send_email) {
        await sendPipelineEmail(env, {
          to: client.email,
          subject: 'Tu formulario de informacion — PymeWebPro',
          html: wizardEmailHtml(client, link),
        });
      }
      return json({ ok: true, link });
    }

    if (action === 'mark_comp') {
      const now = Date.now();
      await env.DB.prepare(
        `UPDATE clients SET production_stage = 'deposit_paid', stage_updated_at = ?,
         deposit_paid_at = ?, deposit_amount = 0 WHERE id = ?`
      ).bind(now, now, id).run();
      return json({ ok: true });
    }

    if (action === 'confirm_assets') {
      await env.DB.prepare('UPDATE clients SET production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind('assets_received', Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'save_preview_url') {
      await env.DB.prepare('UPDATE clients SET preview_url = ?, updated_at = ? WHERE id = ?')
        .bind(payload.url, Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'save_preview') {
      await env.DB.prepare('UPDATE clients SET preview_url = ?, production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind(payload.url, 'site_generated', Date.now(), id).run();
      await sendPipelineEmail(env, {
        to: client.email,
        subject: 'Tu sitio web esta listo para revisar - PymeWebPro',
        html: previewEmailHtml(client, payload.url),
      });
      return json({ ok: true });
    }

    if (action === 'confirm_approval') {
      await env.DB.prepare('UPDATE clients SET production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind('gbp_setup', Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'confirm_chatbot') {
      await env.DB.prepare('UPDATE clients SET production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind('site_generated', Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'save_balance_link') {
      await env.DB.prepare('UPDATE clients SET balance_link = ?, production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind(payload.link, 'balance_sent', Date.now(), id).run();
      await sendPipelineEmail(env, {
        to: client.email,
        subject: 'Aprobaste el diseno — ultimo pago para publicar tu sitio',
        html: balanceEmailHtml(client, payload.link),
      });
      return json({ ok: true });
    }

    if (action === 'confirm_balance') {
      const now = Date.now();
      await env.DB.prepare(
        `UPDATE clients SET production_stage = 'balance_paid', stage_updated_at = ?,
         balance_paid_at = ?, balance_amount = ? WHERE id = ?`
      ).bind(now, now, payload.amount || null, id).run();
      return json({ ok: true });
    }

    if (action === 'update_client') {
      const { business_name, email, plan, domain, wa_number } = payload;
      if (!business_name) return json({ error: 'business_name required' }, 400);
      await env.DB.prepare(
        `UPDATE clients SET business_name = ?, email = ?, plan = ?, domain = ?, wa_number = ?, updated_at = ? WHERE id = ?`
      ).bind(business_name, email || null, plan || 'esencial', domain || null, wa_number || null, Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'save_build_notes') {
      let state = {};
      try { state = JSON.parse(client.deliverables_state || '{}'); } catch {}
      state.build_notes = payload.notes;
      await env.DB.prepare('UPDATE clients SET deliverables_state = ? WHERE id = ?')
        .bind(JSON.stringify(state), id).run();
      return json({ ok: true });
    }

    if (action === 'save_change_log') {
      let state = {};
      try { state = JSON.parse(client.deliverables_state || '{}'); } catch {}
      state.change_requests = payload.log;
      await env.DB.prepare('UPDATE clients SET deliverables_state = ? WHERE id = ?')
        .bind(JSON.stringify(state), id).run();
      return json({ ok: true });
    }

    if (action === 'toggle_intake_asset') {
      let assets = {};
      try { assets = client.intake_assets ? JSON.parse(client.intake_assets) : {}; } catch {}
      if (payload.received === true) assets[payload.key] = true;
      else delete assets[payload.key];
      await env.DB.prepare('UPDATE clients SET intake_assets = ? WHERE id = ?')
        .bind(JSON.stringify(assets), id).run();
      return json({ ok: true, intake_assets: assets });
    }

    if (action === 'save_domain') {
      await env.DB.prepare('UPDATE clients SET domain = ?, site_url = ?, production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind(payload.domain, payload.domain, 'live', Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'save_gbp_url') {
      let state = {};
      try { state = JSON.parse(client.deliverables_state || '{}'); } catch {}
      state.gbp_url = payload.url;
      await env.DB.prepare('UPDATE clients SET deliverables_state = ? WHERE id = ?')
        .bind(JSON.stringify(state), id).run();
      return json({ ok: true });
    }

    if (action === 'toggle_gbp_item') {
      let state = {};
      try { state = JSON.parse(client.deliverables_state || '{}'); } catch {}
      state.gbp_items = state.gbp_items || {};
      state.gbp_items[payload.key] = payload.received;
      await env.DB.prepare('UPDATE clients SET deliverables_state = ? WHERE id = ?')
        .bind(JSON.stringify(state), id).run();
      return json({ ok: true });
    }

    if (action === 'confirm_gbp') {
      await env.DB.prepare('UPDATE clients SET production_stage = ?, stage_updated_at = ? WHERE id = ?')
        .bind('gbp_active', Date.now(), id).run();
      return json({ ok: true });
    }

    if (action === 'generate_mockup') {
      if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured on this worker' }, 500);

      // Fetch intake data
      const [subs, files] = await Promise.all([
        env.DB.prepare('SELECT section, data FROM submissions WHERE client_id = ?').bind(id).all(),
        env.DB.prepare('SELECT id, category, filename FROM files WHERE client_id = ? ORDER BY uploaded_at ASC').bind(id).all(),
      ]);
      const sections = {};
      for (const row of (subs.results || [])) {
        try { sections[row.section] = JSON.parse(row.data); } catch {}
      }
      let delivState = {};
      try { delivState = JSON.parse(client.deliverables_state || '{}'); } catch {}

      const brief = buildBriefText(client, sections, files.results || [], delivState.build_notes || '');

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 6000,
          system: MOCKUP_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: brief }],
        }),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text().catch(() => 'unknown');
        return json({ error: 'Anthropic API error: ' + errText }, 500);
      }

      const aiData = await apiRes.json();
      let generatedHtml = (aiData.content && aiData.content[0] && aiData.content[0].text) || '';

      // Strip markdown code fences Claude sometimes wraps around the output
      generatedHtml = generatedHtml.trim();
      if (generatedHtml.startsWith('```')) {
        generatedHtml = generatedHtml.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }

      if (!generatedHtml || !generatedHtml.includes('<html')) {
        return json({ error: 'AI did not return valid HTML. Raw: ' + generatedHtml.slice(0, 200) }, 500);
      }

      const now = Date.now();
      await env.DB.prepare(
        'UPDATE clients SET generated_mockup = ?, mockup_generated_at = ?, updated_at = ? WHERE id = ?'
      ).bind(generatedHtml, now, now, id).run();

      return json({ ok: true, mockup_url: '/pipeline-mockup/' + id });
    }

    return json({ error: 'Unknown action' }, 400);
  }

  // POST /:id/delete
  const deleteMatch = path.match(/^([^/]+)\/delete$/);
  if (deleteMatch && request.method === 'POST') {
    const id = deleteMatch[1];
    await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

// ---------- Email helpers ----------

async function sendPipelineEmail(env, { to, subject, html }) {
  if (!to || !env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || 'PymeWebPro <noreply@pymewebpro.com>',
        to: [to],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error('Pipeline email failed:', e);
  }
}

function emailWrap(content) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:32px auto;padding:0 16px">
  <div style="text-align:center;padding:24px 0 20px">
    <span style="font-size:20px;font-weight:700;color:#FF5C2E">&lt;pwp/&gt;</span>
    <span style="font-size:15px;font-weight:600;color:#374151"> PymeWebPro</span>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px 36px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    ${content}
  </div>
  <div style="text-align:center;padding:20px 0;font-size:12px;color:#9ca3af">
    PymeWebPro · Medellin, Colombia<br>
    <a href="https://pymewebpro.com" style="color:#FF5C2E;text-decoration:none">pymewebpro.com</a>
    &nbsp;·&nbsp;
    <a href="https://wa.me/573014047722" style="color:#9ca3af;text-decoration:none">WhatsApp</a>
  </div>
</div>
</body></html>`;
}

function ctaBtn(label, url) {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="display:inline-block;background:#FF5C2E;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none">${label}</a>
  </div>
  <p style="text-align:center;margin:0;font-size:12px;color:#9ca3af">Si el boton no funciona, copia este enlace:<br>
    <a href="${url}" style="color:#FF5C2E;word-break:break-all">${url}</a>
  </p>`;
}

function depositEmailHtml(client, link, amount) {
  const name = client.business_name || 'hola';
  const amountLabel = amount ? `$${Number(amount).toLocaleString('es-CO')} COP` : '$120.000 COP';
  return emailWrap(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#111">Comencemos con tu sitio web</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hola ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
      Tu proyecto esta listo para arrancar. El primer paso es confirmar el pago del deposito inicial
      (${amountLabel}) a traves del siguiente enlace de pago seguro.
    </p>
    ${ctaBtn('Pagar deposito ahora', link)}
    <div style="margin:24px 0 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
        Una vez confirmado el pago, te enviamos el formulario para que nos compartas la informacion de tu negocio y comenzamos a construir tu sitio.
      </p>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af">
      Cualquier duda, respondenos a este correo o escribe al WhatsApp.<br>Santiago y Mike · PymeWebPro
    </p>
  `);
}

function wizardEmailHtml(client, link) {
  const name = client.business_name || 'hola';
  return emailWrap(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#111">Tu formulario de informacion</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hola ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
      Excelente, recibimos tu deposito. Ahora necesitamos que completes este formulario con la informacion de tu negocio
      (logo, fotos, descripcion, servicios, horarios, etc.) para comenzar a construir tu sitio.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px">
      Solo te toma unos minutos y es todo lo que necesitamos de tu parte para arrancar.
    </p>
    ${ctaBtn('Completar formulario', link)}
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af">
      Cualquier duda, respondenos a este correo o escribe al WhatsApp.<br>Santiago y Mike · PymeWebPro
    </p>
  `);
}

function previewEmailHtml(client, url) {
  const name = client.business_name || 'hola';
  return emailWrap(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#111">Tu sitio web esta listo para revisar</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hola ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
      Terminamos la primera version de tu sitio web. Puedes verlo en el siguiente enlace y decirnos
      si tienes alguna correccion o si todo esta bien para publicarlo.
    </p>
    ${ctaBtn('Ver mi sitio web', url)}
    <div style="margin:24px 0 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
        Si tienes correcciones, respondenos a este correo con los detalles. Una vez aprobado el diseno,
        procedemos con el pago final y la publicacion del sitio.
      </p>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af">
      Cualquier duda, respondenos a este correo o escribe al WhatsApp.<br>Santiago y Mike · PymeWebPro
    </p>
  `);
}

function balanceEmailHtml(client, link) {
  const name = client.business_name || 'hola';
  return emailWrap(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#111">Aprobaste el diseno — ultimo paso</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hola ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
      Perfecto, aprobaste el diseno de tu sitio. El ultimo paso antes de publicarlo es confirmar
      el pago del saldo restante (70%) a traves del siguiente enlace.
    </p>
    ${ctaBtn('Pagar saldo final', link)}
    <div style="margin:24px 0 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
        Una vez confirmado el pago, conectamos tu dominio y tu sitio queda publicado y listo para recibir clientes.
      </p>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af">
      Cualquier duda, respondenos a este correo o escribe al WhatsApp.<br>Santiago y Mike · PymeWebPro
    </p>
  `);
}

// ---------- HTML page ----------

export function pipelinePageHTML(env) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pipeline · PymeWebPro</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#1e2129;color:#e8eaf0;font-size:13px;min-height:100vh}
a{color:inherit;text-decoration:none}

.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:#161920;border-bottom:1px solid rgba(255,255,255,.07)}
.topbar-brand{font-size:13px;font-weight:600;color:#fff;letter-spacing:-.01em}
.topbar-brand span{color:#FF5C2E}
.topbar-actions{display:flex;align-items:center;gap:10px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:opacity .15s}
.btn-primary{background:#FF5C2E;color:#fff}
.btn-primary:hover{opacity:.88}
.btn-ghost{background:rgba(255,255,255,.07);color:#ccc;border:1px solid rgba(255,255,255,.1)}
.btn-ghost:hover{background:rgba(255,255,255,.12);color:#fff}
.btn-sm{padding:5px 11px;font-size:11px}

.layout{display:flex;height:calc(100vh - 49px);overflow:hidden}
.pipeline-wrap{flex:1;overflow:auto;padding:20px 24px}

.stage-headers{display:flex;gap:4px;margin-bottom:6px;position:sticky;top:0;z-index:10;background:#1e2129;padding:4px 0 8px}
.col-spacer{width:200px;flex-shrink:0;margin-right:4px}
.stage-header{width:188px;flex-shrink:0;padding:8px 10px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
.stage-header-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em}
.stage-header-count{font-size:18px;font-weight:700;color:#fff;margin-top:2px;line-height:1}

.clients{display:flex;flex-direction:column;gap:5px}
.client-row{display:flex;gap:4px;align-items:stretch;min-height:80px}

.client-card{width:200px;flex-shrink:0;margin-right:4px;background:#262b36;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:11px 13px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:background .12s,border-color .12s}
.client-card:hover{background:#2e3344;border-color:rgba(255,255,255,.16)}
.client-row.selected .client-card{border-color:rgba(255,92,46,.6);box-shadow:0 0 0 1px rgba(255,92,46,.25)}
.client-name{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.client-email{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.client-plan{display:inline-block;margin-top:6px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px;background:rgba(255,92,46,.15);color:#FF5C2E;text-transform:uppercase;letter-spacing:.04em}

.stage-cell{width:188px;flex-shrink:0;border-radius:9px;padding:11px 12px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid transparent;transition:border-color .12s,background .12s}
.stage-cell.s-done{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.04);cursor:pointer}
.stage-cell.s-done:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12)}
.stage-cell.s-active{background:#262b36;border-color:rgba(255,255,255,.15);box-shadow:0 0 0 1px rgba(255,92,46,.2);cursor:pointer}
.stage-cell.s-pending{background:transparent;opacity:.25}
.cell-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.cell-stage-name{font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.05em}
.cell-check{width:16px;height:16px;border-radius:50%;background:rgba(52,211,153,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cell-check svg{width:9px;height:9px;stroke:#34d399;stroke-width:2.5;fill:none}
.cell-body{flex:1}
.cell-info{font-size:12px;color:rgba(255,255,255,.6);line-height:1.4}
.cell-action-btn{display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid rgba(255,92,46,.4);background:rgba(255,92,46,.1);color:#FF5C2E;cursor:pointer;font-family:inherit;transition:all .12s;white-space:nowrap}
.cell-action-btn:hover{background:rgba(255,92,46,.2);border-color:rgba(255,92,46,.7)}
.active-badge{display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:10px;font-weight:600;color:#FF5C2E;text-transform:uppercase;letter-spacing:.04em}
.active-dot{width:5px;height:5px;border-radius:50%;background:#FF5C2E;animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.empty-state{text-align:center;padding:60px 20px;color:rgba(255,255,255,.3)}
.empty-state h3{font-size:16px;font-weight:500;margin-bottom:6px;color:rgba(255,255,255,.5)}
.add-row{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border:1px dashed rgba(255,255,255,.12);border-radius:9px;color:rgba(255,255,255,.3);cursor:pointer;font-size:13px;margin-top:6px;transition:all .12s}
.add-row:hover{border-color:rgba(255,92,46,.4);color:#FF5C2E}

.toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.search-input{padding:7px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:#fff;font-size:13px;font-family:inherit;outline:none;width:220px}
.search-input::placeholder{color:rgba(255,255,255,.3)}
.filter-btn{padding:6px 12px;border-radius:7px;font-size:12px;font-weight:500;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.5);cursor:pointer;font-family:inherit;transition:all .12s}
.filter-btn.active{background:rgba(255,92,46,.1);color:#FF5C2E;border-color:rgba(255,92,46,.3)}

.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:none;align-items:center;justify-content:center}
.modal-bg.open{display:flex}
.modal{background:#262b36;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:28px;width:100%;max-width:440px;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.modal-title{font-size:16px;font-weight:600;color:#fff;margin-bottom:4px}
.modal-sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:20px}
.modal-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:block}
.modal-input{width:100%;padding:10px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fff;font-size:13px;font-family:inherit;outline:none;transition:border-color .15s}
.modal-input:focus{border-color:rgba(255,92,46,.6)}
.modal-row{display:flex;gap:8px;margin-top:16px}
.modal-msg{margin-top:10px;font-size:12px;color:rgba(255,255,255,.4);font-style:italic;min-height:18px}

.copy-hint{position:fixed;bottom:20px;right:20px;background:#34d399;color:#111;font-size:12px;font-weight:600;padding:8px 14px;border-radius:8px;z-index:200;opacity:0;transform:translateY(6px);transition:all .2s;pointer-events:none}
.copy-hint.show{opacity:1;transform:translateY(0)}

/* Drawer */
.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:none}
.drawer-overlay.open{display:block}
.drawer{position:fixed;top:0;right:0;width:460px;max-width:100vw;height:100vh;background:#1a1e28;border-left:1px solid rgba(255,255,255,.1);z-index:51;transform:translateX(100%);transition:transform .22s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
.drawer.open{transform:translateX(0)}

.drawer-header{padding:18px 24px 14px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.drawer-header-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px}
.drawer-close{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:20px;line-height:1;padding:2px;border-radius:4px}
.drawer-close:hover{color:#fff}
.drawer-name{font-size:17px;font-weight:700;color:#fff}
.drawer-email{font-size:12px;color:rgba(255,255,255,.4);margin-top:2px}
.drawer-meta{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.d-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px}
.d-badge-plan{background:rgba(255,92,46,.15);color:#FF5C2E;text-transform:uppercase;letter-spacing:.04em}
.d-badge-stage{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)}
.d-badge-live{background:rgba(52,211,153,.15);color:#34d399}

.drawer-progress{padding:14px 24px 12px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}
.progress-label{font-size:10px;font-weight:600;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
.progress-track{display:flex;gap:3px}
.progress-step{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.1);cursor:pointer;transition:background .15s,transform .1s}
.progress-step:hover{transform:scaleY(1.5)}
.progress-step.ps-done{background:#34d399}
.progress-step.ps-active{background:#FF5C2E}
.progress-step.ps-focused{outline:2px solid rgba(255,255,255,.45);outline-offset:2px}

/* Stage panel */
.drawer-body{flex:1;overflow-y:auto;padding:20px 24px 28px}

.sp-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.07)}
.sp-icon{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.sp-icon-done{background:rgba(52,211,153,.15);color:#34d399}
.sp-icon-active{background:rgba(255,92,46,.15);color:#FF5C2E}
.sp-icon-pending{background:rgba(255,255,255,.06);color:rgba(255,255,255,.2)}
.sp-label{font-size:16px;font-weight:700;color:#fff;line-height:1.2}
.sp-state{font-size:12px;margin-top:3px;font-weight:500}
.sp-state-done{color:#34d399}
.sp-state-active{color:#FF5C2E}
.sp-state-pending{color:rgba(255,255,255,.3)}

.sp-field{margin-bottom:14px}
.sp-field-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.sp-field-val{font-size:13px;color:#e8eaf0;line-height:1.5}
.sp-field-link{display:flex;align-items:center;gap:8px}
.sp-field-link a{color:#FF5C2E;font-size:12px;word-break:break-all;flex:1}
.copy-btn{background:rgba(255,255,255,.07);border:none;border-radius:5px;color:rgba(255,255,255,.5);cursor:pointer;font-size:11px;padding:4px 8px;white-space:nowrap;font-family:inherit;flex-shrink:0}
.copy-btn:hover{background:rgba(255,255,255,.13);color:#fff}

.done-tag{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:7px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);color:#34d399;font-size:12px;font-weight:600;margin-top:4px}

.sp-pending{font-size:13px;color:rgba(255,255,255,.3);padding:4px 0 12px;line-height:1.6}

.sp-controls{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.07)}
.sp-input{width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:#fff;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px}
.sp-input:focus{border-color:rgba(255,92,46,.5)}
.sp-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:11px 18px;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:opacity .15s;width:100%;margin-top:6px}
.sp-btn:first-child{margin-top:0}
.sp-btn-primary{background:#FF5C2E;color:#fff}
.sp-btn-primary:hover{opacity:.88}
.sp-btn-ghost{background:rgba(255,255,255,.07);color:#ccc;border:1px solid rgba(255,255,255,.1)}
.sp-btn-ghost:hover{background:rgba(255,255,255,.12);color:#fff}
.sp-msg{font-size:12px;color:rgba(255,255,255,.4);font-style:italic;min-height:16px;margin-top:8px;text-align:center}

.sp-nav{display:flex;align-items:center;justify-content:space-between;margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)}
.sp-nav .btn{font-size:11px}

.ext-link{display:flex;align-items:center;gap:6px;padding:11px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#FF5C2E;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:10px;transition:background .12s}
.ext-link:hover{background:rgba(255,255,255,.09)}

/* Intake checklist */
.intake-list{margin-top:10px}
.intake-list-title{font-size:11px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.intake-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;transition:background .1s}
.intake-item:last-child{border-bottom:none}
.intake-item:hover .intake-label{color:#fff}
.intake-check{width:18px;height:18px;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .15s}
.intake-check-on{background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.3);color:#34d399}
.intake-check-off{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:transparent}
.intake-label{font-size:13px;flex:1}
.intake-label-on{color:rgba(255,255,255,.55);text-decoration:line-through;text-decoration-color:rgba(52,211,153,.4)}
.intake-label-off{color:rgba(255,255,255,.8)}
.intake-summary{font-size:11px;color:rgba(255,255,255,.3);margin-top:8px}

/* Deliverables progress */
.deliv-group{margin-bottom:12px}
.deliv-group-label{font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.deliv-item{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px}
.deliv-icon-done{color:#34d399;font-size:12px;flex-shrink:0;width:14px}
.deliv-icon-prog{color:#fbbf24;font-size:12px;flex-shrink:0;width:14px}
.deliv-icon-pending{color:rgba(255,255,255,.2);font-size:12px;flex-shrink:0;width:14px}
.deliv-label-done{color:rgba(255,255,255,.5)}
.deliv-label-prog{color:rgba(255,255,255,.8)}
.deliv-label-pending{color:rgba(255,255,255,.3)}

/* Danger zone */
.danger-zone{margin-top:24px;padding-top:16px;border-top:1px solid rgba(239,68,68,.2)}
.danger-zone-label{font-size:10px;font-weight:600;color:rgba(239,68,68,.5);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.sp-btn-danger{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.25)}
.sp-btn-danger:hover{background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.5)}
.sp-btn-danger-confirm{background:#ef4444;color:#fff;border:none}
.sp-btn-danger-confirm:hover{opacity:.88}
.delete-confirm{display:none;margin-top:10px;padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px}
.delete-confirm.show{display:block}
.delete-confirm p{font-size:12px;color:#fca5a5;margin-bottom:10px;line-height:1.5}
.delete-confirm-row{display:flex;gap:8px}
.sp-select{width:100%;padding:9px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:#fff;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px}
.sp-select:focus{border-color:rgba(255,92,46,.5)}
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-brand"><span>&lt;pwp/&gt;</span> Production Pipeline</div>
  <div class="topbar-actions">
    <span id="client-count" style="font-size:12px;color:rgba(255,255,255,.4)"></span>
    <button class="btn btn-ghost btn-sm" onclick="refresh()">Refresh</button>
    <button class="btn btn-primary btn-sm" onclick="openAddClient()">+ Add Client</button>
  </div>
</div>

<!-- Login screen -->
<div id="login-screen" style="display:none;position:fixed;inset:0;background:#1e2129;z-index:9999;align-items:center;justify-content:center;">
  <div style="background:#262b36;border-radius:12px;padding:36px 32px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,.4);">
    <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:4px;">&lt;pwp/&gt; Pipeline</div>
    <div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:24px;">Enter your admin token to continue.</div>
    <input id="login-token-input" type="password" placeholder="Admin token"
      style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:14px;outline:none;margin-bottom:12px;"
      onkeydown="if(event.key==='Enter')submitLogin()">
    <button onclick="submitLogin()"
      style="width:100%;padding:10px;border-radius:7px;border:none;background:#FF5C2E;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">
      Sign in
    </button>
  </div>
</div>

<div class="layout">
  <div class="pipeline-wrap" id="pipeline-wrap">
    <div class="toolbar">
      <input class="search-input" id="search" placeholder="Search clients..." oninput="renderPipeline()">
      <button class="filter-btn active" onclick="setFilter('all',this)">All</button>
      <button class="filter-btn" onclick="setFilter('active',this)">Active</button>
      <button class="filter-btn" onclick="setFilter('live',this)">Live</button>
    </div>
    <div class="stage-headers" id="stage-headers"></div>
    <div class="clients" id="clients-list"></div>
  </div>
</div>

<!-- Modal -->
<div class="modal-bg" id="modal">
  <div class="modal">
    <div class="modal-title" id="modal-title"></div>
    <div class="modal-sub" id="modal-sub"></div>
    <div id="modal-body"></div>
    <div class="modal-row" id="modal-actions"></div>
    <div class="modal-msg" id="modal-msg"></div>
  </div>
</div>

<!-- Drawer -->
<div class="drawer-overlay" id="drawer-overlay" onclick="closeDrawer()"></div>
<div class="drawer" id="drawer">
  <div class="drawer-header">
    <div class="drawer-header-top">
      <div>
        <div class="drawer-name" id="d-name"></div>
        <div class="drawer-email" id="d-email"></div>
      </div>
      <button class="drawer-close" onclick="closeDrawer()">&#x2715;</button>
    </div>
    <div class="drawer-meta" id="d-meta"></div>
  </div>
  <div class="drawer-progress">
    <div class="progress-label">Pipeline — click a stage to inspect</div>
    <div class="progress-track" id="d-progress"></div>
  </div>
  <div class="drawer-body" id="d-body"></div>
</div>

<div class="copy-hint" id="copy-hint">Copied</div>

<script>
const COLUMNS = [
  { label: 'Client',         stages: ['new_client'] },
  { label: 'Deposit (30%)',  stages: ['deposit_sent'] },
  { label: 'Assets',         stages: ['deposit_paid', 'wizard_sent'] },
  { label: 'Generate',       stages: ['assets_received'] },
  { label: 'Chatbot',        stages: ['approved'] },
  { label: 'Approval',       stages: ['site_generated', 'approval_sent'] },
  { label: 'Google Profile', stages: ['gbp_setup', 'gbp_active'] },
  { label: 'Final Payment',  stages: ['chatbot_configured', 'balance_sent'] },
  { label: 'Live',           stages: ['balance_paid', 'live'] },
];
const STAGE_ORDER = ${JSON.stringify(STAGE_ORDER)};
const STAGES_MAP = ${JSON.stringify(Object.fromEntries(STAGES.map(s => [s.id, s])))};

const INTAKE_ITEMS = [
  { key: 'logo',        label: 'Business logo (PNG / SVG)' },
  { key: 'photos',      label: 'Photos (products, location, team)' },
  { key: 'about',       label: 'Business description (About text)' },
  { key: 'services',    label: 'Services / products list' },
  { key: 'contact',     label: 'Contact info (address, phone, WhatsApp)' },
  { key: 'hours',       label: 'Business hours' },
  { key: 'colors',      label: 'Brand colors' },
  { key: 'social',      label: 'Social media handles (IG, FB, etc.)' },
  { key: 'gbp',         label: 'Google Business Profile access' },
];

const DELIVERABLE_GROUPS = {setup:'Technical setup',design:'Design and branding',pages:'Sections',features:'Features',seo:'SEO + Analytics',close:'Closeout'};

let clients = [];
let currentFilter = 'all';
let adminToken = null;
let activeDrawerClientId = null;
let activeDrawerColIdx = null;
let lastIntakeData = null;

// ---------- Auth ----------

function getToken() {
  if (adminToken) return adminToken;
  const p = new URLSearchParams(location.search);
  adminToken = p.get('admin') || p.get('session') || localStorage.getItem('pwp_admin') || '';
  return adminToken;
}

async function api(method, path, body) {
  const res = await fetch('/api/admin/pipeline/' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('pwp_admin');
    adminToken = null;
    showLogin();
    throw new Error('Unauthorized');
  }
  return res.json();
}

function showLogin() {
  document.getElementById('pipeline-wrap').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  setTimeout(() => document.getElementById('login-token-input')?.focus(), 50);
}

function submitLogin() {
  const tok = (document.getElementById('login-token-input')?.value || '').trim();
  if (!tok) return;
  localStorage.setItem('pwp_admin', tok);
  adminToken = tok;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('pipeline-wrap').style.display = 'block';
  refresh();
}

// ---------- Data ----------

async function refresh() {
  const data = await api('GET', 'clients').catch(() => null);
  if (!data) return;
  clients = Array.isArray(data) ? data : [];
  document.getElementById('client-count').textContent =
    clients.length + ' client' + (clients.length !== 1 ? 's' : '');
  renderPipeline();
  if (activeDrawerClientId) {
    const updated = clients.find(c => c.id === activeDrawerClientId);
    if (updated) renderDrawer(updated);
  }
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderPipeline();
}

function filteredClients() {
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  return clients.filter(c => {
    if (q && !((c.business_name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q))) return false;
    if (currentFilter === 'active' && c.production_stage === 'live') return false;
    if (currentFilter === 'live' && c.production_stage !== 'live') return false;
    return true;
  });
}

function stageColIndex(stageId) {
  return COLUMNS.findIndex(c => c.stages.includes(stageId));
}

// ---------- Pipeline board ----------

function renderPipeline() {
  const list = filteredClients();
  const counts = {};
  clients.forEach(c => {
    const col = stageColIndex(c.production_stage);
    counts[col] = (counts[col] || 0) + 1;
  });

  document.getElementById('stage-headers').innerHTML =
    '<div class="col-spacer"></div>' +
    COLUMNS.filter((col, i) => i > 0).map((col, i) =>
      '<div class="stage-header">' +
      '<div class="stage-header-label">' + escHtml(col.label) + '</div>' +
      '<div class="stage-header-count">' + (counts[i + 1] || 0) + '</div>' +
      '</div>'
    ).join('');

  const listEl = document.getElementById('clients-list');
  if (!list.length) {
    listEl.innerHTML = '<div class="empty-state"><h3>No clients yet</h3><p>Add a client to get started.</p></div>';
    return;
  }
  listEl.innerHTML = list.map(c => renderClientRow(c)).join('') +
    '<div class="add-row" onclick="openAddClient()">+ Add client</div>';
}

function renderClientRow(c) {
  const activeColIdx = stageColIndex(c.production_stage);
  const safeId = JSON.stringify(c.id).replace(/"/g, '&quot;');

  const cells = COLUMNS.map((col, colIdx) => {
    // Client column (colIdx 0) is merged into the name card — no separate cell
    if (colIdx === 0) return '';
    if (colIdx < activeColIdx) {
      return '<div class="stage-cell s-done" onclick="openDrawer(' + safeId + ',' + colIdx + ')">' +
        '<div class="cell-top">' +
        '<span class="cell-stage-name">' + escHtml(col.label) + '</span>' +
        '<div class="cell-check"><svg viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></div>' +
        '</div></div>';
    }
    if (colIdx === activeColIdx) {
      const stageDef = STAGES_MAP[c.production_stage];
      return '<div class="stage-cell s-active" onclick="openDrawer(' + safeId + ',' + colIdx + ')">' +
        '<div class="cell-top">' +
        '<span class="cell-stage-name">' + escHtml(col.label) + '</span>' +
        '<div class="active-badge"><div class="active-dot"></div>Active</div>' +
        '</div>' +
        '<div class="cell-body"><div class="cell-info">' + escHtml(stageDef ? stageDef.desc : '') + '</div></div>' +
        '<button class="cell-action-btn" onclick="event.stopPropagation();openDrawer(' + safeId + ',' + colIdx + ')">' +
        escHtml(stageDef && stageDef.actionLabel ? stageDef.actionLabel : 'Open') +
        '</button></div>';
    }
    return '<div class="stage-cell s-pending" onclick="openDrawer(' + safeId + ',' + colIdx + ')" style="opacity:.35;cursor:pointer"><div class="cell-top"><span class="cell-stage-name">' + escHtml(col.label) + '</span></div></div>';
  }).join('');

  const plan = c.plan ? '<span class="client-plan">' + escHtml(c.plan) + '</span>' : '';
  return '<div class="client-row" data-id="' + escHtml(c.id) + '">' +
    '<div class="client-card" onclick="openDrawer(' + safeId + ',0)" title="Edit client info">' +
    '<div><div class="client-name">' + escHtml(c.business_name || c.email) + '</div>' +
    '<div class="client-email">' + escHtml(c.email || '') + '</div>' + plan + '</div>' +
    '<div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:6px">&#x270E; Edit</div>' +
    '</div>' + cells + '</div>';
}

// ---------- Drawer ----------

function openDrawer(clientId, colIdx) {
  const client = clients.find(c => c.id === clientId);
  if (!client) { console.error('openDrawer: client not found', clientId); return; }
  activeDrawerClientId = clientId;
  activeDrawerColIdx = colIdx != null ? colIdx : stageColIndex(client.production_stage);

  // Open the panel first so it's always visible even if render throws
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');

  document.querySelectorAll('.client-row').forEach(r => r.classList.remove('selected'));
  const row = document.querySelector('.client-row[data-id="' + CSS.escape(clientId) + '"]');
  if (row) row.classList.add('selected');

  try {
    renderDrawer(client);
  } catch(e) {
    console.error('openDrawer renderDrawer error:', e);
    document.getElementById('d-body').innerHTML =
      '<div style="padding:16px;color:#f87171;font-size:13px;line-height:1.8">' +
      '<strong>Error rendering panel:</strong><br>' + e.message + '</div>';
  }
}

function renderDrawer(client) {
  const activeColIdx = stageColIndex(client.production_stage);
  const isLive = client.production_stage === 'live';

  document.getElementById('d-name').textContent = client.business_name || client.email || client.id;
  document.getElementById('d-email').textContent = client.email || '';
  document.getElementById('d-meta').innerHTML =
    (client.plan ? '<span class="d-badge d-badge-plan">' + escHtml(client.plan) + '</span>' : '') +
    '<span class="d-badge ' + (isLive ? 'd-badge-live' : 'd-badge-stage') + '">' +
    (isLive ? '&#x25CF; Live' : escHtml(STAGES_MAP[client.production_stage]?.desc || client.production_stage)) +
    '</span>';

  // Progress track: clickable steps
  const safeId = JSON.stringify(client.id).replace(/"/g, '&quot;');
  document.getElementById('d-progress').innerHTML = COLUMNS.map((col, i) => {
    let cls = i < activeColIdx ? 'ps-done' : i === activeColIdx ? 'ps-active' : '';
    if (i === activeDrawerColIdx) cls += ' ps-focused';
    return '<div class="progress-step ' + cls.trim() + '" title="' + escHtml(col.label) + '" onclick="openDrawer(' + safeId + ',' + i + ')"></div>';
  }).join('');

  try {
    document.getElementById('d-body').innerHTML = renderStagePanel(client, activeDrawerColIdx);
    if (document.getElementById('intake-data-view')) loadIntakeData(client.id);
  } catch(e) {
    document.getElementById('d-body').innerHTML =
      '<div style="padding:16px;color:#f87171;font-size:12px;line-height:1.6">' +
      '<strong>Render error — please report this:</strong><br>' + e.message +
      '<br><small style="opacity:.6">' + (e.stack || '') + '</small></div>';
  }
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
  document.querySelectorAll('.client-row').forEach(r => r.classList.remove('selected'));
  activeDrawerClientId = null;
  activeDrawerColIdx = null;
}

// ---------- Stage panel ----------

function renderStagePanel(client, colIdx) {
  const col = COLUMNS[colIdx];
  if (!col) return '';
  const activeColIdx = stageColIndex(client.production_stage);
  const isDone = colIdx < activeColIdx;
  const isActive = colIdx === activeColIdx;
  const isPending = colIdx > activeColIdx;

  // Client column (colIdx=0) is a permanent info panel for all clients
  if (colIdx === 0) {
    const safeId = JSON.stringify(client.id).replace(/"/g, '&quot;');
    let html = '<div class="sp-header">' +
      '<div class="sp-icon sp-icon-done">&#x270E;</div>' +
      '<div><div class="sp-label">Client info</div>' +
      '<div class="sp-state sp-state-done">Edit anytime</div></div>' +
      '</div>';
    html += renderClientEditForm(client);
    html += '<div class="sp-nav">';
    html += '<span></span>';
    html += '<button class="btn btn-ghost btn-sm" onclick="openDrawer(' + safeId + ',1)">Deposit &#x276F;</button>';
    html += '</div>';
    return html;
  }

  const iconState = isDone ? 'done' : isActive ? 'active' : 'pending';
  const stateLabel = isDone ? 'Completed' : isActive ? 'In progress' : 'Not started';
  const iconChar = isDone ? '&#x2713;' : isActive ? '&#x25CF;' : '&middot;';

  let html = '';

  // Panel header
  html += '<div class="sp-header">' +
    '<div class="sp-icon sp-icon-' + iconState + '">' + iconChar + '</div>' +
    '<div><div class="sp-label">' + escHtml(col.label) + '</div>' +
    '<div class="sp-state sp-state-' + iconState + '">' + stateLabel + '</div></div>' +
    '</div>';

  if (isDone) html += renderDonePanel(client, colIdx);
  else if (isActive) html += renderActivePanel(client);
  else html += '<div class="sp-pending">This stage has not started yet. Complete the previous stages first.</div>';

  // Prev / Next navigation
  const safeId = JSON.stringify(client.id).replace(/"/g, '&quot;');
  html += '<div class="sp-nav">';
  if (colIdx > 0) {
    html += '<button class="btn btn-ghost btn-sm" onclick="openDrawer(' + safeId + ',' + (colIdx - 1) + ')">&#x276E; ' + escHtml(COLUMNS[colIdx - 1].label) + '</button>';
  } else {
    html += '<span></span>';
  }
  if (colIdx < COLUMNS.length - 1) {
    html += '<button class="btn btn-ghost btn-sm" onclick="openDrawer(' + safeId + ',' + (colIdx + 1) + ')">' + escHtml(COLUMNS[colIdx + 1].label) + ' &#x276F;</button>';
  }
  html += '</div>';

  return html;
}

// --- Done panel: what we have stored for each completed stage ---

function renderDonePanel(client, colIdx) {
  let html = '';

  // colIdx 0: Client info panel (always shown via renderStagePanel special case)

  // colIdx 1: Deposit
  if (colIdx === 1) {
    const isComp = client.deposit_amount === 0;
    if (isComp) {
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 12px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:7px">' +
        '<span style="font-size:14px">&#9733;</span>' +
        '<span style="font-size:13px;color:#fbbf24;font-weight:600">Comp client, no charge</span>' +
        '</div>';
    } else {
      if (client.deposit_link) html += spLinkField('Wompi payment link', client.deposit_link);
      html += spField('Amount', client.deposit_amount ? formatCOP(client.deposit_amount) : '$120.000 COP (30%)');
      if (client.deposit_paid_at) html += spField('Received on', fmtDate(client.deposit_paid_at));
    }
    html += '<div class="done-tag">&#x2713; ' + (isComp ? 'Comp, deposit skipped' : 'Deposit confirmed') + '</div>';
  }

  // colIdx 2: Assets
  if (colIdx === 2) {
    html += '<p style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:12px">Intake wizard sent. Assets confirmed.</p>';
    html += '<div id="intake-data-view" data-mode="checklist" style="margin-bottom:12px"><div style="font-size:12px;color:rgba(255,255,255,.35);padding:8px 0">Loading activos...</div></div>';
    html += '<div class="done-tag" style="margin-top:12px">&#x2713; Assets received</div>';
  }

  // colIdx 3: Generate
  if (colIdx === 3) {
    html += '<a href="/admin/clients/' + escHtml(client.id) + '" target="_blank" rel="noopener" class="ext-link">Open site builder (admin SPA) &#x2197;</a>';
    if (client.mockup_generated_at) {
      html += '<a href="/pipeline-mockup/' + escHtml(client.id) + '?admin=' + encodeURIComponent(getToken()) + '" target="_blank" rel="noopener" class="ext-link" style="background:rgba(255,92,46,.07);border-color:rgba(255,92,46,.2);color:#FF5C2E">View AI-generated mockup &#x2197;</a>';
    }
    html += renderDeliverablesProgress(client);
    if (client.preview_url) html += spLinkField('Preview URL', client.preview_url);
    html += '<div class="done-tag" style="margin-top:12px">&#x2713; Site built</div>';
  }

  // colIdx 4: Chatbot
  if (colIdx === 4) {
    html += '<a href="https://asistente.pymewebpro.com/portal" target="_blank" rel="noopener" class="ext-link">Open El Asistente dashboard &#x2197;</a>';
    if (client.domain) html += spField('Chatbot site', client.domain);
    html += '<div class="done-tag">&#x2713; AI assistant configured</div>';
  }

  // colIdx 5: Approval
  if (colIdx === 5) {
    if (client.preview_url) html += spLinkField('Preview sent to client', client.preview_url);
    html += '<button class="sp-btn sp-btn-ghost" style="margin-top:10px" onclick="generateApprovalDoc()">View / print approval document &#x2197;</button>';
    html += '<div class="done-tag" style="margin-top:10px">&#x2713; Client approved the design</div>';
  }

  // colIdx 6: Google Profile
  if (colIdx === 6) {
    let delivState = {};
    try { delivState = JSON.parse(client.deliverables_state || '{}'); } catch {}
    const gbpUrl = delivState.gbp_url || '';
    html += '<div class="done-tag">&#x2713; GBP active</div>';
    if (gbpUrl) html += '<div style="margin-top:10px">' + spLinkField('Google Business Profile', gbpUrl) + '</div>';
  }

  // colIdx 7: Final Payment
  if (colIdx === 7) {
    if (client.balance_link) html += spLinkField('Wompi balance link', client.balance_link);
    html += spField('Amount', client.balance_amount ? formatCOP(client.balance_amount) : '$280.000 COP (70%)');
    if (client.balance_paid_at) html += spField('Received on', fmtDate(client.balance_paid_at));
    html += '<div class="done-tag">&#x2713; Balance confirmed</div>';
  }

  // colIdx 8: Live
  if (colIdx === 8) {
    if (client.domain) html += spLinkField('Live site', 'https://' + client.domain);
    html += '<div class="done-tag">&#x25CF; Site is live</div>';
  }

  return html || '<p style="font-size:13px;color:rgba(255,255,255,.4)">Stage completed.</p>';
}

// --- Active panel: controls for current stage ---

function renderActivePanel(client) {
  const s = client.production_stage;
  let html = '<div class="sp-controls">';

  if (s === 'new_client') {
    // Plan / amount selector
    html += '<div class="sp-field"><div class="sp-field-label">Plan and deposit amount</div>' +
      '<select class="sp-select" id="deposit-plan-select" onchange="updateDepositAmount()">' +
      '<option value="120000">Esencial — $120.000 COP (30% de $400k)</option>' +
      '<option value="120000">Presencia — $120.000 COP (30% de $400k)</option>' +
      '<option value="120000">Ventas — $120.000 COP (30% de $400k)</option>' +
      '<option value="custom">Personalizado</option>' +
      '<option value="comp">Comp — sin costo</option>' +
      '</select></div>';
    html += '<div id="custom-amount-wrap" style="display:none">';
    html += spInputField('deposit-amount-custom', 'Monto del deposito (COP)', '', 'number', '120000');
    html += '</div>';
    html += '<div id="deposit-link-wrap">';
    html += spInputField('deposit-link-input', 'Wompi payment link', '', 'url');
    html += spBtn('primary', 'Save and send deposit link', 'spSendDepositLink()');
    html += '</div>';
    html += '<div id="comp-wrap" style="display:none">';
    html += '<div style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;margin:8px 0 12px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:7px;border:1px solid rgba(255,255,255,.08)">No deposit required. Clicking below will move this client directly to the Assets stage.</div>';
    html += spBtn('primary', 'Mark as comp — skip deposit', 'spMarkComp()');
    html += '</div>';
  }

  if (s === 'deposit_sent') {
    if (client.deposit_link) html += spLinkField('Deposit link sent', client.deposit_link);
    const prefilledAmount = client.deposit_amount || 120000;
    html += spInputField('deposit-amount-input', 'Amount received (COP)', String(prefilledAmount), 'number', '120000');
    html += spBtn('primary', 'Confirm deposit received', 'spConfirmDeposit()');
  }

  if (s === 'deposit_paid') {
    html += '<div style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:14px">A secure 7-day login link will be generated and sent directly to the client. They will click once and land on their intake form — no extra login step.</div>';
    html += spBtn('primary', 'Generate and send intake link', 'spSendWizard()');
  }

  if (s === 'wizard_sent') {
    if (client.submitted_at) {
      const submittedDate = new Date(client.submitted_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      html += '<div style="font-size:12px;color:#4ade80;margin-bottom:12px;padding:7px 10px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:6px">&#10003; Client submitted on ' + submittedDate + '. Review activos below before confirming.</div>';
    } else {
      html += '<div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:12px">Waiting for client to complete their intake form.</div>';
    }
    html += '<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Send client to finish their form</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px">';
    html += spBtn('primary', '&#x1F517; Copy fresh link to clipboard', 'spCopyFreshLink()');
    html += spBtn('ghost', '&#x2709; Email link to client', 'spEmailWizardLink()');
    html += '</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:14px">Generate a fresh 7-day link and send via WhatsApp, email, or however you prefer. Each click generates a new link.</div>';
    html += '<div id="intake-data-view" data-mode="checklist" style="margin-bottom:16px"><div style="font-size:12px;color:rgba(255,255,255,.35);padding:8px 0">' + (client.submitted_at ? 'Loading intake data...' : '') + '</div></div>';
    html += '<div style="border-top:1px solid rgba(255,255,255,.07);margin:4px 0 12px"></div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:8px">Once the client has provided everything you need, confirm below to move to Generate.</div>';
    html += spBtn('ghost', 'Confirm activos - move to Generate', 'spConfirm(&quot;confirm_assets&quot;)');
  }

  if (s === 'assets_received') {
    let delivState = {};
    try { delivState = JSON.parse(client.deliverables_state || '{}'); } catch {}
    const savedNotes = delivState.build_notes || '';
    const savedChangeLog = delivState.change_requests || '';

    // Build brief section
    html += '<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Build brief</div>';
    html += '<div class="sp-field">';
    html += '<div class="sp-field-label">Notes for Claude</div>';
    html += '<textarea class="sp-input" id="build-notes-input" rows="4" placeholder="Parameters, tone, specific instructions for Claude..." style="resize:vertical;line-height:1.5">' + escHtml(savedNotes) + '</textarea>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-top:2px">';
    html += spBtn('ghost', 'Save notes', 'spSaveBuildNotes()');
    html += spBtn('primary', 'Copy full brief for Claude', 'spCopyBrief()');
    html += '</div>';

    // AI mockup generator
    html += '<div style="border-top:1px solid rgba(255,255,255,.07);margin:16px 0 12px"></div>';
    html += '<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">AI Mockup Generator</div>';
    if (client.mockup_generated_at) {
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:rgba(52,211,153,.07);border:1px solid rgba(52,211,153,.2);border-radius:7px">' +
        '<span style="color:#34d399;font-size:14px">&#x2713;</span>' +
        '<span style="font-size:12px;color:#34d399">Generated ' + fmtDate(client.mockup_generated_at) + '</span>' +
        '<a href="/pipeline-mockup/' + escHtml(client.id) + '?admin=' + encodeURIComponent(getToken()) + '" target="_blank" rel="noopener" style="margin-left:auto;font-size:12px;color:#FF5C2E;font-weight:600">Open &#x2197;</a>' +
        '</div>';
    }
    html += '<div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:10px;line-height:1.5">Claude reads the intake data and build notes and generates a complete HTML sales page. Takes 15-30 seconds.</div>';
    html += '<button class="sp-btn sp-btn-primary" id="gen-mockup-btn" onclick="spGenerateMockup()">' + (client.mockup_generated_at ? 'Regenerate mockup' : 'Generate AI mockup') + '</button>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:8px;min-height:20px" id="gen-mockup-status"></div>';

    // Preview URL (save only, no email yet - that happens in Approval)
    html += '<div style="border-top:1px solid rgba(255,255,255,.07);margin:16px 0 12px"></div>';
    html += '<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Preview URL</div>';
    html += spInputField('preview-url-input', 'Mockup URL (save now, send later from Approval)', client.preview_url || '', 'url', 'https://mockups.pymewebpro.com/...');
    html += spBtn('ghost', 'Save URL', 'spSavePreviewUrl()');

    // Change requests section
    html += '<div style="border-top:1px solid rgba(255,255,255,.07);margin:16px 0 12px"></div>';
    html += '<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Change requests</div>';
    html += '<div class="sp-field">';
    html += '<div class="sp-field-label">Log client change requests here</div>';
    html += '<textarea class="sp-input" id="change-log-input" rows="3" placeholder="Log client change requests here..." style="resize:vertical;line-height:1.5">' + escHtml(savedChangeLog) + '</textarea>';
    html += '</div>';
    html += spBtn('ghost', 'Save change log', 'spSaveChangeLog()');

    // Advance to Chatbot
    html += '<div style="border-top:1px solid rgba(255,255,255,.07);margin:16px 0 12px"></div>';
    html += spBtn('ghost', 'Site built, go to Chatbot', 'spConfirmStage(&quot;approved&quot;)');
  }

  if (s === 'site_generated') {
    html += spInputField('preview-url-input', 'Preview / mockup URL', client.preview_url || '', 'url');
    html += spBtn('primary', 'Save and send preview link', 'spSendPreview()');
  }

  if (s === 'approval_sent') {
    if (client.preview_url) html += spLinkField('Preview sent to client', client.preview_url);
    html += spBtn('ghost', 'Generate approval document', 'generateApprovalDoc()');
    html += spBtn('primary', 'Mark client approved', 'spConfirm(&quot;confirm_approval&quot;)');
  }

  if (s === 'approved') {
    html += '<a href="https://asistente.pymewebpro.com/portal" target="_blank" rel="noopener" class="ext-link">Open El Asistente dashboard &#x2197;</a>';
    html += '<p style="font-size:12px;color:rgba(255,255,255,.4);line-height:1.6;margin:8px 0 12px">Configure the AI assistant for this client in El Asistente, then mark done.</p>';
    html += spBtn('primary', 'Mark chatbot configured', 'spConfirm(&quot;confirm_chatbot&quot;)');
  }

  if (s === 'chatbot_configured') {
    html += spInputField('balance-link-input', 'Wompi link — 70% balance ($280.000 COP)', '', 'url');
    html += spBtn('primary', 'Save and send balance link', 'spSendBalanceLink()');
  }

  if (s === 'balance_sent') {
    if (client.balance_link) html += spLinkField('Balance link sent', client.balance_link);
    html += spInputField('balance-amount-input', 'Amount received (COP)', '', 'number', '280000');
    html += spBtn('primary', 'Confirm balance received', 'spConfirmBalance()');
  }

  if (s === 'balance_paid') {
    html += spInputField('domain-input', 'Client domain', client.domain || '', 'text', 'ejemplo.com');
    html += spBtn('primary', 'Launch - Go live', 'spGoLive()');
  }

  if (s === 'live') {
    if (client.domain) html += spLinkField('Live site', 'https://' + client.domain);
    html += '<div class="done-tag" style="margin-top:12px">&#x25CF; Site is live</div>';
  }

  if (s === 'gbp_setup') {
    let delivState = {};
    try { delivState = JSON.parse(client.deliverables_state || '{}'); } catch {}
    const gbpUrl = delivState.gbp_url || '';
    const gbpItems = delivState.gbp_items || {};

    const GBP_CHECKLIST = [
      { key: 'gbp_claimed',      label: 'Profile claimed or created' },
      { key: 'gbp_access',       label: 'Manager access granted by client' },
      { key: 'gbp_info',         label: 'Business info complete (name, address, phone, website, hours)' },
      { key: 'gbp_description',  label: 'Business description written' },
      { key: 'gbp_photos',       label: 'Photos added (logo, cover, interior/exterior)' },
      { key: 'gbp_category',     label: 'Primary and secondary categories set' },
      { key: 'gbp_services',     label: 'Services / products added' },
      { key: 'gbp_verification', label: 'Verification requested' },
      { key: 'gbp_verified',     label: 'Profile verified and live' },
    ];

    const doneCount = GBP_CHECKLIST.filter(i => gbpItems[i.key]).length;

    html += spInputField('gbp-url-input', 'Google Business Profile URL', gbpUrl, 'url', 'https://business.google.com/...');
    html += spBtn('ghost', 'Save GBP URL', 'spSaveGbpUrl()');

    html += '<div class="intake-list" style="margin-top:16px">';
    html += '<div class="intake-list-title">GBP setup checklist (' + doneCount + ' / ' + GBP_CHECKLIST.length + ' done)</div>';
    GBP_CHECKLIST.forEach(item => {
      const isOn = !!gbpItems[item.key];
      const safeKey = JSON.stringify(item.key).replace(/"/g, '&quot;');
      html += '<div class="intake-item" onclick="spToggleGbpItem(' + safeKey + ',' + (!isOn) + ')">' +
        '<div class="intake-check ' + (isOn ? 'intake-check-on' : 'intake-check-off') + '">' +
        (isOn ? '&#x2713;' : '') + '</div>' +
        '<span class="intake-label ' + (isOn ? 'intake-label-on' : 'intake-label-off') + '">' +
        escHtml(item.label) + '</span>' +
        '</div>';
    });
    html += '<div class="intake-summary">Click an item to toggle.</div>';
    html += '</div>';

    if (gbpUrl) {
      html += '<a href="' + escHtml(gbpUrl) + '" target="_blank" rel="noopener" class="ext-link" style="margin-top:12px">Open Google Business Profile &#x2197;</a>';
    }

    html += spBtn('primary', 'Mark GBP active', 'spConfirm(&quot;confirm_gbp&quot;)');
  }

  if (s === 'gbp_active') {
    let delivState = {};
    try { delivState = JSON.parse(client.deliverables_state || '{}'); } catch {}
    const gbpUrl = delivState.gbp_url || '';
    const gbpItems = delivState.gbp_items || {};

    const GBP_CHECKLIST = [
      { key: 'gbp_claimed',      label: 'Profile claimed or created' },
      { key: 'gbp_access',       label: 'Manager access granted by client' },
      { key: 'gbp_info',         label: 'Business info complete (name, address, phone, website, hours)' },
      { key: 'gbp_description',  label: 'Business description written' },
      { key: 'gbp_photos',       label: 'Photos added (logo, cover, interior/exterior)' },
      { key: 'gbp_category',     label: 'Primary and secondary categories set' },
      { key: 'gbp_services',     label: 'Services / products added' },
      { key: 'gbp_verification', label: 'Verification requested' },
      { key: 'gbp_verified',     label: 'Profile verified and live' },
    ];

    html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:8px;margin-bottom:14px">' +
      '<span style="font-size:16px;color:#34d399">&#x2713;</span>' +
      '<span style="font-size:13px;color:#34d399;font-weight:600">Profile is live and optimized</span>' +
      '</div>';

    if (gbpUrl) {
      html += '<a href="' + escHtml(gbpUrl) + '" target="_blank" rel="noopener" class="ext-link">Open Google Business Profile &#x2197;</a>';
    }

    const doneCount = GBP_CHECKLIST.filter(i => gbpItems[i.key]).length;
    html += '<div class="intake-list" style="margin-top:8px">';
    html += '<div class="intake-list-title">GBP checklist (' + doneCount + ' / ' + GBP_CHECKLIST.length + ' completed)</div>';
    GBP_CHECKLIST.forEach(item => {
      const isOn = !!gbpItems[item.key];
      html += '<div class="intake-item">' +
        '<div class="intake-check ' + (isOn ? 'intake-check-on' : 'intake-check-off') + '">' +
        (isOn ? '&#x2713;' : '') + '</div>' +
        '<span class="intake-label ' + (isOn ? 'intake-label-on' : 'intake-label-off') + '">' +
        escHtml(item.label) + '</span>' +
        '</div>';
    });
    html += '</div>';
    html += '<div style="border-top:1px solid rgba(255,255,255,.07);margin:16px 0 12px"></div>';
    html += spBtn('primary', 'GBP done, proceed to Final Payment', 'spConfirmStage(&quot;chatbot_configured&quot;)');
  }

  html += '<div class="sp-msg" id="sp-msg"></div></div>';
  return html;
}

// ---------- Action handlers ----------

function setSpMsg(msg) {
  const el = document.getElementById('sp-msg');
  if (el) el.textContent = msg;
}

function updateDepositAmount() {
  const sel = document.getElementById('deposit-plan-select');
  const customWrap = document.getElementById('custom-amount-wrap');
  const linkWrap = document.getElementById('deposit-link-wrap');
  const compWrap = document.getElementById('comp-wrap');
  if (!sel) return;
  const isComp = sel.value === 'comp';
  const isCustom = sel.value === 'custom';
  if (customWrap) customWrap.style.display = isCustom ? 'block' : 'none';
  if (linkWrap)   linkWrap.style.display   = isComp   ? 'none'  : 'block';
  if (compWrap)   compWrap.style.display   = isComp   ? 'block' : 'none';
}

async function spSendDepositLink() {
  const link = document.getElementById('deposit-link-input')?.value.trim();
  if (!link) { setSpMsg('Paste the Wompi link first.'); return; }
  const sel = document.getElementById('deposit-plan-select');
  let amount = 120000;
  if (sel) {
    if (sel.value === 'custom') {
      const raw = document.getElementById('deposit-amount-custom')?.value.trim();
      amount = raw ? parseInt(raw, 10) : null;
    } else {
      // strip trailing letter suffixes used to make options unique (120000b, 120000c)
      amount = parseInt(sel.value, 10);
    }
  }
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_deposit_link', payload: { link, amount } });
  if (res.ok) { copyToClipboard(link); await refresh(); }
  else setSpMsg('Error: ' + (res.error || 'failed'));
}

async function spMarkComp() {
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'mark_comp', payload: {} });
  if (res.ok) { await refresh(); }
  else setSpMsg('Error.');
}

async function spConfirmDeposit() {
  const raw = document.getElementById('deposit-amount-input')?.value.trim();
  const amount = raw ? parseInt(raw, 10) : null;
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'confirm_deposit', payload: { amount } });
  if (res.ok) { await refresh(); }
  else setSpMsg('Error.');
}

async function loadIntakeData(clientId) {
  const container = document.getElementById('intake-data-view');
  if (!container) return;
  const mode = container.dataset.mode || 'answers';
  try {
    const res = await fetch('/api/admin/pipeline/' + clientId + '/intake', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const data = await res.json();
    lastIntakeData = data;
    container.innerHTML = renderIntakeDataView(data, mode);
  } catch(e) {
    container.innerHTML = '<div style="font-size:12px;color:#f87171">Could not load intake data.</div>';
  }
}

function renderIntakeDataView(data, mode) {
  const { sections = {}, files = [] } = data;
  const SECTION_LABELS = {
    business: 'Datos básicos', contact: 'Contacto', brand: 'Marca',
    visual: 'Imágenes', content: 'Contenido', tech: 'Técnico', growth: 'Crecimiento'
  };
  const FIELD_LABELS = {
    bizName: 'Nombre', nit: 'NIT', legalRepresentative: 'Representante legal',
    tagline: 'Eslogan', whatYouDo: 'Qué hace', audience: 'Público objetivo',
    phone: 'Teléfono', whatsapp: 'WhatsApp', email: 'Correo', address: 'Dirección',
    instagram: 'Instagram', fb: 'Facebook',
    colors: 'Colores', fonts: 'Tipografías',
    refSites: 'Sitios de referencia',
    tone: 'Tono de voz', topics: 'Temas', pages: 'Páginas', testimonials: 'Testimonios',
    domain: 'Dominio', hosting: 'Hosting', emailLocalPart: 'Correo (parte local)',
    emailForwardTo: 'Reenviar a', ga4Id: 'GA4 ID', metaPixelId: 'Meta Pixel ID',
    blogTopics: 'Blog', pdfLabel: 'PDF label', teamBios: 'Equipo', faqs: 'FAQs'
  };
  const SECTION_ORDER = ['business','contact','brand','visual','content','tech','growth'];

  const logos = files.filter(f => f.category === 'logo');
  const photos = files.filter(f => f.category === 'photo');
  const pdfs = files.filter(f => f.category === 'pdf');
  const adminToken = localStorage.getItem('pwp_admin') || '';

  function fv(sec, key) {
    const s = sections[sec];
    return s ? String(s[key] || '').trim() : '';
  }

  // ---------- Completeness checklist ----------
  // Each item: { label, critical, status: 'ok'|'warn'|'none'|'missing' }
  const CHECKLIST = [
    { label: 'Nombre del negocio', critical: true,  status: fv('business','bizName') ? 'ok' : 'missing' },
    { label: 'Descripcion del negocio', critical: true,  status: fv('business','whatYouDo') ? 'ok' : 'missing' },
    { label: 'Eslogan', critical: false, status: fv('business','tagline') ? 'ok' : 'none' },
    { label: 'NIT', critical: false, status: fv('business','nit') ? 'ok' : 'none' },
    { label: 'Tel / WhatsApp', critical: true,
      status: (fv('contact','phone') || fv('contact','whatsapp')) ? 'ok' : 'missing' },
    { label: 'Email de contacto', critical: false, status: fv('contact','email') ? 'ok' : 'none' },
    { label: 'Direccion', critical: false, status: fv('contact','address') ? 'ok' : 'none' },
    { label: 'Instagram', critical: false, status: fv('contact','instagram') ? 'ok' : 'none' },
    { label: 'Facebook', critical: false, status: fv('contact','fb') ? 'ok' : 'none' },
    { label: 'Logo', critical: false,
      status: logos.length > 0 ? 'ok' : 'none' },
    { label: 'Colores de marca', critical: false, status: fv('brand','colors') ? 'ok' : 'none' },
    { label: 'Tipografia', critical: false, status: fv('brand','fonts') ? 'ok' : 'none' },
    { label: 'Fotos (' + photos.length + (photos.length === 1 ? ' subida' : ' subidas') + ', min 3)', critical: true,
      status: photos.length === 0 ? 'missing' : photos.length < 3 ? 'warn' : 'ok' },
    { label: 'Sitios de referencia', critical: false, status: fv('visual','refSites') ? 'ok' : 'none' },
    { label: 'Tono de marca', critical: false, status: fv('content','tone') ? 'ok' : 'none' },
    { label: 'Temas clave', critical: false, status: fv('content','topics') ? 'ok' : 'none' },
    { label: 'Testimonios', critical: false, status: fv('content','testimonials') ? 'ok' : 'none' },
    { label: 'Dominio', critical: false, status: fv('tech','domain') ? 'ok' : 'none' },
    { label: 'Correo profesional', critical: false, status: fv('tech','emailLocalPart') ? 'ok' : 'none' },
    { label: 'GA4 ID', critical: false, status: fv('tech','ga4Id') ? 'ok' : 'none' },
    { label: 'Meta Pixel ID', critical: false, status: fv('tech','metaPixelId') ? 'ok' : 'none' },
  ];

  const missing = CHECKLIST.filter(i => i.critical && i.status === 'missing');
  const provided = CHECKLIST.filter(i => i.status === 'ok' || i.status === 'warn').length;
  const total = CHECKLIST.length;

  // ---------- checklist mode: render using .intake-list CSS classes ----------
  if (mode === 'checklist') {
    let html = '<div class="intake-list">';
    html += '<div class="intake-list-title">Activos recibidos (' + provided + ' / ' + total + ')</div>';
    if (missing.length > 0) {
      html += '<div style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:12px;color:#fca5a5;line-height:1.5">';
      html += '<span style="font-weight:600">Faltan activos clave:</span> ' + missing.map(i => i.label).join(', ');
      html += '</div>';
    }
    CHECKLIST.forEach(item => {
      const { status, label, critical } = item;
      const isOn = status === 'ok' || status === 'warn';
      html += '<div class="intake-item">';
      html += '<div class="intake-check ' + (isOn ? 'intake-check-on' : 'intake-check-off') + '">' + (isOn ? '&#x2713;' : '') + '</div>';
      html += '<span class="intake-label ' + (isOn ? 'intake-label-on' : 'intake-label-off') + '">' + escHtml(label) + '</span>';
      if (critical && status === 'missing') html += '<span style="font-size:9px;color:#f87171;font-weight:600;flex-shrink:0;margin-left:4px">REQ</span>';
      html += '</div>';
    });
    html += '<div class="intake-summary"></div>';
    html += '</div>';
    return html;
  }

  // ---------- answers mode (default): files + form answers only, no checklist ----------
  let html = '';

  // Uploaded files
  if (logos.length || photos.length || pdfs.length) {
    html += '<div style="margin-bottom:20px">';
    html += '<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Archivos</div>';
    [...logos, ...photos, ...pdfs].forEach(f => {
      const url = '/api/files/' + f.id + '?admin_token=' + encodeURIComponent(adminToken);
      const size = f.size_bytes ? (f.size_bytes / 1024).toFixed(0) + ' KB' : '';
      const cat = f.category === 'logo' ? '&#x1F4CC;' : f.category === 'photo' ? '&#x1F5BC;' : '&#x1F4C4;';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">';
      html += '<span style="font-size:13px">' + cat + '</span>';
      html += '<a href="' + url + '" target="_blank" rel="noopener" style="font-size:12px;color:#fbbf24;text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(f.filename) + '</a>';
      if (size) html += '<span style="font-size:11px;color:rgba(255,255,255,.28)">' + size + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Form answers by section
  const hasData = SECTION_ORDER.some(s => sections[s] && Object.keys(sections[s]).some(k => sections[s][k]));
  if (!hasData && !logos.length && !photos.length && !pdfs.length) {
    return html + '<div style="font-size:13px;color:rgba(255,255,255,.35);padding:8px 0">No intake data submitted yet.</div>';
  }

  html += '<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Respuestas del cliente</div>';

  SECTION_ORDER.forEach(sectionId => {
    const sectionData = sections[sectionId];
    if (!sectionData) return;
    const nonEmpty = Object.entries(sectionData).filter(([k, v]) => v && String(v).trim() && k !== '__logoUpload' && k !== '__photosWithAlts' && k !== '__pdfUpload');
    if (!nonEmpty.length) return;

    html += '<div style="margin-bottom:14px">';
    html += '<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,.07)">' + (SECTION_LABELS[sectionId] || sectionId) + '</div>';
    nonEmpty.forEach(([key, value]) => {
      const label = FIELD_LABELS[key] || key;
      const displayVal = String(value).replace(/\\n/g, '<br>');
      html += '<div style="margin-bottom:8px">';
      html += '<div style="font-size:10px;color:rgba(255,255,255,.3);margin-bottom:2px">' + escHtml(label) + '</div>';
      html += '<div style="font-size:12px;color:rgba(255,255,255,.82);line-height:1.5;word-break:break-word">' + displayVal + '</div>';
      html += '</div>';
    });
    html += '</div>';
  });

  return html;
}

async function spCopyFreshLink() {
  setSpMsg('Generating link...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_wizard_link', payload: { send_email: false } });
  if (res.ok) {
    if (res.link) copyToClipboard(res.link);
    setSpMsg('Link copied to clipboard.');
    await refresh();
  } else { setSpMsg('Error generating link.'); }
}

async function spEmailWizardLink() {
  setSpMsg('Sending email...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_wizard_link', payload: { send_email: true } });
  if (res.ok) {
    setSpMsg('Email sent and link copied to clipboard.');
    if (res.link) copyToClipboard(res.link);
    await refresh();
  } else { setSpMsg('Error sending email.'); }
}

async function spSendWizard() {
  return spEmailWizardLink();
}

async function spSavePreviewUrl() {
  const url = document.getElementById('preview-url-input')?.value.trim();
  if (!url) { setSpMsg('Enter the preview URL first.'); return; }
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_preview_url', payload: { url } });
  if (res.ok) { setSpMsg('URL saved.'); await refresh(); }
  else setSpMsg('Error.');
}

async function spSendPreview() {
  const url = document.getElementById('preview-url-input')?.value.trim();
  if (!url) { setSpMsg('Enter the preview URL first.'); return; }
  setSpMsg('Saving and sending...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_preview', payload: { url } });
  if (res.ok) { copyToClipboard(url); await refresh(); }
  else setSpMsg('Error.');
}

async function spSaveBuildNotes() {
  const notes = document.getElementById('build-notes-input')?.value || '';
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_build_notes', payload: { notes } });
  if (res.ok) setSpMsg('Notes saved.');
  else setSpMsg('Error saving notes.');
}

async function spSaveChangeLog() {
  const log = document.getElementById('change-log-input')?.value || '';
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_change_log', payload: { log } });
  if (res.ok) setSpMsg('Change log saved.');
  else setSpMsg('Error saving log.');
}

async function spCopyBrief() {
  const client = clients.find(c => c.id === activeDrawerClientId);
  if (!client) { setSpMsg('Client not found.'); return; }
  const notes = document.getElementById('build-notes-input')?.value || '';

  const SECTION_LABELS = {
    business: 'Datos basicos', contact: 'Contacto', brand: 'Marca',
    visual: 'Imagenes', content: 'Contenido', tech: 'Tecnico', growth: 'Crecimiento'
  };
  const FIELD_LABELS = {
    bizName: 'Nombre', nit: 'NIT', legalRepresentative: 'Representante legal',
    tagline: 'Eslogan', whatYouDo: 'Que hace', audience: 'Publico objetivo',
    phone: 'Telefono', whatsapp: 'WhatsApp', email: 'Correo', address: 'Direccion',
    instagram: 'Instagram', fb: 'Facebook',
    colors: 'Colores', fonts: 'Tipografias',
    refSites: 'Sitios de referencia',
    tone: 'Tono de voz', topics: 'Temas', pages: 'Paginas', testimonials: 'Testimonios',
    domain: 'Dominio', hosting: 'Hosting', emailLocalPart: 'Correo (parte local)',
    emailForwardTo: 'Reenviar a', ga4Id: 'GA4 ID', metaPixelId: 'Meta Pixel ID',
    blogTopics: 'Blog', pdfLabel: 'PDF label', teamBios: 'Equipo', faqs: 'FAQs'
  };
  const SECTION_ORDER = ['business', 'contact', 'brand', 'visual', 'content', 'tech', 'growth'];

  let lines = [];
  lines.push('=== PymeWebPro Site Brief ===');
  lines.push('');
  lines.push('CLIENT: ' + (client.business_name || ''));
  lines.push('PLAN: ' + (client.plan || ''));
  lines.push('');
  lines.push('--- CLIENT SPECIFICATIONS ---');

  if (lastIntakeData) {
    const { sections = {}, files = [] } = lastIntakeData;
    SECTION_ORDER.forEach(sectionId => {
      const sectionData = sections[sectionId];
      if (!sectionData) return;
      const nonEmpty = Object.entries(sectionData).filter(([k, v]) => v && String(v).trim() && k !== '__logoUpload' && k !== '__photosWithAlts' && k !== '__pdfUpload');
      if (!nonEmpty.length) return;
      lines.push('');
      lines.push('[' + (SECTION_LABELS[sectionId] || sectionId) + ']');
      nonEmpty.forEach(([key, value]) => {
        const label = FIELD_LABELS[key] || key;
        lines.push('  ' + label + ': ' + String(value).replace(/\\n/g, ' '));
      });
    });

    const logos = files.filter(f => f.category === 'logo');
    const photos = files.filter(f => f.category === 'photo');
    const pdfs = files.filter(f => f.category === 'pdf');
    lines.push('');
    lines.push('--- UPLOADED FILES ---');
    lines.push('Logo: ' + logos.length + ' | Photos: ' + photos.length + ' | PDFs: ' + pdfs.length);
  } else {
    lines.push('(Intake data not loaded. Open the panel first.)');
  }

  lines.push('');
  lines.push('--- BUILD NOTES ---');
  lines.push(notes || '(none)');
  lines.push('');
  lines.push('=== END BRIEF ===');

  copyToClipboard(lines.join('\\n'));
  setSpMsg('Brief copied to clipboard.');
}

async function spSendBalanceLink() {
  const link = document.getElementById('balance-link-input')?.value.trim();
  if (!link) { setSpMsg('Paste the Wompi link first.'); return; }
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_balance_link', payload: { link } });
  if (res.ok) { copyToClipboard(link); await refresh(); }
  else setSpMsg('Error.');
}

async function spConfirmBalance() {
  const raw = document.getElementById('balance-amount-input')?.value.trim();
  const amount = raw ? parseInt(raw, 10) : null;
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'confirm_balance', payload: { amount } });
  if (res.ok) { await refresh(); }
  else setSpMsg('Error.');
}

async function spConfirm(action) {
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/action', { action, payload: {} });
  if (res.ok) { await refresh(); }
  else setSpMsg('Error.');
}

async function spConfirmStage(stage) {
  setSpMsg('Saving...');
  const res = await api('POST', activeDrawerClientId + '/stage', { stage });
  if (res.ok) { await refresh(); }
  else setSpMsg('Error.');
}

async function spGoLive() {
  const domain = document.getElementById('domain-input')?.value.trim();
  if (!domain) { setSpMsg('Enter the domain first.'); return; }
  setSpMsg('Launching...');
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_domain', payload: { domain } });
  if (res.ok) { await refresh(); }
  else setSpMsg('Error.');
}

async function spSaveGbpUrl() {
  const url = document.getElementById('gbp-url-input')?.value || '';
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'save_gbp_url', payload: { url } });
  if (res.ok) { setSpMsg('GBP URL saved.'); await refresh(); }
  else setSpMsg('Error saving URL.');
}

async function spToggleGbpItem(key, received) {
  const res = await api('POST', activeDrawerClientId + '/action', { action: 'toggle_gbp_item', payload: { key, received } });
  if (res.ok) await refresh();
}

// ---------- Add client modal ----------

function openAddClient() {
  showModal('Add New Client', 'Enter client details to start their production workflow.',
    '<label class="modal-label">Business name</label>' +
    '<input class="modal-input" id="m-name" type="text" placeholder="Floreria Rosales" style="margin-bottom:10px">' +
    '<label class="modal-label" style="margin-top:8px">Email</label>' +
    '<input class="modal-input" id="m-email" type="email" placeholder="cliente@email.com" style="margin-bottom:10px">' +
    '<label class="modal-label" style="margin-top:8px">Plan</label>' +
    '<select class="modal-input" id="m-plan">' +
    '<option value="esencial">Solo página (sin plan mensual)</option>' +
    '<option value="presencia">Presencia (retirado)</option>' +
    '<option value="ventas">Plan mensual ($150.000/mes)</option>' +
    '</select>',
    [
      { label: 'Cancel', fn: 'closeModal()' },
      { label: 'Add Client', fn: 'doAddClient()', primary: true },
    ]
  );
}

async function doAddClient() {
  const name = document.getElementById('m-name').value.trim();
  const email = document.getElementById('m-email').value.trim();
  const plan = document.getElementById('m-plan').value;
  if (!name || !email) { setModalMsg('Name and email are required.'); return; }
  setModalMsg('Adding...');
  const res = await api('POST', 'clients', { business_name: name, email, plan });
  if (res.ok) { closeModal(); await refresh(); }
  else setModalMsg('Error: ' + (res.error || 'Check if email already exists.'));
}

// ---------- Modal helpers ----------

function showModal(title, sub, bodyHTML, actions) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-sub').textContent = sub;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-msg').textContent = '';
  document.getElementById('modal-actions').innerHTML = actions.map(a =>
    '<button class="btn ' + (a.primary ? 'btn-primary' : 'btn-ghost') + ' btn-sm" onclick="' + a.fn + '">' + escHtml(a.label) + '</button>'
  ).join('');
  document.getElementById('modal').classList.add('open');
  setTimeout(() => document.querySelector('.modal-input')?.focus(), 50);
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }
function setModalMsg(msg) { document.getElementById('modal-msg').textContent = msg; }

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ---------- Utilities ----------

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const hint = document.getElementById('copy-hint');
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 2000);
  });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(Number(ts)).toLocaleDateString('en-CA');
}

function formatCOP(amount) {
  if (!amount) return '—';
  return '$' + Number(amount).toLocaleString('es-CO') + ' COP';
}

// --- Client edit form ---

function renderClientEditForm(client) {
  let html = '';
  html += spField('Added', fmtDate(client.created_at));
  html += '<div class="sp-controls" style="margin-top:12px;padding-top:12px">';
  html += '<div class="sp-field-label" style="margin-bottom:10px">Edit client details</div>';
  html += spInputField('edit-name', 'Business name', client.business_name || '', 'text', 'Nombre del negocio');
  html += spInputField('edit-email', 'Email', client.email || '', 'email', 'cliente@email.com');
  html += '<div class="sp-field" style="margin-bottom:8px"><div class="sp-field-label">Plan</div>' +
    '<select class="sp-select" id="edit-plan">' +
    '<option value="esencial"' + ((!client.plan || client.plan === 'esencial') ? ' selected' : '') + '>Solo página (sin plan mensual)</option>' +
    '<option value="presencia"' + (client.plan === 'presencia' ? ' selected' : '') + '>Presencia (retirado)</option>' +
    '<option value="ventas"' + (client.plan === 'ventas' ? ' selected' : '') + '>Plan mensual ($150.000/mes)</option>' +
    '</select></div>';
  html += spInputField('edit-domain', 'Domain', client.domain || '', 'text', 'ejemplo.com');
  html += spInputField('edit-wa', 'WhatsApp', client.wa_number || '', 'text', '+57 300 000 0000');
  html += spBtn('primary', 'Save changes', 'spUpdateClient()');
  html += '<div class="sp-msg" id="sp-edit-msg"></div>';
  html += '</div>';

  // Danger zone
  html += '<div class="danger-zone">';
  html += '<div class="danger-zone-label">Danger zone</div>';
  html += '<button class="sp-btn sp-btn-danger" onclick="toggleDeleteConfirm()">Delete this client</button>';
  html += '<div class="delete-confirm" id="delete-confirm">';
  html += '<p>This will permanently delete <strong>' + escHtml(client.business_name || 'this client') + '</strong> and all their pipeline data. This cannot be undone.</p>';
  html += '<div class="delete-confirm-row">';
  html += '<button class="sp-btn sp-btn-danger-confirm" style="flex:1" onclick="spDeleteClient()">Yes, delete permanently</button>';
  html += '<button class="sp-btn sp-btn-ghost" style="flex:1" onclick="toggleDeleteConfirm()">Cancel</button>';
  html += '</div></div></div>';

  return html;
}

function toggleDeleteConfirm() {
  const el = document.getElementById('delete-confirm');
  if (el) el.classList.toggle('show');
}

async function spUpdateClient() {
  const name = document.getElementById('edit-name')?.value.trim();
  const email = document.getElementById('edit-email')?.value.trim();
  const plan = document.getElementById('edit-plan')?.value;
  const domain = document.getElementById('edit-domain')?.value.trim();
  const wa_number = document.getElementById('edit-wa')?.value.trim();
  const msgEl = document.getElementById('sp-edit-msg');
  if (!name) { if (msgEl) msgEl.textContent = 'Business name is required.'; return; }
  if (msgEl) msgEl.textContent = 'Saving...';
  const res = await api('POST', activeDrawerClientId + '/action', {
    action: 'update_client', payload: { business_name: name, email, plan, domain, wa_number }
  });
  if (res.ok) { if (msgEl) msgEl.textContent = 'Saved.'; await refresh(); }
  else { if (msgEl) msgEl.textContent = 'Error: ' + (res.error || 'failed'); }
}

async function spDeleteClient() {
  const id = activeDrawerClientId;
  const res = await api('POST', id + '/delete', {});
  if (res.ok) {
    closeDrawer();
    await refresh();
  }
}

// --- Intake checklist ---

function renderIntakeChecklist(client, editable) {
  let assets = {};
  try { assets = client.intake_assets ? JSON.parse(client.intake_assets) : {}; } catch {}
  const received = INTAKE_ITEMS.filter(i => assets[i.key]).length;
  const total = INTAKE_ITEMS.length;

  let html = '<div class="intake-list">';
  html += '<div class="intake-list-title">Client assets (' + received + ' / ' + total + ' received)</div>';

  INTAKE_ITEMS.forEach(item => {
    const isOn = !!assets[item.key];
    const safeId = JSON.stringify(activeDrawerClientId).replace(/"/g, '&quot;');
    const safeKey = JSON.stringify(item.key).replace(/"/g, '&quot;');
    const onclick = editable
      ? 'spToggleIntakeAsset(' + safeKey + ',' + (!isOn) + ')'
      : '';
    html += '<div class="intake-item"' + (editable ? ' onclick="' + onclick + '"' : '') + '>' +
      '<div class="intake-check ' + (isOn ? 'intake-check-on' : 'intake-check-off') + '">' +
      (isOn ? '&#x2713;' : '') + '</div>' +
      '<span class="intake-label ' + (isOn ? 'intake-label-on' : 'intake-label-off') + '">' +
      escHtml(item.label) + '</span>' +
      '</div>';
  });

  html += '<div class="intake-summary">' + (editable ? 'Click an item to toggle received / pending.' : '') + '</div>';
  html += '</div>';
  return html;
}

async function spToggleIntakeAsset(key, received) {
  const res = await api('POST', activeDrawerClientId + '/action', {
    action: 'toggle_intake_asset', payload: { key, received }
  });
  if (res.ok) await refresh();
}

// --- Deliverables progress ---

function renderDeliverablesProgress(client) {
  let state = {};
  try { state = client.deliverables_state ? JSON.parse(client.deliverables_state) : {}; } catch {}

  const DELIVERABLES = [
    {key:'setup_domain',group:'setup',label:'Domain configured'},{key:'setup_dns',group:'setup',label:'DNS / Cloudflare'},{key:'setup_ssl',group:'setup',label:'SSL active'},{key:'setup_email_forward',group:'setup',label:'Email forwarding'},
    {key:'design_logo',group:'design',label:'Logo uploaded'},{key:'design_brand_colors',group:'design',label:'Brand colors'},{key:'design_typography',group:'design',label:'Typography'},{key:'design_approved',group:'design',label:'Design approved'},
    {key:'page_home',group:'pages',label:'Home'},{key:'page_services',group:'pages',label:'Services'},{key:'page_about',group:'pages',label:'About'},{key:'page_contact',group:'pages',label:'Contact'},{key:'page_location',group:'pages',label:'Location'},
    {key:'feat_whatsapp_btn',group:'features',label:'WhatsApp button'},{key:'feat_google_map',group:'features',label:'Google Maps'},{key:'feat_social_bar',group:'features',label:'Social bar'},{key:'feat_photo_gallery',group:'features',label:'Photo gallery'},{key:'feat_testimonials',group:'features',label:'Testimonials'},{key:'feat_contact_form',group:'features',label:'Contact form'},
    {key:'seo_meta_tags',group:'seo',label:'Meta tags'},{key:'seo_sitemap',group:'seo',label:'Sitemap'},{key:'seo_robots',group:'seo',label:'robots.txt'},{key:'seo_indexed',group:'seo',label:'Google indexed'},{key:'seo_search_console',group:'seo',label:'Search Console'},{key:'seo_analytics',group:'seo',label:'GA4 installed'},
    {key:'close_training',group:'close',label:'Client training'},{key:'close_handover',group:'close',label:'Documentation'},{key:'close_support_active',group:'close',label:'WhatsApp support'},{key:'close_revisions',group:'close',label:'Revisions done'},
  ];

  const byGroup = {};
  DELIVERABLES.forEach(d => {
    if (!byGroup[d.group]) byGroup[d.group] = [];
    byGroup[d.group].push({ ...d, status: state[d.key] || 'pending' });
  });

  let doneCount = 0, totalCount = DELIVERABLES.length;
  DELIVERABLES.forEach(d => { if ((state[d.key] || 'pending') === 'done') doneCount++; });

  let html = '<div style="margin:14px 0 4px">';
  html += '<div class="sp-field-label">Deliverables progress — ' + doneCount + ' / ' + totalCount + ' done</div>';

  Object.entries(DELIVERABLE_GROUPS).forEach(([groupKey, groupLabel]) => {
    const items = byGroup[groupKey] || [];
    if (!items.length) return;
    html += '<div class="deliv-group">';
    html += '<div class="deliv-group-label">' + escHtml(groupLabel) + '</div>';
    items.forEach(item => {
      const isDone = item.status === 'done';
      const isProgress = item.status === 'in_progress';
      const icon = isDone ? '&#x2713;' : isProgress ? '&#x25CF;' : '&#x25CB;';
      const iconCls = isDone ? 'deliv-icon-done' : isProgress ? 'deliv-icon-prog' : 'deliv-icon-pending';
      const labelCls = isDone ? 'deliv-label-done' : isProgress ? 'deliv-label-prog' : 'deliv-label-pending';
      html += '<div class="deliv-item">' +
        '<span class="' + iconCls + '">' + icon + '</span>' +
        '<span class="' + labelCls + '">' + escHtml(item.label) + '</span>' +
        '</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// --- Approval document ---

function generateApprovalDoc() {
  const client = clients.find(c => c.id === activeDrawerClientId);
  if (!client) return;
  const today = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
  const plan = client.plan || 'esencial';
  const planLabel = plan === 'ventas' ? 'Plan mensual ($150.000 COP/mes)' : plan === 'presencia' ? 'Plan de presencia (retirado, $50.000 COP/mes)' : 'Sin plan mensual';

  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Aprobacion de diseno - ' + escHtml(client.business_name || '') + '</title>' +
    '<style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}' +
    'h1{font-size:22px;margin-bottom:4px}' +
    '.sub{color:#666;font-size:14px;margin-bottom:32px}' +
    'table{width:100%;border-collapse:collapse;margin:20px 0}' +
    'td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px}' +
    'td:first-child{font-weight:600;width:38%;color:#374151}' +
    '.section{margin:28px 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px}' +
    '.sig-box{border:1px solid #d1d5db;border-radius:6px;padding:20px 24px;margin-top:32px}' +
    '.sig-line{border-bottom:1px solid #374151;width:260px;height:48px;margin:12px 0 4px}' +
    '.sig-label{font-size:12px;color:#6b7280}' +
    '.logo{font-size:18px;font-weight:700;color:#FF5C2E;margin-bottom:24px}' +
    '@media print{body{margin:24px}}</style>' +
    '</head><body>' +
    '<div class="logo">&lt;pwp/&gt; PymeWebPro</div>' +
    '<h1>Aprobacion de diseno</h1>' +
    '<div class="sub">Documento generado el ' + today + '</div>' +
    '<div class="section">Datos del cliente</div>' +
    '<table>' +
    '<tr><td>Empresa</td><td>' + escHtml(client.business_name || '—') + '</td></tr>' +
    '<tr><td>Email</td><td>' + escHtml(client.email || '—') + '</td></tr>' +
    '<tr><td>Dominio</td><td>' + escHtml(client.domain || 'Por confirmar') + '</td></tr>' +
    '</table>' +
    '<div class="section">Proyecto</div>' +
    '<table>' +
    '<tr><td>Producto</td><td>La pagina de ventas — $400.000 COP (pago unico)</td></tr>' +
    '<tr><td>Plan mensual</td><td>' + escHtml(planLabel) + '</td></tr>' +
    (client.preview_url ? '<tr><td>URL de preview</td><td>' + escHtml(client.preview_url) + '</td></tr>' : '') +
    '</table>' +
    '<div class="section">Terminos de aprobacion</div>' +
    '<p style="font-size:14px">Al firmar este documento, el cliente confirma que ha revisado el diseno presentado y aprueba el contenido, la estructura y la apariencia visual del sitio web. PymeWebPro procedera con la publicacion del sitio una vez recibido el pago del 70% restante.</p>' +
    '<div class="sig-box">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:16px">Firma del cliente</div>' +
    '<div class="sig-line"></div><div class="sig-label">Nombre y firma</div>' +
    '<div style="display:flex;gap:40px;margin-top:16px">' +
    '<div><div class="sig-line" style="width:160px"></div><div class="sig-label">Fecha</div></div>' +
    '<div><div class="sig-line" style="width:160px"></div><div class="sig-label">Cedula</div></div>' +
    '</div></div>' +
    '</body></html>';

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

function spField(label, val) {
  return '<div class="sp-field"><div class="sp-field-label">' + escHtml(label) + '</div>' +
    '<div class="sp-field-val">' + escHtml(String(val || '—')) + '</div></div>';
}

function spLinkField(label, url) {
  const safeJs = ('copyToClipboard(' + JSON.stringify(url) + ')').replace(/"/g, '&quot;');
  return '<div class="sp-field"><div class="sp-field-label">' + escHtml(label) + '</div>' +
    '<div class="sp-field-link">' +
    '<a href="' + escHtml(url) + '" target="_blank" rel="noopener">' + escHtml(url) + '</a>' +
    '<button class="copy-btn" onclick="' + safeJs + '">Copy</button>' +
    '</div></div>';
}

function spInputField(id, label, val, type, placeholder) {
  return '<div class="sp-field"><div class="sp-field-label">' + escHtml(label) + '</div>' +
    '<input class="sp-input" id="' + escHtml(id) + '" type="' + escHtml(type || 'url') + '"' +
    ' value="' + escHtml(val || '') + '" placeholder="' + escHtml(placeholder || 'https://...') + '"></div>';
}

function spBtn(style, label, fn) {
  return '<button class="sp-btn sp-btn-' + style + '" onclick="' + fn.replace(/"/g, '&quot;') + '">' +
    escHtml(label) + '</button>';
}

// --- AI mockup generator ---

async function spGenerateMockup() {
  const btn = document.getElementById('gen-mockup-btn');
  const status = document.getElementById('gen-mockup-status');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  if (status) status.textContent = 'Calling Claude. This takes 15-30 seconds...';

  const res = await api('POST', activeDrawerClientId + '/action', { action: 'generate_mockup', payload: {} })
    .catch(err => ({ error: err.message || 'Request failed' }));

  if (btn) { btn.disabled = false; btn.textContent = 'Regenerate mockup'; }

  if (res.ok && res.mockup_url) {
    const mockupUrl = res.mockup_url + '?admin=' + encodeURIComponent(getToken());
    if (status) {
      status.innerHTML = 'Done. <a href="' + escHtml(mockupUrl) + '" target="_blank" rel="noopener" style="color:#FF5C2E;font-weight:600">Open mockup &#x2197;</a>';
    }
    await refresh();
  } else {
    if (status) status.textContent = 'Error: ' + (res.error || 'Generation failed. Check ANTHROPIC_API_KEY is set on the worker.');
    if (btn) btn.textContent = 'Try again';
  }
}

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDrawer(); });

// ---------- Init ----------
if (getToken()) {
  refresh();
} else {
  showLogin();
}
</script>
</body>
</html>`;
}
