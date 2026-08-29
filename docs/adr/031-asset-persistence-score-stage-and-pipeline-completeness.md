# ADR-031: Asset Persistence, Model Router for Media, Score Stage, Auto-Advance

**Date:** 2026-09-01
**Status:** Accepted

## Context

ADR-030 shipped the pipeline executor, real media generation, and production hardening. The
pipeline could run end-to-end and produce real creative output (briefs, scripts, storyboards,
compliance checks, generated media). However, the pipeline's outputs were ephemeral — they
existed only in the `WorkflowStep` rows and the in-memory pipeline state. There was no durable
link between a completed pipeline run and the asset library, so generated creatives could not be
reused, approved, A/B tested, or linked to campaigns.

Additionally, the media service boundary handlers (TTS, image editing, video generation) used
hardcoded model selections rather than consulting the provider router, which meant plan-tier
gating and cost optimization did not apply to media generation. The pipeline also lacked a
quality-gating stage between compliance and publish, meaning low-quality creatives could proceed
to media spend without being scored. Finally, the pipeline required manual clicking to advance
through each stage, preventing true end-to-end automation.

The K-series addresses these gaps by persisting pipeline outputs as Asset/AssetVersion records,
wiring the model router into the media service boundary, adding a `score` stage for quality
gating, enabling auto-advance through stages, and providing an editor handoff link from the edit
stage.

## Decision

### 1. Asset Persistence at Pipeline Completion

Pipeline outputs (media URLs, audio, EDL, compliance, publish results) are now persisted as
Asset/AssetVersion records at pipeline completion via `persistPipelineAssets` in the `[id]`
route. A parent `creative_package` asset is created with child assets for each material output:

- **media** — generated video/image URLs
- **audio** — generated audio assets (TTS, music)
- **edl** — the Edit Decision List from the edit stage
- **compliance** — the compliance check results
- **publish** — the publish stage results

This unlocks the asset library, approvals, A/B reuse, and campaign linking. Completed pipeline
runs now produce durable, queryable assets that integrate with the rest of the platform's asset
management surface.

### 2. Model Router Wired to Media

The media service boundary handlers (`atlasTTS`, `atlasImageEdit`, `atlasVideoGen`) now call
`getLLMModel`/`getImageModel`/`getVideoModel` from the provider router, enabling plan-tier
gating and cost optimization for media generation. Env overrides still take precedence, so
operators can force a specific model via environment variables when needed.

This brings media generation in line with the text generation path, which already used the
provider router for plan-tier-aware model selection (ADR-030, section 1). Free-tier users now
get cost-optimized media models while pro/elite users get higher-quality models, consistent with
the existing plan-tier routing for LLM calls.

### 3. Score/Quality Pipeline Stage

A new `score` stage calls `scoreCreative` to produce a multi-dimensional quality score covering:

- **hook strength** — how compelling the opening hook is
- **angle clarity** — how clearly the creative angle is communicated
- **script flow** — how well the script flows from beginning to end
- **CTA effectiveness** — how effective the call-to-action is
- **audience fit** — how well the creative fits the target audience

The `score` stage was added to the `full-creative` template between `compliance` and `publish`.
This gates bad creatives before media spend — if a creative scores below the quality threshold,
it can be flagged or rejected before the pipeline proceeds to the publish stage, preventing
wasted ad spend on low-quality creatives.

### 4. Auto-Advance

When a stage has `autoAdvance` enabled (default `true`), the `PipelineOrchestrator`
automatically calls `advance` 1.5 seconds after the stage completes, letting the pipeline run
end-to-end without manual clicking. The 1.5s delay gives the UI time to render the stage output
via the `StageOutputViewer` (ADR-030, section 7) before advancing to the next stage.

Stages can opt out of auto-advance by setting `autoAdvance: false` in the stage config, which is
useful for stages that require human review (e.g., a compliance review gate or a manual approval
step).

### 5. Editor Handoff

The edit stage output includes an "Open in Clip Editor" link that passes `pipelineId` and
`finalMediaUrl` to the clip editor for refinement. This provides a seamless handoff from the
pipeline's edit stage to the Conversational Clip Editor (`/clip-editor`), where users can
trim, split, reorder, and otherwise refine the generated media using natural language commands.

The `pipelineId` allows the clip editor to reference the originating pipeline run, and the
`finalMediaUrl` provides the media to edit without requiring the user to manually locate and
import the asset.

## Consequences

- Pipeline outputs are now **durable assets** — completed runs produce Asset/AssetVersion records
  that integrate with the asset library, approvals, A/B testing, and campaign linking, rather
  than ephemeral data locked in `WorkflowStep` rows.
- Media generation is now **plan-tier aware** — the provider router selects cost-optimized
  models for free-tier users and higher-quality models for pro/elite users, consistent with the
  text generation path. Env overrides remain the highest-precedence control.
- Low-quality creatives are **gated before media spend** — the `score` stage between compliance
  and publish prevents bad creatives from reaching the publish stage, reducing wasted ad spend.
- The pipeline can now **run end-to-end without manual intervention** — auto-advance (default
  on) lets the orchestrator advance through stages automatically, while still allowing
  opt-out for stages requiring human review.
- The edit stage provides a **seamless handoff to the clip editor** — users can refine generated
  media without leaving the pipeline workflow context.
- The `full-creative` template now includes the `score` stage, bringing the full stage list to:
  brief, script, storyboard, media_generation, audio, edit, compliance, score, publish.

## Alternatives Considered

1. **Persisting assets per-stage instead of at completion**: Rejected — persisting at pipeline
   completion ensures that only fully-completed creative packages become durable assets.
   Per-stage persistence would create partial assets that might never be completed if the
   pipeline fails midway, polluting the asset library with incomplete work.
2. **Hardcoded media models**: Rejected — hardcoding media models would bypass the plan-tier
   gating that already applies to text generation, creating an inconsistency where free-tier
   users could trigger expensive media generation. Wiring through the provider router ensures
   consistent cost control across all generation types.
3. **Score stage after publish**: Rejected — scoring after publish would mean low-quality
   creatives have already incurred media spend and potentially been published to ad platforms.
   Scoring before publish (between compliance and publish) gates bad creatives before any spend
   occurs.
4. **No auto-advance (manual only)**: Rejected — requiring manual clicking for every stage
   prevents true end-to-end automation and makes the pipeline tedious for multi-stage templates
   like `full-creative`. Auto-advance with an opt-out flag provides the best of both worlds.
5. **No editor handoff**: Rejected — without a handoff link, users would need to manually
   navigate to the clip editor and locate the generated media, breaking the pipeline workflow
   context. Passing `pipelineId` and `finalMediaUrl` provides a seamless transition.
