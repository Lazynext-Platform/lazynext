import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Concept Validator engine (AI-powered creative concept
 * validation against best practices, platform requirements, and brand safety).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST,
  validateCreativeConceptValidatorInput,
  validateConcept,
  VALID_PLATFORMS,
  VALID_SEVERITIES,
  MAX_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeConceptValidatorInput,
} from '@/lib/creative/creative-concept-validator';

// ── Credit cost ──

test('CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_CONCEPT_VALIDATOR_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_SEVERITIES contains the three severity levels', () => {
  assert.ok(VALID_SEVERITIES.includes('high'));
  assert.ok(VALID_SEVERITIES.includes('medium'));
  assert.ok(VALID_SEVERITIES.includes('low'));
  assert.equal(VALID_SEVERITIES.length, 3);
});

test('MAX_CONCEPT_LENGTH is 2000', () => {
  assert.equal(MAX_CONCEPT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 1000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

// ── Input validation tests ──

const validInput: CreativeConceptValidatorInput = {
  concept: 'A 15-second TikTok video showing a before-and-after transformation using our vitamin C serum',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  targetAudience: 'Health-conscious women aged 25-40',
};

test('validateCreativeConceptValidatorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeConceptValidatorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeConceptValidatorInput rejects missing concept', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    concept: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_required'));
});

test('validateCreativeConceptValidatorInput rejects concept over 2000 chars', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    concept: 'x'.repeat(MAX_CONCEPT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_too_long'));
});

test('validateCreativeConceptValidatorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeConceptValidatorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeConceptValidatorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeConceptValidatorInput rejects targetAudience over 1000 chars', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeConceptValidatorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeConceptValidatorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeConceptValidatorInput({
    concept: 'A video ad concept',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run validateConcept with dryRun: true so no real LLM calls are
// made — deterministic heuristic validation is returned instead.

test('dry-run returns a ConceptValidatorResult with validation', async () => {
  const result = await validateConcept({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.validation);
  assert.equal(result.dryRun, true);
});

test('dry-run returns validation with correct structure', async () => {
  const result = await validateConcept({ ...validInput, dryRun: true });
  const v = result.validation;
  assert.ok(typeof v.overallScore === 'number');
  assert.ok(v.overallScore >= 0 && v.overallScore <= 100);
  assert.ok(typeof v.grade === 'string' && v.grade.length > 0);
  assert.ok(typeof v.platformFit === 'number' && v.platformFit >= 1 && v.platformFit <= 10);
  assert.ok(typeof v.brandSafety === 'number' && v.brandSafety >= 1 && v.brandSafety <= 10);
  assert.ok(typeof v.engagementPotential === 'number' && v.engagementPotential >= 1 && v.engagementPotential <= 10);
  assert.ok(typeof v.clarity === 'number' && v.clarity >= 1 && v.clarity <= 10);
  assert.ok(typeof v.originality === 'number' && v.originality >= 1 && v.originality <= 10);
  assert.ok(Array.isArray(v.issues));
  assert.ok(Array.isArray(v.strengths) && v.strengths.length > 0);
  assert.ok(Array.isArray(v.recommendations) && v.recommendations.length > 0);
  assert.ok(typeof v.verdict === 'string' && v.verdict.length > 0);
});

test('dry-run issues have correct severity values', async () => {
  const result = await validateConcept({ ...validInput, dryRun: true });
  for (const issue of result.validation.issues) {
    assert.ok(VALID_SEVERITIES.includes(issue.severity));
    assert.ok(typeof issue.description === 'string' && issue.description.length > 0);
    assert.ok(typeof issue.suggestion === 'string' && issue.suggestion.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await validateConcept({
      concept: 'A video ad concept',
      productOrBrand: 'A fitness app',
      platform,
      dryRun: true,
    });
    assert.ok(result.validation.overallScore >= 0 && result.validation.overallScore <= 100, `${platform} should produce a valid score`);
  }
});

test('dry-run works without platform or target audience', async () => {
  const result = await validateConcept({
    concept: 'A video ad concept',
    productOrBrand: 'A fitness app',
    dryRun: true,
  });
  assert.ok(result.validation.overallScore >= 0 && result.validation.overallScore <= 100);
});

test('validateConcept rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => validateConcept({ ...validInput, concept: '' } as CreativeConceptValidatorInput),
    /invalid_creative_concept_validator_input/,
  );
});

test('validateConcept rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => validateConcept({ ...validInput, platform: 'snapchat' as never, dryRun: true } as CreativeConceptValidatorInput),
    /invalid_creative_concept_validator_input/,
  );
});
