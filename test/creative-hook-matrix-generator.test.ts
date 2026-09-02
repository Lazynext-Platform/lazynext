import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Hook Matrix Generator engine (AI-powered hook
 * matrix generation across emotional triggers and platform formats).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST,
  validateHookMatrixGeneratorInput,
  generateHookMatrix,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_HOOK_COUNT,
  MAX_HOOK_COUNT,
  DEFAULT_HOOK_COUNT,
  type HookMatrixGeneratorInput,
} from '@/lib/creative/creative-hook-matrix-generator';

// ── Credit cost ──

test('CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_HOOK_MATRIX_GENERATOR_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 500', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 500);
});

test('hookCount bounds are 6-24 with default 12', () => {
  assert.equal(MIN_HOOK_COUNT, 6);
  assert.equal(MAX_HOOK_COUNT, 24);
  assert.equal(DEFAULT_HOOK_COUNT, 12);
});

// ── Input validation tests ──

const validInput: HookMatrixGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  audience: 'millennial skincare enthusiasts',
  hookCount: 12,
};

test('validateHookMatrixGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateHookMatrixGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateHookMatrixGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateHookMatrixGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateHookMatrixGeneratorInput rejects missing audience', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    audience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_required'));
});

test('validateHookMatrixGeneratorInput rejects audience over 500 chars', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    audience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_too_long'));
});

test('validateHookMatrixGeneratorInput rejects hookCount below 6', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    hookCount: 5,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('hook_count_out_of_range'));
});

test('validateHookMatrixGeneratorInput rejects hookCount above 24', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    hookCount: 25,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('hook_count_out_of_range'));
});

test('validateHookMatrixGeneratorInput rejects invalid hookCount type', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    hookCount: 'twelve' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('hook_count_invalid'));
});

test('validateHookMatrixGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateHookMatrixGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateHookMatrixGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateHookMatrixGeneratorInput({
    productOrBrand: 'A fitness app',
    audience: 'busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHookMatrix with dryRun: true so no real LLM calls
// are made — deterministic heuristic hooks are returned instead.

test('dry-run returns a HookMatrixResult with matrix', async () => {
  const result = await generateHookMatrix({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.matrix);
  assert.equal(result.dryRun, true);
});

test('dry-run returns hooks with correct structure', async () => {
  const result = await generateHookMatrix({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.matrix.hooks));
  assert.ok(result.matrix.hooks.length > 0);
  for (const hook of result.matrix.hooks) {
    assert.ok(typeof hook.id === 'string' && hook.id.length > 0);
    assert.ok(typeof hook.hook === 'string' && hook.hook.length > 0);
    assert.ok(typeof hook.emotionalTrigger === 'string' && hook.emotionalTrigger.length > 0);
    assert.ok(typeof hook.platform === 'string' && hook.platform.length > 0);
    assert.ok(typeof hook.predictedScore === 'number');
    assert.ok(hook.predictedScore >= 0 && hook.predictedScore <= 100);
    assert.ok(typeof hook.bestUseCase === 'string' && hook.bestUseCase.length > 0);
    assert.ok(typeof hook.characterCount === 'number');
  }
});

test('dry-run returns the requested count of hooks', async () => {
  const result = await generateHookMatrix({ ...validInput, hookCount: 24, dryRun: true });
  assert.equal(result.matrix.hooks.length, 24);
});

test('dry-run defaults to 12 hooks when hookCount not provided', async () => {
  const result = await generateHookMatrix({
    productOrBrand: 'A coffee subscription',
    audience: 'coffee lovers',
    dryRun: true,
  });
  assert.equal(result.matrix.hooks.length, DEFAULT_HOOK_COUNT);
});

test('dry-run returns emotionalTriggers and topPicks', async () => {
  const result = await generateHookMatrix({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.matrix.emotionalTriggers));
  assert.ok(result.matrix.emotionalTriggers.length > 0);
  assert.ok(Array.isArray(result.matrix.topPicks));
  assert.ok(result.matrix.topPicks.length > 0);
});

test('dry-run returns platformDistribution', async () => {
  const result = await generateHookMatrix({ ...validInput, dryRun: true });
  assert.ok(typeof result.matrix.platformDistribution === 'object');
  assert.ok(Object.keys(result.matrix.platformDistribution).length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateHookMatrix({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.matrix.recommendations));
  assert.ok(result.matrix.recommendations.length > 0);
});

test('dry-run works with optional platform', async () => {
  const result = await generateHookMatrix({
    ...validInput,
    platform: 'tiktok',
    dryRun: true,
  });
  assert.ok(result.matrix.hooks.length > 0);
  for (const hook of result.matrix.hooks) {
    assert.equal(hook.platform, 'tiktok');
  }
});

test('generateHookMatrix rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookMatrix({ ...validInput, productOrBrand: '' } as HookMatrixGeneratorInput),
    /invalid_creative_hook_matrix_generator_input/,
  );
});

test('generateHookMatrix rejects invalid hookCount in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookMatrix({ ...validInput, hookCount: 100, dryRun: true } as HookMatrixGeneratorInput),
    /invalid_creative_hook_matrix_generator_input/,
  );
});

test('generateHookMatrix rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookMatrix({ ...validInput, platform: 'snapchat' as never, dryRun: true } as HookMatrixGeneratorInput),
    /invalid_creative_hook_matrix_generator_input/,
  );
});
