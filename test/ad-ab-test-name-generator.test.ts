import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad A/B Test Name Generator engine (AI-powered A/B test variant
 * name generation for ad campaigns).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_AB_TEST_NAME_GENERATOR_CREDIT_COST,
  validateAdABTestNameGeneratorInput,
  generateABTestNames,
  VALID_TEST_TYPES,
  MAX_PRODUCT_LENGTH,
  MIN_VARIANT_COUNT,
  MAX_VARIANT_COUNT,
  DEFAULT_VARIANT_COUNT,
  type AdABTestNameGeneratorInput,
} from '@/lib/creative/ad-ab-test-name-generator';

// ── Credit cost ──

test('AD_AB_TEST_NAME_GENERATOR_CREDIT_COST is 2', () => {
  assert.equal(AD_AB_TEST_NAME_GENERATOR_CREDIT_COST, 2);
});

// ── Constants ──

test('VALID_TEST_TYPES contains the seven supported test types', () => {
  assert.ok(VALID_TEST_TYPES.includes('hook'));
  assert.ok(VALID_TEST_TYPES.includes('headline'));
  assert.ok(VALID_TEST_TYPES.includes('cta'));
  assert.ok(VALID_TEST_TYPES.includes('visual'));
  assert.ok(VALID_TEST_TYPES.includes('audience'));
  assert.ok(VALID_TEST_TYPES.includes('timing'));
  assert.ok(VALID_TEST_TYPES.includes('format'));
  assert.equal(VALID_TEST_TYPES.length, 7);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('variant count bounds are 2-6 with default 2', () => {
  assert.equal(MIN_VARIANT_COUNT, 2);
  assert.equal(MAX_VARIANT_COUNT, 6);
  assert.equal(DEFAULT_VARIANT_COUNT, 2);
});

// ── Input validation tests ──

const validInput: AdABTestNameGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  testType: 'hook',
  variantCount: 3,
};

test('validateAdABTestNameGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdABTestNameGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdABTestNameGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdABTestNameGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdABTestNameGeneratorInput rejects missing testType', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    testType: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('test_type_required'));
});

test('validateAdABTestNameGeneratorInput rejects invalid testType', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    testType: 'color' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('test_type_invalid'));
});

test('validateAdABTestNameGeneratorInput rejects variantCount below 2', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    variantCount: 1,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_count_out_of_range'));
});

test('validateAdABTestNameGeneratorInput rejects variantCount above 6', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    variantCount: 7,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_count_out_of_range'));
});

test('validateAdABTestNameGeneratorInput rejects invalid variantCount type', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    variantCount: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_count_invalid'));
});

test('validateAdABTestNameGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdABTestNameGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdABTestNameGeneratorInput({
    productOrBrand: 'A new fitness app',
    testType: 'headline',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateABTestNames with dryRun: true so no real LLM calls
// are made — deterministic heuristic test names are returned instead.

test('dry-run returns an ABTestNameResult with testNames', async () => {
  const result = await generateABTestNames({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.testNames));
  assert.ok(result.testNames.length > 0);
  assert.equal(result.dryRun, true);
  assert.ok(typeof result.testSeriesName === 'string' && result.testSeriesName.length > 0);
});

test('dry-run returns testNames with correct structure', async () => {
  const result = await generateABTestNames({ ...validInput, dryRun: true });
  for (const tn of result.testNames) {
    assert.ok(typeof tn.variantLabel === 'string' && tn.variantLabel.length > 0);
    assert.ok(typeof tn.testName === 'string' && tn.testName.length > 0);
    assert.ok(typeof tn.hypothesis === 'string' && tn.hypothesis.length > 0);
    assert.ok(typeof tn.category === 'string' && tn.category.length > 0);
    assert.ok(typeof tn.description === 'string' && tn.description.length > 0);
  }
});

test('dry-run returns the requested count of testNames', async () => {
  const result = await generateABTestNames({ ...validInput, variantCount: 6, dryRun: true });
  assert.equal(result.testNames.length, 6);
});

test('dry-run defaults to 2 testNames when variantCount not provided', async () => {
  const result = await generateABTestNames({
    productOrBrand: 'A coffee subscription',
    testType: 'cta',
    dryRun: true,
  });
  assert.equal(result.testNames.length, DEFAULT_VARIANT_COUNT);
});

test('dry-run works for all seven test types', async () => {
  for (const testType of VALID_TEST_TYPES) {
    const result = await generateABTestNames({
      productOrBrand: 'A fitness app',
      testType,
      dryRun: true,
    });
    assert.ok(result.testNames.length > 0, `${testType} should produce test names`);
  }
});

test('generateABTestNames rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateABTestNames({ ...validInput, productOrBrand: '' } as AdABTestNameGeneratorInput),
    /invalid_ad_ab_test_name_generator_input/,
  );
});

test('generateABTestNames rejects invalid testType in dry-run mode', async () => {
  await assert.rejects(
    () => generateABTestNames({ ...validInput, testType: 'color' as never, dryRun: true } as AdABTestNameGeneratorInput),
    /invalid_ad_ab_test_name_generator_input/,
  );
});

test('generateABTestNames rejects invalid variantCount in dry-run mode', async () => {
  await assert.rejects(
    () => generateABTestNames({ ...validInput, variantCount: 100, dryRun: true } as AdABTestNameGeneratorInput),
    /invalid_ad_ab_test_name_generator_input/,
  );
});
