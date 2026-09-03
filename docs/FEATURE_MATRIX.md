# Lazynext — Feature Capability Matrix

**Date:** 2026-09-03
**Status:** Active
**Depends on:** `DISCOVERY-REPORT-PHASE0.md`, `ARCHITECTURE-PHASE1.md`

> This matrix documents every major module's current state and target treatment. Columns: **Existing** (present in repo today), **Broken** (has bugs/security issues), **Duplicate** (overlapping with another capability), **Keep** (retain as-is), **Merge** (consolidate into another), **Rebuild** (rewrite for OS), **New** (build from scratch), **Priority** (P0=critical, P1=high, P2=medium, P3=low), **Rationale**.

---

## Dashboard

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| App grid (193 apps) | Yes | No | Yes (ad-creative only) | No | Yes | Yes | No | P0 | Consolidate into OS dashboard with workspace activity, recent objects, pinned items |
| Categorized app grid (13 categories) | Yes | No | Yes | No | Yes | Yes | No | P1 | Categories must be reorganized around OS modules, not ad-creative groups |
| Feature search (Cmd+K) | Yes | No | No | Yes | No | No | No | P1 | Keep search pattern; reindex around OS objects |
| System status widget | No | — | — | — | — | — | Yes | P2 | New: workspace health, quota usage, pending approvals |

## Creative Studio

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Flagship pipelines (5: lazynext-studio, ad-reference, drama-studio, ad-skit, ugc-studio) | Yes | No | No | Yes | Yes | No | No | P0 | Consolidate under `/creative/pipelines/[slug]`; keep all 5 |
| `ad-creative-*` designers (46) | Yes | No | Yes (with creative-ad-*) | No | Yes | No | No | P0 | Merge with `creative-ad-*` (35) — same capability, two slug orders |
| `creative-ad-*` designers (35) | Yes | No | Yes (with ad-creative-*) | No | Yes | No | No | P0 | Merge into `ad-creative-*` under `/creative/generators/[slug]` |
| Copy/messaging generators (~14) | Yes | No | No | Yes | Yes | No | No | P1 | Consolidate under `/creative/generators` with search + categories |
| Audience/personas (~9) | Yes | No | No | Yes | Yes | No | No | P1 | Consolidate under Creative Studio → Audience |
| Brand tools (6: brand-voice, brand-guardrails, etc.) | Yes | No | Yes (brand-voice vs brand-voice-analyzer vs brand-voice-consistency-checker) | No | Yes | No | No | P1 | Merge brand-voice variants into single brand tool with sub-features |
| Strategy/brief/concept (~13) | Yes | No | No | Yes | Yes | No | No | P1 | Consolidate under Creative Studio → Strategy |
| Visual/media production (~12) | Yes | No | No | Yes | Yes | No | No | P1 | Consolidate under Creative Studio → Media |
| Performance/analytics (~16) | Yes | No | Yes (competitor-intel vs competitor-watch vs ad-competitive-intelligence) | No | Yes | No | No | P1 | Merge competitor variants; consolidate under Creative Studio → Performance |
| A/B testing (~7) | Yes | No | Yes (variant-matrix vs variant-matrix-generator) | No | Yes | No | No | P2 | Merge variant-matrix variants; consolidate under Creative Studio → Testing |
| Compliance/safety (3: meta-safety, google-safety, compliance) | Yes | Yes (no tenancy on safety models) | No | No | No | Yes | No | P1 | Rebuild with workspace tenancy; add userId to safety models |
| Creative asset library (/assets) | Yes | No | No | Yes | No | No | No | P1 | Keep; add workspace scoping |
| Video editor (/editor) | Yes | No | No | Yes | No | No | No | P2 | Keep as Creative Studio sub-feature |
| Ad campaigns (/ads) | Yes | No | No | Yes | No | No | No | P2 | Keep under Creative Studio → Campaigns |
| Creative comments | Yes | No | No | No | Yes | No | No | P1 | Generalize into Conversations module |
| Creative sharing (/share/[token]) | Yes | No | No | Yes | No | No | No | P2 | Keep; generalize for file/doc sharing |
| MCP server (creative-only, 2024-11-05) | Yes | Yes (outdated protocol) | No | No | No | Yes | No | P0 | Rebuild against 2026-07-28 spec; wrap all platform services |

## Projects

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Project list | No | — | — | — | — | — | Yes | P0 | New OS primitive; no project management exists today |
| Project detail (tasks, docs, files) | No | — | — | — | — | — | Yes | P0 | Core container for organizing work |
| Project status tracking | No | — | — | — | — | — | Yes | P1 | Active/archived/paused states |
| Project templates | No | — | — | — | — | — | Yes | P2 | Predefined project structures |

## Tasks

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Task CRUD | No | — | — | — | — | — | Yes | P0 | New productivity primitive |
| Kanban view | No | — | — | — | — | — | Yes | P1 | Visual task management |
| List view | No | — | — | — | — | — | Yes | P1 | Table-style task management |
| Timeline view | No | — | — | — | — | — | Yes | P2 | Gantt-style scheduling |
| Task assignment | No | — | — | — | — | — | Yes | P0 | Assign to workspace members |
| Task priorities + due dates | No | — | — | — | — | — | Yes | P1 | Standard task attributes |
| Cross-project task view | No | — | — | — | — | — | Yes | P2 | All tasks across projects |

## Documents

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Rich-text document editor | No | — | — | — | — | — | Yes | P0 | New information primitive |
| Document versioning | No | — | — | — | — | — | Yes | P1 | Track document changes over time |
| Knowledge base / wiki | No | — | — | — | — | — | Yes | P1 | Organized, searchable knowledge |
| Document search | No | — | — | — | — | — | Yes | P1 | Full-text search within documents |
| Document templates | No | — | — | — | — | — | Yes | P2 | Predefined document structures |

## Files

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| File upload (R2) | Yes | No | No | Yes | No | No | No | P0 | Keep R2 storage; add workspace scoping |
| File library | Yes | No | No | Yes | No | No | No | P0 | Keep; generalize from ad-creative assets |
| File sharing | Yes | No | No | Yes | No | No | No | P1 | Keep; generalize sharing links |
| File versioning | Yes (AssetVersion) | Yes (no unique constraint) | No | No | No | Yes | No | P1 | Fix versioning; add proper unique constraints |
| File metadata | Yes | No | No | Yes | No | No | No | P1 | Keep; extend with workspace scoping |

## Automations

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Workflow builder (/workflow-builder) | Yes | Yes (WorkflowStep has no FK to WorkflowRun) | No | No | No | Yes | No | P0 | Rebuild with proper relations; generalize beyond ad-creative |
| Automation rules (trigger → action) | No | — | — | — | — | — | Yes | P0 | New: event-triggered automations |
| Scheduled jobs | Yes (ScheduledPost, cron */5) | No | No | No | Yes | No | No | P1 | Generalize ScheduledPost into ScheduledJob |
| Pipeline orchestration | Yes | No | No | Yes | No | No | No | P1 | Keep pipeline stages; generalize |
| Approval workflows (/approvals) | Yes | Yes (orphaned stage bypass) | No | No | No | Yes | No | P1 | Rebuild with proper ownership scoping |

## AI Agents

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Agent definitions | No | — | — | — | — | — | Yes | P0 | New: define agents with model, tools, instructions, memory |
| Agent runs | No | — | — | — | — | — | Yes | P0 | New: execute agents with input/output tracking |
| Tool calling | Partial (creative tools only) | No | No | No | Yes | No | No | P0 | Generalize creative tools into platform-wide tools |
| Agent memory | No | — | — | — | — | — | Yes | P1 | Persistent context across runs |
| Agent evaluation | No | — | — | — | — | — | Yes | P2 | Quality scoring for agent outputs |
| Skill chains (/skill-chains) | Yes | No | No | Yes | Yes | No | No | P2 | Merge into AI Agents as agent composition |

## Integrations

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| OAuth connections (PlatformConnection) | Yes | Yes (tokens plain strings) | No | No | No | Yes | No | P0 | Rebuild with encrypted tokens; workspace-scoped |
| Integration catalog | No | — | — | — | — | — | Yes | P1 | New: browseable catalog of available integrations |
| API credentials management | No | — | — | — | — | — | Yes | P1 | New: manage API keys for external services |
| Webhook endpoints | Yes | No | No | Yes | No | No | No | P1 | Keep; add workspace scoping + HMAC signing |
| Webhook deliveries | No | — | — | — | — | — | Yes | P1 | New: track delivery attempts + retries |
| Social publishing (/publish) | Yes | No | No | Yes | No | No | No | P2 | Keep as integration sub-feature |

## Calendar

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Content calendar (/calendar) | Yes | No | Yes (with smart-calendar) | No | Yes | No | No | P1 | Merge calendar + smart-calendar into unified Calendar module |
| Smart calendar (/smart-calendar) | Yes | No | Yes (with calendar) | No | Yes | No | No | P1 | Merge into Calendar module with AI suggestions |
| Optimal posting times | Yes | No | No | Yes | Yes | No | No | P2 | Merge into Calendar as AI feature |
| Cross-module calendar | No | — | — | — | — | — | Yes | P1 | New: unified calendar across projects, tasks, automations, scheduled posts |

## People

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Team management (/teams) | Yes | Yes (ownerId not a relation) | No | No | Yes | No | No | P0 | Merge into Workspace members; fix relations |
| Team invitations | Yes | No | No | Yes | Yes | No | No | P1 | Merge into workspace member invitations |
| Team activity feed | Yes | No | No | Yes | Yes | No | No | P2 | Merge into workspace audit log |
| Contacts | No | — | — | — | — | — | Yes | P2 | New: external contact management |
| Member presence | Partial (TeamActivity) | No | No | No | Yes | No | No | P3 | Merge into People module |

## Conversations

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Threaded comments (CreativeComment) | Yes | Yes (scalar assetId/parentId) | No | No | Yes | No | No | P0 | Generalize into Conversations module; fix relations |
| Comment streaming | Yes | No | No | Yes | Yes | No | No | P1 | Merge into Conversations as real-time updates |
| Workspace discussions | No | — | — | — | — | — | Yes | P1 | New: workspace-level threaded discussions |
| Project discussions | No | — | — | — | — | — | Yes | P2 | New: project-scoped conversations |

## Analytics

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Performance analytics (/performance) | Yes | No | No | Yes | Yes | No | No | P1 | Merge into cross-module Analytics |
| Analytics hub (/analytics-hub) | Yes | No | No | Yes | Yes | No | No | P1 | Merge into Analytics module |
| GA4 integration | Yes | No | No | Yes | Yes | No | No | P2 | Merge into Analytics as data source |
| Creative performance (CreativePerformance) | Yes | No | No | Yes | Yes | No | No | P2 | Merge into Analytics as creative-specific metrics |
| Usage analytics | No | — | — | — | — | — | Yes | P1 | New: credit usage, API calls, storage, AI tokens |
| Audit analytics | No | — | — | — | — | — | Yes | P2 | New: audit log analytics dashboard |

## Search

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Feature search (Cmd+K) | Yes | No | No | Yes | No | No | No | P1 | Keep pattern; reindex around OS objects |
| Global object search | No | — | — | — | — | — | Yes | P0 | New: search across projects, tasks, docs, files, creatives, people |
| Authorization-filtered search | No | — | — | — | — | — | Yes | P0 | New: search results respect workspace + permission boundaries |
| Search index | No | — | — | — | — | — | Yes | P1 | New: logical search index with authorization filtering |

## Settings

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Theme settings | Yes | No | No | Yes | No | No | No | P0 | Keep; repopulate with Neo-Brutalist tokens |
| Language/region settings | Yes | No | No | Yes | No | No | No | P0 | Keep; extend for OS |
| Currency settings | Yes | No | No | Yes | No | No | No | P1 | Keep |
| Profile settings | No | — | — | — | — | — | Yes | P0 | New: user profile (name, avatar, bio) |
| Security settings (password, MFA, sessions) | No | — | — | — | — | — | Yes | P0 | New: password change, MFA, session management |
| Notification preferences | No | — | — | — | — | — | Yes | P1 | New: per-event notification controls |
| Privacy controls (data export, deletion) | No | — | — | — | — | — | Yes | P1 | New: GDPR/DPDP/CCPA data rights |
| Workspace settings | No | — | — | — | — | — | Yes | P0 | New: workspace name, slug, locale, timezone |
| Workspace members + roles | No | — | — | — | — | — | Yes | P0 | New: invite members, assign roles |
| Workspace billing | No | — | — | — | — | — | Yes | P0 | New: subscription, invoices, usage |
| Workspace integrations | No | — | — | — | — | — | Yes | P1 | New: workspace-scoped integration management |
| Workspace webhooks | Yes | No | No | Yes | No | No | No | P1 | Keep; add workspace scoping |
| Workspace audit log | No | — | — | — | — | — | Yes | P1 | New: security-sensitive action log |

## Admin

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Admin dashboard | Yes | Yes (env-based admin, no role in DB) | No | No | No | Yes | No | P0 | Rebuild with DB-based admin role + audit trail |
| User administration | Yes | No | No | Yes | No | Yes | No | P0 | Rebuild with proper role management |
| Workspace administration | No | — | — | — | — | — | Yes | P1 | New: manage all workspaces |
| Billing administration | No | — | — | — | — | — | Yes | P1 | New: view/manage all subscriptions |
| System health | Yes (/observability) | No | No | Yes | No | No | No | P1 | Keep; expand |
| Global audit log | No | — | — | — | — | — | Yes | P1 | New: platform-wide audit trail |
| Feedback management (/admin/feedback) | Yes | No | No | Yes | No | No | No | P3 | Keep |

## Developer Platform

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| API keys | No | — | — | — | — | — | Yes | P0 | New: ApiCredential model with hashed keys + scopes |
| API documentation | No | — | — | — | — | — | Yes | P1 | New: OpenAPI-generated docs at /developers/docs |
| MCP endpoint | Yes (2024-11-05, creative-only) | Yes (outdated) | No | No | No | Yes | No | P0 | Rebuild at /mcp with 2026-07-28 spec |
| MCP connection guide | Yes (/mcp-server page) | No | No | No | Yes | No | No | P1 | Move to /developers/mcp |
| Webhook management | Yes | No | No | Yes | No | No | No | P1 | Keep; expand with delivery tracking |
| Usage metrics | No | — | — | — | — | — | Yes | P1 | New: API call + credit usage dashboards |
| Public API v1 | No | — | — | — | — | — | Yes | P0 | New: versioned public API with gateway |

## Legal

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Terms of Service | Yes | Yes (old identity, thin) | No | No | No | Yes | No | P0 | Rewrite for OS identity; add API/MCP/AUP terms |
| Privacy Policy | Yes | Yes (old identity, no GDPR/DPDP/CCPA) | No | No | No | Yes | No | P0 | Rewrite with retention, subprocessors, data rights |
| Cookie Policy | No | — | — | — | — | — | Yes | P0 | New: required for ePrivacy compliance |
| Acceptable Use Policy | No | — | — | — | — | — | Yes | P0 | New: platform liability protection |
| AI/Generative AI Policy | No | — | — | — | — | — | Yes | P0 | New: EU AI Act transparency |
| API Terms | No | — | — | — | — | — | Yes | P1 | New: public API terms |
| Developer Terms | No | — | — | — | — | — | Yes | P1 | New: developer platform terms |
| MCP Terms | No | — | — | — | — | — | Yes | P1 | New: MCP server terms |
| DPA | No | — | — | — | — | — | Yes | P1 | New: GDPR Art. 28 |
| Subprocessor Disclosure | No | — | — | — | — | — | Yes | P1 | New: GDPR transparency |
| Security Documentation | No | — | — | — | — | — | Yes | P2 | New: enterprise trust |
| Copyright/Takedown Process | No | — | — | — | — | — | Yes | P2 | New: DMCA compliance |
| Legal acceptance tracking | No | — | — | — | — | — | Yes | P1 | New: version + timestamp + user recording |
| Data rights request workflow | No | — | — | — | — | — | Yes | P1 | New: GDPR/DPDP/CCPA rights |

## Auth

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Email/password auth | Yes | No | No | Yes | No | No | No | P0 | Keep; enforce email verification |
| Google OAuth | Yes | No | No | Yes | No | No | No | P0 | Keep |
| Login page | No (modal-only) | Yes (no /login page) | No | — | — | — | Yes | P0 | New: /login page (not modal-only) |
| Signup page | No (modal-only) | Yes (no /signup page) | No | — | — | — | Yes | P0 | New: /signup page |
| Email verification | Yes | Yes (not enforced at login) | No | No | No | Yes | No | P0 | Enforce verification before credit spend / workspace creation |
| Password reset | Yes | Yes (shares token table, no type discriminator) | No | No | No | Yes | No | P0 | Add type discriminator to VerificationToken |
| MFA/2FA | No | — | — | — | — | — | Yes | P0 | New: TOTP-based MFA; required for admin |
| Session revocation | No | Yes (JWT not revocable) | No | No | No | Yes | No | P0 | Add token version in DB; server-side revocation |
| Account lockout | Yes | Yes (in-memory, not distributed) | No | No | No | Yes | No | P1 | Move to D1-backed or Durable Object lockout |
| Centralized requireAuth() | No | Yes (305 manual checks) | No | No | No | Yes | No | P0 | Centralized auth wrapper; lint rule enforcing usage |

## Billing

| Capability | Existing | Broken | Duplicate | Keep | Merge | Rebuild | New | Priority | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Credit packs ($9/$39/$99) | Yes | No | No | Yes | No | No | No | P0 | Keep existing credit pack pricing |
| Credit deduction (atomic) | Yes | No | No | Yes | No | No | No | P0 | Keep atomic pattern; generalize to UsageRecord |
| Credit redemption | Yes | No | No | Yes | No | No | No | P1 | Keep |
| Dodo Payments integration | Yes | No | No | Yes | No | No | No | P0 | Keep; add subscription billing |
| Subscription tiers | No | — | — | — | — | — | Yes | P0 | New: Free/Pro/Team/Enterprise plans |
| Invoices | No | — | — | — | — | — | Yes | P1 | New: Invoice model |
| Usage metering | No | — | — | — | — | — | Yes | P1 | New: UsageRecord for API calls, AI tokens, storage |
| Pricing page | Yes | No | No | Yes | No | Yes | No | P0 | Rebuild with subscription tiers + credit packs |

---

## Summary Statistics

| Treatment | Count |
|---|---|
| **Keep as-is** | 28 |
| **Merge into another** | 35 |
| **Rebuild** | 22 |
| **New (build from scratch)** | 52 |
| **Broken (needs fixing)** | 18 |
| **Duplicate (needs consolidation)** | 12 |

| Priority | Count |
|---|---|
| **P0 (critical)** | 38 |
| **P1 (high)** | 42 |
| **P2 (medium)** | 18 |
| **P3 (low)** | 3 |

---

*This matrix is a living document. It should be updated as implementation progresses and capabilities are built, merged, or deprecated.*
