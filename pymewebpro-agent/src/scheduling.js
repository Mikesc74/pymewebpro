// scheduling.js · Slot finding + booking against Mike's or Santi's Google
// Calendar. Host-aware. Ported from ~/code/catalina/src/calcom.js.

import { gcalFreeBusy, gcalCreateEvent } from "./gcal.js";

const DEFAULT_HOURS = [
  { startHour: 10, startMin: 0, endHour: 12, endMin: 0 },
  { startHour: 14, startMin: 0, endHour: 16, endMin: 0 },
];
const SLOT_MINUTES = 15;

function normHost(host) {
  const h = String(host || "mike").toLowerCase();
  if (h === "santi" || h === "santiago") return "santi";
  return "mike";
}

function configured(env, host) {
  if (!env.GCAL_CLIENT_ID || !env.GCAL_CLIENT_SECRET) return false;
  const refresh = normHost(host) === "santi" ? env.SANTI_GCAL_REFRESH_TOKEN : env.MIKE_GCAL_REFRESH_TOKEN;
  return !!refresh;
}

export async function listSlots(env, { host = "mike", startISO, endISO, daysAhead = 7, timeZone = "America/Bogota" } = {}) {
  const h = normHost(host);
  if (!configured(env, h)) return null;
  const start = startISO ? new Date(startISO) : new Date(Date.now() + 60 * 60 * 1000);
  const days = Math.min(Math.max(Number(daysAhead) || 7, 1), 14);
  const end = endISO ? new Date(endISO) : new Date(start.getTime() + days * 86400000);

  let busy = [];
  try {
    busy = await gcalFreeBusy(env, h, start.toISOString(), end.toISOString());
  } catch (e) {
    console.error("gcalFreeBusy failed", e.message);
    return null;
  }

  const out = {};
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
    const dateStr = formatDateInTz(d, timeZone);
    const weekday = weekdayInTz(d, timeZone);
    if (weekday === 0 || weekday === 6) continue;
    for (const window of DEFAULT_HOURS) {
      const winStart = buildLocalDateTime(dateStr, window.startHour, window.startMin, timeZone);
      const winEnd = buildLocalDateTime(dateStr, window.endHour, window.endMin, timeZone);
      for (let slot = winStart; slot.getTime() + SLOT_MINUTES * 60000 <= winEnd.getTime(); slot = new Date(slot.getTime() + SLOT_MINUTES * 60000)) {
        if (slot < start) continue;
        const slotEnd = new Date(slot.getTime() + SLOT_MINUTES * 60000);
        if (isBusy(slot, slotEnd, busy)) continue;
        if (!out[dateStr]) out[dateStr] = [];
        out[dateStr].push({ start: slot.toISOString() });
      }
    }
  }
  return out;
}

function isBusy(slotStart, slotEnd, busy) {
  for (const b of busy) {
    if (slotStart < new Date(b.end) && slotEnd > new Date(b.start)) return true;
  }
  return false;
}

function formatDateInTz(date, tz) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function weekdayInTz(date, tz) {
  const wk = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wk] ?? 0;
}

function buildLocalDateTime(dateStr, hour, minute, tz) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const naiveUTC = new Date(`${dateStr}T${hh}:${mm}:00Z`);
  const offsetMin = tzOffsetMinutes(naiveUTC, tz);
  return new Date(naiveUTC.getTime() - offsetMin * 60000);
}

function tzOffsetMinutes(date, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const map = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const asLocal = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
  return Math.round((asLocal - date.getTime()) / 60000);
}

export async function bookSlot(env, { host = "mike", startISO, name, email, timeZone = "America/Bogota", note = "" }) {
  const h = normHost(host);
  if (!configured(env, h)) return { ok: false, reason: "not_configured" };
  const hostName = h === "santi" ? "Santi" : "Mike";
  const start = new Date(startISO);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60000);
  const summary = `PymeWebPro: ${name || email || "Guest"} con ${hostName}`;
  const description = [
    "Llamada agendada por Valentina (pymewebpro.com).",
    `Contacto: ${name || "(sin nombre)"} <${email}>`,
    `Zona horaria: ${timeZone}`,
    note ? `Contexto: ${note}` : null,
  ].filter(Boolean).join("\n");
  try {
    const evt = await gcalCreateEvent(env, h, {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      attendees: [{ email, displayName: name }],
      summary,
      description,
      timeZone,
      addMeet: true,
    });
    return { ok: true, booking: { id: evt.id, htmlLink: evt.htmlLink, hangoutLink: evt.hangoutLink, host: h, startISO: start.toISOString() } };
  } catch (e) {
    console.error("bookSlot failed", e.message);
    return { ok: false, reason: e.message };
  }
}

export function pickReadableSlots(slotsByDate, { tz = "America/Bogota", limit = 5 } = {}) {
  if (!slotsByDate) return [];
  const out = [];
  for (const date of Object.keys(slotsByDate).sort()) {
    if (out.length >= limit) break;
    let morningPicked = false, afternoonPicked = false;
    for (const s of slotsByDate[date] || []) {
      if (out.length >= limit) break;
      const startISO = s.start || s;
      try {
        const d = new Date(startISO);
        const localHour = Number(d.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: tz }));
        if (localHour < 9 || localHour >= 17) continue;
        if (localHour < 12 && morningPicked) continue;
        if (localHour >= 12 && afternoonPicked) continue;
        const human = d.toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", hour12: true,
          timeZone: tz, timeZoneName: "short",
        });
        out.push({ iso: startISO, human });
        if (localHour < 12) morningPicked = true; else afternoonPicked = true;
      } catch (e) { /* skip */ }
    }
  }
  return out;
}
