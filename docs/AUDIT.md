# Lazynext — Repository Audit Summary

**Audit date:** 2026-09-03
**Auditor:** Devin (principal architect)
**Source of truth:** Git repository `Lazynext-Platform/lazynext` (main branch, HEAD `c8da5b3`) + live site `https://lazynext.com`
**Method:** Read-only filesystem audit + live-site fetch + 4 parallel discovery subagents (routes, DB schema, auth/authz, deps/security). No files were modified. No build/test was run.
**Full report:** `research/DISCOVERY-REPORT-PHASE0.md`

---

## 1. Executive Summary

Lazynext is currently an **AI e-commerce ad-creative studio**. Its `package.json` description, live homepage, live Terms, and live Privacy Policy all describe it identically: *"an AI e-commerce ad studio for generating UGC product ads, reference-ad remakes, AI drama ads, and ad skits, powered by Atlas Cloud multi-model workflows."*

The codebase is large and mature but **deeply over-built around the ad-creative identity**. The platform/system layer (auth, settings, admin, billing, teams, legal, observability) is a thin shell (~36 routes) around an enormous ad-creative surface. The target OS vision is therefore a **fundamental product redefinition, not a redesign**.

### Key metrics

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
| Platform/system routes | ~36 |
| ADRs | 142 |

---

## 2. Stack

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

---

## 3. Deployment Topology

- **Single Cloudflare Worker** (`lazynext`) with custom domain `lazynext.com`, `workers_dev: true`.
- D1 binding `DB` (database `lazynext-db`, id `2b14197d-49b0-4d11-85e4-821ba3648ae3`).
- R2 buckets array is **empty** in `wrangler.jsonc` — R2 is accessed via S3-compatible API with hardcoded account-id endpoint (`src/lib/media-storage.cloudflare.ts:5`). Config inconsistency.
- Rate-limit namespaces `API_RATE_LIMITER` (60/min) and `AI_RATE_LIMITER` (10/min) are **declared in wrangler.jsonc but NOT invoked in code** (`src/proxy.ts` uses in-memory buckets only).
- Cron trigger `*/5 * * * *` (every 5 min) — likely for scheduled post processing (`/api/publish/process-scheduled`).
- Observability enabled, head sampling rate 1.0.
- `compatibility_date: 2026-08-01`, flags `nodejs_compat`, `no_handle_cross_request_promise_resolution`.

---

## 4. Route Inventory

### Platform / system / legal routes (36)

| Route | Category |
|---|---|
| `/` | Landing (4 featured apps) |
| `/dashboard` | App grid + search |
| `/admin`, `/admin/feedback` | Admin |
| `/settings` | Theme/lang/region/teams/webhooks |
| `/pricing` | Credit packs |
| `/terms`, `/privacy` | Legal |
| `/reset-password` | Auth UI |
| `/my-work`, `/my-work/[id]` | User work |
| `/assets` | Asset library |
| `/editor` | Video editor |
| `/ads` | Ad management |
| `/performance`, `/analytics-hub` | Analytics |
| `/pipeline`, `/workflow-builder`, `/approvals` | Workflow |
| `/calendar`, `/smart-calendar` | Planning |
| `/publish` | Publishing |
| `/teams`, `/teams/[id]`, `/teams/join` | Teams |
| `/skills`, `/skill-chains`, `/templates` | Platform tools |
| `/share/[token]` | Public sharing |
| `/status`, `/observability` | System |
| `/mcp-server`, `/media-service-boundary`, `/ml-insights`, `/testing-lab` | Dev/system surfaces |

**No `/login`, `/signup`, `/register` pages exist.** Auth is modal-only (`AuthModal` imported by 199 pages). Sign-in page is `/` per `auth.ts:196`.

### Ad-creative feature routes (~178)

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

### API route inventory (323 files, 26 namespaces)

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

### Route hygiene findings

- **Dual prefixes:** `ad-creative-*` (46) and `creative-ad-*` (35) appear to be the same capability with two slug orders — major duplication.
- **Near-duplicate feature families:** `variant-matrix` vs `variant-matrix-generator`; `fatigue` vs `creative-fatigue-detector` vs `ad-creative-burnout-detector`; `quality-scoring` vs `creative-quality-scorer`; `competitor-intel` vs `competitor-watch` vs `ad-competitive-intelligence`; `brand-voice` vs `brand-voice-analyzer` vs `brand-voice-consistency-checker`; `calendar` vs `smart-calendar`; `trend-intelligence` vs `trend-spotter`.
- **Nav/filesystem mismatch:** `navCategories.ts` references `viral-analysis` but the page is `/viral-analyzer`.
- **Singular/plural:** both `/api/webhook` and `/api/webhooks` exist.
- **Versioned API without page:** `/api/creative/ab-test-planner-v2` has no `-v2` page.
- **Pages not in navigation:** `/ugc-studio`, `/variant-matrix`, `/narrative-studio`, `/repurposing`, `/creative-diff`, `/ab-test-results`.
- **Internal/dev surfaces exposed:** `/mcp-server`, `/media-service-boundary`, `/ml-insights`, `/testing-lab` — should be reviewed for production exposure.

---

## 5. Database Model (37 tables)

**File:** `prisma/schema.prisma` (697 lines, 37 models)
**Datasource:** `sqlite` with `engineType=client` (D1 in prod, better-sqlite3 local)

### Model inventory

| Model | Purpose | Tenancy | Notes |
|---|---|---|---|
| User | Identity, credits, locale | global | No `updatedAt`; no role column |
| Account | OAuth provider link | userId | `userId` not indexed |
| Session | NextAuth session | userId | `userId` not indexed |
| VerificationToken | Email/reset tokens | none | No type discriminator |
| Creation | AI generation job | userId | `templateId` scalar, no relation |
| CreditLedger | Credit transactions | userId | Idempotency key unique per user |
| RedeemedCode | Promo codes | userId (scalar, no FK) | No relation to User |
| AdProduct | Product asset | userId | |
| AdAvatar | Avatar/persona | userId | |
| BrandKit | Brand visuals | userId | |
| BrandProfile | Extracted brand profile | userId | |
| Asset | Generic asset | userId | `parentId` not a self-relation |
| AssetVersion | Version history | assetId | No unique on (assetId, version) |
| SharedLink | Public share | userId | `assetId` scalar, not related |
| WebhookEndpoint | User webhook | userId | |
| CreativeComment | Threaded comments | userId | `assetId`/`parentId` scalars |
| Team | Team/workspace | ownerId (scalar, no FK) | `ownerId` not a relation |
| TeamMember | Membership | teamId+userId | |
| TeamInvitation | Pending invite | teamId | `invitedBy` scalar |
| TeamActivity | Audit feed | teamId+userId | |
| ApprovalStage | Approval workflow | assetId/campaignId (weak) | `reviewerId` scalar |
| WorkflowRun | Durable workflow | userId | |
| WorkflowStep | Step state | runId (scalar, no FK) | No relation to WorkflowRun |
| AdCampaign | Ad campaign | userId | `creativeIds` JSON array |
| CreativePerformance | Performance stats | userId | `creationId`/`campaignId` scalars |
| Timeline | Video editor | userId | |
| TimelineVersion | Timeline snapshot | timelineId | |
| EditingSkill | User editing skill | userId | |
| CreativeTemplate | Brief/hook templates | userId? (nullable) | No unique on (userId, category, name) |
| CustomComplianceRule | Compliance rules | userId | |
| PlatformConnection | OAuth tokens | userId | **Tokens stored as plain strings** |
| ScheduledPost | Scheduled post | userId | |
| MetaSafetyAudit | Meta safety log | **none** | No userId/teamId |
| MetaSafetyApproval | Meta approval | **none** | No userId/teamId |
| GoogleSafetyAudit | Google safety log | **none** | No userId/teamId |
| GoogleSafetyApproval | Google approval | **none** | No userId/teamId |
| Hook | AI ad hooks | userId | `platforms` JSON-as-string |

### Data model findings

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

## 6. Security Findings

### Committed secrets
- `.env`, `.dev.vars`, `.env.local` are **gitignored**. No real production secrets found committed.
- `.env.example` / `.dev.vars.example` contain only placeholder/mock values.
- **Hardcoded test credentials** in `scripts/seed-test-user.mjs` (`test@lazynext.local` + known password) — dev backdoor if run against prod DB.
- **Hardcoded dev encryption fallback key** in `src/lib/publishing/token-crypto.ts:67,105` — used when `TOKEN_ENCRYPTION_KEY` unset in non-prod.
- **Cloudflare account ID + D1 database ID + R2 endpoint hardcoded** in `wrangler.jsonc` and source (info disclosure, not secrets).

### Debug artifacts
- **0 TODO/FIXME** comments in `src/` (clean).
- **134 `console.*` calls** in `src/app/` — may leak debug data in prod logs.
- `dryRun`/`test`/`tested`/`untested` labels exposed in UI components.

### Security headers
Configured in `src/proxy.ts`: HSTS (2y + preload), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, CSP.
- CSP is **permissive**: `'unsafe-inline'` for scripts/styles, wildcard `https:` for img/media, broad `connect-src`.
- `'unsafe-eval'` added in dev only.
- CVE-2026-3125 mitigation: blocks `/cdn-cgi` backslash bypass.

### Auth/Authz findings
- **NextAuth v5 beta**, JWT strategy, Google + Credentials (email/password).
- Account lockout: 5 fails / 15 min → 15-min lock (**in-memory per Workers isolate** — not distributed).
- Password hashing: bcrypt (cost 10) + legacy SHA-256 fallback.
- Email verification: token generated + emailed, **but NOT enforced at login**.
- Password reset: 1h token, shares `VerificationToken` table with email verification (**no type discriminator**).
- Session: JWT only, **no server-side revocation**. Logout clears cookie; stolen cookie valid until JWT expiry (~30d).
- **No MFA/2FA.**
- **No centralized `requireAuth()` helper.** 305 of 318 route files manually call `auth()` and repeat `if (!session?.user?.id) return 401`.
- **No middleware-level auth.** `src/proxy.ts` does rate limiting + headers + geo, but **does not enforce authentication**.
- Admin auth: `ADMIN_EMAILS` env string, lowercased comparison. **No role column in DB**, no admin audit trail beyond `CreditLedger.ref`.

### IDOR/BOLA findings

| # | Finding | Severity |
|---|---|---|
| 1 | Meta/Google Ads safety `GET` endpoints leak global config + pending approval payloads to **any authenticated user** (models lack `userId`) | **Medium** |
| 2 | Approval-stage route: orphaned stage (no assetId/campaignId) bypasses ownership; final asset re-fetch unscoped | Low-Medium |
| 3 | Post-mutation `findUnique` re-fetches unscoped in brand-kits/avatars/products `[id]` routes | Low (defense-in-depth) |
| 4 | No workspace/tenant isolation — all user-scoped; team sharing via JSON tag strings is weak | Architectural |
| 5 | Admin endpoints cross user boundaries by design; admin = env email only | High-value target |

### CI/CD
`.github/workflows/ci.yml`: lint+test → build → e2e (4 shards) → bundle-size → deploy (main only).
- **E2E job has `continue-on-error: true`** — deploy can proceed even if E2E fails.
- No SAST, secret-scan, license-check, or dependency-audit job.

### License/attribution
- **No `LICENSE` file at repo root.** No `NOTICE` file. No third-party attribution file.
- `research/license-verification.md` exists but is research notes, not a project license.
- Terms of Service §6 claims "Lazynext is built on the open-source Atlas Marketing Studio project (MIT license)" — this attribution chain needs verification.

---

## 7. Legal/Compliance Findings

### Existing legal documents

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

### Jurisdictional gaps
- **India (DPDP):** No mention. If targeting India (locale `hi`, currency INR supported), DPDP obligations likely apply.
- **EU/EEA (GDPR):** No DPA, no subprocessor list, no retention, no lawful basis, no data-subject request workflow.
- **UK:** No UK-specific terms.
- **US/California (CCPA/CPRA):** No "Do Not Sell/Share" notice, no privacy rights request process.
- **AI Act (EU):** No AI-system disclosure/transparency provisions.

### Legal acceptance tracking
- No versioned legal documents. No acceptance recording (version, timestamp, user, context).

---

## 8. UX/Copy/i18n Findings

### Identity & copy
- Homepage hero: **"Your AI Creative Studio"** — old identity, must be replaced.
- Tagline: "4 premium apps · upload and ship · every step powered by Atlas Cloud" — old positioning.
- Stats shown: cost/charge/margin ("~$0.01-0.04", "$0.50–1+", "~95%") — **business-internal economics exposed to end users** (likely a debug/legacy artifact).
- Terms/Privacy explicitly say "AI e-commerce ad studio" — inconsistent with any OS repositioning.

### i18n
- 13 locales supported with dynamic loading. RTL support for Arabic. Cookie + path-based routing (`/zh/lazynext-studio`).
- Locale preference persists via cookie + localStorage.
- Hydration-safe (server reads cookie, passes `initialLocale`).
- **Good foundation** — but all copy is ad-creative-centric.

### Design system
- Current theme: **soft, glassmorphic, dark-first** (rgba surfaces, glows, gradients, `--shadow-glow`).
- This is the **opposite** of the Neo-Brutalist target. A full design-system rebuild is required.
- Theme system: light/dark/system via `data-theme` attribute + CSS custom properties. System default. Pre-hydration inline script prevents flash. **Good theming architecture to keep.**
- Responsive: claims 280px–2560px testing; safe-area utilities; `--breakpoint-xs: 400px`.

### Navigation
- Shell nav: 5 primary items (Dashboard, Create, Optimize, Manage, Insights) + "Browse" dropdown with 13 categories + Cmd+K search.
- `CategorizedAppGrid` with 13 collapsible categories, 193 app slugs.
- Mobile hamburger menu.
- **Navigation is entirely ad-creative-organized** — must be rebuilt around OS primitives.

---

## 9. Discrepancy Report — Repo vs Live Site

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

## 10. What Can Be Reused

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

## 11. Key Risks & Open Questions

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

*This audit summary is derived from `research/DISCOVERY-REPORT-PHASE0.md`. Refer to the full report for evidence citations and subagent findings.*
