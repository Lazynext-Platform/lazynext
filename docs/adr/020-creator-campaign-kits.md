# ADR-020: Creator Campaign Kits

## Date
2026-08-29

## Status
Accepted

## Context
The platform had AI-generated UGC ad formats but no workflow for coordinating human UGC creators at scale. Human creator partnerships require structured briefs, talking points, product information, dos and don'ts, delivery specifications, and compliance notes — all packaged into a shareable kit that a creator can follow without back-and-forth communication.

Research repositories #2 (OpenAdKit), #5 (ugc-ad-ai), and #10 (Open-AI-UGC) motivated this capability. These repos focus on UGC workflow patterns but were classified EXTRACT_IDEAS_ONLY — no code was reused.

## Decision
1. Created `src/lib/creative/creator-kits.ts` as a domain library that generates a complete `CreatorKit` from product info, platform, and campaign goal
2. The kit includes: creator brief (objective, key message, tone), talking points (sorted by priority), product info (key features, usage, pricing), dos and don'ts, delivery specs (platform-specific defaults), hook suggestions, CTA options, visual guidelines, compliance notes, and creator tips
3. Platform delivery defaults are deterministic (e.g., TikTok = 9:16, 15-60s, MP4) — no AI needed for specs
4. AI generation (via `atlasChat`) produces the creative content: brief, talking points, hooks, CTAs, tips
5. Credit cost: 6 credits per kit generation
6. API route at `/api/creative/creator-kits` follows existing auth/credit/refund patterns
7. Component at `src/components/CreatorKits.tsx` with controlled form fields and structured result display
8. Page at `/app/creator-kits/page.tsx` with auth gate

## Consequences
- Human UGC creator coordination is now a first-class workflow, distinct from AI-generated UGC
- Kits are deterministic for delivery specs (no AI hallucination on format requirements) and AI-generated for creative direction
- The kit structure is extensible — new platforms or goals can be added to the lookup functions without changing the generation pipeline
- Shareable kit representation enables future export (PDF, link sharing) without changing the domain model
- Credit cost is lower than full ad generation (6 vs 12+) because only creative content uses AI, not media generation
