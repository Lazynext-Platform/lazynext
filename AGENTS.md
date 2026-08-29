# Lazynext — Development Guide

## Local Development Setup

### Prerequisites
- Node.js 25+
- npm

### Environment
- `.env.local` contains local dev overrides (not committed to git)
- `NEXTAUTH_URL` and `AUTH_URL` must point to `http://localhost:3100`
- `ADMIN_EMAILS` lists emails authorized for the admin dashboard

### Running the dev server
```bash
npm run dev    # starts on port 3100 with BUILD_TARGET=local
```

### Mock Atlas Cloud API (for generation testing)
The mock Atlas server allows testing AI generation workflows without real API keys or credits.

```bash
npm run mock-atlas    # starts on port 3099
```

Set these env vars in `.env.local` (already configured):
```
ATLASCLOUD_BASE=http://localhost:3099/api/v1
ATLASCLOUD_LLM_BASE=http://localhost:3099/v1
ATLASCLOUD_API_KEY=mock-key-for-dev
```

The mock server:
- Returns realistic LLM responses for AI Expand, ad-skit plans, drama scripts, and marketing plans
- Simulates generation task lifecycle: pending → processing → completed (after 3 polls)
- Serves placeholder media files (1x1 PNG, minimal MP4, minimal WAV)
- Does NOT consume real credits or make external API calls

### Local Prisma (SQLite)
Local dev uses `better-sqlite3` via `src/lib/prisma.local.ts`.
Production uses Cloudflare D1 via `src/lib/prisma.cloudflare.ts`.
The `scripts/prepare-platform.mjs` script selects the correct implementation based on `BUILD_TARGET`.

### Local Media Storage
Local dev uses file-based media storage via `src/lib/media-storage.local.ts`.
Files are stored in `.dev-media/` directory.
Production uses Cloudflare R2 via `src/lib/media-storage.cloudflare.ts`.

## Verification Commands
```bash
npm run lint    # ESLint
npm test        # Node test runner (1424 tests)
# E2E: 430 passed, 3 skipped (chromium + mobile-chrome + chromium-auth)
npm run build   # Production build (Cloudflare target)
```

## Test Account
- Email: `test@lazynext.local`
- Password: `Test1234!`
- Credits: starts at 150
- Included in `ADMIN_EMAILS` for admin access

## Responsive Design
- Safe-area utilities: `pt-safe`, `pb-safe`, `safe-top`, `safe-bottom`, `safe-area`
- All pages tested across 280px–2560px viewports with no horizontal overflow
- RTL support via `dir="rtl"` and `lang="ar"` (cookie-based locale switching)
- Admin table uses `overflow-x-auto` container for horizontal scrolling on narrow screens
- Touch targets enlarged for coarse-pointer devices
- `touch-action: manipulation` on interactive elements

## Key Architecture
- Next.js 16 + React 19 + TypeScript 6
- Tailwind CSS 4
- NextAuth (JWT session, Google + Credentials providers)
- Prisma 7 with D1 (prod) / SQLite (local) — 28 tables total
- Cloudflare R2 (prod) / file-based (local) media storage
- Atlas Cloud AI generation API (prod) / mock server (local)
- Dodo Payments for billing
- Ad platform providers (Meta + Google Ads) with dry-run mode — see ADR-004
- Autonomous Creative Director agent loop — see ADR-005
- Performance learning loop (CreativePerformance model) — see ADR-006
- Conversational creative refinement — see ADR-007
- viral2viral remix flow — see ADR-008
- Provider registry + model router with plan-tier filtering (`src/lib/providers/registry.ts`,
  `src/lib/providers/router.ts`)
- OCR provider interface with dry-run stub (`src/lib/providers/ocr.ts`)
- Creative intelligence API routes: `/api/creative/director`, `/api/creative/performance`,
  `/api/creative/score`, `/api/creative/variants`, `/api/creative/assets`, `/api/creative/refine`,
  `/api/creative/remix`, `/api/creative/tools`, `/api/creative/templates`, `/api/creative/hooks`,
  `/api/creative/angles`, `/api/creative/script`, `/api/creative/storyboard`, `/api/creative/brief`,
  `/api/creative/brief-assistant`, `/api/creative/brief-intelligence`, `/api/creative/forecast`,
  `/api/creative/forecasting`, `/api/creative/testing-lab`, `/api/creative/ab-test`,
  `/api/creative/ab-test/plan`, `/api/creative/ab-test/results`, `/api/creative/brand-voice`,
  `/api/creative/brand-check`, `/api/creative/brand-concepts`, `/api/creative/creator-kits`,
  `/api/creative/clip-editor`, `/api/creative/media-service-boundary`, `/api/creative/quality-scoring`,
  `/api/creative/repurposing`, `/api/creative/audience-insights`, `/api/creative/trend-intelligence`,
  `/api/creative/personas`, `/api/creative/variant-matrix`, `/api/creative/fatigue`,
  `/api/creative/competitor-intel`, `/api/creative/compliance`, `/api/creative/budget-optimizer`,
  `/api/creative/scene-analysis`, `/api/creative/shot-planner`, `/api/creative/campaign-orchestrator`,
  `/api/creative/pipeline`, `/api/creative/pipeline/[id]`, `/api/creative/pipeline/templates`,
  `/api/creative/mcp-server`, `/api/creative/ml-insights`, `/api/creative/narrative`,
  `/api/creative/product-image`, `/api/creative/audio-studio/tts`, `/api/creative/audio-studio/voices`,
  `/api/creative/audio-studio/music`, `/api/creative/audio-studio/mix`, `/api/creative/viral-analysis`,
  `/api/creative/reference-analysis`, `/api/creative/reference-analysis/deep`,
  `/api/creative/inspiration`, `/api/creative/leaderboard`, `/api/creative/intelligence`,
  `/api/creative/skills`, `/api/creative/skills/list`, `/api/creative/skills/chain`,
  `/api/creative/url-to-brief`, `/api/creative/auto-variants`, `/api/creative/adapt-platform`,
  `/api/creative/calendar`, `/api/creative/schedule`, `/api/creative/optimal-times`,
  `/api/creative/approvals`, `/api/creative/approvals/stages`, `/api/creative/comments`,
  `/api/creative/comments/stream`, `/api/creative/share`, `/api/creative/share/[token]`,
  `/api/creative/diff`, `/api/creative/export`, `/api/creative/regenerate`
- Ad platform API routes: `/api/ads/create`, `/api/ads/metrics`, `/api/ads/list`, `/api/ads/report`,
  `/api/ads/budget`, `/api/ads/google-budget`, `/api/ads/google-report`, `/api/analytics/ga4`
- Editor API routes: `/api/editor/rough-cut`, `/api/editor/skills`, `/api/editor/timeline`,
  `/api/editor/timeline-versions`, `/api/editor/transcribe`, `/api/editor/ocr`, `/api/editor/chat`
- `/api/creative/director` returns an NDJSON stream of step-by-step progress updates; legacy
  non-streaming mode available via `?stream=false`
- Pipeline stages: brief, script, storyboard, media_generation, audio, edit, compliance, score, publish
- ADRs 001-031 in `docs/adr/` document all major architecture decisions
- Cross-feature handoffs: Brand Concepts → Creator Kits (query-param pre-fill),
  Brand Concepts → Shot Planner (script pre-fill), Clip Editor → Media Service Boundary (ASR/TTS)
- Dashboard "Quick Create" grid includes all production apps and the 4 newest features
  (Creator Kits, Brand Concepts, Clip Editor, Media Services)

## Production-Only Testing (Cannot Be Verified Locally)

The following items require production infrastructure, external credentials, or
physical hardware and cannot be tested in the local development environment:

| Item | Why Local Testing Is Insufficient | What's Verified Locally |
|------|-----------------------------------|------------------------|
| Real Atlas Cloud API | Mock returns placeholder content (1x1 PNG, minimal MP4) | API contract, polling lifecycle, error handling |
| Real Cloudflare R2 | Local uses file-based storage in `.dev-media/` | Upload/download/delete flow, media references |
| Real Dodo Payments | No real payment processing; checkout redirect verified only | Checkout URL construction, redirect handling |
| Real email delivery | Forgot-password flow verified but no actual email sent | Token generation, reset API, password update |
| Real Google OAuth | Button rendered, provider configured, needs real credentials | OAuth provider config, callback routing |
| Real Cloudflare D1 | Local uses SQLite via `better-sqlite3` | Prisma schema, queries, migrations |
| Physical device testing | Safe-area insets simulated via CSS `env()` utilities | CSS rules verified, `viewport-fit=cover` set |
| Screen reader testing | ARIA attributes verified via DOM inspection, not SR software | All ARIA roles, labels, announcements in place |
| Real network throttling | localhost is too fast for slow-3G simulation | Performance metrics collected (FCP 100ms, TTFB 41ms) |
| Ad Reference generation | Requires public URLs; localhost rejected by Atlas | UI flow, form validation, error handling |
| Redeem mode | Requires `PAYMENT_PROVIDER=atlas` | Code path exists, UI verified |
| Rate limiting (429) | In-memory limiter; 30/min default, 20/min uploads | 429 response format, `Retry-After` header, client error handling |
| Video playback | Mock media doesn't return real video format | Video element, controls, download flow |

## Accessibility Audit Summary

Completed across 15+ sessions:

- WCAG AA color contrast (light and dark themes)
- All interactive elements have visible focus indicators (2px solid outline)
- All inputs have accessible names (`aria-label`, `<label>`, or `title`)
- All icon-only buttons have `aria-label` or `title`
- All images have `alt` attributes
- All dialogs have `role="dialog"`, `aria-modal="true"`, and `aria-label`
- All error messages use `role="alert"` with semantic `text-danger` color
- All success/info messages use `role="status"` with semantic `text-success`/`text-warning`
- All tables have `<caption>` (sr-only) and `scope="col"` on headers
- Skip link to `#main-content` on all pages
- Every page has exactly one `<h1>`
- External links use `rel="noopener noreferrer"`
- `prefers-reduced-motion` media query implemented
- `@media print` styles implemented
- Safe-area insets on all fixed/sticky elements
- `touch-action: manipulation` on interactive elements
- 13 locale translations (en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id)
- RTL support for Arabic (`dir="rtl"`, `lang="ar"`)
- 0 horizontal overflow across 41 viewport combinations (375px–2560px, 200% zoom, RTL)

## Plan-Tier Aware Routing
- `src/lib/plan-tier.ts` exports `getUserPlanTier(userId)` which infers tier (free/starter/pro/elite) from the user's largest credit purchase
- All creative API routes call `getUserPlanTier(uid)` and pass the tier to intelligence functions
- The provider router selects models based on the user's tier
- `CREATIVE_MODEL` env override still takes precedence

## Telemetry
- `src/lib/telemetry.ts` provides structured JSON logging for tool execution and provider routing
- Logs are emitted via `console.log` (captured by Cloudflare Workers)
- `logToolExecution` — logs tool name, userId, cost, duration, success
- `logProviderRouting` — logs capability, planTier, selectedModel, fallback

## Editor Persistence
- Timelines are persisted to D1 via `prisma.timeline` model
- `GET /api/editor/timeline` — list user's saved timelines
- `POST /api/editor/timeline` with `save`/`load`/`delete` actions
- All persisted operations verify user ownership
- D1 migration applied to production (20 tables total)

## Editor Multimodal
- `POST /api/editor/transcribe` — video URL → ASR transcript (2 credits, whisper-large-v3)
- `POST /api/editor/ocr` — image URL → text extraction (1 credit, dry-run stub)
- Editor UI has Rough Cut, Skills, and Timeline tabs
- Director → Editor handoff uses word-count-based duration estimates

## Creative Template Library
- `CreativeTemplate` Prisma model — built-in (userId=null) and user-saved templates
- 5 categories: brief, hooks, angles, script, skill-bundle
- 15 built-in templates auto-seeded on first access
- `GET/POST/PUT/DELETE /api/creative/templates` — full CRUD with ownership verification
- `/templates` page with category filters, search, favorites, and preview modal
- Templates nav link in header (visible lg+)

## Batch Generation
- Generate 2-5 creative variants in parallel via Promise.allSettled
- Comparison grid with per-variant scoring and "Use This" selection
- Reuses existing API endpoints (hooks, angles, scripts, score)
- Partial success handling — shows successful variants even if some fail

## Timeline Versioning
- `TimelineVersion` Prisma model — sequential version snapshots per timeline
- `GET/POST/PUT/DELETE /api/editor/timeline-versions`
- Restore creates a pre-restore snapshot (undoable)
- All operations verify timeline ownership

## Pro Export Formats
- FCPXML (Final Cut Pro 1.10), Premiere Pro XML, DaVinci Resolve XML, SRT subtitles
- `POST /api/editor/rough-cut` with format=fcpxml|premiere|davinci|srt
- All formats generated server-side, no external dependencies

