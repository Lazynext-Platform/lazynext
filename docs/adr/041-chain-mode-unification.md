# ADR-041: Creative Studio Chain Mode Unification with Pipeline API

**Date:** 2026-09-02
**Status:** Accepted
**Series:** QQ

## Context

The Creative Studio page (`/creative-studio`) had a "chain mode" that ran a
step-by-step creative workflow (brief → hooks → angles → script → storyboard →
score) using a **client-side loop** — each step called a separate API endpoint
(`/api/creative/brief`, `/api/creative/hooks`, etc.), set local React state,
paused for user confirmation, and then continued when the user clicked
"Continue".

This approach had several limitations:

1. **No persistence** — if the user navigated away or refreshed, the entire
   chain state was lost. There was no `WorkflowRun` record.
2. **No credit safety** — credits were deducted per-request by each API route,
   but there was no idempotency key, no refund on partial failure, and no
   `charged` flag.
3. **No auto-advance** — the user had to manually click "Continue" after every
   step, even if they wanted the full chain to run automatically.
4. **No structured error handling** — errors were caught as raw strings, with
   no `PipelineStageError` wrapping, no stage identification, and no
   input/prior context snapshot.
5. **No retry/resume** — if a step failed, the user had to start over from the
   beginning. There was no way to retry a single stage or resume from where
   the chain left off.

Meanwhile, the Pipeline API (`/api/creative/pipeline`) already solved all of
these problems:

- Durable `WorkflowRun` persistence with optimistic locking
- Per-stage credit deduction with idempotency keys and `charged` flags
- Server-side auto-advance with a 75-second deadline
- `PipelineStageError` with stage name, input snapshot, and prior context
- Retry, skip, pause, resume, and cancel actions

## Decision

**Unify chain mode with the Pipeline API.**

Add a new pipeline template `creative-studio-chain` with stages:
`brief → script → storyboard → score` (estimated cost: 10 credits).

The `script` pipeline stage already combines hooks + angles + script
generation internally (see `pipeline-executor.ts`), so the chain's 6 steps map
to 4 pipeline stages:

| Chain step | Pipeline stage | What happens |
|------------|---------------|--------------|
| 1. Brief | `brief` | Generate creative brief from product input |
| 2-4. Hooks + Angles + Script | `script` | Generate hooks, angles, and script (combined) |
| 5. Storyboard | `storyboard` | Generate storyboard from brief + script |
| 6. Score | `score` | Quality-score the creative package |

Refactor `startChain`, `continueChain`, and `stopChain` in
`src/app/creative-studio/page.tsx` to use the Pipeline API:

- `startChain` creates a pipeline via `POST /api/creative/pipeline` with
  `templateId: 'creative-studio-chain'`, then auto-advances through stages.
- `continueChain` calls `POST /api/creative/pipeline/{id}` with
  `action: 'advance'` to resume from a paused state.
- `stopChain` calls `POST /api/creative/pipeline/{id}` with
  `action: 'cancel'` to cancel the pipeline on the server.

Stage results are mapped from the pipeline `stageResults` array back to the
existing UI state (`brief`, `hooks`, `angles`, `script`, `storyboard`, `score`).

## Consequences

### Positive

- Chain mode now has **durable persistence** — the chain survives page
  refreshes and navigation.
- **Credit safety** — per-stage idempotency keys prevent double-charging,
  and failed stages get automatic refunds.
- **Auto-advance** — the server can auto-advance through all stages within
  a 75-second deadline, so the user doesn't need to click "Continue" unless
  they want to pause.
- **Structured errors** — `PipelineStageError` provides stage name, input
  snapshot, and prior context for debugging.
- **Retry/resume** — users can retry a failed stage or resume from where
  the chain paused.
- **Observability** — chain runs now appear in the pipeline list and
  `WorkflowRun` table, visible in the observability dashboard.

### Negative

- The `script` pipeline stage combines hooks + angles + script, so the UI
  can no longer pause between hooks and angles individually. The user sees
  all three appear together when the `script` stage completes.
- The chain's step-by-step cost display (per-endpoint) is replaced by the
  pipeline's total estimated credits (10 credits for the full chain).

### Neutral

- The `creative-studio-chain` template is added to `PIPELINE_TEMPLATES` and
  is available for programmatic use, not just from the Creative Studio UI.
