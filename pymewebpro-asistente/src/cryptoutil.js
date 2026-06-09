// cryptoutil.js — encrypt/decrypt secrets stored in D1 (per-client Shopify tokens).
// AES-256-GCM with a key derived from the TOKEN_ENC_KEY worker secret.
// Encrypted values are prefixed "enc:"; legacy plaintext (no prefix) still reads,
// so this is a safe in-place migration. If TOKEN_ENC_KEY is unset, falls back to
// plaintext storage (logged), so nothing breaks during rollout.

async function aesKey(secret) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptToken(env, plain) {
  if (!plain) return plain;
  if (!env.TOKEN_ENC_KEY) { console.warn('TOKEN_ENC_KEY unset; storing token in plaintext'); return plain; }
  try {
    const key = await aesKey(env.TOKEN_ENC_KEY);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
    const buf = new Uint8Array(iv.length + ct.byteLength);
    buf.set(iv, 0);
    buf.set(new Uint8Array(ct), iv.length);
    return 'enc:' + btoa(String.fromCharCode(...buf));
  } catch (e) {
    console.error('encrypt error', e);
    return plain;
  }
}

export async function decryptToken(env, stored) {
  if (!stored || !String(stored).startsWith('enc:')) return stored; // legacy plaintext
  if (!env.TOKEN_ENC_KEY) { console.error('encrypted token but TOKEN_ENC_KEY unset'); return null; }
  try {
    const raw = Uint8Array.from(atob(String(stored).slice(4)), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const key = await aesKey(env.TOKEN_ENC_KEY);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.error('decrypt error', e);
    return null;
  }
}
