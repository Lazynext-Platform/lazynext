# ADR-030: Pipeline Stage Executor, Real Media Generation, and Production Hardening

**Date:** 2026-09-01
**Status:** Accepted

## Context

ADR-029 shipped the G-series workflow execution layer — conditional stages, parallel waves, and
round-trip loading of workflow definitions. However, the pipeline executor was a pure state
machine: it only flipped status flags (`pending` → `in_progress` → `completed`) without calling
any creative generation APIs. Stages produced no real creative output, so the pipeline was a
visual orchestration tool with no substance behind it.

The H-series addressed this by adding a real stage executor (`pipeline-executor.ts`) that maps
each pipeline stage to the appropriate creative library functions, unifying persistence via
`engine.ts`, adding a Creative Studio pipeline mode with live progress tracking, and applying
production hardening (BYOK parity on A/B automation, ownership validation on `creationIds`,
bounded inputs).

The I-series builds on this foundation by wiring real media generation via
`dispatchMediaService`, adding A/B workflow-per-variant execution that runs real generation for
each variant, surfacing pipeline output in the UI via a `StageOutputViewer`, adding executor
integration tests, applying rate limiting to pipeline routes, and deprecating the old `ab-test`
route in favor of the hardened `ab-automation` route.

## Decision

### 1. Real Stage Executor (pipeline-executor.ts)

Added `src/lib/creative/pipeline-executor.ts` containing an `executeStage` function that maps
each pipeline stage type to the corresponding creative library function:

- **brief** → brief generation
- **hooks** → hook generation
- **angles** → angle generation
- **script** → script generation
- **storyboard** → storyboard generation
- **compliance** → compliance check
- **media_generation** → media dispatch (see section 5)

Each stage receives a `StageContext` object carrying the accumulated outputs of prior stages
(e.g., the script stage receives the brief output, the storyboard stage receives the script
output). This allows downstream stages to build on upstream results rather than operating in
isolation.

### 2. Unified Persistence via engine.ts

All pipeline API routes now call `engine.ts` functions for durable `WorkflowStep` persistence:

- **`startWorkflow`** — creates the workflow run and initial step rows
- **`recordStep`** — records a stage's status, output, credits spent, and duration
- **`completeWorkflow`** — marks the workflow run as completed
- **`failWorkflow`** — marks the workflow run as failed with an error message

This replaces ad-hoc Prisma calls scattered across route handlers with a single, consistent
persistence interface. The `WorkflowStep` rows feed the Analytics Hub per-stage analytics
(ADR-029, section 4).

### 3. Creative Studio Pipeline Mode

Added a UI toggle in the Creative Studio that switches to **pipeline mode**. When enabled, the
studio runs the full creative pipeline (brief → hooks → angles → script → storyboard →
compliance → media_generation) with live progress tracking. Each stage's completion updates a
progress indicator, and the final output is assembled from all stage outputs.

### 4. Production Hardening

Applied production hardening across the pipeline and A/B automation surfaces:

- **BYOK parity**: The `withAtlas` (bring-your-own-key) path now has feature parity with the
  default path on A/B automation, ensuring BYOK users can run workflow-per-variant execution.
- **Ownership validation on creationIds**: All routes that accept `creationId` parameters
  verify that the requesting user owns the referenced `Creation` rows before proceeding.
- **Bounded inputs**: All user-supplied inputs (names, budgets, targeting objects) are
  validated and bounded to prevent abuse (length limits, numeric clamping, type checks).

### 5. Real Media Generation

The `media_generation` stage calls `dispatchMediaService` with the `video_gen` capability,
producing real video media rather than placeholder files. The stage passes the storyboard and
script outputs as context so the generated media aligns with the creative direction established
by earlier stages.

### 6. A/B Workflow-Per-Variant Execution

The A/B automation flow now uses `executeStage` + `engine.ts` to run real creative generation
for each variant. Each variant gets its own workflow run with `WorkflowStep` rows persisted via
`engine.ts`, ensuring that per-variant generation is tracked, durable, and visible in the
Analytics Hub.

### 7. Pipeline Output UI

Added a `StageOutputViewer` component to the `PipelineOrchestrator` that displays the output of
each completed stage:

- **brief** — the generated creative brief
- **script** — the generated script
- **storyboard** — the generated storyboard
- **compliance** — the compliance check results
- **media** — the generated media results (URLs, metadata)

The viewer renders inline as each stage completes, giving users immediate visibility into what
the pipeline produced.

### 8. Rate Limiting on Pipeline Routes

Applied rate limiting to the pipeline API routes (`/api/creative/pipeline` POST and
`/api/creative/pipeline/[id]` PATCH) to prevent abuse. The limiter uses the same in-memory
pattern as other routes (30 requests/min default) and returns a `429` with a `Retry-After`
header when exceeded.

### 9. Old ab-test Route Deprecation

The old `/api/creative/ab-test` route is deprecated in favor of `/api/creative/ab-automation`.
A `@deprecated` JSDoc comment was added to the route handler directing callers to the
`ab-automation` route, which provides workflow-per-variant execution, winner tagging, and
production hardening (BYOK, ownership validation). The old route is kept for backward
compatibility but will be removed in a future release.

### 10. Executor Integration Tests

Added integration tests for the pipeline executor (`executeStage`) covering:

- Each stage type maps to the correct creative library function
- `StageContext` outputs are passed correctly between stages
- `engine.ts` persistence functions are called with the expected arguments
- Error handling when a stage fails (workflow marked as failed)
- Media generation stage calls `dispatchMediaService` with the correct capability

16 new tests were added, bringing the total from 1365 to 1397.

## Consequences

- The pipeline now produces **real creative output** — briefs, scripts, storyboards, compliance
  checks, and generated media — rather than just flipping status flags.
- The Analytics Hub per-stage analytics (ADR-029, section 4) now reflect actual pipeline runs
  with real `WorkflowStep` rows persisted via `engine.ts`.
- The two A/B routes (`ab-test` and `ab-automation`) are consolidated — `ab-automation` is the
  canonical route with workflow-per-variant execution, winner tagging, and hardening; `ab-test`
  is deprecated.
- Rate limiting on pipeline routes prevents abuse and protects generation credits.
- The `StageOutputViewer` gives users immediate visibility into pipeline output without
  navigating to separate pages.
- 16 new executor integration tests increase confidence in the stage-to-function mapping and
  persistence layer.

## Alternatives Considered

1. **HTTP self-calls**: Rejected — having the pipeline executor call the creative API routes
   via HTTP (e.g., `fetch('/api/creative/script')`) would double-charge credits (once for the
   pipeline run, once for the self-call) and add unnecessary latency. Calling the creative
   library functions directly avoids this.
2. **Temporal / Cloudflare Workflows**: Deferred — a dedicated workflow engine (Temporal or
   Cloudflare Workflows) would provide durable execution, retries, and observability, but the
   current `engine.ts` + `WorkflowStep` approach is sufficient for the current scale. A future
   migration to a dedicated workflow engine is documented as a possibility.
3. **Keeping placeholder media**: Rejected — the pipeline's value proposition is end-to-end
   creative production. Returning placeholder media in the `media_generation` stage would
   provide no real output and undermine the pipeline's purpose.
