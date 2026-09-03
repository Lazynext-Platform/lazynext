# Lazynext — Phase 0 Discovery Report

**Date:** 2026-09-03
**Auditor:** Devin (principal architect)
**Sources of truth:** Git repository `Lazynext-Platform/lazynext` (main branch, HEAD `c8da5b3`) + live site `https://lazynext.com`
**Method:** Read-only filesystem audit + live-site fetch + 4 parallel discovery subagents (routes, DB schema, auth/authz, deps/security). No files were modified during discovery. No build/test was run.

> This report is the required pre-implementation research artifact. It is evidence-based. Where a claim could not be verified from the IDE environment, it is marked **[UNVERIFIED]**. Nothing here is fabricated.

---

## A. Executive Summary — What Lazynext Is Today

Lazynext is currently an **AI e-commerce ad-creative studio**. Its own `package.json` description, live homepage, live Terms, and live Privacy Policy all describe it identically: *"an AI e-commerce ad studio for generating UGC product ads, reference-ad remakes, AI drama ads, and ad skits, powered by Atlas Cloud multi-model workflows."*

The codebase is large and mature but **deeply over-built around the ad-creative identity**:

| Metric | Count |
|---|---|
| App `page.tsx` routes | **214** |
| API `route.ts` files | **323** |
| Prisma models | **37** |
| Components | 81 |
| Lib files | 286 |
| Unit test files | 250 |
| E2E spec files | 166 |
| Locales | 13 (en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id) |
| Currencies (display) | ~30 |
| Ad-creative feature routes | **~178 of 214** (83%) |
| `/api/creative/*` endpoints | **229 of 323** (71%) |

The platform/system layer (auth, settings, admin, billing, teams, legal, observability) is **~36 routes** — a thin shell around an enormous ad-creative surface. The target OS vision in the transformation spec is therefore a **fundamental product redefinition, not a redesign**.

---

## B. Current-State Architecture Map

### B.1 Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `next@^16.3.2` — non-standard/alpha major version [UNVERIFIED on registry stability] |
| UI | React 19 + Tailwind CSS 4 | `react@^19.2.8`, `tailwindcss@^4.3.3` |
| Language | TypeScript 6 (+ `typescript7` npm alias) | `typescript@^6.0.3` — non-standard [UNVERIFIED] |
| Auth | NextAuth v5 beta (`next-auth@5.0.0-beta.32`) | JWT strategy, Google + Credentials |
| ORM | Prisma 7 (`@prisma/client@^7.10.0`) | `engineType=client`, driver-adapter pattern |
| DB (prod) | Cloudflare D1 (SQLite) | `wrangler.jsonc` binding `DB` |
| DB (local) | better-sqlite3 | `src/lib/prisma.local.ts` |
| Storage (prod) | Cloudflare R2 | `src/lib/media-storage.cloudflare.ts` |
| Storage (local) | Filesystem `.dev-media/` | `src/lib/media-storage.local.ts` |
| Deployment | Cloudflare Workers via `@opennextjs/cloudflare@^1.20.6` | `wrangler.jsonc`, `worker-entry.mjs` |
| AI provider | Atlas Cloud (`api.atlascloud.ai`) | `src/lib/atlas.ts`; mock server for local |
| Payments | Dodo Payments (`dodopayments@^2.47.0`) | Credit-pack model, webhook at `/api/webhook/dodo` |
| Email | Resend (`resend@^6.22.1`) | Verification + reset emails |
| Icons | lucide-react | |
| Media processing | `@ffmpeg/ffmpeg` (client-side) | |
| E2E | Playwright (`@playwright/test@^1.62.1`) | |
| Lint | ESLint 10 (`eslint@^10.9.1`) | non-standard [UNVERIFIED] |

### B.2 Deployment topology

- **Single Cloudflare Worker** (`lazynext`) with custom domain `lazynext.com`, `workers_dev: true`.
- D1 binding `DB` (database `lazynext-db`, id `2b14197d-49b0-4d11-85e4-821ba3648ae3`).
- R2 buckets array is **empty** in `wrangler.jsonc` — R2 is accessed via S3-compatible API with hardcoded account-id endpoint (`src/lib/media-storage.cloudflare.ts:5`). [Config inconsistency — buckets not bound in wrangler]
- Rate-limit namespaces `API_RATE_LIMITER` (60/min) and `AI_RATE_LIMITER` (10/min) are **declared in wrangler.jsonc but NOT invoked in code** (`src/proxy.ts` uses in-memory buckets only).
- Cron trigger `*/5 * * * *` (every 5 min) — likely for scheduled post processing (`/api/publish/process-scheduled`).
- Observability enabled, head sampling rate 1.0.
- `compatibility_date: 2026-08-01`, flags `nodejs_compat`, `no_handle_cross_request_promise_resolution`.

### B.3 Directory structure (high level)

```
atlas-marketing-studio/
├── auth.ts                    # NextAuth config (root)
├── src/
│   ├── app/                   # 214 page routes + 323 API routes
│   │   ├── api/               # 26 top-level namespaces
│   │   ├── (178 ad-creative feature dirs)
│   │   ├── dashboard/ settings/ admin/ pricing/ terms/ privacy/ ...
│   ├── components/            # 81 files
│   ├── config/                # appCatalog.ts, navCategories.ts, pricing.ts
│   ├── i18n/                  # messages.ts, provider.tsx, locales/ (13)
│   ├── lib/                   # 286 files (atlas, credits, prisma, security, ...)
│   ├── proxy.ts               # middleware (rate limit + security headers + geo)
│   └── types/
├── prisma/schema.prisma       # 697 lines, 37 models
├── e2e/                       # 166 specs
├── test/                      # 250 unit tests
├── scripts/                   # build/deploy/seed/patch scripts
├── docs/                      # ADRs
├── research/                  # this report
└── wrangler.jsonc, open-next.config.ts, worker-entry.mjs
```

---

## C. Current-State Route Map

### C.1 Platform / system / legal routes (exhaustive, 36)

| Route | Category | File |
|---|---|---|
| `/` | Landing (4 featured apps) | `src/app/page.tsx` |
| `/dashboard` | App grid + search | `src/app/dashboard/page.tsx` |
| `/admin`, `/admin/feedback` | Admin | `src/app/admin/...` |
| `/settings` | Theme/lang/region/teams/webhooks | `src/app/settings/page.tsx` |
| `/pricing` | Credit packs | `src/app/pricing/page.tsx` |
| `/terms`, `/privacy` | Legal | `src/app/terms|privacy/page.tsx` |
| `/reset-password` | Auth UI | `src/app/reset-password/page.tsx` |
| `/my-work`, `/my-work/[id]` | User work | `src/app/my-work/...` |
| `/assets` | Asset library | `src/app/assets/page.tsx` |
| `/editor` | Video editor | `src/app/editor/page.tsx` |
| `/ads` | Ad management | `src/app/ads/page.tsx` |
| `/performance`, `/analytics-hub` | Analytics | |
| `/pipeline`, `/workflow-builder`, `/approvals` | Workflow | |
| `/calendar`, `/smart-calendar` | Planning | |
| `/publish` | Publishing | |
| `/teams`, `/teams/[id]`, `/teams/join` | Teams | |
| `/skills`, `/skill-chains`, `/templates` | Platform tools | |
| `/share/[token]` | Public sharing | |
| `/status`, `/observability` | System | |
| `/mcp-server`, `/media-service-boundary`, `/ml-insights`, `/testing-lab` | Dev/system surfaces | |

**No `/login`, `/signup`, `/register` pages exist.** Auth is modal-only (`AuthModal` imported by 199 pages). Sign-in page is `/` per `auth.ts:196`.

### C.2 Ad-creative feature routes (~178)

Grouped (not exhaustive per-route):

| Group | ~Count | Examples |
|---|---|---|
| Flagship pipelines | 5 | `/lazynext-studio`, `/ad-reference`, `/drama-studio`, `/ad-skit`, `/ugc-studio` |
| `ad-creative-*` behavioral designers | 46 | `/ad-creative-aida-framework-designer`, … |
| `creative-ad-*` alternate designers | 35 | `/creative-ad-urgency-catalyst-designer`, … |
| Copy/messaging generators | ~14 | `/ad-copy-generator`, `/ad-headline-generator`, … |
| Audience/personas | ~9 | `/audience-insights`, `/personas`, … |
| Brand | 6 | `/brand-voice`, `/brand-guardrails`, … |
| Strategy/brief/concept | ~13 | `/creative-director`, `/product-brief`, … |
| Visual/media production | ~12 | `/image-studio`, `/audio-studio`, `/clip-editor`, … |
| Performance/analytics/competitive | ~16 | `/performance`, `/competitor-intel`, `/viral-analyzer`, … |
| A/B testing | ~7 | `/ab-automation`, `/variant-matrix`, … |
| Compliance/safety | 3 | `/meta-safety`, `/google-safety`, `/compliance` |

### C.3 API route inventory (323 files, 26 namespaces)

| Namespace | Files | Notes |
|---|---|---|
| `/api/creative/*` | **229** | Dominates; ad-creative endpoints |
| `/api/ads/*` | 11 | Meta/Google campaign mgmt + safety |
| `/api/assets/*` | 9 | Products/avatars/brand-kits |
| `/api/lazynext-studio/*` | 8 | Flagship pipeline |
| `/api/editor/*` | 7 | Timeline/transcribe/ocr/chat |
| `/api/teams/*` | 7 | Team CRUD/invites/presence |
| `/api/publish/*` | 7 | OAuth + scheduling |
| `/api/ad-reference/*` | 8 | Reference pipeline |
| `/api/auth/*` | 5 | NextAuth + signup/verify/reset |
| `/api/admin/*` | 4 | Users/creations/credits |
| `/api/creations/*` | 4 | Generation job lifecycle |
| `/api/analytics/*` | 2 | ga4, hub |
| `/api/brand/*` | 2 | extract |
| `/api/me/*` | 2 | me, preferences |
| `/api/media-storage/*` | 2 | capabilities, client-upload |
| `/api/webhooks/*` | 2 | user webhooks + rendobar |
| `/api/ad-skit/*` | 3 | |
| `/api/drama-studio/*` | 2 | |
| `/api/checkout` | 1 | Dodo checkout |
| `/api/redeem` | 1 | Credit redemption |
| `/api/credits/analytics` | 1 | |
| `/api/download` | 1 | |
| `/api/feedback` | 1 | |
| `/api/geo` | 1 | IP geolocation |
| `/api/health` | 1 | Unauthenticated health probe |
| `/api/observability` | 1 | Metrics |
| `/api/webhook/dodo` | 1 | Payment webhook |

### C.4 Route hygiene findings

- **Dual prefixes:** `ad-creative-*` (46) and `creative-ad-*` (35) appear to be the same capability with two slug orders — major duplication.
- **Near-duplicate feature families:** `variant-matrix` vs `variant-matrix-generator`; `fatigue` vs `creative-fatigue-detector` vs `ad-creative-burnout-detector`; `quality-scoring` vs `creative-quality-scorer`; `competitor-intel` vs `competitor-watch` vs `ad-competitive-intelligence`; `brand-voice` vs `brand-voice-analyzer` vs `brand-voice-consistency-checker`; `calendar` vs `smart-calendar`; `trend-intelligence` vs `trend-spotter`.
- **Nav/filesystem mismatch:** `navCategories.ts` references `viral-analysis` but the page is `/viral-analyzer`.
- **Singular/plural:** both `/api/webhook` and `/api/webhooks` exist.
- **Versioned API without page:** `/api/creative/ab-test-planner-v2` has no `-v2` page.
- **Pages not in navigation:** `/ugc-studio`, `/variant-matrix`, `/narrative-studio`, `/repurposing`, `/creative-diff`, `/ab-test-results`.
- **Internal/dev surfaces exposed:** `/mcp-server`, `/media-service-boundary`, `/ml-insights`, `/testing-lab` — should be reviewed for production exposure.

---

## D. Current-State Database Model

**File:** `prisma/schema.prisma` (697 lines, 37 models)
**Datasource:** `sqlite` with `engineType=client` (D1 in prod, better-sqlite3 local)

### D.1 Model inventory (37)

| Model | Purpose | Tenancy | createdAt/updatedAt | Notes |
|---|---|---|---|---|
| User | Identity, credits, locale | global | createdAt only | No `updatedAt`; no role column |
| Account | OAuth provider link | userId | none | `userId` not indexed |
| Session | NextAuth session | userId | none | `userId` not indexed |
| VerificationToken | Email/reset tokens | none | none | No type discriminator (email vs reset share table) |
| Creation | AI generation job | userId | both | `templateId` scalar, no relation |
| CreditLedger | Credit transactions | userId | createdAt only | Idempotency key unique per user |
| RedeemedCode | Promo codes | userId (scalar, no FK) | createdAt only | No relation to User |
| AdProduct | Product asset | userId | createdAt only | |
| AdAvatar | Avatar/persona | userId | createdAt only | |
| BrandKit | Brand visuals | userId | createdAt only | |
| BrandProfile | Extracted brand profile | userId | createdAt only | |
| Asset | Generic asset | userId | createdAt only | `parentId` not a self-relation |
| AssetVersion | Version history | assetId | createdAt only | No unique on (assetId, version) |
| SharedLink | Public share | userId | createdAt only | `assetId` scalar, not related |
| WebhookEndpoint | User webhook | userId | createdAt only | |
| CreativeComment | Threaded comments | userId | both | `assetId`/`parentId` scalars |
| Team | Team/workspace | ownerId (scalar, no FK) | both | `ownerId` not a relation |
| TeamMember | Membership | teamId+userId | none | |
| TeamInvitation | Pending invite | teamId | createdAt only | `invitedBy` scalar |
| TeamActivity | Audit feed | teamId+userId | createdAt only | |
| ApprovalStage | Approval workflow | assetId/campaignId (weak) | none | `reviewerId` scalar |
| WorkflowRun | Durable workflow | userId | startedAt only | |
| WorkflowStep | Step state | runId (scalar, no FK) | none | No relation to WorkflowRun |
| AdCampaign | Ad campaign | userId | both | `creativeIds` JSON array |
| CreativePerformance | Performance stats | userId | recordedAt only | `creationId`/`campaignId` scalars |
| Timeline | Video editor | userId | both | |
| TimelineVersion | Timeline snapshot | timelineId | createdAt only | |
| EditingSkill | User editing skill | userId | both | |
| CreativeTemplate | Brief/hook templates | userId? (nullable) | both | No unique on (userId, category, name) |
| CustomComplianceRule | Compliance rules | userId | both | |
| PlatformConnection | OAuth tokens | userId | both | **Tokens stored as plain strings** |
| ScheduledPost | Scheduled post | userId | both | |
| MetaSafetyAudit | Meta safety log | **none** | timestamp only | No userId/teamId |
| MetaSafetyApproval | Meta approval | **none** | createdAt only | No userId/teamId |
| GoogleSafetyAudit | Google safety log | **none** | timestamp only | No userId/teamId |
| GoogleSafetyApproval | Google approval | **none** | createdAt only | No userId/teamId |
| Hook | AI ad hooks | userId | createdAt only | `platforms` JSON-as-string |

### D.2 Data model findings

1. **No `Workspace` model.** Tenancy is user-scoped only; `Team` exists but is separate and `Team.ownerId` is not a relation.
2. **No soft-delete** anywhere (`deletedAt`/`isDeleted` absent). All deletes are hard.
3. **Broad cascade deletes** on `User` wipe nearly all per-user data — risky for audit/compliance retention.
4. **Many scalar ID fields lack relations** (`WorkflowStep.runId`, `RedeemedCode.userId`, `SharedLink.assetId`, `CreativeComment.assetId/parentId`, `CreativePerformance.creationId/campaignId`, `Team.ownerId`, `Creation.templateId`). No FK enforcement.
5. **Missing indexes** on `Account.userId`, `Session.userId`, `RedeemedCode.userId`, `CreativeComment.parentId`, `ApprovalStage.reviewerId`, `CreativePerformance.campaignId/hookType/angleName/variantId`.
6. **No Subscription/Plan/Invoice/PaymentMethod** — billing is credit-based only (`User.credits` + `CreditLedger`).
7. **OAuth tokens stored as plain strings** in `PlatformConnection` — no encryption at schema level.
8. **Enum-like fields are plain Strings** (`Creation.status`, `TeamMember.role`, etc.) — no referential integrity.
9. **JSON stored inconsistently** — some `Json`, some `String` with `"[]"`/`"{}"` defaults.
10. **Safety models (Meta/Google) have no tenancy** — global tables, `actor`/`approvedBy` are raw strings.

---

## E. Current-State API Inventory

See §C.3 for the full namespace breakdown. Key observations:

- **No public/versioned API.** All 323 endpoints are internal app routes under `/api/`, used by the Next.js frontend. No `/api/v1/`, no OpenAPI spec, no API key auth, no scopes.
- **No centralized API gateway.** Auth, rate limiting, and validation are scattered per-route.
- **MCP server exists but is minimal and outdated:** `src/lib/creative/mcp-server.ts` (364 lines) implements `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `ping` with **protocol version `2024-11-05`** — far behind the target `2026-07-28`. It wraps only the creative tool registry, not platform services. No Streamable HTTP transport, no authorization model, no elicitation, no tasks.

---

## F. Current-State Auth/Authz Model

### F.1 Authentication

- **NextAuth v5 beta**, JWT strategy, Google + Credentials (email/password).
- Account lockout: 5 fails / 15 min → 15-min lock (**in-memory per Workers isolate** — not distributed).
- Password hashing: bcrypt (cost 10) + legacy SHA-256 fallback.
- Email verification: token generated + emailed, **but NOT enforced at login**.
- Password reset: 1h token, shares `VerificationToken` table with email verification (**no type discriminator** — a valid email-verification token could theoretically be consumed by reset-password).
- Session: JWT only, **no server-side revocation**. Logout clears cookie; stolen cookie valid until JWT expiry (NextAuth default ~30d).
- **No MFA/2FA.**
- Signup grants `SIGNUP_BONUS_CREDITS`.

### F.2 Authorization

- **No centralized `requireAuth()` helper.** 305 of 318 route files manually call `auth()` and repeat `if (!session?.user?.id) return 401`. A missing check = direct bypass.
- **No middleware-level auth.** `src/proxy.ts` does rate limiting + headers + geo, but **does not enforce authentication**.
- Admin auth: `ADMIN_EMAILS` env string, lowercased comparison. **No role column in DB**, no admin audit trail beyond `CreditLedger.ref`.
- Ownership: user-scoped via `userId` Prisma filters. Team-scoped via `TeamMember` checks.

### F.3 IDOR/BOLA findings

| # | Finding | Severity |
|---|---|---|
| 1 | Meta/Google Ads safety `GET` endpoints leak global config + pending approval payloads to **any authenticated user** (models lack `userId`) | **Medium** |
| 2 | Approval-stage route: orphaned stage (no assetId/campaignId) bypasses ownership; final asset re-fetch unscoped | Low-Medium |
| 3 | Post-mutation `findUnique` re-fetches unscoped in brand-kits/avatars/products `[id]` routes | Low (defense-in-depth) |
| 4 | No workspace/tenant isolation — all user-scoped; team sharing via JSON tag strings is weak | Architectural |
| 5 | Admin endpoints cross user boundaries by design; admin = env email only | High-value target |

### F.4 Security control gaps

- No distributed rate limiter wired (in-memory only; wrangler namespaces declared but unused).
- SSRF `isUrlSafe` blocks private IPs but **does not resolve hostnames** (DNS-rebinding risk for webhooks).
- No CSRF tokens for custom API routes (relies on SameSite cookies).
- Email verification not enforced.
- No MFA.
- JWT sessions not revocable server-side.

---

## G. Current-State Security Findings

### G.1 Committed secrets

- `.env`, `.dev.vars`, `.env.local` are **gitignored**. No real production secrets found committed.
- `.env.example` / `.dev.vars.example` contain only placeholder/mock values.
- **Hardcoded test credentials** in `scripts/seed-test-user.mjs` (`test@lazynext.local` + known password) — dev backdoor if run against prod DB.
- **Hardcoded dev encryption fallback key** in `src/lib/publishing/token-crypto.ts:67,105` — used when `TOKEN_ENCRYPTION_KEY` unset in non-prod.
- **Cloudflare account ID + D1 database ID + R2 endpoint hardcoded** in `wrangler.jsonc` and source (info disclosure, not secrets).

### G.2 Debug artifacts

- **0 TODO/FIXME** comments in `src/` (clean).
- **134 `console.*` calls** in `src/app/` — may leak debug data in prod logs.
- `dryRun`/`test`/`tested`/`untested` labels exposed in UI components (`TestingLab`, `MetaSafetyDashboard`, `GoogleSafetyDashboard`, `MultiPlatformPublisher`, `MediaServiceBoundary`).

### G.3 Security headers

Configured in `src/proxy.ts`: HSTS (2y + preload), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, CSP.
- CSP is **permissive**: `'unsafe-inline'` for scripts/styles, wildcard `https:` for img/media, broad `connect-src`.
- `'unsafe-eval'` added in dev only (`NODE_ENV !== 'production'`).
- CVE-2026-3125 mitigation: blocks `/cdn-cgi` backslash bypass.

### G.4 CI/CD

`.github/workflows/ci.yml`: lint+test → build → e2e (4 shards) → bundle-size → deploy (main only).
- **E2E job has `continue-on-error: true`** — deploy can proceed even if E2E fails.
- No SAST, secret-scan, license-check, or dependency-audit job.

### G.5 License/attribution

- **No `LICENSE` file at repo root.** No `NOTICE` file. No third-party attribution file.
- `research/license-verification.md` exists but is research notes, not a project license.
- Terms of Service §6 claims "Lazynext is built on the open-source Atlas Marketing Studio project (MIT license)" — this attribution chain needs verification.

### G.6 Source maps

- No explicit `productionSourceMap: false` in `next.config.mjs`.
- `scripts/patch-worker.mjs` strips `sourceMappingURL` comments at build time.
- [UNVERIFIED: whether `.map` files ship in the Cloudflare bundle]

---

## H. Current-State Legal/Compliance Findings

### H.1 Existing legal documents (live + repo)

| Document | Status | Issues |
|---|---|---|
| Terms of Service (`/terms`) | Exists | Describes old "AI e-commerce ad studio" identity; thin; no API terms, no MCP terms, no AUP, no DPA, no IP/takedown process, no dispute/termination detail |
| Privacy Policy (`/privacy`) | Exists | Describes old identity; no retention specifics, no subprocessor list, no AI-policy, no cookie policy, no data-rights workflow, no regional disclosures (GDPR/DPDP/CCPA) |
| Cookie Policy | **Missing** | |
| Acceptable Use Policy | **Missing** (only a clause in ToS) | |
| AI/Generative AI policy | **Missing** | |
| API Terms / Developer Terms | **Missing** | |
| MCP terms | **Missing** | |
| Data Processing Agreement | **Missing** | |
| Subprocessor disclosure | **Missing** | |
| Refund/cancellation policy | **Thin** (one line in ToS) | |
| Security documentation | **Missing** | |
| Copyright/takedown process | **Missing** | |

### H.2 Jurisdictional gaps

- **India (DPDP):** No mention. If targeting India (locale `hi`, currency INR supported), DPDP obligations likely apply.
- **EU/EEA (GDPR):** No DPA, no subprocessor list, no retention, no lawful basis, no data-subject request workflow.
- **UK:** No UK-specific terms.
- **US/California (CCPA/CPRA):** No "Do Not Sell/Share" notice, no privacy rights request process.
- **AI Act (EU):** No AI-system disclosure/transparency provisions.

### H.3 Legal acceptance tracking

- No versioned legal documents. No acceptance recording (version, timestamp, user, context).

---

## I. Current-State UX / Copy / i18n Audit

### I.1 Identity & copy

- Homepage hero: **"Your AI Creative Studio"** — old identity, must be replaced.
- Tagline: "4 premium apps · upload and ship · every step powered by Atlas Cloud" — old positioning.
- Stats shown: cost/charge/margin ("~$0.01-0.04", "$0.50–1+", "~95%") — **business-internal economics exposed to end users** (likely a debug/legacy artifact).
- Terms/Privacy explicitly say "AI e-commerce ad studio" — inconsistent with any OS repositioning.

### I.2 i18n

- 13 locales supported with dynamic loading. RTL support for Arabic. Cookie + path-based routing (`/zh/lazynext-studio`).
- Locale preference persists via cookie + localStorage.
- Hydration-safe (server reads cookie, passes `initialLocale`).
- **Good foundation** — but all copy is ad-creative-centric.

### I.3 Design system

- Current theme: **soft, glassmorphic, dark-first** (rgba surfaces, glows, gradients, `--shadow-glow`).
- This is the **opposite** of the Neo-Brutalist target. A full design-system rebuild is required.
- Theme system: light/dark/system via `data-theme` attribute + CSS custom properties. System default. Pre-hydration inline script prevents flash. **Good theming architecture to keep.**
- Responsive: claims 280px–2560px testing; safe-area utilities; `--breakpoint-xs: 400px`.

### I.4 Navigation

- Shell nav: 5 primary items (Dashboard, Create, Optimize, Manage, Insights) + "Browse" dropdown with 13 categories + Cmd+K search.
- `CategorizedAppGrid` with 13 collapsible categories, 193 app slugs.
- Mobile hamburger menu.
- **Navigation is entirely ad-creative-organized** — must be rebuilt around OS primitives.

---

## J. Discrepancy Report — Repo vs Live Site

| Area | Repo (main) | Live (lazynext.com) | Discrepancy |
|---|---|---|---|
| Homepage | 4 featured apps (streamlined) | 4 featured apps | **Consistent** |
| Identity | "AI Creative Studio" | "Your AI Creative Studio" | Consistent (old identity) |
| Terms | "AI e-commerce ad studio" | "AI e-commerce ad studio" | Consistent (old identity) |
| Privacy | "AI e-commerce ad studio" | "AI e-commerce ad studio" | Consistent (old identity) |
| Dashboard | 193-app categorized grid | Auth-gated (renders shell only when unauthenticated) | Cannot fully verify; consistent with auth-gating |
| Settings | Theme/lang/region/currency | Works (theme/lang/region/currency visible) | Consistent |
| Pricing | 3 credit packs ($9/$39/$99) | 3 credit packs, ~30 currencies | Consistent |
| Admin | Admin page exists | Renders empty (auth-gated) | Consistent |
| Route count | 214 pages, 323 APIs | Only ~36 platform + 4 featured reachable publicly | Live hides the ~178 ad-creative routes behind auth; repo keeps them all |
| MCP | `2024-11-05` protocol, creative-only | `/mcp-server` page exists | [UNVERIFIED live MCP behavior] |

**Key insight:** The live site and repo are **consistent** — both reflect the old ad-studio identity. The repo is *larger* than what's publicly visible because most routes are auth-gated. There is no repo-vs-live drift to reconcile; the drift is between **both** and the **target OS vision**.

---

## K. Third-Party License Inventory (current)

| Dependency | License (typical) | Notes |
|---|---|---|
| next, react, react-dom | MIT | |
| next-auth | ISC | |
| @prisma/client, prisma | Apache-2.0 | |
| @auth/prisma-adapter | ISC | |
| bcryptjs | MIT | |
| dodopayments | [UNVERIFIED] | Check package |
| lucide-react | ISC | |
| resend | MIT | |
| @ffmpeg/ffmpeg, @ffmpeg/util | MIT | |
| @opennextjs/cloudflare | Apache-2.0 [UNVERIFIED] | |
| @playwright/test | Apache-2.0 | |
| tailwindcss | MIT | |
| typescript | Apache-2.0 | |
| better-sqlite3 | MIT | |
| wrangler | Apache-2.0 [UNVERIFIED] | |

**No project LICENSE file exists.** A root `LICENSE` + `NOTICE` + third-party attribution file must be created. The Terms §6 MIT-attribution claim for "Atlas Marketing Studio" must be verified.

---

## L. Old-to-New Product Migration Map (preliminary)

This is a **preliminary** mapping to be refined in Phase 1 (Architecture). It is not a final decision.

| Old concept | Target OS concept | Treatment |
|---|---|---|
| User | User + Identity | Keep, extend with roles |
| Team | Organization + Workspace | Promote to first-class tenancy |
| Creation | Task / Job | Generalize beyond ad generation |
| Asset | Document / File / Asset | Generalize |
| CreditLedger | Usage record + Subscription | Extend billing model |
| AdCampaign | Project / Campaign | Generalize or keep as module |
| CreativePerformance | Analytics record | Generalize |
| PlatformConnection | Integration / Connection | Generalize |
| ScheduledPost | Automation / Scheduled task | Generalize |
| WorkflowRun/Step | Workflow / Automation | Keep, generalize |
| Hook | Knowledge object | Module-specific |
| 178 ad-creative routes | "Creative Studio" module (1 of N modules) | Consolidate into a single module with sub-features, not 178 top-level routes |
| MCP server (2024-11-05) | Lazynext MCP Server (2026-07-28) | Rebuild against current spec |
| No public API | Public API v1 + gateway | New build |
| Modal-only auth | Auth pages + flows | Add `/login`, `/signup` |

---

## M. Key Risks & Open Questions

1. **Non-standard dependency versions** (Next 16, React 19, TS 6/7, Prisma 7, ESLint 10) — are these real published packages or custom/typo-squatted? [REQUIRES REGISTRY VERIFICATION]
2. **R2 buckets not bound in `wrangler.jsonc`** — how does prod R2 access actually work? [UNVERIFIED — needs Cloudflare dashboard access]
3. **Distributed rate limiter declared but unused** — intentional or incomplete?
4. **`workers_dev: true` + custom domain** — is the `*.workers.dev` URL also live/exposed?
5. **Atlas Cloud dependency** — is there a contractual/provider relationship, or is this a third-party API? Affects legal/subprocessor disclosure.
6. **Dodo Payments** — what jurisdictions/payment terms apply? Affects billing legal.
7. **Production secrets rotation** — no evidence of committed real secrets, but the dev encryption fallback + test credentials should be confirmed not deployed.
8. **Source map shipping** — needs verification against the actual deployed bundle.
9. **SQLite FK enforcement on D1** — are declared relations actually enforced, or emulated by Prisma Client only?

---

## N. What Can Be Reused (Phase 51 rule)

| Asset | Reuse? | Why |
|---|---|---|
| NextAuth v5 config | **Adapt** | Solid base; needs MFA, verification enforcement, role column, session revocation |
| Theme architecture (`data-theme` + CSS vars) | **Adapt** | Good flash-free theming; needs Neo-Brutalist token values |
| i18n architecture (cookie + path routing, dynamic locale loading) | **Keep** | Well-built, hydration-safe |
| Prisma + D1 driver-adapter pattern | **Adapt** | Keep runtime; rebuild schema for OS model |
| `withAtlas` AsyncLocalStorage pattern | **Adapt** | Good request-context pattern; generalize |
| Credit deduction atomic pattern | **Adapt** | Good concurrency pattern; generalize to usage |
| Rate-limit scaffolding in `proxy.ts` | **Adapt** | Keep structure; wire distributed limiter |
| Security headers + CSP | **Adapt** | Keep, tighten CSP |
| Playwright E2E infra | **Keep** | Good test infra |
| Geo/locale detection in middleware | **Keep** | Works well |

---

## O. Next Steps (Phase 1 — Architecture)

This discovery report establishes the baseline. Phase 1 must produce:

1. **Target product definition** — the Lazynext OS concept, module taxonomy, navigation IA.
2. **Target domain model** — User/Org/Workspace/Team/Role/Permission/Project/Task/Document/Integration/Automation/Agent/etc.
3. **Target data model** — Prisma schema redesign with tenancy, soft-delete, audit fields, relations.
4. **Target route map** — OS shell + modules + developer platform + legal.
5. **Target API architecture** — versioned public API + gateway + internal service layer.
6. **Target MCP architecture** — `2026-07-28` spec conformance plan (requires reading current MCP spec).
7. **Threat model** — based on §F.3 and §G findings.
8. **Migration plan** — old data/routes → new (§L preliminary).
9. **Neo-Brutalist design system spec** — tokens, primitives, components.

**Before any of Phase 1 is finalized, the current MCP `2026-07-28` specification must be read from authoritative sources** (the spec is rapidly evolving; stale memory must not be used). This is flagged as the first Phase-1 research task.

---

*End of Phase 0 Discovery Report. Evidence: 4 subagent reports (routes, DB, auth/authz, deps/security) + direct inspection of `package.json`, `auth.ts`, `src/proxy.ts`, `next.config.mjs`, `wrangler.jsonc`, `open-next.config.ts`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/i18n/messages.ts`, `src/app/globals.css`, `src/lib/creative/mcp-server.ts`, `src/app/api/creations/[id]/route.ts`, `src/config/pricing.ts` + live-site fetches of `/`, `/dashboard`, `/lazynext-studio`, `/terms`, `/privacy`, `/pricing`, `/settings`, `/admin`.*
