---
name: kill-ai-slop
description: Find and remove AI slop — the generic, machine-default visual and copy tics of vibe-coded products — from a web project. Use when the user asks to "kill AI slop", "de-slop", "remove the AI look", "make this not look AI-generated", or clean up a landing page / UI / docs that feels templated.
source: https://github.com/yetone/kill-ai-slop
license: Apache-2.0
---

# kill-ai-slop (Devin wrapper)

This is a thin Devin wrapper around the vendored agent skill at
`../../.agents/skills/kill-ai-slop/SKILL.md`.

## When to invoke

Invoke when the user asks to kill AI slop, de-slop, remove the AI look, make
something not look AI-generated, or clean up a landing page / UI / docs that
feels templated.

## How to use

1. Read the full skill definition at `.agents/skills/kill-ai-slop/SKILL.md`.
2. Run the dependency-free scanner:
   ```
   node .agents/skills/kill-ai-slop/scripts/scan.mjs <root>       # human report
   node .agents/skills/kill-ai-slop/scripts/scan.mjs <root> --json # machine
   ```
3. Load references on demand:
   - `references/taxonomy.md` — the 35 tells: what, why, fix
   - `references/detection.md` — concrete patterns + false positives
   - `references/fixes.md` — before→after remediation patterns
4. Follow the workflow: scope → scan → triage → report → fix (only approved
   groups, smallest diff, preserve intent).

## Attribution

- **Author:** yetone
- **License:** Apache-2.0 — see `.agents/skills/kill-ai-slop/LICENSE`
- **Vendored from:** https://github.com/yetone/kill-ai-slop (main, 2026-09-11)
