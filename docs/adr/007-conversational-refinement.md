# ADR-007: Conversational Creative Refinement

## Status
Accepted

## Date
2026-08-28

## Context
After the Creative Director (ADR-005) generates hooks, angles, and scripts, users need a way to
iterate on specific elements via natural language — for example, "make the hook more urgent" or
"shorten the script to 15 seconds." The existing creative pipeline was strictly one-shot: once the
director produced its outputs, there was no refinement loop. Users had to re-run the entire
pipeline to get a different variation, wasting credits and discarding the parts of the creative
that were already working.

A targeted, conversational refinement capability lets users tweak individual creative elements in
place, preserving the overall structure while adjusting tone, length, urgency, or any other
attribute expressible in natural language.

## Decision
Implement `refineCreative()` — a function that takes a creative element and a natural language
instruction and returns a refined version of that element.

### refineCreative()
`refineCreative()` (`src/lib/creative/refine.ts`) accepts:
- **Creative element** — the specific output to refine (a hook, angle, script, or storyboard)
- **Natural language instruction** — the user's refinement request (e.g., "make the hook more
  urgent", "add a call-to-action at the end")

The function:
1. Validates the instruction for safety and compliance
2. Constructs a refinement prompt that includes the original element, the instruction, and the
   active brand safety / compliance constraints
3. Calls the LLM to produce a refined version
4. Re-runs compliance checks on the refined output
5. Returns the refined element

Brand safety and compliance constraints from the original generation are preserved — refinement
cannot bypass them.

### API Route
- `POST /api/creative/refine` — accepts a creative element + instruction; returns the refined
  element
- **Cost: 2 credits** per refinement call

### UI
The `/creative-director` page exposes a refinement panel:
- **Target selector** — choose which creative element to refine (hook, angle, script, storyboard)
- **Instruction textarea** — free-form natural language input for the refinement request
- **Result display** — shows the refined output alongside the original for comparison

## Consequences
- **Positive**: Users can iterate on specific creative elements without re-running the entire
  pipeline, saving credits and preserving working parts of the creative
- **Positive**: Refinement preserves brand safety and compliance constraints — the refined output
  is subject to the same checks as the original generation
- **Negative**: Each refinement costs 2 credits, which can add up if a user iterates many times
- **Neutral**: Refinement is stateless — there is no conversation history, so each call is
  independent. A future enhancement could add multi-turn chat context to allow follow-up
  refinements that build on previous ones

## Inspired By
- FireRed-OpenStoryline (#64) — conversational refinement concept

## Implementation Notes
- `src/lib/creative/refine.ts` — `refineCreative()` function
- `src/app/api/creative/refine/route.ts` — API endpoint
- `/creative-director` page — refinement UI (target selector, instruction textarea, result display)
- Integrates with ADR-002 (creative intelligence) for LLM calls and compliance checks
