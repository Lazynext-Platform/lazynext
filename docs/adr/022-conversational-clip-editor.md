# ADR-022: Conversational Clip Editor

## Date
2026-08-29

## Status
Accepted

## Context
The platform had a visual timeline editor (ADR-019) with drag-and-drop clip manipulation, but no way to edit clips through natural language commands. Users who think in terms of "trim the first 2 seconds" or "split clip 3 at 0:15" had to manually find and drag clips, which is slower for common operations.

Research repository #48 (OpenChatCut, AGPL-3.0) pioneered conversational video editing but its license prohibits any code reuse in MIT-licensed LazyNext. All 8+ OpenChatCut forks inherit AGPL. This feature is a fully original implementation inspired by the architecture concept only.

## Decision
1. Created `src/lib/creative/clip-editor.ts` as a domain library with a deterministic command parser and timeline operation engine
2. The parser uses regex patterns for known commands: trim (first/last), split (at timestamp), delete (clip/range), reorder (swap/move), add (clip), speed (up/down), volume (mute/set), merge, duplicate, label
3. Each parsed command produces a `ParsedCommand` with operation type, params, confidence (1.0 for exact match, 0.6-0.8 for fuzzy), and the raw command string
4. Timeline operations are pure functions: `applyOperation(timeline, operation)` returns a new timeline without mutating the input
5. Validation enforces timeline invariants: clip indices in range, timestamps within clip bounds, no negative durations, no overlapping clips after merge
6. AI-enhanced fallback: when the deterministic parser fails (confidence < threshold), `atlasChat` interprets the command with a system prompt describing available operations
7. The AI fallback returns the same `ParsedCommand` structure — callers don't know whether parsing was deterministic or AI-assisted
8. Credit cost: 3 credits per AI-assisted parse (deterministic parses are free)
9. API route at `/api/creative/clip-editor` follows existing auth/credit/refund patterns
10. Component at `src/components/ClipEditor.tsx` with command input, timeline display, and operation result

## Consequences
- Common editing operations (trim, split, delete) are deterministic and free — no AI cost for simple commands
- AI fallback handles complex or ambiguous commands without failing
- The pure-function timeline operations are testable without mocking AI services
- No AGPL code was reused — the parser, validation, and timeline operations are original implementations
- The command vocabulary is extensible — new regex patterns can be added without changing the operation engine
- Timeline immutability prevents accidental data loss during editing
- The clip editor is separate from the visual timeline editor (ADR-019) — they share the timeline data model but have different UX paradigms (conversational vs. visual)
