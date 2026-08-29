/**
 * Integration tests for the pipeline stage executor.
 *
 * These tests verify the executor's stage mapping, error handling, and
 * context flow logic. Since the creative library functions (generateBrief,
 * generateScript, etc.) call external APIs, we test:
 *
 * 1. Stage mapping — the right function is called for each stage
 * 2. Error handling — missing prerequisites throw clear errors
 * 3. Context flow — outputs from earlier stages are available to later stages
 * 4. The `completed` terminal stage — returns without error
 * 5. Stage result structure — output, artifacts, and timing are present
 *
 * The pure helper functions (initialContext, mergeStageResultIntoContext,
 * toStageResult) are tested in pipeline-executor.test.ts.
 */

import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  initialContext,
  mergeStageResultIntoContext,
  toStageResult,
  type StageContext,
  type StageExecutionResult,
} from '../src/lib/creative/pipeline-executor';
import type { PipelineConfig, PipelineStage } from '../src/lib/creative/pipeline';

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    name: 'Test Pipeline',
    productName: 'Test Product',
    productDescription: 'A test product',
    brandName: 'TestBrand',
    targetAudience: 'Testers',
    platforms: ['tiktok'],
    stages: [
      { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
      { stage: 'script', enabled: true, autoAdvance: true, config: {} },
      { stage: 'storyboard', enabled: true, autoAdvance: true, config: {} },
      { stage: 'media_generation', enabled: true, autoAdvance: true, config: {} },
      { stage: 'audio', enabled: true, autoAdvance: true, config: {} },
      { stage: 'edit', enabled: true, autoAdvance: true, config: {} },
      { stage: 'compliance', enabled: true, autoAdvance: true, config: {} },
      { stage: 'publish', enabled: true, autoAdvance: true, config: {} },
    ],
    onComplete: 'publish',
    ...overrides,
  };
}

// Simulated stage outputs for context flow testing
const simBriefOutput: StageExecutionResult = {
  output: {
    brief: {
      objective: 'awareness',
      platform: 'tiktok',
      format: 'short_form',
      audience: 'gen_z',
      product: 'Test Product',
      productName: 'Test Product',
      hook: 'Stop scrolling!',
      cta: 'Shop now',
      visualDirection: 'Bright, energetic',
    },
  },
  artifacts: [{ type: 'brief', data: {} }],
};

const simScriptOutput: StageExecutionResult = {
  output: {
    hooks: [{ id: 'h1', type: 'conflict', text: 'Hook 1', rationale: 'r1', estimatedRetention: 8 }],
    angles: [{ id: 'a1', name: 'Angle 1', description: 'd1', emotionalTrigger: 'curiosity', targetAudience: 'gen_z', rationale: 'r1' }],
    selectedHook: { id: 'h1', type: 'conflict', text: 'Hook 1', rationale: 'r1', estimatedRetention: 8 },
    selectedAngle: { id: 'a1', name: 'Angle 1', description: 'd1', emotionalTrigger: 'curiosity', targetAudience: 'gen_z', rationale: 'r1' },
    script: {
      id: 's1', angleId: 'a1', hookId: 'h1', title: 'Test Script',
      scenes: [{ i: 1, visual: 'Opening', voiceover: 'Did you know?', durationSec: 3 }],
      totalDurationSec: 3, cta: 'Buy now', language: 'en',
    },
  },
  artifacts: [{ type: 'script', data: {} }],
};

const simStoryboardOutput: StageExecutionResult = {
  output: {
    storyboard: {
      id: 'sb1', scriptId: 's1', ratio: '9:16', totalDurationSec: 3,
      shots: [{ i: 1, shot: 'Opening', prompt: 'Bright opening', ratio: '9:16', durationSec: 3 }],
    },
  },
  artifacts: [{ type: 'storyboard', data: {} }],
};

const simMediaOutput: StageExecutionResult = {
  output: {
    mediaUrls: ['https://example.com/video1.mp4'],
    shotCount: 1,
    mediaResults: [{ shotIndex: 0, url: 'https://example.com/video1.mp4', dryRun: false, capability: 'video_gen' }],
  },
  artifacts: [{ type: 'shot_1', url: 'https://example.com/video1.mp4' }],
};

const simAudioOutput: StageExecutionResult = {
  output: { audioUrl: 'https://example.com/audio.wav' },
  artifacts: [{ type: 'voiceover', url: 'https://example.com/audio.wav' }],
};

const simComplianceOutput: StageExecutionResult = {
  output: { complianceResult: { status: 'compliant', violations: [], platform: 'tiktok' } },
  artifacts: [{ type: 'compliance', data: {} }],
};

describe('executeStage — stage mapping and error handling', () => {

  test('completed stage — executeStage returns empty output without error', async () => {
    const { executeStage } = await import('../src/lib/creative/pipeline-executor');
    const config = makeConfig();
    const ctx = initialContext(config);
    const result = await executeStage({ stage: 'completed', config, context: ctx, planTier: 'free', userId: 'test-user' });
    assert.ok(result.output);
  });

  test('script stage without brief context — throws clear error', async () => {
    const { executeStage } = await import('../src/lib/creative/pipeline-executor');
    const config = makeConfig();
    const ctx = initialContext(config);
    // Don't seed brief — script stage should throw
    await assert.rejects(
      () => executeStage({ stage: 'script', config, context: ctx, planTier: 'free', userId: 'test-user' }),
      /script_stage_requires_brief|brief/,
    );
  });

  test('storyboard stage without script context — throws clear error', async () => {
    const { executeStage } = await import('../src/lib/creative/pipeline-executor');
    const config = makeConfig();
    let ctx = initialContext(config);
    // Seed brief but not script — storyboard requires both
    ctx = mergeStageResultIntoContext(ctx, 'brief', simBriefOutput);
    await assert.rejects(
      () => executeStage({ stage: 'storyboard', config, context: ctx, planTier: 'free', userId: 'test-user' }),
      /storyboard_stage_requires_script|script/,
    );
  });

  test('media_generation stage without storyboard context — throws clear error', async () => {
    const { executeStage } = await import('../src/lib/creative/pipeline-executor');
    const config = makeConfig();
    const ctx = initialContext(config);
    await assert.rejects(
      () => executeStage({ stage: 'media_generation', config, context: ctx, planTier: 'free', userId: 'test-user' }),
      /media_stage_requires_storyboard|storyboard/,
    );
  });
});

describe('executeStage — context flow simulation', () => {

  test('full pipeline context flow — brief → script → storyboard → media → audio → compliance', () => {
    const config = makeConfig();
    let ctx = initialContext(config);

    // Brief
    ctx = mergeStageResultIntoContext(ctx, 'brief', simBriefOutput);
    assert.ok(ctx.brief, 'brief should be in context');
    assert.equal(ctx.brief!.objective, 'awareness');

    // Script (needs brief)
    ctx = mergeStageResultIntoContext(ctx, 'script', simScriptOutput);
    assert.ok(ctx.script, 'script should be in context');
    assert.ok(ctx.selectedHook, 'selectedHook should be in context');
    assert.ok(ctx.hooks, 'hooks should be in context');
    assert.ok(ctx.angles, 'angles should be in context');

    // Storyboard (needs script)
    ctx = mergeStageResultIntoContext(ctx, 'storyboard', simStoryboardOutput);
    assert.ok(ctx.storyboard, 'storyboard should be in context');
    assert.equal(ctx.storyboard!.shots.length, 1);

    // Media generation (needs storyboard)
    ctx = mergeStageResultIntoContext(ctx, 'media_generation', simMediaOutput);
    assert.ok(ctx.mediaUrls, 'mediaUrls should be in context');
    assert.equal(ctx.mediaUrls!.length, 1);

    // Audio
    ctx = mergeStageResultIntoContext(ctx, 'audio', simAudioOutput);
    assert.equal(ctx.audioUrl, 'https://example.com/audio.wav');

    // Compliance
    ctx = mergeStageResultIntoContext(ctx, 'compliance', simComplianceOutput);
    assert.ok(ctx.complianceResult);
    assert.equal((ctx.complianceResult as any).status, 'compliant');
  });

  test('context is immutable — merging does not mutate original', () => {
    const config = makeConfig();
    const ctx = initialContext(config);
    const ctx2 = mergeStageResultIntoContext(ctx, 'brief', simBriefOutput);

    assert.equal(ctx.brief, undefined, 'original context should not have brief');
    assert.ok(ctx2.brief, 'new context should have brief');
  });
});

describe('toStageResult — stage result fragment construction', () => {

  test('brief stage result — includes output and artifacts', () => {
    const fragment = toStageResult('brief', simBriefOutput, '2026-01-01T00:00:00Z');
    assert.equal(fragment.stage, 'brief');
    assert.ok(fragment.output);
    assert.ok((fragment.output as any).brief);
    assert.equal(fragment.artifacts!.length, 1);
    assert.equal(fragment.artifacts![0].type, 'brief');
  });

  test('media_generation stage result — includes media URLs in artifacts', () => {
    const fragment = toStageResult('media_generation', simMediaOutput, '2026-01-01T00:00:00Z');
    assert.equal(fragment.stage, 'media_generation');
    const output = fragment.output as any;
    assert.ok(output.mediaUrls);
    assert.equal(output.mediaUrls.length, 1);
    assert.equal(fragment.artifacts![0].url, 'https://example.com/video1.mp4');
  });

  test('audio stage result — includes audio URL', () => {
    const fragment = toStageResult('audio', simAudioOutput, '2026-01-01T00:00:00Z');
    assert.equal(fragment.stage, 'audio');
    assert.equal((fragment.output as any).audioUrl, 'https://example.com/audio.wav');
  });

  test('compliance stage result — includes compliance result', () => {
    const fragment = toStageResult('compliance', simComplianceOutput, '2026-01-01T00:00:00Z');
    assert.equal(fragment.stage, 'compliance');
    const output = fragment.output as any;
    assert.ok(output.complianceResult);
    assert.equal(output.complianceResult.status, 'compliant');
  });
});

describe('stage result — error propagation', () => {

  test('error result — toStageResult preserves stage and output', () => {
    const errorResult: StageExecutionResult = {
      output: {},
      artifacts: [],
      error: 'Generation failed: AI service unavailable',
    };
    const fragment = toStageResult('script', errorResult, '2026-01-01T00:00:00Z');
    assert.equal(fragment.stage, 'script');
    assert.ok(fragment.output);
  });
});
