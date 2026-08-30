# ADR-037: Creative Performance Learning Loop

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had a performance learning module (`src/lib/creative/learning.ts`, ADR-006) that
queries `CreativePerformance` records and exposes `getPerformanceSummary()` and
`getLearningsContext()`. These functions aggregate historical ad performance — which hooks,
angles, and creatives performed well or poorly — and surface the data as context for downstream
generation. However, the loop was open: performance data was collected and summarized, but it was
not systematically fed back into improved creative briefs. A marketer had to read the learnings
and manually rewrite their next brief.

Closing the loop requires more than surfacing data. The system needs to take the performance
summary, extract concrete learnings, and generate an improved brief that incorporates what worked
and avoids what didn't. This turns historical performance into a forward-looking creative input,
which is the core value proposition of a performance-driven creative pipeline.

The patterns were drawn from `google-meta-ads-ga4-mcp` (which demonstrated performance data
feeding back into creative decisions) and `creative-ad-agent` (which demonstrated a
hook-first creative agent that iterates on briefs based on feedback).

## Decision

### 1. New module `src/lib/creative/performance-loop.ts`

A dedicated domain library that closes the performance-to-brief loop. The module is pure logic
for assembling the performance context; the actual brief generation is delegated to the existing
`atlasChat` generation path.

### 2. Uses existing `getPerformanceSummary()` and `getLearningsContext()`

The module does not re-query performance data. It calls the existing functions from `learning.ts`
to obtain the performance summary and learnings context, then assembles them into a structured
prompt for brief improvement. This reuses the aggregation logic already built and tested in
ADR-006.

### 3. Feeds performance context to `atlasChat` for improved briefs

The assembled performance context is passed to `atlasChat`, which generates improved briefs that
incorporate the learnings. The LLM sees what hooks, angles, and creatives historically performed
well and produces briefs that lean into successful patterns while avoiding underperforming ones.

### 4. 5-credit cost per execution

Each performance-loop execution costs 5 credits. This reflects the cost of the LLM generation
call plus the value of producing an improved, performance-grounded brief. Credits are deducted
before generation and refunded on failure, following existing conventions.

### 5. API route at `/api/creative/performance-loop`

The route supports GET (return the output schema and current performance summary) and POST
(generate improved briefs from the performance context). The route requires authentication,
deducts 5 credits before generation, and refunds on failure.

### 6. Dry-run mode with deterministic placeholder

When no performance data exists (i.e., no `CreativePerformance` records), the module returns a
deterministic placeholder output rather than calling the LLM. This allows the full output
contract to be tested without external calls or credit spend, and gives users a clear signal that
the loop needs historical data to produce meaningful insights.

### 7. Output structure

The output includes: `CreativeLearning[]` (extracted learnings), `ImprovedBrief[]` (generated
briefs incorporating the learnings), `summary` (a human-readable summary of the loop), a
`recommendedNextSteps` array, and the `generationPrompt` used. This gives marketers both the
improved briefs and the reasoning behind them.

### 8. UI page at `/performance-loop`

A new page with a `PerformanceLoopStudio` component renders the performance summary, extracted
learnings, improved briefs, and recommended next steps. Marketers can trigger a loop execution
and review the improved briefs in a single view.

## Consequences

- **Positive:** Closes the performance-to-brief loop. Historical performance data now flows
  directly into improved creative briefs without manual intervention.
- **Positive:** Reuses existing `learning.ts` aggregation logic, avoiding duplicated query code.
- **Positive:** The dry-run mode makes the output contract testable without performance data or
  credit spend.
- **Negative:** Requires `CreativePerformance` records to generate meaningful insights. Users
  with no historical performance data get generic placeholder briefs, which may be less useful
  than a fresh brief generated without the loop.
- **Negative:** The loop is a single pass; it does not iteratively refine briefs across multiple
  rounds. Future work could add multi-pass refinement.

## Research Sources

Inspired by `google-meta-ads-ga4-mcp` (MIT license, issue #30), which demonstrated performance
data feeding back into creative decisions, and `creative-ad-agent` (MIT license, issue #3), which
demonstrated a hook-first creative agent that iterates on briefs based on feedback. Took the
performance-feedback-loop pattern and the hook-first brief improvement methodology. Adapted to
LazyNext's Atlas-based generation, credit system, and existing `learning.ts` infrastructure. Did
NOT copy the original server/client code; the module is a clean TypeScript implementation against
LazyNext's existing performance learning and generation infrastructure.
