# ADR-027: Creative Workflow Builder

**Date:** 2026-09-01
**Status:** Accepted

## Context

The platform already has a robust creative pipeline system (`src/lib/creative/pipeline.ts`) that
executes ordered stage sequences: `brief → script → storyboard → media_generation → audio → edit →
compliance → publish`. Built-in templates (`full-creative`, `quick-ad`, `video-ad`,
`compliance-first`) provide pre-configured stage selections.

However, users have no visual way to:
- Customize which stages run and in what order
- Save reusable custom workflow configurations
- Share workflow templates across team members

The pipeline library is intentionally pure (no persistence, no side effects); persistence and
credit deduction happen in API routes. This separation should be preserved.

## Decision

Build a **visual drag-and-drop workflow builder** as an authoring layer over the existing
`PipelineConfig`/`PipelineStageConfig` model, rather than introducing a separate workflow engine.

### Architecture

1. **Visual editor** (`/workflow-builder` page): Users drag stages from a palette onto an ordered
   pipeline, reorder by drag-and-drop, and save the configuration as a template.

2. **Persistence**: Custom workflow templates are stored using the existing `CreativeTemplate`
   Prisma model with `category: 'workflow'`. The `payloadJson` field stores `{ stages: PipelineStage[] }`.
   This reuses the existing template CRUD infrastructure and ownership checks.

3. **API**: A new `/api/creative/workflow-templates` route handles GET (list), POST (save), and
   DELETE (remove) operations. All routes require authentication and verify ownership.

4. **Execution**: Saved workflows feed into the existing `/api/creative/pipeline` execution route.
   The builder is an authoring tool; it does not introduce a new runtime.

5. **Stage definitions**: The builder reuses the existing `PipelineStage` union type from
   `src/lib/creative/pipeline.ts`. No new stage types are introduced.

### Key design choices

- **No new Prisma model**: The `CreativeTemplate` model already supports per-user templates with
  arbitrary payloads. Adding `category: 'workflow'` is sufficient.
- **No new runtime**: The existing pipeline executor remains the single execution path.
- **Built-in templates**: Existing pipeline templates (`full-creative`, etc.) are available as
  starter layouts in the builder.
- **Localization**: All user-facing strings are localized across all 13 locales.
- **Accessibility**: Drag-and-drop uses HTML5 drag events with keyboard-accessible add/remove buttons
  as fallback. All interactive elements have ARIA labels.

## Consequences

- Users can create, save, and reuse custom creative pipelines without code changes.
- The existing pipeline execution path is unchanged — the builder is purely an authoring layer.
- The `CreativeTemplate` model gains a new category (`workflow`), which is backward-compatible.
- Future enhancements (conditional stages, branching, parallel execution) can build on this
  foundation by extending the `payloadJson` schema.

## Alternatives Considered

1. **New `WorkflowDefinition` Prisma model**: Rejected — `CreativeTemplate` already provides the
   needed structure (per-user, payload, favorites, tags).
2. **Full node-graph editor (react-flow)**: Rejected for now — adds a heavy dependency and
   complexity. The ordered-stage model is linear; a visual list with drag reordering is sufficient.
   Can be upgraded to a graph editor later if conditional/branching stages are added.
3. **Separate workflow runtime**: Rejected — the existing pipeline executor is well-tested and
   handles credit deduction, persistence, and stage transitions. Duplicating this would violate DRY.
