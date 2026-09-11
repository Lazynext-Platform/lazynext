---
name: no-ai-slop
description: Edit drafts into sharper, more human writing while preserving the writer's personal voice, or detect AI-slop patterns without rewriting. Use when the user wants a draft clearer, more direct, more opinionated, or less AI-sounding, or asks whether writing reads as AI.
source: https://github.com/petergyang/no-ai-slop
license: MIT
---

# no-ai-slop (Devin wrapper)

This is a thin Devin wrapper around the vendored agent skill at
`../../.agents/skills/no-ai-slop/SKILL.md`.

## When to invoke

Invoke when the user wants a draft edited for AI slop (clearer, more direct,
more opinionated, less AI-sounding) or when they ask to detect/audit/scan
whether writing reads as AI-generated.

## How to use

1. Read the full skill definition at `.agents/skills/no-ai-slop/SKILL.md`.
2. Load the eval checklist at `.agents/skills/no-ai-slop/eval.md` after editing.
3. Two modes:
   - **Edit (default):** minimum effective edit, preserve voice, return edited
     draft + "What changed" section.
   - **Detect:** name each pattern found, quote the line, give the fix — do not
     rewrite, score, or guess whether AI wrote it.
4. Apply the banned-words list, pattern-to-cut list, and editing principles.

## Attribution

- **Author:** Peter Yang
- **License:** MIT — see `.agents/skills/no-ai-slop/LICENSE`
- **Vendored from:** https://github.com/petergyang/no-ai-slop (main, 2026-09-11)
