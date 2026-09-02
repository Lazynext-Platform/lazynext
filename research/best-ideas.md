# Best Ideas to Absorb from 84 Repositories

> Grouped by capability area. For each idea: source repository, original concept,
> LazyNext adaptation, technical location, priority.

## Brand Research

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| context-dot-dev/ad-maker (#1) | Brand website research → extract offers, value props, proof | `extractBrand(url)` → BrandExtraction → BrandKit | `src/lib/brand/extract.ts` | P0 ✅ |
| creative-ad-agent (#3) | Research-driven: extracts real data from brand websites | Brand intelligence feeds creative brief generation | `src/lib/creative/intelligence.ts` | P0 ✅ |
| AdsTurbo/product-page-to-ad-brief (#40) | Product page → structured brief (MIT, portable schema) | `extractProduct(url)` → ProductExtraction → brief input | `src/lib/brand/extract.ts` | P0 ✅ |

## Creative Strategy

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| creative-ad-agent (#3) | Hook-first methodology (hooks = 80% of ad performance) | `generateHooks(brief, count)` → HookCandidate[] | `src/lib/creative/intelligence.ts` | P0 ✅ |
| creative-ad-agent (#3) | 6 diverse concepts with different emotional triggers | `generateAngles(brief, count)` → CreativeAngle[] | `src/lib/creative/intelligence.ts` | P0 ✅ |
| AdsTurbo/product-page-to-ad-brief (#40) | Brief → angles → scripts → storyboard pipeline | Composable brief→hooks→angles→script→storyboard chain | `src/lib/creative/intelligence.ts` | P0 ✅ |

## UGC

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| Open-AI-UGC (#10) | UGC ad formats | LazyNext already has 16 ad formats in `formats.ts` | Existing | — |
| ugc-ad-ai (#5) | UGC workflow patterns | Already covered by existing formats | Existing | — |

## Reference Ad Analysis

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| RemixKit (#16) | Reference video → evidence extraction → creative analysis → remix brief | `analyzeReferenceCreative(url)` → ReferenceCreativeAnalysis | `src/lib/creative/intelligence.ts` | P0 ✅ |
| RemixKit (#16) | Provider registry: analysis (OpenAI/Gemini/Anthropic/DeepSeek) + video (Luma/Runway/Veo/fal/Replicate) | Model capability registry with provider abstraction | `src/lib/providers/registry.ts` | P0 ✅ |
| viral2viral (#42) | Viral content remix | Reference analysis → adaptation recommendations → remix brief | `src/lib/creative/intelligence.ts` (remixFromReference) | P1 ✅ |

## Storyboarding

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| AdsTurbo/product-page-to-ad-brief (#40) | 5-scene storyboard from brief | `generateStoryboard(brief, script)` → StoryboardCandidate | `src/lib/creative/intelligence.ts` | P0 ✅ |

## Agent Architecture

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| creative-ad-agent (#3) | Orchestrator → research → hook → art-style agents | Composable creative functions (not monolithic agent) | `src/lib/creative/intelligence.ts` | P0 ✅ |
| creative-ad-agent (#3) | Session management with forking for A/B testing | Candidate-based generation (multiple hooks/scripts/angles) | `src/lib/creative/types.ts` | P0 ✅ |
| FireRed-OpenStoryline (#64) | Conversational refinement via natural language | `refineCreative()` — iterate on hooks/angles/scripts via NL | `src/lib/creative/intelligence.ts` | P1 ✅ |
| OpenChatCut (#48) | Agent-native video editing with MCP | Creative tool contracts — 10 tools with JSON schemas, validation, registry, execute functions + execution API (POST /api/creative/tools/execute) | `src/lib/creative/tools.ts`, `src/app/api/creative/tools/execute/route.ts` | P2 ✅ |

## Provider Architecture

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| RemixKit (#16) | Provider-pluggable workflow engine | Provider interfaces (Image/Video/TTS/ASR/Research/Analysis); provider router integrated into creative intelligence (getLLMModel) | `src/lib/providers/`, `src/lib/providers/router.ts`, `src/lib/creative/intelligence.ts` | P0 ✅ |
| RemixKit (#16) | BYOK (bring your own API keys) | LazyNext already has BYOK via `x-atlas-key` header | Existing | — |

## Meta Ads / Analytics

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| meta-ads-mcp (#29) | Meta Ads campaign creation/reporting/budget with safety tools | AdPlatformProvider interface with dry-run/approval/spend caps | `src/lib/ad-platforms/meta.ts` | P2 ✅ |
| meta-ads-mcp (#29) | Safety: dry-run, preview, approval, audit log | Dry-run mode, requireApproval flag, spend caps | `src/lib/ad-platforms/types.ts` | P2 ✅ |
| google-meta-ads-ga4-mcp (#30) | Google/Meta/GA4 unified analytics | Performance feedback loop (CreativePerformance → learnings → briefs) | `src/lib/creative/learning.ts` | P2 ✅ |

## Video Editing

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| OpenChatCut (#48) | Conversational video editing, timeline, multitrack | Timeline data model (types, builder, validation) + Prisma model, persisted to D1 (GET/POST /api/editor/timeline) | `src/lib/editor/types.ts`, `src/lib/editor/timeline-builder.ts`, `src/app/api/editor/timeline/route.ts` | P1 ✅ |
| FireRed-OpenStoryline (#64) | Conversational refinement, editing skill archiving | Editing skill archive — 5 builtin skills, CRUD, recommendation | `src/lib/editor/skills.ts`, `src/app/api/editor/skills/route.ts` | P1 ✅ |
| pireel (#49) | Timeline architecture | Timeline data model with tracks, clips, transitions, markers | `src/lib/editor/types.ts` | P1 ✅ |
| OpenChatCut (#48) | Editor UI with timeline, multitrack | Editor UI — /editor with Rough Cut, Skills, Timeline tabs | `src/app/editor/page.tsx` | P1 ✅ |
| FireRed-OpenStoryline (#64) | Director → Editor workflow | Director → Editor workflow — script scenes → transcript → rough cut ("Send to Editor" link) | `src/app/creative-director/page.tsx`, `src/app/editor/page.tsx` | P2 ✅ |

## ASR / Transcription

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| FireRedASR (#65) | High-quality ASR with word-level timestamps | ASRProvider interface + Atlas implementation (whisper-large-v3); POST /api/editor/transcribe (video URL → transcript, 2 credits) | `src/lib/providers/audio.ts`, `src/lib/providers/atlas-audio.ts`, `src/app/api/editor/transcribe/route.ts` | P2 ✅ |
| FireRed-OpenStoryline (#64) | ASR-based rough cut for speech videos | Transcript-driven rough cut planning with EDL export; rough cut planner + ASR transcribe flow | `src/lib/editor/transcript-cut.ts`, `src/app/api/editor/rough-cut/route.ts` | P2 ✅ |

## OCR

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| FireRed-OCR (#72) | Extract text from product packaging/labels | OCRProvider interface + dryRunOCR stub; registry entry for firered-ocr; POST /api/editor/ocr (image URL → text, 1 credit, dry-run) | `src/lib/providers/ocr.ts`, `src/app/api/editor/ocr/route.ts` | P2 ✅ (dry-run) |

## Image Editing

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| FireRed-Image-Edit (#67) | High-fidelity image editing, portrait consistency | Future: SERVICE_BOUNDARY for advanced image edits (GPU required) | Future | P2 |

## Autonomous Workflows

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| Polsia/OpenPolsia (#44-46) | Autonomous task orchestration, agent loops, persistent state | Autonomous Creative Director with workflow engine, budget control, asset persistence | `src/lib/creative/director.ts` | P3 ✅ |

## Observability

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| meta-ads-mcp (#29) | Tool call audit logging | WorkflowRun/WorkflowStep records in D1 | `src/lib/workflow/engine.ts` | P2 ✅ |

✅ = implemented in this session
