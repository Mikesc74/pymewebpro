-- 0013_pain_reason.sql · 2026-05-27
--
-- Adds a structured `pain_reason` column to leads so Mike + Santi can pick
-- WHY this prospect needs PymeWebPro (no website / old site / broken site /
-- mobile-broken / etc.) on each card. The AI drafter reads the column and
-- tailors the WhatsApp pitch to that specific pain.
--
-- Idempotent · safe to re-run.
ALTER TABLE leads ADD COLUMN pain_reason TEXT;
