# ADR-021: Brand-to-Multi-Concept Flow

## Date
2026-08-29

## Status
Accepted

## Context
The platform could generate individual ad concepts (hooks, angles, scripts) but lacked an orchestrated pipeline that takes a raw product URL or description, extracts brand intelligence, and produces multiple divergent ad concepts in a single pass. Users had to manually chain brand extraction → brief → hooks → angles → scripts → storyboards, which was tedious and produced concepts that were often too similar.

Research repository #40 (AdsTurbo/product-page-to-ad-brief, MIT) was the only ADAPTER_INTEGRATE classification. Its URL → brand → ad brief pattern directly motivated this feature. The portable JSON schema was adapted to LazyNext's existing types.

## Decision
1. Created `src/lib/creative/brand-concepts.ts` as a domain library that orchestrates: source content → brand extraction → N divergent ad concepts
2. Source type is `url` or `description` — both feed into the same brand extraction + concept generation pipeline
3. Each `AdConcept` includes: angle, emotional trigger (10 types), hook, script, storyboard (frame-by-frame), estimated duration, target emotion, CTA, and platform fit scores
4. `calculateDiversityScore()` measures concept divergence across emotional triggers, angles, hooks, CTAs, and platform fit — returns 0-100
5. `calculateConceptScore()` scores individual concepts (0-100) based on storyboard richness, platform fit, and trigger uniqueness
6. `recommendConcept()` picks the highest-scoring concept and generates a human-readable reason
7. `generateCrossConceptInsights()` analyzes trigger distribution, common themes, unique angles, platform fit, and CTA diversity across all concepts
8. Credit cost: 10 credits (higher than individual generation because it produces 2-5 complete concepts with storyboards)
9. API route, component, page, and tests follow existing patterns

## Consequences
- Users get multiple divergent concepts in one pass instead of manual chaining
- Diversity scoring ensures concepts are genuinely different (not just rephrased)
- Recommendation engine helps users pick the best concept without manual comparison
- Cross-concept insights surface testing opportunities (e.g., "unique angles to test", "CTA diversity")
- The MIT-licensed schema from AdsTurbo was adapted, not copied — LazyNext's types are TypeScript-native with additional fields (platformFit, emotionalTrigger, diversityScore)
- Concept count is bounded (2-5) to keep generation time and credit cost reasonable
