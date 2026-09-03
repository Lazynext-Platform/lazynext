# Lazynext — API Security Assessment

**Version:** 1.0.0
**Status:** Active
**Framework:** OWASP API Security Top 10 (2023)
**Basis:** `research/ARCHITECTURE-PHASE1.md` §6 Threat Model

---

## 1. Overview

This document assesses the Lazynext Public REST API (`/api/v1/*`), internal API (`/api/internal/*`), and MCP endpoint (`/mcp`) against the **OWASP API Security Top 10 (2023)**. Each category documents the threat, the control implemented, and residual risk.

Lazynext follows a **shared platform core** principle: one Application Service layer (`src/lib/services/*`) is called by the UI, the REST API, and the MCP server. Security controls are enforced in the service layer, not duplicated across transport surfaces. This eliminates the class of bugs where one surface is protected and another is not.

---

## 2. API1:2023 — Broken Object Level Authorization (BOLA / IDOR)

### Threat

An attacker manipulates object IDs in requests to access resources belonging to other users or workspaces. This is the #1 API security risk per OWASP.

### Controls

| Control | Implementation |
|---|---|
| **Workspace-scoped queries** | Every business-data query is filtered by `workspaceId`. The workspace context is resolved **server-side** from the authenticated user's memberships — never from client input. |
| **Centralized auth helpers** | `requireAuth()` + `requireWorkspace()` + `requirePermission()` are called in every handler. A lint rule forbids route handlers without `requireAuth()`. |
| **Object ownership checks** | When accessing a specific object (e.g. `GET /api/v1/projects/{id}`), the service verifies the object's `workspaceId` matches the resolved workspace before returning data. |
| **No client-supplied workspace** | The `X-Workspace-Id` header is validated against the user's memberships. A client cannot specify a workspace they are not a member of. |

### Residual risk

**Low.** The primary residual risk is a developer forgetting to call `requireWorkspace()` in a new handler. The lint rule mitigates this, but code review is the final gate.

---

## 3. API2:2023 — Broken Authentication

### Threat

Attackers compromise API keys, session tokens, or exploit weak authentication flows to impersonate users.

### Controls

| Control | Implementation |
|---|---|
| **API key hashing** | API key secrets are hashed (`keyHash` in `ApiCredential`). The raw secret is shown once at creation and never stored or logged. |
| **Key revocation** | Keys can be revoked (`revokedAt`); revoked keys immediately fail authentication. |
| **Session JWT security** | JWTs are stored in `httpOnly`, `secure`, `SameSite` cookies. Server-side session revocation via token version in DB. |
| **Short-lived refresh tokens** | Refresh tokens are short-lived; access tokens are short-lived. |
| **MFA for sensitive actions** | TOTP-based MFA for credentials users; required for admin actions. |
| **Email verification** | Required before credit spend or workspace creation. |
| **Distributed lockout** | Account lockout is D1-backed or Durable Object-backed (distributed, not in-memory) to prevent brute force. |
| **CAPTCHA** | Cloudflare Turnstile on signup, login (risk-based), and password reset. |
| **Account enumeration prevention** | Signup and password reset return constant-time, generic responses. |

### Residual risk

**Low.** MFA is not yet enforced for all users (only admin). Phishing of API keys remains a user-side risk; key rotation guidance is documented.

---

## 4. API3:2023 — Broken Object Property Level Authorization

### Threat

Attackers exploit endpoints that return more properties than necessary (over-exposure) or accept properties they should not be able to modify (mass assignment).

### Controls

| Control | Implementation |
|---|---|
| **Explicit field allowlists** | Every endpoint defines an explicit allowlist of fields it accepts in the request body. Extra fields are rejected, not silently ignored. |
| **Schema validation** | Request bodies are validated against JSON schemas before reaching the service layer. Invalid requests return `422 validation_error`. |
| **Response shaping** | API responses are explicitly constructed objects, not raw Prisma model dumps. Sensitive fields (`keyHash`, `password`, `accessToken`, `refreshToken`) are never included in API responses. |
| **Role-based field access** | Some fields are only writable by `owner`/`admin` roles (e.g. workspace settings). The service layer enforces role checks before allowing field updates. |

### Residual risk

**Low.** The main risk is a new endpoint accidentally returning a sensitive field. Response shaping (explicit objects) mitigates this, but code review is the final gate.

---

## 5. API4:2023 — Unrestricted Resource Consumption

### Threat

Attackers exhaust API resources via high-volume requests, large payloads, expensive queries, or unbounded loops.

### Controls

| Control | Implementation |
|---|---|
| **Distributed rate limiting** | Cloudflare rate limiter bindings enforce per-key limits: 60 req/min standard, 10 req/min for AI endpoints. Distributed, not in-memory. |
| **Pagination limits** | List endpoints are cursor-based with `limit` max of 100. No unbounded queries. |
| **File upload limits** | Size limits, MIME + magic byte + extension validation, filename normalization. |
| **Query timeouts** | D1 queries have execution timeouts. Long-running operations use the Tasks extension (MCP) or async polling (API). |
| **Credit metering** | AI generation endpoints deduct credits before execution and refund on failure. Credit balance is checked before execution. |
| **Idempotency** | `Idempotency-Key` prevents duplicate resource creation on retry. |

### Residual risk

**Low.** The 60 req/min standard limit may be too restrictive for some batch workflows; a higher tier for enterprise is planned. AI endpoint cost is bounded by credits.

---

## 6. API5:2023 — Broken Function Level Authorization (BFF)

### Threat

Attackers access administrative or privileged functions by bypassing authorization checks, often because the check exists only in the UI and not in the API.

### Controls

| Control | Implementation |
|---|---|
| **Service-layer enforcement** | Admin actions require `role: admin` check in the **service layer**, not just the UI. Since the UI, API, and MCP all call the same services, there is no bypass surface. |
| **Scope checks at gateway** | The API gateway checks scopes (`workspace:read`, `project:write`, etc.) per endpoint before routing to the handler. |
| **Admin role in DB** | Admin role is stored in the database (`Membership.role`), not derived from env variables. Admin actions are audit-logged. |
| **Deny by default** | Endpoints default to requiring authentication + a specific scope. There is no "public by default" posture. |

### Residual risk

**Low.** The shared-service architecture is the strongest control here — there is no separate admin API with its own (possibly missing) auth checks.

---

## 7. API6:2023 — Unrestricted Access to Sensitive Business Flows

### Threat

Attackers abuse business flows (e.g. signup, password reset, credit redemption) at high volume to cause harm.

### Controls

| Control | Implementation |
|---|---|
| **CAPTCHA on signup/login** | Cloudflare Turnstile on signup, login (risk-based), and password reset. |
| **Redeem code uniqueness** | `RedeemedCode` model with `code` as primary key prevents Atlas redeem code reuse. |
| **Credit ledger idempotency** | `CreditLedger` enforces `@@unique([userId, idempotencyKey])` to prevent double-charging or double-granting. |
| **Email verification gate** | Credit spend and workspace creation require verified email. |
| **Rate limiting on auth flows** | Login, signup, and password reset are rate-limited below the standard 60/min. |

### Residual risk

**Low.** Business flow abuse is bounded by CAPTCHA + rate limiting + idempotency.

---

## 8. API7:2023 — SSRF (Server-Side Request Forgery)

### Threat

Attackers cause the server to make requests to internal/private network resources via webhook URLs, URL imports, or outbound fetch operations.

### Controls

| Control | Implementation |
|---|---|
| **Webhook URL validation** | Webhook endpoint URLs are validated: DNS resolution + IP re-validation before fetch. Private/metadata IPs (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`) are blocked. |
| **Outbound allowlist** | Outbound fetch operations (Atlas, Dodo, ad platforms) use an allowlist of known hosts. |
| **URL import validation** | URL-to-brief and reference-remix features validate and sanitize input URLs before fetching. |
| **Redirect following limits** | HTTP clients follow a maximum of 3 redirects and re-validate the IP after each redirect. |

### Residual risk

**Medium.** SSRF defenses are implemented but require ongoing vigilance as new outbound-fetch features are added. DNS rebinding (where DNS resolves to a public IP initially, then a private IP) is mitigated by re-validation after resolution.

---

## 9. API8:2023 — Security Misconfiguration

### Threat

Misconfigured headers, verbose errors, unnecessary HTTP methods, exposed debug endpoints, or source map leakage.

### Controls

| Control | Implementation |
|---|---|
| **CSP with nonces** | Content-Security-Policy uses nonces (no `unsafe-inline`). |
| **No debug routes in prod** | Debug endpoints are excluded from production builds. |
| **Source map stripping** | `productionSourceMap: false`; build-time map stripping. |
| **Structured logging with redaction** | Logger redacts sensitive fields (`password`, `token`, `keyHash`) before writing. |
| **Security headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **HTTPS only** | All production traffic is HTTPS via Cloudflare. HTTP is redirected. |
| **Environment separation** | local, test, staging, production with isolated D1 databases and secrets. |

### Residual risk

**Low.** Misconfiguration risk is bounded by CI checks (SAST, secret scan, dependency audit) and environment separation.

---

## 10. API9:2023 — Improper Inventory Management

### Threat

Stale API versions, undocumented endpoints, or exposed test endpoints in production create an unmonitored attack surface.

### Controls

| Control | Implementation |
|---|---|
| **Versioned API** | `/api/v1/*` is the only public API surface. Version is in the URL path. |
| **OpenAPI spec** | Auto-generated from route schemas; served at `/developers/docs`. The spec is the inventory. |
| **Endpoint inventory** | All endpoints are documented (see API.md). Internal endpoints (`/api/internal/*`) are session-authenticated and not exposed externally. |
| **Staging environment** | Pre-prod validation on `staging.lazynext.com` with its own D1. |
| **Deprecation policy** | 12-month sunset window for deprecated versions. `Sunset` and `Deprecation` headers on deprecated endpoints. |

### Residual risk

**Low.** The OpenAPI spec is the source of truth. Risk is a developer adding an endpoint without updating the spec; CI validates spec conformance.

---

## 11. API10:2023 — Unsafe Consumption of Third-Party APIs

### Threat

Integrating with third-party APIs (Atlas Cloud, Dodo, Meta, Google) without validating their responses or protecting against their compromise.

### Controls

| Control | Implementation |
|---|---|
| **Response validation** | Third-party API responses are validated against expected schemas before use. Unexpected fields are ignored. |
| **Webhook signature verification** | Dodo Payments webhooks are verified via the Dodo SDK signature. User webhooks use HMAC-SHA256. |
| **Token encryption** | OAuth tokens (`Connection.accessToken`, `Connection.refreshToken`) are encrypted at the application layer, not stored as plain strings. |
| **Dry-run mode for ad platforms** | Meta and Google Ads integrations have dry-run mode (ADR-004, ADR-035, ADR-036) with spend caps, mutation caps, blocked actions, and approval workflows. |
| **Secret management** | Third-party API keys are stored in Cloudflare Workers secrets (encrypted at rest), not in env files. Startup validation verifies required secrets are present. |
| **Timeout + retry bounds** | Third-party API calls have timeouts and bounded retries with exponential backoff. |

### Residual risk

**Medium.** Third-party API compromise is outside Lazynext's control. Response validation + dry-run mode mitigate the impact, but a compromised provider could still inject data. Audit logging captures all third-party interactions.

---

## 12. Summary

| OWASP Category | Risk Level | Primary Control |
|---|---|---|
| API1: BOLA/IDOR | Low | Workspace-scoped queries + centralized auth helpers |
| API2: Broken Authentication | Low | Key hashing + revocation + MFA + distributed lockout |
| API3: Broken Property-Level Authz | Low | Field allowlists + schema validation + response shaping |
| API4: Unrestricted Resource Consumption | Low | Distributed rate limiting + pagination + credit metering |
| API5: BFF / Function-Level Authz | Low | Service-layer enforcement + shared platform core |
| API6: Sensitive Business Flows | Low | CAPTCHA + idempotency + email verification gate |
| API7: SSRF | Medium | IP validation + outbound allowlist + redirect limits |
| API8: Security Misconfiguration | Low | CSP nonces + source map stripping + env separation |
| API9: Improper Inventory | Low | OpenAPI spec + versioning + deprecation policy |
| API10: Unsafe Third-Party Consumption | Medium | Response validation + signature verification + dry-run |

### Architecture-level controls

The **shared platform core** (one service layer for UI, API, MCP) is the single most impactful security control. It ensures:
- Authorization is enforced once, in the service layer, for all surfaces.
- No bypass surface exists where one transport is protected and another is not.
- Security changes (e.g. adding a permission check) propagate to all surfaces automatically.

---

*End of API Security Assessment.*
