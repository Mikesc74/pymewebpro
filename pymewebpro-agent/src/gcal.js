// gcal.js · Google Calendar client for Valentina. Host-aware (mike|santi),
// OAuth refresh tokens. Calendar scope only. Ported from ~/code/catalina/src/gcal.js.
//
// Required secrets (same values as Catalina):
//   GCAL_CLIENT_ID, GCAL_CLIENT_SECRET
//   MIKE_GCAL_REFRESH_TOKEN  (mike@colguides.com)
//   SANTI_GCAL_REFRESH_TOKEN (santiago@colguides.com)

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";

const tokenCache = new Map(); // host -> { token, expiresAt }

function refreshTokenFor(env, host) {
  const h = String(host || "mike").toLowerCase();
  if (h === "santi" || h === "santiago") return env.SANTI_GCAL_REFRESH_TOKEN;
  return env.MIKE_GCAL_REFRESH_TOKEN;
}

export async function getAccessToken(env, host) {
  if (!env.GCAL_CLIENT_ID || !env.GCAL_CLIENT_SECRET) {
    throw new Error("GCAL_CLIENT_ID / GCAL_CLIENT_SECRET not set");
  }
  const refresh = refreshTokenFor(env, host);
  if (!refresh) throw new Error(`Refresh token not set for host '${host}'`);

  const cacheKey = String(host || "mike").toLowerCase();
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token;

  const body = new URLSearchParams({
    client_id: env.GCAL_CLIENT_ID,
    client_secret: env.GCAL_CLIENT_SECRET,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gcal refresh ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  tokenCache.set(cacheKey, { token: j.access_token, expiresAt: Date.now() + (Number(j.expires_in || 3600) * 1000) });
  return j.access_token;
}

export async function gcalFreeBusy(env, host, startISO, endISO) {
  const token = await getAccessToken(env, host);
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: "POST",
    headers: { "authorization": `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin: startISO, timeMax: endISO, items: [{ id: "primary" }] }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gcal freeBusy ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const cal = j.calendars && j.calendars.primary;
  if (!cal) return [];
  if (cal.errors && cal.errors.length) throw new Error(`gcal freeBusy errors: ${JSON.stringify(cal.errors)}`);
  return (cal.busy || []).map(b => ({ start: b.start, end: b.end }));
}

export async function gcalCreateEvent(env, host, { startISO, endISO, attendees = [], summary, description = "", timeZone = "America/Bogota", addMeet = true }) {
  const token = await getAccessToken(env, host);
  const event = {
    summary,
    description,
    start: { dateTime: startISO, timeZone },
    end: { dateTime: endISO, timeZone },
    attendees: attendees.map(a => ({ email: a.email, displayName: a.displayName || a.email })),
    reminders: { useDefault: true },
  };
  if (addMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: `valentina-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  const res = await fetch(`${CAL_BASE}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers: { "authorization": `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gcal createEvent ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  return {
    ok: true,
    id: j.id,
    htmlLink: j.htmlLink,
    hangoutLink: j.hangoutLink || (j.conferenceData && j.conferenceData.entryPoints && j.conferenceData.entryPoints[0] && j.conferenceData.entryPoints[0].uri) || null,
  };
}
