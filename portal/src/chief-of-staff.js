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

const SYSTEM_PROMPT_HEADER = `Eres "Chief of Staff", el jefe de gabinete bilingüe que asiste a Mike Chartrand y a Santiago Santos en sus DOS empresas:

1. **Colombian City Guides** (umbrella · colguides.com) · red de medios y concierge para extranjeros en Colombia. Sitios: medellin.guide (~24 guías largas + 6 service landings), barranquilla.guide, thecartagena.guide. Catalina, la concierge AI, vive en medellin.guide y atiende vía chat web + WhatsApp (+57 310 325 0953). Modelo: alianzas con proveedores locales verificados, suscripción anual.

2. **PymeWebPro** (DBA de Norte Sur Consulting S.A.S., NIT 901.956.771-1) · estudio de diseño web colombiano para PYMEs colombianas. SOLO mercado colombiano, SOLO precios en COP. Esencial $390.000 COP, Pro $690.000 COP. Pagos vía Wompi.

Trabajas dentro del portal maestro en colguides.com/portal (Mike + Santi únicamente, gateado por Cloudflare Access). El widget vive en la esquina inferior derecha de cada página del portal.

# How you respond

- Language: pick the default from "Current user" below. Mike → English by default. Santi → Spanish by default. If the user writes in the other language, mirror them. Never mix.
- Voice: professional, direct, warm but no fluff. No marketing-speak.
- NEVER use the em dash character (long dash). Use commas, periods, colons, parentheses, or " · " as separators. This rule is absolute and applies in both languages.
- No filler phrases like "Of course!", "Great question!", "Absolutely!", "claro", "por supuesto". Get to the point.
- For real numbers (prices, lead counts, etc.) cite exact figures, never approximations.
- If you need PymeWebPro CRM data, call the tools. Don't invent leads, deals, or clients.
- If a question is ambiguous, ask ONE short clarifying question before acting.
- If you execute a data-modifying action (create activity, change stage, etc.), briefly describe what you did afterward.

# Reglas de marca por empresa (importantes)

**PymeWebPro · Colombia-only, COP-only.** Nunca cites precios en CAD o USD para PymeWebPro. Siempre en pesos colombianos con formato de miles ($390.000 COP, $20 millones COP). No posiciones el estudio como sirviendo NA / Canada / US. La nacionalidad canadiense de Mike es un dato personal, no una posición de mercado.

**ColGuides · bilingüe EN/ES, expat-facing.** Los sitios atienden extranjeros (mayormente angloparlantes) en Colombia. Las guías están en inglés. Catalina atiende EN y ES.

# Qué eres y qué sabes

Tienes contexto completo de PymeWebPro (la empresa, arquitectura, precios, clientes, herramientas) cargado al final de este prompt como CHIEF_KNOWLEDGE_BASE. Sobre ColGuides tienes un resumen estructurado más abajo en este prompt. Si te preguntan algo sobre datos vivos, llama las herramientas:

**PymeWebPro CRM (D1):** read_crm_grid, list_rows, get_row, create_activity, update_row, sql_query, list_mockups.

**Catalina (medellin.guide concierge, datos vivos):** cat_dashboard (resumen total), cat_list_conversations, cat_list_escalations, cat_list_leads, cat_search_members, cat_get_member (por id, code, o teléfono).

**Tráfico de la red (Cloudflare Analytics):** traffic_summary (visitas y uniques por sitio y día), traffic_top_pages (top URLs de un sitio), traffic_top_countries (origen geográfico). Sitios: medellin, barranquilla, cartagena, colguides, pymewebpro.

**Información externa:** search_web (Brave), fetch_url (lectura profunda de una URL), get_weather (Medellín), find_place (Google Places, sesgado a Medellín).

**Acciones externas (REQUIEREN CONFIRMACIÓN, ver abajo):** send_email (Resend), send_whatsapp (vía número de Catalina +57 310 325 0953), book_meeting (Google Calendar de Mike o Santi).

**Acciones de escritura sobre datos de Catalina (TAMBIÉN REQUIEREN CONFIRMACIÓN):**
- cat_update_member (modifica campos de un miembro)
- cat_add_member_note (agrega una nota al historial)
- cat_archive_member / cat_unarchive_member (soft delete reversible)
- cat_hard_delete_member (BORRADO PERMANENTE · doble confirmación obligatoria · campo confirm="DELETE PERMANENTLY")
- cat_close_conversation / cat_reopen_conversation
- cat_resolve_escalation (con nota opcional)
- cat_update_lead_status (new / contacted / converted / dismissed)
- cat_create_task (recordatorio TEMPORAL · Catalina pinga por WhatsApp en la fecha indicada)
- cat_complete_task (marca un recordatorio de Catalina como hecho)

**Memoria persistente (cos_notes, lectura libre):**
- note_save (guarda un hecho, decisión, preferencia, situación para futuras sesiones)
- note_search (busca notas pasadas por texto)
- note_list (lista las más recientes / pinned)
- note_update / note_delete (REQUIEREN confirmación)

Llama note_save proactivamente cuando Mike o Santi:
- Toman una decisión ("decidimos no usar Tailwind", "el precio Pro sube a $750k COP a partir de junio")
- Mencionan una preferencia ("prefiero llamadas los miércoles 3pm")
- Comparten contexto ongoing ("Santi OOO del 20-25 mayo", "Patrick pidió revisar el contrato en junio")
- Te corrigen ("en realidad la app se llama X no Y")
- Te dan instrucciones para sesiones futuras ("siempre confirma con WhatsApp antes de enviar email")

Las 20 notas más recientes (incluyendo todas las pinned) se cargan automáticamente al inicio del prompt como "Recent memory". Si necesitas algo más antiguo o específico, llama note_search. No llames note_save para cada turno: solo para información que valga la pena recordar después.

**Tablero kanban compartido (tasks.colguides.com · el tile "Tasks" del master portal):**
- task_add (agrega un task al tablero compartido · proyectos: colguides | pyme | other)
- task_list (lectura libre, sin confirmación)
- task_update (modifica status, title, summary, project, orden)
- task_delete (borrado permanente, una confirmación)

**Distinción importante:** cat_create_task es un recordatorio con fecha que Catalina envía por WhatsApp en el momento. task_add es una tarjeta visible en el tablero kanban que Mike o Santi marcan cuando completan. Si el usuario dice "agrega un task" o "ponme una tarea" sin más contexto, usa task_add (el tablero es la herramienta por defecto). Si dice "recuérdame el viernes" o "ping me at 3pm", usa cat_create_task. Si dudas, pregunta cuál.

Si te preguntan algo que no está en tu base ni en ninguna herramienta, dilo claramente: "No lo tengo en mis notas, conviene preguntarle a Mike." No inventes.

# Regla de confirmación para acciones externas

Las herramientas send_email, send_whatsapp y book_meeting son DESTRUCTIVAS / IRREVERSIBLES. Antes de llamarlas:

1. Responde una vez en texto plano describiendo EXACTAMENTE lo que vas a hacer:
   - Para send_email: destinatario, asunto, y cuerpo completo del correo.
   - Para send_whatsapp: número destino (E.164 con +) y texto exacto del mensaje.
   - Para book_meeting: host (Mike o Santi), fecha + hora (con zona horaria), duración, asunto, attendee si aplica.
2. Termina con una pregunta clara: "¿Confirmo y lo envío?" o "¿Lo agendo así?"
3. Espera a que el usuario diga "sí", "envíalo", "confirmo", "dale", "ok" u otra aprobación clara.
4. Solo entonces llama la herramienta.

Si el usuario dice "no" o pide cambios, ajusta y vuelve a confirmar. Nunca actúes sobre la base de "creo que quiere X". Confirma siempre.

Las herramientas de LECTURA NO requieren confirmación, llámalas libremente: search_web, fetch_url, get_weather, find_place, cat_dashboard, cat_list_conversations, cat_list_escalations, cat_list_leads, cat_search_members, cat_get_member, traffic_summary, traffic_top_pages, traffic_top_countries, read_crm_grid, list_rows, get_row, sql_query (sin DDL/DML), list_mockups, read_doc.

create_activity y update_row en el CRM de PymeWebPro están en un punto medio: describe qué vas a actualizar antes de llamarlas si la modificación es no-trivial (cambio de etapa de deal, edit a un cliente). Para crear una nota de actividad o un task de seguimiento, llama sin pedir confirmación.

**Caso especial: cat_hard_delete_member**

Esta herramienta borra al miembro de manera permanente e irreversible. NO existe undo. Antes de llamarla:
1. Describe el miembro a borrar (id, código, nombre, tipo, cuándo se creó).
2. Pregunta: "¿Confirmas que quiero proceder con un borrado permanente?"
3. Espera "sí".
4. Pide UNA SEGUNDA confirmación con un resumen aún más explícito: "Voy a borrar de manera permanente al miembro X (código M001, nombre Y) y todo su historial. Esta acción no se puede deshacer. ¿Confirmas?"
5. Espera "sí, borra permanentemente" u otra aprobación clara.
6. Llama la tool con confirm: "DELETE PERMANENTLY" (string exacto, requerido por el backend).

Para todo lo demás (archive, close conversation, update_member), una sola confirmación basta.

# Reglas de seguridad

- Nunca borres registros sin confirmación explícita del usuario.
- Nunca ejecutes pagos, transferencias ni órdenes financieras. Si te piden algo así, indica que esa acción la debe hacer Mike o Santi directamente.
- No compartas secretos, tokens, API keys ni credenciales. Si te preguntan dónde están, indica el nombre del secret y el dashboard donde se administra, sin revelar el valor.

# Documentos adicionales de PymeWebPro (carga bajo demanda)

Tienes acceso a memorandos profundos a través de la tool read_doc(name). Úsala solo cuando la pregunta lo amerite. Documentos disponibles:
- "studio" · estrategia, economía, decisiones del studio (precios completos, fundamentos del 30/70, hosting)
- "brand" · sistema completo de marca, tipografía, colores, voz
- "pipeline" · proceso manual mockup paso a paso

# Base de conocimiento de Colombian City Guides

**Personas.**
- **Mike Chartrand** · fundador canadiense, vive en Medellín. Email mike@mikec.pro / mike@colguides.com. Su madre Deirdre (83, canadiense, con dificultades de memoria, vive con Mike) es una usuaria canónica de Catalina.
- **Santiago Santos** · paisa, vive en Medellín, nacido en El Poblado. Socio profit-share en ambas empresas. WhatsApp personal +57 301 404 7722. Maneja conversaciones en español por defecto.

**Red de sitios.**
- **medellin.guide** · ~24 guías largas (visa, salud, vivienda, costo de vida, seguridad, transporte, banca, neighbourhoods, etc.) + 6 service landings (Medical Tourism, Weddings, Vacations, Relocation, Transport, Daily Life). Hosting Cloudflare Pages. Catalina vive aquí.
- **barranquilla.guide** · ~87 páginas estáticas exportadas de WordPress, mismo concepto enfocado a Barranquilla.
- **thecartagena.guide** · forkeado de barranquilla.guide, contenido Cartagena.
- **colguides.com** · landing del partnership pitch a proveedores locales + portal maestro en /portal.

**Catalina (la concierge AI).**
- Worker Cloudflare en catalina.medellin.guide, también sirve la bandeja bajo el portal maestro en colguides.com/portal/catalina.
- D1 db catalina-db (uuid af7ddf59-8846-45cd-81fa-18dac67469f4): conversations, members, leads, escalations, activities, pill_reminders, knowledge_cache.
- Modelo: Anthropic Claude Sonnet 4.6 con tool use.
- Canales: chat web (widget en medellin.guide) + WhatsApp Cloud API inbound (+57 310 325 0953, phone-number-id 1079236271945512, WABA id 1394747048456069). Cap actual: 250 mensajes outbound por mes hasta que se complete la verificación de empresa en Meta.
- Catalina SOLO opera en medellin.guide. NO está conectada a los otros sitios de la red.
- Herramientas que tiene Catalina (no confundir con las herramientas del Chief of Staff): search_guides, lookup_price, find_provider, book_call, escalate_to_human, search_knowledge_base, search_web, get_weather, search_place, fetch_page, mom-mode (location + ride-link para Deirdre), pill reminders.
- VA mode: cuando Mike o Santi escriben a Catalina desde sus números personales, ella actúa como su asistente (no como concierge para visitantes).
- Escalation: si Catalina no debe decidir sola, hace ping a Mike (EN) o Santi (ES) por WhatsApp. Códigos de miembros tipo M001, P578 (Deirdre).

**Modelo de negocio ColGuides.**
- Alianzas con proveedores locales verificados (doctores, abogados, dentistas, agentes de viajes, escuelas, etc.).
- Los proveedores pagan una suscripción anual para aparecer en la red de referidos.
- Visitantes de los sitios + usuarios de Catalina son enviados a proveedores aliados cuando piden recomendaciones.
- Pre-launch: aún no hay socios pagos reales. No inventes case studies ni member counts.

**Infraestructura compartida (ambas empresas).**
- Cloudflare account: NSC Account, id c98561adefb602704d4e7a6a1b7e7597, email mike@mikec.pro.
- D1 databases: catalina-db, pymewebpro-engine, pymewebpro-portal, facilitators_db, tasks-db.
- Cal.com: cal.com/medellinguide (link /intro es el booking link que comparte Catalina).
- Resend: emails transaccionales desde hello@medellin.guide y formularios de PymeWebPro.
- Anthropic: console.anthropic.com (cuenta Mike).
- OpenAI: solo Whisper para transcribir voice notes de WhatsApp en Catalina.

**Portal maestro (donde vives ahora).**
- colguides.com/portal · launcher con 4 tiles: Catalina · PymeWebPro · Tasks. Gateado por Cloudflare Access (mike@colguides.com + santiago@colguides.com).
- colguides.com/portal/catalina · la bandeja de Catalina (conversaciones, gente, pipeline, búsqueda).
- colguides.com/portal/pymewebpro/admin · el SPA admin de PymeWebPro (CRM, leads, clients, mockups, payments).
- colguides.com/portal/tasks · tareas compartidas Mike + Santi.

**Regla absoluta.** PymeWebPro y ColGuides son empresas distintas. Cuando alguien pregunta "¿cómo nos va este mes?" pide aclaración: "¿PymeWebPro o ColGuides?" antes de responder.

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

  // ─── Tier 1: external action tools ────────────────────────────────────────

  {
    name: "send_email",
    description: "Envía un correo transaccional vía Resend. ANTES de llamar esta tool: describe en una respuesta separada exactamente el destinatario, asunto y cuerpo, y pide confirmación explícita al usuario. Solo llama esta tool cuando el usuario diga 'sí, envíalo' u otra forma clara de aprobar.",
    input_schema: {
      type: "object",
      properties: {
        to:       { type: "string", description: "Destinatario (un solo email)" },
        subject:  { type: "string" },
        text:     { type: "string", description: "Cuerpo en texto plano" },
        html:     { type: "string", description: "Cuerpo en HTML (opcional). Si se omite, se usa text." },
        reply_to: { type: "string", description: "Reply-To (opcional, default mike@mikec.pro)" },
      },
      required: ["to", "subject", "text"],
      additionalProperties: false,
    },
  },
  {
    name: "search_web",
    description: "Búsqueda web vía Brave. Úsala para datos frescos, noticias, info que no esté en la base de conocimiento. Lectura, sin confirmación.",
    input_schema: {
      type: "object",
      properties: {
        query:     { type: "string" },
        count:     { type: "integer", description: "1-10, default 5" },
        freshness: { type: "string", enum: ["pd", "pw", "pm", "py"], description: "Filtro de frescura: pd (24h), pw (7d), pm (mes), py (año)" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "fetch_url",
    description: "Descarga y extrae el texto plano de una URL específica. Útil cuando search_web te da un link y quieres leerlo en profundidad. Lectura, sin confirmación.",
    input_schema: {
      type: "object",
      properties: {
        url:      { type: "string" },
        maxChars: { type: "integer", description: "200-8000, default 4000" },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "get_weather",
    description: "Clima actual + pronóstico 7 días para Medellín. Útil para consultas tipo 'cómo va el clima' o cuando un cliente pregunta antes de una visita.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "find_place",
    description: "Busca un negocio o lugar en Google Places (sesgado a Medellín, 50km). Devuelve dirección, teléfono, horario, rating. Útil para verificar info de proveedores antes de recomendarlos.",
    input_schema: {
      type: "object",
      properties: {
        query:      { type: "string", description: "Nombre del negocio o consulta (ej. 'dentista El Poblado')" },
        maxResults: { type: "integer", description: "1-5, default 3" },
        language:   { type: "string", enum: ["es", "en"], description: "default es" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "send_whatsapp",
    description: "Envía un mensaje de WhatsApp desde el número de Catalina (+57 310 325 0953) al destinatario. ANTES de llamar esta tool: describe el destinatario y texto exacto, y pide confirmación explícita. Solo llama cuando el usuario apruebe claramente.",
    input_schema: {
      type: "object",
      properties: {
        to:   { type: "string", description: "Número en formato E.164 con + (ej. +573014047722)" },
        text: { type: "string", description: "Cuerpo del mensaje, hasta 4000 caracteres" },
      },
      required: ["to", "text"],
      additionalProperties: false,
    },
  },
  {
    name: "book_meeting",
    description: "Crea una reunión en Google Calendar de Mike o Santi (con Google Meet adjunto por defecto) e invita opcionalmente a un attendee. Chequea conflictos antes de crear. ANTES de llamar esta tool: describe host, hora, attendee, asunto, y pide confirmación explícita. Solo llama cuando el usuario apruebe claramente.",
    input_schema: {
      type: "object",
      properties: {
        host:           { type: "string", enum: ["mike", "santi"] },
        start_iso:      { type: "string", description: "ISO-8601, ej. 2026-05-15T15:00:00Z" },
        end_iso:        { type: "string", description: "ISO-8601" },
        summary:        { type: "string", description: "Título del evento" },
        description:    { type: "string", description: "Notas internas (opcional)" },
        attendee_email: { type: "string", description: "Email a invitar (opcional)" },
        attendee_name:  { type: "string", description: "Nombre del invitado (opcional)" },
        add_meet:       { type: "boolean", description: "Adjuntar Google Meet, default true" },
      },
      required: ["host", "start_iso", "end_iso", "summary"],
      additionalProperties: false,
    },
  },
  {
    name: "list_my_events",
    description: "List calendar events for Mike or Santi between two ISO timestamps (default: from now to 7 days out). Returns title, start, end, location, attendees, Meet link. Read-only, no confirmation needed.",
    input_schema: {
      type: "object",
      properties: {
        host:        { type: "string", enum: ["mike", "santi"] },
        start_iso:   { type: "string", description: "ISO-8601, default = now" },
        end_iso:     { type: "string", description: "ISO-8601, default = now + 7d" },
        max_results: { type: "integer", description: "1-50, default 25" },
      },
      required: ["host"],
      additionalProperties: false,
    },
  },
  {
    name: "find_free_slot",
    description: "Find available time slots on Mike or Santi's calendar for a meeting of `duration_min` minutes within a search window. Respects work-day hours (default 09:00-18:00 Bogotá time, Mon-Fri). Returns up to 8 candidate slots. Use this when the user wants to schedule something and the time isn't fixed yet.",
    input_schema: {
      type: "object",
      properties: {
        host:         { type: "string", enum: ["mike", "santi"] },
        duration_min: { type: "integer", description: "Meeting length in minutes, 15-240, default 30" },
        earliest_iso: { type: "string", description: "Earliest acceptable start, default = now" },
        latest_iso:   { type: "string", description: "Latest acceptable start, default = now + 7d" },
        start_hour:   { type: "integer", description: "First acceptable local hour (0-23), default 9" },
        end_hour:     { type: "integer", description: "Last acceptable local hour, default 18" },
      },
      required: ["host"],
      additionalProperties: false,
    },
  },

  // ─── Phase 8: Gmail (inbox triage) ───────────────────────────────────────

  {
    name: "gmail_recent",
    description: "Fetch the most recent messages from Mike or Santi's Gmail inbox with decoded plain-text bodies. Default filter: in:inbox -in:spam -in:trash. Pass `q` to use any Gmail search syntax (e.g. 'is:unread', 'from:patrick', 'newer_than:2d', 'has:attachment'). Read-only, no confirmation.",
    input_schema: {
      type: "object",
      properties: {
        host:        { type: "string", enum: ["mike", "santi"] },
        q:           { type: "string", description: "Gmail search query (optional)" },
        max_results: { type: "integer", description: "1-25, default 10" },
      },
      required: ["host"],
      additionalProperties: false,
    },
  },
  {
    name: "gmail_get",
    description: "Get a single Gmail message by id with full body. Use when you have an id from gmail_recent or gmail_search and need the complete content.",
    input_schema: {
      type: "object",
      properties: {
        host: { type: "string", enum: ["mike", "santi"] },
        id:   { type: "string" },
      },
      required: ["host", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "gmail_search",
    description: "Search Gmail with the standard Gmail query syntax. Returns message ids only (call gmail_get for bodies). Examples of q: 'from:patrick.detzner@gmail.com', 'subject:invoice newer_than:30d', 'has:attachment label:starred'.",
    input_schema: {
      type: "object",
      properties: {
        host:        { type: "string", enum: ["mike", "santi"] },
        q:           { type: "string" },
        max_results: { type: "integer", description: "1-50, default 20" },
      },
      required: ["host", "q"],
      additionalProperties: false,
    },
  },
  {
    name: "gmail_modify_labels",
    description: "Add or remove labels on a Gmail message. Common uses: mark as read (remove UNREAD), star (add STARRED), archive (remove INBOX), apply a custom label. Use system label ids in caps (UNREAD, STARRED, INBOX, IMPORTANT, SPAM, TRASH) or call gmail_list_labels to discover custom label ids. REQUIRES confirmation for INBOX removal (archive) or TRASH add (delete).",
    input_schema: {
      type: "object",
      properties: {
        host:   { type: "string", enum: ["mike", "santi"] },
        id:     { type: "string", description: "Message id" },
        add:    { type: "array", items: { type: "string" }, description: "Label ids to add" },
        remove: { type: "array", items: { type: "string" }, description: "Label ids to remove" },
      },
      required: ["host", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "gmail_list_labels",
    description: "List Gmail labels (both system and custom) for the host's mailbox. Useful when you need to find a label id by name before calling gmail_modify_labels.",
    input_schema: {
      type: "object",
      properties: { host: { type: "string", enum: ["mike", "santi"] } },
      required: ["host"],
      additionalProperties: false,
    },
  },

  // ─── Phase 2: live Catalina data (read-only) ─────────────────────────────

  {
    name: "cat_dashboard",
    description: "Resumen rápido de Catalina: total miembros, leads, clients, vendors, escalaciones abiertas, conversaciones abiertas, leads nuevos (7d), costos estimados de API. Punto de partida para preguntas tipo '¿cómo va Catalina?'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "cat_list_conversations",
    description: "Lista conversaciones de Catalina (web chat + WhatsApp). Por defecto las más recientes; filtra por status si hace falta.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "closed", "pending"] },
        limit:  { type: "integer", description: "1-100, default 25" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cat_list_escalations",
    description: "Lista escalaciones de Catalina (cuando ella pide humano). Default: solo las abiertas.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "resolved"] },
        limit:  { type: "integer", description: "1-100, default 25" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cat_list_leads",
    description: "Lista leads capturados por Catalina (del homepage de medellin.guide + flujos de captura).",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "contacted", "converted", "dismissed"] },
        limit:  { type: "integer", description: "1-200, default 50" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cat_search_members",
    description: "Busca miembros / contactos de Catalina por texto libre (nombre, email, business_name, notas). Filtros opcionales por tipo (lead/client/vendor/partner).",
    input_schema: {
      type: "object",
      properties: {
        q:                 { type: "string", description: "Texto a buscar" },
        type:              { type: "string", enum: ["lead", "client", "vendor", "partner"] },
        limit:             { type: "integer", description: "1-100, default 25" },
        include_archived:  { type: "boolean", description: "default false" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cat_get_member",
    description: "Detalle de un miembro de Catalina por id, código (ej. M001, P578), o teléfono E.164. Incluye historial de conversaciones, leads, escalaciones.",
    input_schema: {
      type: "object",
      properties: {
        id:    { type: "string" },
        code:  { type: "string", description: "Código del miembro, ej. M001 o P578" },
        phone: { type: "string", description: "Teléfono E.164 con +, ej. +573014047722" },
      },
      additionalProperties: false,
    },
  },

  // ─── Phase 4: Catalina write/delete tools (REQUIEREN CONFIRMACIÓN) ───────

  {
    name: "cat_update_member",
    description: "MODIFICA un miembro de Catalina. Pasa solo los campos que quieras cambiar. Campos editables: name, email, phone, country, language, type (lead|client|vendor|partner), status, tier, source, source_detail, tags, owner, company_id, notes, arrival_status. REQUIERE confirmación (describe qué cambias antes de llamar).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, code: { type: "string" }, phone: { type: "string" },
        patch: {
          type: "object",
          description: "Objeto con los campos a actualizar. Ejemplo: { type: 'client', status: 'active', notes: '...' }",
          additionalProperties: true
        },
      },
      required: ["patch"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_add_member_note",
    description: "Agrega una nota al historial de un miembro de Catalina. REQUIERE confirmación (lee la nota en voz alta antes).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, code: { type: "string" }, phone: { type: "string" },
        body: { type: "string", description: "Texto de la nota" },
        author: { type: "string", description: "Default 'Chief of Staff'" },
      },
      required: ["body"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_archive_member",
    description: "Archiva un miembro (soft delete reversible). REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, code: { type: "string" }, phone: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "cat_unarchive_member",
    description: "Reactiva un miembro archivado. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, code: { type: "string" }, phone: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "cat_hard_delete_member",
    description: "BORRA permanentemente un miembro de la base de datos (sin retorno). REQUIERE DOBLE CONFIRMACIÓN: pídela una vez, espera 'sí', pide otra vez con un resumen del miembro a borrar, espera 'sí, borra permanentemente', recién entonces llama. El campo `confirm` DEBE valer exactamente 'DELETE PERMANENTLY'.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" }, code: { type: "string" }, phone: { type: "string" },
        confirm: { type: "string", description: "Debe valer exactamente 'DELETE PERMANENTLY'" },
      },
      required: ["confirm"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_close_conversation",
    description: "Cierra una conversación en Catalina. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "Conversation id" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_reopen_conversation",
    description: "Reabre una conversación cerrada. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_resolve_escalation",
    description: "Marca una escalación como resuelta y opcionalmente guarda una nota de resolución. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Escalation id" },
        resolution_note: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_update_lead_status",
    description: "Cambia el status de un lead de Catalina. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: {
        id:     { type: "string" },
        status: { type: "string", enum: ["new", "contacted", "converted", "dismissed"] },
      },
      required: ["id", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_create_task",
    description: "Crea un task / recordatorio en Catalina para Mike o Santi. Catalina les hace ping por WhatsApp cuando llega la fecha. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: {
        admin:     { type: "string", enum: ["mike", "santi"] },
        title:     { type: "string", description: "Hasta 300 caracteres" },
        due_at:    { type: "string", description: "ISO-8601, ej. 2026-05-15T15:00:00Z" },
        member_id: { type: "string", description: "Opcional, asociar a un miembro" },
      },
      required: ["admin", "title", "due_at"],
      additionalProperties: false,
    },
  },
  {
    name: "cat_complete_task",
    description: "Marca un task de Catalina como completado (recordatorio de Catalina, distinto del Tasks portal compartido). REQUIERE confirmación leve.",
    input_schema: {
      type: "object",
      properties: { task_id: { type: "string" } },
      required: ["task_id"],
      additionalProperties: false,
    },
  },

  // ─── Shared Tasks portal (kanban at tasks.colguides.com) ─────────────────
  // DISTINTO del task system de Catalina (cat_create_task = recordatorio con
  // ping de WhatsApp). Esto es el tablero kanban compartido Mike + Santi que
  // se ve al hacer clic en el tile "Tasks" del master portal. Tres proyectos:
  // colguides (la red), pyme (PymeWebPro), other.

  {
    name: "task_add",
    description: "Agrega un task al tablero kanban compartido en tasks.colguides.com. Tres proyectos: 'colguides', 'pyme', 'other'. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: {
        project: { type: "string", enum: ["colguides", "pyme", "other"] },
        title:   { type: "string", description: "Frase corta del task" },
        summary: { type: "string", description: "Detalle opcional (markdown OK)" },
      },
      required: ["project", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "task_list",
    description: "Lista tasks del tablero compartido (abiertos + completados de los últimos 30 días). Lectura, sin confirmación.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "task_update",
    description: "Modifica un task del tablero compartido por id numérico. Campos: status (active|done|archived), title, summary, project, order_index. Pasa solo los campos a cambiar. REQUIERE confirmación.",
    input_schema: {
      type: "object",
      properties: {
        id:          { type: "integer", description: "ID numérico del task" },
        status:      { type: "string", enum: ["active", "done", "archived"] },
        title:       { type: "string" },
        summary:     { type: "string" },
        project:     { type: "string", enum: ["colguides", "pyme", "other"] },
        order_index: { type: "number" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "task_delete",
    description: "Borra permanentemente un task del tablero compartido. REQUIERE confirmación (sin undo, pero no requiere doble confirmación como cat_hard_delete_member).",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
      additionalProperties: false,
    },
  },

  // ─── Phase 6: persistent memory store (cos_notes) ─────────────────────────
  // Cross-session memory. Recent notes are auto-injected into every system
  // prompt (no need to call note_list for them). Use note_save to record
  // anything Mike or Santi tells you to remember, decisions made, preferences,
  // ongoing situations. Use note_search when you need older / specific context.

  {
    name: "note_save",
    description: "Save a note to long-term memory. Call this any time Mike or Santi shares a fact, decision, preference, or ongoing situation worth remembering across sessions. Examples: 'we decided to drop the Tailwind dependency', 'Mike prefers Wednesday afternoons for sales calls', 'Santi is OOO May 20-25'. Pinned notes are always included in the system prompt; default unpinned notes show in the recent-memory window.",
    input_schema: {
      type: "object",
      properties: {
        body:      { type: "string", description: "The note itself, markdown OK" },
        tags:      { type: "string", description: "Comma-separated tags, e.g. 'pricing,decision'" },
        context:   { type: "string", enum: ["pymewebpro", "colguides", "personal"] },
        member_id: { type: "string", description: "Optional reference to a member/client id" },
        pinned:    { type: "boolean", description: "If true, always include in system prompt. Default false." },
      },
      required: ["body"],
      additionalProperties: false,
    },
  },
  {
    name: "note_search",
    description: "Search saved notes by free-text. Use when the user references prior context, prior decisions, prior conversations, or asks 'what did we say about X'. Returns matching notes ranked by recency.",
    input_schema: {
      type: "object",
      properties: {
        q:       { type: "string", description: "Free-text query (LIKE search across body + tags)" },
        context: { type: "string", enum: ["pymewebpro", "colguides", "personal"] },
        limit:   { type: "integer", description: "1-50, default 10" },
      },
      required: ["q"],
      additionalProperties: false,
    },
  },
  {
    name: "note_list",
    description: "List the most recent notes (optionally filtered by context). Returns up to `limit` notes ordered by created_at DESC.",
    input_schema: {
      type: "object",
      properties: {
        context: { type: "string", enum: ["pymewebpro", "colguides", "personal"] },
        limit:   { type: "integer", description: "1-50, default 20" },
        pinned_only: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "note_update",
    description: "Update an existing note. Pass only the fields you want changed. REQUIRES confirmation only if rewriting body content (describe the change before).",
    input_schema: {
      type: "object",
      properties: {
        id:      { type: "string" },
        body:    { type: "string" },
        tags:    { type: "string" },
        context: { type: "string", enum: ["pymewebpro", "colguides", "personal"] },
        pinned:  { type: "boolean" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "note_delete",
    description: "Delete a note from memory. REQUIRES confirmation.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },

  // ─── Phase 3: ColGuides + PymeWebPro traffic analytics ────────────────────

  {
    name: "traffic_summary",
    description: "Tráfico (visitas, pageviews, uniques) por día y por sitio en la red Cloudflare. Útil para preguntas tipo '¿qué sitio recibió más tráfico esta semana?' o 'tráfico de medellin.guide ayer'. Sitios: medellin, barranquilla, cartagena, colguides, pymewebpro (o 'all').",
    input_schema: {
      type: "object",
      properties: {
        site:       { type: "string", enum: ["all", "medellin", "barranquilla", "cartagena", "colguides", "pymewebpro"] },
        period:     { type: "string", enum: ["today", "yesterday", "7d", "30d", "90d"], description: "default 7d" },
        start_date: { type: "string", description: "YYYY-MM-DD (alternativa a period)" },
        end_date:   { type: "string", description: "YYYY-MM-DD" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "traffic_top_pages",
    description: "Top URLs de un sitio en un período. Para responder '¿qué páginas en medellin.guide reciben más tráfico este mes?'.",
    input_schema: {
      type: "object",
      properties: {
        site:       { type: "string", enum: ["medellin", "barranquilla", "cartagena", "colguides", "pymewebpro"] },
        period:     { type: "string", enum: ["today", "yesterday", "7d", "30d", "90d"] },
        start_date: { type: "string" },
        end_date:   { type: "string" },
        limit:      { type: "integer", description: "1-50, default 15" },
      },
      required: ["site"],
      additionalProperties: false,
    },
  },
  {
    name: "traffic_top_countries",
    description: "Top países de origen del tráfico de un sitio. Para responder '¿de dónde vienen los visitantes de medellin.guide?'.",
    input_schema: {
      type: "object",
      properties: {
        site:       { type: "string", enum: ["medellin", "barranquilla", "cartagena", "colguides", "pymewebpro"] },
        period:     { type: "string", enum: ["today", "yesterday", "7d", "30d", "90d"] },
        start_date: { type: "string" },
        end_date:   { type: "string" },
        limit:      { type: "integer", description: "1-50, default 15" },
      },
      required: ["site"],
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
  const messages = sanitizeMessageHistory(userMessages.map(normalizeMessage).filter(Boolean));
  if (!messages.length) return json({ error: "no valid messages" }, 400);

  // Identify who is speaking via Cloudflare Access. The PWP Admin Access app
  // injects Cf-Access-Authenticated-User-Email on every request. This lets the
  // agent pick the right default language (Mike → English, Santi → Spanish).
  const userEmail = (request.headers.get("Cf-Access-Authenticated-User-Email") || "").toLowerCase().trim();
  const userIdent =
    userEmail === "mike@colguides.com" || userEmail === "mike@mikec.pro"
      ? "Mike Chartrand (default language: English)"
    : userEmail === "santiago@colguides.com"
      ? "Santiago Santos (default language: Spanish)"
    : userEmail ? userEmail + " (default language: mirror the user)" : "unknown (default language: English)";

  const userContext =
    "\n\n# Current user\n\nYou are talking to: " + userIdent + ".\n" +
    "Use this as the default language. If they switch languages mid-conversation, mirror them.\n";

  // Pull the 20 most recent (or pinned) notes from the persistent memory
  // store and inject them as a "Recent memory" block in the system prompt.
  // Gives the agent cross-session continuity. If the table doesn't exist
  // yet (migration not applied), this returns [] and the block is empty.
  const recentNotes = await fetchRecentNotesForPrompt(env, 20);
  const memoryBlock = formatNotesBlock(recentNotes);

  const systemPrompt = SYSTEM_PROMPT_HEADER + userContext + memoryBlock + CHIEF_KNOWLEDGE_BASE;

  // Tool-use loop. Each iteration: call Anthropic, if stop_reason is tool_use,
  // execute the tools server-side and feed results back. Cap at MAX_TOOL_ITERATIONS.
  const trace = []; // for the client to optionally render tool activity
  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await callAnthropic(env, systemPrompt, messages, TOOLS);
    if (!res.ok) {
      if (res.error === "rate_limit") return json({ error: "rate_limit", detail: "Rate limit de Anthropic alcanzado. Espera un minuto y vuelve a intentarlo." }, 429);
      return json({ error: "Anthropic call failed", detail: res.error }, 502);
    }

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
      if (!final.ok) {
        if (final.error === "rate_limit") return json({ error: "rate_limit", detail: "Rate limit de Anthropic alcanzado. Espera un minuto y vuelve a intentarlo." }, 429);
        return json({ error: "Anthropic call failed", detail: final.error }, 502);
      }
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

/**
 * Repair a message history that may have been truncated mid-tool-call. The
 * Anthropic API requires every tool_result block (in a user message) to be
 * immediately preceded by an assistant message containing the matching
 * tool_use block. When the client trims old messages to keep the window
 * small, a tool_use/tool_result pair can get split, leaving an orphaned
 * tool_result at index 0 (or a dangling tool_use at the tail).
 *
 * Strategy:
 *   1. Walk forward and find the earliest user message that is NOT a
 *      tool_result-only message. Drop everything before it. This removes
 *      orphaned tool_result blocks at the head.
 *   2. If the last message is an assistant message with a tool_use that has
 *      no following tool_result, drop it. Otherwise Anthropic will reply
 *      with another tool_use loop that we can't satisfy.
 */
function sanitizeMessageHistory(messages) {
  if (!messages || !messages.length) return messages;
  let start = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") {
      const blocks = Array.isArray(m.content) ? m.content : null;
      const onlyToolResults = blocks && blocks.length > 0 && blocks.every(b => b && b.type === "tool_result");
      if (!onlyToolResults) { start = i; break; }
    } else {
      // Found an assistant message before any clean user turn. Keep looking,
      // but if the very first message is assistant, we still need to anchor
      // to a user turn before slicing. Anthropic accepts conversations that
      // start with a user message, so we'll skip leading assistant turns too.
      continue;
    }
    if (i === messages.length - 1) start = messages.length; // everything is bad
  }
  let cleaned = messages.slice(start);
  // Drop dangling assistant tool_use at the tail (no matching tool_result follows).
  while (cleaned.length) {
    const last = cleaned[cleaned.length - 1];
    if (last.role === "assistant" && Array.isArray(last.content) && last.content.some(b => b && b.type === "tool_use")) {
      cleaned.pop();
    } else {
      break;
    }
  }
  // The first message must be a user message. If we somehow stripped down
  // to a leading assistant turn, drop it.
  while (cleaned.length && cleaned[0].role === "assistant") cleaned.shift();
  return cleaned;
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
      if (r.status === 429) return { ok: false, error: "rate_limit", status: 429 };
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
      // ── CRM tools (built-in) ───────────────────────────────────────────
      case "read_crm_grid":   return { ok: true, result: await toolReadGrid(env) };
      case "list_rows":       return { ok: true, result: await toolListRows(env, input) };
      case "get_row":         return { ok: true, result: await toolGetRow(env, input) };
      case "create_activity": return { ok: true, result: await toolCreateActivity(env, input, helpers.uuid) };
      case "update_row":      return { ok: true, result: await toolUpdateRow(env, input) };
      case "sql_query":       return { ok: true, result: await toolSqlQuery(env, input) };
      case "list_mockups":    return { ok: true, result: await toolListMockups() };
      case "read_doc":        return { ok: true, result: await toolReadDoc(input) };

      // ── Tier 1: external actions ───────────────────────────────────────
      case "send_email":      return { ok: true, result: await toolSendEmail(env, input) };
      case "search_web":      return await callAgentEndpoint(env, "web_search", input);
      case "fetch_url":       return await callAgentEndpoint(env, "fetch_url", input);
      case "get_weather":     return await callAgentEndpoint(env, "get_weather", {});
      case "find_place":      return await callAgentEndpoint(env, "find_place", input);
      case "send_whatsapp":   return await callAgentEndpoint(env, "send_whatsapp_text", input);
      case "book_meeting":    return await callAgentEndpoint(env, "book_meeting", input);
      case "list_my_events":  return await callAgentEndpoint(env, "list_my_events", input);
      case "find_free_slot":  return await callAgentEndpoint(env, "find_free_slot", input);

      // ── Gmail (inbox triage) ───────────────────────────────────────────
      case "gmail_recent":         return await callAgentEndpoint(env, "gmail_recent", input);
      case "gmail_get":            return await callAgentEndpoint(env, "gmail_get", input);
      case "gmail_search":         return await callAgentEndpoint(env, "gmail_search", input);
      case "gmail_list_labels":    return await callAgentEndpoint(env, "gmail_list_labels", input);
      case "gmail_modify_labels":  return await callAgentEndpoint(env, "gmail_modify_labels", input);

      // ── Phase 2: live Catalina data ────────────────────────────────────
      case "cat_dashboard":          return await callAgentEndpoint(env, "cat_dashboard", {});
      case "cat_list_conversations": return await callAgentEndpoint(env, "cat_list_conversations", input);
      case "cat_list_escalations":   return await callAgentEndpoint(env, "cat_list_escalations", input);
      case "cat_list_leads":         return await callAgentEndpoint(env, "cat_list_leads", input);
      case "cat_search_members":     return await callAgentEndpoint(env, "cat_search_members", input);
      case "cat_get_member":         return await callAgentEndpoint(env, "cat_get_member", input);

      // ── Phase 4: Catalina writes / deletes (confirmation enforced by system prompt) ──
      case "cat_update_member":       return await callAgentEndpoint(env, "cat_update_member", input);
      case "cat_add_member_note":     return await callAgentEndpoint(env, "cat_add_member_note", input);
      case "cat_archive_member":      return await callAgentEndpoint(env, "cat_archive_member", input);
      case "cat_unarchive_member":    return await callAgentEndpoint(env, "cat_unarchive_member", input);
      case "cat_hard_delete_member":  return await callAgentEndpoint(env, "cat_hard_delete_member", input);
      case "cat_close_conversation":  return await callAgentEndpoint(env, "cat_close_conversation", input);
      case "cat_reopen_conversation": return await callAgentEndpoint(env, "cat_reopen_conversation", input);
      case "cat_resolve_escalation":  return await callAgentEndpoint(env, "cat_resolve_escalation", input);
      case "cat_update_lead_status":  return await callAgentEndpoint(env, "cat_update_lead_status", input);
      case "cat_create_task":         return await callAgentEndpoint(env, "cat_create_task", input);
      case "cat_complete_task":       return await callAgentEndpoint(env, "cat_complete_task", input);

      // ── Shared Tasks portal (tasks.colguides.com) ──────────────────────
      case "task_add":     return { ok: true, result: await taskBoardCall(env, "POST",   "/api/tasks", { project: input.project, title: input.title, summary: input.summary || "" }) };
      case "task_list":    return { ok: true, result: await taskBoardCall(env, "GET",    "/api/tasks", null) };
      case "task_update":  return { ok: true, result: await taskBoardCall(env, "PATCH",  "/api/tasks/" + encodeURIComponent(input.id), pickTaskFields(input)) };
      case "task_delete":  return { ok: true, result: await taskBoardCall(env, "DELETE", "/api/tasks/" + encodeURIComponent(input.id), null) };

      // ── Persistent memory (cos_notes) ──────────────────────────────────
      case "note_save":    return { ok: true, result: await toolNoteSave(env, input, helpers.uuid) };
      case "note_search":  return { ok: true, result: await toolNoteSearch(env, input) };
      case "note_list":    return { ok: true, result: await toolNoteList(env, input) };
      case "note_update":  return { ok: true, result: await toolNoteUpdate(env, input) };
      case "note_delete":  return { ok: true, result: await toolNoteDelete(env, input) };

      // ── Phase 3: traffic analytics ─────────────────────────────────────
      case "traffic_summary":        return await callAgentEndpoint(env, "cg_traffic_summary", input);
      case "traffic_top_pages":      return await callAgentEndpoint(env, "cg_top_pages", input);
      case "traffic_top_countries":  return await callAgentEndpoint(env, "cg_top_countries", input);

      default: return { ok: false, result: { error: "Unknown tool: " + name } };
    }
  } catch (err) {
    return { ok: false, result: { error: String(err && err.message || err) } };
  }
}

// ─── Persistent memory (cos_notes) ─────────────────────────────────────────

async function fetchRecentNotesForPrompt(env, limit = 20) {
  if (!env.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, body, tags, author, context, pinned, created_at " +
      "FROM cos_notes " +
      "ORDER BY pinned DESC, created_at DESC " +
      "LIMIT ?"
    ).bind(limit).all();
    return results || [];
  } catch (e) {
    // Table doesn't exist yet (migration not applied). Fail soft.
    console.error("[cos_notes] fetchRecent failed:", e && e.message);
    return [];
  }
}

function formatNotesBlock(notes) {
  if (!notes.length) return "";
  const lines = notes.map(n => {
    const d = new Date(n.created_at).toISOString().slice(0, 10);
    const ctx = n.context ? "[" + n.context + "]" : "";
    const tags = n.tags ? " (" + n.tags + ")" : "";
    const pin = n.pinned ? " 📌" : "";
    return "- " + d + " " + ctx + pin + " " + n.body + tags;
  });
  return "\n\n# Recent memory (auto-loaded, " + notes.length + " most recent notes)\n\n" +
         lines.join("\n") +
         "\n\nIf you need older or more specific context, call note_search. To save something new, call note_save.\n";
}

async function toolNoteSave(env, input, uuid) {
  const body = String(input.body || "").trim();
  if (!body) throw new Error("`body` is required");
  const id = (uuid && uuid()) || ("note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
  const now = Date.now();
  const tags    = input.tags ? String(input.tags).slice(0, 500) : null;
  const context = input.context || null;
  const member  = input.member_id ? String(input.member_id) : null;
  const pinned  = input.pinned ? 1 : 0;
  const author  = "cos";
  await env.DB.prepare(
    "INSERT INTO cos_notes (id, body, tags, author, context, member_id, pinned, created_at, updated_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, body, tags, author, context, member, pinned, now, now).run();
  return { id, saved: true, body, tags, context, pinned: !!pinned };
}

async function toolNoteSearch(env, input) {
  const q = String(input.q || "").trim();
  if (!q) throw new Error("`q` is required");
  const limit = Math.max(1, Math.min(50, Number(input.limit || 10)));
  const like = "%" + q.replace(/[%_]/g, "") + "%";
  const params = [like, like];
  let sql = "SELECT id, body, tags, author, context, pinned, created_at " +
            "FROM cos_notes WHERE (body LIKE ? OR tags LIKE ?)";
  if (input.context) { sql += " AND context = ?"; params.push(input.context); }
  sql += " ORDER BY pinned DESC, created_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return { count: (results || []).length, rows: results || [] };
}

async function toolNoteList(env, input) {
  const limit = Math.max(1, Math.min(50, Number(input.limit || 20)));
  const params = [];
  let sql = "SELECT id, body, tags, author, context, pinned, created_at FROM cos_notes WHERE 1=1";
  if (input.context) { sql += " AND context = ?"; params.push(input.context); }
  if (input.pinned_only) { sql += " AND pinned = 1"; }
  sql += " ORDER BY pinned DESC, created_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return { count: (results || []).length, rows: results || [] };
}

async function toolNoteUpdate(env, input) {
  const id = String(input.id || "").trim();
  if (!id) throw new Error("`id` is required");
  const sets = []; const vals = [];
  if (input.body    !== undefined) { sets.push("body = ?");    vals.push(String(input.body)); }
  if (input.tags    !== undefined) { sets.push("tags = ?");    vals.push(input.tags ? String(input.tags) : null); }
  if (input.context !== undefined) { sets.push("context = ?"); vals.push(input.context || null); }
  if (input.pinned  !== undefined) { sets.push("pinned = ?");  vals.push(input.pinned ? 1 : 0); }
  if (!sets.length) throw new Error("Nothing to update");
  sets.push("updated_at = ?"); vals.push(Date.now());
  vals.push(id);
  const r = await env.DB.prepare(
    "UPDATE cos_notes SET " + sets.join(", ") + " WHERE id = ?"
  ).bind(...vals).run();
  return { id, updated: true, rows_affected: r.meta && r.meta.changes };
}

async function toolNoteDelete(env, input) {
  const id = String(input.id || "").trim();
  if (!id) throw new Error("`id` is required");
  const r = await env.DB.prepare("DELETE FROM cos_notes WHERE id = ?").bind(id).run();
  return { id, deleted: true, rows_affected: r.meta && r.meta.changes };
}

// ─── Direct: send_email via Resend (PWP worker has RESEND_API_KEY already) ──

async function toolSendEmail(env, input) {
  const to       = String(input.to || "").trim();
  const subject  = String(input.subject || "").trim();
  const text     = String(input.text || "").trim();
  const html     = input.html ? String(input.html) : null;
  const reply_to = String(input.reply_to || env.COS_EMAIL_REPLY_TO || "mike@mikec.pro").trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error("`to` must be a single email address");
  if (!subject) throw new Error("`subject` is required");
  if (!text)    throw new Error("`text` is required");
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set on this worker");
  const body = {
    from: env.COS_EMAIL_FROM || "Chief of Staff <chief@medellin.guide>",
    to: [to],
    subject,
    text,
    reply_to,
  };
  if (html) body.html = html;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Resend " + r.status + ": " + JSON.stringify(data).slice(0, 300));
  return { sent: true, to, subject, resend_id: data.id, reply_to };
}

// ─── Shared Tasks portal proxy (tasks.colguides.com via Access service token) ──

function pickTaskFields(input) {
  const out = {};
  if (input.status      !== undefined) out.status      = input.status;
  if (input.title       !== undefined) out.title       = input.title;
  if (input.summary     !== undefined) out.summary     = input.summary;
  if (input.project     !== undefined) out.project     = input.project;
  if (input.order_index !== undefined) out.order_index = input.order_index;
  return out;
}

async function taskBoardCall(env, method, path, body) {
  const base   = env.TASKS_PORTAL_URL || "https://tasks.colguides.com";
  const cid    = env.TASKS_ACCESS_CLIENT_ID;
  const secret = env.TASKS_ACCESS_CLIENT_SECRET;
  if (!cid || !secret) {
    throw new Error("TASKS_ACCESS_CLIENT_ID and TASKS_ACCESS_CLIENT_SECRET must be configured on this worker. Mike: get the values from ~/code/tasks-portal/.claude-token.json and run `wrangler secret put TASKS_ACCESS_CLIENT_SECRET`.");
  }
  const headers = {
    "CF-Access-Client-Id":     cid,
    "CF-Access-Client-Secret": secret,
    "accept":                  "application/json"
  };
  if (body) headers["content-type"] = "application/json";
  const r = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const ct = r.headers.get("content-type") || "";
  let data;
  if (ct.includes("application/json")) {
    data = await r.json().catch(() => ({}));
  } else {
    data = { _raw: (await r.text()).slice(0, 500) };
  }
  if (!r.ok) {
    throw new Error("Tasks portal " + r.status + ": " + JSON.stringify(data).slice(0, 300));
  }
  return data;
}

// ─── Proxy: call Catalina's /api/agent dispatch endpoint with shared secret ──

async function callAgentEndpoint(env, action, params) {
  const url = env.CATALINA_AGENT_URL || "https://catalina.medellin.guide/api/agent";
  if (!env.COS_SHARED_SECRET) {
    return { ok: false, result: { error: "COS_SHARED_SECRET not configured on this worker. Run: wrangler secret put COS_SHARED_SECRET" } };
  }
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cos-secret": env.COS_SHARED_SECRET
    },
    body: JSON.stringify({ action, params: params || {} })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, result: { error: data.error || "Agent endpoint " + r.status, detail: data.detail || null } };
  }
  return { ok: true, result: data.result };
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
    note: "Slugs activos en mockups.pymewebpro.com/<slug>/. Para detalle por cliente revisa memory/projects/<slug>.md. Schedulator e Inviersol ya están en vivo en sus dominios (schedulator2.vercel.app, inviersol.com) y no están en mockups.",
    slugs: [
      "blues-kitchen",
      "daga-parfum",
      "blue-whale-international",
      "espacio-dental",
      "marena",
      "start",
      "medellin-guide",
      "medellin-guide-boutique",
    ],
  };
}
