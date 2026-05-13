// ============================================================================
// Chief of Staff · agente en español para Santiago + Mike
// ============================================================================
// Mounted by src/index.js:
//   - POST /api/admin/chief-of-staff/chat  -> ejecuta el loop de Claude con tools
//
// Auth: mismo Bearer ADMIN_TOKEN que el resto de /api/admin/*.
//
// El widget vive en el bottom-right de TODAS las páginas admin (CRM + SPA).
// Está pensado para que Santi pueda preguntar de todo (precios, productos,
// arquitectura, código, clientes) y también realizar acciones contra el CRM
// (crear actividades, mover etapas de leads/deals, agendar próxima acción).
//
// Sin em dashes nunca (regla de Mike).

import { CHIEF_KNOWLEDGE_BASE, CHIEF_EXTRA_DOCS } from "./chief-of-staff-knowledge.js";

const ANTHROPIC_MODEL = "claude-sonnet-4-5"; // alias estable apuntando a 4.6
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 8;

const SYSTEM_PROMPT_HEADER = `Eres "Chief of Staff", el jefe de gabinete bilingüe de PymeWebPro / Norte Sur Consulting S.A.S. Trabajas dentro del CRM interno de la empresa, asistiendo a Mike (el fundador canadiense) y a Santiago Santos (el socio paisa).

# Cómo respondes

- Por defecto respondes en español neutro, conciso, sin rodeos. Si el usuario te escribe en inglés, respondes en inglés.
- Voz: profesional, directa, cálida pero sin floritura. Sin marketing-speak.
- NUNCA uses el carácter em dash (raya larga). Usa comas, puntos, dos puntos, paréntesis, o " · " como separador. Esta regla es absoluta.
- No uses muletillas tipo "claro", "por supuesto", "excelente pregunta". Ve directo al punto.
- Para números reales (precios, cantidades de leads) cita números exactos, no aproximaciones.
- Si necesitas datos del CRM, llama las herramientas. No inventes leads, deals ni clientes.
- Si la pregunta es ambigua, haz UNA pregunta corta de aclaración antes de actuar.
- Si vas a ejecutar una acción que modifica datos (crear actividad, cambiar etapa, etc.) describe brevemente qué hiciste después.

# Qué eres y qué sabes

Tienes el contexto completo de PymeWebPro (la empresa, la arquitectura, los precios, los clientes, las herramientas). Está incluido al final de este prompt. Cuando alguien pregunte algo sobre la empresa, usa esa base; cuando pregunte sobre datos vivos (leads de hoy, deals abiertos, actividades pendientes) llama las herramientas del CRM.

Si te preguntan algo que no está en tu base de conocimiento ni en el CRM, dilo claramente: "No lo tengo en mis notas, conviene preguntarle a Mike." No inventes.

# Reglas de seguridad

- Nunca borres registros sin confirmación explícita del usuario.
- Nunca ejecutes pagos, transferencias ni órdenes financieras. Si te piden algo así, indica que esa acción la debe hacer Mike o Santi directamente.
- No compartas secretos, tokens, API keys ni credenciales. Si te preguntan dónde están, indica el nombre del secret y el dashboard donde se administra, sin revelar el valor.

# Documentos adicionales (carga bajo demanda)

Tienes acceso a memorandos profundos a través de la tool read_doc(name). Úsala solo cuando la pregunta lo amerite. Documentos disponibles:
- "studio" · estrategia, economía, decisiones del studio (precios completos, fundamentos del 30/70, hosting)
- "brand" · sistema completo de marca, tipografía, colores, voz
- "pipeline" · proceso manual mockup paso a paso

# Base de conocimiento de PymeWebPro (CORE)

`;

// Tool schemas exposed to the model. Mantén los nombres en snake_case en inglés
// para compatibilidad con la API; las descripciones van en español.
const TOOLS = [
  {
    name: "read_crm_grid",
    description: "Devuelve un snapshot completo del CRM: leads, clients, deals, activities. Útil para preguntas generales tipo '¿cuántos leads tengo?', '¿qué deals están abiertos?'. Limita a ~500 filas por tabla.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_rows",
    description: "Lista filas de una tabla del CRM con búsqueda opcional. Usa esto cuando necesites un subconjunto específico (ej: leads que contienen 'restaurante').",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", enum: ["leads", "clients", "deals", "activities"] },
        search: { type: "string", description: "Texto a buscar en columnas relevantes (nombre, email, business_name, etc.). Opcional." },
      },
      required: ["table"],
      additionalProperties: false,
    },
  },
  {
    name: "get_row",
    description: "Devuelve una fila específica del CRM por id.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", enum: ["leads", "clients", "deals", "activities"] },
        id: { type: "string" },
      },
      required: ["table", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_activity",
    description: "Crea una actividad en el CRM (call, email, whatsapp, meeting, note, task). Úsalo para registrar contactos o tareas pendientes que Santi te dicte.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["call", "email", "whatsapp", "meeting", "note", "task"] },
        subject: { type: "string" },
        body: { type: "string" },
        lead_id: { type: "string", description: "Opcional. Id del lead asociado." },
        client_id: { type: "string", description: "Opcional. Id del cliente asociado." },
        deal_id: { type: "string", description: "Opcional. Id del deal asociado." },
        owner: { type: "string", description: "mike o santi" },
        outcome: { type: "string" },
        due_at: { type: "number", description: "Timestamp en ms si es una tarea futura." },
        done: { type: "boolean" },
      },
      required: ["kind", "subject"],
      additionalProperties: false,
    },
  },
  {
    name: "update_row",
    description: "Actualiza columnas permitidas de una fila existente en leads, clients, deals o activities. Úsalo para cambiar etapa, próxima acción, score, etc. Solo columnas permitidas por el módulo CRM.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", enum: ["leads", "clients", "deals", "activities"] },
        id: { type: "string" },
        changes: {
          type: "object",
          description: "Mapa columna → valor. Ejemplos: { lead_stage: 'qualified', next_action: 'enviar mockup', next_action_due: 1747000000000 }",
          additionalProperties: true,
        },
      },
      required: ["table", "id", "changes"],
      additionalProperties: false,
    },
  },
  {
    name: "sql_query",
    description: "Ejecuta una consulta SELECT de solo lectura contra la base D1. Úsalo para reportes que las otras herramientas no cubren (counts, group by, joins). Solo SELECT. Cualquier otra cosa será rechazada.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "SELECT statement, máx 2000 caracteres" },
        binds: { type: "array", items: { type: "string" }, description: "Parámetros ? si los usas" },
      },
      required: ["sql"],
      additionalProperties: false,
    },
  },
  {
    name: "list_mockups",
    description: "Devuelve la lista de slugs registrados en MANUAL_MOCKUPS (todos los mockups manuales activos en mockups.pymewebpro.com/<slug>/).",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "read_doc",
    description: "Carga un documento de memoria de PymeWebPro bajo demanda. Úsalo cuando la pregunta exceda lo que está en el CORE del prompt. Documentos: 'studio' (estrategia y economía), 'brand' (sistema de marca completo), 'pipeline' (proceso de mockups paso a paso).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", enum: ["studio", "brand", "pipeline"] },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
];

// ---- Endpoint -------------------------------------------------------------

export async function handleChiefOfStaff(request, env, helpers) {
  const { json, isAdmin, uuid } = helpers;
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/api/admin/chief-of-staff/chat") {
    return json({ error: "Not found" }, 404);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return json({
      error: "Missing ANTHROPIC_API_KEY",
      detail: "Configura el secret con: wrangler secret put ANTHROPIC_API_KEY",
    }, 500);
  }

  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const userMessages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!userMessages.length) return json({ error: "messages required" }, 400);

  // Defensive: ensure each message is { role: 'user'|'assistant', content: ... }.
  const messages = userMessages.map(normalizeMessage).filter(Boolean);
  if (!messages.length) return json({ error: "no valid messages" }, 400);

  const systemPrompt = SYSTEM_PROMPT_HEADER + CHIEF_KNOWLEDGE_BASE;

  // Tool-use loop. Each iteration: call Anthropic, if stop_reason is tool_use,
  // execute the tools server-side and feed results back. Cap at MAX_TOOL_ITERATIONS.
  const trace = []; // for the client to optionally render tool activity
  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await callAnthropic(env, systemPrompt, messages, TOOLS);
    if (!res.ok) return json({ error: "Anthropic call failed", detail: res.error }, 502);

    const { content, stop_reason } = res.data;
    messages.push({ role: "assistant", content });

    if (stop_reason !== "tool_use") {
      // Final answer reached.
      for (const block of content) {
        if (block.type === "text") finalText += block.text;
      }
      break;
    }

    // Execute tool calls.
    const toolResults = [];
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const exec = await runTool(env, block.name, block.input, helpers);
      trace.push({ name: block.name, input: block.input, ok: exec.ok });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: typeof exec.result === "string" ? exec.result : JSON.stringify(exec.result),
        is_error: !exec.ok,
      });
    }
    messages.push({ role: "user", content: toolResults });

    if (i === MAX_TOOL_ITERATIONS - 1) {
      // Force a final answer turn without tools.
      const final = await callAnthropic(env, systemPrompt, messages, []);
      if (!final.ok) return json({ error: "Anthropic call failed", detail: final.error }, 502);
      for (const block of final.data.content) {
        if (block.type === "text") finalText += block.text;
      }
      messages.push({ role: "assistant", content: final.data.content });
    }
  }

  return json({
    ok: true,
    reply: finalText.trim(),
    messages, // full history so client can preserve it
    trace,
  });
}

// ---- Helpers --------------------------------------------------------------

function normalizeMessage(msg) {
  if (!msg || typeof msg !== "object") return null;
  if (msg.role !== "user" && msg.role !== "assistant") return null;
  if (typeof msg.content === "string") return { role: msg.role, content: msg.content };
  if (Array.isArray(msg.content)) return { role: msg.role, content: msg.content };
  return null;
}

async function callAnthropic(env, system, messages, tools) {
  // Prompt caching: el system prompt y los tools son estables entre turnos.
  // Marcar ambos como cache_control: ephemeral reduce drásticamente los input
  // tokens facturados después del primer turno (TTL ~5 min). Esto baja la
  // presión sobre el rate limit ITPM (30k tokens/min en este org).
  const systemBlocks = [{
    type: "text",
    text: system,
    cache_control: { type: "ephemeral" },
  }];

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    messages,
  };
  if (tools && tools.length) {
    // Clonar y marcar la última herramienta con cache_control para que el
    // bloque completo de tool definitions también se cachee.
    const toolsCopy = tools.map((t, i) => i === tools.length - 1
      ? { ...t, cache_control: { type: "ephemeral" } }
      : t
    );
    body.tools = toolsCopy;
  }

  try {
    const r = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      return { ok: false, error: `${r.status} ${text}` };
    }
    const data = await r.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

// ---- Tool runners ---------------------------------------------------------

const TABLES = ["leads", "clients", "deals", "activities"];

const EDITABLE_COLUMNS = {
  leads: [
    "source", "name", "email", "phone", "business_name", "message", "language",
    "status", "plan", "hosting", "notes",
    "lead_stage", "last_touched_at", "last_touched_kind", "touches_count",
    "next_action", "next_action_due",
    "heat", "score", "category", "city", "instagram", "whatsapp",
    "current_site", "cms", "motion", "address", "suggested_pitch",
    "followers", "on_today_list",
  ],
  clients: [
    "email", "business_name", "status", "language", "plan", "site_url",
  ],
  deals: [
    "title", "lead_id", "client_id", "stage", "plan",
    "value_cad_cents", "value_cop_cents", "probability", "expected_close",
    "owner", "source", "next_action", "next_action_due", "notes", "closed_at",
  ],
  activities: [
    "kind", "subject", "body", "lead_id", "client_id", "deal_id",
    "owner", "outcome", "occurred_at", "due_at", "done",
  ],
};

async function runTool(env, name, input, helpers) {
  try {
    switch (name) {
      case "read_crm_grid": return { ok: true, result: await toolReadGrid(env) };
      case "list_rows":     return { ok: true, result: await toolListRows(env, input) };
      case "get_row":       return { ok: true, result: await toolGetRow(env, input) };
      case "create_activity": return { ok: true, result: await toolCreateActivity(env, input, helpers.uuid) };
      case "update_row":    return { ok: true, result: await toolUpdateRow(env, input) };
      case "sql_query":     return { ok: true, result: await toolSqlQuery(env, input) };
      case "list_mockups":  return { ok: true, result: await toolListMockups() };
      case "read_doc":      return { ok: true, result: await toolReadDoc(input) };
      default: return { ok: false, result: { error: "Unknown tool: " + name } };
    }
  } catch (err) {
    return { ok: false, result: { error: String(err && err.message || err) } };
  }
}

async function toolReadGrid(env) {
  // Proyección angosta y top 40 por tabla. El modelo puede llamar list_rows
  // o get_row si necesita más detalle. Esto evita que un solo snapshot del
  // grid devuelva 50KB+ de filas y queme rate limit.
  const [leadCount, clientCount, dealCount, actCount, leads, clients, deals, activities] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM leads").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM clients").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM deals").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM activities").first(),
    env.DB.prepare(
      `SELECT id, name, email, business_name, language, status, plan,
              lead_stage, heat, score, city, next_action, next_action_due,
              on_today_list, updated_at, created_at
         FROM leads
         ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 40`
    ).all(),
    env.DB.prepare(
      `SELECT id, email, business_name, status, language, plan, site_url, updated_at
         FROM clients
         ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 40`
    ).all(),
    env.DB.prepare(
      `SELECT id, title, stage, plan, lead_id, client_id, value_cad_cents, value_cop_cents,
              probability, owner, next_action, next_action_due, updated_at
         FROM deals
         ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 40`
    ).all(),
    env.DB.prepare(
      `SELECT id, kind, subject, lead_id, client_id, deal_id, owner, outcome,
              occurred_at, due_at, done, created_at
         FROM activities
         ORDER BY COALESCE(occurred_at, created_at) DESC LIMIT 40`
    ).all(),
  ]);
  return {
    note: "Snapshot resumido. Llama list_rows/get_row/sql_query si necesitas más detalle o filas más viejas.",
    counts: {
      leads: leadCount && leadCount.n != null ? leadCount.n : 0,
      clients: clientCount && clientCount.n != null ? clientCount.n : 0,
      deals: dealCount && dealCount.n != null ? dealCount.n : 0,
      activities: actCount && actCount.n != null ? actCount.n : 0,
    },
    leads: leads.results || [],
    clients: clients.results || [],
    deals: deals.results || [],
    activities: activities.results || [],
  };
}

async function toolListRows(env, { table, search }) {
  if (!TABLES.includes(table)) throw new Error("Unknown table: " + table);
  const q = (search || "").trim();
  if (q) {
    const cols = searchColumns(table);
    if (cols.length) {
      const where = cols.map(c => `${c} LIKE ?`).join(" OR ");
      const like = "%" + q + "%";
      const rows = await env.DB.prepare(
        `SELECT * FROM ${table} WHERE ${where} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 200`
      ).bind(...cols.map(() => like)).all();
      return { rows: rows.results || [] };
    }
  }
  const rows = await env.DB.prepare(
    `SELECT * FROM ${table} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 200`
  ).all();
  return { rows: rows.results || [] };
}

function searchColumns(table) {
  if (table === "leads")     return ["name", "email", "business_name", "phone", "notes", "city", "category", "instagram"];
  if (table === "clients")   return ["business_name", "email", "site_url"];
  if (table === "deals")     return ["title", "notes", "stage", "next_action"];
  if (table === "activities") return ["subject", "body", "kind", "outcome"];
  return [];
}

async function toolGetRow(env, { table, id }) {
  if (!TABLES.includes(table)) throw new Error("Unknown table: " + table);
  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) return { error: "Not found", table, id };
  return row;
}

async function toolCreateActivity(env, input, uuidFn) {
  const allowed = EDITABLE_COLUMNS.activities;
  const cols = ["id"];
  const placeholders = ["?"];
  const id = uuidFn();
  const binds = [id];
  for (const k of allowed) {
    if (input[k] !== undefined) {
      cols.push(k);
      placeholders.push("?");
      binds.push(input[k]);
    }
  }
  cols.push("created_at");
  placeholders.push("?");
  binds.push(Date.now());
  const sql = `INSERT INTO activities (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`;
  await env.DB.prepare(sql).bind(...binds).run();
  const row = await env.DB.prepare("SELECT * FROM activities WHERE id = ?").bind(id).first();
  return { created: row };
}

async function toolUpdateRow(env, { table, id, changes }) {
  if (!TABLES.includes(table)) throw new Error("Unknown table: " + table);
  const allowed = EDITABLE_COLUMNS[table];
  const sets = [];
  const binds = [];
  for (const [k, v] of Object.entries(changes || {})) {
    if (!allowed.includes(k)) continue;
    sets.push(`${k} = ?`);
    binds.push(v);
  }
  if (!sets.length) return { error: "No editable columns in changes", allowed };
  sets.push("updated_at = ?");
  binds.push(Date.now());
  binds.push(id);
  const sql = `UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`;
  await env.DB.prepare(sql).bind(...binds).run();
  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  return { updated: row };
}

async function toolSqlQuery(env, { sql, binds }) {
  const s = String(sql || "").trim();
  if (!s) throw new Error("SQL vacío");
  if (s.length > 2000) throw new Error("SQL demasiado largo");
  // Only allow a single SELECT statement. Reject if any forbidden keyword appears.
  const upper = s.toUpperCase();
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    throw new Error("Solo se permiten SELECT/WITH");
  }
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "ATTACH", "PRAGMA", "REPLACE"];
  for (const w of forbidden) {
    const re = new RegExp("\\b" + w + "\\b", "i");
    if (re.test(s)) throw new Error("Palabra reservada no permitida: " + w);
  }
  if (s.includes(";")) {
    // Permitir solo un statement.
    const trimmed = s.replace(/;\s*$/, "");
    if (trimmed.includes(";")) throw new Error("Solo se permite un statement");
  }
  const stmt = env.DB.prepare(s);
  const result = Array.isArray(binds) && binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return { rows: result.results || [], rowCount: (result.results || []).length };
}

async function toolReadDoc({ name }) {
  const doc = CHIEF_EXTRA_DOCS[name];
  if (!doc) return { error: "Documento no disponible: " + name, available: Object.keys(CHIEF_EXTRA_DOCS) };
  return { name, content: doc };
}

async function toolListMockups() {
  // Lista estática, sincronizada manualmente con MANUAL_MOCKUPS en manual-mockups.js.
  return {
    note: "Slugs activos en mockups.pymewebpro.com/<slug>/. Para detalle por cliente revisa memory/projects/<slug>.md.",
    slugs: [
      "schedulator",
      "blues-kitchen",
      "daga-parfum",
      "blue-whale-international",
      "espacio-dental",
      "pymewebpro-ca",
      "pymewebpro-v1",
      "pymewebpro-v3",
      "pymewebpro-v3-es",
      "pymewebpro-v3-fr",
      "pymewebpro-v4",
      "pymewebpro-v4-es",
      "marena",
      "start",
      "inviersol",
      "medellinguide",
      "medellinguideboutique",
      "medellinguidecat",
    ],
  };
}
