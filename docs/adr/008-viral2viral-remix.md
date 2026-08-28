# ADR-008: viral2viral Remix — Reference-Adapted Creative Briefs

## Status
Accepted

## Date
2026-08-28

## Context
The reference analysis feature extracts the persuasive structure of a viral ad — its hook type,
pacing, emotional arc, and other structural elements. However, there was no way to apply that
extracted structure to a new product. Users needed a "remix this viral video for my brand" flow:
take the proven persuasive structure of a reference ad and generate an original creative brief
adapted to their own product.

Without this flow, the reference analysis was informative but not actionable. Users could see
*why* a viral ad worked, but could not translate that insight into a new creative for their own
product without manually bridging the gap.

## Decision
Implement `remixFromReference()` — a function that takes a reference creative analysis and
product information and generates an ORIGINAL brief that adapts the reference's persuasive
structure without copying its content.

### remixFromReference()
`remixFromReference()` (`src/lib/creative/remix.ts`) accepts:
- **Reference creative analysis** — the extracted persuasive structure (hook type, pacing,
  emotional arc, structural beats) from a previously analyzed viral ad
- **Product info** — the user's product, brand, and audience details

The function:
1. Extracts the structural elements from the reference analysis (hook type, pacing, emotional arc)
2. Constructs a remix prompt that maps those structural elements onto the user's product and brand
3. Enforces originality constraints — the generated brief must adapt the *structure*, not copy the
   *content*, of the reference
4. Calls the LLM to produce an original creative brief
5. Runs compliance and originality checks on the output
6. Returns the remixed brief

The key distinction is structure vs. content: the remix borrows the persuasive *scaffolding*
(how the ad is built) while generating entirely original *substance* (what the ad says) tailored
to the user's product.

### API Route
- `POST /api/creative/remix` — accepts a reference analysis + product info; returns a remixed
  creative brief
- **Cost: 4 credits** (or 9 credits if auto-analysis is included — when the user provides a raw
  reference ad that has not yet been analyzed, the route automatically runs the reference analysis
  first for 5 credits, then the remix for 4 credits)

### UI
A "Remix" button is added to the creative-studio reference analysis section. When a reference
analysis is displayed, the user can click "Remix" to generate a new brief adapted from that
reference's structure for their current product.

## Consequences
- **Positive**: Users can leverage proven ad structures for their own products, turning reference
  analysis from an informational feature into an actionable creative generation tool
- **Positive**: Originality constraints are enforced — the remix adapts structure, not content,
  preventing cloning of the reference ad
- **Negative**: Requires a reference analysis first; if the user has not pre-computed one, the
  auto-analysis adds 5 credits to the total cost
- **Neutral**: Remix replaces the current brief rather than offering a side-by-side view. A future
  enhancement could offer side-by-side comparison of the original and remixed briefs

## Inspired By
- RemixKit (#16) — reference analysis → remix brief flow
- viral2viral (#42) — viral content remix concept

## Implementation Notes
- `src/lib/creative/remix.ts` — `remixFromReference()` function
- `src/app/api/creative/remix/route.ts` — API endpoint
- Creative-studio reference analysis section — "Remix" button UI
- Integrates with the reference analysis feature (persuasive structure extraction) and ADR-002
  (creative intelligence) for LLM calls
