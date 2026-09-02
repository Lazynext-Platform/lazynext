# LazyNext Post-TT29 Quality Audit

Date: 2026-09-01
Scope: Full platform audit after TT29 (22 features, ADRs 155-176)

## Summary

The platform has 154+ creative features, 202 pages, 205 API routes, 175 nav entries, 158 dashboard tiles. Three parallel audits found significant overlap, dead code, and quality issues.

## Audit 1: Feature Overlap & Redundancy

### Key finding
~70 of 154+ feature modules are identical code with different prompt text. Each imports `atlasChat`, exports `CREDIT_COST`, contains one bespoke system prompt. Consolidation could reduce feature files by 40-60%.

### Consolidation opportunities by category

| Category | Current modules | Proposed consolidation | Reduction |
|----------|----------------|----------------------|-----------|
| Hook tools | 8 | 1 Hook Engine (modes: generate, rank, revamp) + 1 Text Line Generator | 6 |
| Ad copy | 8 | 1 Copy Generator (outputType enum) | 6 |
| Framework designers | 9 | 1 Messaging Framework Designer (framework param) | 7 |
| Emotional appeals | 20 | 1 Emotional Appeal Designer + 1 Social Proof Designer | 16 |
| Behavioral economics | 13 | 1 Behavioral Trigger Designer + 1 Offer Architect | 10 |
| Narrative flow | 17 | 1 Narrative Flow Optimizer (phase param) | 15 |
| Analytics/prediction | 13 | 3 merged tools (forecaster, fatigue, emotion) | 9 |
| A/B testing | 7 | 1 A/B Test Lab (modes) | 5 |
| Format/platform | 9 | 1 Format & Platform Adapter | 6 |
| Brand/voice | 7 | 1 Brand Voice & Story Studio | 5 |
| Audience/persona | 7 | 1 Audience Intelligence Engine | 5 |
| Asset/media | 13 | 2 consolidated tools | 8 |
| Concept/brief | 14 | 2 consolidated tools (Concept Studio, Brief Builder) | 10 |
| Competitive/trend | 8 | 1 Market Intelligence | 6 |
| Orchestration | 12 | 3 merged tools | 6 |
| **Total** | **~155** | **~25 parameterized tools** | **~130** |

### Top-priority merges (exact duplicates)
1. `ad-creative-burnout-detector` ↔ `creative-fatigue-detector` ↔ `fatigue-detector`
2. `ad-performance-predictor` ↔ `creative-performance-forecaster`
3. `trend-intelligence` ↔ `trend-spotter`
4. `competitor-intel` ↔ `competitor-watch` ↔ `ad-competitive-intelligence`
5. `ad-creative-tension-release` ↔ `creative-ad-tension-release-strategist`
6. `ad-creative-callback-memory` ↔ `ad-creative-memory-anchor-builder`
7. `creative-ad-curiosity-gap` ↔ `ad-creative-curiosity-loop`

## Audit 2: Dead Code & Broken Routes

### Broken imports (5 slug mismatches)
- `ab-test-planner-v2/route.ts` imports `ab-test-planner` lib (no v2 lib exists)
- `fatigue/route.ts` imports `fatigue-detector` lib (no fatigue.ts lib)
- `performance/route.ts` imports `learning` lib (no performance.ts lib)
- `personas/route.ts` imports `persona-engine` lib (no personas.ts lib)
- `ugc/route.ts` imports `ugc-formats` lib (no ugc.ts lib)

These work because the imported libs exist under different names, but the slugs don't match.

### Unused libraries
- `src/lib/creative/prompts.ts` — never imported
- `src/lib/creative/workflow-conditions.ts` — never imported

### Duplicate feature pairs (user-facing confusion)
- `ab-test-planner` (page) vs `ab-test-planner-v2` (route)
- `variant-matrix` vs `variant-matrix-generator`
- `calendar` vs `smart-calendar`
- `narrative` vs `narrative-studio`
- `viral-analysis` vs `viral-analyzer`
- `reference-analysis` vs `reference-remix`
- `ugc` vs `ugc-studio`
- `workflow-builder` vs `workflow-templates`

### Orphaned pages (no API route — some intentional)
- Static/marketing: pricing, privacy, terms, reset-password, settings (intentional)
- Studio pages: creative-studio, ugc-studio, drama-studio, image-studio, audio-studio, narrative-studio (use sub-routes)
- Feature pages: ab-test-planner, ab-test-results, viral-analyzer, workflow-builder, skill-chains (use different API paths)

### Libraries without tests (8)
- director.ts, intelligence.ts, learning.ts, persona-engine.ts, prompts.ts, templates.ts, tools.ts, types.ts

## Audit 3: Production Correctness Spot-Check

### API route issues
- 33 of 202 API routes have no GET metadata endpoint
- 9 of 202 API routes don't charge credits (utility endpoints)
- `product-brief` GET metadata requires auth (inconsistent with other catalog endpoints)
- `brief-analyzer` GET metadata missing `feature` identifier

### Page issues
- `product-brief` page missing: skip link, `main#main-content`, copy-to-clipboard, dry-run notice
- `brief-analyzer` uses `copyAnalysis` instead of standard `copyToClipboard` naming
- Hardcoded English placeholder text in feature pages (e.g., "e.g., DTC skincare brand...")

### Catalog issues
- 148 titles but only 36 descriptions in appCatalog.ts
- ~38 features missing from catalog entirely

### Security
- No prompt-injection guards in `src/lib/creative/` (only in `src/lib/brand/prompts.ts`)
- User input only protected by length truncation/trimming

## Recommended Action Plan

### Phase 1: Quick fixes (low risk, high value)
1. Fix 5 slug mismatches
2. Remove 2 unused libraries
3. Fix product-brief page accessibility
4. Add missing catalog entries and descriptions
5. Add prompt-injection guards to creative libs

### Phase 2: Duplicate consolidation (medium risk)
6. Merge exact duplicate pairs (7 merges)
7. Resolve user-facing naming conflicts (8 renames)
8. Add missing ADRs for legacy features

### Phase 3: Parameterized consolidation (high effort, high value)
9. Build shared `creative-toolkit.ts` base class
10. Consolidate ~70 prompt-only modules into ~15 parameterized tools
11. Update nav, dashboard, catalog, i18n for consolidated features

### Phase 4: UX/Nav overhaul (after consolidation)
12. Categorize remaining ~25-30 tools into 6-8 nav groups
13. Add search/filter to dashboard
14. Add guided workflows for common tasks
