# ADR-012: Editing Skill Archive

## Status
Accepted

## Date
2026-08-28

## Context
FireRed-OpenStoryline (#64) introduces the concept of archiving editing skills — reusable patterns
that capture how a particular style of video is cut. An editing skill encodes the *steps* of a
cutting style (e.g., "fast-paced hook cut", "emotional drama build") along with the content types
and platforms it suits, so that the same pattern can be applied to future edits without starting
from scratch each time.

Users need both a library of curated, built-in editing patterns and the ability to create their own
skills based on what works for their content. Without a skill archive, every edit starts from a
blank slate and the knowledge of what cutting style fits a given content type is never captured or
reused.

## Decision
Create `src/lib/editor/skills.ts` defining an `EditingSkill` interface, shipping 5 built-in
skills, and providing a CRUD API with recommendation support.

### EditingSkill Interface
Each skill is defined by:
- **steps** — an ordered list of editing steps describing the cutting pattern
- **content types** — the content types this skill suits (e.g., `tutorial`, `product-demo`,
  `drama`, `ugc`)
- **platforms** — the target platforms this skill is optimized for (e.g., `tiktok`, `youtube`,
  `instagram`)
- **tags** — searchable keywords for discovery

### Built-In Skills
5 curated skills ship out of the box:
1. **Fast-Paced Hook Cut** — rapid cuts in the first 3 seconds to maximize hook retention
2. **Product Demo Zoom & Pan** — zoom-and-pan emphasis on product features during demonstrations
3. **Drama Emotional Build** — gradually lengthening takes to build emotional tension
4. **UGC Raw Cut** — minimal cuts preserving authentic, unpolished feel
5. **Tutorial Step-by-Step** — structured cuts aligned to tutorial steps with clear transitions

### CRUD API
- `createSkill()`, `getSkill()`, `listSkills()`, `updateSkill()`, `deleteSkill()`
- Built-in skills are protected — they cannot be modified or deleted
- User-created skills are fully editable by their owner

### Recommendation
`recommendSkills()` takes a content type and platform and returns matching skills ranked by
relevance, helping users discover which editing pattern fits their current project.

## Consequences
- **Positive**: Users get curated editing patterns out of the box, lowering the barrier to
  producing well-cut video without prior editing expertise
- **Positive**: User-created skills enable pattern sharing — a user can capture a cutting style
  that works for their content and reuse it across future edits
- **Positive**: The recommendation engine matches skills to content type and platform, surfacing
  the most relevant patterns without requiring users to browse the entire archive
- **Negative**: The skill store is in-memory — skills are not persisted to D1 yet, so user-created
  skills are lost on server restart. A future iteration will persist skills to the database
- **Neutral**: Skills are patterns only — they describe *how* to cut, but there is no automatic
  application yet. Applying a skill to a timeline requires manual or agent-driven execution in a
  future iteration

## Inspired By
- FireRed-OpenStoryline (#64) — editing skill archive concept

## Implementation Notes
- `src/lib/editor/skills.ts` — `EditingSkill` interface, 5 built-in skills, CRUD API with builtin
  protection, `recommendSkills()`
- In-memory store (future: persist to D1 via Prisma)
- Integrates with the timeline data model (ADR-009) and transcript-driven editing (ADR-011) for
  future skill application
