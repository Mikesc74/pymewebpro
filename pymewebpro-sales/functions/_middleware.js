// Pages middleware: identifies the caller from Cloudflare Access and attaches
// a seller row (auto-creating admin rows for emails in ADMIN_EMAILS).
// Runs in front of every request, including HTML pages.

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  // Only the API needs the user attached. Static pages pass through.
  // We still try to resolve identity so client JS can use /api/me.
  const email = (
    request.headers.get("Cf-Access-Authenticated-User-Email") ||
    request.headers.get("cf-access-authenticated-user-email") ||
    // dev escape hatch when there's no Access in front
    request.headers.get("X-Dev-Email") ||
    ""
  ).toLowerCase().trim();

  if (email) {
    const adminEmails = (env.ADMIN_EMAILS || "")
      .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const isAdmin = adminEmails.includes(email);

    // Find or create seller row.
    let seller = await env.DB.prepare(
      "SELECT id, email, name, role, active FROM sellers WHERE email = ?"
    ).bind(email).first();

    if (!seller && isAdmin) {
      // Bootstrap admin on first hit.
      await env.DB.prepare(
        "INSERT INTO sellers (email, name, role, active) VALUES (?, ?, 'admin', 1)"
      ).bind(email, email.split("@")[0]).run();
      seller = await env.DB.prepare(
        "SELECT id, email, name, role, active FROM sellers WHERE email = ?"
      ).bind(email).first();
    }

    // Auto-promote configured admin emails if their row exists but isn't admin yet.
    if (seller && isAdmin && seller.role !== "admin") {
      await env.DB.prepare("UPDATE sellers SET role = 'admin' WHERE id = ?").bind(seller.id).run();
      seller.role = "admin";
    }

    data.user = seller || null;
    data.email = email;
  }

  // Guard /api/*: must be logged in and active.
  if (url.pathname.startsWith("/api/")) {
    if (!data.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { "content-type": "application/json" }
      });
    }
    if (!data.user.active) {
      return new Response(JSON.stringify({ error: "seller_inactive" }), {
        status: 403, headers: { "content-type": "application/json" }
      });
    }
  }

  return next();
}
