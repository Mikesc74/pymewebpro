// pymewebpro-asistente · main router
// Secrets: ANTHROPIC_API_KEY, WA_ACCESS_TOKEN, WA_VERIFY_TOKEN (wrangler secret put ...)

import { handleChat, handlePoll } from './chat.js';
import { handleWidget }           from './widget.js';
import { handlePortal, handleSchedule } from './portal.js';
import { handleWhatsApp }         from './whatsapp.js';
import { runMonthlyReports }      from './reports.js';
import { handlePrivacy }          from './privacy.js';

export default {
  // Cron: monthly client activity reports (1st of the month, 13:00 UTC = 08:00 Colombia).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runMonthlyReports(env));
  },

  async fetch(request, env, ctx) {
    const url  = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Embeddable widget script
    if (path === '/widget.js') return handleWidget(request, env);

    // Chat API (web) + poll (widget receives owner replies during takeover)
    if (path === '/api/chat') return handleChat(request, env, ctx);
    if (path === '/api/poll') return handlePoll(request, env);

    // Scheduling form submission (public, called by widget)
    if (path === '/api/schedule') return handleSchedule(request, env);

    // WhatsApp Cloud API webhook (all clients, routed by phone_number_id)
    if (path === '/wa/webhook') return handleWhatsApp(request, env, ctx);

    // Public privacy notice (Habeas Data)
    if (path === '/privacidad' || path === '/privacy') return handlePrivacy(request, env);

    // Client portal
    if (path.startsWith('/portal')) return handlePortal(request, env);

    // Root redirect
    if (path === '/') return Response.redirect('https://pymewebpro.com', 302);

    return new Response('Not found', { status: 404 });
  },
};
