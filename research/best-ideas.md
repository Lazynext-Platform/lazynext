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
| viral2viral (#42) | Viral content remix | Reference analysis → adaptation recommendations | `src/lib/creative/types.ts` | P1 |

## Storyboarding

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| AdsTurbo/product-page-to-ad-brief (#40) | 5-scene storyboard from brief | `generateStoryboard(brief, script)` → StoryboardCandidate | `src/lib/creative/intelligence.ts` | P0 ✅ |

## Agent Architecture

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| creative-ad-agent (#3) | Orchestrator → research → hook → art-style agents | Composable creative functions (not monolithic agent) | `src/lib/creative/intelligence.ts` | P0 ✅ |
| creative-ad-agent (#3) | Session management with forking for A/B testing | Candidate-based generation (multiple hooks/scripts/angles) | `src/lib/creative/types.ts` | P0 ✅ |
| FireRed-OpenStoryline (#64) | Conversational refinement via natural language | Future: conversational creative agent (P1) | Future | P1 |
| OpenChatCut (#48) | Agent-native video editing with MCP | Future: MCP tool contract for creative operations (P2) | Future | P2 |

## Provider Architecture

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| RemixKit (#16) | Provider-pluggable workflow engine | Provider interfaces (Image/Video/TTS/ASR/Research/Analysis) | `src/lib/providers/` | P0 ✅ |
| RemixKit (#16) | BYOK (bring your own API keys) | LazyNext already has BYOK via `x-atlas-key` header | Existing | — |

## Meta Ads / Analytics

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| meta-ads-mcp (#29) | Meta Ads campaign creation/reporting/budget with safety tools | Future: AdPublishingProvider interface with dry-run/approval/spend caps | Future | P2 |
| meta-ads-mcp (#29) | Safety: dry-run, preview, approval, audit log | Future: approval system for spend-affecting actions | Future | P2 |
| google-meta-ads-ga4-mcp (#30) | Google/Meta/GA4 unified analytics | Future: performance feedback loop | Future | P2 |

## Video Editing

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| OpenChatCut (#48) | Conversational video editing, timeline, multitrack | Future: lightweight native editor (AGPL — ideas only, no code) | Future | P1 |
| FireRed-OpenStoryline (#64) | Conversational refinement, editing skill archiving | Future: editing skill patterns (Apache-2.0 — ideas only) | Future | P1 |
| pireel (#49) | Timeline architecture | Future: timeline data model study | Future | P1 |

## ASR / Transcription

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| FireRedASR (#65) | High-quality ASR with word-level timestamps | Future: ASRProvider interface (SERVICE_BOUNDARY — GPU required) | Future | P2 |
| FireRed-OpenStoryline (#64) | ASR-based rough cut for speech videos | Future: transcript-driven editing | Future | P2 |

## OCR

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| FireRed-OCR (#72) | Extract text from product packaging/labels | Future: structured product ingestion from images (SERVICE_BOUNDARY) | Future | P2 |

## Image Editing

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| FireRed-Image-Edit (#67) | High-fidelity image editing, portrait consistency | Future: SERVICE_BOUNDARY for advanced image edits (GPU required) | Future | P2 |

## Autonomous Workflows

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| Polsia/OpenPolsia (#44-46) | Autonomous task orchestration, agent loops, persistent state | Future: "Autonomous Creative Director" (P3) | Future | P3 |

## Observability

| Source Repo | Original Concept | LazyNext Adaptation | Location | Priority |
|---|---|---|---|---|
| meta-ads-mcp (#29) | Tool call audit logging | Future: structured workflow events | Future | P2 |

✅ = implemented in this session
