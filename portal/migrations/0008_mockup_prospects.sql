-- Mockup prospects · sales-prospect mockups Mike builds bespoke in Cowork.
--
-- Workflow:
--   1. Mike fills in a brief in the studio admin (/admin/mockups/new): slug,
--      business name, social URLs, style brief, owner WhatsApp, cal link.
--   2. Row lands here in `mockup_prospects` with status='brief'.
--   3. In Cowork, Mike asks Claude to build the mockup for <slug>. Claude reads
--      this row, studies the socials, writes a bespoke
--      manual-mockups/<slug>/index.html, runs check-standards, deploys.
--      Status flips to 'live' and chatbot_system_prompt is populated.
--   4. The chat widget on the mockup hits /api/chat/<slug> on
--      mockups.pymewebpro.com, which loads brand_profile from this row.
--   5. Notes is the running feedback log Mike adds across iteration sessions.
--      Claude reads it at the start of every revision.
--
-- Apply:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0008_mockup_prospects.sql

CREATE TABLE IF NOT EXISTS mockup_prospects (
  id                       TEXT PRIMARY KEY,
  slug                     TEXT NOT NULL UNIQUE,        -- lowercase, a-z0-9-, used in URLs
  business_name            TEXT NOT NULL,
  instagram_url            TEXT,
  facebook_url             TEXT,
  tiktok_url               TEXT,
  website_url              TEXT,
  style_brief              TEXT,                        -- Mike's free-form direction
  owner_name               TEXT,                        -- owner first name (for the bot voice)
  owner_whatsapp           TEXT,                        -- digits only, no '+' (wa.me format)
  cal_link                 TEXT,                        -- e.g. cal.com/medellinguide/intro
  notes                    TEXT,                        -- running feedback log Mike updates
  chatbot_system_prompt    TEXT,                        -- populated by Claude when the mockup is built
  status                   TEXT NOT NULL DEFAULT 'brief', -- brief | building | live | archived
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mockup_prospects_status ON mockup_prospects(status);
CREATE INDEX IF NOT EXISTS idx_mockup_prospects_slug   ON mockup_prospects(slug);

-- Seed the existing espacio-dental mockup so the generic /api/chat/<slug>
-- endpoint can serve it once we cut espacio-dental-chat.js over.
-- chatbot_system_prompt is left NULL here · it will be set from a script
-- that copies the existing hardcoded SYSTEM_PROMPT during the cutover commit.
INSERT OR IGNORE INTO mockup_prospects (
  id, slug, business_name, owner_name, owner_whatsapp, status, created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'espacio-dental',
  'Espacio Dental',
  'Valentina',
  '573052278822',
  'live',
  unixepoch() * 1000,
  unixepoch() * 1000
);
