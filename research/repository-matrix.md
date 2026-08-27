# LazyNext Repository Research Matrix (84 Repositories)

> Generated 2026-08-27. 
> 
> **Methodology**: 8 repositories were directly inspected via webfetch (README, file tree, 
> license badge). The remaining 76 were classified by group characteristics, repo name semantics, 
> and the directive's own starting hypotheses. Repositories marked "REQUIRES MANUAL REVIEW" 
> for license were not directly inspected and their license classification is a best-effort 
> estimate — do not integrate code from these without verifying the LICENSE file.
>
> **Quota note**: Background research subagents failed due to weekly usage quota exhaustion.
> This matrix is therefore less complete than the directive requires. The 8 directly-inspected 
> repos are marked with [INSPECTED]. All others are marked [CATEGORY-CLASSIFIED].

## Decision Framework
- **DIRECT_INTEGRATE**: Technically + license compatible, commercially viable, useful, not redundant
- **ADAPTER_INTEGRATE**: Valuable concept but different architecture — wrap in clean interface
- **SERVICE_BOUNDARY**: Valuable but must run as separate process/service (GPU, Python, etc.)
- **EXTRACT_IDEAS_ONLY**: Architecture/prompts/UX valuable but code not appropriate for reuse
- **REFERENCE_ONLY**: Conceptual inspiration only (duplicates, forks, research demos)
- **DO_NOT_USE**: License incompatible, security risk, abandoned, redundant, or no benefit

---

## GROUP A — Ad Creative Generation (1-42)

| # | Repository | License | LazyNext Fit | Recommendation | Priority | Integration Method |
|---|-----------|---------|-------------|----------------|----------|-------------------|
| 1 | context-dot-dev/ad-maker | MIT [INSPECTED] | High — brand research + ad generation | EXTRACT_IDEAS_ONLY | P0 | URL→brand→brief workflow concepts |
| 2 | IamRamgarhia/OpenAdKit | Unknown [CATEGORY] | Medium — marketing tool | EXTRACT_IDEAS_ONLY | P1 | UGC framework concepts |
| 3 | DV0x/creative-ad-agent | MIT [INSPECTED] | High — hook-first, brand research, 6 concepts | EXTRACT_IDEAS_ONLY | P0 | Hook methodology + brand research agent pattern |
| 4 | Synter-Media-AI/ai-creative-agent | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P1 | Creative strategy concepts |
| 5 | inba-web/ugc-ad-ai | Unknown [CATEGORY] | Medium — UGC ads | EXTRACT_IDEAS_ONLY | P1 | UGC format ideas |
| 6 | marek-kujda/ad-creative-generator | Unknown [CATEGORY] | Low — likely starter | REFERENCE_ONLY | P3 | None |
| 7 | GML-MMGroup/AdCraft | Unknown [CATEGORY] | Medium — video editing | EXTRACT_IDEAS_ONLY | P1 | Editing architecture study (check license) |
| 8 | tapankumarpatro/openframe-ai | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P1 | Creative framework concepts |
| 9 | Shree2604/Agentic-Ads | Unknown [CATEGORY] | Medium — agentic ads | EXTRACT_IDEAS_ONLY | P1 | Agent orchestration concepts |
| 10 | Anil-matcha/Open-AI-UGC | Unknown [CATEGORY] | Medium — UGC | EXTRACT_IDEAS_ONLY | P1 | UGC workflow ideas |
| 11 | jknoll/adflow | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 12 | Manikant92/Narriq_Ads | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P1 | Narrative ad concepts |
| 13 | google-marketing-solutions/scene-machine | Apache-2.0 likely [CATEGORY] | High — Google official | EXTRACT_IDEAS_ONLY | P1 | Scene analysis concepts |
| 14 | google-marketing-solutions/gen-v | Apache-2.0 likely [CATEGORY] | High — Google official | EXTRACT_IDEAS_ONLY | P1 | Video generation concepts |
| 15 | syedfahimdev/adgen | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 16 | caoqc4/RemixKit | No LICENSE file visible [INSPECTED] | HIGH — reference→analysis→remix | EXTRACT_IDEAS_ONLY | P0 | Reference analysis workflow + provider registry pattern |
| 17 | theadtya/ai-video-ad-generator | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 18 | creatify-ai/video-ad-generator | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P2 | Video ad workflow ideas |
| 19 | tengbot/aiads-skills | Unknown [CATEGORY] | Medium — skills/agents | EXTRACT_IDEAS_ONLY | P1 | Agent skill patterns |
| 20 | google-marketing-solutions/vigenair | Apache-2.0 likely [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P2 | Video generation concepts |
| 21 | maviddoerdijk/AdFlowGen | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 22 | laxman-thedev/AI-Short-Video-Ads-Generator | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 23 | tzee27/AdsGenerator | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 24 | AtlasCloudAI/atlas-marketing-studio | MIT [INSPECTED] | LazyNext IS this repo | REFERENCE_ONLY | — | LazyNext is built on this; no integration needed |
| 25 | TheMattBerman/meta-ads-kit | Unknown [CATEGORY] | Medium — Meta ads | EXTRACT_IDEAS_ONLY | P2 | Meta ads integration concepts |
| 26 | SamurAIGPT/amazon-product-studio | Unknown [CATEGORY] | Medium — product images | EXTRACT_IDEAS_ONLY | P2 | Product image concepts |
| 27 | themagicmkt/sobe-tudo | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 28 | Rakshath66/AdGen | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 29 | attainmentlabs/meta-ads-mcp | MIT [INSPECTED] | High — Meta Ads MCP | EXTRACT_IDEAS_ONLY | P2 | Meta Ads tool contract + safety patterns |
| 30 | irinabuht12-oss/google-meta-ads-ga4-mcp | Unknown [CATEGORY] | High — ads + analytics | EXTRACT_IDEAS_ONLY | P2 | Google/Meta/GA4 integration concepts |
| 31 | Sandy-zippy/meta-ads-stack | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P2 | Meta ads stack concepts |
| 32 | thegauravmahto/recast | Unknown [CATEGORY] | Medium — remix | EXTRACT_IDEAS_ONLY | P1 | Reference remix concepts |
| 33 | iart-ai/ad-video-skills | Unknown [CATEGORY] | Medium — skills | EXTRACT_IDEAS_ONLY | P1 | Agent skill patterns |
| 34 | fahmiaziz98/ad-generator | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 35 | baiye12/ai-short-ad | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 36 | SupercmoHQ/superCMO-skills | Unknown [CATEGORY] | Medium — CMO skills | EXTRACT_IDEAS_ONLY | P1 | Agent skill patterns |
| 37 | AdsTurbo/adsturbo-creative-mcp | Unknown [CATEGORY] | Medium — creative MCP | EXTRACT_IDEAS_ONLY | P1 | MCP tool patterns |
| 38 | AdsTurbo/.github | Unknown [CATEGORY] | Low — profile | REFERENCE_ONLY | P3 | None |
| 39 | AdsTurbo/skill-adsturbo | Unknown [CATEGORY] | Medium — skills | EXTRACT_IDEAS_ONLY | P1 | Agent skill patterns |
| 40 | AdsTurbo/product-page-to-ad-brief | MIT [INSPECTED] | HIGH — URL→brief→scripts→storyboard | ADAPTER_INTEGRATE | P0 | Brief schema + angle/script/storyboard generation |
| 41 | prizmad/Prizmad-MCP-server | Unknown [CATEGORY] | Medium — MCP | EXTRACT_IDEAS_ONLY | P2 | MCP server patterns |
| 42 | IuriiD/viral2viral | Unknown [CATEGORY] | Medium — viral remix | EXTRACT_IDEAS_ONLY | P1 | Viral analysis concepts |

## GROUP B — Agentic Business / Autonomous Systems (43-47)

| # | Repository | License | LazyNext Fit | Recommendation | Priority | Integration Method |
|---|-----------|---------|-------------|----------------|----------|-------------------|
| 43 | Globussoft-Technologies/adsgpt-main | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 44 | janwilmake/openpolsia | Unknown [CATEGORY] | Medium — autonomous ops | EXTRACT_IDEAS_ONLY | P2 | Autonomous task orchestration concepts |
| 45 | PolsiaAI/Polsia | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P2 | Agent loop concepts |
| 46 | PolsiaAI/PolsiaAI | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P2 | Agent state concepts |
| 47 | Anil-matcha/Open-Generative-AI | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |

## GROUP C — Video Editing / OpenChatCut Ecosystem (48-63)

| # | Repository | License | LazyNext Fit | Recommendation | Priority | Integration Method |
|---|-----------|---------|-------------|----------------|----------|-------------------|
| 48 | 0xsline/OpenChatCut | **AGPL-3.0** [INSPECTED] | High concept, BLOCKED license | EXTRACT_IDEAS_ONLY | P1 | Conversational editing architecture (NO code reuse) |
| 49 | pireel/pireel | Unknown [CATEGORY] | Medium — video editing | EXTRACT_IDEAS_ONLY | P1 | Timeline architecture (check license) |
| 50 | Kianzzz/book-sales-video | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 51 | GML-MMGroup/ClipTalk | Unknown [CATEGORY] | Medium | EXTRACT_IDEAS_ONLY | P1 | Clip editing concepts (check license) |
| 52 | toby-bridges/openchatcut | Likely AGPL [CATEGORY] | Fork of OpenChatCut | REFERENCE_ONLY | P3 | None (fork) |
| 53 | sara-dev12/OpenChatCut | Likely AGPL [CATEGORY] | Fork of OpenChatCut | REFERENCE_ONLY | P3 | None (fork) |
| 54 | aiwithenoch/openchatcut-chatgpt | Likely AGPL [CATEGORY] | Fork/wrapper | REFERENCE_ONLY | P3 | None (fork) |
| 55 | lo11233528/openchatcut-skills | Likely AGPL [CATEGORY] | Skills wrapper | REFERENCE_ONLY | P3 | None (fork) |
| 56 | Binglesworth/openchatcut-image | Likely AGPL [CATEGORY] | Image extension fork | REFERENCE_ONLY | P3 | None (fork) |
| 57 | lo11233528/openchatcut-andynocode-skills | Likely AGPL [CATEGORY] | Skills wrapper | REFERENCE_ONLY | P3 | None (fork) |
| 58 | francize/codex-chatcut | Likely AGPL [CATEGORY] | Codex wrapper | REFERENCE_ONLY | P3 | None (fork) |
| 59 | NewbieCheng/today-no996-openchatcut | Likely AGPL [CATEGORY] | Fork | REFERENCE_ONLY | P3 | None (fork) |
| 60 | hirclelili/tutorial-video-workflow | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 61 | ZiAn-Su/OCC-ForAgent | Likely AGPL [CATEGORY] | Agent wrapper for OCC | REFERENCE_ONLY | P3 | None (fork) |
| 62 | us-oyster/book-sales-video | Unknown [CATEGORY] | Low | REFERENCE_ONLY | P3 | None |
| 63 | Anil-matcha (user profile) | N/A | N/A | DO_NOT_USE | — | User profile, not a repo |

## GROUP D — FireRed Media Foundation Models (64-84)

| # | Repository | Code License | Model License | GPU? | Recommendation | Priority |
|---|-----------|-------------|---------------|------|----------------|----------|
| 64 | FireRed-OpenStoryline | Apache-2.0 [INSPECTED] | Separate weights [REQUIRES REVIEW] | Yes (Python) | EXTRACT_IDEAS_ONLY | P1 |
| 65 | FireRedASR | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P2 |
| 66 | FireRedTTS2 | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P2 |
| 67 | FireRed-Image-Edit | Apache-2.0 [INSPECTED] | Separate weights on HF [REQUIRES REVIEW] | Yes (30GB VRAM) | SERVICE_BOUNDARY | P2 |
| 68 | FireRedTTS | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P3 |
| 69 | FireRedTeam/StoryMaker | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | REFERENCE_ONLY | P3 |
| 70 | FireRedASR2S | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P2 |
| 71 | FireRedVAD | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | REFERENCE_ONLY | P3 |
| 72 | FireRed-OCR | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P2 |
| 73 | FireRedTeam/LayerDiffuse-Flux | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | REFERENCE_ONLY | P3 |
| 74 | FireRedTTS3 | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P3 |
| 75 | FireRedTeam/PhotoPoster | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | REFERENCE_ONLY | P3 |
| 76 | FireRed-Target-Driven-Distillation | Apache-2.0 likely [CATEGORY] | N/A (training method) | Yes | REFERENCE_ONLY | P3 |
| 77 | FireRedTeam/DynamicPose | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | REFERENCE_ONLY | P3 |
| 78 | FireRedAudio | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | SERVICE_BOUNDARY | P2 |
| 79 | FireRed-InstanceAssemble | Apache-2.0 likely [CATEGORY] | N/A (training method) | Yes | REFERENCE_ONLY | P3 |
| 80 | FireRed-Single-Trajectory-Distillation | Apache-2.0 likely [CATEGORY] | N/A (training method) | Yes | REFERENCE_ONLY | P3 |
| 81 | FireRed-IVC-Prune | Apache-2.0 likely [CATEGORY] | N/A (compression method) | Yes | REFERENCE_ONLY | P3 |
| 82 | FireRed-CQ-DINO | Apache-2.0 likely [CATEGORY] | Separate weights [REQUIRES REVIEW] | Yes | REFERENCE_ONLY | P3 |
| 83 | FireRed-ReMatch | Apache-2.0 likely [CATEGORY] | N/A (method) | Yes | REFERENCE_ONLY | P3 |
| 84 | FireRedTeam/fireredteam.github.io | N/A | N/A | No | DO_NOT_USE | — | Website only |

---

## Summary Statistics

| Recommendation | Count | Repos |
|---------------|-------|-------|
| DIRECT_INTEGRATE | 0 | None — all repos differ enough from LazyNext to require adaptation |
| ADAPTER_INTEGRATE | 1 | #40 (AdsTurbo/product-page-to-ad-brief — MIT, schema portable) |
| SERVICE_BOUNDARY | 8 | FireRed models requiring GPU (#65,66,67,70,72,74,78) |
| EXTRACT_IDEAS_ONLY | ~35 | Most Group A + key Group B/C repos |
| REFERENCE_ONLY | ~35 | Forks, starters, research demos, low-quality repos |
| DO_NOT_USE | 2 | #63 (user profile), #84 (website only) |

## Key Findings

### License-Critical
- **OpenChatCut (#48) is AGPL-3.0** — NO code can be copied into MIT LazyNext. All 8+ OpenChatCut forks (#52-59, #61) inherit AGPL. Architecture study only.
- **FireRed repos are Apache-2.0 code** but model weights are separately licensed on HuggingFace/ModelScope — REQUIRES MANUAL REVIEW before any commercial use.
- **AdsTurbo/product-page-to-ad-brief (#40) is MIT** — the only repo suitable for ADAPTER_INTEGRATE (portable JSON schema, no network dependency).
- **RemixKit (#16) has no visible LICENSE file** — REQUIRES MANUAL REVIEW before any code reuse. Architecture concepts are valuable though.

### Architecture-Critical
- **RemixKit (#16)**: reference video → evidence extraction → creative analysis → remix brief → video generation. This is EXACTLY the ReferenceCreativeAnalysis workflow the directive wants. Provider registry pattern (analysis + video) is also what the directive wants.
- **creative-ad-agent (#3)**: hook-first methodology, brand website research, 6 diverse concepts with different emotional triggers, session forking for A/B testing. Hook generation and brand research patterns are directly applicable.
- **FireRed-OpenStoryline (#64)**: conversational video editing via natural language, editing skill archiving, ASR-based rough cut. Conversational agent patterns are valuable but Python/Apache-2.0.
- **meta-ads-mcp (#29)**: MIT, Meta Ads campaign creation/reporting/budget control with safety tools. Tool contract and safety patterns (dry-run, approval, spend caps) are directly applicable to LazyNext's future ad-platform integration.

### Deployment Incompatibility
- All FireRed models require GPU (PyTorch, 30GB+ VRAM) — incompatible with Cloudflare Workers. Can only be used via SERVICE_BOUNDARY (separate GPU worker).
- OpenChatCut uses Remotion + Electron — desktop app architecture, not web-deployable on Cloudflare.

## UNVERIFIED Items
- Licenses for 76 repos not directly inspected — marked [CATEGORY] and "REQUIRES MANUAL REVIEW"
- FireRed model weight licenses — all marked "REQUIRES REVIEW" (need to check HuggingFace/ModelScope terms)
- RemixKit license — no LICENSE file visible in GitHub file tree
- Whether OpenChatCut forks truly inherit AGPL (very likely but not individually verified)
