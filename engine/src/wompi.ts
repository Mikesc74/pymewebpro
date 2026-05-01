// Wompi webhook handling + checkout helpers.
// Docs: https://docs.wompi.co/  (events.signature.checksum = sha256 over signed properties + timestamp + events_secret)
import { Env, hmacSha256Hex, json, nowSec, randomToken, sha256Hex, uuid } from "./util";
import { sendIntakeInviteEmail } from "./email";

interface WompiEvent {
  event: string;
  data: { transaction: WompiTx };
  sent_at?: string;
  timestamp: number;
  signature: { properties: string[]; checksum: string };
  environment: "test" | "prod";
}

interface WompiTx {
  id: string;
  amount_in_cents: number;
  reference: string;
  customer_email: string;
  currency: string;
  payment_method_type: string;
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
  customer_data?: { full_name?: string; phone_number?: string };
}

export async function handleWebhook(req: Request, env: Env): Promise<Response> {
  const raw = await req.text();
  let evt: WompiEvent;
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  // Verify signature
  const concat = evt.signature.properties
    .map((p) => p.split(".").reduce<any>((acc, k) => acc?.[k], evt.data))
    .join("") + String(evt.timestamp) + env.WOMPI_EVENTS_SECRET;
  const expected = await sha256Hex(concat);
  if (expected !== evt.signature.checksum) {
    return new Response("bad signature", { status: 401 });
  }

  const tx = evt.data.transaction;
  // Upsert order
  const existing = await env.DB.prepare("SELECT id, status FROM orders WHERE reference = ?")
    .bind(tx.reference).first<{ id: string; status: string }>();

  let orderId: string;
  if (existing) {
    orderId = existing.id;
    await env.DB.prepare(
      "UPDATE orders SET wompi_tx_id=?, status=?, customer_email=?, customer_name=?, customer_phone=?, raw_payload=?, updated_at=? WHERE id=?",
    ).bind(
      tx.id, tx.status, tx.customer_email,
      tx.customer_data?.full_name ?? null, tx.customer_data?.phone_number ?? null,
      raw, nowSec(), orderId,
    ).run();
  } else {
    orderId = uuid();
    await env.DB.prepare(
      "INSERT INTO orders (id, wompi_tx_id, reference, amount_cents, currency, status, customer_email, customer_name, customer_phone, raw_payload) VALUES (?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      orderId, tx.id, tx.reference, tx.amount_in_cents, tx.currency, tx.status, tx.customer_email,
      tx.customer_data?.full_name ?? null, tx.customer_data?.phone_number ?? null, raw,
    ).run();
  }

  // On approval: create project (if initial) or mark upsell paid
  if (tx.status === "APPROVED") {
    const order = await env.DB.prepare("SELECT kind, parent_order_id FROM orders WHERE id = ?")
      .bind(orderId).first<{ kind: string; parent_order_id: string | null }>();
    if (order?.kind === "initial") {
      const proj = await env.DB.prepare("SELECT id FROM projects WHERE order_id = ?")
        .bind(orderId).first<{ id: string }>();
      if (!proj) {
        const projectId = uuid();
        const intakeToken = randomToken(20);
        await env.DB.prepare(
          "INSERT INTO projects (id, order_id, intake_token) VALUES (?, ?, ?)",
        ).bind(projectId, orderId, intakeToken).run();
        const link = `${env.PUBLIC_BASE_URL}/intake/${intakeToken}`;
        await sendIntakeInviteEmail(env, tx.customer_email, link).catch((e) => console.error("email", e));
      }
    } else if (order?.kind === "upsell") {
      await env.DB.prepare("UPDATE upsells SET status = 'paid' WHERE order_id = ?").bind(orderId).run();
    }
  }

  return json({ ok: true });
}

// Build a Wompi widget redirect URL for the landing-page CTA.
// (Used when /api/checkout/initial is called with desired amount.)
export async function checkoutInitial(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const amountCents = Number(url.searchParams.get("amount") ?? "39000000"); // 390.000 COP default
  const reference = `pwp_init_${randomToken(8)}`;
  const integrity = await sha256Hex(`${reference}${amountCents}COP${env.WOMPI_INTEGRITY_SECRET}`);
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    currency: "COP",
    "amount-in-cents": String(amountCents),
    reference,
    "signature:integrity": integrity,
    "redirect-url": `${env.PUBLIC_BASE_URL}/payment/return`,
  });
  // Pre-create a PENDING order so we can correlate.
  await env.DB.prepare(
    "INSERT INTO orders (id, reference, amount_cents, currency, status, kind) VALUES (?, ?, ?, 'COP', 'PENDING', 'initial')",
  ).bind(uuid(), reference, amountCents).run();
  return Response.redirect(`https://checkout.wompi.co/p/?${params.toString()}`, 302);
}

export async function paymentReturn(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const ref = url.searchParams.get("id") || url.searchParams.get("reference") || "";
  // Don't trust this — webhook is the source of truth. Just show a pretty page.
  return new Response(
    `<!doctype html><meta charset=utf-8><title>Pago recibido</title>
<body style="font-family:system-ui;padding:40px;text-align:center">
<h1>¡Pago recibido!</h1>
<p>Estamos confirmando su transacción. En menos de un minuto recibirá un correo con el enlace para subir los detalles de su sitio.</p>
<p><small>Ref: ${ref}</small></p>
</body>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
