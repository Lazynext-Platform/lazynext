# ADR-002: Creative Intelligence Layer

## Status
Accepted

## Context
LazyNext's current workflows go directly from product text → LLM storyboard → image/video 
generation. There is no intermediate creative strategy layer: no campaign objective, no 
audience hypothesis, no creative angle generation, no hook candidates, no structured brief.

The directive requires a normalized creative planning layer that generates:
- Campaign objective, audience, offer, positioning
- Key benefits, objections, hooks, creative angles
- Scripts, storyboards, visual/voice direction
- CTA, platform variants, compliance checks, A/B variations

Research findings (from creative-ad-agent #3, AdsTurbo/product-page-to-ad-brief #40, 
RemixKit #16) show that a structured brief → hooks → scripts → storyboard pipeline 
significantly improves ad quality compared to going straight to storyboard.

## Decision
Create `src/lib/creative/` with a composable creative intelligence layer:

```
src/lib/creative/
  types.ts           — CreativeBrief, CreativeAngle, HookCandidate, ScriptCandidate, 
                       StoryboardCandidate, CreativeVariant, CreativeScore
  brief.ts           — generateBrief(product, brand?, audience?) → CreativeBrief
  hooks.ts           — generateHooks(brief, count) → HookCandidate[]
  angles.ts          — generateAngles(brief, count) → CreativeAngle[]
  scripts.ts         — generateScripts(brief, angle, hook, count) → ScriptCandidate[]
  storyboard.ts      — generateStoryboard(brief, script) → StoryboardCandidate
  score.ts           — scoreCreative(creative) → CreativeScore
  prompts.ts         — System prompts for each generation step
```

Key design principles:
1. **Composable, not monolithic** — each step is independent and can be called separately
2. **Candidate-based** — each step can generate multiple candidates (5 hooks, 3 scripts)
3. **Evidence-backed** — brief references brand profile and product facts where available
4. **Language-aware** — auto-detects language from product text (like existing workflows)
5. **Uses existing atlasChat** — no new LLM dependency
6. **Credit-costed** — each step has a defined credit cost

## Consequences
- New API routes will expose these steps individually
- Existing workflows can optionally use the brief layer before storyboard generation
- The studio UI can be extended to show brief/angles/hooks before generation
- No changes to existing workflow code — this is additive
