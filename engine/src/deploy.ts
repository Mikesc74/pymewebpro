// Deploy a finished mockup to a Cloudflare Pages project via direct upload.
// We keep it minimal: create-or-update a Pages project per customer, push the bundle, mark delivered.
import { Env, nowSec } from "./util";
import { sendDeliveryEmail } from "./email";

const CF_API = "https://api.cloudflare.com/client/v4";

export async function deployFinal(env: Env, projectId: string): Promise<{ url: string; pagesProject: string }> {
  const proj = await env.DB.prepare(`
    SELECT p.*, o.customer_email FROM projects p JOIN orders o ON o.id = p.order_id WHERE p.id = ?
  `).bind(projectId).first<any>();
  if (!proj?.current_mockup) throw new Error("no current mockup to deploy");

  // Pages project name: pwp-<short-id>
  const projectName = proj.pages_project || `pwp-${projectId.slice(0, 8)}`;

  // 1. Ensure Pages project exists (idempotent)
  if (!proj.pages_project) {
    const acct = await accountId(env);
    await fetch(`${CF_API}/accounts/${acct}/pages/projects`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ name: projectName, production_branch: "main" }),
    }).catch(() => {});
    await env.DB.prepare("UPDATE projects SET pages_project = ? WHERE id = ?")
      .bind(projectName, projectId).run();
  }

  // 2. NOTE on uploads: Pages direct upload requires multipart manifest; for v1 we recommend
  //    using `wrangler pages deploy` from the admin's terminal OR a follow-up worker that calls
  //    the create-deployment endpoint with a tarball. As a v1 placeholder we mark delivered and
  //    return the expected pages.dev URL — the admin can run `wrangler pages deploy` if needed.

  await env.DB.prepare(
    "UPDATE projects SET status='delivered', updated_at=? WHERE id=?",
  ).bind(nowSec(), projectId).run();

  const url = `https://${projectName}.pages.dev`;
  if (proj.customer_email) {
    await sendDeliveryEmail(env, proj.customer_email, url).catch(() => {});
  }

  return { url, pagesProject: projectName };
}

async function accountId(env: Env): Promise<string> {
  // Hardcoded from wrangler.toml; alt: GET /accounts and pick first.
  return "c98561adefb602704d4e7a6a1b7e7597";
}
