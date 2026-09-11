# ADR-225: Company Bootstrapper — Wow-Moment Pipeline

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

New users had to manually create goals, tasks, documents, and memories to
get started. The onboarding experience was fragmented and required multiple
steps with no cohesive "wow moment."

The `openpolsia` reference demonstrated a company bootstrap flow that takes
a company description and generates a full set of starter assets in one step.

## Decision

**Add a company bootstrapper pipeline** (`src/lib/services/company-bootstrapper.ts`)
that runs 7 steps in sequence, each best-effort:

1. **Research** — LLM call to research the company (dry-run safe)
2. **Landing page** — generates a markdown landing page document
3. **Starter goals** — creates 3 initial goals
4. **Starter tasks** — creates 5 initial tasks in a "Company Setup" project
5. **Starter documents** — creates company overview, brand guidelines, meeting template
6. **Welcome email** — emits a welcome email event (Phase F wires actual sending)
7. **Initial memories** — writes 3 memories (fact, knowledge, preference)

The pipeline is:
- **Credit-metered** (10 credits)
- **Dry-run safe** (placeholder output when no Atlas API key)
- **Best-effort** (partial success is reported, not fatal)
- **Event-tracked** (emits `company.bootstrap.started` and `.completed`)

API: `POST /api/company/bootstrap`
UI: `/company-bootstrap`

## Consequences

- New users get a full set of starter assets in one action.
- The pipeline is safe to run locally (dry-run mode).
- Partial failures are reported transparently.
- 9 new tests.
