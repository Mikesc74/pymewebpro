// Admin password login + signed share-link tokens.
import { Env, hmacSha256Hex, nowSec, randomToken, readCookie, setCookie, uuid } from "./util";

const ADMIN_COOKIE = "ppe_admin";

export async function isAdmin(req: Request, env: Env): Promise<boolean> {
  const sid = readCookie(req, ADMIN_COOKIE);
  if (!sid) return false;
  const row = await env.DB.prepare("SELECT email, expires_at FROM admin_sessions WHERE id = ?")
    .bind(sid).first<{ email: string; expires_at: number }>();
  if (!row) return false;
  if (row.expires_at < nowSec()) return false;
  return row.email === env.ADMIN_EMAIL;
}

export async function loginAdmin(env: Env, password: string): Promise<string | null> {
  if (password !== env.ADMIN_PASSWORD) return null;
  const sid = uuid();
  const expires = nowSec() + 60 * 60 * 24 * 14; // 14 days
  await env.DB.prepare("INSERT INTO admin_sessions (id, email, expires_at) VALUES (?, ?, ?)")
    .bind(sid, env.ADMIN_EMAIL, expires).run();
  return sid;
}

export function adminCookieHeader(sid: string): string {
  return setCookie(ADMIN_COOKIE, sid, { maxAge: 60 * 60 * 24 * 14 });
}

export function clearAdminCookie(): string {
  return setCookie(ADMIN_COOKIE, "", { maxAge: 0 });
}

// Signed share-link tokens: <linkId>.<exp>.<sig>
export async function signShareToken(env: Env, linkId: string, expiresAt: number): Promise<string> {
  const payload = `${linkId}.${expiresAt}`;
  const sig = await hmacSha256Hex(env.SHARE_LINK_SECRET, payload);
  return `${payload}.${sig.slice(0, 32)}`;
}

export async function verifyShareToken(env: Env, token: string): Promise<{ linkId: string; expiresAt: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [linkId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < nowSec()) return null;
  const expectedSig = (await hmacSha256Hex(env.SHARE_LINK_SECRET, `${linkId}.${exp}`)).slice(0, 32);
  if (expectedSig !== sig) return null;
  return { linkId, expiresAt: exp };
}

export function generateShareLinkRow() {
  return { id: uuid(), token: randomToken(18) };
}
