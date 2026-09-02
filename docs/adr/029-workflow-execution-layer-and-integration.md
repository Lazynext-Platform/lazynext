# ADR-029: Workflow Execution Layer and Integration

**Date:** 2026-09-01
**Status:** Accepted

## Context

ADR-027 introduced the Workflow Builder as a visual authoring layer over the existing
`PipelineConfig`/`PipelineStageConfig` model. ADR-028 added Workflow Builder v2 with a pure
conditional-stage logic module (`src/lib/creative/workflow-conditions.ts`) and team-shared templates.

However, several gaps remained between the v2 UI and the execution runtime:

1. **No execution bridge**: The Workflow Builder v2 UI produced `WorkflowDefinition` objects
   (conditional stages, parallel groups), but the pipeline executor consumed `PipelineConfig`.
   There was no function to translate one into the other.
2. **No parallel execution**: The existing `advancePipeline` function advanced one stage at a
   time. Parallel stages declared via `parallelWith` had no runtime support.
3. **No round-trip loading**: Saved workflow templates stored a `workflow` field in
   `payloadJson`, but the UI had no logic to reload conditions and parallel groups from a
   saved template back into the editor.
4. **No per-stage analytics**: The Analytics Hub showed aggregate workflow run counts but did
   not break down performance by individual stage (success rate, credits, duration).
5. **No winner feedback loop**: A/B Automation determined winners and paused losing campaigns,
   but the winning creation was not tagged, so downstream features could not filter or
   highlight proven winners.
6. **No team template management UI**: Team-shared templates were returned by the API, but the
   UI lacked filtering, a "team-shared" badge, and an unshare action.
7. **Onboarding was stale**: The onboarding modal did not mention the four new features
   (Workflow Builder, A/B Automation, Analytics Hub, Team Collaboration).
8. **No admin feedback dashboard**: In-app feedback was collected via the `FeedbackWidget`, but
   admins had no UI to review submissions.
9. **No invite acceptance flow**: Team invitations could be created, but there was no page for
   invitees to accept an invitation and join a team.
10. **Cross-isolate presence was undocumented**: The team presence API used an in-memory store
    scoped to a single Worker isolate, but the limitation and production recommendations were
    not documented in an ADR.

## Decision

### 1. Workflow Builder v2 UI (F1)

Extended the `/workflow-builder` page with an **advanced mode** toggle that unlocks:

- **Conditional stages**: Each stage can have a condition (field, operator, value) evaluated
  against an execution context (platform, contentType, hasVoiceover, hasMusic,
  complianceRequired, budgetTier). A per-stage config panel lets users add/remove conditions
  and select field/operator/value.
- **Parallel groups**: Adjacent stages can be linked as parallel partners via a "Enable
  Parallel" button. The UI renders a visual connector and a "parallel" badge.
- **Execution wave preview**: A live preview panel shows the resolved execution waves
  (grouped parallel stages shown in a bordered box, sequential stages shown individually)
  with an arrow between waves. Users can adjust the execution context (platform, contentType,
  budget tier, voiceover/music/compliance toggles) and see which stages will run.

The preview uses `resolveStages` and `planExecutionWaves` from
`src/lib/creative/workflow-conditions.ts` (ADR-028).

### 2. Execution Layer Integration (G1)

Added two functions to `src/lib/creative/pipeline.ts`:

- **`configFromWorkflow(workflow, ctx, base)`**: Translates a `WorkflowDefinition` (with
  conditional stages and `parallelWith` links) into a `PipelineConfig`. Stages whose
  conditions fail are set to `enabled=false` so the executor skips them. The `parallelWith`
  field is preserved on each `PipelineStageConfig` for the wave-based executor.
- **`advancePipelineWithWaves(state)`**: A wave-aware advancement function. When the current
  stage has `parallelWith` partners, all parallel stages in the wave are marked
  `in_progress` simultaneously. The pipeline only advances to the next wave when **all**
  stages in the current wave complete. For non-parallel stages, behavior is identical to
  `advancePipeline`.

The `/api/creative/pipeline` POST route was updated to accept a `{ workflow, context }` body.
When present, it calls `configFromWorkflow` to build the config and uses
`advancePipelineWithWaves` for the initial advancement (and subsequent steps via the
`[id]` route).

### 3. Round-Trip Loading of Workflow Definitions (G2)

Updated the Workflow Builder UI (`loadTemplate`) and the workflow-templates API to support
round-trip loading:

- **Save**: When advanced mode is active, the POST body includes a `workflow` field
  (`{ stages: ConditionalStage[], flags }`) alongside the simple `stages` array. The API
  stores both in `payloadJson`.
- **Load**: The GET response includes a `workflow` field if the template's `payloadJson`
  contains one. The UI's `loadTemplate` function checks for the `workflow` field and, if
  present, restores the full `ConditionalStage[]` (including conditions and `parallelWith`),
  then switches to advanced mode to display the loaded conditions.

This ensures a user can save a conditional/parallel workflow, reload it later, and see all
conditions and parallel groups intact.

### 4. Per-Stage Workflow Analytics in Analytics Hub (F2)

Extended the Analytics Hub API (`/api/analytics/hub`) to query `WorkflowStep` rows for the
user's workflow runs and aggregate per-stage metrics:

- `total`, `completed`, `failed` counts per stage
- `successRate` (completed / total × 100)
- `totalCredits` spent per stage
- `avgDurationSec` per stage

The Analytics Hub UI renders a "Per-Stage Performance" table showing each stage with its
success rate, credit cost, and average duration.

### 5. Winner Feedback Loop (F2)

When the A/B Automation PATCH route determines a winner (`determineWinner` returns a
creationId), it performs a **best-effort tagging** of the winning creation:

- Loads the winning `Creation` row from Prisma.
- Reads its `outputs` JSON field.
- If `outputs.abTestWinner` is not already set, adds:
  - `abTestWinner: true`
  - `abTestWinnerAt: <ISO timestamp>`
  - `abTestJobId: <jobId>`
- Persists the updated `outputs` back to the database.

The tagging is wrapped in try/catch so a database failure never breaks the job-check flow.
Downstream features can filter creations by `outputs.abTestWinner === true` to surface
proven winners.

### 6. Team Template Management (F4)

Added three UI affordances to the Workflow Builder's saved-templates list:

- **Filter dropdown**: Filters templates by `all` / `personal` / `team` / `builtin`.
- **Team-shared badge**: Templates with a `team:<teamId>` tag display a badge with a Users
  icon and the localized "Team" label.
- **Unshare button**: For team-shared templates owned by the current user, an unshare button
  calls `PATCH /api/creative/workflow-templates?id=xxx` with `{ action: 'unshare' }`, which
  removes all `team:*` tags from `tagsJson`.

### 7. Onboarding Updates (F4)

Updated the `OnboardingModal` component to include the four new features in the goal-selection
step:

- **Workflow Builder** (`/workflow-builder`) — automate creative production
- **A/B Automation** (`/ab-automation`) — closed-loop ad testing
- **Analytics Hub** (`/analytics-hub`) — unified performance dashboard
- **Team Collaboration** (`/team-workspace`) — collaborative creative reviews

Each goal card has a localized label, description, and icon. Selecting a goal navigates the
user to the corresponding page.

### 8. Admin Feedback Dashboard (F3)

Created `/admin/feedback` page (admin-only) that:

- Fetches feedback entries from `GET /api/feedback` (admin-only).
- Displays a table of individual feedback submissions (feature, rating, comment, timestamp).
- Shows per-feature summary cards (average rating, count).
- Includes an error banner with retry and a loading spinner.
- Links back to the main admin dashboard.

### 9. Invite Acceptance Flow (F3)

Created `/teams/join` page and `POST /api/teams/join` route:

- **Page**: Accepts a `token` query parameter. If the user is not signed in, shows an auth
  prompt. If signed in, displays the team name and inviter, and an "Accept Invitation"
  button. On accept, calls the join API. On success, redirects to the team workspace.
- **API**: Validates the token against `TeamInvitation`, checks expiry, verifies the email
  matches the session user (or allows any signed-in user if the invite email matches), creates
  a `TeamMember` row, and marks the invitation as `acceptedAt`.

### 10. Cross-Isolate Presence Documentation (F3)

The team presence API (`/api/teams/[id]/presence`) uses an in-memory `Map` scoped to a single
Worker isolate. This is documented in a detailed header comment in the route file covering:

- **The limitation**: Heartbeats sent to isolate A are invisible to GET requests on isolate B.
- **Three production fixes** (in order of preference):
  1. **Durable Objects** (best): per-team DO holds canonical presence; WebSocket Hibernation
     API for sub-second fan-out.
  2. **D1-backed presence**: add `lastSeenAt` to `TeamMember` or a `TeamPresence` table.
  3. **Workers KV**: short-TTL keys keyed by `presence:{teamId}:{userId}`.
- **Best-effort improvement**: A `member_online` activity is written to `TeamActivity` (D1)
  the first time a user becomes present in an isolate, recording presence events durably
  without spamming the feed on every 10s heartbeat.

## Consequences

- The Workflow Builder v2 UI is now fully connected to the execution runtime via
  `configFromWorkflow` and `advancePipelineWithWaves`.
- Parallel stages execute simultaneously in waves, and the pipeline waits for all stages in
  a wave to complete before advancing.
- Saved workflow templates round-trip correctly — conditions and parallel groups are
  preserved across save/load cycles.
- The Analytics Hub provides per-stage visibility into workflow performance.
- Winning A/B test creations are tagged with `abTestWinner` metadata, enabling downstream
  filtering and highlighting.
- Team template management is fully usable (filter, badge, unshare).
- New users are guided to the four new features via onboarding.
- Admins can review in-app feedback via a dedicated dashboard.
- Team invitees can accept invitations via a token-based flow.
- The cross-isolate presence limitation is documented with clear production recommendations.

## Alternatives Considered

1. **Separate workflow runtime for v2**: Rejected — the existing pipeline executor is
   well-tested and handles credit deduction, persistence, and stage transitions. Adding
   `configFromWorkflow` and `advancePipelineWithWaves` extends it without duplication.
2. **New `WorkflowRun` schema for per-stage analytics**: Rejected — the existing
   `WorkflowStep` model already records per-step status, credits, and timestamps. Aggregating
   in the API route is sufficient.
3. **New `AbTestWinner` Prisma model**: Rejected — tagging the winning `Creation.outputs`
   JSON is sufficient and avoids a migration. Downstream queries filter on the JSON field.
4. **Durable Objects for presence now**: Deferred — the in-memory store with best-effort
   activity logging is sufficient for the current single-isolate deployment. The
   documentation ensures the production fix is clear when multi-isolate scaling is needed.
5. **Email-based invite delivery**: Rejected for now — the invite URL is returned to the
   inviter for manual sharing (e.g., via chat). Email delivery requires an email provider
   and is a separate future task.
