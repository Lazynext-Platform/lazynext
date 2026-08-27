# Do Not Integrate Report

> For each excluded repository, the exact reason is stated.
> Repositories are not labeled "useless" — each has a specific reason for exclusion.

## License-Prohibited (AGPL/GPL)

### #48 0xsline/OpenChatCut — AGPL-3.0 ✅ VERIFIED
- **Why excluded**: AGPL-3.0 license prohibits code integration into MIT-licensed LazyNext without
  copyleft obligations extending to the entire LazyNext codebase.
- **Overlapping capability**: Conversational video editing, timeline, multitrack audio.
- **License problem**: AGPL-3.0 requires source disclosure for network use. Integrating any code
  would force LazyNext to become AGPL, incompatible with its MIT distribution model.
- **Better alternative**: Clean-room reimplementation of conversational editing concepts.
  Architecture study only — no code reuse.

### #52-59, #61 OpenChatCut forks — AGPL-3.0 ✅ VERIFIED
- sara-dev12/OpenChatCut — AGPL-3.0 (verified via LICENSE file)
- aiwithenoch/openchatcut-chatgpt — AGPL-3.0 (verified via LICENSE file)
- francize/codex-chatcut — AGPL-3.0 (verified via LICENSE file)
- NewbieCheng/today-no996-openchatcut — AGPL-3.0 (verified via LICENSE file)
- ZiAn-Su/OCC-ForAgent — AGPL-3.0 (verified via LICENSE file)
- pireel/pireel — AGPL-3.0 (verified via LICENSE file)
- toby-bridges/openchatcut — no LICENSE file found (all rights reserved)
- lo11233528/openchatcut-skills — no LICENSE file found (all rights reserved)
- lo11233528/openchatcut-andynocode-skills — no LICENSE file found (all rights reserved)
- Binglesworth/openchatcut-image — no LICENSE file found (all rights reserved)
- **Why excluded**: All inherit AGPL-3.0 from OpenChatCut upstream (where LICENSE exists) or have
  no license at all (default copyright = all rights reserved). Most are superficial forks,
  skill wrappers, or ChatGPT/Codex integrations that add no unique capability.
- **Better alternative**: Study the canonical OpenChatCut (#48) for architecture concepts only.

## License-Prohibited (Non-Commercial / Restrictive) — ✅ VERIFIED

### GML-MMGroup/AdCraft — Personal & Non-Commercial License
- **Why excluded**: LICENSE file explicitly states "PERSONAL AND NON-COMMERCIAL LICENSE"
- **Cannot be used in LazyNext** (commercial product)

### GML-MMGroup/ClipTalk — Non-Commercial Attribution License
- **Why excluded**: LICENSE file explicitly states "NON-COMMERCIAL ATTRIBUTION LICENSE"
- **Cannot be used in LazyNext** (commercial product)

### tapankumarpatro/openframe-ai — Sustainable Use License v1.0
- **Why excluded**: Non-OSI-approved license with restrictive terms (enterprise exclusions, .ee files)
- **Cannot be safely used in LazyNext**

## Deployment-Incompatible (GPU Required)

### #65-84 FireRed models (FireRedASR, FireRedTTS2, FireRed-Image-Edit, etc.)
- **Code license verified**: Apache-2.0 for FireRedASR, FireRedTTS2, FireRedTTS3, FireRedASR2S, FireRedAudio.
  FireRedTTS uses MPL-2.0 (file-level copyleft). FireRed-Image-Edit previously confirmed Apache-2.0.
  Several repos (FireRed-OCR, FireRed-IVC-Prune, etc.) are inaccessible/404.
- **Why excluded**: All FireRed models require GPU inference (PyTorch, 30GB+ VRAM).
  LazyNext runs on Cloudflare Workers (serverless, no GPU). Direct integration is impossible.
- **Overlapping capability**: ASR, TTS, image editing, OCR — LazyNext uses Atlas Cloud API for these.
- **Technical mismatch**: Python/PyTorch vs TypeScript/Cloudflare Workers.
- **Model weight license**: Separate from code license. Weights on HuggingFace/ModelScope
  typically have non-commercial research licenses — must be verified per-model before any deployment.
- **Better alternative**: Use via SERVICE_BOUNDARY (separate GPU worker) if needed in future.
  LazyNext already has Atlas Cloud for ASR/TTS/image-editing capabilities.

### #84 FireRedTeam/fireredteam.github.io
- **Why excluded**: This is a website/GitHub Pages repo, not a software project.
- **No capability**: Contains only HTML/CSS for the FireRed team website.

## Redundant / Already Superior in LazyNext

### #24 AtlasCloudAI/atlas-marketing-studio
- **Why excluded**: This IS the upstream of LazyNext. LazyNext is built on this repo.
  No integration needed — LazyNext already contains all its capabilities plus extensions.

### #6 marek-kujda/ad-creative-generator, #15 syedfahimdev/adgen, #17 theadtya/ai-video-ad-generator,
### #21 maviddoerdijk/AdFlowGen, #22 laxman-thedev/AI-Short-Video-Ads-Generator, #23 tzee27/AdsGenerator,
### #28 Rakshath66/AdGen, #34 fahmiaziz98/ad-generator, #35 baiye12/ai-short-ad
- **Why excluded**: Low-quality starter/prototype projects that duplicate LazyNext's existing
  capabilities with inferior implementations. No unique value.
- **Overlapping capability**: Basic ad generation — LazyNext has production-grade workflows.

## User Profile (Not a Repository)

### #63 Anil-matcha (user profile)
- **Why excluded**: This is a GitHub user profile URL, not a repository.
  The directive listed it but it contains multiple repos, none specifically targeted.

## Research-Only / Training Methods

### #76 FireRed-Target-Driven-Distillation, #79 FireRed-InstanceAssemble,
### #80 FireRed-Single-Trajectory-Distillation, #81 FireRed-IVC-Prune, #83 FireRed-ReMatch
- **Why excluded**: These are model training/compression research methods, not inference-ready
  tools. They have no direct application in LazyNext's production creative pipeline.
- **Future use**: Potentially valuable for R&D into efficient model deployment.

## Low-Quality / Abandoned / Demo-Only

### #27 themagicmkt/sobe-tudo, #43 Globussoft-Technologies/adsgpt-main,
### #47 Anil-matcha/Open-Generative-AI, #50 Kianzzz/book-sales-video, #60 hirclelili/tutorial-video-workflow,
### #62 us-oyster/book-sales-video
- **Why excluded**: Either abandoned, demo-only, or too niche (book sales, tutorials) to provide
  value to LazyNext's e-commerce ad studio.
- **No unique capability**: Nothing LazyNext doesn't already do better.

## AdsTurbo Profile

### #38 AdsTurbo/.github
- **Why excluded**: This is a GitHub organization profile repo (contains only .github profile config).
  Not a software project. The valuable AdsTurbo repos are #37, #39, #40.
