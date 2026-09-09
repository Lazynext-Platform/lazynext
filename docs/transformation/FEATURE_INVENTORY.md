# Lazynext — Feature Inventory

**Date:** 2026-09-06
**Source:** Direct inspection of src/app/, src/components/, src/lib/

---

## Feature Classification

Each feature is classified: **KEEP**, **MERGE**, **REFACTOR**, **REPLACE**, **DEPRECATE**, **DELETE**, **UNKNOWN**.

---

## 1. Platform / OS Shell

| Feature | Status | Classification | Notes |
|---|---|---|---|
| Dashboard (`/dashboard`) | Implemented | REFACTOR | Shows projects/tasks/docs/agents/automations/creations — needs Company Control Center redesign (Phase 29) |
| Onboarding (`/onboarding`) | Implemented | REFACTOR | Needs new/existing company flows |
| Workspaces (`/workspaces`, `/workspaces/[id]/*`) | Implemented | REFACTOR | Has admin/billing/members/integrations/settings/audit-log sub-pages — good foundation |
| Projects (`/projects`, `/projects/[id]`, `/projects/new`) | Implemented | REFACTOR | Basic CRUD — needs initiatives, campaigns, dependencies |
| Tasks (`/tasks`) | Implemented | REFACTOR | Now has full task system (dependencies, priority, budget, retry, agent assignment) — Phase 6 complete |
| Documents (`/documents`, `/documents/[id]`, `/documents/new`) | Implemented | KEEP | Rich-text knowledge objects |
| Files (`/files`) | Implemented | KEEP | File upload/storage |
| Agents (`/agents`, `/agents/new`) | Implemented | REFACTOR | Now has full agent runtime (durable runs, tool calling) — Phase 7 complete |
| Automations (`/automations`, `/automations/new`) | Implemented | REFACTOR | Now has trigger→conditions→actions engine — Phase 25 complete |
| Conversations (`/conversations`) | Implemented | KEEP | Chat threads |
| People (`/people`) | Implemented | KEEP | Workspace members |
| Teams (`/teams`, `/teams/[id]`, `/teams/join`) | Implemented | DEPRECATE | Duplicate of Workspaces — migrate to Organization/Workspace |
| Approvals (`/approvals`) | Implemented | REFACTOR | Now has centralized approval center — Phase 11 complete |
| Search (`/search`) | Implemented | REFACTOR | Needs unified search across all company objects |
| Integrations (`/integrations`) | Implemented | REFACTOR | Needs normalized integration framework |
| Settings (`/settings/*`) | Implemented | KEEP | Profile/appearance/billing/locale/notifications/security sub-pages |
| Admin (`/admin`) | Implemented | KEEP | User/feedback management |
| Observability (`/observability`) | Implemented | KEEP | Metrics dashboard |
| Security (`/security`) | Implemented | KEEP | Security info page |
| Status (`/status`) | Implemented | KEEP | System status |
| Developers (`/developers`) | Implemented | KEEP | API docs |
| MCP (`/mcp`) | Implemented | KEEP | Rebuilt against 2026-07-28 spec — Phase 26 complete |
| Pricing (`/pricing`) | Implemented | KEEP | Credit packs |
| Company (`/company`, `/company/new`) | Implemented | KEEP | Company Control Center — Phase 5 complete |

## 2. Auth

| Feature | Status | Classification | Notes |
|---|---|---|---|
| Login (`/login`) | Implemented | KEEP | |
| Signup (`/signup`) | Implemented | KEEP | |
| Reset password (`/reset-password`) | Implemented | KEEP | |
| MFA (TOTP) | Implemented | KEEP | Setup/verify/disable API + UI |
| Session revocation | Implemented | KEEP | `/api/session/revoke-all` |
| Email verification | Implemented | REFACTOR | Not enforced at login |
| Google OAuth | Implemented | KEEP | |
| Credentials (email/password) | Implemented | KEEP | bcrypt hashing |

## 3. Creative Studio (the bulk of the product)

| Feature Group | Count | Status | Classification | Notes |
|---|---|---|---|---|
| Flagship pipelines (lazynext-studio, ad-reference, drama-studio, ad-skit, ugc-studio) | 5 | Implemented | KEEP | Core creative capability — repositioned under Growth→Marketing→Creative Studio |
| `ad-creative-*` behavioral designers | 46 | Implemented | MERGE | Merge with `creative-ad-*` (same capability, two slug orders) |
| `creative-ad-*` alternate designers | 35 | Implemented | MERGE | Merge into `ad-creative-*` |
| Copy/messaging generators | ~14 | Implemented | MERGE | Consolidate under /creative/generators |
| Audience/personas | ~9 | Implemented | MERGE | Consolidate under Creative Studio → Audience |
| Brand tools | 6 | Implemented | MERGE | Merge brand-voice variants |
| Strategy/brief/concept | ~13 | Implemented | MERGE | Consolidate under Creative Studio → Strategy |
| Visual/media production | ~12 | Implemented | KEEP | Image/audio/video studios |
| Performance/analytics | ~16 | Implemented | MERGE | Merge competitor variants |
| A/B testing | ~7 | Implemented | MERGE | Merge variant-matrix variants |
| Compliance/safety | 3 | Implemented | REFACTOR | Rebuild with workspace tenancy |
| Creative asset library | 1 | Implemented | KEEP | Add workspace scoping |
| Video editor | 1 | Implemented | KEEP | |
| Ad campaigns | 1 | Implemented | KEEP | |
| Creative comments | 1 | Implemented | MERGE | Generalize into Conversations |
| Creative sharing | 1 | Implemented | KEEP | |
| Creative Director agent loop | 1 | Implemented | KEEP | ADR-005 — autonomous creative director |
| Performance learning loop | 1 | Implemented | KEEP | ADR-006 |
| Conversational refinement | 1 | Implemented | KEEP | ADR-007 |
| viral2viral remix | 1 | Implemented | KEEP | ADR-008 |
| MCP server (all platform services) | 1 | Implemented | KEEP | Rebuilt against 2026-07-28 spec — Phase 26 complete |

## 4. Ad Platform Integrations

| Feature | Status | Classification | Notes |
|---|---|---|---|
| Meta Ads (create, metrics, list, report, budget) | Implemented | KEEP | Dry-run mode, safety layer |
| Google Ads (budget, report) | Implemented | KEEP | Dry-run mode, safety layer |
| Meta Safety Layer | Implemented | REFACTOR | Add workspace tenancy |
| Google Safety Layer | Implemented | REFACTOR | Add workspace tenancy |
| GA4 Analytics | Implemented | KEEP | |

## 5. Publishing

| Feature | Status | Classification | Notes |
|---|---|---|---|
| OAuth connections (TikTok, YouTube, Instagram, Facebook, LinkedIn) | Implemented | KEEP | Encrypt tokens |
| Scheduled posts | Implemented | KEEP | |
| Cross-posting | Implemented | KEEP | |
| Process scheduled (cron) | Implemented | KEEP | Every 5 min cron trigger |

## 6. Billing

| Feature | Status | Classification | Notes |
|---|---|---|---|
| Credit packs ($9/$39/$99) | Implemented | KEEP | |
| Dodo Payments checkout | Implemented | KEEP | |
| Credit ledger | Implemented | KEEP | Idempotency keys |
| Credit redemption | Implemented | KEEP | |
| Refund reconciliation | Implemented | KEEP | Script exists |

## 7. Legal / Compliance

| Feature | Status | Classification | Notes |
|---|---|---|---|
| Terms of Service | Implemented | REFACTOR | Describes old ad-studio identity |
| Privacy Policy | Implemented | REFACTOR | Describes old identity |
| Cookie Policy | Implemented | KEEP | |
| Acceptable Use Policy | Implemented | KEEP | |
| AI Usage Policy | Implemented | KEEP | |
| API Terms | Implemented | KEEP | |
| DPA | Implemented | KEEP | |
| Subprocessors | Implemented | KEEP | |
| Data Request (GDPR) | Implemented | KEEP | |
| Compliance docs | Implemented | KEEP | |

## 8. i18n / Localization

| Feature | Status | Classification | Notes |
|---|---|---|---|
| 13 locales (en, zh, ja, es, ko, pt, fr, de, ar, hi, id, vi, th) | Implemented | KEEP | |
| RTL support (Arabic) | Implemented | KEEP | |
| Cookie + path-based routing | Implemented | KEEP | |
| Dynamic locale loading | Implemented | KEEP | Externalized as static JSON assets |

## 9. Company OS Domain Features (now implemented)

All of the following were previously listed as "missing" and have now been implemented in the Phase 5+ batch work:

- **Company model** — Company CRUD, mission/vision/strategy/goals/KPIs ✅
- **Goals** — Goal CRUD ✅
- **KPIs** — KPI CRUD ✅
- **Planner** — Durable planning system ✅
- **Agent Runtime** — Durable runs, tool calling, verification ✅
- **Tool Registry** — Centralized tool declarations ✅
- **Budget** — Multi-level spending controls ✅
- **Approval** — Centralized approval workflow ✅
- **Memory** — Company memory (facts/knowledge/decisions/preferences/outcomes/lessons) ✅
- **Events** — Shared event model driving automations/notifications/analytics ✅
- **Task System** — Full task system (dependencies, priority, budget, retry, agent assignment) ✅
- **CRM** — Leads, contacts, accounts, opportunities ✅
- **Support** — Tickets, triage, resolution ✅
- **Finance** — Invoices, subscriptions, expenses ✅
- **Research** — Web discovery, fact extraction, citation ✅
- **Product** — Ideas, requirements, roadmaps ✅
- **Permissions** — Policy-based authorization for agents ✅
- **Context Engine** — Relevant context assembly for agents ✅
- **Opportunities** — Proactive opportunity detection ✅
- **Recommendations** — Next-action recommendations ✅
- **MCP server** — Rebuilt against 2026-07-28 spec, wraps all platform services ✅
- **Multi-tenancy** — IDOR fixes, cross-tenant isolation hardening ✅

## 10. Remaining Missing Features (genuinely pending)

See `CURRENT_STATE.md` §9 "What Exists vs. What's Missing" for the list of genuinely remaining features (browser/code execution sandbox, GitHub engineering loop, characterization tests, multi-tenancy scaling, UX redesign, performance, CI/CD, production rollout, final audit).
