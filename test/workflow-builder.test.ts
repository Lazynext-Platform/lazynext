import { test } from 'node:test';
import { strictEqual, deepEqual, ok } from 'node:assert';

/**
 * Workflow Builder — pure logic tests.
 *
 * The workflow builder UI manipulates an ordered list of PipelineStage values.
 * These tests cover the core operations: add, remove, reorder, and validation.
 */

type PipelineStage = 'brief' | 'script' | 'storyboard' | 'media_generation' | 'audio' | 'edit' | 'compliance' | 'publish' | 'completed';

const ALL_STAGES: PipelineStage[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish'];

const VALID_STAGES: PipelineStage[] = ['brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish', 'completed'];

// ── Pure functions mirroring the UI logic ──

function addStage(stages: PipelineStage[], stage: PipelineStage): PipelineStage[] {
  if (stages.includes(stage)) return stages;
  return [...stages, stage];
}

function removeStage(stages: PipelineStage[], index: number): PipelineStage[] {
  return stages.filter((_, i) => i !== index);
}

function moveStage(stages: PipelineStage[], from: number, to: number): PipelineStage[] {
  if (from === to || from < 0 || to < 0 || from >= stages.length || to >= stages.length) return stages;
  const next = [...stages];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function validateStages(stages: PipelineStage[]): { valid: boolean; error?: string } {
  if (!Array.isArray(stages)) return { valid: false, error: 'stages_must_be_array' };
  if (stages.length === 0) return { valid: false, error: 'no_stages' };
  for (const s of stages) {
    if (!VALID_STAGES.includes(s)) return { valid: false, error: 'invalid_stage' };
  }
  return { valid: true };
}

function filterValidStages(stages: PipelineStage[]): PipelineStage[] {
  return stages.filter(s => VALID_STAGES.includes(s));
}

// ── Tests ──

test('addStage appends a new stage', () => {
  deepEqual(addStage(['brief'], 'script'), ['brief', 'script']);
});

test('addStage does not duplicate existing stages', () => {
  deepEqual(addStage(['brief', 'script'], 'brief'), ['brief', 'script']);
});

test('removeStage removes the stage at the given index', () => {
  deepEqual(removeStage(['brief', 'script', 'publish'], 1), ['brief', 'publish']);
});

test('removeStage with out-of-bounds index returns unchanged array', () => {
  deepEqual(removeStage(['brief', 'script'], 5), ['brief', 'script']);
});

test('moveStage moves a stage from one position to another', () => {
  deepEqual(moveStage(['brief', 'script', 'publish'], 0, 2), ['script', 'publish', 'brief']);
});

test('moveStage with same index is a no-op', () => {
  deepEqual(moveStage(['brief', 'script'], 1, 1), ['brief', 'script']);
});

test('moveStage with out-of-bounds indices is a no-op', () => {
  deepEqual(moveStage(['brief', 'script'], -1, 0), ['brief', 'script']);
  deepEqual(moveStage(['brief', 'script'], 0, 5), ['brief', 'script']);
});

test('moveStage preserves all elements', () => {
  const original = ['brief', 'script', 'media_generation', 'publish'] as PipelineStage[];
  const moved = moveStage(original, 2, 0);
  strictEqual(moved.length, original.length);
  for (const s of original) {
    ok(moved.includes(s));
  }
});

test('validateStages accepts a valid stage list', () => {
  deepEqual(validateStages(['brief', 'script', 'publish']), { valid: true });
});

test('validateStages rejects an empty list', () => {
  deepEqual(validateStages([]), { valid: false, error: 'no_stages' });
});

test('validateStages rejects non-array input', () => {
  deepEqual(validateStages(null as any), { valid: false, error: 'stages_must_be_array' });
});

test('validateStages rejects invalid stage values', () => {
  deepEqual(validateStages(['brief', 'invalid' as any]), { valid: false, error: 'invalid_stage' });
});

test('filterValidStages removes invalid entries', () => {
  deepEqual(filterValidStages(['brief', 'invalid' as any, 'script']), ['brief', 'script']);
});

test('filterValidStages keeps all valid stages', () => {
  deepEqual(filterValidStages(ALL_STAGES), ALL_STAGES);
});

test('all 8 builder stages are in the valid set', () => {
  for (const s of ALL_STAGES) {
    ok(VALID_STAGES.includes(s), `Stage ${s} should be valid`);
  }
});

test('completed stage is valid but not in builder palette', () => {
  ok(VALID_STAGES.includes('completed'));
  ok(!ALL_STAGES.includes('completed'));
});

test('default builder stages form a minimal pipeline', () => {
  const defaults: PipelineStage[] = ['brief', 'script', 'media_generation', 'publish'];
  const result = validateStages(defaults);
  ok(result.valid);
  strictEqual(defaults[0], 'brief');
  strictEqual(defaults[defaults.length - 1], 'publish');
});
