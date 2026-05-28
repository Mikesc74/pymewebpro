-- 0014_mockup_data.sql · 2026-05-27
--
-- Mockup v2 (Mike: "the auto-generated mockup is generic, the hand-built one
-- pulls real data and looks much better").
--
-- Three new columns on leads to back the new mockup generator:
--
--   mockup_data           · JSON blob with the full scrape + AI copy + image
--                           URLs the dynamic /demo/:id template renders from.
--                           Shape (subject to refinement during build):
--                             {
--                               scrape: {gbp:[...], ig:{...}, site:{...}},
--                               copy:   {hero, services, featured, contact},
--                               images: {logo, hero[], gallery[]},
--                               diagnostics: {ig_ok, site_ok, photos_found}
--                             }
--   mockup_status         · 'pending' | 'generating' | 'ready' | 'needs_review' | 'error'
--                           Drives the kanban card colour + chip per x96.
--                           NULL = never generated, fall back to old static template.
--   mockup_generated_at   · Unix ms timestamp of last successful generation.
--                           Lets us show "generated 3d ago" and offer regenerate.
--
-- Idempotent · safe to re-run.
ALTER TABLE leads ADD COLUMN mockup_data TEXT;
ALTER TABLE leads ADD COLUMN mockup_status TEXT;
ALTER TABLE leads ADD COLUMN mockup_generated_at INTEGER;
