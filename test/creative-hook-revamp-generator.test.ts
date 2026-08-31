import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Hook Revamp Generator engine (AI-powered hook
 * revamping with different angles, emotional triggers, and formats).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST,
  validateCreativeHookRevampGeneratorInput,
  generateHookRevamps,
  VALID_PLATFORMS,
  VALID_REVAMP_STYLES,
  MAX_HOOK_LENGTH,
  MAX_PRODUCT_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type CreativeHookRevampGeneratorInput,
} from '@/lib/creative/creative-hook-revamp-generator';

// ── Credit cost ──

test('CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST is 3', () => {
  assert.equal(CREATIVE_HOOK_REVAMP_GENERATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_REVAMP_STYLES contains the six styles', () => {
  assert.ok(VALID_REVAMP_STYLES.includes('bolder'));
  assert.ok(VALID_REVAMP_STYLES.includes('shorter'));
  assert.ok(VALID_REVAMP_STYLES.includes('question'));
  assert.ok(VALID_REVAMP_STYLES.includes('story'));
  assert.ok(VALID_REVAMP_STYLES.includes('data-driven'));
  assert.ok(VALID_REVAMP_STYLES.includes('contrarian'));
  assert.equal(VALID_REVAMP_STYLES.length, 6);
});

test('MAX_HOOK_LENGTH is 500', () => {
  assert.equal(MAX_HOOK_LENGTH, 500);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('count bounds are 3-8 with default 5', () => {
  assert.equal(MIN_COUNT, 3);
  assert.equal(MAX_COUNT, 8);
  assert.equal(DEFAULT_COUNT, 5);
});

// ── Input validation tests ──

const validInput: CreativeHookRevampGeneratorInput = {
  originalHook: 'This skincare product will change your life',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  revampStyle: 'bolder',
  count: 5,
};

test('validateCreativeHookRevampGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeHookRevampGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeHookRevampGeneratorInput rejects missing originalHook', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    originalHook: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('original_hook_required'));
});

test('validateCreativeHookRevampGeneratorInput rejects originalHook over 500 chars', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    originalHook: 'x'.repeat(MAX_HOOK_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('original_hook_too_long'));
});

test('validateCreativeHookRevampGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeHookRevampGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeHookRevampGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeHookRevampGeneratorInput rejects invalid revampStyle', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    revampStyle: 'crazy' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('revamp_style_invalid'));
});

test('validateCreativeHookRevampGeneratorInput rejects count below 3', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    count: 2,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateCreativeHookRevampGeneratorInput rejects count above 8', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    count: 9,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateCreativeHookRevampGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    count: 'five' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateCreativeHookRevampGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeHookRevampGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeHookRevampGeneratorInput({
    originalHook: 'This product is amazing',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHookRevamps with dryRun: true so no real LLM calls
// are made — deterministic heuristic revamps are returned instead.

test('dry-run returns a HookRevampResult with revamps', async () => {
  const result = await generateHookRevamps({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.revamps));
  assert.ok(result.revamps.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns revamps with correct structure', async () => {
  const result = await generateHookRevamps({ ...validInput, dryRun: true });
  for (const r of result.revamps) {
    assert.ok(typeof r.revampedHook === 'string' && r.revampedHook.length > 0);
    assert.ok(typeof r.angle === 'string' && r.angle.length > 0);
    assert.ok(typeof r.emotionalTrigger === 'string' && r.emotionalTrigger.length > 0);
    assert.ok(typeof r.formatChange === 'string' && r.formatChange.length > 0);
    assert.ok(typeof r.predictedLift === 'string' && r.predictedLift.length > 0);
    assert.ok(typeof r.reasoning === 'string' && r.reasoning.length > 0);
  }
});

test('dry-run returns the requested count of revamps', async () => {
  const result = await generateHookRevamps({ ...validInput, count: 8, dryRun: true });
  assert.equal(result.revamps.length, 8);
});

test('dry-run defaults to 5 revamps when count not provided', async () => {
  const result = await generateHookRevamps({
    originalHook: 'This product is amazing',
    productOrBrand: 'A coffee subscription',
    dryRun: true,
  });
  assert.equal(result.revamps.length, DEFAULT_COUNT);
});

test('dry-run works for all six revamp styles', async () => {
  for (const style of VALID_REVAMP_STYLES) {
    const result = await generateHookRevamps({
      originalHook: 'This product is amazing',
      productOrBrand: 'A fitness app',
      revampStyle: style,
      dryRun: true,
    });
    assert.ok(result.revamps.length > 0, `${style} should produce revamps`);
  }
});

test('generateHookRevamps rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookRevamps({ ...validInput, originalHook: '' } as CreativeHookRevampGeneratorInput),
    /invalid_creative_hook_revamp_generator_input/,
  );
});

test('generateHookRevamps rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookRevamps({ ...validInput, platform: 'snapchat' as never, dryRun: true } as CreativeHookRevampGeneratorInput),
    /invalid_creative_hook_revamp_generator_input/,
  );
});

test('generateHookRevamps rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookRevamps({ ...validInput, count: 100, dryRun: true } as CreativeHookRevampGeneratorInput),
    /invalid_creative_hook_revamp_generator_input/,
  );
});
