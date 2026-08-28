# ADR-009: Timeline Data Model

## Status
Accepted

## Date
2026-08-28

## Context
A future lightweight native video editor needs a foundational data model. Before any editing UI can
be built, there must be a structured way to describe a video editing project: its tracks, clips,
transitions, markers, and text overlays. Without a formal data model, each future editor feature
would invent its own ad-hoc representation, making state management, validation, and persistence
inconsistent and error-prone.

The model must be expressive enough to support multitrack editing — video, audio, and overlay
tracks running in parallel — while remaining simple enough to serialize and persist. It draws on
the timeline architecture of pireel (#49) and the multitrack editing concepts of OpenChatCut (#48).
OpenChatCut is AGPL-licensed, so only its *ideas* and architectural concepts are borrowed — no code
is copied.

## Decision
Create a foundational timeline data model in TypeScript, backed by immutable builder functions and
validation, and persist it via a Prisma model with JSON fields.

### TypeScript Interfaces
`src/lib/editor/types.ts` defines the core interfaces:
- **Timeline** — the top-level project container, holding tracks and markers
- **Track** — a single layer (video, audio, or overlay) containing ordered clips
- **Clip** — a media segment with start/end times, source media reference, and trim points
- **Transition** — a crossfade or effect between two adjacent clips
- **Marker** — a labeled point or region on the timeline for navigation and annotation
- **TextOverlay** — a text element with position, styling, and timing

### Immutable Builders
`src/lib/editor/timeline-builder.ts` provides immutable builder functions for constructing and
modifying timelines:
- `createTimeline()`, `addTrack()`, `addClip()`, `removeClip()`, `moveClip()`, `addTransition()`,
  `addMarker()`, `addTextOverlay()`
- Each function returns a new `Timeline` object rather than mutating the input
- Validation runs on every builder call, catching structural errors such as overlapping clips,
  invalid transition references, and out-of-range times

### Prisma Model
A `Timeline` model is added to `prisma/schema.prisma`:
- JSON fields for `tracks` and `markers` (the full timeline structure is serialized)
- Relations to `User` (owner) and `Creation` (the associated creative asset)
- Standard `id`, `createdAt`, `updatedAt` fields

## Consequences
- **Positive**: Provides a solid foundation for a future native editor — UI components can be built
  directly on top of this model without reinventing the data representation
- **Positive**: Immutable builders make state management predictable and enable undo/redo by
  snapshotting previous timeline states
- **Positive**: Validation catches structural errors (overlapping clips, invalid transitions,
  out-of-range times) at construction time, before they reach persistence or rendering
- **Negative**: JSON fields for tracks and clips mean there is no database-level querying of
  individual clips — filtering or searching clips requires loading and parsing the full timeline
- **Neutral**: No UI is built yet — this is a data model study only. The editor interface will be
  layered on top of this model in a future iteration

## Inspired By
- pireel (#49) — timeline architecture
- OpenChatCut (#48) — multitrack editing concepts (AGPL — ideas only, no code)

## Implementation Notes
- `src/lib/editor/types.ts` — TypeScript interfaces for Timeline, Track, Clip, Transition, Marker,
  TextOverlay
- `src/lib/editor/timeline-builder.ts` — immutable builder functions with validation
- `prisma/schema.prisma` — `Timeline` model with JSON fields for tracks/markers, relations to User
  and Creation
