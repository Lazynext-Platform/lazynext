-- Schema hardening migration (R3, R16, R17)
-- All new columns are OPTIONAL (nullable) so existing data and queries are not broken.
-- D1 (SQLite-compatible) syntax. ALTER TABLE in SQLite only supports adding columns.
--
-- R11 (deprecate Team model) and R18 (add Prisma relations for existing scalar IDs)
-- and R19 (normalize JSON storage: String -> Json) require NO SQL changes:
--   - R11 is comment-only.
--   - R18 reuses existing scalar columns (WorkflowStep.runId, ToolCall.agentRunId).
--   - R19 changes the Prisma type from String to Json, but SQLite stores both as TEXT,
--     so no column type migration is needed.

-- ── R3: Add workspace tenancy to Meta/Google safety models ──
ALTER TABLE MetaSafetyAudit ADD COLUMN workspaceId TEXT;
ALTER TABLE MetaSafetyAudit ADD COLUMN organizationId TEXT;

ALTER TABLE MetaSafetyApproval ADD COLUMN workspaceId TEXT;
ALTER TABLE MetaSafetyApproval ADD COLUMN organizationId TEXT;

ALTER TABLE GoogleSafetyAudit ADD COLUMN workspaceId TEXT;
ALTER TABLE GoogleSafetyAudit ADD COLUMN organizationId TEXT;

ALTER TABLE GoogleSafetyApproval ADD COLUMN workspaceId TEXT;
ALTER TABLE GoogleSafetyApproval ADD COLUMN organizationId TEXT;

-- ── R16: Add workspaceId to creative models ──
ALTER TABLE Creation ADD COLUMN workspaceId TEXT;
ALTER TABLE AdProduct ADD COLUMN workspaceId TEXT;
ALTER TABLE AdAvatar ADD COLUMN workspaceId TEXT;
ALTER TABLE BrandKit ADD COLUMN workspaceId TEXT;
ALTER TABLE BrandProfile ADD COLUMN workspaceId TEXT;
ALTER TABLE Asset ADD COLUMN workspaceId TEXT;
ALTER TABLE SharedLink ADD COLUMN workspaceId TEXT;
ALTER TABLE CreativeComment ADD COLUMN workspaceId TEXT;
ALTER TABLE WorkflowRun ADD COLUMN workspaceId TEXT;
ALTER TABLE AdCampaign ADD COLUMN workspaceId TEXT;
ALTER TABLE CreativePerformance ADD COLUMN workspaceId TEXT;
ALTER TABLE Timeline ADD COLUMN workspaceId TEXT;
ALTER TABLE EditingSkill ADD COLUMN workspaceId TEXT;
ALTER TABLE CreativeTemplate ADD COLUMN workspaceId TEXT;
ALTER TABLE ScheduledPost ADD COLUMN workspaceId TEXT;
ALTER TABLE Hook ADD COLUMN workspaceId TEXT;

-- ── R17: Add deletedAt for soft-delete to creative models ──
ALTER TABLE Creation ADD COLUMN deletedAt DATETIME;
ALTER TABLE AdProduct ADD COLUMN deletedAt DATETIME;
ALTER TABLE AdAvatar ADD COLUMN deletedAt DATETIME;
ALTER TABLE BrandKit ADD COLUMN deletedAt DATETIME;
ALTER TABLE BrandProfile ADD COLUMN deletedAt DATETIME;
ALTER TABLE Asset ADD COLUMN deletedAt DATETIME;
ALTER TABLE SharedLink ADD COLUMN deletedAt DATETIME;
ALTER TABLE CreativeComment ADD COLUMN deletedAt DATETIME;
ALTER TABLE WorkflowRun ADD COLUMN deletedAt DATETIME;
ALTER TABLE AdCampaign ADD COLUMN deletedAt DATETIME;
ALTER TABLE CreativePerformance ADD COLUMN deletedAt DATETIME;
ALTER TABLE Timeline ADD COLUMN deletedAt DATETIME;
ALTER TABLE EditingSkill ADD COLUMN deletedAt DATETIME;
ALTER TABLE CreativeTemplate ADD COLUMN deletedAt DATETIME;
ALTER TABLE ScheduledPost ADD COLUMN deletedAt DATETIME;
ALTER TABLE Hook ADD COLUMN deletedAt DATETIME;

-- ── Indexes for the new tenancy columns (optional but recommended) ──
CREATE INDEX IF NOT EXISTS MetaSafetyAudit_workspaceId_idx ON MetaSafetyAudit(workspaceId);
CREATE INDEX IF NOT EXISTS MetaSafetyAudit_organizationId_idx ON MetaSafetyAudit(organizationId);
CREATE INDEX IF NOT EXISTS MetaSafetyApproval_workspaceId_idx ON MetaSafetyApproval(workspaceId);
CREATE INDEX IF NOT EXISTS MetaSafetyApproval_organizationId_idx ON MetaSafetyApproval(organizationId);
CREATE INDEX IF NOT EXISTS GoogleSafetyAudit_workspaceId_idx ON GoogleSafetyAudit(workspaceId);
CREATE INDEX IF NOT EXISTS GoogleSafetyAudit_organizationId_idx ON GoogleSafetyAudit(organizationId);
CREATE INDEX IF NOT EXISTS GoogleSafetyApproval_workspaceId_idx ON GoogleSafetyApproval(workspaceId);
CREATE INDEX IF NOT EXISTS GoogleSafetyApproval_organizationId_idx ON GoogleSafetyApproval(organizationId);

CREATE INDEX IF NOT EXISTS Creation_workspaceId_idx ON Creation(workspaceId);
CREATE INDEX IF NOT EXISTS AdProduct_workspaceId_idx ON AdProduct(workspaceId);
CREATE INDEX IF NOT EXISTS AdAvatar_workspaceId_idx ON AdAvatar(workspaceId);
CREATE INDEX IF NOT EXISTS BrandKit_workspaceId_idx ON BrandKit(workspaceId);
CREATE INDEX IF NOT EXISTS BrandProfile_workspaceId_idx ON BrandProfile(workspaceId);
CREATE INDEX IF NOT EXISTS Asset_workspaceId_idx ON Asset(workspaceId);
CREATE INDEX IF NOT EXISTS SharedLink_workspaceId_idx ON SharedLink(workspaceId);
CREATE INDEX IF NOT EXISTS CreativeComment_workspaceId_idx ON CreativeComment(workspaceId);
CREATE INDEX IF NOT EXISTS WorkflowRun_workspaceId_idx ON WorkflowRun(workspaceId);
CREATE INDEX IF NOT EXISTS AdCampaign_workspaceId_idx ON AdCampaign(workspaceId);
CREATE INDEX IF NOT EXISTS CreativePerformance_workspaceId_idx ON CreativePerformance(workspaceId);
CREATE INDEX IF NOT EXISTS Timeline_workspaceId_idx ON Timeline(workspaceId);
CREATE INDEX IF NOT EXISTS EditingSkill_workspaceId_idx ON EditingSkill(workspaceId);
CREATE INDEX IF NOT EXISTS CreativeTemplate_workspaceId_idx ON CreativeTemplate(workspaceId);
CREATE INDEX IF NOT EXISTS ScheduledPost_workspaceId_idx ON ScheduledPost(workspaceId);
CREATE INDEX IF NOT EXISTS Hook_workspaceId_idx ON Hook(workspaceId);
