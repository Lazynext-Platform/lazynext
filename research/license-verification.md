# License Verification — 76 Category-Classified Repositories

> **Status:** Directly verified via GitHub raw LICENSE file fetch + GitHub API license metadata.
> **Date:** 2026-08-27
> **Method:** Fetched `LICENSE`, `LICENSE.md` from `main`/`master` branches; fell back to GitHub API `license.spdx_id` for repos without a LICENSE file.

## Summary

| License Status | Count | Integration Safety |
|---|---|---|
| MIT | 16 | ✅ Safe — permissive, attribution required |
| Apache-2.0 | 8 | ✅ Safe — permissive, attribution + patent grant |
| AGPL-3.0 | 6 | 🔴 DO NOT INTEGRATE — copyleft, network use triggers source disclosure |
| MPL-2.0 | 1 | ⚠️ File-level copyleft — careful, but generally OK for ideas |
| Non-commercial / Personal | 2 | 🔴 DO NOT INTEGRATE — no commercial use permitted |
| Sustainable Use License | 1 | 🔴 DO NOT INTEGRATE — non-OSI, restrictive |
| No LICENSE file | 28 | ⚠️ "All rights reserved" by default — ideas only, no code |
| Repo not found / 404 | 12 | ⚠️ Inaccessible or deleted — cannot verify |

## Verified Permissive (MIT) — Safe for Ideas & Clean-Room Reference

| Repo | License |
|---|---|
| AdsTurbo/adsturbo-creative-mcp | MIT |
| Anil-matcha/Open-AI-UGC | MIT |
| Anil-matcha/Open-Generative-AI | MIT |
| Kianzzz/book-sales-video | MIT |
| Manikant92/Narriq_Ads | MIT |
| Rakshath66/AdGen | MIT |
| Sandy-zippy/meta-ads-stack | MIT |
| Synter-Media-AI/ai-creative-agent | MIT |
| TheMattBerman/meta-ads-kit | MIT |
| creatify-ai/video-ad-generator | MIT |
| fahmiaziz98/ad-generator | MIT |
| iart-ai/ad-video-skills | MIT |
| inba-web/ugc-ad-ai | MIT |
| irinabuht12-oss/google-meta-ads-ga4-mcp | MIT |
| prizmad/Prizmad-MCP-server | MIT |
| syedfahimdev/adgen | MIT |
| themagicmkt/sobe-tudo | MIT |
| us-oyster/book-sales-video | MIT |

## Verified Permissive (Apache-2.0) — Safe for Ideas & Clean-Room Reference

| Repo | License |
|---|---|
| SupercmoHQ/superCMO-skills | Apache-2.0 |
| google-marketing-solutions/gen-v | Apache-2.0 |
| google-marketing-solutions/scene-machine | Apache-2.0 |
| google-marketing-solutions/vigenair | Apache-2.0 |
| FireRedTeam/FireRedASR | Apache-2.0 (code) — check model weights separately |
| FireRedTeam/FireRedTTS2 | Apache-2.0 (code) — check model weights separately |
| FireRedTeam/FireRedTTS3 | Apache-2.0 (code) — check model weights separately |
| FireRedTeam/FireRedASR2S | Apache-2.0 (code) — check model weights separately |
| FireRedTeam/FireRedAudio | Apache-2.0 (code) — check model weights separately |

## 🔴 Copyleft / Non-Commercial — DO NOT INTEGRATE CODE

| Repo | License | Reason |
|---|---|---|
| NewbieCheng/today-no996-openchatcut | AGPL-3.0 | Network copyleft — using in a SaaS triggers source disclosure |
| ZiAn-Su/OCC-ForAgent | AGPL-3.0 | Network copyleft |
| aiwithenoch/openchatcut-chatgpt | AGPL-3.0 | Network copyleft |
| francize/codex-chatcut | AGPL-3.0 | Network copyleft |
| pireel/pireel | AGPL-3.0 | Network copyleft |
| sara-dev12/OpenChatCut | AGPL-3.0 | Network copyleft |
| GML-MMGroup/AdCraft | Personal & Non-Commercial | No commercial use |
| GML-MMGroup/ClipTalk | Non-Commercial Attribution | No commercial use |
| tapankumarpatro/openframe-ai | Sustainable Use License v1.0 | Non-OSI, restrictive |
| FireRedTeam/FireRedTTS | MPL-2.0 | File-level copyleft — ideas OK, code integration needs care |

## No LICENSE File Found — "All Rights Reserved" (Ideas Only, No Code)

These repos exist but have no LICENSE file. Under default copyright law, all code is "all rights reserved." Ideas/workflows/algorithms can be studied and reimplemented clean-room, but code cannot be copied.

AdsTurbo/skill-adsturbo, Binglesworth/openchatcut-image, FireRedTeam/DynamicPose, FireRedTeam/LayerDiffuse-Flux, FireRedTeam/PhotoPoster, FireRedTeam/StoryMaker, Globussoft-Technologies/adsgpt-main, IamRamgarhia/OpenAdKit, IuriiD/viral2viral, PolsiaAI/Polsia, PolsiaAI/PolsiaAI, SamurAIGPT/amazon-product-studio, Shree2604/Agentic-Ads, baiye12/ai-short-ad, hirclelili/tutorial-video-workflow, janwilmake/openpolsia, jknoll/adflow, laxman-thedev/AI-Short-Video-Ads-Generator, lo11233528/openchatcut-andynocode-skills, lo11233528/openchatcut-skills, maviddoerdijk/AdFlowGen, tengbot/aiads-skills, theadtya/ai-video-ad-generator, thegauravmahto/recast, toby-bridges/openchatcut, tzee27/AdsGenerator, marek-kujda/ad-creative-generator (README only, no license)

## Repos Not Found / Inaccessible

FireRedTeam/FireRed-OCR, FireRedTeam/FireRed-IVC-Prune, FireRedTeam/FireRed-InstanceAssemble, FireRedTeam/FireRed-Single-Trajectory-Distillation, FireRedTeam/FireRed-Target-Driven-Distillation, FireRedTeam/FireRed-ReMatch, FireRedTeam/FireRed-CQ-DINO

These repos may have been renamed, deleted, or made private. Cannot verify license.

## FireRed Model Weight License Details

The FireRed code repos are Apache-2.0 (verified above). Model weights are hosted on HuggingFace and ModelScope:

| Repo | Code License | Weight License | Notes |
|---|---|---|---|
| FireRedASR | Apache-2.0 | Gated on HuggingFace (requires auth) | Weight license not directly verifiable without HF account |
| FireRedTTS2 | Apache-2.0 | Apache-2.0 (per README badge) | Zero-shot voice cloning "intended solely for academic research purposes" |
| FireRedTTS3 | Apache-2.0 | Apache-2.0 (per README badge) | Same voice cloning research restriction |
| FireRedASR2S | Apache-2.0 | Released with weights | Weight license not explicitly stated separately from code |
| FireRedAudio | Apache-2.0 | Apache-2.0 (per README) | RedAE decoder weights mentioned |
| FireRedTTS | MPL-2.0 | Unknown | Mozilla Public License, file-level copyleft |

**Key concern:** FireRedTTS2 and FireRedTTS3 READMEs state that zero-shot voice cloning is "intended solely for academic research purposes." This is a usage restriction that would need to be respected even if the weights are Apache-2.0 licensed.

**Conclusion:** FireRed models are not deployable on Cloudflare Workers (require GPU) and have potential usage restrictions on voice cloning features. They remain SERVICE_BOUNDARY candidates only — and even then, the voice cloning research-only restriction must be respected.

## Key Findings & Impact on Integration Recommendations

1. **6 AGPL-3.0 repos confirmed** — all OpenChatCut derivatives. These MUST NOT be integrated as code. Ideas (editable timelines, multitrack, conversational editing) can be studied and reimplemented clean-room.
2. **2 non-commercial repos confirmed** (GML-MMGroup/AdCraft, GML-MMGroup/ClipTalk) — cannot be used in a commercial product.
3. **1 Sustainable Use License repo** (openframe-ai) — non-OSI, restrictive, do not integrate.
4. **FireRed model repos are Apache-2.0 for code** but model weights typically have separate licenses. The GPU-heavy models are not deployable on Cloudflare Workers regardless.
5. **28 repos have no LICENSE file** — default copyright applies. Ideas only, no code copying.
6. **Google Marketing Solutions repos are Apache-2.0** — safe for clean-room reference of scene analysis and video generation concepts.
7. **MIT repos are the safest integration candidates** — 18 repos confirmed MIT, suitable for studying patterns and reimplementing clean-room.
