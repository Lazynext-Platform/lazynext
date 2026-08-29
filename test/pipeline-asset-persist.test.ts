/**
 * Tests for the pipeline asset persistence derivation logic.
 *
 * `derivePipelineChildAssets` is a pure function that extracts the asset
 * specifications from a pipeline state without touching the database.
 * This test verifies that the correct child assets are derived for each
 * stage type, with the correct asset types, names, data, and tags.
 */

import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { derivePipelineChildAssets, type PipelineStateLike } from '../src/lib/creative/asset-persist';

function makeState(overrides: Partial<PipelineStateLike> = {}): PipelineStateLike {
  return {
    pipelineId: 'pl_test_001',
    config: { name: 'Test Pipeline' },
    totalCreditsUsed: 10,
    stageResults: [],
    ...overrides,
  };
}

describe('derivePipelineChildAssets', () => {
  test('empty stage results — returns no child assets', () => {
    const state = makeState();
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });

  test('stages with null output — skipped', () => {
    const state = makeState({
      stageResults: [
        { stage: 'brief', status: 'completed', output: null },
        { stage: 'script', status: 'completed', output: undefined },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });

  test('media_generation stage — creates storyboard asset with media URLs', () => {
    const state = makeState({
      stageResults: [
        {
          stage: 'media_generation',
          status: 'completed',
          output: { mediaUrls: ['https://example.com/img1.png', 'https://example.com/img2.png'] },
        },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.equal(specs[0].type, 'storyboard');
    assert.ok(specs[0].name.includes('Media'));
    assert.equal((specs[0].data.mediaUrls as string[]).length, 2);
    assert.equal(specs[0].data.shotCount, 2);
    assert.equal(specs[0].data.pipelineId, 'pl_test_001');
    assert.deepEqual(specs[0].tags, ['pipeline', 'media']);
  });

  test('audio stage — creates script asset with audio URL', () => {
    const state = makeState({
      stageResults: [
        {
          stage: 'audio',
          status: 'completed',
          output: { audioUrl: 'https://example.com/audio.wav' },
        },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.equal(specs[0].type, 'script');
    assert.ok(specs[0].name.includes('Audio'));
    assert.equal(specs[0].data.audioUrl, 'https://example.com/audio.wav');
    assert.deepEqual(specs[0].tags, ['pipeline', 'audio']);
  });

  test('edit stage — creates script asset with EDL', () => {
    const state = makeState({
      stageResults: [
        {
          stage: 'edit',
          status: 'completed',
          output: { editResult: { cutPlan: [{ label: 'Intro', duration: 5 }], finalMediaUrl: 'https://example.com/final.mp4' } },
        },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.equal(specs[0].type, 'script');
    assert.ok(specs[0].name.includes('Edit Decision List'));
    assert.ok(specs[0].data.editResult);
    assert.deepEqual(specs[0].tags, ['pipeline', 'edit', 'edl']);
  });

  test('compliance stage — creates score asset with compliance result', () => {
    const state = makeState({
      stageResults: [
        {
          stage: 'compliance',
          status: 'completed',
          output: { complianceResult: { status: 'compliant', violations: [] } },
        },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.equal(specs[0].type, 'score');
    assert.ok(specs[0].name.includes('Compliance'));
    assert.ok(specs[0].data.complianceResult);
    assert.deepEqual(specs[0].tags, ['pipeline', 'compliance']);
  });

  test('publish stage — creates variants asset with publish result', () => {
    const state = makeState({
      stageResults: [
        {
          stage: 'publish',
          status: 'completed',
          output: { publishResult: { platform: 'tiktok', url: 'https://example.com/published' } },
        },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.equal(specs[0].type, 'variants');
    assert.ok(specs[0].name.includes('Publish Result'));
    assert.ok(specs[0].data.publishResult);
    assert.deepEqual(specs[0].tags, ['pipeline', 'publish']);
  });

  test('full pipeline — creates child assets for all output stages', () => {
    const state = makeState({
      stageResults: [
        { stage: 'brief', status: 'completed', output: { brief: {} } },
        { stage: 'script', status: 'completed', output: { script: {} } },
        { stage: 'storyboard', status: 'completed', output: { storyboard: {} } },
        { stage: 'media_generation', status: 'completed', output: { mediaUrls: ['https://example.com/m.mp4'] } },
        { stage: 'audio', status: 'completed', output: { audioUrl: 'https://example.com/a.wav' } },
        { stage: 'edit', status: 'completed', output: { editResult: { cutPlan: [] } } },
        { stage: 'compliance', status: 'completed', output: { complianceResult: { status: 'compliant' } } },
        { stage: 'score', status: 'completed', output: { score: { overall: 80 } } },
        { stage: 'publish', status: 'completed', output: { publishResult: { url: 'https://example.com/p' } } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    // brief, script, storyboard, score stages don't produce child assets
    // media_generation, audio, edit, compliance, publish do
    assert.equal(specs.length, 5);
    const types = specs.map((s) => s.type);
    assert.ok(types.includes('storyboard'));
    assert.ok(types.includes('script'));
    assert.ok(types.includes('score'));
    assert.ok(types.includes('variants'));
  });

  test('stages with no relevant output — skipped', () => {
    const state = makeState({
      stageResults: [
        { stage: 'media_generation', status: 'completed', output: { somethingElse: true } },
        { stage: 'audio', status: 'completed', output: { noAudioUrl: true } },
        { stage: 'edit', status: 'completed', output: { noEditResult: true } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });

  test('uses pipeline name in asset names', () => {
    const state = makeState({
      config: { name: 'My Custom Pipeline' },
      stageResults: [
        { stage: 'media_generation', status: 'completed', output: { mediaUrls: ['https://example.com/m.png'] } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.ok(specs[0].name.startsWith('My Custom Pipeline'));
  });

  test('falls back to pipeline ID when name is missing', () => {
    const state = makeState({
      config: {},
      stageResults: [
        { stage: 'media_generation', status: 'completed', output: { mediaUrls: ['https://example.com/m.png'] } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 1);
    assert.ok(specs[0].name.startsWith('Pipeline pl_test'));
  });

  test('skipped stages with output — still derived', () => {
    const state = makeState({
      stageResults: [
        { stage: 'media_generation', status: 'skipped', output: { mediaUrls: ['https://example.com/m.png'] } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    // The derivation logic does not filter by status — it processes all results with output
    assert.equal(specs.length, 1);
  });

  test('all child specs include pipelineId in data', () => {
    const state = makeState({
      stageResults: [
        { stage: 'media_generation', status: 'completed', output: { mediaUrls: ['https://example.com/m.png'] } },
        { stage: 'audio', status: 'completed', output: { audioUrl: 'https://example.com/a.wav' } },
        { stage: 'edit', status: 'completed', output: { editResult: {} } },
        { stage: 'compliance', status: 'completed', output: { complianceResult: {} } },
        { stage: 'publish', status: 'completed', output: { publishResult: {} } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    for (const spec of specs) {
      assert.equal(spec.data.pipelineId, 'pl_test_001');
    }
  });

  test('brief stage does not create child assets', () => {
    const state = makeState({
      stageResults: [
        { stage: 'brief', status: 'completed', output: { brief: { objective: 'test', product: 'test' } } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });

  test('script stage does not create child assets', () => {
    const state = makeState({
      stageResults: [
        { stage: 'script', status: 'completed', output: { script: { title: 'test' }, hooks: [], angles: [] } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });

  test('storyboard stage does not create child assets', () => {
    const state = makeState({
      stageResults: [
        { stage: 'storyboard', status: 'completed', output: { storyboard: { ratio: '9:16', shots: [] } } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });

  test('score stage does not create child assets', () => {
    const state = makeState({
      stageResults: [
        { stage: 'score', status: 'completed', output: { score: { overall: 8, hookStrength: 7 } } },
      ],
    });
    const specs = derivePipelineChildAssets(state);
    assert.equal(specs.length, 0);
  });
});
