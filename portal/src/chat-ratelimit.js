// chat-ratelimit.js · shared rate limiting for the PUBLIC mockup chat agents
// (espacio-dental-chat.js and prospect-chat.js), both reachable by the
// anonymous internet at mockups.pymewebpro.com and both calling Anthropic.
//
// Two layers, backed by env.TOKENS (KV):
//   1. Per-IP throttle: at most PER_IP_MAX messages per PER_IP_WINDOW_S seconds
//      from a single IP. Stops one person (or a simple script) from hammering.
//   2. Global daily cap: at most GLOBAL_DAILY_MAX Anthropic chat calls per day
//      across BOTH public chatbots combined. This is the real protection: even
//      a distributed botnet cannot push the Anthropic bill past a known ceiling
//      while we are pre-revenue.
//
// Best-effort: KV is eventually consistent, so a burst can slip a few calls
// past the exact limit. That is fine here · the goal is a hard-ish ceiling on
// spend, not perfect fairness. For strict limits we would use a Durable Object.
//
// Returns { ok: true } when the request may proceed, or
// { ok: false, status, error, retryAfter? } when it should be rejected.

const PER_IP_MAX = 8;          // messages per IP per window
const PER_IP_WINDOW_S = 60;    // window length in seconds
const GLOBAL_DAILY_MAX = 300;  // total public-chat Anthropic calls per day (both bots)

function clientIp(req) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    "unknown"
  );
}

// Call this BEFORE invoking Anthropic. If it returns { ok:false }, return a
// json(result.error, result.status) response instead of calling the model.
export async function checkChatRateLimit(req, env) {
  const kv = env.TOKENS;
  if (!kv) return { ok: true }; // KV not bound: fail open, do not break chat

  // 1. Global daily cap (covers both public chatbots).
  const day = new Date().toISOString().slice(0, 10);
  const gKey = "chatrl:global:" + day;
  let gCount = 0;
  try { const r = await kv.get(gKey); gCount = r ? (parseInt(r, 10) || 0) : 0; } catch (e) { /* fail open */ }
  if (gCount >= GLOBAL_DAILY_MAX) {
    return {
      ok: false,
      status: 429,
      error: "Chat is busy right now. Please reach out on WhatsApp and we will reply quickly.",
    };
  }

  // 2. Per-IP throttle (fixed window).
  const ip = clientIp(req);
  const bucket = Math.floor(Date.now() / 1000 / PER_IP_WINDOW_S);
  const ipKey = "chatrl:ip:" + ip + ":" + bucket;
  let ipCount = 0;
  try { const r = await kv.get(ipKey); ipCount = r ? (parseInt(r, 10) || 0) : 0; } catch (e) { /* fail open */ }
  if (ipCount >= PER_IP_MAX) {
    return {
      ok: false,
      status: 429,
      error: "You are sending messages quickly. Please wait a moment and try again.",
      retryAfter: PER_IP_WINDOW_S,
    };
  }

  // Passed both checks: record one upcoming Anthropic call.
  try {
    await kv.put(ipKey, String(ipCount + 1), { expirationTtl: PER_IP_WINDOW_S + 5 });
    await kv.put(gKey, String(gCount + 1), { expirationTtl: 90000 }); // ~25h, survives the day boundary
  } catch (e) { /* if the write fails, allow the request, do not break chat */ }

  return { ok: true };
}
