# Security Overview — Lazynext Operating System

**Status:** Living document. Last updated 2026-09-03.
**Scope:** Security posture of the Lazynext platform (formerly Atlas Marketing Studio), based on the Phase 0 Discovery Report and source inspection of `src/proxy.ts`, `auth.ts`, `src/lib/security.ts`, and `src/lib/admin.ts`.
**Framework:** OWASP Application Security Verification Standard (ASVS) v4.0, Level 2 (standard) with selective Level 3 controls for high-risk surfaces (auth, payments, admin).

> **Disclaimer:** This document is an engineering security overview, not a legal attestation. Matters requiring qualified security or legal counsel are marked **[REQUIRES COUNSEL]**.

---

## 1. Security Architecture at a Glance

| Layer | Technology | Control owner |
|---|---|---|
| Edge / WAF | Cloudflare Workers (single Worker `lazynext`) | Cloudflare + app middleware (`src/proxy.ts`) |
| App framework | Next.js 16 (App Router) | Application code |
| Auth | NextAuth v5 beta (JWT strategy) | `auth.ts` |
| Password hashing | bcryptjs (cost 10) + legacy SHA-256 fallback | `src/lib/security.ts` |
| Admin authz | `ADMIN_EMAILS` env allowlist | `src/lib/admin.ts` |
| ORM / DB | Prisma 7 → Cloudflare D1 (prod) / better-sqlite3 (local) | Application code |
| Object storage | Cloudflare R2 (S3-compatible API) | Application code |
| Payments | Dodo Payments (credit-pack model) | Application code + Dodo webhook |
| Email | Resend (verification + reset) | Application code |
| AI provider | Atlas Cloud (`api.atlascloud.ai`) | Application code |

The platform runs as a **single Cloudflare Worker** with `workers_dev: true` and a custom domain `lazynext.com`. There is no separate API gateway; auth, rate limiting, and validation are enforced per-route and in middleware.

---

## 2. OWASP ASVS Control Mapping

ASVS Level 2 is the baseline target. The table below maps the ASVS sections to the current implementation and flags gaps.

| ASVS section | Control | Status | Evidence / Gap |
|---|---|---|---|
| V1 (Architecture) | Trusted architecture boundary documented | Partial | Edge = Cloudflare; app = Worker. No internal service mesh. |
| V2 (Authentication) | Password complexity, lockout, bcrypt | Partial | bcrypt cost 10; lockout 5 fails / 15 min; **no MFA**; email verification not enforced at login. |
| V3 (Session Management) | JWT, secure cookies, revocation | Partial | JWT-only, `httpOnly`, `SameSite=Lax`, `__Secure-` prefix in prod. **No server-side revocation** — stolen token valid until expiry (~30d). |
| V4 (Access Control) | Centralized authz, ownership scoping | Weak | No `requireAuth()` helper; 305 routes manually call `auth()`. Admin = env email allowlist, no DB role column, no admin audit trail. |
| V5 (Validation) | Input validation, schema enforcement | Partial | Per-route validation; no centralized schema layer. |
| V7 (Cryptography) | Secrets at rest | Weak | OAuth tokens stored as plain strings in `PlatformConnection`. Dev encryption fallback key hardcoded. |
| V8 (Data Protection) | Data classification, retention | Missing | No retention policy; no soft-delete; cascade deletes on User wipe audit data. |
| V9 (Communications) | TLS, HSTS | Pass | HSTS 2y + preload; TLS terminated by Cloudflare. |
| V12 (Files/Resources) | Upload validation | Partial | Upload rate-limited (20/min); SSRF `isUrlSafe` present but does not resolve hostnames (DNS-rebinding risk). |
| V13 (API) | Rate limiting, auth on endpoints | Partial | In-memory rate limiter per isolate; Cloudflare rate-limit namespaces declared but **not wired**. |
| V14 (Configuration) | Security headers, debug artifacts | Partial | Headers present (see §3); 134 `console.*` calls in `src/app/` may leak debug data. |

---

## 3. HTTP Security Headers

All headers are applied to every response via `applySecurityHeaders()` in `src/proxy.ts:272`. API routes and page routes both receive them.

| Header | Value | Notes |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 2 years + preload. |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing blocked. |
| `X-Frame-Options` | `DENY` | Clickjacking defense (also enforced via CSP `frame-ancestors 'none'`). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Disables device APIs and FLoC. |
| `Content-Security-Policy` | See below | Pragmatic; tightened in production. |

### Content-Security-Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com https://unpkg.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
media-src 'self' blob: https:;
connect-src 'self' https://*.atlascloud.ai https://*.dodopayments.com https://cloudflareinsights.com https://unpkg.com;
worker-src 'self' blob:;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
object-src 'none';
```

**Known weaknesses (tracked for remediation):**
- `'unsafe-inline'` required for scripts/styles (Next.js runtime). Target: nonce-based CSP.
- `'unsafe-eval'` added in dev only (`NODE_ENV !== 'production'`); production is strict.
- `img-src`/`media-src` allow broad `https:` (model outputs + avatars from Atlas OSS / R2 / Google). Target: restrict to known origins.
- CVE-2026-3125 mitigation: middleware blocks `/cdn-cgi` backslash bypass (`src/proxy.ts:286`).

---

## 4. Authentication Security

### 4.1 Providers
- **Google OAuth** — always enabled; PKCE + state cookies use `SameSite=None; Secure` so the Google → `lazynext.com` redirect survives (`auth.ts:40`).
- **Credentials (email + password)** — bcrypt cost 10; legacy SHA-256+salt fallback for pre-migration hashes (`src/lib/security.ts:25`).

### 4.2 Account lockout
- 5 failed attempts within 15 minutes → 15-minute lock (`auth.ts:95`).
- **Limitation:** lockout state is in-memory per Workers isolate — not distributed. A determined attacker can rotate across isolates. Cloudflare rate-limit namespaces are declared in `wrangler.jsonc` but not invoked in code. **Remediation:** wire the declared `API_RATE_LIMITER` / `AI_RATE_LIMITER` namespaces for distributed enforcement.

### 4.3 Email verification & password reset
- Verification tokens emailed via Resend, but **not enforced at login**.
- Reset tokens: 1h validity. Shares the `VerificationToken` table with email verification **with no type discriminator** — a valid email-verification token could theoretically be consumed by the reset flow. **Remediation:** add a `type` column or separate table.

### 4.4 Session management
- JWT strategy only; no server-side session store.
- Cookies: `httpOnly`, `SameSite=Lax`, `__Secure-` prefix in production, `__Host-` for CSRF token.
- **No server-side revocation.** Logout clears the cookie; a stolen cookie remains valid until JWT expiry (~30d NextAuth default). **Remediation:** add a revocation list (D1 table or KV) checked on `jwt`/`session` callbacks, or shorten token lifetime + introduce refresh tokens.

### 4.5 MFA
- **Not implemented.** Required for ASVS Level 2 and for admin accounts. **Remediation:** TOTP via `otplib` or WebAuthn.

---

## 5. Authorization Model

### 5.1 User-scoped ownership
All per-user data is scoped by `userId` Prisma filters. There is no workspace/tenant abstraction; `Team` exists but `Team.ownerId` is a scalar, not a relation.

### 5.2 Admin authorization
- `requireAdmin()` in `src/lib/admin.ts` checks `session.user.email` against the comma-separated `ADMIN_EMAILS` env var (lowercased comparison).
- **No role column in the DB.** No admin audit trail beyond `CreditLedger.ref`. **Remediation:** add a `role` enum column; record admin actions to an audit table.

### 5.3 Centralized authz helper
- **Missing.** 305 of 318 route files manually call `auth()` and repeat `if (!session?.user?.id) return 401`. A forgotten check = direct bypass. **Remediation:** introduce `requireAuth()` / `requireOwner()` / `requireAdmin()` middleware wrappers used by every protected route.

### 5.4 IDOR / BOLA findings (from §F.3)
| # | Finding | Severity |
|---|---|---|
| 1 | Meta/Google Ads safety `GET` endpoints leak global config to any authenticated user (models lack `userId`) | Medium |
| 2 | Approval-stage orphaned stage bypasses ownership | Low-Medium |
| 3 | Post-mutation `findUnique` re-fetches unscoped in brand-kits/avatars/products `[id]` routes | Low (defense-in-depth) |
| 4 | No workspace/tenant isolation | Architectural |
| 5 | Admin endpoints cross user boundaries by design; admin = env email only | High-value target |

---

## 6. Rate Limiting

Implemented in `src/proxy.ts` as in-memory buckets keyed by `ip:category`. Limits:

| Category | Limit | Window | Applies to |
|---|---|---|---|
| `ai-gen` | 10 | 60s | AI generation endpoints |
| `upload` | 20 | 60s | Upload endpoints |
| `payment` | 5 | 60s | `/api/checkout`, `/api/redeem` |
| `poll` | 60 | 60s | Polling endpoints (authenticated) |
| `api-v1` | 100 | 60s | Public API v1 |
| `mcp` | 60 | 60s | `/mcp` endpoint |
| `api-keys` | 10 | 60s | `/api/keys` |
| `default` | 30 | 60s | All other API routes |

Webhooks (`/api/webhook/*`), auth callbacks (`/api/auth/*`), and `/api/health` are exempt. Rate limiting is skipped in test/E2E via `E2E_NO_RATE_LIMIT=1`.

**Limitation:** in-memory per isolate — not globally distributed. Cloudflare rate-limit namespaces `API_RATE_LIMITER` (60/min) and `AI_RATE_LIMITER` (10/min) are declared in `wrangler.jsonc` but **not invoked**. **Remediation:** wire the Cloudflare namespaces for edge-wide enforcement.

---

## 7. SSRF Defenses

`isUrlSafe()` in `src/lib/security.ts:68` blocks:
- Non-HTTP schemes (only `http:` / `https:` allowed).
- `localhost`, `0.0.0.0`.
- Private IP ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0/8`.
- IPv6 loopback/ULA/link-local: `::1`, `fc00::/7`, `fe80::/10`.
- Cloud metadata endpoints: `metadata.google.internal`, `169.254.169.254`.

**Gap:** `isUrlSafe` checks the hostname string but **does not resolve DNS**. A hostname that resolves to a private IP at fetch time (DNS rebinding) bypasses the check. **Remediation:** resolve the hostname, check the resolved IP, and pin the fetch to that IP; or route outbound fetches through a Cloudflare egress that blocks RFC1918.

---

## 8. Input Validation & Error Sanitization

- Per-route validation; no centralized schema layer (e.g. Zod). **Remediation:** adopt a shared validation library.
- `safeError()` (`src/lib/security.ts:100`) logs the raw error server-side and returns a sanitized error code to the client, preventing exception-message leakage.
- `safeAtlasError()` detects Atlas Cloud 402 (insufficient platform balance) and returns `atlas_insufficient_balance` / 503.
- **Gap:** 134 `console.*` calls in `src/app/` may leak debug data in production logs. **Remediation:** route through a structured logger with redaction.

---

## 9. Secrets Management

| Item | Status |
|---|---|
| `.env`, `.dev.vars`, `.env.local` | Gitignored; no real production secrets found committed. |
| `.env.example` / `.dev.vars.example` | Placeholders/mock values only. |
| Hardcoded test credentials | `scripts/seed-test-user.mjs` (`test@lazynext.local` + known password) — dev backdoor if run against prod DB. |
| Dev encryption fallback key | Hardcoded in `src/lib/publishing/token-crypto.ts:67,105` when `TOKEN_ENCRYPTION_KEY` unset in non-prod. |
| Cloudflare account ID / D1 ID / R2 endpoint | Hardcoded in `wrangler.jsonc` and source (info disclosure, not secrets). |
| OAuth tokens (`PlatformConnection`) | Stored as **plain strings** — no encryption at rest. **Remediation:** encrypt at rest with a KMS-managed key. |

**Remediation summary:** rotate secrets on a schedule; remove dev fallback keys from production builds; encrypt OAuth tokens at rest; confirm test-credential seed script cannot run against the production D1 binding.

---

## 10. Dependency Security

| Practice | Status |
|---|---|
| `npm audit` in CI | **Missing** |
| SAST (e.g. Semgrep, CodeQL) | **Missing** |
| Secret scanning (e.g. gitleaks) | **Missing** |
| License/SBOM check | **Missing** |
| Renovate/Dependabot | **Not configured** |
| Non-standard versions | Next 16, React 19, TS 6/7, Prisma 7, ESLint 10 — registry stability **[UNVERIFIED]**. |

CI (`.github/workflows/ci.yml`): lint+test → build → e2e (4 shards) → bundle-size → deploy (main only). **E2E job has `continue-on-error: true`** — deploy can proceed even if E2E fails. **Remediation:** gate deploy on E2E; add SAST, secret-scan, dependency-audit, and SBOM jobs.

---

## 11. Logging & Monitoring

- Cloudflare Observability enabled; head sampling rate 1.0.
- `/api/observability` exposes metrics; `/api/health` is an unauthenticated health probe.
- No centralized security event logging (auth failures, admin actions, IDOR attempts). **Remediation:** emit structured security events to a tamper-evident store.

---

## 12. Incident Response

No documented IR runbook. **[REQUIRES COUNSEL + Security lead]** Required artifacts:
- Severity classification and on-call rotation.
- Token revocation procedure (currently impossible server-side — see §4.4).
- Breach notification workflow (jurisdiction-dependent — see `docs/COMPLIANCE.md`).
- Postmortem template.

---

## 13. Remediation Backlog (priority order)

1. Add `requireAuth()` / `requireOwner()` / `requireAdmin()` centralized authz helpers.
2. Wire Cloudflare distributed rate-limit namespaces.
3. Add MFA (TOTP/WebAuthn) for all users; mandatory for admins.
4. Implement server-side session revocation.
5. Enforce email verification at login; add token type discriminator.
6. Encrypt OAuth tokens at rest.
7. Fix IDOR findings §5.4 (Meta/Google safety tenancy; scoped re-fetches).
8. Tighten CSP to nonce-based; remove `unsafe-inline`.
9. Add SAST + secret-scan + dependency-audit to CI; gate deploy on E2E.
10. Resolve SSRF DNS-rebinding gap.
11. Add admin role column + audit table.
12. Structured logging with redaction; remove debug `console.*` in prod.
