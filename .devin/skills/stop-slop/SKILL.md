---
name: stop-slop
description: Remove AI writing patterns from prose. Use when drafting, editing, or reviewing text to eliminate predictable AI tells.
source: https://github.com/hardikpandya/stop-slop
license: MIT
---

# stop-slop (Devin wrapper)

This is a thin Devin wrapper around the vendored agent skill at
`../../.agents/skills/stop-slop/SKILL.md`.

## When to invoke

Invoke when the user asks to remove AI writing patterns, de-slop prose, edit
drafts for AI tells, or review content for predictable machine phrasing.

## How to use

1. Read the full skill definition at `.agents/skills/stop-slop/SKILL.md`.
2. Load the reference files on demand:
   - `.agents/skills/stop-slop/references/phrases.md` — banned phrases
   - `.agents/skills/stop-slop/references/structures.md` — structural patterns
   - `.agents/skills/stop-slop/references/examples.md` — before/after
3. Apply the core rules, quick checks, and 5-axis scoring rubric
   (directness, rhythm, trust, authenticity, density — /50, <35 = revise).
4. Preserve the writer's personal voice; make the minimum effective edit.

## Attribution

- **Author:** Hardik Pandya (https://hvpandya.com)
- **License:** MIT — see `.agents/skills/stop-slop/LICENSE`
- **Vendored from:** https://github.com/hardikpandya/stop-slop (main, 2026-09-11)
