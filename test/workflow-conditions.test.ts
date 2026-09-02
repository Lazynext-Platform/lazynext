import { test } from 'node:test';
import { strictEqual, deepEqual, ok } from 'node:assert';
import {
  evaluateCondition,
  resolveStages,
  planExecutionWaves,
  createWorkflowFromStages,
  serializeWorkflow,
  deserializeWorkflow,
  validateWorkflow,
  type StageCondition,
  type WorkflowDefinition,
  type WorkflowExecutionContext,
} from '../src/lib/creative/workflow-conditions';

test('evaluateCondition: equals matches correctly', () => {
  const cond: StageCondition = { field: 'platform', operator: 'equals', value: 'meta' };
  const ctx: WorkflowExecutionContext = { platform: 'meta' };
  strictEqual(evaluateCondition(cond, ctx), true);
});

test('evaluateCondition: equals does not match different value', () => {
  const cond: StageCondition = { field: 'platform', operator: 'equals', value: 'meta' };
  const ctx: WorkflowExecutionContext = { platform: 'google' };
  strictEqual(evaluateCondition(cond, ctx), false);
});

test('evaluateCondition: not_equals works', () => {
  const cond: StageCondition = { field: 'platform', operator: 'not_equals', value: 'meta' };
  const ctx: WorkflowExecutionContext = { platform: 'google' };
  strictEqual(evaluateCondition(cond, ctx), true);
});

test('evaluateCondition: contains works for strings', () => {
  const cond: StageCondition = { field: 'contentType', operator: 'contains', value: 'video' };
  const ctx: WorkflowExecutionContext = { contentType: 'video_ad' };
  strictEqual(evaluateCondition(cond, ctx), true);
});

test('evaluateCondition: not_contains works', () => {
  const cond: StageCondition = { field: 'contentType', operator: 'not_contains', value: 'video' };
  const ctx: WorkflowExecutionContext = { contentType: 'image_ad' };
  strictEqual(evaluateCondition(cond, ctx), true);
});

test('evaluateCondition: exists returns true for defined values', () => {
  const cond: StageCondition = { field: 'hasVoiceover', operator: 'exists' };
  const ctx: WorkflowExecutionContext = { hasVoiceover: true };
  strictEqual(evaluateCondition(cond, ctx), true);
});

test('evaluateCondition: exists returns false for undefined', () => {
  const cond: StageCondition = { field: 'hasVoiceover', operator: 'exists' };
  const ctx: WorkflowExecutionContext = {};
  strictEqual(evaluateCondition(cond, ctx), false);
});

test('evaluateCondition: not_exists returns true for undefined', () => {
  const cond: StageCondition = { field: 'hasMusic', operator: 'not_exists' };
  const ctx: WorkflowExecutionContext = {};
  strictEqual(evaluateCondition(cond, ctx), true);
});

test('resolveStages: returns all stages when no conditions', () => {
  const wf = createWorkflowFromStages(['brief', 'script', 'publish']);
  deepEqual(resolveStages(wf, {}), ['brief', 'script', 'publish']);
});

test('resolveStages: filters out stages with failing conditions', () => {
  const wf: WorkflowDefinition = {
    stages: [
      { stage: 'brief', enabled: true },
      { stage: 'audio', enabled: true, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
      { stage: 'publish', enabled: true },
    ],
    flags: {},
  };
  deepEqual(resolveStages(wf, { hasVoiceover: false }), ['brief', 'publish']);
});

test('resolveStages: includes stages with passing conditions', () => {
  const wf: WorkflowDefinition = {
    stages: [
      { stage: 'brief', enabled: true },
      { stage: 'audio', enabled: true, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
      { stage: 'publish', enabled: true },
    ],
    flags: {},
  };
  deepEqual(resolveStages(wf, { hasVoiceover: true }), ['brief', 'audio', 'publish']);
});

test('resolveStages: excludes disabled stages', () => {
  const wf: WorkflowDefinition = {
    stages: [
      { stage: 'brief', enabled: true },
      { stage: 'script', enabled: false },
      { stage: 'publish', enabled: true },
    ],
    flags: {},
  };
  deepEqual(resolveStages(wf, {}), ['brief', 'publish']);
});

test('planExecutionWaves: sequential stages produce individual waves', () => {
  const wf = createWorkflowFromStages(['brief', 'script', 'publish']);
  const waves = planExecutionWaves(wf, {});
  deepEqual(waves, [['brief'], ['script'], ['publish']]);
});

test('planExecutionWaves: parallel stages are grouped', () => {
  const wf: WorkflowDefinition = {
    stages: [
      { stage: 'brief', enabled: true },
      { stage: 'media_generation', enabled: true, parallelWith: ['audio'] },
      { stage: 'audio', enabled: true, parallelWith: ['media_generation'] },
      { stage: 'publish', enabled: true },
    ],
    flags: {},
  };
  const waves = planExecutionWaves(wf, {});
  strictEqual(waves.length, 3);
  deepEqual(waves[0], ['brief']);
  ok(waves[1].includes('media_generation') && waves[1].includes('audio'));
  deepEqual(waves[2], ['publish']);
});

test('planExecutionWaves: empty workflow returns empty array', () => {
  const wf: WorkflowDefinition = { stages: [], flags: {} };
  deepEqual(planExecutionWaves(wf, {}), []);
});

test('planExecutionWaves: respects conditional filtering', () => {
  const wf: WorkflowDefinition = {
    stages: [
      { stage: 'brief', enabled: true },
      { stage: 'audio', enabled: true, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
      { stage: 'publish', enabled: true },
    ],
    flags: {},
  };
  const waves = planExecutionWaves(wf, { hasVoiceover: false });
  deepEqual(waves, [['brief'], ['publish']]);
});

test('serializeWorkflow and deserializeWorkflow round-trip', () => {
  const wf: WorkflowDefinition = {
    stages: [
      { stage: 'brief', enabled: true },
      { stage: 'audio', enabled: true, condition: { field: 'hasVoiceover', operator: 'equals', value: 'true' } },
    ],
    flags: { custom: 'value' },
  };
  const json = serializeWorkflow(wf);
  const restored = deserializeWorkflow(json);
  strictEqual(restored.stages.length, 2);
  strictEqual(restored.stages[0].stage, 'brief');
  strictEqual(restored.stages[1].stage, 'audio');
  ok(restored.stages[1].condition);
  strictEqual(restored.flags.custom, 'value');
});

test('deserializeWorkflow: returns empty workflow for invalid JSON', () => {
  const restored = deserializeWorkflow('not valid json');
  deepEqual(restored.stages, []);
  deepEqual(restored.flags, {});
});

test('deserializeWorkflow: returns empty workflow for missing stages', () => {
  const restored = deserializeWorkflow('{"flags":{}}');
  deepEqual(restored.stages, []);
});

test('validateWorkflow: accepts valid workflow', () => {
  const wf = createWorkflowFromStages(['brief', 'script', 'publish']);
  deepEqual(validateWorkflow(wf), { valid: true });
});

test('validateWorkflow: rejects empty stages', () => {
  const wf: WorkflowDefinition = { stages: [], flags: {} };
  deepEqual(validateWorkflow(wf), { valid: false, error: 'no_stages' });
});

test('validateWorkflow: rejects invalid stage id', () => {
  const wf: WorkflowDefinition = {
    stages: [{ stage: 'invalid' as any, enabled: true }],
    flags: {},
  };
  deepEqual(validateWorkflow(wf), { valid: false, error: 'invalid_stage' });
});

test('validateWorkflow: rejects non-array stages', () => {
  deepEqual(validateWorkflow({ stages: 'bad' } as any), { valid: false, error: 'invalid_stages' });
});

test('createWorkflowFromStages: creates enabled stages', () => {
  const wf = createWorkflowFromStages(['brief', 'publish']);
  strictEqual(wf.stages.length, 2);
  ok(wf.stages.every(s => s.enabled));
});

test('condition with budgetTier field works', () => {
  const cond: StageCondition = { field: 'budgetTier', operator: 'equals', value: 'pro' };
  strictEqual(evaluateCondition(cond, { budgetTier: 'pro' }), true);
  strictEqual(evaluateCondition(cond, { budgetTier: 'free' }), false);
});
