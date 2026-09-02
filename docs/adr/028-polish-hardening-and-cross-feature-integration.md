# ADR-028: Polish, Hardening, Cross-Feature Integration, and Workflow v2

**Date:** 2026-09-01
**Status:** Accepted

## Context

After deploying the four new features (D1–D4: Team Collaboration v2, Analytics Hub, A/B Automation,
Workflow Builder), a comprehensive audit identified edge cases, missing error handling, empty-state
gaps, and accessibility issues across all four features. Additionally, the features were isolated
from each other with no cross-feature integration.

The product also needed:
- Workflow Builder v2 capabilities (conditional stages, parallel execution)
- Team sharing of workflow templates
- In-app user feedback collection
- Documentation updates

## Decision

### 1. Polish & Hardening (E1)

Applied systematic fixes across all four features:

**Workflow Builder:**
- Added error banner with retry for template loading failures
- Added delete confirmation dialog
- Added keyboard reordering (arrow keys + up/down buttons)
- Added `maxLength` on inputs, input trimming, and duplicate stage prevention
- Added `aria-grabbed`, `aria-label`, `role="listitem"` for drag-and-drop accessibility
- Fixed infinite loading state on API error

**A/B Automation:**
- Fixed `calculateSignificance` to guard against zero impressions and NaN
- Fixed `determineWinner` to validate `primaryMetric` and guard against NaN
- Fixed `summarizeJob` to guard against NaN in spend/revenue
- Fixed `parseAutomationMetadata` to type-guard `__automation` field
- Added error banner with retry for job loading failures
- Added per-job loading state for check-results button
- Added `role="alert"` on error blocks
- Added accessible labels for icon-only table headers
- Added duplicate creative ID de-duplication
- Added input validation (trimmed name, positive budget)

**Analytics Hub:**
- Added empty state for new users with no data
- Added error banner with retry
- Added `aria-busy` on loading spinner
- Fixed NaN guards on all numeric displays (impressions, clicks, spend, revenue, ROAS, credits)
- Fixed negative projection days (clamped to `null`)
- Fixed short creative ID display (guard against IDs < 12 chars)
- Added `aria-hidden` on decorative icons
- Fixed API route to guard against undefined `cost`, `delta`, `createdAt` values

**Team Collaboration:**
- Fixed infinite spinner on API error (teams list page)
- Added error banners with retry
- Added empty state for zero members
- Fixed avatar edge case (guard against empty name/email)
- Added `alt` text to avatar images
- Added `aria-label` on online-status dots
- Added email format validation on invite
- Disabled submit button during invite sending
- Made polling visibility-aware (pauses when tab hidden)
- Added try/catch around all Prisma calls in API routes
- Restricted client-postable activity types (system types reserved)
- Validated `limit` parameter in activity API

### 2. Cross-Feature Integration (E2)

**Workflow Builder → A/B Automation:**
- Added workflow template selector in A/B Automation page
- Selecting a workflow pre-fills the test name

**Workflow Runs → Analytics Hub:**
- Added workflow run metrics to the Analytics Hub API
- Added "Workflow Stats" section showing total/completed/failed runs, average duration, and runs by type

### 3. Workflow Builder v2 (E3)

Created `src/lib/creative/workflow-conditions.ts` — a pure module for conditional stage execution:

- **Conditional stages**: Each stage can have a condition (field, operator, value) that determines
  whether it runs based on the execution context (platform, contentType, hasVoiceover, etc.)
- **Parallel execution**: Stages can declare `parallelWith` partners; `planExecutionWaves` groups
  them into execution waves
- **Serialization**: `serializeWorkflow`/`deserializeWorkflow` for JSON storage
- **Validation**: `validateWorkflow` checks for valid stages, conditions, and structure
- 20 unit tests covering all functions

### 4. Team Workflows (E4)

- Updated `GET /api/creative/workflow-templates` to include team-shared templates
  (templates with `team:<teamId>` tag)
- Updated `POST` to accept optional `teamId` parameter (verifies team membership)
- Added team selector in the Workflow Builder UI
- Templates saved with a team tag are visible to all team members

### 5. In-App Feedback (E5)

- Created `FeedbackWidget` component (floating button → rating + comment dialog)
- Created `POST /api/feedback` API (stores feedback as `CreativeTemplate` with category 'feedback')
- Created `GET /api/feedback` API (admin-only retrieval)
- Added the widget to all 4 new feature pages
- Localized across all 13 locales

## Consequences

- All four features are now production-hardened with proper error handling, empty states, and accessibility
- Cross-feature integration creates a cohesive product experience
- Workflow Builder v2's conditional/parallel execution logic is ready for UI integration
- Team workflow sharing enables collaborative template management
- In-app feedback provides a direct channel for user input on new features
- No new Prisma models were added — feedback and team-shared templates reuse `CreativeTemplate`

## Alternatives Considered

1. **New `Feedback` Prisma model**: Rejected — `CreativeTemplate` with `category: 'feedback'` is sufficient
2. **Full node-graph editor for Workflow v2**: Deferred — the conditional logic module is ready, but the UI upgrade to a graph editor is a separate future task
3. **Separate workflow runtime for v2**: Rejected — the existing pipeline executor remains the runtime; the conditional logic module produces a filtered stage list for the executor
