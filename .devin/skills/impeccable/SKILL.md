---
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states.
source: https://github.com/pbakaus/impeccable
license: Apache-2.0
---

# impeccable (Devin wrapper)

This is a thin Devin wrapper around the vendored agent skill at
`../../.agents/skills/impeccable/SKILL.md`.

## When to invoke

Invoke when the user wants to design, redesign, shape, critique, audit, polish,
clarify, distill, harden, optimize, adapt, animate, colorize, extract, or
otherwise improve a frontend interface — websites, landing pages, dashboards,
product UI, app shells, components, forms, settings, onboarding, empty states.

## How to use

1. Read the full skill definition at `.agents/skills/impeccable/SKILL.md`.
2. Run context setup once per session:
   ```
   .agents/skills/impeccable/scripts/impeccable context
   ```
3. Load the command reference for the requested sub-command (craft, shape, init,
   document, extract, critique, audit, polish, bolder, quieter, distill,
   harden, onboard, animate, colorize, typeset, layout, delight, overdrive,
   clarify, adapt, optimize, live) from `.agents/skills/impeccable/reference/`.
4. Read `reference/craft-floor.md` before any UI edit.
5. Read `reference/new-work.md` for new surfaces or replacement visual worlds.

## Attribution

- **Author:** Paul Bakaus (pbakaus)
- **License:** Apache-2.0 — see `.agents/skills/impeccable/LICENSE`
- **Vendored from:** https://github.com/pbakaus/impeccable (main, 2026-09-11)
