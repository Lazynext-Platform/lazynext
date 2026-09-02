import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Hook Tester engine (AI-powered hook performance
 * prediction based on hooks, product, audience, and platform).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  HOOK_TESTER_CREDIT_COST,
  validateHookTesterInput,
  testHooks,
  VALID_PLATFORMS,
  MIN_HOOKS,
  MAX_HOOKS,
  MAX_HOOK_LENGTH,
  type HookTesterInput,
} from '@/lib/creative/hook-tester';

// ── Credit cost ──

test('HOOK_TESTER_CREDIT_COST is 3', () => {
  assert.equal(HOOK_TESTER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MIN_HOOKS is 2 and MAX_HOOKS is 10', () => {
  assert.equal(MIN_HOOKS, 2);
  assert.equal(MAX_HOOKS, 10);
});

test('MAX_HOOK_LENGTH is 200', () => {
  assert.equal(MAX_HOOK_LENGTH, 200);
});

// ── Input validation tests ──

const validInput: HookTesterInput = {
  hooks: ['Stop scrolling if you have dark circles', 'The 5-second trick for glowing skin'],
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'women 25-40 interested in clean beauty',
  platform: 'tiktok',
};

test('validateHookTesterInput accepts a valid input', () => {
  const { valid, errors } = validateHookTesterInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateHookTesterInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateHookTesterInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateHookTesterInput rejects missing hooks (non-array)', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    hooks: undefined as never,
  } as HookTesterInput);
  assert.equal(valid, false);
  assert.ok(errors.includes('hooks_required'));
});

test('validateHookTesterInput rejects empty hooks array', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    hooks: [],
  } as HookTesterInput);
  assert.equal(valid, false);
  assert.ok(errors.includes('hooks_min_required'));
});

test('validateHookTesterInput rejects fewer than MIN_HOOKS hooks', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    hooks: ['only one hook'],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('hooks_min_required'));
});

test('validateHookTesterInput rejects more than MAX_HOOKS hooks', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    hooks: Array(MAX_HOOKS + 1).fill('a hook'),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('too_many_hooks'));
});

test('validateHookTesterInput rejects a hook over MAX_HOOK_LENGTH chars', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    hooks: ['x'.repeat(MAX_HOOK_LENGTH + 1), 'valid hook'],
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('hook_') && e.includes('too_long')));
});

test('validateHookTesterInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateHookTesterInput rejects missing platform', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateHookTesterInput rejects invalid platform', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateHookTesterInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateHookTesterInput accepts input with only required fields', () => {
  const { valid, errors } = validateHookTesterInput({
    hooks: ['hook one', 'hook two'],
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateHookTesterInput rejects invalid targetAudience type', () => {
  const { valid, errors } = validateHookTesterInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_invalid'));
});

// ── Dry-run mode tests ──
//
// These tests run testHooks with dryRun: true so no real LLM calls are made —
// deterministic heuristic scores are returned instead.

test('dry-run returns a HookTesterResult with rankedHooks', async () => {
  const result = await testHooks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.rankedHooks));
  assert.ok(result.rankedHooks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns rankedHooks with correct structure', async () => {
  const result = await testHooks({ ...validInput, dryRun: true });
  for (const rec of result.rankedHooks) {
    assert.ok(typeof rec.hook === 'string' && rec.hook.length > 0);
    assert.ok(typeof rec.score === 'number');
    assert.ok(rec.score >= 0 && rec.score <= 100);
    assert.ok(typeof rec.predictedCtrLift === 'string' && rec.predictedCtrLift.length > 0);
    assert.ok(typeof rec.engagementPrediction === 'string' && rec.engagementPrediction.length > 0);
    assert.ok(Array.isArray(rec.strengths));
    assert.ok(Array.isArray(rec.weaknesses));
    assert.ok(typeof rec.improvementSuggestion === 'string' && rec.improvementSuggestion.length > 0);
  }
});

test('dry-run has a bestPick that is one of the rankedHooks', async () => {
  const result = await testHooks({ ...validInput, dryRun: true });
  assert.ok(typeof result.bestPick === 'string' && result.bestPick.length > 0);
  assert.ok(result.rankedHooks.some((r) => r.hook === result.bestPick));
});

test('dry-run ranks hooks by score descending', async () => {
  const result = await testHooks({ ...validInput, dryRun: true });
  for (let i = 1; i < result.rankedHooks.length; i++) {
    assert.ok(
      result.rankedHooks[i - 1].score >= result.rankedHooks[i].score,
      'rankedHooks should be sorted by score descending',
    );
  }
});

test('dry-run bestPick is the highest-scored hook', async () => {
  const result = await testHooks({ ...validInput, dryRun: true });
  assert.equal(result.bestPick, result.rankedHooks[0].hook);
});

test('dry-run covers every submitted hook', async () => {
  const hooks = ['hook a', 'hook b', 'hook c'];
  const result = await testHooks({ ...validInput, hooks, dryRun: true });
  assert.equal(result.rankedHooks.length, hooks.length);
  for (const h of hooks) {
    assert.ok(result.rankedHooks.some((r) => r.hook === h), `missing hook: ${h}`);
  }
});

test('dry-run curiosity keywords boost score', async () => {
  const result = await testHooks({
    ...validInput,
    hooks: ['The secret nobody tells you about skincare', 'buy our serum now'],
    dryRun: true,
  });
  const secretHook = result.rankedHooks.find((r) => r.hook.includes('secret'));
  const buyHook = result.rankedHooks.find((r) => r.hook.includes('buy'));
  assert.ok(secretHook && buyHook);
  assert.ok(secretHook.score >= buyHook.score, 'curiosity hook should score >= generic hook');
});

test('testHooks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => testHooks({ ...validInput, productOrBrand: '' } as HookTesterInput),
    /invalid_hook_tester_input/,
  );
});

test('testHooks rejects too few hooks in dry-run mode', async () => {
  await assert.rejects(
    () => testHooks({ ...validInput, hooks: ['only one'], dryRun: true } as HookTesterInput),
    /invalid_hook_tester_input/,
  );
});

test('testHooks rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => testHooks({ ...validInput, platform: 'snapchat' as never, dryRun: true } as HookTesterInput),
    /invalid_hook_tester_input/,
  );
});
