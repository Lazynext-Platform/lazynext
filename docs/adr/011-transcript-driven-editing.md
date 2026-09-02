# ADR-011: Transcript-Driven Editing

## Status
Accepted

## Date
2026-08-28

## Context
ASR (automatic speech recognition) is now available via the Atlas provider, making it possible to
transcribe the spoken content of any video. FireRed-OpenStoryline (#64) demonstrates that an ASR
transcript can drive a rough cut for speech-heavy videos — selecting the most information-dense
segments, trimming filler, and assembling a plan that targets a specific duration.

Users need a way to turn a raw transcript into an actionable rough cut plan without manually
scrubbing through the video. This is especially valuable for talking-head, tutorial, and
presentation content where the spoken word is the primary signal for what to keep and what to cut.

## Decision
Implement `generateRoughCut()` — a function that takes an ASR transcript and produces a
`RoughCutPlan` describing which segments to keep, in what order, with transitions between them.

### generateRoughCut()
`generateRoughCut()` (`src/lib/editor/transcript-cut.ts`) accepts:
- **ASR transcript** — timestamped speech segments from the Atlas ASR provider (FireRedASR, #65)
- **Target duration** — the desired length of the final cut
- **Options** — filler word threshold, minimum segment length, transition style

The algorithm:
1. Filters out segments shorter than the minimum length threshold
2. Removes filler-heavy content — segments where filler words ("um", "uh", "like") exceed the
   configured ratio
3. Ranks remaining segments by information density (keyword frequency, entity count, sentence
   completeness)
4. Greedily selects segments to fill the target duration, prioritizing highest-ranked content
5. Generates transitions between selected segments (cut, crossfade, or jump cut based on gap size)
6. Returns a `RoughCutPlan` — an ordered list of kept segments with in/out points and transitions

### Export Formats
The resulting `RoughCutPlan` can be exported to:
- **JSON** — the native structured format for programmatic consumption
- **CMX 3600 EDL** — the industry-standard edit decision list format, importable into professional
  editors (Premiere, DaVinci Resolve, Final Cut Pro)

## Consequences
- **Positive**: Users can get a rough cut plan from any transcribed video without manual scrubbing,
  dramatically reducing the time to a first cut
- **Positive**: EDL export enables import into professional editors, bridging LazyNext's planning
  layer with existing post-production workflows
- **Positive**: Filler word removal improves cut quality by eliminating the most common source of
  dead air in speech content
- **Negative**: The algorithm is heuristic — it ranks segments by proxy signals (keyword density,
  filler ratio) rather than semantic understanding, so it will not match the judgment of a skilled
  human editor
- **Neutral**: This is a planning layer only — it produces a cut *plan*, not a processed video.
  Actual video assembly requires a separate rendering step in a future iteration

## Inspired By
- FireRed-OpenStoryline (#64) — ASR-based rough cut for speech videos
- FireRedASR (#65) — the ASR provider that supplies the transcript input

## Implementation Notes
- `src/lib/editor/transcript-cut.ts` — `generateRoughCut()` function and `RoughCutPlan` type
- JSON and CMX 3600 EDL export utilities
- Consumes ASR transcripts from the Atlas provider (FireRedASR)
- Produces cut plans compatible with the timeline data model (ADR-009)
