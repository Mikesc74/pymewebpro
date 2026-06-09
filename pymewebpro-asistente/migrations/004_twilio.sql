-- asistente-db schema v4 · switch WhatsApp transport from Meta Cloud API to Twilio.
-- Twilio routes inbound by the business sender number (the Twilio "To"), not a
-- Meta phone_number_id. We store that sender per client as +E.164.
-- Safe to re-run except the ALTER (errors on duplicate column, which is fine).

ALTER TABLE clients ADD COLUMN wa_sender TEXT;  -- Twilio WhatsApp sender, +E.164 e.g. +573001112233

CREATE INDEX IF NOT EXISTS idx_clients_wa_sender ON clients(wa_sender);

-- Note: clients.wa_phone_number_id (from migration 003) is now unused under Twilio
-- but left in place so the schema stays additive.
