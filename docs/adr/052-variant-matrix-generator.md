# ADR-052: Creative Variant Matrix Generator

**Date:** 2026-09-02
**Status:** Accepted

## Context

Effective A/B testing of ad creative requires systematic variation across
multiple dimensions — not just one hook or one angle at a time. Media buyers
need a structured matrix that spans hooks, angles, formats, and platforms so
they can test diverse combinations methodically and learn which dimensions
drive performance.

Currently, variant combinations are assembled manually feature-by-feature
(multi-concept, hook-library, ad-copy-generator), with no single tool that
generates a coherent cross-dimensional matrix with predicted scores and
rationales for each cell.

## Decision

Add an AI-powered Creative Variant Matrix Generator that:

- Generates a matrix of creative variants across four dimensions: hook,
  angle, format, and platform
- Each variant combines a distinct hook, angle, format, and platform with a
  predicted performance score (0-100) and a one-sentence rationale
- Maximizes diversity across the matrix to cover a wide testing surface
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to heuristic-based template variants in dry-run mode
- Costs 5 credits per generation

### API

- `GET /api/creative/variant-matrix-generator` — returns credit cost, schema,
  and available dimensions
- `POST /api/creative/variant-matrix-generator` — generates a variant matrix

### UI

- `/variant-matrix-generator` — form for product/brand input, dimension
  checkboxes (hook/angle/format/platform), platform selector, and count,
  with a results table showing each variant's hook, angle, format, platform,
  predicted score, rationale, and copy-to-clipboard button

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, `withAtlas`, and `safeError`
  conventions
- Variants are returned to the client only (no persistent store) — future
  work could add a Prisma model to persist matrices and track test outcomes
- Dry-run mode works with the local mock Atlas server
