import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  configFromWorkflow,
  advancePipelineWithWaves,
  createPipeline,
  completeStage,
  failStage,
  retryStage,
  type PipelineConfig,
  type PipelineState,
  type PipelineStage,
} from '../src/lib/creative/pipeline';

// ---------------------------------------------------------------------------
// configFromWorkflow — translates a WorkflowDefinition (conditional stages,
// parallel groups) into a PipelineConfig.
// ---------------------------------------------------------------------------

describe('configFromWorkflow', () => {
  test('returns null for empty workflow', () => {
    const result = configFromWorkflow({ stages: [] }, {});
    assert.equal(result, null);
  });

  test('returns null for non-array stages', () => {
    const result = configFromWorkflow({ stages: 'bad' as any }, {});
    assert.equal(result, null);
  });

  test('returns null for null workflow', () => {
    const result = configFromWorkflow(null as any, {});
    assert.equal(result, null);
  });

  test('translates simple stages into PipelineConfig', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'script', enabled: true },
        { stage: 'publish', enabled: true },
      ] },
      {},
    );
    assert.ok(result);
    assert.equal(result!.stages.length, 3);
    assert.equal(result!.stages[0].stage, 'brief');
    assert.equal(result!.stages[1].stage, 'script');
    assert.equal(result!.stages[2].stage, 'publish');
    assert.ok(result!.stages.every(s => s.enabled));
  });

  test('conditions resolved — passing condition keeps stage enabled', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'audio', enabled: true, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
        { stage: 'publish', enabled: true },
      ] },
      { hasVoiceover: true },
    );
    assert.ok(result);
    const audioStage = result!.stages.find(s => s.stage === 'audio');
    assert.ok(audioStage);
    assert.equal(audioStage!.enabled, true);
  });

  test('conditions resolved — failing condition disables stage', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'audio', enabled: true, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
        { stage: 'publish', enabled: true },
      ] },
      { hasVoiceover: false },
    );
    assert.ok(result);
    const audioStage = result!.stages.find(s => s.stage === 'audio');
    assert.ok(audioStage);
    assert.equal(audioStage!.enabled, false);
  });

  test('conditions resolved — platform equals works', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'compliance', enabled: true, condition: { field: 'platform', operator: 'equals', value: 'meta' } },
      ] },
      { platform: 'google' },
    );
    assert.ok(result);
    const complianceStage = result!.stages.find(s => s.stage === 'compliance');
    assert.equal(complianceStage!.enabled, false);
  });

  test('conditions resolved — contentType contains works', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'media_generation', enabled: true, condition: { field: 'contentType', operator: 'contains', value: 'video' } },
      ] },
      { contentType: 'video_ad' },
    );
    assert.ok(result);
    const mediaStage = result!.stages.find(s => s.stage === 'media_generation');
    assert.equal(mediaStage!.enabled, true);
  });

  test('conditions resolved — not_contains works', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'media_generation', enabled: true, condition: { field: 'contentType', operator: 'not_contains', value: 'video' } },
      ] },
      { contentType: 'image_ad' },
    );
    assert.ok(result);
    const mediaStage = result!.stages.find(s => s.stage === 'media_generation');
    assert.equal(mediaStage!.enabled, true);
  });

  test('conditions resolved — exists operator works', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'audio', enabled: true, condition: { field: 'hasMusic', operator: 'exists' } },
      ] },
      { hasMusic: true },
    );
    assert.ok(result);
    const audioStage = result!.stages.find(s => s.stage === 'audio');
    assert.equal(audioStage!.enabled, true);
  });

  test('conditions resolved — not_exists operator works', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'audio', enabled: true, condition: { field: 'hasMusic', operator: 'not_exists' } },
      ] },
      {},
    );
    assert.ok(result);
    const audioStage = result!.stages.find(s => s.stage === 'audio');
    assert.equal(audioStage!.enabled, true);
  });

  test('parallel preserved — parallelWith links carried through', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'media_generation', enabled: true, parallelWith: ['audio'] },
        { stage: 'audio', enabled: true, parallelWith: ['media_generation'] },
        { stage: 'publish', enabled: true },
      ] },
      {},
    );
    assert.ok(result);
    const mediaStage = result!.stages.find(s => s.stage === 'media_generation') as any;
    const audioStage = result!.stages.find(s => s.stage === 'audio') as any;
    assert.ok(mediaStage.parallelWith);
    assert.ok(mediaStage.parallelWith.includes('audio'));
    assert.ok(audioStage.parallelWith);
    assert.ok(audioStage.parallelWith.includes('media_generation'));
  });

  test('parallel preserved — no parallelWith when not declared', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'publish', enabled: true },
      ] },
      {},
    );
    assert.ok(result);
    const briefStage = result!.stages.find(s => s.stage === 'brief') as any;
    assert.equal(briefStage.parallelWith, undefined);
  });

  test('uses base config overrides', () => {
    const result = configFromWorkflow(
      { stages: [{ stage: 'brief', enabled: true }] },
      {},
      { name: 'Custom Pipeline', productName: 'Test Product', onComplete: 'review' },
    );
    assert.ok(result);
    assert.equal(result!.name, 'Custom Pipeline');
    assert.equal(result!.productName, 'Test Product');
    assert.equal(result!.onComplete, 'review');
  });

  test('defaults name when not provided in base', () => {
    const result = configFromWorkflow(
      { stages: [{ stage: 'brief', enabled: true }] },
      {},
    );
    assert.ok(result);
    assert.equal(result!.name, 'Workflow Pipeline');
  });

  test('explicitly disabled stage stays disabled regardless of condition', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'audio', enabled: false, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
      ] },
      { hasVoiceover: true },
    );
    assert.ok(result);
    const audioStage = result!.stages.find(s => s.stage === 'audio');
    assert.equal(audioStage!.enabled, false);
  });
});

// ---------------------------------------------------------------------------
// advancePipelineWithWaves — wave-aware pipeline advancement.
// ---------------------------------------------------------------------------

describe('advancePipelineWithWaves', () => {
  /** Build a minimal PipelineState from a list of enabled stages. */
  function makeState(stages: PipelineStage[]): PipelineState {
    const config: PipelineConfig = {
      name: 'Test',
      productName: 'Test',
      stages: stages.map(s => ({
        stage: s,
        enabled: true,
        autoAdvance: true,
        config: {},
        // Attach parallelWith for the media_generation + audio pair
        ...(s === 'media_generation' ? { parallelWith: ['audio'] as PipelineStage[] } : {}),
        ...(s === 'audio' ? { parallelWith: ['media_generation'] as PipelineStage[] } : {}),
      })) as any,
      onComplete: 'publish',
    };
    return createPipeline(config);
  }

  test('non-parallel stages advance one at a time', () => {
    const state = makeState(['brief', 'script', 'publish']);
    // First advance: start 'brief'
    let s = advancePipelineWithWaves(state);
    const briefResult = s.stageResults.find(r => r.stage === 'brief');
    assert.equal(briefResult?.status, 'in_progress');
    assert.equal(s.currentStage, 'brief');

    // Second advance: complete 'brief', start 'script'
    s = advancePipelineWithWaves(s);
    const briefDone = s.stageResults.find(r => r.stage === 'brief');
    assert.equal(briefDone?.status, 'completed');
    const scriptResult = s.stageResults.find(r => r.stage === 'script');
    assert.equal(scriptResult?.status, 'in_progress');
    assert.equal(s.currentStage, 'script');
  });

  test('parallel stages start together in the same wave', () => {
    const state = makeState(['brief', 'media_generation', 'audio', 'publish']);

    // Advance to start 'brief'
    let s = advancePipelineWithWaves(state);
    const briefResult = s.stageResults.find(r => r.stage === 'brief');
    assert.equal(briefResult?.status, 'in_progress');

    // Complete 'brief' — next wave should start BOTH media_generation and audio
    s = advancePipelineWithWaves(s);
    const briefDone = s.stageResults.find(r => r.stage === 'brief');
    assert.equal(briefDone?.status, 'completed');

    const mediaResult = s.stageResults.find(r => r.stage === 'media_generation');
    const audioResult = s.stageResults.find(r => r.stage === 'audio');
    assert.equal(mediaResult?.status, 'in_progress');
    assert.equal(audioResult?.status, 'in_progress');
  });

  test('wave completes before next wave starts', () => {
    const state = makeState(['brief', 'media_generation', 'audio', 'publish']);

    // Advance to 'brief' in_progress
    let s = advancePipelineWithWaves(state);
    // Complete 'brief', start parallel wave (media_generation + audio)
    s = advancePipelineWithWaves(s);

    // Both media_generation and audio should be in_progress
    let mediaResult = s.stageResults.find(r => r.stage === 'media_generation');
    let audioResult = s.stageResults.find(r => r.stage === 'audio');
    assert.equal(mediaResult?.status, 'in_progress');
    assert.equal(audioResult?.status, 'in_progress');

    // Now advance — both should complete, and 'publish' should start
    s = advancePipelineWithWaves(s);
    mediaResult = s.stageResults.find(r => r.stage === 'media_generation');
    audioResult = s.stageResults.find(r => r.stage === 'audio');
    assert.equal(mediaResult?.status, 'completed');
    assert.equal(audioResult?.status, 'completed');

    const publishResult = s.stageResults.find(r => r.stage === 'publish');
    assert.equal(publishResult?.status, 'in_progress');
  });

  test('pipeline completes when all stages done', () => {
    const state = makeState(['brief', 'publish']);

    // Start 'brief'
    let s = advancePipelineWithWaves(state);
    // Complete 'brief', start 'publish'
    s = advancePipelineWithWaves(s);
    // Complete 'publish' — no more stages
    s = advancePipelineWithWaves(s);

    assert.equal(s.status, 'completed');
    assert.equal(s.currentStage, 'completed');
  });

  test('credits accumulate as stages complete', () => {
    const state = makeState(['brief', 'publish']);
    const initialCredits = state.totalCreditsUsed;

    // Start 'brief'
    let s = advancePipelineWithWaves(state);
    // Complete 'brief', start 'publish'
    s = advancePipelineWithWaves(s);
    // 'brief' cost should be added
    assert.ok(s.totalCreditsUsed > initialCredits);
  });

  test('progress increases as stages complete', () => {
    const state = makeState(['brief', 'publish']);

    // Start 'brief'
    let s = advancePipelineWithWaves(state);
    const progressAfterStart = s.progress;

    // Complete 'brief', start 'publish'
    s = advancePipelineWithWaves(s);
    const progressAfterFirst = s.progress;

    // Complete 'publish'
    s = advancePipelineWithWaves(s);
    const progressAfterAll = s.progress;

    assert.ok(progressAfterFirst > progressAfterStart || progressAfterStart === 0);
    assert.ok(progressAfterAll >= progressAfterFirst);
  });

  test('parallel wave — both stages get startedAt', () => {
    const state = makeState(['brief', 'media_generation', 'audio', 'publish']);

    // Advance to 'brief' in_progress
    let s = advancePipelineWithWaves(state);
    // Complete 'brief', start parallel wave
    s = advancePipelineWithWaves(s);

    const mediaResult = s.stageResults.find(r => r.stage === 'media_generation');
    const audioResult = s.stageResults.find(r => r.stage === 'audio');
    assert.ok(mediaResult?.startedAt);
    assert.ok(audioResult?.startedAt);
  });

  test('parallel wave — both stages get completedAt when wave completes', () => {
    const state = makeState(['brief', 'media_generation', 'audio', 'publish']);

    // Start 'brief'
    let s = advancePipelineWithWaves(state);
    // Complete 'brief', start parallel wave
    s = advancePipelineWithWaves(s);
    // Complete parallel wave, start 'publish'
    s = advancePipelineWithWaves(s);

    const mediaResult = s.stageResults.find(r => r.stage === 'media_generation');
    const audioResult = s.stageResults.find(r => r.stage === 'audio');
    assert.ok(mediaResult?.completedAt);
    assert.ok(audioResult?.completedAt);
  });
});

// ---------------------------------------------------------------------------
// completeStage — partial wave failure handling (T3).
// ---------------------------------------------------------------------------

describe('completeStage — partial wave failure handling', () => {
  function makeParallelState(stages: PipelineStage[]): PipelineState {
    const config: PipelineConfig = {
      name: 'Test',
      productName: 'Test',
      stages: stages.map(s => ({
        stage: s,
        enabled: true,
        autoAdvance: true,
        config: {},
        ...(s === 'media_generation' ? { parallelWith: ['audio'] as PipelineStage[] } : {}),
        ...(s === 'audio' ? { parallelWith: ['media_generation'] as PipelineStage[] } : {}),
      })) as any,
      onComplete: 'publish',
    };
    return createPipeline(config);
  }

  test('completeStage marks a single in_progress stage as completed', () => {
    const state = makeParallelState(['brief', 'media_generation', 'audio', 'publish']);
    // Advance to brief in_progress
    let s = advancePipelineWithWaves(state);
    // Complete brief, start parallel wave (media_generation + audio)
    s = advancePipelineWithWaves(s);

    // Both should be in_progress
    assert.equal(s.stageResults.find(r => r.stage === 'media_generation')?.status, 'in_progress');
    assert.equal(s.stageResults.find(r => r.stage === 'audio')?.status, 'in_progress');

    // Mark only media_generation as completed (simulating partial success)
    s = completeStage(s, 'media_generation');
    assert.equal(s.stageResults.find(r => r.stage === 'media_generation')?.status, 'completed');
    assert.equal(s.stageResults.find(r => r.stage === 'audio')?.status, 'in_progress');
  });

  test('completeStage then failStage — successful stage stays completed', () => {
    const state = makeParallelState(['brief', 'media_generation', 'audio', 'publish']);
    let s = advancePipelineWithWaves(state);
    s = advancePipelineWithWaves(s); // Start parallel wave

    // media_generation succeeds, audio fails
    s = completeStage(s, 'media_generation');
    s = failStage(s, 'audio', 'TTS service unavailable');

    assert.equal(s.stageResults.find(r => r.stage === 'media_generation')?.status, 'completed');
    assert.equal(s.stageResults.find(r => r.stage === 'audio')?.status, 'failed');
    assert.equal(s.status, 'paused');
  });

  test('completeStage accumulates credits for the completed stage', () => {
    const state = makeParallelState(['brief', 'media_generation', 'audio', 'publish']);
    let s = advancePipelineWithWaves(state);
    s = advancePipelineWithWaves(s); // Start parallel wave

    const creditsBefore = s.totalCreditsUsed;
    s = completeStage(s, 'media_generation');
    // media_generation costs 5 credits
    assert.equal(s.totalCreditsUsed, creditsBefore + 5);
  });

  test('completeStage resets charged flag on the completed stage', () => {
    const state = makeParallelState(['brief', 'media_generation', 'audio', 'publish']);
    let s = advancePipelineWithWaves(state);
    s = advancePipelineWithWaves(s); // Start parallel wave

    // Simulate charged flag being set
    const idx = s.stageResults.findIndex(r => r.stage === 'media_generation');
    s.stageResults[idx].charged = true;

    s = completeStage(s, 'media_generation');
    assert.equal(s.stageResults.find(r => r.stage === 'media_generation')?.charged, false);
  });
});

// ---------------------------------------------------------------------------
// retryStage — charged flag reset (T2).
// ---------------------------------------------------------------------------

describe('retryStage — charged flag reset', () => {
  test('retryStage resets charged flag to false', () => {
    const config: PipelineConfig = {
      name: 'Test',
      productName: 'Test',
      stages: [
        { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
        { stage: 'script', enabled: true, autoAdvance: true, config: {} },
      ],
      onComplete: 'publish',
    };
    let s = createPipeline(config);
    s = advancePipelineWithWaves(s); // brief in_progress
    s = advancePipelineWithWaves(s); // brief completed, script in_progress
    s = failStage(s, 'script', 'test error');

    // Set charged flag
    const idx = s.stageResults.findIndex(r => r.stage === 'script');
    s.stageResults[idx].charged = true;

    // Retry should reset charged
    s = retryStage(s, 'script');
    assert.equal(s.stageResults.find(r => r.stage === 'script')?.charged, false);
    assert.equal(s.stageResults.find(r => r.stage === 'script')?.status, 'in_progress');
  });
});

// ---------------------------------------------------------------------------
// configFromTemplate / configFromWorkflow — publish autoAdvance gating (T5).
// ---------------------------------------------------------------------------

describe('publish autoAdvance gating', () => {
  test('configFromTemplate — publish stage has autoAdvance=false for onComplete=publish', async () => {
    const { configFromTemplate } = await import('../src/lib/creative/pipeline');
    const config = configFromTemplate('full-creative');
    assert.ok(config);
    const publishStage = config!.stages.find(s => s.stage === 'publish');
    assert.ok(publishStage);
    assert.equal(publishStage!.autoAdvance, false, 'publish stage should not auto-advance even for onComplete=publish');
  });

  test('configFromTemplate — publish stage has autoAdvance=false for onComplete=review', async () => {
    const { configFromTemplate } = await import('../src/lib/creative/pipeline');
    const config = configFromTemplate('compliance-first');
    assert.ok(config);
    const publishStage = config!.stages.find(s => s.stage === 'publish');
    assert.ok(publishStage);
    assert.equal(publishStage!.autoAdvance, false, 'publish stage should not auto-advance for onComplete=review');
  });

  test('configFromWorkflow — publish stage has autoAdvance=false regardless of onComplete', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'publish', enabled: true },
      ] },
      {},
      { onComplete: 'publish' },
    );
    assert.ok(result);
    const publishStage = result!.stages.find(s => s.stage === 'publish');
    assert.ok(publishStage);
    assert.equal(publishStage!.autoAdvance, false);
  });

  test('configFromWorkflow — non-publish stages still auto-advance', () => {
    const result = configFromWorkflow(
      { stages: [
        { stage: 'brief', enabled: true },
        { stage: 'script', enabled: true },
        { stage: 'publish', enabled: true },
      ] },
      {},
      { onComplete: 'publish' },
    );
    assert.ok(result);
    const briefStage = result!.stages.find(s => s.stage === 'brief');
    const scriptStage = result!.stages.find(s => s.stage === 'script');
    assert.equal(briefStage!.autoAdvance, true);
    assert.equal(scriptStage!.autoAdvance, true);
  });
});
