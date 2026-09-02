import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Concept Expander engine (AI-powered expansion of a
 * seed creative concept into multiple fully fleshed-out creative directions).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CONCEPT_EXPANDER_CREDIT_COST,
  validateConceptExpanderInput,
  expandConcepts,
  VALID_PLATFORMS,
  VALID_DIFFICULTIES,
  MAX_SEED_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_TARGET_AUDIENCE_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type ConceptExpanderInput,
} from '@/lib/creative/concept-expander';

// ── Credit cost ──

test('CONCEPT_EXPANDER_CREDIT_COST is 4', () => {
  assert.equal(CONCEPT_EXPANDER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_DIFFICULTIES contains easy, medium, hard', () => {
  assert.deepEqual(VALID_DIFFICULTIES, ['easy', 'medium', 'hard']);
});

test('MAX_SEED_CONCEPT_LENGTH is 5000', () => {
  assert.equal(MAX_SEED_CONCEPT_LENGTH, 5000);
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

const validInput: ConceptExpanderInput = {
  seedConcept: 'A before-and-after reveal showing the product transforming a routine',
  platform: 'tiktok',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'women 25-40 interested in clean beauty',
  count: 5,
};

test('validateConceptExpanderInput accepts a valid input', () => {
  const { valid, errors } = validateConceptExpanderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateConceptExpanderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateConceptExpanderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateConceptExpanderInput rejects missing seedConcept', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    seedConcept: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('seed_concept_required'));
});

test('validateConceptExpanderInput rejects seedConcept over 5000 chars', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    seedConcept: 'x'.repeat(MAX_SEED_CONCEPT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('seed_concept_too_long'));
});

test('validateConceptExpanderInput rejects missing platform', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateConceptExpanderInput rejects invalid platform', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateConceptExpanderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateConceptExpanderInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateConceptExpanderInput rejects targetAudience over 1000 chars', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_TARGET_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateConceptExpanderInput rejects invalid targetAudience type', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_invalid'));
});

test('validateConceptExpanderInput rejects count below 3', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    count: 2,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateConceptExpanderInput rejects count above 8', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    count: 9,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateConceptExpanderInput rejects invalid count type', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    count: 'five' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateConceptExpanderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateConceptExpanderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateConceptExpanderInput accepts input with only required fields', () => {
  const { valid, errors } = validateConceptExpanderInput({
    seedConcept: 'A bold product reveal',
    platform: 'instagram',
    productOrBrand: 'A new fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run expandConcepts with dryRun: true so no real LLM calls are
// made — deterministic heuristic concepts are returned instead.

test('dry-run returns a ConceptExpanderResult with concepts', async () => {
  const result = await expandConcepts({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.concepts));
  assert.ok(result.concepts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns concepts with correct structure', async () => {
  const result = await expandConcepts({ ...validInput, dryRun: true });
  for (const concept of result.concepts) {
    assert.ok(typeof concept.title === 'string' && concept.title.length > 0);
    assert.ok(typeof concept.description === 'string' && concept.description.length > 0);
    assert.ok(typeof concept.hook === 'string' && concept.hook.length > 0);
    assert.ok(typeof concept.visualDirection === 'string' && concept.visualDirection.length > 0);
    assert.ok(typeof concept.tone === 'string' && concept.tone.length > 0);
    assert.ok(typeof concept.format === 'string' && concept.format.length > 0);
    assert.ok(typeof concept.uniqueAngle === 'string' && concept.uniqueAngle.length > 0);
    assert.ok(VALID_DIFFICULTIES.includes(concept.estimatedProductionDifficulty));
  }
});

test('dry-run returns the requested count of concepts', async () => {
  const result = await expandConcepts({ ...validInput, count: 8, dryRun: true });
  assert.equal(result.concepts.length, 8);
});

test('dry-run defaults to 5 concepts when count not provided', async () => {
  const result = await expandConcepts({
    seedConcept: 'A bold product reveal',
    platform: 'instagram',
    productOrBrand: 'A coffee subscription',
    dryRun: true,
  });
  assert.equal(result.concepts.length, DEFAULT_COUNT);
});

test('expandConcepts rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => expandConcepts({ ...validInput, seedConcept: '' } as ConceptExpanderInput),
    /invalid_concept_expander_input/,
  );
});

test('expandConcepts rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => expandConcepts({ ...validInput, platform: 'snapchat' as never, dryRun: true } as ConceptExpanderInput),
    /invalid_concept_expander_input/,
  );
});

test('expandConcepts rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => expandConcepts({ ...validInput, count: 20, dryRun: true } as ConceptExpanderInput),
    /invalid_concept_expander_input/,
  );
});
