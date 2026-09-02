# ADR-033: Reference Remix Pipeline

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had `/api/creative/reference-analysis`, which accepted a reference creative URL
and returned a shallow analysis (a short text summary of what the reference contained). This was
enough to give a marketer a rough sense of a competitor's ad, but it did not produce the depth of
evidence needed to actually remix the reference into a new creative.

Performance marketers need deeper evidence extraction: the specific hooks used (with timecodes),
the pacing and visual style, the emotional beats that drive engagement, and the CTA structure.
They also need a structured remix brief that translates that evidence into actionable guidance
for new creative generation — not just "here's what the reference did" but "here's how to build
something that captures what works while differentiating."

The existing endpoint produced a single-stage text summary with no typed contract. There was no
way to feed the analysis into the generation pipeline, and the analysis itself was too shallow
to inform data-driven remix decisions. A new three-stage pipeline was needed: evidence
extraction, creative analysis, and remix brief generation.

## Decision

### 1. New module `src/lib/creative/reference-remix.ts`

A dedicated domain library implementing a 3-stage analysis pipeline: evidence extraction →
creative analysis → remix brief. Each stage produces a typed output that feeds the next, so the
creative analysis is grounded in extracted evidence, and the remix brief is grounded in the
creative analysis.

### 2. `EvidenceExtraction` type

Captures structured evidence from the reference: hooks with timecodes, angles, pacing metrics,
`visualStyle`, `emotionalBeats`, and `ctaStructure`. This is the raw material that the
subsequent stages reason over, and it is exposed in the output so marketers can inspect the
evidence directly.

### 3. `CreativeAnalysis` type

Interprets the evidence: `whatWorks`, `whatDoesnt`, `whyItWorks`, `audienceFit`,
`platformOptimization`, and `performancePredictors`. This stage moves from description to
diagnosis — not just what the reference does, but why it works and where it falls short.

### 4. `RemixBrief` type

Translates the analysis into generation-ready guidance: `concept`, `hookStrategy`,
`angleStrategy`, `visualDirection`, `pacingGuidance`, `ctaStrategy`, `differentiationNotes`,
and a `generationPrompt` that can be passed directly to the video generation boundary. This is
the bridge between analysis and new creative production.

### 5. Credit cost

Each analysis costs 4 credits, reflecting the three Atlas calls (evidence extraction, creative
analysis, remix brief generation).

### 6. API route at `/api/creative/reference-remix`

The route requires authentication, deducts 4 credits before generation, and refunds credits on
failure. Input validation ensures the reference URL is a valid HTTP(S) URL before any credit
deduction.

### 7. Dry-run mode

When the Atlas API is unavailable, the module returns deterministic placeholder output covering
all three stages and all typed fields, so the full output contract can be tested without
external calls or credit spend.

## Consequences

- **Positive:** Deeper analysis enables data-driven remix decisions. Marketers get structured
  evidence (hooks, pacing, emotional beats) and a generation-ready remix brief, rather than a
  shallow text summary.
- **Positive:** The three-stage structure (evidence → analysis → brief) creates an auditable
  chain: the remix brief is traceable back to the creative analysis, which is traceable back to
  the extracted evidence.
- **Negative:** The pipeline requires a reference URL; it cannot analyze uploaded videos
  directly yet. Users must host the reference at a publicly fetchable URL.
- **Negative:** The analysis quality depends on the reference being a complete, publicly
  accessible creative; truncated or geo-restricted references will produce incomplete evidence.

## Research Sources

Inspired by `RemixKit` (P0 tier, no LICENSE file visible — architecture study only, no code
copied). Took the workflow pattern: reference → evidence extraction → creative analysis → remix
brief → generation. Also took the provider registry concept (pluggable analysis providers).
Adapted to LazyNext's Atlas-based generation and credit system. Did NOT copy any code; the
module is a clean TypeScript implementation against LazyNext's existing infrastructure.
