# ADR-050: Ad Script Writer

**Date:** 2026-09-03
**Status:** Accepted

## Context

E-commerce advertisers need full multi-scene ad scripts — not just copy — that
they can hand to a creator or editor. A complete script includes visual cues,
voiceover lines, B-roll notes, on-screen text, and per-scene timing, all
tailored to the conventions of TikTok, YouTube, and Instagram Reels. Writing
these by hand is slow and platform conventions are easy to get wrong.

## Decision

Add an AI-powered Ad Script Writer that:

- Accepts a product URL or brief text as input (max 2000 chars)
- Generates a full multi-scene ad script for TikTok, YouTube, and Instagram
  Reels
- Produces per scene: id, durationSec, visualDescription, voiceover,
  brollNotes, onScreenText
- Produces a script-level hook and CTA, plus totalDurationSec
- Optionally accepts a target total duration (5-120 seconds)
- Optionally accepts a brand kit (tone, keywords) for brand-aligned output
- Uses Atlas LLM via `atlasChat` with plan-tier-aware model selection
- Falls back to deterministic template scenes (3-5) in dry-run mode
- Costs 5 credits per generation

### API

- `GET /api/creative/ad-script-writer` — returns credit cost, schema, and
  supported platforms
- `POST /api/creative/ad-script-writer` — generates an ad script

### UI

- `/ad-script-writer` — form with product URL/brief, platform selector,
  optional duration slider, optional brand kit, and scene-by-scene results
  display with copy-to-clipboard per field and for the full script

## Consequences

- Adds a new creative API route and UI page
- Uses existing auth, credit deduction/refund, `withAtlas`, and `safeError`
  conventions
- Dry-run mode works with the local mock Atlas server and produces
  deterministic placeholder scenes
- No new Prisma models required
