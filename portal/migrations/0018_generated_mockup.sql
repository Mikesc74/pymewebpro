-- Migration 0018: store AI-generated mockup HTML per client
ALTER TABLE clients ADD COLUMN generated_mockup TEXT;
ALTER TABLE clients ADD COLUMN mockup_generated_at INTEGER;
