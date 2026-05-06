// functions/api/lead.js — DEPRECATED.
//
// The v4 page now POSTs lead submissions directly to the portal worker at
// https://portal.pymewebpro.com/api/leads, which handles validation, D1
// persistence, admin notifications, and (after payment) the magic-link
// invite. This Pages Function is no longer hit by any page on the site.
//
// Kept as a passthrough for any stale forms or external callers that still
// POST here: it forwards the body to the portal and returns the same
// response. Safe to delete once you've verified nothing in the wild posts
// to /api/lead anymore (check Cloudflare Pages logs).

const PORTAL_LEADS_URL = "https://portal.pymewebpro.com/api/leads";

const ALLOWED_ORIGINS = [
  "https://pymewebpro.com",
  "https://www.pymewebpro.com",
  "https://mockups.pymewebpro.com",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin")) });
}

export async function onRequestPost({ request }) {
  const origin = request.headers.get("Origin") || "";
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

  let payload;
  try {
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) {
      payload = await request.json();
    } else {
      const fd = await request.formData();
      payload = Object.fromEntries(fd.entries());
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers });
  }

  // Map legacy field name from the old form (`about`) to the portal's `message`
  if (payload.about && !payload.message) payload.message = payload.about;
  if (!payload.source) payload.source = "pymewebpro_legacy_api_lead";

  try {
    const resp = await fetch(PORTAL_LEADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: { ...headers, "Content-Type": resp.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Upstream portal unreachable", detail: String(e && e.message) }), {
      status: 502, headers,
    });
  }
}
