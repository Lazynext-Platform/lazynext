# Lazynext — Security Inventory

**Date:** 2026-09-04
**Source:** Direct inspection of auth.ts, src/proxy.ts, src/lib/security.ts, src/lib/services/, git log

---

## Authentication

| Feature | Status | Implementation | Notes |
|---|---|---|---|
| NextAuth v5 (JWT) | Implemented | auth.ts | Google + Credentials providers |
| Password hashing | Implemented | bcrypt (cost 10) + legacy SHA-256 fallback | |
| Account lockout | Implemented | 5 fails / 15 min → 15-min lock | In-memory per Workers isolate (not distributed) |
| Email verification | Implemented | Token emailed | **NOT enforced at login** — gap |
| Password reset | Implemented | 1h token | Shares VerificationToken table (no type discriminator) |
| MFA (TOTP) | Implemented | src/lib/mfa.ts | Setup/verify/disable |
| Session revocation | Implemented | src/lib/session-revocation.ts | `/api/session/revoke-all` |
| Google OAuth | Implemented | NextAuth | |
| Signup bonus credits | Implemented | SIGNUP_BONUS_CREDITS env | |

## Authorization

| Feature | Status | Implementation | Notes |
|---|---|---|---|
| Per-route auth() checks | Implemented | 305+ route files | Manual — no centralized helper |
| Workspace membership checks | Implemented | WorkspaceService | OS routes check membership |
| Admin auth | Implemented | ADMIN_EMAILS env | No role column in DB |
| Plan-tier guards | Implemented | src/lib/plan-guard.ts | canCreateAgent, canCreateAutomation |
| API key auth (public v1) | Implemented | src/lib/api-key-crypto.ts | SHA-256 hash, scopes |

### IDOR/BOLA Findings (from discovery report)

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Meta/Google safety GET endpoints leak global config to any authed user | Medium | Open — models lack userId |
| 2 | Approval-stage orphaned stage bypasses ownership | Low-Medium | Open |
| 3 | Post-mutation findUnique unscoped in brand-kits/avatars/products | Low | Defense-in-depth |
| 4 | No workspace/tenant isolation for creative models | Architectural | Open — user-scoped only |
| 5 | Admin endpoints cross user boundaries by design | High-value target | By design (admin) |

## Security Hardening (completed work)

| Area | Status | Commits | Notes |
|---|---|---|---|
| SSRF validation | Implemented | 16+ commits | isUrlSafe blocks private IPs; needs DNS rebinding fix |
| Input length limits | Implemented | 20+ commits | All API POST/PATCH routes |
| Error leak prevention | Implemented | 5+ commits | Stop leaking internal errors |
| CSP headers | Implemented | src/proxy.ts | Permissive (unsafe-inline); tightened |
| HSTS | Implemented | src/proxy.ts | 2y + preload |
| X-Frame-Options | Implemented | src/proxy.ts | DENY |
| Timing-safe comparisons | Implemented | 2 commits | HMAC + password verification |
| Race condition fixes | Implemented | 5+ commits | Credit deduction, workspace ops |
| XSS hardening | Implemented | 1 commit | |
| Auth middleware | Implemented | 1 commit | |
| Take limits (DoS) | Implemented | 5+ commits | Unbounded findMany queries |
| Webhook URL validation | Implemented | 1 commit | SSRF on webhook URLs |
| OAuth state validation | Implemented | 1 commit | Timing-safe |
| URL format validation | Implemented | 10+ commits | Multiple creative routes |

## Security Gaps (to address)

| Gap | Severity | Phase | Notes |
|---|---|---|---|
| Safety models lack tenancy | High | 27 | Add userId/workspaceId |
| OAuth tokens plain-text | High | 26 | Encrypt PlatformConnection tokens |
| Email verification not enforced | Medium | 27 | Enforce at login |
| No distributed rate limiter | Medium | 27 | Wire Cloudflare rate limiter bindings |
| SSRF DNS rebinding | Medium | 27 | Resolve hostnames before checking |
| No CSRF tokens | Medium | 27 | Custom API routes rely on SameSite only |
| No prompt-injection defense | High | 27 | Separate instructions/data/tool outputs |
| Creative models lack workspace scoping | Medium | 28 | Add workspaceId |
| No secret rotation mechanism | Medium | 26 | For OAuth tokens, API keys |
| Permissive CSP | Low | 27 | Tighten unsafe-inline |
| In-memory rate limiting (not distributed) | Medium | 27 | Workers isolate-scoped |
| VerificationToken no type discriminator | Low | 27 | Email vs reset share table |

## Secrets Management

| Secret | Storage | Status |
|---|---|---|
| NEXTAUTH_SECRET / AUTH_SECRET | env | Required |
| ATLASCLOUD_API_KEY | env | Required (mock for local) |
| RESEND_API_KEY | env | Required |
| Dodo webhook secret | env | HMAC verification |
| OAuth tokens (platforms) | DB (plain text) | **Gap — must encrypt** |
| API keys (public v1) | DB (SHA-256 hash) | Safe — never store plaintext |
| MFA secrets | DB (encrypted) | Safe — src/lib/mfa.ts |
| Dev encryption fallback key | Hardcoded | **Gap — remove in prod** |
| Test credentials | Hardcoded in seed script | **Gap — never run against prod** |

## Compliance

| Area | Status | Notes |
|---|---|---|
| GDPR data requests | Implemented | /data-request page, DataRequest model |
| Cookie policy | Implemented | /cookies page |
| Privacy policy | Implemented | /privacy page |
| Terms of service | Implemented | /terms page |
| AI usage policy | Implemented | /ai-usage-policy page |
| DPA | Implemented | /dpa page |
| Subprocessors | Implemented | /subprocessors page |
| Acceptable use | Implemented | /acceptable-use page |
| API terms | Implemented | /api-terms page |
| Legal audit | Documented | docs/LEGAL_AUDIT.md |
