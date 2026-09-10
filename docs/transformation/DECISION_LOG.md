# Lazynext — Decision Log

**Date:** 2026-09-04

All major architectural decisions during the transformation are recorded here to prevent contradictory future changes.

---

## D001 — Extend Organization → Company (not replace)

- **Date:** 2026-09-04
- **Decision:** Extend the existing `Organization` model into a `Company` model by adding fields (mission, vision, strategy, goals, KPIs, products, customers, etc.) rather than creating a separate Company model.
- **Reason:** Organization already has ownerId, plan, workspaces relation. Adding Company fields is additive and preserves existing data.
- **Alternatives:** (1) Create separate Company model with FK to Organization. (2) Rename Organization to Company.
- **Impact:** Organization model gains company-specific fields. Workspace continues to be the tenancy boundary.
- **Affected systems:** prisma/schema.prisma, src/lib/services/workspace.ts, src/app/workspaces/*
- **Migration requirement:** Additive migration (new nullable fields)
- **Rollback:** Drop added fields

## D002 — Deprecate Team model (migrate to Organization/Workspace)

- **Date:** 2026-09-04
- **Decision:** Deprecate Team, TeamMember, TeamInvitation, TeamActivity models. Migrate to Organization/Workspace/Membership/AuditEvent.
- **Reason:** Team duplicates the Organization/Workspace tenancy model. Having both creates confusion and duplicate code paths.
- **Alternatives:** (1) Keep both. (2) Replace Organization/Workspace with Team.
- **Impact:** Team-related routes/APIs will be deprecated then removed. Data migration needed.
- **Affected systems:** Team/TeamMember/TeamInvitation/TeamActivity models, /teams/* routes, /api/teams/* routes
- **Migration requirement:** Data migration from Team → Organization/Workspace, TeamMember → Membership
- **Rollback:** Keep Team tables until migration verified; only drop after confirmation

## D003 — Reposition Creative Studio under Growth module

- **Date:** 2026-09-04
- **Decision:** Keep all existing Creative Studio functionality intact. Reposition it as a sub-module of Growth → Marketing → Creative Studio. Do not delete or rewrite creative features.
- **Reason:** Creative Studio is the most mature part of the codebase (178+ routes, 229+ APIs). It's a major growth capability. Throwing it away would destroy significant value.
- **Alternatives:** (1) Delete creative features. (2) Keep as standalone product.
- **Impact:** Navigation reorganized; creative features connect to campaigns/brands/ads.
- **Affected systems:** Navigation (Shell, CategorizedAppGrid), route organization
- **Migration requirement:** Route redirects (old paths → new organized paths)
- **Rollback:** Restore original navigation

## D004 — Merge ad-creative-* and creative-ad-* route families

- **Date:** 2026-09-04
- **Decision:** Merge the 46 `ad-creative-*` and 35 `creative-ad-*` route families (same capability, two slug orders) into a single organized set under /creative/generators/[slug].
- **Reason:** 81 routes for the same capability is major duplication. Users can't find things. Maintenance burden.
- **Alternatives:** (1) Keep both. (2) Delete one set.
- **Impact:** Old routes get redirects to new paths. ~46 routes consolidated.
- **Affected systems:** src/app/ad-creative-*, src/app/creative-ad-*, navigation config
- **Migration requirement:** Route redirects; update nav config
- **Rollback:** Restore original routes

## D005 — Build autonomous loop on existing WorkflowEngine

- **Date:** 2026-09-04
- **Decision:** Extend the existing WorkflowEngine (src/lib/workflow/engine.ts) into a durable execution engine for the autonomous loop, rather than introducing a new framework (Temporal, etc.).
- **Reason:** WorkflowEngine already has durable state tracking (WorkflowRun/WorkflowStep). Cloudflare Workers doesn't support Temporal. Keep infrastructure simple (Rule 93).
- **Alternatives:** (1) Use Cloudflare Workflows. (2) Use Temporal. (3) Build from scratch.
- **Impact:** WorkflowEngine gains retry, backoff, dead-letter, idempotency, recovery.
- **Affected systems:** src/lib/workflow/engine.ts, WorkflowRun/WorkflowStep models
- **Migration requirement:** Additive schema changes
- **Rollback:** Revert engine changes

## D006 — Use existing Prisma + D1 for all new models (no new databases)

- **Date:** 2026-09-04
- **Decision:** All new models (Company, Goal, Kpi, Plan, ToolDef, etc.) are added to the existing Prisma schema with D1/SQLite. No new databases introduced.
- **Reason:** D1 is sufficient for the workload. Adding databases adds operational complexity (Rule 93). Keep one canonical data store.
- **Alternatives:** (1) Add PostgreSQL. (2) Add a vector DB. (3) Add Redis.
- **Impact:** Schema grows; migrations are additive.
- **Affected systems:** prisma/schema.prisma
- **Migration requirement:** Additive migrations
- **Rollback:** Drop new tables

## D007 — Preserve existing auth, billing, i18n, security work

- **Date:** 2026-09-04
- **Decision:** All existing auth (NextAuth + MFA + session revocation), billing (Dodo + credits), i18n (13 locales + RTL), and security hardening (SSRF, IDOR, CSP, rate limiting) work is preserved and extended, not replaced.
- **Reason:** Significant work has gone into these systems. They work. Replacing them adds risk without benefit.
- **Alternatives:** (1) Replace auth with custom system. (2) Replace billing with Stripe.
- **Impact:** New features build on existing foundations.
- **Affected systems:** auth.ts, src/lib/credits.ts, src/i18n/*, src/lib/security.ts, src/proxy.ts
- **Migration requirement:** None (additive only)
- **Rollback:** N/A
