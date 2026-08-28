# ADR-006: Performance Learning Loop

## Status
Accepted

## Context
LazyNext could generate and publish creatives but had no feedback loop. Once a creative was live,
there was no mechanism to record its performance, aggregate results, or feed learnings back into
future creative generation. The system could not improve over time.

## Decision
Implement a performance learning loop that records per-creative metrics, aggregates them by
key dimensions, and injects learnings into future brief generation.

### CreativePerformance Model
The `CreativePerformance` Prisma model (`prisma/schema.prisma`) records metrics for each published
creative:
- **Identifiers**: creative ID, hook, angle, platform, audience
- **Metrics**: impressions, clicks, spend, conversions, CTR, CPC, ROAS
- **Timestamps**: recorded at, updated at
- **Relations**: links to `AdCampaign` and `WorkflowRun` for traceability

Metrics are recorded via `POST /api/creative/performance` (called by the ad platform metrics
poller or manually).

### Aggregation by Hook / Angle / Platform
Performance data is aggregated along three dimensions:
1. **By hook** — which hooks consistently drive higher CTR and engagement
2. **By angle** — which creative angles produce better ROAS
3. **By platform** — which platforms perform best for this workspace's audience

`getPerformanceSummary()` (`src/lib/creative/performance.ts`) computes aggregate metrics
(avg CTR, avg CPC, total spend, total conversions) grouped by these dimensions.

### getLearningsContext()
`getLearningsContext()` distills the aggregated data into a concise context string:
- **Top performers** — the 3 best-performing hooks and angles with their metrics
- **Bottom performers** — the 3 worst-performing hooks and angles (to avoid repeating)
- **Platform insights** — which platform has the best ROAS for this workspace

The context string is designed to be injected into LLM prompts as additional guidance.

### Injection into Brief Generation
The `generateBrief()` function (in `src/lib/creative/intelligence.ts`) accepts an optional
`learningsContext` parameter. When provided:
- The learnings context is appended to the brief generation system prompt
- The LLM is instructed to favor hooks/angles that have historically performed well
- The LLM is instructed to avoid patterns associated with poor performance

The Autonomous Creative Director (ADR-005) automatically retrieves and injects learnings before
each run, creating a self-improving loop.

## API Route
- `POST /api/creative/performance` — records new performance metrics for a creative
- `GET /api/creative/performance` — retrieves performance summary (optionally filtered by
  platform, date range, or dimension)

## Consequences
- The system improves over time as more performance data is collected
- Creative generation is informed by real-world results, not just heuristics
- Learnings are workspace-scoped, so each user benefits from their own history
- The context string is bounded in length to avoid prompt overflow
- Cold-start: with no performance data, the loop falls back to the standard brief generation

## Implementation Notes
- `src/lib/creative/performance.ts` — `getPerformanceSummary()`, `getLearningsContext()`
- `src/app/api/creative/performance/route.ts` — record + retrieve metrics
- `prisma/schema.prisma` — `CreativePerformance` model
- `src/lib/creative/intelligence.ts` — `generateBrief()` accepts `learningsContext` parameter
- `src/lib/creative/director.ts` — calls `getLearningsContext()` before each run (ADR-005)
