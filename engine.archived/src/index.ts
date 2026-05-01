// Main router. One Worker, all routes.
import { Env, json, notFound } from "./util";
import { isAdmin } from "./auth";
import { handleWebhook, checkoutInitial, paymentReturn } from "./wompi";
import { intakeGet, intakePost } from "./intake";
import {
  adminLoginGet, adminLoginPost, adminLogout, adminDashboard, adminProject,
  adminGenerate, adminShare, adminApplyRevision, adminShip,
} from "./admin";
import { previewIndex, previewAsset, previewComment } from "./preview";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    const m = req.method;

    try {
      // Public health
      if (p === "/" || p === "/health") return json({ ok: true, service: "pymewebpro-engine" });

      // Wompi
      if (p === "/api/wompi/webhook" && m === "POST") return handleWebhook(req, env);
      if (p === "/api/checkout/initial" && m === "GET") return checkoutInitial(req, env);
      if (p === "/payment/return" && m === "GET") return paymentReturn(req, env);

      // Intake
      let mt = p.match(/^\/intake\/([A-Za-z0-9_-]+)\/?$/);
      if (mt) {
        if (m === "GET") return intakeGet(mt[1], env);
        if (m === "POST") return intakePost(mt[1], req, env);
      }

      // Preview (share-link viewer)
      mt = p.match(/^\/preview\/([A-Za-z0-9_.-]+)\/?$/);
      if (mt && m === "GET") return previewIndex(env, mt[1]);
      mt = p.match(/^\/preview\/([A-Za-z0-9_.-]+)\/asset\/(.+)$/);
      if (mt && m === "GET") return previewAsset(env, mt[1], decodeURIComponent(mt[2]));
      mt = p.match(/^\/preview\/([A-Za-z0-9_.-]+)\/comment$/);
      if (mt && m === "POST") return previewComment(env, mt[1], req);

      // Admin
      if (p === "/admin/login" && m === "GET") return adminLoginGet();
      if (p === "/admin/login" && m === "POST") return adminLoginPost(req, env);
      if (p === "/admin/logout" && m === "GET") return adminLogout();

      const adminOk = await isAdmin(req, env);
      if (p.startsWith("/admin")) {
        if (!adminOk) return Response.redirect(`${env.PUBLIC_BASE_URL}/admin/login`, 302);
        if (p === "/admin" || p === "/admin/") return adminDashboard(env);
        mt = p.match(/^\/admin\/project\/([A-Za-z0-9-]+)\/?$/);
        if (mt && m === "GET") return adminProject(env, mt[1]);
        mt = p.match(/^\/admin\/project\/([A-Za-z0-9-]+)\/generate$/);
        if (mt && m === "POST") return adminGenerate(env, mt[1]);
        mt = p.match(/^\/admin\/project\/([A-Za-z0-9-]+)\/share$/);
        if (mt && m === "POST") return adminShare(env, mt[1]);
        mt = p.match(/^\/admin\/project\/([A-Za-z0-9-]+)\/ship$/);
        if (mt && m === "POST") return adminShip(env, mt[1]);
        mt = p.match(/^\/admin\/revision\/([A-Za-z0-9-]+)\/apply$/);
        if (mt && m === "POST") return adminApplyRevision(env, mt[1], req);
      }

      return notFound();
    } catch (err: any) {
      console.error("router error", err?.stack || err);
      return new Response(`error: ${err?.message ?? "unknown"}`, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
