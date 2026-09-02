# ADR-019: Visual Timeline Editor

## Date
2026-08-28

## Status
Accepted

## Context
The timeline editor previously displayed timeline data as JSON only, which is not user-friendly for editing. Users need a visual representation of clips across tracks, with the ability to drag clips, scrub a playhead, and zoom in/out for precise editing. A JSON textarea does not convey spatial relationships between clips or allow intuitive manipulation.

## Decision
1. Created a `VisualTimeline` React component that renders clips as draggable blocks across tracks
2. Dragging is implemented with pure pointer events (pointerdown, pointermove, pointerup) — no external drag-and-drop library
3. A playhead scrubber allows seeking through the timeline; the playhead is keyboard-navigable
4. Zoom controls support 1x, 2x, and 4x zoom levels
5. Snap-to-grid is enabled at 0.5s intervals during drag operations
6. Clips are colored by track type (e.g., video, audio, text) for visual distinction
7. The component is accessible with ARIA roles (`slider` for playhead, `group` for tracks, `button` for clips)
8. RTL is forced to LTR for the timeline canvas (timeline direction is inherently left-to-right)

## Consequences
- Client-side only — no server persistence of clip positions; saving is handled by the existing timeline save API
- No external DnD library reduces bundle size and avoids dependency maintenance
- Pointer events provide unified mouse/touch/pen handling without separate code paths
- Forcing LTR on the canvas ensures consistent timeline direction even in Arabic locale
- Keyboard-navigable playhead meets accessibility requirements for keyboard-only users
- The visual editor significantly improves usability over JSON-only editing
