# ADR-229: Competitor Knowledge Seed and Documentation Close-Out

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

The user provided a 52-platform competitor index (`platforms_from_pdf-1.xlsx`)
and a master transformation prompt (`implement_integarate_add_update_etc_these.md`).
The competitor data needed to be seeded into the research knowledge base, and
the full transformation needed to be documented.

## Decision

**Seed competitor knowledge and close out documentation:**

1. **Competitor platforms index** (`docs/research/competitor-platforms.md`) —
   52 platforms across 12 categories (AI ad creative, autonomous agents,
   company OS, marketing automation, CRM, analytics, etc.). Sourced from
   the user-provided spreadsheet. Used as seed data for research and
   strategy agents.

2. **External reference architectures** (`docs/research/external-reference-architectures.md`) —
   documents the 7 external repositories researched, what concepts were
   reused, and how they were re-implemented natively.

3. **Third-party licenses** (`docs/THIRD_PARTY_LICENSES.md`) —
   updated with attribution for the 4 vendored skills (impeccable,
   kill-ai-slop, no-ai-slop, stop-slop).

4. **ADRs 223-229** —
   document all architecture decisions for Phases A-G.

5. **Registered skills** (`.devin/skills/`) —
   4 skills vendored with Devin wrappers. No application-bundle imports.

## Consequences

- Research and strategy agents have a competitor knowledge base to draw from.
- All external references are documented with attribution.
- Architecture decisions are recorded for future reference.
- The transformation is fully documented and auditable.
