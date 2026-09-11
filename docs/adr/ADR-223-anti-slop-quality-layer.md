# ADR-223: Anti-Slop Quality Layer

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

Lazynext's creative generation pipelines (ad copy, landing pages, UI) relied
solely on LLM-based quality scoring. This had two problems: (1) LLM quality
judgments are non-deterministic and expensive, and (2) the platform had no
deterministic guard against the generic, machine-default "AI slop" patterns
that make generated content feel templated and inauthentic.

External skill repositories (`no-ai-slop`, `stop-slop`, `kill-ai-slop`,
`impeccable`) documented specific, deterministic rules for detecting these
patterns in both prose and visual/UI output.

## Decision

**Add a deterministic anti-slop quality layer** with two scanners:

1. **Copy de-slop scanner** (`src/lib/quality/copy-rules.ts`) — detects banned
   phrases, hedging, throat-clearing, passive voice, and structural slop.
   Scores on a 50-point rubric across 5 axes: clarity, specificity, trust,
   rhythm, and slop density.

2. **Visual/UI design-rules scanner** (`src/lib/quality/design-rules.ts`) —
   detects 33 design tells from the `kill-ai-slop` skill: gradient backgrounds,
   generic stock imagery, emoji-heavy CTAs, centered hero stacks, etc.

Both scanners are pure functions with no LLM calls. They are wired into:
- Standalone creative features (`copy-deslop`, `design-audit`)
- Ad-copy generation as a post-pass (`slopReport` field in results)
- Public site publishing as a gate (Phase E)

External skill content is vendored into `.devin/skills/` with MIT/Apache
attribution. No application-bundle imports from skill directories.

## Consequences

- Generated copy is automatically de-slopped before delivery.
- Public website publishing rejects pages with too many design tells.
- Quality scoring is deterministic and free (no LLM cost).
- 49 new unit tests (26 copy + 23 design).
