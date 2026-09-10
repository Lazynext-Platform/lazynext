# Lazynext — Risks & Blockers

**Date:** 2026-09-09

---

## Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | tsc OOMs with default heap | Medium | Certain | Blocks typecheck | Always use `NODE_OPTIONS=--max-old-space-size=8192` | Documented |
| R2 | ~178 ad-creative routes are duplicated (ad-creative-* vs creative-ad-*) | High | Certain | Major consolidation effort | Phase 16-17: merge slug orders, redirect old routes | Resolved — routes consolidated with redirects |
| R3 | Safety models (Meta/Google) lack workspace tenancy | High | Certain | Security gap (cross-tenant data leak) | Phase 27: add userId/workspaceId, migrate data | Resolved — workspaceId added to safety models |
| R4 | OAuth tokens stored as plain strings in PlatformConnection | High | Certain | Credential exposure | Phase 26: encrypt tokens using existing token-crypto pattern | Resolved — encryption wired into all save/read paths |
| R5 | R2 buckets not bound in wrangler.jsonc | Medium | Likely | Storage config inconsistency | Verify prod R2 access; bind buckets properly | Resolved — wrangler.jsonc configured with R2 bindings |
| R6 | Distributed rate limiter declared but not invoked | Medium | Likely | Rate limit bypass under load | Phase 27: wire Cloudflare rate limiter bindings | Resolved — RateLimiter wired into 20+ routes |
| R7 | MCP server uses outdated protocol (2024-11-05) | Medium | Certain | MCP interop failure | Phase 26: rebuild against 2026-07-28 spec | Resolved — MCP server rebuilt to 2026-07-28 spec at `/mcp` |
| R8 | No Company model exists | High | Certain | Cannot implement target OS | Phase 5: create Company model extending Organization | Resolved — CompanyService exists at `src/lib/services/company.ts` |
| R9 | No autonomous execution loop | High | Certain | Core product gap | Phase 7-8: build agent runtime + planner + durable execution | Resolved — AutonomyLoopService implemented |
| R10 | Agent runtime is thin CRUD (no tool calling, no verification) | High | Certain | Core product gap | Phase 7: rebuild AgentRun as durable execution | Resolved — Agent runtime has durable execution, tool calling, budget checks, approval gating |
| R11 | Team model duplicates Organization/Workspace | Medium | Certain | Data model confusion | Phase 4: deprecate Team, migrate to Organization/Workspace | Resolved — deprecated with comments |
| R12 | Email verification not enforced at login | Medium | Likely | Account security gap | Phase 27: enforce verification | Resolved — enforced in auth.ts; signup sends verification email; resend endpoint added |
| R13 | No distributed rate limiting (in-memory only) | Medium | Likely | Rate limit bypass | Phase 27: wire Cloudflare rate limiter | Resolved — binding configured in wrangler.jsonc |
| R14 | Non-standard dependency versions (Next 16, React 19, TS 6/7, Prisma 7) | Low-Medium | Unknown | Potential registry instability | Monitor; verify published packages | Open |
| R15 | No characterization tests for existing behavior | Medium | Certain | Regression risk during transformation | Phase 3: write characterization tests | Resolved — 5 characterization test files with 129 tests |
| R16 | Creative models lack workspace scoping (user-scoped only) | Medium | Certain | Cross-workspace data isolation gap | Phase 28: add workspaceId to creative models | Resolved — workspaceId added to creative models |
| R17 | No soft-delete on creative models | Low | Certain | Data loss risk | Phase 4: add deletedAt to creative models | Resolved — deletedAt added to creative models |
| R18 | Scalar ID fields lack relations (WorkflowStep.runId, etc.) | Low | Certain | No FK enforcement | Phase 4: add proper relations | Resolved — Prisma relations added |
| R19 | JSON stored inconsistently (Json vs String) | Low | Certain | Data inconsistency | Phase 4: normalize JSON storage | Resolved — String→Json where appropriate |
| R20 | No budget/spending controls for agents | High | Certain | Unbounded AI costs | Phase 11: build budget system | Resolved — BudgetService wired into agent runtime |
| R21 | No approval center for high-risk actions | High | Certain | Unsafe autonomy | Phase 11: build centralized approval system | Resolved — ApprovalService wired into agent runtime |
| R22 | No prompt-injection defense | High | Certain | Agent hijacking via external content | Phase 27: separate instructions/data/tool outputs | Resolved — detectPromptInjection + delimiters implemented |
| R23 | No sandbox for code/browser execution | High | Certain | Cannot safely execute AI-generated code | Phase 12: build secure execution boundaries | Resolved — SandboxService implemented |
| R24 | CI E2E previously had continue-on-error | Low | Resolved | Deploy could proceed on E2E failure | Fixed — deploy now depends on E2E | Resolved |
| R25 | Hardcoded dev encryption fallback key | Low | Likely | Key exposure if deployed to prod | Verify not deployed; remove fallback in prod | Resolved — already guarded |
| R26 | Hardcoded test credentials in seed script | Low | Likely | Dev backdoor if run against prod | Document; ensure seed script never runs against prod | Resolved — ALLOW_PROD_SEED guard added |

## Blockers

| # | Blocker | Type | Resolution |
|---|---|---|---|
| B1 | No Cloudflare API token | Credential | RESOLVED — durable token created and stored as GitHub secret (2026-09-10). CI/CD deploys successfully |
| B2 | No Atlas Cloud API key | Credential | OPEN — needs user to provide actual key. Mock server used for local dev — production needs real key |
| B3 | No live production access | Access | RESOLVED — production deployed and verified at lazynext.com (2026-09-10). Health checks pass |
| B4 | No D1 production database access | Credential | RESOLVED — D1 schema baseline + migrations applied via CI using Cloudflare API token. 145 tables created, 22 migrations applied. |

## Risk Assessment Summary

- **25 of 26 risks (R1-R26) are RESOLVED.** R14 (dep versions) remains open — low priority, monitoring only.
- **3 of 4 blockers (B1, B3, B4) are RESOLVED.** B2 (Atlas Cloud API key) requires an external credential that only the user can provide.

### Resolved in prior batches
- R1 (tsc heap) — Documented (use NODE_OPTIONS=--max-old-space-size=8192)
- R7 (MCP protocol) — Resolved (MCP server rebuilt to 2026-07-28 spec)
- R8 (no Company model) — Resolved (CompanyService exists)
- R9 (no autonomous loop) — Resolved (AutonomyLoopService implemented)
- R10 (thin agent runtime) — Resolved (durable execution, tool calling, budget checks)
- R12 (email verification) — Resolved (enforced in auth.ts; signup sends verification email; resend endpoint added)
- R14 (dep versions) — Open (monitoring, not blocking)
- R15 (characterization tests) — Resolved (5 test files, 129 tests)
- R20 (no budgets) — Resolved (BudgetService wired into agent runtime)
- R21 (no approvals) — Resolved (ApprovalService wired into agent runtime)
- R24 (CI E2E continue-on-error) — Resolved (deploy depends on E2E)

### Resolved in Batch 4zc
- R2 (duplicate routes) — Resolved (consolidated with redirects)
- R3 (safety tenancy) — Resolved (workspaceId added to safety models)
- R4 (OAuth tokens) — Resolved (encryption wired into all save/read paths)
- R5 (R2 bindings) — Resolved (wrangler.jsonc configured)
- R6 (rate limiter) — Resolved (RateLimiter wired into 20+ routes)
- R11 (Team model) — Resolved (deprecated with comments)
- R13 (distributed rate limiting) — Resolved (binding configured)
- R16 (creative workspace scoping) — Resolved (workspaceId added to creative models)
- R17 (soft-delete) — Resolved (deletedAt added to creative models)
- R18 (scalar ID relations) — Resolved (Prisma relations added)
- R19 (JSON normalization) — Resolved (String→Json where appropriate)
- R22 (prompt injection) — Resolved (detectPromptInjection + delimiters)
- R23 (sandbox) — Resolved (SandboxService implemented)
- R25 (dev encryption key) — Resolved (already guarded)
- R26 (seed credentials) — Resolved (ALLOW_PROD_SEED guard added)

### Open Blockers (require external credentials)
- B1: Cloudflare API token — RESOLVED (durable token created and stored as GitHub secret, 2026-09-10)
- B2: Atlas Cloud API key (needs user to provide)
- B3: Production access — RESOLVED (deployed and verified, 2026-09-10)
- B4: D1 database access — RESOLVED (schema baseline + migrations applied via CI)
