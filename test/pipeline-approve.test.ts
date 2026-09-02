/**
 * Unit tests for the pipeline `approve` action — pipeline state behavior.
 *
 * The HTTP route (src/app/api/creative/pipeline/[id]/route.ts) `approve`
 * action does:
 *   1. Finds the publish stage result.
 *   2. Sets `state.config.onComplete = 'publish'`.
 *   3. Re-executes the publish stage via `executeStage`.
 *   4. Updates the stage result with the new output.
 *
 * The route requires complex mocking (auth, prisma, credits, executor), so
 * these tests focus on the PIPELINE STATE behavior around the approve flow,
 * exercising the pure functions in @/lib/creative/pipeline directly.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPipeline,
  completeStage,
  failStage,
  advancePipeline,
  type PipelineConfig,
  type PipelineState,
  type PipelineStage,
} from '@/lib/creative/pipeline';

/** Build a minimal PipelineConfig with the given enabled stages. */
function makeConfig(stages: PipelineStage[], overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    name: 'Test Pipeline',
    productName: 'Test Product',
    productDescription: 'A test product',
    brandName: 'TestBrand',
    targetAudience: 'Testers',
    platforms: ['tiktok'],
    stages: stages.map((s) => ({ stage: s, enabled: true, autoAdvance: s !== 'publish', config: {} })),
    onComplete: 'review',
    ...overrides,
  };
}

/** Find a stage result by stage id. */
function findResult(state: PipelineState, stage: PipelineStage) {
  return state.stageResults.find((r) => r.stage === stage);
}

describe('pipeline approve — onComplete switching', () => {
  test('a pipeline with onComplete=review can be switched to onComplete=publish by mutating state.config.onComplete', () => {
    const config = makeConfig(['brief', 'script', 'publish'], { onComplete: 'review' });
    const state = createPipeline(config);

    // Pre-approve: onComplete is 'review'
    assert.equal(state.config.onComplete, 'review');

    // Simulate the approve action's config mutation (route line 620):
    //   state.config.onComplete = 'publish';
    state.config.onComplete = 'publish';

    assert.equal(state.config.onComplete, 'publish', 'onComplete should now be publish after approve mutation');
  });

  test('mutating onComplete does not alter the stage results or pipeline status', () => {
    const config = makeConfig(['brief', 'publish'], { onComplete: 'review' });
    const state = createPipeline(config);

    const stagesBefore = state.stageResults.length;
    const statusBefore = state.status;

    state.config.onComplete = 'publish';

    assert.equal(state.stageResults.length, stagesBefore, 'stage results count unchanged');
    assert.equal(state.status, statusBefore, 'pipeline status unchanged by config mutation');
  });
});

describe('pipeline approve — publish stage result after approve', () => {
  test('after approve, the publish stage result has status completed (simulated by manually setting it)', () => {
    const config = makeConfig(['brief', 'publish'], { onComplete: 'review' });
    let state = createPipeline(config);

    // Advance to start 'brief'
    state = advancePipeline(state);
    assert.equal(findResult(state, 'brief')?.status, 'in_progress');

    // Complete 'brief', start 'publish'
    state = advancePipeline(state);
    assert.equal(findResult(state, 'brief')?.status, 'completed');
    assert.equal(findResult(state, 'publish')?.status, 'in_progress');

    // Simulate the approve action: switch onComplete and re-run publish.
    // The route re-executes the publish stage and updates the stage result
    // output. Here we simulate the "publish succeeded" outcome by marking
    // the publish stage completed via completeStage (the pure helper the
    // route uses to mark successful stages).
    state.config.onComplete = 'publish';
    state = completeStage(state, 'publish');

    const publishResult = findResult(state, 'publish');
    assert.ok(publishResult, 'publish stage result should exist');
    assert.equal(publishResult!.status, 'completed', 'publish stage should be completed after approve');
    assert.ok(publishResult!.completedAt, 'publish stage should have a completedAt timestamp');
  });

  test('approve flow leaves non-publish stages untouched', () => {
    const config = makeConfig(['brief', 'script', 'publish'], { onComplete: 'review' });
    let state = createPipeline(config);

    // Run brief + script to completion, leave publish pending
    state = advancePipeline(state); // brief in_progress
    state = advancePipeline(state); // brief completed, script in_progress
    state = advancePipeline(state); // script completed, publish in_progress

    // Approve: switch onComplete and complete publish
    state.config.onComplete = 'publish';
    state = completeStage(state, 'publish');

    assert.equal(findResult(state, 'brief')?.status, 'completed');
    assert.equal(findResult(state, 'script')?.status, 'completed');
    assert.equal(findResult(state, 'publish')?.status, 'completed');
  });
});

describe('pipeline approve — createPipeline initialization invariants', () => {
  test('createPipeline initializes the version field to 0', () => {
    const config = makeConfig(['brief', 'publish']);
    const state = createPipeline(config);

    assert.equal(state.version, 0, 'version should be initialized to 0 for optimistic locking');
    assert.ok('version' in state, 'version field must be present on PipelineState');
  });

  test('createPipeline initializes all stage results with charged: false', () => {
    const stages: PipelineStage[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'score', 'publish'];
    const config = makeConfig(stages);
    const state = createPipeline(config);

    assert.equal(state.stageResults.length, stages.length);
    for (const result of state.stageResults) {
      assert.equal(result.charged, false, `stage ${result.stage} should start with charged: false`);
    }
  });

  test('createPipeline initializes all stage results as pending with empty output and artifacts', () => {
    const config = makeConfig(['brief', 'publish']);
    const state = createPipeline(config);

    for (const result of state.stageResults) {
      assert.equal(result.status, 'pending');
      assert.deepEqual(result.output, {});
      assert.deepEqual(result.artifacts, []);
    }
  });
});

describe('pipeline approve — failStage on publish error', () => {
  test('if the approve re-run fails, failStage marks publish as failed and pauses the pipeline', () => {
    const config = makeConfig(['brief', 'publish'], { onComplete: 'review' });
    let state = createPipeline(config);

    // Advance to publish in_progress
    state = advancePipeline(state); // brief in_progress
    state = advancePipeline(state); // brief completed, publish in_progress

    // Approve attempt
    state.config.onComplete = 'publish';

    // Simulate the route's catch branch (route line 641):
    //   state = failStage(state, 'publish', errorMsg);
    state = failStage(state, 'publish', 'publish_service_unavailable');

    const publishResult = findResult(state, 'publish');
    assert.ok(publishResult);
    assert.equal(publishResult!.status, 'failed', 'publish should be failed after approve error');
    assert.equal(publishResult!.error, 'publish_service_unavailable');
    assert.equal(state.status, 'paused', 'pipeline should be paused after a failed approve');
  });
});
