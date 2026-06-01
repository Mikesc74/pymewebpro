// Single dispatcher for /api/* routes.
// Convention: seller can only see/touch their own data; admin sees everything.
// All amounts in COP, integer. Dates ISO YYYY-MM-DD.

const J = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json" }
});
const ERR = (msg, status = 400) => J({ error: msg }, status);

const RECURRING_MONTHS = 12;        // 10% commission window
const INITIAL_HOLD_DAYS = 31;       // MBG window on the base sale
// `ventas` (150000) is the ONLY plan offered to new clients (the single $150.000/mes
// "Plan mensual"). `hosting` (30000) and `presencia` (50000) are legacy/historical:
// kept here only so old recurring_charges rows still validate. Do not offer them to new clients.
const PLAN_AMOUNTS = { hosting: 30000, presencia: 50000, ventas: 150000 };

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function addMonths(isoDate, months) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
function today() { return new Date().toISOString().slice(0, 10); }

async function logEvent(env, actor, entity, entity_id, action, detail) {
  await env.DB.prepare(
    "INSERT INTO events (actor, entity, entity_id, action, detail) VALUES (?, ?, ?, ?, ?)"
  ).bind(actor, entity, entity_id, action, detail ? JSON.stringify(detail) : null).run();
}

const ok = (b) => b !== undefined && b !== null && String(b).trim() !== "";

export async function onRequest(context) {
  const { request, env, data, params } = context;
  const user = data.user;
  const url = new URL(request.url);
  const method = request.method;

  // params.path is the [[path]] catch-all (array of segments).
  const segs = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const route = segs.join("/");

  try {
    // --- /api/me ----------------------------------------------------------
    if (route === "me" && method === "GET") {
      return J({
        id: user.id, email: user.email, name: user.name,
        role: user.role, active: !!user.active
      });
    }

    // --- /api/prospects ---------------------------------------------------
    if (route === "prospects" && method === "GET") {
      const all = url.searchParams.get("all") === "1" && user.role === "admin";
      const rows = await env.DB.prepare(`
        SELECT p.*, s.name AS owner_name, s.email AS owner_email
        FROM prospects p JOIN sellers s ON s.id = p.owner_seller_id
        ${all ? "" : "WHERE p.owner_seller_id = ?"}
        ORDER BY p.updated_at DESC
      `).bind(...(all ? [] : [user.id])).all();
      return J({ prospects: rows.results });
    }

    if (route === "prospects" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      if (!ok(b.name)) return ERR("name required");
      const ownerId = user.role === "admin" && b.owner_seller_id
        ? Number(b.owner_seller_id) : user.id;
      const r = await env.DB.prepare(`
        INSERT INTO prospects (owner_seller_id, name, company, email, whatsapp, city, stage, source, notes)
        VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 'nuevo'), ?, ?)
      `).bind(
        ownerId, b.name, b.company || null, b.email || null, b.whatsapp || null,
        b.city || null, b.stage || null, b.source || null, b.notes || null
      ).run();
      await logEvent(env, user.email, "prospect", r.meta.last_row_id, "create", { name: b.name });
      return J({ id: r.meta.last_row_id }, 201);
    }

    if (segs[0] === "prospects" && segs.length === 2) {
      const id = Number(segs[1]);
      const p = await env.DB.prepare("SELECT * FROM prospects WHERE id = ?").bind(id).first();
      if (!p) return ERR("not found", 404);
      if (user.role !== "admin" && p.owner_seller_id !== user.id) return ERR("forbidden", 403);

      if (method === "GET") return J({ prospect: p });

      if (method === "PUT") {
        const b = await request.json().catch(() => ({}));
        const fields = ["name","company","email","whatsapp","city","stage","source","notes"];
        const sets = [], vals = [];
        for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]); }
        if (user.role === "admin" && b.owner_seller_id !== undefined) {
          sets.push("owner_seller_id = ?"); vals.push(Number(b.owner_seller_id));
        }
        if (!sets.length) return ERR("no fields");
        sets.push("updated_at = datetime('now')");
        await env.DB.prepare(`UPDATE prospects SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...vals, id).run();
        await logEvent(env, user.email, "prospect", id, "update", b);
        return J({ ok: true });
      }

      if (method === "DELETE") {
        if (user.role !== "admin") return ERR("admin only", 403);
        // Soft-block delete if there's a sale tied to this prospect.
        const linked = await env.DB.prepare("SELECT COUNT(*) AS n FROM sales WHERE prospect_id = ?")
          .bind(id).first();
        if (linked.n > 0) return ERR("prospect has sales; cannot delete", 409);
        await env.DB.prepare("DELETE FROM prospects WHERE id = ?").bind(id).run();
        await logEvent(env, user.email, "prospect", id, "delete", null);
        return J({ ok: true });
      }
    }

    // --- /api/sales -------------------------------------------------------
    if (route === "sales" && method === "GET") {
      const all = url.searchParams.get("all") === "1" && user.role === "admin";
      const rows = await env.DB.prepare(`
        SELECT s.*, p.name AS prospect_name, p.company AS prospect_company,
               sel.name AS owner_name, sel.email AS owner_email,
               (CASE WHEN s.payout_due_date <= date('now') THEN 1 ELSE 0 END) AS payout_eligible
        FROM sales s
        JOIN prospects p ON p.id = s.prospect_id
        JOIN sellers sel ON sel.id = s.owner_seller_id
        ${all ? "" : "WHERE s.owner_seller_id = ?"}
        ORDER BY s.sale_date DESC, s.id DESC
      `).bind(...(all ? [] : [user.id])).all();
      return J({ sales: rows.results });
    }

    if (route === "sales" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      if (!ok(b.prospect_id)) return ERR("prospect_id required");
      if (!ok(b.sale_date)) return ERR("sale_date required (YYYY-MM-DD)");
      const prospect = await env.DB.prepare("SELECT * FROM prospects WHERE id = ?")
        .bind(Number(b.prospect_id)).first();
      if (!prospect) return ERR("prospect not found", 404);
      if (user.role !== "admin" && prospect.owner_seller_id !== user.id)
        return ERR("not your prospect", 403);

      const ownerId = prospect.owner_seller_id;       // locked from prospect
      const base = Number(b.base_amount_cop || 400000);
      const rate = Number(b.commission_rate_pct ?? 20);
      const comm = Math.floor(base * rate / 100);
      const due  = addDays(b.sale_date, INITIAL_HOLD_DAYS);

      const r = await env.DB.prepare(`
        INSERT INTO sales (prospect_id, owner_seller_id, sale_date, base_amount_cop,
                           commission_rate_pct, commission_amount_cop, payout_due_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(prospect.id, ownerId, b.sale_date, base, rate, comm, due, b.notes || null).run();

      // Auto-bump prospect to 'ganado' on sale.
      await env.DB.prepare("UPDATE prospects SET stage = 'ganado', updated_at = datetime('now') WHERE id = ?")
        .bind(prospect.id).run();

      await logEvent(env, user.email, "sale", r.meta.last_row_id, "create",
        { base, rate, commission: comm });
      return J({ id: r.meta.last_row_id, commission_amount_cop: comm, payout_due_date: due }, 201);
    }

    if (segs[0] === "sales" && segs.length === 2) {
      const id = Number(segs[1]);
      const s = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first();
      if (!s) return ERR("not found", 404);
      if (user.role !== "admin" && s.owner_seller_id !== user.id) return ERR("forbidden", 403);

      if (method === "GET") {
        const recs = await env.DB.prepare(
          "SELECT * FROM recurring_charges WHERE sale_id = ? ORDER BY charge_date"
        ).bind(id).all();
        return J({ sale: s, recurring: recs.results });
      }
      if (method === "DELETE") {
        if (user.role !== "admin") return ERR("admin only", 403);
        await env.DB.prepare("DELETE FROM recurring_charges WHERE sale_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM sales WHERE id = ?").bind(id).run();
        await logEvent(env, user.email, "sale", id, "delete", null);
        return J({ ok: true });
      }
    }

    if (segs[0] === "sales" && segs[2] === "mark-paid" && method === "POST") {
      if (user.role !== "admin") return ERR("admin only", 403);
      const id = Number(segs[1]);
      const s = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first();
      if (!s) return ERR("not found", 404);
      if (s.status === "refunded") return ERR("sale is refunded", 409);
      await env.DB.prepare(
        "UPDATE sales SET status='paid', paid_at=datetime('now'), updated_at=datetime('now') WHERE id=?"
      ).bind(id).run();
      await logEvent(env, user.email, "sale", id, "mark_paid", null);
      return J({ ok: true });
    }

    if (segs[0] === "sales" && segs[2] === "refund" && method === "POST") {
      if (user.role !== "admin") return ERR("admin only", 403);
      const id = Number(segs[1]);
      const s = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first();
      if (!s) return ERR("not found", 404);
      // If commission already paid, mark refunded but flag clawback needed.
      const flag = s.status === "paid" ? "refunded_after_payout" : "refunded";
      await env.DB.prepare(
        "UPDATE sales SET status=?, refunded_at=datetime('now'), updated_at=datetime('now') WHERE id=?"
      ).bind(flag === "refunded_after_payout" ? "refunded" : "refunded", id).run();
      // Void any pending recurring charges on this sale.
      await env.DB.prepare(
        "UPDATE recurring_charges SET status='voided' WHERE sale_id=? AND status='pending'"
      ).bind(id).run();
      await logEvent(env, user.email, "sale", id, "refund", { previously: s.status });
      return J({ ok: true, clawback_needed: s.status === "paid" });
    }

    // --- /api/recurring ---------------------------------------------------
    if (route === "recurring" && method === "GET") {
      const all = url.searchParams.get("all") === "1" && user.role === "admin";
      const rows = await env.DB.prepare(`
        SELECT r.*, p.name AS prospect_name, p.company AS prospect_company,
               sel.name AS owner_name,
               (CASE WHEN r.payout_due_date <= date('now') THEN 1 ELSE 0 END) AS payout_eligible
        FROM recurring_charges r
        JOIN prospects p ON p.id = r.prospect_id
        JOIN sellers sel ON sel.id = r.owner_seller_id
        ${all ? "" : "WHERE r.owner_seller_id = ?"}
        ORDER BY r.charge_date DESC, r.id DESC
      `).bind(...(all ? [] : [user.id])).all();
      return J({ recurring: rows.results });
    }

    if (route === "recurring" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      if (!ok(b.sale_id) || !ok(b.plan) || !ok(b.charge_date))
        return ERR("sale_id, plan, charge_date required");
      if (!PLAN_AMOUNTS[b.plan]) return ERR("plan must be hosting|presencia|ventas");

      const s = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(Number(b.sale_id)).first();
      if (!s) return ERR("sale not found", 404);
      if (user.role !== "admin" && s.owner_seller_id !== user.id) return ERR("forbidden", 403);
      if (s.status === "refunded") return ERR("sale is refunded", 409);

      // Enforce the 12-month window from sale_date.
      const windowEnd = addMonths(s.sale_date, RECURRING_MONTHS);
      if (b.charge_date > windowEnd)
        return ERR(`charge_date past commission window (ends ${windowEnd})`);
      if (b.charge_date < s.sale_date)
        return ERR("charge_date before sale_date");

      const amount = Number(b.amount_cop || PLAN_AMOUNTS[b.plan]);
      const rate   = Number(b.commission_rate_pct ?? 10);
      const comm   = Math.floor(amount * rate / 100);
      const due    = b.payout_due_date || b.charge_date;   // immediate by default

      const r = await env.DB.prepare(`
        INSERT INTO recurring_charges
          (sale_id, prospect_id, owner_seller_id, plan, charge_date, amount_cop,
           commission_rate_pct, commission_amount_cop, payout_due_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(s.id, s.prospect_id, s.owner_seller_id, b.plan, b.charge_date, amount,
              rate, comm, due, b.notes || null).run();
      await logEvent(env, user.email, "recurring", r.meta.last_row_id, "create",
        { sale_id: s.id, plan: b.plan, amount });
      return J({ id: r.meta.last_row_id, commission_amount_cop: comm }, 201);
    }

    if (segs[0] === "recurring" && segs[2] === "mark-paid" && method === "POST") {
      if (user.role !== "admin") return ERR("admin only", 403);
      const id = Number(segs[1]);
      await env.DB.prepare(
        "UPDATE recurring_charges SET status='paid', paid_at=datetime('now') WHERE id=?"
      ).bind(id).run();
      await logEvent(env, user.email, "recurring", id, "mark_paid", null);
      return J({ ok: true });
    }

    if (segs[0] === "recurring" && segs.length === 2 && method === "DELETE") {
      if (user.role !== "admin") return ERR("admin only", 403);
      const id = Number(segs[1]);
      await env.DB.prepare("DELETE FROM recurring_charges WHERE id = ?").bind(id).run();
      await logEvent(env, user.email, "recurring", id, "delete", null);
      return J({ ok: true });
    }

    // --- /api/payouts/summary --------------------------------------------
    if (route === "payouts/summary" && method === "GET") {
      const all = url.searchParams.get("all") === "1" && user.role === "admin";
      const scope = all ? "" : "WHERE owner_seller_id = ?";
      const args = all ? [] : [user.id];

      const initial = await env.DB.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN status='paid' THEN commission_amount_cop ELSE 0 END), 0) AS paid_cop,
          COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date <= date('now') THEN commission_amount_cop ELSE 0 END), 0) AS eligible_cop,
          COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date >  date('now') THEN commission_amount_cop ELSE 0 END), 0) AS held_cop,
          COUNT(*) AS sales_count
        FROM sales ${scope}
      `).bind(...args).first();

      const recurring = await env.DB.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN status='paid' THEN commission_amount_cop ELSE 0 END), 0) AS paid_cop,
          COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date <= date('now') THEN commission_amount_cop ELSE 0 END), 0) AS eligible_cop,
          COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date >  date('now') THEN commission_amount_cop ELSE 0 END), 0) AS held_cop,
          COUNT(*) AS charges_count
        FROM recurring_charges ${scope}
      `).bind(...args).first();

      // Per-seller breakdown (admin only).
      let perSeller = null;
      if (all) {
        const rows = await env.DB.prepare(`
          SELECT s.id AS seller_id, s.name, s.email,
                 (SELECT COALESCE(SUM(CASE WHEN status='paid' THEN commission_amount_cop ELSE 0 END),0)
                    FROM sales WHERE owner_seller_id = s.id) +
                 (SELECT COALESCE(SUM(CASE WHEN status='paid' THEN commission_amount_cop ELSE 0 END),0)
                    FROM recurring_charges WHERE owner_seller_id = s.id) AS paid_cop,
                 (SELECT COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date <= date('now') THEN commission_amount_cop ELSE 0 END),0)
                    FROM sales WHERE owner_seller_id = s.id) +
                 (SELECT COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date <= date('now') THEN commission_amount_cop ELSE 0 END),0)
                    FROM recurring_charges WHERE owner_seller_id = s.id) AS eligible_cop,
                 (SELECT COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date >  date('now') THEN commission_amount_cop ELSE 0 END),0)
                    FROM sales WHERE owner_seller_id = s.id) +
                 (SELECT COALESCE(SUM(CASE WHEN status='pending' AND payout_due_date >  date('now') THEN commission_amount_cop ELSE 0 END),0)
                    FROM recurring_charges WHERE owner_seller_id = s.id) AS held_cop
          FROM sellers s WHERE s.active = 1
          ORDER BY eligible_cop DESC, s.name
        `).all();
        perSeller = rows.results;
      }

      return J({
        scope: all ? "all" : "mine",
        initial,
        recurring,
        total: {
          paid_cop:     initial.paid_cop + recurring.paid_cop,
          eligible_cop: initial.eligible_cop + recurring.eligible_cop,
          held_cop:     initial.held_cop + recurring.held_cop,
        },
        per_seller: perSeller,
      });
    }

    // --- /api/admin/sellers (admin only) ---------------------------------
    if (route === "admin/sellers" && method === "GET") {
      if (user.role !== "admin") return ERR("admin only", 403);
      const rows = await env.DB.prepare(
        "SELECT * FROM sellers ORDER BY active DESC, name"
      ).all();
      return J({ sellers: rows.results });
    }
    if (route === "admin/sellers" && method === "POST") {
      if (user.role !== "admin") return ERR("admin only", 403);
      const b = await request.json().catch(() => ({}));
      if (!ok(b.email) || !ok(b.name)) return ERR("email and name required");
      const email = String(b.email).toLowerCase().trim();
      const r = await env.DB.prepare(`
        INSERT INTO sellers (email, name, whatsapp, role, active, payout_method, notes)
        VALUES (?, ?, ?, COALESCE(?, 'seller'), 1, ?, ?)
      `).bind(email, b.name, b.whatsapp || null, b.role || null,
              b.payout_method || null, b.notes || null).run();
      await logEvent(env, user.email, "seller", r.meta.last_row_id, "create", { email });
      return J({ id: r.meta.last_row_id }, 201);
    }
    if (segs[0] === "admin" && segs[1] === "sellers" && segs.length === 3) {
      if (user.role !== "admin") return ERR("admin only", 403);
      const id = Number(segs[2]);
      if (method === "PUT") {
        const b = await request.json().catch(() => ({}));
        const fields = ["name","whatsapp","role","active","payout_method","notes"];
        const sets = [], vals = [];
        for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]); }
        if (!sets.length) return ERR("no fields");
        sets.push("updated_at = datetime('now')");
        await env.DB.prepare(`UPDATE sellers SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...vals, id).run();
        await logEvent(env, user.email, "seller", id, "update", b);
        return J({ ok: true });
      }
    }

    return ERR("not found", 404);
  } catch (e) {
    return ERR(`server error: ${e.message}`, 500);
  }
}
