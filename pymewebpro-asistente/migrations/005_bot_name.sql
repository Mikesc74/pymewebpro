-- asistente-db schema v5 · per-client bot display name.
-- "Angela" is the product's default name; each client can rename the bot their
-- own visitors see. NULL falls back to "Angela" in the widget.
-- Safe to re-run except the ALTER (errors on duplicate column, which is fine).

ALTER TABLE clients ADD COLUMN bot_name TEXT;  -- end-customer-facing widget name, e.g. "Angela"
