# ADR-005: Autonomous Creative Director

## Status
Accepted

## Context
LazyNext's creative pipeline required manual invocation of each step (brief → hooks → angles →
scripts → storyboard). There was no way to run the full pipeline autonomously, select the best
output, and publish it — all with budget guardrails and human approval gates.

## Decision
Implement `runCreativeDirector()` — an agent loop in `src/lib/creative/director.ts` that
orchestrates the entire creative pipeline autonomously.

### Pipeline Steps
The loop executes the following steps in order:
1. **Brief generation** — `generateBrief(product, brand?, audience?)`
2. **Hook generation** — `generateHooks(brief, count)` → multiple candidates
3. **Angle generation** — `generateAngles(brief, count)` → multiple candidates
4. **Script generation** — `generateScript(brief, angle, hook)` for each hook/angle combination
5. **Storyboard generation** — `generateStoryboard(brief, script)` for top scripts
6. **Scoring** — `scoreCreative()` evaluates each combination on 10 quality dimensions
7. **Best-combination selection** — selects the highest-scoring hook/angle/script/storyboard
8. **Variant generation** — `generateVariants()` produces A/B test variants of the winner
9. **Publish** (gated) — creates an ad campaign via the ad platform provider

### Budget Constraints
The loop enforces hard budget limits to prevent runaway costs:
- **Max credits per run** — total credit spend across all steps is capped; the loop aborts if exceeded
- **Max generations per step** — limits the number of candidates per step (e.g., max 5 hooks)
- **Max combinations scored** — limits the combinatorial explosion of hook × angle × script

Budget parameters are configurable per run and default to conservative values.

### Approval Gates
The loop pauses for human approval at two points:
1. **Before publishing** — the selected best combination is presented for review; the user must
   explicitly approve before an ad campaign is created
2. **Before spend** — the ad platform's own approval gate (see ADR-004) provides a second layer

If approval is denied, the loop stores the generated creatives for later manual publishing.

### Best-Combination Selection
After scoring all combinations, the loop:
- Ranks by composite score (weighted across the 10 quality dimensions)
- Filters out any combination with compliance risk above threshold
- Selects the top-ranked combination as the "winner"
- Generates 2-3 A/B variants of the winner for testing

### Learnings Injection
Before brief generation, the loop calls `getLearningsContext()` (see ADR-006) to retrieve
performance learnings from past creatives. These learnings are injected into the brief prompt,
enabling the director to leverage what has historically worked (or avoid what hasn't).

## API Route
- `POST /api/creative/director` — starts the autonomous loop; returns a `WorkflowRun` ID
- The loop runs asynchronously; progress is tracked via `WorkflowRun` and `WorkflowStep` records

## Data Models
- `WorkflowRun` (`prisma/schema.prisma`) — tracks a single director run (status, budget, result)
- `WorkflowStep` (`prisma/schema.prisma`) — tracks each step within a run (type, input, output, credits)

## Consequences
- Full creative pipeline can run end-to-end with a single API call
- Budget constraints prevent unbounded spend
- Approval gates keep humans in control of publishing
- Learnings injection creates a self-improving loop over time
- The loop is asynchronous and observable via WorkflowRun/WorkflowStep records

## Implementation Notes
- `src/lib/creative/director.ts` — `runCreativeDirector()` agent loop
- `src/app/api/creative/director/route.ts` — API endpoint
- `prisma/schema.prisma` — `WorkflowRun`, `WorkflowStep` models
- Integrates with ADR-002 (creative intelligence), ADR-004 (ad platforms), ADR-006 (learnings)

## Update — Workflow Engine, Asset Persistence, Streaming (2026-08-28)
- **Workflow engine integration**: the director loop now records execution to `WorkflowRun`/
  `WorkflowStep` tables via `startWorkflow()`, `recordStep()`, `completeWorkflow()`, and
  `failWorkflow()`, providing durable observability of each run and its steps.
- **Asset persistence**: generated outputs (brief, hooks, angles, best combination, variants) are
  persisted as `Asset`/`AssetVersion` records in D1 via `persistCreativePackage()` in
  `src/lib/creative/asset-persist.ts`. Persisted assets are listable via `GET /api/creative/assets`.
- **Streaming NDJSON response**: `POST /api/creative/director` now returns an NDJSON stream emitting
  step-by-step progress updates (brief, hooks, angles, scoring, variants) for real-time UI feedback.
  Legacy non-streaming mode is available via `?stream=false`.
