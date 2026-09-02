import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Concept Expander Pro engine (AI-powered concept
 * expansion into a full campaign ecosystem).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST,
  validateCreativeConceptExpanderProInput,
  generateConceptExpansion,
  VALID_PLATFORMS,
  VALID_EXPANSION_DEPTHS,
  DEFAULT_EXPANSION_DEPTH,
  MAX_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeConceptExpanderProInput,
} from '@/lib/creative/creative-concept-expander-pro';

// ── Credit cost ──

test('CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_CONCEPT_EXPANDER_PRO_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_EXPANSION_DEPTHS contains the three depths', () => {
  assert.ok(VALID_EXPANSION_DEPTHS.includes('shallow'));
  assert.ok(VALID_EXPANSION_DEPTHS.includes('standard'));
  assert.ok(VALID_EXPANSION_DEPTHS.includes('deep'));
  assert.equal(VALID_EXPANSION_DEPTHS.length, 3);
});

test('DEFAULT_EXPANSION_DEPTH is standard', () => {
  assert.equal(DEFAULT_EXPANSION_DEPTH, 'standard');
});

test('MAX_CONCEPT_LENGTH is 2000', () => {
  assert.equal(MAX_CONCEPT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeConceptExpanderProInput = {
  concept: 'A before-and-after transformation showing real results in 30 days',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  expansionDepth: 'standard',
  platform: 'tiktok',
};

test('validateCreativeConceptExpanderProInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeConceptExpanderProInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeConceptExpanderProInput rejects missing concept', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    concept: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_required'));
});

test('validateCreativeConceptExpanderProInput rejects concept over 2000 chars', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    concept: 'x'.repeat(MAX_CONCEPT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_too_long'));
});

test('validateCreativeConceptExpanderProInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeConceptExpanderProInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeConceptExpanderProInput rejects invalid expansionDepth', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    expansionDepth: 'extreme' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('expansion_depth_invalid'));
});

test('validateCreativeConceptExpanderProInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeConceptExpanderProInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeConceptExpanderProInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    concept: 'A transformation story',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeConceptExpanderProInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeConceptExpanderProInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateConceptExpansion with dryRun: true so no real LLM
// calls are made — deterministic heuristic expansion is returned.

test('dry-run returns a ConceptExpanderProResult with expansion', async () => {
  const result = await generateConceptExpansion({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.expansion);
  assert.ok(Array.isArray(result.expansion.variations));
  assert.ok(result.expansion.variations.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns variations with correct structure', async () => {
  const result = await generateConceptExpansion({ ...validInput, dryRun: true });
  for (const v of result.expansion.variations) {
    assert.ok(typeof v.name === 'string' && v.name.length > 0);
    assert.ok(typeof v.description === 'string' && v.description.length > 0);
    assert.ok(typeof v.format === 'string' && v.format.length > 0);
    assert.ok(typeof v.platform === 'string' && v.platform.length > 0);
    assert.ok(typeof v.differentiationAngle === 'string' && v.differentiationAngle.length > 0);
  }
});

test('dry-run returns extensions with correct structure', async () => {
  const result = await generateConceptExpansion({ ...validInput, dryRun: true });
  assert.ok(result.expansion.extensions.length > 0);
  for (const e of result.expansion.extensions) {
    assert.ok(typeof e.type === 'string' && e.type.length > 0);
    assert.ok(typeof e.description === 'string' && e.description.length > 0);
    assert.ok(typeof e.application === 'string' && e.application.length > 0);
  }
});

test('dry-run returns cross-platform adaptations with correct structure', async () => {
  const result = await generateConceptExpansion({ ...validInput, dryRun: true });
  assert.ok(result.expansion.crossPlatformAdaptations.length > 0);
  for (const a of result.expansion.crossPlatformAdaptations) {
    assert.ok(typeof a.platform === 'string' && a.platform.length > 0);
    assert.ok(typeof a.adaptation === 'string' && a.adaptation.length > 0);
    assert.ok(Array.isArray(a.keyChanges));
  }
});

test('dry-run returns ecosystemMap, creativeDirections, and recommendations', async () => {
  const result = await generateConceptExpansion({ ...validInput, dryRun: true });
  assert.ok(typeof result.expansion.ecosystemMap === 'string' && result.expansion.ecosystemMap.length > 0);
  assert.ok(Array.isArray(result.expansion.creativeDirections));
  assert.ok(result.expansion.creativeDirections.length > 0);
  assert.ok(Array.isArray(result.expansion.recommendations));
  assert.ok(result.expansion.recommendations.length > 0);
});

test('dry-run shallow depth produces 3 variations', async () => {
  const result = await generateConceptExpansion({ ...validInput, expansionDepth: 'shallow', dryRun: true });
  assert.equal(result.expansion.variations.length, 3);
  assert.equal(result.expansion.extensions.length, 2);
});

test('dry-run standard depth produces 5 variations', async () => {
  const result = await generateConceptExpansion({ ...validInput, expansionDepth: 'standard', dryRun: true });
  assert.equal(result.expansion.variations.length, 5);
  assert.equal(result.expansion.extensions.length, 3);
});

test('dry-run deep depth produces 8 variations', async () => {
  const result = await generateConceptExpansion({ ...validInput, expansionDepth: 'deep', dryRun: true });
  assert.equal(result.expansion.variations.length, 8);
  assert.equal(result.expansion.extensions.length, 5);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateConceptExpansion({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.expansion.variations.length > 0, `${platform} should produce variations`);
  }
});

test('generateConceptExpansion rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateConceptExpansion({ ...validInput, concept: '' } as CreativeConceptExpanderProInput),
    /invalid_creative_concept_expander_pro_input/,
  );
});

test('generateConceptExpansion rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateConceptExpansion({ ...validInput, productOrBrand: '', dryRun: true } as CreativeConceptExpanderProInput),
    /invalid_creative_concept_expander_pro_input/,
  );
});
