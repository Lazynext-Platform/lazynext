# ADR-056: Creative Mood Board Generator

**Date:** 2026-09-02
**Status:** Accepted

## Context

Establishing a cohesive visual direction early in the creative process is
critical for e-commerce brands, yet many advertisers lack a design
background and struggle to translate a product or brand description into a
concrete aesthetic. A mood board — combining color palette, typography,
imagery themes, and style references — bridges the gap between strategy
and visual execution, giving designers and marketers a shared reference
point.

## Decision

Add an AI-powered Creative Mood Board Generator that:

- Accepts a product or brand description (required), plus optional style
  keywords, target audience, and platform
- Generates a visual mood board with:
  - Color palette (primary, secondary, accent, background, text, plus a
    flat supporting colors array as hex codes)
  - Typography suggestions (heading and body fonts with style descriptions)
  - Imagery themes (3-5 themes, each with description, keywords, and
    reference styles)
  - Overall style summary
  - Emotional tone
  - Brand personality tags (3-6)
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to a keyword-derived template mood board in dry-run mode
- Costs 4 credits per generation

### API

- `GET /api/creative/mood-board-generator` — returns credit cost and
  schema info (no auth required for catalog metadata)
- `POST /api/creative/mood-board-generator` — generates a mood board
  (auth required, credits deducted, refunded on failure)

### UI

- `/mood-board-generator` — form with product/brand description, optional
  style keywords, target audience, and platform inputs; structured
  results display with color swatches, typography preview, imagery themes,
  overall style, emotional tone, brand personality tags, and
  copy-to-clipboard

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, `withAtlas`, and `safeError`
  conventions
- Dry-run mode works with the local mock Atlas server and when no API key
  is configured
- No new Prisma models required
- No shared files (en.ts, Shell.tsx, appCatalog.ts, dashboard) are
  modified — the feature is self-contained in its own library, API route,
  page, and tests
