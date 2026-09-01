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
npm test        # Node test runner (6188+ tests)
# E2E: 1052+ passed, 0 skipped (chromium + mobile-chrome + chromium-auth)
npm run build   # Production build (Cloudflare target)
npm run cf:build  # Cloudflare/OpenNext build
npm run cf:deploy # Deploy to Cloudflare Workers
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
- Prisma 7 with D1 (prod) / SQLite (local) — 37 tables total (including Hook model)
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
  `/api/creative/diff`, `/api/creative/export`, `/api/creative/regenerate`,
  `/api/creative/product-brief`, `/api/creative/reference-remix`, `/api/creative/multi-concept`,
  `/api/creative/performance-loop`, `/api/creative/skill-chain-builder`,
  `/api/creative/brand-guardrails`, `/api/creative/smart-calendar`,
  `/api/creative/competitor-watch`, `/api/creative/ad-copy-generator`,
  `/api/creative/hook-library`, `/api/creative/brief-template-builder`,
  `/api/creative/ad-script-writer`, `/api/creative/audience-persona-generator`,
  `/api/creative/variant-matrix-generator`, `/api/creative/ad-concept-merger`,
  `/api/creative/brief-analyzer`, `/api/creative/ad-format-optimizer`,
  `/api/creative/mood-board-generator`, `/api/creative/ad-performance-predictor`,
  `/api/creative/ab-test-planner-v2`, `/api/creative/hook-tester`,
  `/api/creative/trend-spotter`, `/api/creative/brand-voice-analyzer`,
  `/api/creative/ad-caption-generator`, `/api/creative/ad-headline-generator`,
  `/api/creative/angle-finder`, `/api/creative/ad-timing-optimizer`,
  `/api/creative/creative-fatigue-detector`, `/api/creative/ad-cta-optimizer`,
  `/api/creative/concept-expander`, `/api/creative/ad-story-generator`,
  `/api/creative/ad-color-palette-generator`, `/api/creative/ad-thumbnail-generator`,
  `/api/creative/ad-font-pairing-generator`, `/api/creative/ad-hashtag-generator`,
  `/api/creative/creative-scene-generator`, `/api/creative/ad-music-mood-matcher`,
  `/api/creative/ad-voiceover-script-generator`, `/api/creative/creative-brief-generator`,
  `/api/creative/ad-placement-strategist`, `/api/creative/ad-ab-test-name-generator`,
  `/api/creative/creative-hook-revamp-generator`, `/api/creative/ad-audience-segment-builder`,
  `/api/creative/creative-concept-validator`, `/api/creative/ad-emotion-analyzer`,
  `/api/creative/creative-format-converter`, `/api/creative/ad-budget-allocator`,
  `/api/creative/creative-trend-adapter`, `/api/creative/ad-creative-sequencer`,
  `/api/creative/brand-story-architect`, `/api/creative/ad-localization-adapter`,
  `/api/creative/creative-performance-forecaster`, `/api/creative/ad-sentiment-tuner`,
  `/api/creative/creative-hook-matrix-generator`, `/api/creative/ad-creative-rotator`,
  `/api/creative/brand-voice-consistency-checker`, `/api/creative/ad-persona-matcher`,
  `/api/creative/creative-concept-expander-pro`, `/api/creative/ad-competitive-intelligence`,
  `/api/creative/creative-quality-scorer`, `/api/creative/ad-audience-resonance-predictor`,
  `/api/creative/creative-format-recommender`, `/api/creative/ad-creative-lifecycle-manager`,
  `/api/creative/creative-sentiment-journey-mapper`, `/api/creative/ad-creative-ab-test-simulator`,
  `/api/creative/creative-visual-hierarchy-analyzer`, `/api/creative/ad-audience-pain-point-mapper`,
  `/api/creative/creative-messaging-framework-builder`,
  `/api/creative/ad-creative-burnout-detector`, `/api/creative/creative-ad-concept-synthesizer`,
  `/api/creative/ad-audience-psychographic-profiler`, `/api/creative/creative-ad-tone-calibrator`,
  `/api/creative/creative-ad-format-innovator`, `/api/creative/ad-creative-story-arc-designer`,
  `/api/creative/creative-ad-persuasion-strategist`, `/api/creative/ad-creative-hook-timing-optimizer`,
  `/api/creative/creative-ad-metaphor-generator`, `/api/creative/ad-creative-sensory-enhancer`,
  `/api/creative/creative-ad-pattern-interrupt-designer`, `/api/creative/ad-creative-social-proof-architect`,
  `/api/creative/creative-ad-anticipation-builder`, `/api/creative/ad-creative-contrast-amplifier`,
  `/api/creative/creative-ad-micro-moment-designer`, `/api/creative/ad-creative-emotion-sequencer`,
  `/api/creative/creative-ad-narrative-twist-designer`, `/api/creative/ad-creative-memory-anchor-builder`,
  `/api/creative/creative-ad-tension-release-strategist`, `/api/creative/ad-creative-sensory-contrast-designer`,
  `/api/creative/creative-ad-curiosity-gap-designer`, `/api/creative/ad-creative-rhythm-pacing-optimizer`,
  `/api/creative/creative-ad-visual-hierarchy-strategist`, `/api/creative/ad-creative-sound-design-strategist`,
  `/api/creative/creative-ad-surprise-element-designer`, `/api/creative/ad-creative-callback-memory-designer`,
  `/api/creative/creative-ad-climax-architect`, `/api/creative/ad-creative-pacing-variability-designer`,
  `/api/creative/creative-ad-foreshadowing-designer`, `/api/creative/ad-creative-emotional-pivot-designer`,
  `/api/creative/creative-ad-resolution-designer`, `/api/creative/ad-creative-viewer-reward-designer`
- Ad platform API routes: `/api/ads/create`, `/api/ads/metrics`, `/api/ads/list`, `/api/ads/report`,
  `/api/ads/budget`, `/api/ads/google-budget`, `/api/ads/google-report`, `/api/analytics/ga4`,
  `/api/ads/meta-safety`, `/api/ads/meta-approve`, `/api/ads/google-safety`, `/api/ads/google-approve`
- Editor API routes: `/api/editor/rough-cut`, `/api/editor/skills`, `/api/editor/timeline`,
  `/api/editor/timeline-versions`, `/api/editor/transcribe`, `/api/editor/ocr`, `/api/editor/chat`
- `/api/creative/director` returns an NDJSON stream of step-by-step progress updates; legacy
  non-streaming mode available via `?stream=false`
- Pipeline stages: brief, script, storyboard, media_generation, audio, edit, compliance, score, publish
- ADRs 001-142 in `docs/adr/` document all major architecture decisions
- Cross-feature handoffs: Brand Concepts → Creator Kits (query-param pre-fill),
  Brand Concepts → Shot Planner (script pre-fill), Clip Editor → Media Service Boundary (ASR/TTS)
- Dashboard uses `CategorizedAppGrid` (`src/components/CategorizedAppGrid.tsx`) with 13
  collapsible category sections, integrated feature search, and category filter tabs.
  Categories are defined in `src/config/navCategories.ts`. All ~158 features are discoverable
  via search or category browsing. The previous flat "Quick Create" grid (159 tiles) has been
  replaced.
- Shell nav (`src/components/Shell.tsx`) uses 5 primary nav items (Dashboard, Create, Optimize,
  Manage, Insights) plus a "Browse" dropdown with all 13 categories and embedded feature search
  (`src/components/FeatureSearch.tsx`, Cmd+K shortcut). A mobile hamburger menu provides
  categorized access on narrow screens. The previous 181-link flat header nav has been replaced.
- Shared creative toolkit (`src/lib/creative/toolkit.ts`) centralizes model resolution, dry-run
  detection, JSON extraction, value coercion (asStr/asNum/asObj/asStrArr), and Atlas
  generation/chat access. 155 of 181 creative libraries use the toolkit; 16 retain custom
  helper variants where behavior differs (e.g. extractJson returning {} on failure vs throwing).

### JJ-Series: Research-Derived Creative Capabilities
- Product Page → Ad Brief (`/product-brief`): URL/product extraction → brand/product brief →
  3 ad angles → 3 UGC scripts → 5-scene storyboard → Atlas-ready generation prompt.
  5 credits. API: `POST /api/creative/product-brief`. See ADR-032.
- Reference Remix Pipeline (`/reference-remix`): reference video/image/ad copy → evidence
  extraction (hooks, angles, pacing, visual style, emotional beats, CTA) → creative analysis →
  remix brief with self-contained generation prompt. 4 credits.
  API: `POST /api/creative/reference-remix`. See ADR-033.
- Multi-Concept Hook Engine (`/multi-concept`): generates 6 concepts using distinct emotional
  triggers (fear, aspiration, humor, urgency, curiosity, social_proof) with heuristic
  recommendation and A/B fork support. 6 credits.
  API: `POST /api/creative/multi-concept`. See ADR-034.
- Meta Ads Safety Layer (`/meta-safety`): dry-run mode, admin approval workflow, daily/campaign
  spend caps, mutation caps, blocked/allowed actions, threshold warnings, 24h-TTL audit log.
  API: `GET/POST /api/ads/meta-safety`, `GET/POST /api/ads/meta-approve`. See ADR-035.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- E2E coverage: `e2e/new-features.spec.ts` (16 tests covering API contracts + page smoke tests)

### LL-Series: Extended Creative Capabilities
- Google Ads Safety Layer (`/google-safety`): mirrors Meta Safety for Google Ads — dry-run,
  approval workflow, spend caps ($200 daily/$100 campaign), mutation caps, blocked delete actions,
  24h-TTL audit log. API: `GET/POST /api/ads/google-safety`, `GET/POST /api/ads/google-approve`.
  See ADR-036.
- Creative Performance Loop (`/performance-loop`): closes the loop between past campaign
  performance and future briefs — queries CreativePerformance records, feeds insights to Atlas LLM,
  generates improved briefs with expected lift. 5 credits.
  API: `POST /api/creative/performance-loop`. See ADR-037.
- Viral Content Analyzer (`/viral-analyzer`): UI page for existing viral-analysis API — renders
  virality score (0-100), grade (F-A+), factors, shareability, hook analysis, emotional journey,
  pacing, trend alignment, viral mechanics, audience psychology, improvement recommendations.
  6 credits. API: `POST /api/creative/viral-analysis` (existing). See ADR-038.
- Agent Skill Chain Builder (`/skill-chains`): enhanced skill chaining with conditional branching
  (5 condition types: output_contains, output_gt, output_lt, output_equals, platform_is).
  3 built-in enhanced chains (adaptive-hook, platform-optimized, performance-driven).
  8 credits. API: `POST /api/creative/skill-chain-builder`. See ADR-039.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 35 (google-safety) + 18 (performance-loop) + 39 (skill-chain-builder) = 92 new tests

### RR-Series: Production Audit + Three New Features
- Brand Guardrails (`/brand-guardrails`): AI-powered brand consistency checker.
  Analyzes creatives against brand guidelines (voice, visual, messaging).
  Returns score (0-100), grade (F-A+), violations with severity, recommendations.
  4 credits. API: `POST /api/creative/brand-guardrails`. See ADR-044.
- Smart Calendar (`/smart-calendar`): Multi-platform content calendar with
  AI-suggested optimal posting times. Considers platform best practices,
  audience timezone, content type, and historical performance. 3 credits.
  API: `POST /api/creative/smart-calendar`. See ADR-045.
- Competitor Watch (`/competitor-watch`): Competitor ad monitoring with
  automatic creative analysis and alerts. Extracts hooks, angles, CTAs,
  visual style, emotional triggers, pricing strategy. Generates competitive
  gaps and counter-strategies. 5 credits.
  API: `POST /api/creative/competitor-watch`. See ADR-046.
- All 3 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 3 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 26 (brand-guardrails) + 36 (smart-calendar) + 23 (competitor-watch) = 85 new tests
- Production audit fixes: pipeline.title translation fix (was nested in `legal` object),
  missing h1 on /dashboard, /creative-studio, /ugc-studio, /observability unauthenticated views
- Video rendering research: RendoBar recommended for EDL rendering (see research/video-rendering-services.md)

### TT-Series: Three AI Creative Tools + D1 Persistence
- Ad Copy Generator (`/ad-copy-generator`): AI-powered platform-specific ad copy.
  Generates TikTok, Instagram, and YouTube copy from a product URL or brief.
  Returns headline, body copy, CTA, hashtags, description.
  3 credits. API: `POST /api/creative/ad-copy-generator`. See ADR-047.
- Hook Library (`/hook-library`): AI-powered hook library with D1 persistence.
  Generates, categorizes, and stores reusable hooks by emotional trigger and platform.
  Predicted performance score (0-100). Hooks persisted to D1 via Prisma Hook model.
  4 credits. API: `POST /api/creative/hook-library`. See ADR-048.
- Brief Template Builder (`/brief-template-builder`): AI-powered creative brief
  templates with industry-specific presets (8 industries) and smart suggestions.
  4 credits. API: `POST /api/creative/brief-template-builder`. See ADR-049.
- Ad Script Writer (`/ad-script-writer`): AI-powered multi-scene ad scripts with
  visual cues, voiceover, B-roll notes, and timing for TikTok, YouTube, Instagram.
  5 credits. API: `POST /api/creative/ad-script-writer`. See ADR-050.
- Audience Persona Generator (`/audience-persona-generator`): AI-powered audience
  personas with demographics, psychographics, pain points, and platform behavior.
  4 credits. API: `POST /api/creative/audience-persona-generator`. See ADR-051.
- Creative Variant Matrix (`/variant-matrix-generator`): AI-powered creative variant
  matrix across hooks, angles, formats, and platforms for A/B testing.
  5 credits. API: `POST /api/creative/variant-matrix-generator`. See ADR-052.
- All 6 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 6 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Hook Library uses D1 persistence via Prisma Hook model (per-user ownership)
- Unit tests: 25 (ad-copy-generator) + 19 (hook-library) + 16 (brief-template-builder) + 29 (ad-script-writer) + 12 (audience-persona-generator) + 11 (variant-matrix-generator) = 112 new tests

### TT3-Series: Three More AI Creative Tools
- Ad Concept Merger (`/ad-concept-merger`): AI-powered concept merger.
  Combines multiple hooks, angles, and scripts into one unified ad concept
  with AI-resolved conflicts and flow score. 5 credits.
  API: `POST /api/creative/ad-concept-merger`. See ADR-053.
- Creative Brief Analyzer (`/brief-analyzer`): AI-powered brief analyzer.
  Audits creative briefs for strengths, gaps, missing elements, and
  improvement suggestions. Returns overall score (0-100), grade (F-A+),
  section analysis, and recommendations. 4 credits.
  API: `POST /api/creative/brief-analyzer`. See ADR-054.
- Ad Format Optimizer (`/ad-format-optimizer`): AI-powered format optimizer.
  Recommends best ad format (single image, carousel, video, story, reel,
  collection) based on product, audience, platform, budget, and goals.
  4 credits. API: `POST /api/creative/ad-format-optimizer`. See ADR-055.
- All 3 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 3 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 23 (ad-concept-merger) + 30 (brief-analyzer) + 29 (ad-format-optimizer) = 82 new tests
- Production audit fix: /calendar page no longer makes API calls during loading state

### TT4-Series: Three More AI Creative Tools
- Mood Board Generator (`/mood-board-generator`): AI-powered mood boards with color palettes,
  typography, imagery themes, and emotional tone from brand and style keywords.
  4 credits. API: `POST /api/creative/mood-board-generator`. See ADR-056.
- Ad Performance Predictor (`/ad-performance-predictor`): AI-powered pre-launch performance
  prediction — forecasts CTR, engagement, conversion likelihood, and virality score with
  strengths, risks, and recommendations. 5 credits.
  API: `POST /api/creative/ad-performance-predictor`. See ADR-057.
- Creative A/B Test Planner (`/ab-test-planner`): AI-powered A/B test experiment design with
  hypothesis, variants, metrics, sample size, duration, confidence level, and success/failure
  criteria. 4 credits. API: `POST /api/creative/ab-test-planner-v2`. See ADR-058.
- All 3 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 3 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2099 total (was 2058)
- E2E tests: 839 total (was 776)
- Translations added to all 13 locales for 3 new namespaces: moodBoardGenerator,
  adPerformancePredictor, abTestPlannerV2
- Fixed nav link test (Performance vs Performance Predictor exact match)

### TT5-Series: Four More AI Creative Tools
- Creative Hook Tester (`/hook-tester`): AI-powered hook testing — rank multiple ad hooks
  by predicted performance before launch. 3 credits.
  API: `POST /api/creative/hook-tester`. See ADR-059.
- Trend Spotter (`/trend-spotter`): AI-powered trend discovery — identify trending topics,
  hashtags, and content styles for your niche. 5 credits.
  API: `POST /api/creative/trend-spotter`. See ADR-060.
- Brand Voice Analyzer (`/brand-voice-analyzer`): AI-powered brand voice analysis — extract
  tone, personality, and style guidelines from sample content. 4 credits.
  API: `POST /api/creative/brand-voice-analyzer`. See ADR-061.
- Ad Caption Generator (`/ad-caption-generator`): AI-powered ad captions — generate
  platform-specific captions with emojis, hashtags, and CTAs. 3 credits.
  API: `POST /api/creative/ad-caption-generator`. See ADR-062.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2195 total (was 2099)
- E2E tests: 839 total (unchanged from TT4, new tests replaced old counts)
- Translations added to all 13 locales for 4 new namespaces: hookTester, trendSpotter,
  brandVoiceAnalyzer, adCaptionGenerator

### TT6-Series: Four More AI Creative Tools
- Ad Headline Generator (`/ad-headline-generator`): AI-powered ad headlines — generate
  attention-grabbing headlines optimized for specific platforms with hook types and predicted
  impact. 3 credits. API: `POST /api/creative/ad-headline-generator`. See ADR-063.
- Creative Angle Finder (`/angle-finder`): AI-powered angle discovery — find unique marketing
  angles across psychological triggers with uniqueness scores. 4 credits.
  API: `POST /api/creative/angle-finder`. See ADR-064.
- Ad Timing Optimizer (`/ad-timing-optimizer`): AI-powered ad timing — find optimal times to
  run ads based on platform, audience, and timezone with confidence scores. 3 credits.
  API: `POST /api/creative/ad-timing-optimizer`. See ADR-065.
- Creative Fatigue Detector (`/creative-fatigue-detector`): AI-powered fatigue detection —
  detect when creatives need refreshing from performance metrics with fatigue scores and
  refresh urgency. 4 credits.
  API: `POST /api/creative/creative-fatigue-detector`. See ADR-066.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2298 total (was 2195)
- E2E tests: 903 total (was 839)
- Translations added to all 13 locales for 4 new namespaces: adHeadlineGenerator, angleFinder,
  adTimingOptimizer, creativeFatigueDetector

### TT7-Series: Four More AI Creative Tools
- Ad CTA Optimizer (`/ad-cta-optimizer`): AI-powered CTA optimization. Generates optimized
  CTAs with action verbs, psychological triggers, predicted conversion lift, and platform fit.
  3 credits. API: `POST /api/creative/ad-cta-optimizer`. See ADR-067.
- Creative Concept Expander (`/concept-expander`): Expands a seed concept into multiple
  fully fleshed-out creative directions with title, description, hook, visual direction, tone,
  format, unique angle, and production difficulty. 4 credits.
  API: `POST /api/creative/concept-expander`. See ADR-068.
- Ad Story Generator (`/ad-story-generator`): Generates compelling ad narratives with
  emotional arcs. Supports 5 story types (transformation, journey, conflict, resolution,
  aspiration). Returns multi-act story with visual notes, voiceover, emotion beats, and CTA
  integration. 5 credits. API: `POST /api/creative/ad-story-generator`. See ADR-069.
- Ad Color Palette Generator (`/ad-color-palette-generator`): Generates optimized color
  palettes for ad creatives based on product, platform, and emotional goal. Supports 6
  emotions (energetic, calm, luxury, trust, playful, urgent). Returns palettes with
  primary/secondary/accent/background/text colors, platform fit, and color psychology.
  3 credits. API: `POST /api/creative/ad-color-palette-generator`. See ADR-070.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2415 total (was 2298)
- E2E tests: 996+ total (was 903)
- Translations added to all 13 locales for 4 new namespaces: adCtaOptimizer, conceptExpander,
  adStoryGenerator, adColorPaletteGenerator

### TT8-Series: Four More AI Creative Tools
- Ad Thumbnail Generator (`/ad-thumbnail-generator`): AI-powered thumbnail/cover image concept
  generator for video ads. Generates optimized thumbnails with visual description, text overlay,
  text position, font style, color scheme, emotion, and predicted CTR score.
  4 credits. API: `POST /api/creative/ad-thumbnail-generator`. See ADR-071.
- Ad Font Pairing Generator (`/ad-font-pairing-generator`): AI-powered font pairing
  recommendations for ad creatives. Each pairing includes heading font, body font, style
  description, mood, readability score, platform fit, and use case.
  3 credits. API: `POST /api/creative/ad-font-pairing-generator`. See ADR-072.
- Ad Hashtag Generator (`/ad-hashtag-generator`): AI-powered platform-optimized hashtag
  generator. Returns hashtags categorized by type (branded, trending, niche, community,
  campaign) with estimated reach, competition level, and recommended flag.
  2 credits. API: `POST /api/creative/ad-hashtag-generator`. See ADR-073.
- Creative Scene Generator (`/creative-scene-generator`): AI-powered detailed scene description
  generator for ad video shoots. Each scene includes shot type, camera angle, lighting, setting,
  props, actor notes, dialogue/voiceover, duration, and mood. Returns total duration.
  5 credits. API: `POST /api/creative/creative-scene-generator`. See ADR-074.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2534 total (was 2415)
- E2E tests: 1052+ total (was 996+)
- Translations added to all 13 locales for 4 new namespaces: adThumbnailGenerator,
  adFontPairingGenerator, adHashtagGenerator, creativeSceneGenerator

### TT9-Series: Four More AI Creative Tools
- Ad Music Mood Matcher (`/ad-music-mood-matcher`): AI-powered music genre/mood matcher for
  ad content. Returns music recommendations with genre, subGenre, mood, tempoBPM, energyLevel
  (1-10), instruments, description, bestForScene, and licenseType.
  3 credits. API: `POST /api/creative/ad-music-mood-matcher`. See ADR-075.
- Ad Voiceover Script Generator (`/ad-voiceover-script-generator`): AI-powered voiceover script
  generator for ads. Returns a structured script with segments (segmentNumber, text, timing,
  direction, emphasis, pauseAfter), totalDuration, wordsPerMinute, and toneNotes.
  4 credits. API: `POST /api/creative/ad-voiceover-script-generator`. See ADR-076.
- Creative Brief Generator (`/creative-brief-generator`): AI-powered complete creative brief
  generator from minimal input. Returns a structured brief with objective, targetAudience,
  keyMessage, tone, deliverables, timeline, budgetGuidance, successMetrics, creativeDirection,
  and platformRecommendations.
  4 credits. API: `POST /api/creative/creative-brief-generator`. See ADR-077.
- Ad Placement Strategist (`/ad-placement-strategist`): AI-powered ad placement strategist.
  Returns a strategy with summary, placements (platform, placementType, format, audienceFit,
  estimatedCPM, estimatedReach, expectedPerformance, priority), budgetAllocation, timeline,
  and risks.
  5 credits. API: `POST /api/creative/ad-placement-strategist`. See ADR-078.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2638 total (was 2534)
- E2E tests: 1052+ total (same — only TT9 page/API tests added, not full suite rerun for docs)
- Translations added to all 13 locales for 4 new namespaces: adMusicMoodMatcher,
  adVoiceoverScriptGenerator, creativeBriefGenerator, adPlacementStrategist

### TT10-Series: Four More AI Creative Tools
- Ad A/B Test Name Generator (`/ad-ab-test-name-generator`): AI-powered A/B test name
  generator. Returns test names with variant labels, hypothesis, category, and description.
  2 credits. API: `POST /api/creative/ad-ab-test-name-generator`. See ADR-079.
- Creative Hook Revamp Generator (`/creative-hook-revamp-generator`): AI-powered hook revamp
  generator. Takes an existing hook and generates revamped versions with different angles,
  emotional triggers, and formats. Returns revamps with revampedHook, angle, emotionalTrigger,
  formatChange, predictedLift, and reasoning.
  3 credits. API: `POST /api/creative/creative-hook-revamp-generator`. See ADR-080.
- Ad Audience Segment Builder (`/ad-audience-segment-builder`): AI-powered audience segment
  builder for ad targeting. Returns segments with demographics (ageRange, gender, location,
  income), interests, behaviors, platformTargeting, estimatedReach, recommendedAdFormat,
  and priority.
  4 credits. API: `POST /api/creative/ad-audience-segment-builder`. See ADR-081.
- Creative Concept Validator (`/creative-concept-validator`): AI-powered creative concept
  validator. Returns a validation report with overallScore (0-100), grade (F-A+), platformFit,
  brandSafety, engagementPotential, clarity, originality, issues (with severity, description,
  suggestion), strengths, recommendations, and verdict.
  5 credits. API: `POST /api/creative/creative-concept-validator`. See ADR-082.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2736 total (was 2638)
- E2E tests: 1052+ total (same — only TT10 page/API tests added, not full suite rerun for docs)
- Translations added to all 13 locales for 4 new namespaces: adABTestNameGenerator,
  creativeHookRevampGenerator, adAudienceSegmentBuilder, creativeConceptValidator

### TT11-Series: Four More AI Creative Tools
- Ad Emotion Analyzer (`/ad-emotion-analyzer`): AI-powered emotional impact analyzer for ad
  content. Analyzes dominant emotions, emotion scores, emotional journey, resonance,
  authenticity, and improvement recommendations.
  3 credits. API: `POST /api/creative/ad-emotion-analyzer`. See ADR-083.
- Creative Format Converter (`/creative-format-converter`): AI-powered creative content
  converter between ad formats (long-form, short-form, image-ad, video-script, carousel,
  story) with platform optimizations.
  4 credits. API: `POST /api/creative/creative-format-converter`. See ADR-084.
- Ad Budget Allocator (`/ad-budget-allocator`): AI-powered ad budget allocator across
  platforms. Returns percentages, amounts, expected outcomes, and rationale.
  4 credits. API: `POST /api/creative/ad-budget-allocator`. See ADR-085.
- Creative Trend Adapter (`/creative-trend-adapter`): AI-powered creative content adapter
  to current trends. Returns relevance scores, timing advice, and longevity scoring.
  3 credits. API: `POST /api/creative/creative-trend-adapter`. See ADR-086.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2830 total (was 2736)
- TT11 page E2E tests: 64 passing
- TT11 API E2E tests: 12 passing
- TT11 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: adEmotionAnalyzer,
  creativeFormatConverter, adBudgetAllocator, creativeTrendAdapter

### TT12-Series: Four More AI Creative Tools
- Ad Creative Sequencer (`/ad-creative-sequencer`): AI-powered multi-touch campaign narrative
  sequencer. Sequences multiple creatives into a coherent campaign narrative with stages,
  transitions, and timing.
  4 credits. API: `POST /api/creative/ad-creative-sequencer`. See ADR-087.
- Brand Story Architect (`/brand-story-architect`): AI-powered brand story arc builder.
  Builds brand story arcs with acts, character roles, conflict, resolution, and ad-ready
  story beats.
  5 credits. API: `POST /api/creative/brand-story-architect`. See ADR-088.
- Ad Localization Adapter (`/ad-localization-adapter`): AI-powered ad localization adapter.
  Adapts ads for different regional/cultural markets with cultural notes, idiom adaptations,
  color/symbol considerations, and compliance flags.
  4 credits. API: `POST /api/creative/ad-localization-adapter`. See ADR-089.
- Creative Performance Forecaster (`/creative-performance-forecaster`): AI-powered creative
  performance forecaster. Forecasts creative performance with confidence intervals for CTR,
  engagement, conversion, and reach.
  5 credits. API: `POST /api/creative/creative-performance-forecaster`. See ADR-090.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 2938 total (was 2830) — 108 new tests across 4 new test suites
- TT12 page E2E tests: 64 passing
- TT12 API E2E tests: 12 passing
- TT12 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: adCreativeSequencer,
  brandStoryArchitect, adLocalizationAdapter, creativePerformanceForecaster

### TT13-Series: Four More AI Creative Tools
- Ad Sentiment Tuner (`/ad-sentiment-tuner`): AI-powered ad sentiment tuner. Tunes ad
  sentiment with before/after scores, word changes, and audience alignment.
  3 credits. API: `POST /api/creative/ad-sentiment-tuner`. See ADR-091.
- Creative Hook Matrix Generator (`/creative-hook-matrix-generator`): AI-powered hook matrix
  generator. Generates a matrix of hooks across emotional triggers and platforms with
  predicted scores.
  5 credits. API: `POST /api/creative/creative-hook-matrix-generator`. See ADR-092.
- Ad Creative Rotator (`/ad-creative-rotator`): AI-powered creative rotator. Generates
  creative variations with a rotation schedule and fatigue resistance scores.
  4 credits. API: `POST /api/creative/ad-creative-rotator`. See ADR-093.
- Brand Voice Consistency Checker (`/brand-voice-consistency-checker`): AI-powered brand
  voice consistency checker. Checks content for brand voice consistency with dimension
  scores, violations, and corrections.
  4 credits. API: `POST /api/creative/brand-voice-consistency-checker`. See ADR-094.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3049 total (was 2938) — 84 new tests across 4 new test suites
- TT13 page E2E tests: 64 passing
- TT13 API E2E tests: 12 passing
- TT13 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)

### TT14-Series: Four More AI Creative Tools
- Ad Persona Matcher (`/ad-persona-matcher`): AI-powered ad persona matcher. Matches ad
  content against audience personas with persona match cards, content adjustments, overall
  alignment, and best match recommendation.
  4 credits. API: `POST /api/creative/ad-persona-matcher`. See ADR-095.
- Creative Concept Expander Pro (`/creative-concept-expander-pro`): AI-powered concept
  expander. Expands a concept into a broader campaign ecosystem with variations, extensions,
  creative directions, and cross-platform adaptations. Supports shallow (3), standard (5),
  and deep (8) expansion depths.
  5 credits. API: `POST /api/creative/creative-concept-expander-pro`. See ADR-096.
- Ad Competitive Intelligence (`/ad-competitive-intelligence`): AI-powered competitive
  intelligence. Analyzes competitive landscape with competitor strengths/weaknesses, market
  positioning, positioning gaps, differentiation opportunities, and counter-strategies.
  5 credits. API: `POST /api/creative/ad-competitive-intelligence`. See ADR-097.
- Creative Quality Scorer (`/creative-quality-scorer`): AI-powered creative quality scorer.
  Scores creative across 7 quality dimensions with overall score, grade (F-A+), issues,
  strengths, fixes, and improvement suggestions.
  3 credits. API: `POST /api/creative/creative-quality-scorer`. See ADR-098.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3160 total (was 3049) — 111 new tests across 4 new test suites
- TT14 page E2E tests: 64 passing
- TT14 API E2E tests: 12 passing
- TT14 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: adPersonaMatcher,
  creativeConceptExpanderPro, adCompetitiveIntelligence, creativeQualityScorer

### TT15-Series: Four More AI Creative Tools
- Ad Audience Resonance Predictor (`/ad-audience-resonance-predictor`): AI-powered audience
  resonance predictor. Predicts how well ad content resonates with audience segments with
  segment scores, emotional triggers, resonance factors, and audience fit analysis.
  4 credits. API: `POST /api/creative/ad-audience-resonance-predictor`. See ADR-099.
- Creative Format Recommender (`/creative-format-recommender`): AI-powered format recommender.
  Recommends the best creative formats (video, carousel, image, story, text) for a given
  product/brand and campaign goal with scores, rationale, best use cases, and platform tips.
  3 credits. API: `POST /api/creative/creative-format-recommender`. See ADR-100.
- Ad Creative Lifecycle Manager (`/ad-creative-lifecycle-manager`): AI-powered lifecycle
  manager. Manages ad creative lifecycle from launch to retirement with stage analysis,
  health indicators, refresh recommendations, performance predictions, and retirement signals.
  5 credits. API: `POST /api/creative/ad-creative-lifecycle-manager`. See ADR-101.
- Creative Sentiment Journey Mapper (`/creative-sentiment-journey-mapper`): AI-powered
  sentiment journey mapper. Maps the emotional/sentiment journey of ad creative content with
  beats, emotional arc, sentiment transitions, peak moments, and recommendations.
  4 credits. API: `POST /api/creative/creative-sentiment-journey-mapper`. See ADR-102.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3315 total (was 3160) — 155 new tests across 4 new test suites
- TT15 page E2E tests: 64 passing
- TT15 API E2E tests: 12 passing
- TT15 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: adAudienceResonancePredictor,
  creativeFormatRecommender, adCreativeLifecycleManager, creativeSentimentJourneyMapper

### TT16-Series: Four More AI Creative Tools
- Ad Creative A/B Test Simulator (`/ad-creative-ab-test-simulator`): AI-powered A/B test
  simulator. Simulates A/B test outcomes before running them with predicted winner, confidence
  score, per-variant predicted metrics, statistical significance estimate, and key differences.
  5 credits. API: `POST /api/creative/ad-creative-ab-test-simulator`. See ADR-103.
- Creative Visual Hierarchy Analyzer (`/creative-visual-hierarchy-analyzer`): AI-powered visual
  hierarchy analyzer. Analyzes visual hierarchy of ad creative layouts with element priority,
  attention flow, focal points, balance assessment, and overall score.
  4 credits. API: `POST /api/creative/creative-visual-hierarchy-analyzer`. See ADR-104.
- Ad Audience Pain Point Mapper (`/ad-audience-pain-point-mapper`): AI-powered pain point
  mapper. Maps audience pain points to creative angles with severity, emotional impact,
  messaging recommendations, and prioritization.
  4 credits. API: `POST /api/creative/ad-audience-pain-point-mapper`. See ADR-105.
- Creative Messaging Framework Builder (`/creative-messaging-framework-builder`): AI-powered
  messaging framework builder. Builds comprehensive messaging frameworks with pillars, core
  messages, supporting points, proof points, tone guidelines, and elevator pitch.
  5 credits. API: `POST /api/creative/creative-messaging-framework-builder`. See ADR-106.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3476 total (was 3315) — 161 new tests across 4 new test suites
- TT16 page E2E tests: 64 passing
- TT16 API E2E tests: 12 passing
- TT16 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: adCreativeAbTestSimulator,
  creativeVisualHierarchyAnalyzer, adAudiencePainPointMapper, creativeMessagingFrameworkBuilder

### TT17-Series: Four More AI Creative Tools
- Ad Creative Burnout Detector (`/ad-creative-burnout-detector`): AI-powered burnout detector.
  Detects creative fatigue/burnout from content, product, days running, and platform; returns
  burnout level, risk score, fatigue indicators, decline predictions, refresh recommendations,
  and optimal refresh timing.
  4 credits. API: `POST /api/creative/ad-creative-burnout-detector`. See ADR-107.
- Creative Ad Concept Synthesizer (`/creative-ad-concept-synthesizer`): AI-powered concept
  synthesizer. Synthesizes multiple ad concepts into a unified creative direction with merged
  elements, creative direction, differentiation, and execution guidelines.
  5 credits. API: `POST /api/creative/creative-ad-concept-synthesizer`. See ADR-108.
- Ad Audience Psychographic Profiler (`/ad-audience-psychographic-profiler`): AI-powered
  psychographic profiler. Creates psychographic profiles of target audiences with dimensions,
  motivation drivers, content preferences, communication style, and messaging recommendations.
  4 credits. API: `POST /api/creative/ad-audience-psychographic-profiler`. See ADR-109.
- Creative Ad Tone Calibrator (`/creative-ad-tone-calibrator`): AI-powered tone calibrator.
  Calibrates ad creative tone to match brand and audience expectations with current tone analysis,
  alignment score, tone adjustments, word replacements, and calibrated content.
  3 credits. API: `POST /api/creative/creative-ad-tone-calibrator`. See ADR-110.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3635 total (was 3476) — 159 new tests across 4 new test suites
- TT17 page E2E tests: 64 passing
- TT17 API E2E tests: 12 passing
- TT17 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: adCreativeBurnoutDetector,
  creativeAdConceptSynthesizer, adAudiencePsychographicProfiler, creativeAdToneCalibrator
- Production deployment version ID: cdcff232-db32-49cd-9e80-7ee09ff5fa22

### TT18-Series: Four More AI Creative Tools
- Creative Ad Format Innovator (`/creative-ad-format-innovator`): AI-powered format innovator.
  Innovates new ad formats by combining existing format elements in novel ways; returns innovative
  format concepts with novelty score, format elements, implementation difficulty, and expected impact.
  5 credits. API: `POST /api/creative/creative-ad-format-innovator`. See ADR-111.
- Ad Creative Story Arc Designer (`/ad-creative-story-arc-designer`): AI-powered story arc designer.
  Designs compelling story arcs for ad creative with acts, emotional beats, pacing guide, and key moments.
  4 credits. API: `POST /api/creative/ad-creative-story-arc-designer`. See ADR-112.
- Creative Ad Persuasion Strategist (`/creative-ad-persuasion-strategist`): AI-powered persuasion
  strategist. Develops persuasion strategies using Cialdini principles with techniques, psychological
  triggers, and ethical considerations.
  4 credits. API: `POST /api/creative/creative-ad-persuasion-strategist`. See ADR-113.
- Ad Creative Hook Timing Optimizer (`/ad-creative-hook-timing-optimizer`): AI-powered hook timing
  optimizer. Optimizes hook timing for maximum engagement with optimal placement, effectiveness score,
  timing analysis, and engagement predictions.
  3 credits. API: `POST /api/creative/ad-creative-hook-timing-optimizer`. See ADR-114.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3789 total (was 3635) — 154 new tests across 4 new test suites
- TT18 page E2E tests: 64 passing
- TT18 API E2E tests: 12 passing
- TT18 production audit: 20/20 passing (4 pages × 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: creativeAdFormatInnovator,
  adCreativeStoryArcDesigner, creativeAdPersuasionStrategist, adCreativeHookTimingOptimizer
- Production deployment version ID: 6a946220-9ee4-43bf-acc7-b7e1219128fd

### TT19-Series: Four More AI Creative Tools
- Creative Ad Metaphor Generator (`/creative-ad-metaphor-generator`): AI-powered metaphor generator.
  Generates creative metaphors that make abstract product benefits tangible and memorable; returns
  metaphors with memorability score, visual suggestions, emotional resonance, and category.
  3 credits. API: `POST /api/creative/creative-ad-metaphor-generator`. See ADR-115.
- Ad Creative Sensory Enhancer (`/ad-creative-sensory-enhancer`): AI-powered sensory enhancer.
  Enhances ad content with sensory language appealing to the five senses; returns enhanced content,
  sensory score, additions, and sense-specific enhancements.
  4 credits. API: `POST /api/creative/ad-creative-sensory-enhancer`. See ADR-116.
- Creative Ad Pattern Interrupt Designer (`/creative-ad-pattern-interrupt-designer`): AI-powered
  pattern interrupt designer. Designs pattern interrupts that break through audience attention
  filters; returns interrupt concepts with attention scores, implementation guides, and expected lift.
  4 credits. API: `POST /api/creative/creative-ad-pattern-interrupt-designer`. See ADR-117.
- Ad Creative Social Proof Architect (`/ad-creative-social-proof-architect`): AI-powered social proof
  architect. Architects social proof elements that build trust and credibility; returns proof elements
  with credibility scores, strategies, and authenticity guidelines.
  5 credits. API: `POST /api/creative/ad-creative-social-proof-architect`. See ADR-118.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 3937 total (was 3789) — 148 new tests across 4 new test suites
- TT19 page E2E tests: 64 passing
- TT19 API E2E tests: 12 passing
- TT19 production audit: 20/20 passing (4 pages x 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: creativeAdMetaphorGenerator,
  adCreativeSensoryEnhancer, creativeAdPatternInterruptDesigner, adCreativeSocialProofArchitect
- Production deployment version ID: ff2a8233-e5de-428a-b0db-338d7913f8ee

### TT20-Series: Four More AI Creative Tools
- Creative Ad Anticipation Builder (`/creative-ad-anticipation-builder`): AI-powered anticipation builder.
  Builds anticipation and suspense elements for ad creative; returns hooks, suspense techniques, reveal
  strategies, tension curves, and anticipation score.
  4 credits. API: `POST /api/creative/creative-ad-anticipation-builder`. See ADR-119.
- Ad Creative Contrast Amplifier (`/ad-creative-contrast-amplifier`): AI-powered contrast amplifier.
  Amplifies contrast in ad content (before/after, problem/solution, etc.); returns amplified content,
  contrast score, contrast elements, and contrast pairs.
  3 credits. API: `POST /api/creative/ad-creative-contrast-amplifier`. See ADR-120.
- Creative Ad Micro-Moment Designer (`/creative-ad-micro-moment-designer`): AI-powered micro-moment
  designer. Designs micro-moments that capture attention in 1-3 seconds; returns moment timeline with
  attention scores, implementation guides, and emotional beats.
  4 credits. API: `POST /api/creative/creative-ad-micro-moment-designer`. See ADR-121.
- Ad Creative Emotion Sequencer (`/ad-creative-emotion-sequencer`): AI-powered emotion sequencer.
  Sequences emotions throughout ad content for maximum emotional impact; returns emotion beats, peaks,
  transition strategies, and resonance score.
  5 credits. API: `POST /api/creative/ad-creative-emotion-sequencer`. See ADR-122.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 4091 total (was 3937) — 154 new tests across 4 new test suites
- TT20 page E2E tests: 64 passing
- TT20 API E2E tests: 12 passing
- TT20 production audit: 20/20 passing (4 pages x 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: creativeAdAnticipationBuilder,
  adCreativeContrastAmplifier, creativeAdMicroMomentDesigner, adCreativeEmotionSequencer
- Production deployment version ID: 99e96a78-beea-4e61-ada0-079f708daeb5

### TT21-Series: Four More AI Creative Tools
- Creative Ad Narrative Twist Designer (`/creative-ad-narrative-twist-designer`): AI-powered narrative twist designer.
  Designs unexpected narrative twists that surprise and re-engage viewers; returns twist concepts with
  setup, twist, payoff, surprise score, and emotional impact.
  4 credits. API: `POST /api/creative/creative-ad-narrative-twist-designer`. See ADR-123.
- Ad Creative Memory Anchor Builder (`/ad-creative-memory-anchor-builder`): AI-powered memory anchor builder.
  Creates memorable anchor moments that stick with viewers; returns anchors with mnemonic devices,
  retention scores, placement, recall triggers, and emotional bindings.
  3 credits. API: `POST /api/creative/ad-creative-memory-anchor-builder`. See ADR-124.
- Creative Ad Tension Release Strategist (`/creative-ad-tension-release-strategist`): AI-powered tension release strategist.
  Strategizes tension buildup and release cycles for emotional catharsis; returns tension cycles,
  release points, catharsis moments, and rhythm score.
  4 credits. API: `POST /api/creative/creative-ad-tension-release-strategist`. See ADR-125.
- Ad Creative Sensory Contrast Designer (`/ad-creative-sensory-contrast-designer`): AI-powered sensory contrast designer.
  Designs sensory contrasts (loud/quiet, bright/dark, fast/slow) for maximum sensory impact; returns
  sensory contrast elements, contrast pairs, and impact score.
  5 credits. API: `POST /api/creative/ad-creative-sensory-contrast-designer`. See ADR-126.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 4241 total (was 4091) — 150 new tests across 4 new test suites
- TT21 page E2E tests: 64 passing
- TT21 API E2E tests: 12 passing
- TT21 production audit: 20/20 passing (4 pages x 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: creativeAdNarrativeTwistDesigner,
  adCreativeMemoryAnchorBuilder, creativeAdTensionReleaseStrategist, adCreativeSensoryContrastDesigner
- Production deployment version ID: eb512e20-d0ae-447b-aa76-3492e0dde98a

### TT22-Series: Four More AI Creative Tools
- Creative Ad Curiosity Gap Designer (`/creative-ad-curiosity-gap-designer`): AI-powered curiosity gap designer.
  Designs curiosity gaps — the space between what viewers know and want to know; returns gaps with
  opening, tease, payoff, curiosity score, and engagement strategy.
  4 credits. API: `POST /api/creative/creative-ad-curiosity-gap-designer`. See ADR-127.
- Ad Creative Rhythm Pacing Optimizer (`/ad-creative-rhythm-pacing-optimizer`): AI-powered rhythm pacing optimizer.
  Optimizes rhythm and pacing of ad content; returns rhythm patterns, pacing segments, beat drops,
  tempo changes, and rhythm score.
  3 credits. API: `POST /api/creative/ad-creative-rhythm-pacing-optimizer`. See ADR-128.
- Creative Ad Visual Hierarchy Strategist (`/creative-ad-visual-hierarchy-strategist`): AI-powered visual hierarchy strategist.
  Strategizes visual hierarchy to guide viewer attention; returns hierarchy layers, attention weights,
  focal points, visual flow, and hierarchy score.
  4 credits. API: `POST /api/creative/creative-ad-visual-hierarchy-strategist`. See ADR-129.
- Ad Creative Sound Design Strategist (`/ad-creative-sound-design-strategist`): AI-powered sound design strategist.
  Strategizes sound design — music, SFX, voiceover, audio cues; returns sound layers, audio cues,
  music strategy, voiceover direction, and sound design score.
  5 credits. API: `POST /api/creative/ad-creative-sound-design-strategist`. See ADR-130.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 4402 total (was 4241) — 161 new tests across 4 new test suites
- TT22 page E2E tests: 64 passing
- TT22 API E2E tests: 12 passing
- TT22 production audit: 20/20 passing (4 pages x 5 checks: HTTP 200, 1 H1, main#main-content,
  skip link, API schema)
- Translations added to all 13 locales for 4 new namespaces: creativeAdCuriosityGapDesigner,
  adCreativeRhythmPacingOptimizer, creativeAdVisualHierarchyStrategist, adCreativeSoundDesignStrategist
- Production deployment version ID: a2c8ed0b-46c5-4994-baab-23e8cef6b589

### TT23-Series: Four More AI Creative Tools
- Creative Ad Surprise Element Designer (`/creative-ad-surprise-element-designer`): AI-powered surprise element designer.
  Designs surprise elements in ad creative that delight and re-engage viewers; returns elements with
  surprise type, setup, reveal, delight score, execution guide, viewer reaction, and timing.
  4 credits. API: `POST /api/creative/creative-ad-surprise-element-designer`. See ADR-131.
- Ad Creative Callback Memory Designer (`/ad-creative-callback-memory-designer`): AI-powered callback memory designer.
  Designs callback elements that reward attentive viewers and build creative memory; returns callbacks with
  callback type, original moment, callback reference, payoff, recognition score, placement, and reward type.
  3 credits. API: `POST /api/creative/ad-creative-callback-memory-designer`. See ADR-132.
- Creative Ad Climax Architect (`/creative-ad-climax-architect`): AI-powered climax architect.
  Architects the climax of ad creative — the peak moment of emotional and narrative intensity; returns
  climax structure, buildup sequence, peak moment, resolution, and climax score.
  4 credits. API: `POST /api/creative/creative-ad-climax-architect`. See ADR-133.
- Ad Creative Pacing Variability Designer (`/ad-creative-pacing-variability-designer`): AI-powered pacing variability designer.
  Designs pacing variability that alternates fast and slow segments to maintain engagement; returns
  pacing variations, speed transitions, energy fluctuations, attention resets, and variability score.
  5 credits. API: `POST /api/creative/ad-creative-pacing-variability-designer`. See ADR-134.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 4563 total (was 4402) — 161 new tests across 4 new test suites
- TT23 page E2E tests: 32 passing
- TT23 API E2E tests: 12 passing
- Translations added to all 13 locales for 4 new namespaces: creativeAdSurpriseElementDesigner,
  adCreativeCallbackMemoryDesigner, creativeAdClimaxArchitect, adCreativePacingVariabilityDesigner
- Feature routes: 112 total (was 108)
- ADRs: 134 total (was 130)
- Production deployment version ID: 77b2ca2f-96d6-4849-a807-554dfde51222

### TT24-Series: Four More AI Creative Tools
- Creative Ad Foreshadowing Designer (`/creative-ad-foreshadowing-designer`): AI-powered foreshadowing designer.
  Designs foreshadowing elements that hint at future payoffs and reward re-watching; returns elements with
  hint type, setup, payoff, subtlety score, rewatch value, placement, and viewer discovery.
  4 credits. API: `POST /api/creative/creative-ad-foreshadowing-designer`. See ADR-135.
- Ad Creative Emotional Pivot Designer (`/ad-creative-emotional-pivot-designer`): AI-powered emotional pivot designer.
  Designs emotional pivot points where the tone shifts dramatically; returns pivots with pivot type,
  before/after emotion, transition method, impact score, timing, and viewer effect.
  3 credits. API: `POST /api/creative/ad-creative-emotional-pivot-designer`. See ADR-136.
- Creative Ad Resolution Designer (`/creative-ad-resolution-designer`): AI-powered resolution designer.
  Designs resolution structures that land the narrative and emotional closure; returns resolution structure,
  emotional closure, CTA bridge, satisfaction score, and memorability score.
  4 credits. API: `POST /api/creative/creative-ad-resolution-designer`. See ADR-137.
- Ad Creative Viewer Reward Designer (`/ad-creative-viewer-reward-designer`): AI-powered viewer reward designer.
  Designs viewer reward systems that give satisfaction, discovery, and emotional payoff; returns reward elements,
  discovery moments, satisfaction triggers, rewatch incentives, and reward score.
  5 credits. API: `POST /api/creative/ad-creative-viewer-reward-designer`. See ADR-138.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 4707 total (was 4563) — 144 new tests across 4 new test suites
- TT24 page E2E tests: 32 passing
- TT24 API E2E tests: 12 passing
- Translations added to all 13 locales for 4 new namespaces: creativeAdForeshadowingDesigner,
  adCreativeEmotionalPivotDesigner, creativeAdResolutionDesigner, adCreativeViewerRewardDesigner
- Feature routes: 116 total (was 112)
- ADRs: 138 total (was 134)
- Production deployment version ID: ad6167e0-4a90-47d0-85f0-2d9392ffd9a4

### TT25-Series: Four More AI Creative Tools
- Ad Creative Tension Release Designer (`/ad-creative-tension-release-designer`): AI-powered tension-release designer.
  Designs tension-release cycles that build and release tension for emotional engagement; returns cycles with
  cycle type, tension build, release moment, emotional relief, catharsis score, viewer satisfaction, and timing.
  4 credits. API: `POST /api/creative/ad-creative-tension-release-designer`. See ADR-139.
- Creative Ad Stakes Escalation Designer (`/creative-ad-stakes-escalation-designer`): AI-powered stakes escalation designer.
  Designs escalating stakes that build tension and consequence throughout the narrative; returns stakes levels with
  escalation stage, description, consequence, tension level, emotional weight, viewer investment, and timing.
  5 credits. API: `POST /api/creative/creative-ad-stakes-escalation-designer`. See ADR-140.
- Ad Creative Curiosity Loop Designer (`/ad-creative-curiosity-loop-designer`): AI-powered curiosity loop designer.
  Designs curiosity loops with open questions and mysteries that keep viewers watching; returns loops with
  loop type, opening question, mystery element, reveal timing, payoff, curiosity retention score, and viewer hook.
  4 credits. API: `POST /api/creative/ad-creative-curiosity-loop-designer`. See ADR-141.
- Creative Ad Transformation Arc Designer (`/creative-ad-transformation-arc-designer`): AI-powered transformation arc designer.
  Designs transformation arcs showing the before/after journey of the subject or viewer; returns arc with
  arc type, before state, catalyst, transformation stages, after state, emotional journey, and viewer identification score.
  5 credits. API: `POST /api/creative/creative-ad-transformation-arc-designer`. See ADR-142.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 4852 total (was 4707) — 145 new tests across 4 new test suites
- TT25 page E2E tests: 32 passing
- TT25 API E2E tests: 12 passing
- Translations added to all 13 locales for 4 new namespaces: adCreativeTensionReleaseDesigner,
  creativeAdStakesEscalationDesigner, adCreativeCuriosityLoopDesigner, creativeAdTransformationArcDesigner
- Feature routes: 120 total (was 116)
- ADRs: 142 total (was 138)
- Production deployment version ID: 1ec06e49-2367-49d6-8cdb-27c077036757

### TT26-Series: Four More AI Creative Tools
- Ad Creative Emotional Anchor Designer (`/ad-creative-emotional-anchor-designer`): AI-powered emotional anchor designer.
  Designs emotional anchors that create recurring emotional touchpoints throughout the ad; returns anchors with
  anchor type (nostalgia, aspiration, fear, joy, belonging, pride, trust, wonder), emotional trigger, anchor moment,
  viewer resonance, anchor strength (0-100), emotional depth (0-100), and reinforcement strategy.
  4 credits. API: `POST /api/creative/ad-creative-emotional-anchor-designer`. See ADR-143.
- Creative Ad Empathy Bridge Designer (`/creative-ad-empathy-bridge-designer`): AI-powered empathy bridge designer.
  Designs empathy bridges connecting the viewer's world to the product's world; returns bridges with
  bridge type (shared experience, pain point mirror, aspiration link, value alignment, lifestyle reflection,
  emotional memory, identity connection, transformation witness), viewer perspective, brand perspective,
  connection point, empathy strength (0-100), emotional resonance (0-100), and bridge strategy.
  5 credits. API: `POST /api/creative/creative-ad-empathy-bridge-designer`. See ADR-144.
- Ad Creative Belief Shift Designer (`/ad-creative-belief-shift-designer`): AI-powered belief shift designer.
  Designs belief shifts moving viewers from current beliefs to new beliefs about the product; returns shifts with
  shift type (myth busting, paradigm shift, assumption challenge, reputation reframe, comparison shift,
  evidence revelation, authority transfer, experience reframe), current belief, target belief, evidence anchor,
  shift strength (0-100), conviction level (0-100), and shift pathway.
  4 credits. API: `POST /api/creative/ad-creative-belief-shift-designer`. See ADR-145.
- Creative Ad Desire Amplifier Designer (`/creative-ad-desire-amplifier-designer`): AI-powered desire amplifier designer.
  Designs desire amplifiers intensifying viewer desire for the product or outcome; returns amplifiers with
  amplifier type (scarcity, social proof, aspiration, exclusivity, transformation, pleasure, status, fomo),
  desire trigger, escalation technique, craving builder, desire intensity (0-100), urgency level (0-100),
  and amplification pathway.
  5 credits. API: `POST /api/creative/creative-ad-desire-amplifier-designer`. See ADR-146.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 5023 total (was 4852) — 171 new tests across 4 new test suites
- TT26 page E2E tests: 32 passing
- TT26 API E2E tests: 12 passing
- Translations added to all 13 locales for 4 new namespaces: adCreativeEmotionalAnchorDesigner,
  creativeAdEmpathyBridgeDesigner, adCreativeBeliefShiftDesigner, creativeAdDesireAmplifierDesigner
- Feature routes: 124 total (was 120)
- ADRs: 146 total (was 142)
- Production deployment version ID: 92e82f33-96f1-4398-a5b0-85352cee06a5

### TT27-Series: Four More AI Creative Tools

1. **Ad Creative Trust Accelerator Designer** — Designs trust accelerators that rapidly build
   viewer trust. 8 accelerator types (authority_endorsement, social_proof_cascade, etc.).
   Route: `/ad-creative-trust-accelerator-designer`. Credits: 4. API:
   `POST /api/creative/ad-creative-trust-accelerator-designer`. See ADR-147.
2. **Creative Ad Urgency Catalyst Designer** — Designs urgency catalysts that create immediate
   action without being pushy. 8 catalyst types (time_scarcity, opportunity_window, etc.).
   Route: `/creative-ad-urgency-catalyst-designer`. Credits: 5. API:
   `POST /api/creative/creative-ad-urgency-catalyst-designer`. See ADR-148.
3. **Ad Creative Social Momentum Designer** — Designs social momentum that makes viewers feel
   they are joining a movement. 8 momentum types (viral_cascade, community_growth, etc.).
   Route: `/ad-creative-social-momentum-designer`. Credits: 4. API:
   `POST /api/creative/ad-creative-social-momentum-designer`. See ADR-149.
4. **Creative Ad Value Ladder Designer** — Designs value ladders that guide viewers from initial
   interest to deeper commitment. 8 step types (awareness_step, interest_step, etc.).
   Route: `/creative-ad-value-ladder-designer`. Credits: 5. API:
   `POST /api/creative/creative-ad-value-ladder-designer`. See ADR-150.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 5171 total (was 5023) — 148 new tests across 4 new test suites
- TT27 page E2E tests: 32 passing
- TT27 API E2E tests: 12 passing
- Translations added to all 13 locales for 4 new namespaces: adCreativeTrustAcceleratorDesigner,
  creativeAdUrgencyCatalystDesigner, adCreativeSocialMomentumDesigner, creativeAdValueLadderDesigner
- Feature routes: 128 total (was 124)
- ADRs: 150 total (was 146)
- Dashboard Quick Create entries: 119 total (was 115)
- Nav overflow entries: 115 total (was 111)
- Production deployment version ID: aadac406-7952-436d-bbdb-648b034bd6f1

### TT28-Series: Four More AI Creative Tools

1. **Ad Creative Objection Neutralizer Designer** — Designs objection neutralizers that
   preempt and neutralize likely viewer objections. 8 objection types (price_concern,
   trust_doubt, complexity_fear, etc.). Route: `/ad-creative-objection-neutralizer-designer`.
   Credits: 4. API: `POST /api/creative/ad-creative-objection-neutralizer-designer`. See ADR-151.
2. **Creative Ad Micro-Commitment Designer** — Designs micro-commitment chains that lead
   viewers toward conversion. 8 commitment types (attention_commitment, engagement_commitment,
   etc.). Route: `/creative-ad-micro-commitment-designer`. Credits: 5. API:
   `POST /api/creative/creative-ad-micro-commitment-designer`. See ADR-152.
3. **Ad Creative Scarcity Frame Designer** — Designs scarcity frames that motivate without
   manipulative pressure. 8 frame types (limited_quantity, limited_time, etc.). Route:
   `/ad-creative-scarcity-frame-designer`. Credits: 4. API:
   `POST /api/creative/ad-creative-scarcity-frame-designer`. See ADR-153.
4. **Creative Ad Identity Alignment Designer** — Designs identity alignments that make buying
   feel like self-expression. 8 alignment types (values_mirror, aspirational_self, etc.).
   Route: `/creative-ad-identity-alignment-designer`. Credits: 5. API:
   `POST /api/creative/creative-ad-identity-alignment-designer`. See ADR-154.
- All 4 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 4 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 5322 total (was 5171) — 151 new tests across 4 new test suites
- TT28 page E2E tests: 32 passing
- TT28 API E2E tests: 12 passing
- Translations added to all 13 locales for 4 new namespaces: adCreativeObjectionNeutralizerDesigner,
  creativeAdMicroCommitmentDesigner, adCreativeScarcityFrameDesigner, creativeAdIdentityAlignmentDesigner
- Feature routes: 132 total (was 128)
- ADRs: 154 total (was 150)
- Dashboard Quick Create entries: 123 total (was 119)
- Nav overflow entries: 119 total (was 115)
- Production deployment version ID: 6312e896-4296-405e-a855-80fbc2ef0acf

### TT29-Series: 22 Persuasion, Behavioral Economics & Copywriting Frameworks

1. **Ad Creative PAS Framework Designer** — Problem-Agitation-Solution frameworks. 8 problem types.
   Route: `/ad-creative-pas-framework-designer`. Credits: 4. ADR-155.
2. **Creative Ad Offer Architecture Designer** — Offer architectures with bonus stacks. 8 offer types.
   Route: `/creative-ad-offer-architecture-designer`. Credits: 5. ADR-156.
3. **Ad Creative BAB Framework Designer** — Before-After-Bridge frameworks. 8 transformation types.
   Route: `/ad-creative-bab-framework-designer`. Credits: 4. ADR-157.
4. **Creative Ad Price Framing Designer** — Price framing strategies. 8 framing types.
   Route: `/creative-ad-price-framing-designer`. Credits: 5. ADR-158.
5. **Ad Creative Risk Reversal Designer** — Risk reversal with guarantees. 8 reversal types.
   Route: `/ad-creative-risk-reversal-designer`. Credits: 4. ADR-159.
6. **Creative Ad FAB Framework Designer** — Features-Advantages-Benefits frameworks. 8 benefit types.
   Route: `/creative-ad-fab-framework-designer`. Credits: 5. ADR-160.
7. **Ad Creative Testimonial Architecture Designer** — Testimonial architectures with social proof. 8 testimonial types.
   Route: `/ad-creative-testimonial-architecture-designer`. Credits: 4. ADR-161.
8. **Creative Ad Comparison Framework Designer** — Comparison frameworks for product advantages. 8 comparison types.
   Route: `/creative-ad-comparison-framework-designer`. Credits: 5. ADR-162.
9. **Ad Creative Demonstration Framework Designer** — Demonstration frameworks with visual proof. 8 demo types.
   Route: `/ad-creative-demonstration-framework-designer`. Credits: 4. ADR-163.
10. **Creative Ad Loss Aversion Framing Designer** — Loss aversion frames for inaction cost. 8 loss types.
    Route: `/creative-ad-loss-aversion-framing-designer`. Credits: 5. ADR-164.
11. **Ad Creative Anchoring Effect Designer** — Anchoring effect with reference anchors. 8 anchor types.
    Route: `/ad-creative-anchoring-effect-designer`. Credits: 4. ADR-165.
12. **Creative Ad Reciprocity Trigger Designer** — Reciprocity through value-first giving. 8 reciprocity types.
    Route: `/creative-ad-reciprocity-trigger-designer`. Credits: 5. ADR-166.
13. **Ad Creative Authority Positioning Designer** — Authority positioning with credentials. 8 authority types.
    Route: `/ad-creative-authority-positioning-designer`. Credits: 4. ADR-167.
14. **Creative Ad Liking Affinity Designer** — Liking affinity through similarity. 8 affinity types.
    Route: `/creative-ad-liking-affinity-designer`. Credits: 5. ADR-168.
15. **Ad Creative Fear Appeal Designer** — Fear appeal for protective action. 8 fear types.
    Route: `/ad-creative-fear-appeal-designer`. Credits: 4. ADR-169.
16. **Creative Ad Belonging Appeal Designer** — Belonging appeal for community connection. 8 belonging types.
    Route: `/creative-ad-belonging-appeal-designer`. Credits: 5. ADR-170.
17. **Ad Creative Humor Appeal Designer** — Humor appeal for shareability. 8 humor types.
    Route: `/ad-creative-humor-appeal-designer`. Credits: 4. ADR-171.
18. **Creative Ad Framing Effect Designer** — Framing effect for perception shaping. 8 framing types.
    Route: `/creative-ad-framing-effect-designer`. Credits: 5. ADR-172.
19. **Ad Creative Pride Appeal Designer** — Pride appeal for achievement motivation. 8 pride types.
    Route: `/ad-creative-pride-appeal-designer`. Credits: 4. ADR-173.
20. **Creative Ad Nostalgia Trigger Designer** — Nostalgia triggers through warm memories. 8 nostalgia types.
    Route: `/creative-ad-nostalgia-trigger-designer`. Credits: 5. ADR-174.
21. **Ad Creative Decoy Effect Designer** — Decoy effect with asymmetric options. 8 decoy types.
    Route: `/ad-creative-decoy-effect-designer`. Credits: 4. ADR-175.
22. **Creative Ad Endowment Effect Designer** — Endowment effect for ownership feeling. 8 endowment types.
    Route: `/creative-ad-endowment-effect-designer`. Credits: 5. ADR-176.
- All 22 features have dry-run/fallback behavior when Atlas is local or API key is missing
- All 22 features use existing auth, credit deduction/refund, `withAtlas`, and `safeError` conventions
- Unit tests: 6188 total (was 5322) — 866 new tests across 22 new test suites
- TT29 page E2E tests: 176 passing (22 specs × 8 tests each)
- TT29 API E2E tests: 66 passing (22 groups × 3 tests each)
- Translations added to all 13 locales for 22 new namespaces
- Feature routes: 154 total (was 132)
- ADRs: 176 total (was 154)
- Dashboard Quick Create entries: 145 total (was 123)
- Nav overflow entries: 141 total (was 119)
- Production deployment version ID: cb7067d5-0855-4d8a-8f5d-da54e7f7407e

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
- D1 migration applied to production (36 tables total)

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

## Pipeline Credit Safety
- Credit ledger idempotency: `CreditLedger.idempotencyKey` with `@@unique([userId, idempotencyKey])` prevents duplicate charges
- `deductCredits` accepts an optional `idempotencyKey` parameter; duplicate calls with the same key are reversed and return successfully
- Pipeline routes pass deterministic keys: `pipeline:{pipelineId}:{stage}` for initial runs, `pipeline:{pipelineId}:{stage}:retry` for retries
- `PipelineStageResult.charged` flag provides in-memory idempotency within a single request
- `createPipeline` initializes all stage results with `charged: false`
- Pipeline state versioning: `PipelineState.version` + `WorkflowRun.version` provide optimistic locking via conditional `updateMany`
- `savePipeline` in the `[id]` route uses `where: { id, version: expected }` to prevent concurrent clobbering
- Publish stage defaults to `autoAdvance: false` regardless of `onComplete`; user must explicitly approve via the `approve` action
- Creative Studio shows an "Approve & Publish" button when the pipeline reaches the publish stage
- Cancel button shows a warning that cancel takes effect after the current auto-advance chain completes
- Dry-run TTS returns a valid silent WAV data URL (not a placeholder)
- Template credit estimates show a pre-approval to total range (e.g. "24–27 credits")

## Pipeline UX Enhancements (W-series)
- Live credit cost display: `PipelineOrchestrator` shows a live-updating credit estimate that recalculates when stages are toggled on/off
- Share button: completed pipelines show a "Share" button that creates a shareable link via `POST /api/creative/share` and copies it to clipboard
- Auto-advance deadline UX: when the server's 75s auto-advance deadline is hit, a warning notice is shown and the client automatically retries the advance call after 1.5s (if the current stage has `autoAdvance: true`)
- Parallel-wave E2E: authenticated tests verify pipeline creation with `parallelWith` stages and concurrent wave execution

### X-Series: Billing E2E, Error Recovery, Asset Visibility, Observability
- Billing/checkout E2E: `e2e/auth-billing.spec.ts` covers pricing page UI, checkout API contract (unknown pack, missing pack, valid pack, unauthenticated), and webhook security (missing/invalid signature)
- Pipeline error recovery UX: `PipelineOrchestrator` shows friendly error messages (rate-limited, insufficient credits, timeout, network, auth, server) via `friendlyError()` mapping; "Skip All & Stop" button appears when a stage has failed
- Asset visibility: `derivePipelineChildAssets` now persists `brief`, `script`, `storyboard`, and `score` as child assets (in addition to media, audio, edit, compliance, publish); `/assets` page has a "Creative Packages" tab showing pipeline output assets
- Production observability: `src/lib/observability/alerts.ts` provides webhook-based alerting for critical pipeline failures and credit errors; configurable via `ALERT_WEBHOOK_URL` and `ALERT_WEBHOOK_SECRET` env vars; falls back to console logging when no webhook is configured

### Y-Series: Security Hardening, Credit Safety, E2E Fix, Media Fallback
- Security hardening: `src/lib/security.ts` provides `hashPassword`/`verifyPassword` (SHA-256 + salt via Web Crypto API) and `isUrlSafe` (SSRF protection); shared-link passwords are now hashed instead of plaintext; webhook dispatcher validates URLs against SSRF allow-list; 5 API routes no longer leak raw `String(e)` to clients (compliance, media-service-boundary, publish, skills/chain, assets/upload)
- Credit safety on D1: `grantCredits` no longer uses `prisma.$transaction` (which D1 ignores) — uses compensation pattern matching `deductCredits`; skills/chain endpoint now uses per-request UUID idempotency key to prevent double-charging on retry
- E2E flakiness fix: 4 `auth-user-flows.spec.ts` tests now skip gracefully on 429 rate limiting instead of failing
- Media fallback fix: `dispatchMediaService` and pipeline executor no longer silently fall back to placeholder/dry-run media on Atlas failure — stages now fail with proper error messages, credit refunds, and user-facing errors via `PipelineStageError`

### Z-Series: Skill-Chain Fixes, Custom Compliance Rules, UI States, DB/Auth/Upload Hardening
- Skill-chain mapping fixes: `renderTemplate` now extracts readable text from arrays/objects (name/description/text fields) instead of raw JSON blobs; fixed reversed `inputMappings` in `full-pipeline` and `audience-first` chains; `executeChain` now warns about unresolved source keys at runtime
- Custom compliance rules: Added `CustomComplianceRule` Prisma model with full CRUD endpoints (`GET/POST/PUT/DELETE /api/creative/compliance/rules`); `checkCompliance` now accepts `userId` and loads custom rules from DB; `detectViolations` merges built-in and custom rules; `dbRuleToComplianceRule` converter
- UI loading/error states: Added `LoadingSpinner` component and `loading.tsx` to 10 key routes (dashboard, pipeline, assets, creative-studio, admin, analytics-hub, workflow-builder, pricing, compliance, settings, teams); added per-route `error.tsx` to 6 routes; fixed `error.tsx` to use `role="alert"` and `aria-live="assertive"`
- DB indexes: Added composite indexes for `Creation(status, createdAt)`, `Creation(taskId)`, `Creation(getUrl)`, `CreditLedger(reason)`, `CreditLedger(ref)`, `SharedLink(expiresAt)`, `WebhookEndpoint(active, events)`, `WorkflowRun(status)`, `TeamInvitation(expiresAt)`
- JWT credits fix: JWT `credits` field now auto-refreshes from DB if older than 60 seconds, preventing stale balance display
- Upload magic-byte validation: Asset upload now validates decoded bytes against declared MIME type (JPEG/PNG/WebP magic bytes), rejecting SVG XSS and wrong content-type uploads

### AA-Series: Pipeline Context, Small Fixes, Chain Unification, Publishing Framework
- Pipeline context enrichment: Media generation stage now passes full brief (product, audience), script CTA, selected angle, and aspect ratio to `dispatchMediaService`; audio stage passes script CTA and emotional trigger as TTS options
- Pipeline list summary: `GET /api/creative/pipeline?summary=true` returns lightweight summaries without parsing large state JSON
- Publish ref uniqueness: `ref` now uses `crypto.randomUUID()` instead of `Date.now()` to prevent same-ms collisions
- Removed unused `replicate` npm dependency
- Chain mode unification: Skill-chain API (`POST /api/creative/skills/chain`) now creates a durable `WorkflowRun` record for persistence and visibility; chain runs appear in the pipeline list and can be inspected after completion/failure
- Publishing OAuth framework: Added `PlatformConnection` model for storing per-user platform OAuth tokens; `hasRealCredentials` now checks platform-specific env vars; added `GET/POST/DELETE /api/publish/connections` for token management
- Scheduled post persistence: Added `ScheduledPost` model; `schedulePost` now persists to DB when userId is provided; `publishContent` and `publishToMultiple` pass userId through to `schedulePost`

### BB-Series: Publishing OAuth, Security Hardening, Chain Unification, Migration Idempotency
- Schedule route uid bug fix: `POST /api/publish/schedule` now passes `uid` to `schedulePost`
- Public share rate limiting: `GET /api/creative/share/[token]` rate-limited (30/min views, 10/min password attempts)
- FFmpeg CSP fix: Added `unpkg.com` to `script-src`/`connect-src`, `blob:` to `script-src`, `worker-src 'self' blob:'`
- Raw exception message removal: Removed `detail: String(e)` from 64 API routes; `safeError()` helper in `src/lib/security.ts`
- D1 migration idempotency: `scripts/apply-d1-migrations.mjs` tracks applied migrations in `_prisma_migrations`
- Full publishing OAuth flow: `GET /api/publish/oauth/[platform]` (initiation) + `GET /api/publish/oauth/[platform]/callback` (token exchange); token encryption at rest via AES-256-GCM (`src/lib/publishing/token-crypto.ts`); platform adapters for TikTok/YouTube/Instagram/Facebook/LinkedIn (`src/lib/publishing/platform-adapters.ts`); scheduled post processor `POST /api/publish/process-scheduled` (CRON_SECRET authenticated)
- Chain-runtime unification: `executeChain` has per-step error handling with partial results and partial credit refunds

### CC-Series: D1 Migrations, Cron Trigger, Token Refresh, FFmpeg Worker, UI Hardening
- D1 migration applied to production: `CustomComplianceRule`, `PlatformConnection`, `ScheduledPost` (with `hashtagsJson`, `privacyLevel`, `crossPostToJson`)
- Cloudflare Cron Trigger: `worker-entry.mjs` wraps OpenNext worker with `scheduled` handler; `wrangler.jsonc` configured `*/5 * * * *` cron; handler invokes `/api/publish/process-scheduled` internally via `openNextHandler.fetch()`
- OAuth token refresh: `src/lib/publishing/token-refresh.ts` implements refresh for all 5 platforms; `getRealAccessToken()` refreshes expired tokens instead of falling back to dry-run
- Settings OAuth UI: `PlatformConnectionsSection.tsx` with connect/disconnect buttons and OAuth redirect handling
- lucide-react import optimization: `experimental.optimizePackageImports: ['lucide-react']`
- JWT credit refresh optimization: staleness threshold increased from 60s to 5min
- FFmpeg Web Worker: `src/lib/compose-worker.ts` moves FFmpeg loading/encoding to a Web Worker; `compose-client.ts` delegates via `postMessage`
- ScheduledPost metadata: `hashtagsJson`, `privacyLevel`, `crossPostToJson` persisted and restored

### DD-Series: Production Safety, Scheduled Post Mgmt, Compliance UI, OAuth PKCE, Platform Tests
- Token encryption hard-fail: `token-crypto.ts` throws in production if `TOKEN_ENCRYPTION_KEY` is missing (was: silent plaintext fallback); dev mode uses a dev-only key; `isTokenEncryptionConfigured()` for health checks
- Cron internal invocation: `worker-entry.mjs` uses `http://localhost` for internal subrequest instead of fetching public domain
- Scheduled post management: `GET /api/publish/schedule` (list) + `DELETE /api/publish/schedule?id=xxx` (cancel + credit refund); `ScheduledPostsSection.tsx` UI on Settings page
- Compliance rules UI: `ComplianceRulesSection.tsx` on `/compliance` page with full CRUD (create/edit/delete/enable-disable)
- OAuth PKCE: Initiation route generates PKCE `code_verifier`/`code_challenge` (S256) for YouTube and LinkedIn; `code_verifier` stored in `oauth_code_verifier` cookie; callback validates state against `oauth_state` cookie (CSRF); YouTube adds `access_type=offline&prompt=consent`
- Platform adapter tests: `test/platform-adapters.test.ts` with 15 mocked-fetch tests covering all 5 platforms

## Publishing & Scheduling Architecture

### OAuth Flow
- `GET /api/publish/oauth/[platform]` — initiates OAuth with PKCE (YouTube/LinkedIn) and state cookie
- `GET /api/publish/oauth/[platform]/callback` — exchanges code for tokens, encrypts and stores in `PlatformConnection`
- `GET/POST/DELETE /api/publish/connections` — manage platform connections
- Supported platforms: tiktok, youtube, instagram, facebook, linkedin
- Tokens encrypted at rest via AES-256-GCM (`src/lib/publishing/token-crypto.ts`)
- `TOKEN_ENCRYPTION_KEY` env var required in production (throws if missing)

### Scheduled Posts
- `POST /api/publish/schedule` — create scheduled post (deducts scheduling credit)
- `GET /api/publish/schedule` — list user's scheduled posts (optional `?status=` filter)
- `DELETE /api/publish/schedule?id=xxx` — cancel scheduled post (refunds credit if status was 'scheduled')
- `POST /api/publish/process-scheduled` — cron-triggered processor (CRON_SECRET authenticated)
- Cloudflare Cron Trigger runs every 5 minutes via `worker-entry.mjs`
- Token refresh (`src/lib/publishing/token-refresh.ts`) refreshes expired tokens before publishing

### Required Production Secrets
- `TOKEN_ENCRYPTION_KEY` — AES-256-GCM key for OAuth token encryption (REQUIRED in production)
- `CRON_SECRET` — Bearer token for scheduled post processor (REQUIRED for cron)
- Platform OAuth credentials: `TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI`, `YOUTUBE_CLIENT_ID/SECRET/REDIRECT_URI`, `META_APP_ID/SECRET/REDIRECT_URI`, `LINKEDIN_CLIENT_ID/SECRET/REDIRECT_URI`

### EE-Series: Cron Race Condition, OAuth Errors, Health Endpoint, Token-Refresh Tests, E2E Rate Limit Bypass
- Cron atomic claim: `process-scheduled/route.ts` uses `updateMany` with `WHERE status='scheduled'` to atomically claim posts before processing, preventing duplicate publishes from concurrent cron invocations
- OAuth callback error logging: Token exchange failures read and log the response body; maps `invalid_grant`/`invalid_client`/`redirect_uri_mismatch`/`access_denied` to specific redirect params; `PlatformConnectionsSection` shows user-friendly messages
- Health endpoint: `GET /api/health` checks D1, token encryption, cron secret, auth secret, and platform OAuth credentials; returns 200 (healthy) or 503 (degraded); public (no auth)
- Token-refresh tests: `test/token-refresh.test.ts` with 9 mocked-fetch tests covering all 5 platforms (request construction + error paths)
- E2E rate limit bypass: `proxy.ts` skips rate limiting when `E2E_NO_RATE_LIMIT=1`; `playwright.config.ts` sets this for webServer env; result: 511 passed (up from 445), 1 skipped

### FF-Series: Error Sanitization, Docs, Env Example, DB Indexes
- API error sanitization: 4 top-level routes (`brand/extract`, `brand/product-extract`, `lazynext-studio/expand-prompt`, `ad-reference/gen-script`) no longer leak raw `e.message` to clients
- Pipeline error classification: `src/lib/pipeline-error-classifier.ts` maps raw errors to controlled codes (`rate_limited`, `insufficient_credits`, `timeout`, `network`, `auth`, `server`, `unknown`); pipeline state stores codes instead of raw errors; `friendlyError()` updated to match codes
- `.env.example` backfilled with all required production secrets
- `ScheduledPost` composite indexes: `[status, scheduledAt]` for cron queries, `[userId, status]` for user list queries

### GG-Series: D1 Transaction Fix, Remove Dead E2E Skip
- D1 transaction fix: `admin/credits/reconcile` replaced `prisma.$transaction` with sequential update + ledger create + compensation (reverse balance on ledger failure)
- Dead E2E skip removed: `e2e/workflow-builder.spec.ts` unconditional `test.skip()` removed; authenticated coverage exists in `e2e/auth-workflow-builder.spec.ts`
- E2E result: 511 passed, 1 skipped

### HH-Series: D1 Transaction Fix, Error Sanitization, Media Rate Limiting, ML Insights, Token KDF
- D1 transaction fix: `teams/join` replaced `prisma.$transaction` with sequential writes + compensation pattern
- Error sanitization (batch 2): 9 additional API routes no longer leak raw errors (`webhook/dodo`, `ads/google-budget`, `ads/budget`, `redeem`, `publish/process-scheduled`, `drama-studio/script`, `creative/ab-automation`, `creative/autonomous-pipeline`, `editor/chat`)
- Media endpoint rate limiting: `/api/lazynext-studio/media/[key]` rate-limited (120 req/min per IP) to prevent key enumeration; media keys are unguessable UUIDs
- ML insights: `generateMockCreatives()` replaced with real Prisma queries against `CreativePerformance` records
- Token encryption KDF: Upgraded from single SHA-256 to PBKDF2 with 100,000 iterations
- Env example: 38 missing model/timeout/LLM env vars added to `.env.example`
- Lint cleanup: 2 stale `eslint-disable` directives removed

### Compliance Rules
- `GET/POST/PUT/DELETE /api/creative/compliance/rules` — full CRUD for custom compliance rules
- `ComplianceRulesSection.tsx` UI on `/compliance` page
- Rules merged with built-in rules during compliance checks

