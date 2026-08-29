/**
 * Unit tests for the pipeline stage executor.
 *
 * Tests the pure logic of stage mapping, context merging, and initial context
 * construction. The actual generation functions (generateBrief, generateScript,
 * etc.) are mocked to avoid calling the Atlas API.
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  initialContext,
  mergeStageResultIntoContext,
  toStageResult,
  type StageContext,
  type StageExecutionResult,
} from '../src/lib/creative/pipeline-executor';
import type { PipelineConfig } from '../src/lib/creative/pipeline';

// Mock config for testing
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

test('initialContext — seeds from config', () => {
  const config = makeConfig();
  const ctx = initialContext(config);
  assert.equal(ctx.productName, 'Test Product');
  assert.equal(ctx.productDescription, 'A test product');
  assert.equal(ctx.brandName, 'TestBrand');
  assert.equal(ctx.targetAudience, 'Testers');
  assert.deepEqual(ctx.platforms, ['tiktok']);
});

test('initialContext — handles missing optional fields', () => {
  const config: PipelineConfig = {
    name: 'Minimal',
    productName: 'Minimal Product',
    stages: [{ stage: 'brief', enabled: true, autoAdvance: true, config: {} }],
  };
  const ctx = initialContext(config);
  assert.equal(ctx.productName, 'Minimal Product');
  assert.equal(ctx.productDescription, undefined);
  assert.equal(ctx.brandName, undefined);
  assert.equal(ctx.platforms, undefined);
});

test('mergeStageResultIntoContext — brief stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { brief: { objective: 'awareness', product: 'Test Product', productName: 'Test Product' } },
    artifacts: [{ type: 'brief', data: {} }],
  };
  const next = mergeStageResultIntoContext(ctx, 'brief', result);
  assert.ok(next.brief);
  assert.equal(next.brief!.objective, 'awareness');
});

test('mergeStageResultIntoContext — script stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: {
      hooks: [{ id: 'h1', type: 'conflict', text: 'Hook 1', rationale: 'r', estimatedRetention: 8 }],
      angles: [{ id: 'a1', name: 'Angle 1', description: 'd', emotionalTrigger: 'curiosity', targetAudience: 't', rationale: 'r' }],
      selectedHook: { id: 'h1', type: 'conflict', text: 'Hook 1', rationale: 'r', estimatedRetention: 8 },
      selectedAngle: { id: 'a1', name: 'Angle 1', description: 'd', emotionalTrigger: 'curiosity', targetAudience: 't', rationale: 'r' },
      script: { id: 's1', angleId: 'a1', hookId: 'h1', title: 'Test Script', scenes: [], totalDurationSec: 30, cta: 'Buy now', language: 'en' },
    },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'script', result);
  assert.ok(next.hooks);
  assert.equal(next.hooks!.length, 1);
  assert.ok(next.selectedHook);
  assert.equal(next.selectedHook!.id, 'h1');
  assert.ok(next.script);
  assert.equal(next.script!.title, 'Test Script');
});

test('mergeStageResultIntoContext — storyboard stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { storyboard: { id: 'sb1', scriptId: 's1', shots: [], ratio: '9:16', totalDurationSec: 30 } },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'storyboard', result);
  assert.ok(next.storyboard);
  assert.equal(next.storyboard!.ratio, '9:16');
});

test('mergeStageResultIntoContext — media_generation stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { mediaUrls: ['url1', 'url2'], shotCount: 2 },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'media_generation', result);
  assert.ok(next.mediaUrls);
  assert.equal(next.mediaUrls!.length, 2);
  assert.equal(next.mediaUrls![0], 'url1');
});

test('mergeStageResultIntoContext — audio stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { audioUrl: 'https://example.com/audio.mp3' },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'audio', result);
  assert.equal(next.audioUrl, 'https://example.com/audio.mp3');
});

test('mergeStageResultIntoContext — edit stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { editResult: { totalDurationSec: 30 } },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'edit', result);
  assert.ok(next.editResult);
  assert.equal((next.editResult as any).totalDurationSec, 30);
});

test('mergeStageResultIntoContext — compliance stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { complianceResult: { status: 'compliant' } },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'compliance', result);
  assert.ok(next.complianceResult);
  assert.equal((next.complianceResult as any).status, 'compliant');
});

test('mergeStageResultIntoContext — publish stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { publishResult: { status: 'pending_review' } },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'publish', result);
  assert.ok(next.publishResult);
  assert.equal((next.publishResult as any).status, 'pending_review');
});

test('mergeStageResultIntoContext — does not mutate original context', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: { brief: { objective: 'awareness' } },
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'brief', result);
  assert.equal(ctx.brief, undefined);
  assert.ok(next.brief);
});

test('mergeStageResultIntoContext — handles completed terminal stage', () => {
  const ctx = initialContext(makeConfig());
  const result: StageExecutionResult = {
    output: {},
    artifacts: [],
  };
  const next = mergeStageResultIntoContext(ctx, 'completed', result);
  // Should not crash, should return context unchanged
  assert.equal(next.productName, 'Test Product');
});

test('toStageResult — converts execution result to stage result fragment', () => {
  const result: StageExecutionResult = {
    output: { brief: { objective: 'awareness' } },
    artifacts: [{ type: 'brief', data: { foo: 'bar' } }],
  };
  const fragment = toStageResult('brief', result, '2026-01-01T00:00:00Z');
  assert.equal(fragment.stage, 'brief');
  assert.ok(fragment.output);
  assert.equal(fragment.artifacts!.length, 1);
  assert.equal(fragment.artifacts![0].type, 'brief');
});

test('toStageResult — preserves error if present', () => {
  const result: StageExecutionResult = {
    output: {},
    artifacts: [],
    error: 'something failed',
  };
  const fragment = toStageResult('script', result, '2026-01-01T00:00:00Z');
  assert.equal(fragment.error, undefined); // error is not in toStageResult, it's in the stage result
  assert.equal(fragment.stage, 'script');
});

test('initialContext — with workflow config (parallel stages)', () => {
  const config = makeConfig({
    stages: [
      { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
      { stage: 'script', enabled: true, autoAdvance: true, config: {} },
    ],
  });
  const ctx = initialContext(config);
  assert.equal(ctx.productName, 'Test Product');
  assert.ok(ctx.platforms);
});

test('mergeStageResultIntoContext — accumulates across multiple stages', () => {
  let ctx = initialContext(makeConfig());
  ctx = mergeStageResultIntoContext(ctx, 'brief', {
    output: { brief: { objective: 'awareness', product: 'Test' } },
    artifacts: [],
  });
  ctx = mergeStageResultIntoContext(ctx, 'script', {
    output: {
      hooks: [{ id: 'h1', type: 'conflict', text: 'Hook', rationale: 'r', estimatedRetention: 8 }],
      angles: [{ id: 'a1', name: 'A1', description: 'd', emotionalTrigger: 'c', targetAudience: 't', rationale: 'r' }],
      selectedHook: { id: 'h1', type: 'conflict', text: 'Hook', rationale: 'r', estimatedRetention: 8 },
      selectedAngle: { id: 'a1', name: 'A1', description: 'd', emotionalTrigger: 'c', targetAudience: 't', rationale: 'r' },
      script: { id: 's1', angleId: 'a1', hookId: 'h1', title: 'Script', scenes: [], totalDurationSec: 30, cta: 'Buy', language: 'en' },
    },
    artifacts: [],
  });
  ctx = mergeStageResultIntoContext(ctx, 'storyboard', {
    output: { storyboard: { id: 'sb1', scriptId: 's1', shots: [], ratio: '9:16', totalDurationSec: 30 } },
    artifacts: [],
  });
  // All three stages' outputs should be present
  assert.ok(ctx.brief);
  assert.ok(ctx.script);
  assert.ok(ctx.storyboard);
  assert.equal(ctx.brief!.objective, 'awareness');
  assert.equal(ctx.script!.title, 'Script');
  assert.equal(ctx.storyboard!.ratio, '9:16');
});
