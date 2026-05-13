-- One-shot phone normalization for the imported colombia_prospects_v2 batch.
-- Strips spaces, dashes, parens, dots, plus signs · then prepends +57 for the
-- common 10-digit Colombian mobile case. Idempotent: already-normalized rows
-- (i.e. starting with +57 followed by 10 digits) are left alone.
--
-- Apply once with:
--   wrangler d1 execute pymewebpro-portal --remote --file=migrations/0005_normalize_phones.sql

-- Backfill whatsapp from phone if whatsapp is empty.
UPDATE leads
   SET whatsapp = phone
 WHERE (whatsapp IS NULL OR whatsapp = '')
   AND phone IS NOT NULL AND phone != '';

-- Strip every common separator from both columns.
UPDATE leads SET phone =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,
    ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '+', ''), '/', '')
 WHERE phone IS NOT NULL;

UPDATE leads SET whatsapp =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp,
    ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '+', ''), '/', '')
 WHERE whatsapp IS NOT NULL;

-- 10 digits with no country code: prepend +57.
UPDATE leads SET phone = '+57' || phone
 WHERE phone IS NOT NULL AND LENGTH(phone) = 10
   AND phone GLOB '[0-9]*' AND substr(phone, 1, 1) = '3';
UPDATE leads SET whatsapp = '+57' || whatsapp
 WHERE whatsapp IS NOT NULL AND LENGTH(whatsapp) = 10
   AND whatsapp GLOB '[0-9]*' AND substr(whatsapp, 1, 1) = '3';

-- 12 digits starting with 57: add the plus.
UPDATE leads SET phone = '+' || phone
 WHERE phone IS NOT NULL AND LENGTH(phone) = 12
   AND substr(phone, 1, 2) = '57' AND substr(phone, 1, 1) != '+';
UPDATE leads SET whatsapp = '+' || whatsapp
 WHERE whatsapp IS NOT NULL AND LENGTH(whatsapp) = 12
   AND substr(whatsapp, 1, 2) = '57' AND substr(whatsapp, 1, 1) != '+';

-- Sanity: drop garbage (anything that didn't end up at 12 digits + plus).
-- Comment this out if you want to keep oddities for manual review.
-- UPDATE leads SET phone    = NULL WHERE phone    IS NOT NULL AND phone    NOT GLOB '+[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';
-- UPDATE leads SET whatsapp = NULL WHERE whatsapp IS NOT NULL AND whatsapp NOT GLOB '+[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';
