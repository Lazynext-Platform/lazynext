-- Autonomous Company OS transformation (Phases C, E)
-- All new columns are OPTIONAL (nullable) so existing data and queries are not broken.
-- D1 (SQLite-compatible) syntax. ALTER TABLE in SQLite only supports adding columns.

-- ── Phase C: Agent runtime upgrades ──
-- performanceStats stores aggregate reward/performance scores as JSON.
-- Nullable so existing AgentDef rows are not affected.
ALTER TABLE AgentDef ADD COLUMN performanceStats TEXT;

-- ── Phase E: Per-company public websites ──
-- published/publishedAt/publishSlug enable document publishing to public sites.
-- All nullable/defaulted so existing Document rows are not affected.
ALTER TABLE Document ADD COLUMN published BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE Document ADD COLUMN publishedAt DATETIME;
ALTER TABLE Document ADD COLUMN publishSlug TEXT;

-- Create an index for public page lookups (org slug + publish slug)
-- SQLite doesn't support CREATE INDEX IF NOT EXISTS in all versions,
-- so we use a defensive CREATE INDEX.
CREATE INDEX IF NOT EXISTS idx_document_published ON Document(published, publishSlug);
