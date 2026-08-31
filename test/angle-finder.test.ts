import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Angle Finder engine (AI-powered discovery of unique
 * marketing angles across different psychological triggers).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  ANGLE_FINDER_CREDIT_COST,
  validateAngleFinderInput,
  findAngles,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AngleFinderInput,
} from '@/lib/creative/angle-finder';

// ── Credit cost ──

test('ANGLE_FINDER_CREDIT_COST is 4', () => {
  assert.equal(ANGLE_FINDER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('length constants are correct', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

// ── Input validation tests ──

const validInput: AngleFinderInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  targetAudience: 'women 25-40 interested in clean beauty',
};

test('validateAngleFinderInput accepts a valid input', () => {
  const { valid, errors } = validateAngleFinderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAngleFinderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAngleFinderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAngleFinderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAngleFinderInput rejects productOrBrand over MAX_PRODUCT_LENGTH', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAngleFinderInput rejects missing platform', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAngleFinderInput rejects invalid platform', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAngleFinderInput rejects invalid targetAudience type', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_invalid'));
});

test('validateAngleFinderInput rejects targetAudience over MAX_AUDIENCE_LENGTH', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAngleFinderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAngleFinderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAngleFinderInput accepts input with only required fields', () => {
  const { valid, errors } = validateAngleFinderInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run findAngles with dryRun: true so no real LLM calls are made
// — deterministic templated angles are returned instead.

test('dry-run returns an AngleFinderResult with angles', async () => {
  const result = await findAngles({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.angles));
  assert.ok(result.angles.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns angles with correct structure', async () => {
  const result = await findAngles({ ...validInput, dryRun: true });
  for (const a of result.angles) {
    assert.ok(typeof a.name === 'string' && a.name.length > 0);
    assert.ok(typeof a.psychologicalTrigger === 'string' && a.psychologicalTrigger.length > 0);
    assert.ok(typeof a.description === 'string' && a.description.length > 0);
    assert.ok(typeof a.exampleHeadline === 'string' && a.exampleHeadline.length > 0);
    assert.ok(typeof a.bestForPlatform === 'string' && a.bestForPlatform.length > 0);
    assert.ok(typeof a.uniquenessScore === 'number');
    assert.ok(a.uniquenessScore >= 0 && a.uniquenessScore <= 100);
  }
});

test('dry-run returns angles with varied psychological triggers', async () => {
  const result = await findAngles({ ...validInput, dryRun: true });
  const triggers = new Set(result.angles.map((a) => a.psychologicalTrigger));
  assert.ok(triggers.size > 1, 'should have more than one psychological trigger');
});

test('findAngles rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => findAngles({ ...validInput, productOrBrand: '' } as AngleFinderInput),
    /invalid_angle_finder_input/,
  );
});

test('findAngles rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => findAngles({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AngleFinderInput),
    /invalid_angle_finder_input/,
  );
});
