// shopify.js — per-client Shopify order lookup for the order-status tool.
// Read-only: needs an Admin API token with scopes read_orders + read_fulfillments.
// Stored per client in the `integrations` table (kind='shopify').

const DEFAULT_API_VERSION = '2025-10';

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

export async function getShopifyIntegration(env, clientId) {
  return env.DB.prepare(
    "SELECT * FROM integrations WHERE client_id = ? AND kind = 'shopify' AND active = 1"
  ).bind(clientId).first();
}

// Look up one order by its number, then verify the supplied email matches the
// order before revealing anything. Returns a small JSON-friendly object that the
// model turns into a natural reply.
export async function lookupOrder(integration, { order_number, email }) {
  if (!integration?.shop_domain || !integration?.api_token) {
    return { ok: false, error: 'no_integration' };
  }
  const ver  = safeJson(integration.config)?.api_version || DEFAULT_API_VERSION;
  const shop = String(integration.shop_domain).replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const raw  = String(order_number || '').trim();
  const name = raw.startsWith('#') ? raw : '#' + raw;
  const url  = `https://${shop}/admin/api/${ver}/orders.json?status=any&name=${encodeURIComponent(name)}`;

  let data;
  try {
    const resp = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': integration.api_token, 'Content-Type': 'application/json' },
    });
    if (!resp.ok) {
      console.error('Shopify API error', resp.status, await resp.text());
      return { ok: false, error: 'api_error', status: resp.status };
    }
    data = await resp.json();
  } catch (e) {
    console.error('Shopify fetch error', e);
    return { ok: false, error: 'fetch_error' };
  }

  const orders = data.orders || [];
  if (!orders.length) return { ok: true, found: false };

  const order = orders[0];
  const provided   = String(email || '').trim().toLowerCase();
  const orderEmail = String(order.email || order.contact_email || '').toLowerCase();
  const matched = !!provided && !!orderEmail && provided === orderEmail;

  if (!matched) return { ok: true, found: true, matched: false };
  return { ok: true, found: true, matched: true, order: summarize(order) };
}

function summarize(order) {
  const fulfillments = order.fulfillments || [];
  const latest = fulfillments[fulfillments.length - 1] || null;

  let stage = 'processing';
  if (order.cancelled_at) {
    stage = 'cancelled';
  } else if (order.fulfillment_status === 'fulfilled') {
    stage = latest?.shipment_status === 'delivered' ? 'delivered' : 'shipped';
  } else if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
    stage = 'preparing';
  } else {
    stage = 'pending_payment';
  }

  return {
    name: order.name,
    stage, // processing | preparing | shipped | delivered | cancelled | pending_payment
    financial_status: order.financial_status || null,
    fulfillment_status: order.fulfillment_status || null,
    shipment_status: latest?.shipment_status || null,
    tracking_number: latest?.tracking_number || null,
    tracking_url: latest?.tracking_url || (latest?.tracking_urls && latest.tracking_urls[0]) || null,
    carrier: latest?.tracking_company || null,
    created_at: order.created_at || null,
  };
}

// Anthropic tool definition, exposed only when the client has Shopify connected.
export const ORDER_TOOL = {
  name: 'lookup_order',
  description: 'Consulta el estado de un pedido en la tienda Shopify del negocio (pago, preparacion, envio con guia, entregado). Usala SOLO cuando el cliente pregunte por su pedido Y haya dado el numero de pedido y el correo con el que compro. Si el correo no coincide, no reveles datos.',
  input_schema: {
    type: 'object',
    properties: {
      order_number: { type: 'string', description: 'Numero del pedido, p.ej. 1001 o #1001' },
      email: { type: 'string', description: 'Correo con el que se hizo la compra, para verificar identidad' },
    },
    required: ['order_number', 'email'],
  },
};
