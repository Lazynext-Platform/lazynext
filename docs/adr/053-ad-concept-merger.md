# ADR-053: Ad Concept Merger

**Date:** 2026-09-01
**Status:** Accepted

## Context

Creative teams often produce multiple competing concepts for a single ad —
different hooks, angles, scripts, and visual directions generated independently
or by different tools. Reconciling these into one cohesive ad concept is manual,
slow, and prone to unresolved conflicts (contradictory tones, competing CTAs,
disjointed narrative flow).

## Decision

Add an AI-powered Ad Concept Merger that:

- Accepts 2-10 creative concepts as input, each typed as `hook`, `angle`,
  `script`, or `visual`, with optional source attribution
- Optionally accepts a target platform to bias the merge
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Produces a single unified concept: unified hook, unified angle, unified
  script, unified visual, conflict resolutions, optimization notes, and a
  flow score (0-100)
- Falls back to a heuristic merge in dry-run mode (picks the strongest hook,
  merges angles, concatenates scripts, synthesizes visuals)
- Costs 5 credits per merge

### API

- `GET /api/creative/ad-concept-merger` — returns credit cost and schema
- `POST /api/creative/ad-concept-merger` — merges concepts

### UI

- `/ad-concept-merger` — dynamic form with add/remove concept rows, each with a
  type selector and content textarea, optional target platform, and a unified
  concept results display with copy-to-clipboard and a flow-score bar

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, and `withAtlas` conventions
- Dry-run mode works with the local mock Atlas server
- No new Prisma models required
