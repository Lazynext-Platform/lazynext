# LazyNext Architecture Audit (Phase 1)

> **Superseded** — See `research/lazynext-architecture-audit-2026-09.md` for the current
> architecture picture (post-Q series). This audit was verified 2026-08-27, before the
> H–Q series landed (real pipeline executor, Asset/AssetVersion persistence, score stage,
> Workflow Builder v2, model router for media, i18n wiring, clip editor EDL handoff,
> E2E coverage, deep link error handling, authenticated E2E, pipeline UI i18n, etc.).
> Use `docs/adr/` and `CHANGELOG.md` for detailed decision records.

> Source of truth: actual source code at `/Users/avaspatel/Downloads/Lazynext/atlas-marketing-studio`
> (local clone of `https://github.com/Lazynext-Platform/lazynext`, branch `main`, clean tree).
> Verified 2026-08-27.

## 1. Identity & Origin

- **Repo name in package.json**: `lazynext` v0.1.0
- **Origin**: `https://github.com/Lazynext-Platform/lazynext.git`
- **Local dir name**: `atlas-marketing-studio` (legacy folder name; the app is branded LazyNext)
- **README self-description**: "AI e-commerce ad studio … powered by Atlas Cloud"
- **License**: MIT (per README badge; README states it is a Lazynext-branded distribution built on the open-source `AtlasCloudAI/atlas-marketing-studio` project, MIT)
- **License file**: NOT present in the working tree as a separate `LICENSE` file — REQUIRES MANUAL REVIEW. README asserts MIT. The upstream `atlas-marketing-studio` is MIT per README claim.

## 2. Stack (verified from package.json + source)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | ^16.3.2 |
| UI | React | ^19.2.8 |
| Language | TypeScript | ^6.0.3 (+ typescript7 ^7.0.2 override) |
| Styling | Tailwind CSS | ^4.3.3 |
| ORM | Prisma | ^7.10.0 |
| DB (prod) | Cloudflare D1 | via `@prisma/adapter-d1` |
| DB (local) | SQLite | via `@prisma/adapter-better-sqlite3` (better-sqlite3 ^13) |
| Auth | NextAuth | ^5.0.0-beta.32 (JWT session, Google + Credentials) |
| Media (prod) | Cloudflare R2 | binding `MEDIA_BUCKET` |
| Media (local) | File-based | `.dev-media/` |
| Deploy | OpenNext + Cloudflare Workers | `@opennextjs/cloudflare` (local patched tgz) |
| Payments | Dodo Payments | `dodopayments` ^2.47.0 |
| Email | Resend | `resend` ^6.22.1 |
| Media processing | FFmpeg (WASM) | `@ffmpeg/ffmpeg` ^0.12.15 |
| AI generation | Atlas Cloud API | custom client `src/lib/atlas.ts` |
| Icons | lucide-react | ^1.22.0 |
| Password hashing | bcryptjs | ^3.0.3 |

Notable: Prisma 7, Next 16, React 19, TS 6 — bleeding-edge versions. OpenNext is pinned to a local patched tgz (`@opennextjs/cloudflare: file:.../opennextjs-cloudflare-1.20.2-fixed.tgz`).

## 3. Data Model (prisma/schema.prisma)

- `User` — id, name, email (unique), emailVerified, image, password (hashed), credits (int, balance snapshot), locale, country, currency, createdAt
- `Account` / `Session` / `VerificationToken` — NextAuth standard
- `Creation` — userId, templateId, model, prompt, inputImage, status (pending|processing|persisting|completed|failed), taskId, getUrl, outputs (JSON), assets (JSON, drama structured intermediates), error, cost (credits charged)
- `CreditLedger` — userId, delta (+grant/-spend), reason (signup|purchase|redeem|generate|refund), ref
- `RedeemedCode` — code (PK), userId, amount (prevents Atlas redeem double-use)
- `AdProduct` — reusable product (name, description, imageUrl, sourceUrl)
- `AdAvatar` — reusable presenter (name, description, imageUrl)
- `BrandKit` — name, logoUrl, colors (JSON), fontNote, toneNote

**Gap vs. directive**: No BrandProfile (structured brand intelligence), no CreativeBrief/CreativeVariant/CreativeScore, no Workflow/WorkflowRun/WorkflowStep, no Asset/AssetVersion, no ReferenceCreativeAnalysis, no provider/capability registry, no candidate/version system. The reusable asset layer (AdProduct/AdAvatar/BrandKit) is minimal.

## 4. Generation Workflows (verified from source)

### 4.1 UGC Product Ad (`src/app/lazynext-studio`, `src/lib/lazynext-studio/*`)
- LLM (doubao-seed-2.1-turbo) drafts a `MarketingPlan` (title, ratio, product, character, scene, shots[])
- Per shot: nano-banana-2 t2i OR nano-banana/edit (with product+avatar ref images) → seedance-2.0/image-to-video
- 16 ad formats (UGC/commercial/tiktok categories), 12 hooks, settings, avatars — all data-driven (`formats.ts`, `hooks.ts`)
- Auto-detects language from product text
- Credit costs: plan=3, image=5/shot, video=12/shot (fixed) — though `video-pricing.ts` also exists for dynamic pricing

### 4.2 Reference to Ad (`src/app/ad-reference`, `src/lib/ad-reference.ts`)
- Upload reference ad video → gemini-omni-flash/video-edit swaps person+product in one step
- Optional: elevenlabs TTS (new voiceover) + veed/lipsync
- Fallback: kling-v2.6-pro/motion-control (when omni hits deepfake 1010002)
- Credit costs: edit=15, character=15, voice=10, lipsync=2, motion=15 (fixed)

### 4.3 AI Drama Ad (`src/app/drama-studio`, `src/lib/drama/prompt.ts`)
- LLM (gpt-5.5 primary, gemini-2.5-flash fallback) writes multi-character drama script JSON
- 6 style presets (epic/palace/wuxia/family/office/hero)
- Per character: costume reference photo; scene image; product image
- Per segment: seedance-2.0/reference-to-video with multi-ref consistency
- Robust JSON extraction with truncation-repair fallback

### 4.4 Ad Skit (`src/app/ad-skit`, `src/lib/ad-skit.ts`)
- LLM (deepseek-v4-pro / glm-5.2) writes 2-person 15s skit plan
- gpt-image-2 product image → seedance-2.0/reference-to-video (built-in audio)
- 6 comedy styles, 9 languages
- Credit costs: plan=4, image=2, video=25 (fixed)

## 5. Provider Abstraction (current state)

**Single vendor: Atlas Cloud** (`src/lib/atlas.ts`).
- `submitRawGen(endpoint, payload)` → POST `/model/{generateImage|generateVideo|generateAudio}`
- `pollOnce(getUrl)` → GET prediction URL
- `atlasChat(messages, model, maxTokens, timeout)` → POST LLM `/chat/completions`
- `uploadBlobToAtlas` / `uploadMedia` / `uploadRemoteMediaToAtlas`
- BYOK support via `x-atlas-key` header + AsyncLocalStorage (`request-context.ts`)

**Gap vs. directive**: No `ImageProvider`/`VideoProvider`/`TTSProvider`/`ASRProvider`/`ResearchProvider`/`AdAnalysisProvider`/`AdPublishingProvider` interfaces. All generation is hard-wired to Atlas Cloud. No model capability registry, no model router, no fallback chains (except drama script model fallback).

## 6. Credit Engine (`src/lib/credits.ts` + `src/lib/video-pricing.ts`)

- `getCredits`, `grantCredits` (allows negative for refund claw-backs), `deductCredits` (atomic conditional update; compensation on ledger failure)
- BYOK skips all credit movement
- Dynamic video pricing: `credits = ceil(perSec[resolution] × seconds × ACCOUNT_MARKUP(1.2) × MARGIN(1.5) / CREDIT_USD(0.065))`
- Per-second rates hardcoded for seedance, gemini-omni, kling, veo3.1, veed/lipsync
- Fixed costs for image/LLM/TTS in workflow files

**Gap vs. directive**: No credit reservation/settlement split, no idempotency keys, no estimated/max/actual cost split, no audit trail beyond CreditLedger. No unified cost registry — costs are scattered across `workflow.ts`, `ad-reference.ts`, `ad-skit.ts`.

## 7. Media Storage (`src/lib/media-storage*.ts`)

- Platform-selected at build time (`scripts/prepare-platform.mjs` by `BUILD_TARGET`)
- Local: file-based in `.dev-media/`
- Prod: Cloudflare R2 binding `MEDIA_BUCKET`
- Media sniffing by magic bytes (`sniffMedia` in atlas.ts)
- Public media URL handling for model APIs that need fetchable assets (`public-media-url.ts`)

## 8. Auth (`auth.ts`, `src/lib/auth.ts`)

- NextAuth v5 beta, JWT session
- Providers: Google OAuth + Credentials (email+password, bcrypt)
- Forgot-password / reset-password / signup / verify-email routes
- Rate limiting on auth routes (via `auth-rate-limit.ts`)
- Disposable email blocking (`disposable-emails.ts`)
- Admin gate via `ADMIN_EMAILS` env

## 9. Payments (`src/lib/payments/*`)

- Two providers: `dodo` (Dodo Payments) and `atlas` (redeem codes)
- `payments/index.ts` selects by `PAYMENT_PROVIDER` env
- Dodo webhook handler (`/api/webhook/dodo`) with refund claw-back
- Credit packs in `src/config/pricing.ts` (Starter/Pro/Elite)
- Multi-currency display (30 currencies, geo-detected)

## 10. Middleware / Security (`src/proxy.ts`)

- In-memory rate limiting (per-IP+category, per-isolate)
- Categories: ai-gen (10/min), upload (20/min), payment (5/min), poll (60/min), default (30/min)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP
- CVE-2026-3125 mitigation (cdn-cgi backslash bypass block)
- Geo/locale detection (cf-ipcountry → ipapi.co fallback → US default)
- Path-based locale routing (/zh, /ja, …)

## 11. Routes (verified from src/app tree)

**Pages**: `/` (home), `/lazynext-studio`, `/ad-reference`, `/drama-studio`, `/ad-skit`, `/assets`, `/dashboard`, `/my-work`, `/my-work/[id]`, `/pricing`, `/settings`, `/admin`, `/privacy`, `/terms`, `/reset-password`, `/error`, `/global-error`, `/not-found`

**API routes**: generation (lazynext-studio/*, ad-reference/*, ad-skit/*, drama-studio/*), assets (products/avatars/brand-kits/upload), auth (*, signup, forgot/reset-password, verify-email), checkout, redeem, webhook/dodo, creations/*, admin/*, me/*, media-storage/*, download, geo

## 12. Testing

- `npm test` → 34 tests, all passing (node:test runner, TS stripped)
- Test files: credits-refund, lazynext-polling, lazynext-resume, pricing, theme
- E2E: Playwright (home, navigation, studio specs)
- Tests replicate logic rather than importing modules (no DB dependency)

## 13. i18n

- 13 locales (en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id)
- Cookie + path-based locale switching
- RTL support for Arabic

## 14. Key Architectural Gaps (vs. directive target state)

1. **No provider abstraction** — Atlas Cloud is the only generation backend; no swappable interfaces
2. **No brand intelligence** — BrandKit is manual (name/logo/colors/tone); no URL→brand extraction
3. **No creative brief/strategy layer** — workflows go straight from product text to storyboard; no campaign objective/audience/angle/hook-generation step
4. **No reference creative analysis** — ad-reference swaps person/product but does not analyze hook/pacing/structure
5. **No candidate/version system** — single output per generation; no 5-hooks/3-scripts comparison
6. **No workflow engine** — generation is synchronous-ish (submit→poll), no durable WorkflowRun/Step state
7. **No unified asset system** — AdProduct/AdAvatar/BrandKit are minimal; no Asset/AssetVersion
8. **No creative scoring/QC** — no evaluation pipeline
9. **No agentic layer** — no conversational creative director, no tool contract
10. **No ad-platform integration** — no Meta/Google Ads, no performance feedback loop
11. **No model router** — model selection is hardcoded per workflow
12. **No observability events** — only console.error logging

## 15. Baseline Verification (2026-08-27)

- `git status`: clean on `main`, up to date with origin
- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (34/34)
- `npm run build`: not yet run in this session (Cloudflare target; will verify before any deploy-affecting change)
