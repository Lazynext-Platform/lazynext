# ADR-032: Product Page to Ad Brief Pipeline

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had `/api/creative/url-to-brief`, which accepted a product page URL and
returned a simple text brief summarizing the product. This was useful as a starting point, but
DTC teams need far more than a single paragraph to feed into video generation. They need a
structured, multi-stage output that mirrors the way performance marketers actually think about a
creative: a product read, multiple angles to test, UGC scripts written for those angles, a
storyboard that can drive media generation, a generation prompt that can be handed to a video
model, and compliance notes that catch policy issues before any spend occurs.

The existing `url-to-brief` endpoint produced an opaque string. Downstream pipeline stages
(script, storyboard, media generation) could not reliably parse it, and there was no structured
contract between the brief and the rest of the creative pipeline. This made it impossible to run
an end-to-end flow from a raw product URL to a generation-ready creative package without manual
copy-paste and reformatting at every stage.

A new module was needed that produces a structured, portable JSON document with well-typed
fields for each stage, so that the output can feed directly into the existing pipeline executor
and video generation boundary.

## Decision

### 1. New module `src/lib/creative/product-brief.ts`

A dedicated domain library with structured types: `ProductBriefInput`, `ProductBriefOutput`,
`AdAngle`, `UgcScript`, and `StoryboardScene`. The input captures the product URL, target
platform, desired duration, and optional brand context. The output is a typed object with
discrete fields for each generation stage rather than a single text blob.

### 2. Multi-stage generation

The module produces output in a fixed sequence: product read → 3 angles → 3 UGC scripts (one per
angle) → 5-scene storyboard → generation prompt → compliance notes. Each stage's output feeds
the next, so angles are derived from the product read, scripts are derived from angles, and the
storyboard is derived from the scripts. The generation prompt is a compact, model-ready string
that can be passed directly to the video generation boundary.

### 3. Credit cost

Each generation costs 5 credits. This reflects the multi-stage Atlas calls (product read, angle
generation, script generation, storyboard generation, compliance check) and is higher than a
single-stage brief but lower than a full pipeline run.

### 4. Dry-run mode

When the Atlas API is unavailable (or `dryRun` is explicitly requested), the module returns
deterministic placeholder output covering all stages. This lets the UI and tests exercise the
full structured output contract without consuming credits or making external calls.

### 5. API route at `/api/creative/product-brief`

The route requires authentication, deducts 5 credits before generation, and refunds credits on
failure (matching the compensation pattern used across other creative routes). It validates the
input via the module's validation function before any credit deduction occurs.

### 6. Validation with bounds checking

A `validateProductBriefInput` function enforces bounds: duration must be between 5 and 120
seconds, platform must be one of the supported enum values, and the product URL must be a valid
HTTP(S) URL. Invalid input returns a 400 before credits are touched.

## Consequences

- **Positive:** Structured output enables downstream pipeline integration. The typed
  `ProductBriefOutput` can be fed directly into the script, storyboard, and media generation
  stages without manual reformatting, closing the gap between a raw product URL and a
  generation-ready creative package.
- **Positive:** Dry-run mode with deterministic placeholders lets the full output contract be
  tested without Atlas credentials or credit spend.
- **Negative:** 5 credits per use may be high for iterative use, where a marketer wants to
  regenerate angles or scripts repeatedly. Future work could allow partial regeneration
  (e.g., regenerate only the storyboard) at a lower credit cost.
- **Negative:** The module depends on the product page being publicly fetchable; pages behind
  auth walls or with aggressive bot protection will fail at the product-read stage.

## Research Sources

Inspired by `AdsTurbo/product-page-to-ad-brief` (MIT license, ADAPTER_INTEGRATE tier). Took the
structured output schema — the decomposition into product read, angles, UGC scripts, and
storyboard — and the portable JSON format that can be consumed by downstream tools. Adapted to
LazyNext's Atlas-based generation, credit system, and plan-tier routing. Did NOT copy the
original CLI code; the module is a clean TypeScript implementation against LazyNext's existing
provider and credit infrastructure.
