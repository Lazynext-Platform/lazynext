# ADR-034: Multi-Concept Hook Engine

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had hooks and angles generation endpoints (`/api/creative/hooks`,
`/api/creative/angles`), but each produced a single concept at a time. A marketer asking for a
hook got one hook; asking for an angle got one angle. This is fine for focused refinement, but
ad creative testing requires diversity at scale — a marketer launching a new product needs to
test across multiple emotional triggers simultaneously to find which resonates with the audience
before committing media spend.

Single-concept generation forced marketers to call the endpoints repeatedly, manually vary the
prompt to get different emotional angles, and manually track which concepts covered which
triggers. There was no systematic way to ensure coverage across the emotional spectrum, and no
way to fork a promising concept into A/B variants for further testing.

A new module was needed that generates a diverse set of concepts in a single call, each anchored
to a distinct emotional trigger, with a mechanism to fork a base concept into variants for A/B
testing.

## Decision

### 1. New module `src/lib/creative/multi-concept.ts`

A dedicated domain library that generates 6 concepts in a single call, each anchored to a
distinct emotional trigger: fear, aspiration, humor, urgency, curiosity, and social_proof. This
ensures systematic coverage across the emotional spectrum rather than ad-hoc variation.

### 2. Concept structure

Each concept includes: `trigger` (the emotional trigger), `hook`, `angle`, `scriptOutline`,
`visualDirection`, `cta`, `estimatedDuration`, and `targetEmotion`. This gives each concept
enough structure to be independently testable and to feed into downstream script/storyboard
generation.

### 3. Optional brand research

When a `productUrl` is provided, the module performs brand research before concept generation so
that concepts are grounded in the actual product and brand voice. When no URL is provided,
concepts are generated from the provided text input alone.

### 4. Concept recommendation

A heuristic scoring function recommends the concept most likely to perform well, based on the
trigger, target emotion, and estimated duration. This gives marketers a starting point without
forcing them to evaluate all 6 concepts manually.

### 5. `forkConcept()` for A/B variants

A `forkConcept()` function takes a base concept and generates A/B variants from it, preserving
the core angle while varying the hook, CTA, or visual direction. This enables systematic A/B
testing from a promising base concept without regenerating the entire set.

### 6. Credit cost

Each generation costs 6 credits (1 credit per concept). This is higher than single-concept
endpoints but reflects the breadth of output.

### 7. API route at `/api/creative/multi-concept`

The route requires authentication, deducts 6 credits before generation, and refunds credits on
failure. Input validation enforces bounds on the optional duration and platform fields.

### 8. Dry-run mode

When the Atlas API is unavailable, the module returns deterministic placeholder output covering
all 6 triggers, so the full output contract can be tested without external calls or credit
spend.

## Consequences

- **Positive:** Enables systematic A/B testing across emotional angles. Marketers get 6
  diverse, trigger-anchored concepts in a single call, ensuring coverage without manual prompt
  engineering.
- **Positive:** `forkConcept()` enables variant generation from a promising base concept,
  supporting iterative A/B testing workflows.
- **Negative:** 6 credits per use may be steep for exploratory use where a marketer only wants
  to see a couple of options.
- **Negative:** Concepts are text-only; this endpoint does not generate media. Marketers must
  feed selected concepts into the pipeline or media generation boundary separately.

## Research Sources

Inspired by `creative-ad-agent` (MIT license, P0 tier). Took the hook-first methodology, the
pattern of 6 diverse concepts anchored to different emotional triggers, and the session forking
concept for A/B variant generation. Adapted to LazyNext's Atlas-based generation, credit system,
and plan-tier routing. Did NOT copy the original server/client code; the module is a clean
TypeScript implementation against LazyNext's existing infrastructure.
