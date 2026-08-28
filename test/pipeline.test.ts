import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE_ORDER,
  PIPELINE_COSTS,
  PIPELINE_TEMPLATES,
  enabledStages,
  totalEstimatedCredits,
  validatePipelineConfig,
  createPipeline,
  advancePipeline,
  calculateProgress,
  getPipelineTemplates,
  getStageOrder,
  canSkipStage,
  skipStage,
  retryStage,
  failStage,
  pausePipeline,
  resumePipeline,
  cancelPipeline,
  configFromTemplate,
  type PipelineStage,
  type StageStatus,
  type PipelineStatus,
  type PipelineConfig,
  type PipelineState,
} from '../src/lib/creative/pipeline.ts';

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    name: 'Test Pipeline',
    productName: 'Test Product',
    stages: [
      { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
      { stage: 'script', enabled: true, autoAdvance: true, config: {} },
    ],
    ...overrides,
  };
}

describe('pipeline', () => {
  describe('type completeness', () => {
    test('PipelineStage has expected stages', () => {
      const stages: PipelineStage[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'publish'];
      assert.ok(stages.length >= 5);
    });

    test('StageStatus has 5 statuses', () => {
      const statuses: StageStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
      assert.equal(statuses.length, 5);
    });

    test('PipelineStatus has 5 statuses', () => {
      const statuses: PipelineStatus[] = ['draft', 'running', 'paused', 'completed', 'failed'];
      assert.equal(statuses.length, 5);
    });
  });

  describe('STAGE_ORDER', () => {
    test('is an array', () => {
      assert.ok(Array.isArray(STAGE_ORDER));
      assert.ok(STAGE_ORDER.length >= 5);
    });

    test('getStageOrder returns same as STAGE_ORDER', () => {
      assert.deepEqual(getStageOrder(), STAGE_ORDER);
    });
  });

  describe('PIPELINE_COSTS', () => {
    test('has cost for every stage', () => {
      for (const stage of STAGE_ORDER) {
        assert.ok(typeof PIPELINE_COSTS[stage] === 'number');
        assert.ok(PIPELINE_COSTS[stage] >= 0);
      }
    });
  });

  describe('PIPELINE_TEMPLATES', () => {
    test('is an array with templates', () => {
      assert.ok(Array.isArray(PIPELINE_TEMPLATES));
      assert.ok(PIPELINE_TEMPLATES.length > 0);
    });

    test('getPipelineTemplates returns templates', () => {
      const templates = getPipelineTemplates();
      assert.ok(templates.length > 0);
      for (const t of templates) {
        assert.ok(t.templateId);
        assert.ok(t.name);
        assert.ok(t.description);
      }
    });
  });

  describe('validatePipelineConfig', () => {
    test('valid config passes', () => {
      const r = validatePipelineConfig(makeConfig());
      assert.ok(r.valid, `Expected valid, got errors: ${r.errors.join(', ')}`);
    });

    test('missing name fails', () => {
      const r = validatePipelineConfig(makeConfig({ name: '' }));
      assert.ok(!r.valid);
    });

    test('missing productName fails', () => {
      const r = validatePipelineConfig(makeConfig({ productName: '' }));
      assert.ok(!r.valid);
    });
  });

  describe('createPipeline', () => {
    test('creates pipeline with draft status', () => {
      const state = createPipeline(makeConfig());
      assert.equal(state.status, 'draft');
      assert.ok(state.pipelineId);
      assert.ok(state.config.stages);
    });
  });

  describe('calculateProgress', () => {
    test('returns 0 for new pipeline', () => {
      const state = createPipeline(makeConfig());
      assert.equal(calculateProgress(state), 0);
    });
  });

  describe('pause/resume', () => {
    test('pause sets status to paused', () => {
      let state = createPipeline(makeConfig());
      state = { ...state, status: 'running' };
      state = pausePipeline(state);
      assert.equal(state.status, 'paused');
    });

    test('resume sets status to running', () => {
      let state = createPipeline(makeConfig());
      state = { ...state, status: 'running' };
      state = pausePipeline(state);
      state = resumePipeline(state);
      assert.equal(state.status, 'running');
    });
  });

  describe('cancel', () => {
    test('cancel sets status to failed', () => {
      let state = createPipeline(makeConfig());
      state = cancelPipeline(state);
      assert.equal(state.status, 'failed');
    });
  });

  describe('configFromTemplate', () => {
    test('returns null for unknown template', () => {
      assert.equal(configFromTemplate('nonexistent'), null);
    });

    test('returns config for known template', () => {
      if (PIPELINE_TEMPLATES.length > 0) {
        const config = configFromTemplate(PIPELINE_TEMPLATES[0].templateId);
        assert.ok(config);
        assert.ok(config.name);
      }
    });
  });

  describe('enabledStages', () => {
    test('returns only enabled stages', () => {
      const state = createPipeline(makeConfig({
        stages: [
          { stage: 'brief', enabled: true, autoAdvance: true, config: {} },
          { stage: 'script', enabled: false, autoAdvance: true, config: {} },
        ],
      }));
      const enabled = enabledStages(state);
      assert.ok(enabled.includes('brief'));
      assert.ok(!enabled.includes('script'));
    });
  });

  describe('totalEstimatedCredits', () => {
    test('returns positive number for enabled stages', () => {
      const state = createPipeline(makeConfig());
      const credits = totalEstimatedCredits(state);
      assert.ok(credits > 0);
    });
  });
});
