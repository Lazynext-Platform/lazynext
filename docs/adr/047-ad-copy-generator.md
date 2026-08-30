# ADR-047: Ad Copy Generator

**Date:** 2026-08-31
**Status:** Accepted

## Context

E-commerce advertisers need platform-specific ad copy that adheres to each
platform's conventions, character limits, and audience expectations. Manually
writing copy for TikTok, Instagram, and YouTube is time-consuming and often
inconsistent across platforms.

## Decision

Add an AI-powered Ad Copy Generator that:

- Accepts a product URL or brief text as input
- Generates platform-specific copy for TikTok, Instagram, and YouTube
- Produces: headline/hook, body copy, CTA, hashtags (TikTok/Instagram),
  description (YouTube)
- Optionally accepts a brand kit (tone, keywords) for brand-aligned output
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to template-based copy in dry-run mode
- Costs 3 credits per generation

### API

- `GET /api/creative/ad-copy-generator` — returns credit cost and schema
- `POST /api/creative/ad-copy-generator` — generates ad copy

### UI

- `/ad-copy-generator` — form with product URL/brief, platform selector,
  optional brand kit, and copy-to-clipboard results display

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, and `withAtlas` conventions
- Dry-run mode works with the local mock Atlas server
- No new Prisma models required
