import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Unique Mechanism Designer engine (AI-powered
 * unique mechanism of action identification for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST,
  validateAdCreativeUniqueMechanismDesignerInput,
  generateUniqueMechanism,
  MAX_PRODUCT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeUniqueMechanismDesignerInput,
} from '@/lib/creative/ad-creative-unique-mechanism-designer';

// ── Credit cost ──

test('AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_DESCRIPTION_LENGTH is 4000', () => {
  assert.equal(MAX_DESCRIPTION_LENGTH, 4000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeUniqueMechanismDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  productDescription: 'A stabilized 15% L-ascorbic acid serum with a proprietary delivery system that penetrates the dermal barrier for maximum bioavailability.',
  targetAudience: 'Women 25-34 interested in clean beauty',
};

test('validateAdCreativeUniqueMechanismDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects missing productDescription', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    productDescription: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_description_required'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects productDescription over 4000 chars', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    productDescription: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_description_too_long'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeUniqueMechanismDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeUniqueMechanismDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeUniqueMechanismDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativeUniqueMechanismDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateUniqueMechanism with dryRun: true so no real LLM
// calls are made — deterministic heuristic mechanism content is returned.

test('dry-run returns a UniqueMechanismDesignerResult', async () => {
  const result = await generateUniqueMechanism({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a mechanism with correct structure', async () => {
  const result = await generateUniqueMechanism({ ...validInput, dryRun: true });
  assert.ok(result.mechanism);
  assert.ok(typeof result.mechanism.name === 'string' && result.mechanism.name.length > 0);
  assert.ok(typeof result.mechanism.description === 'string' && result.mechanism.description.length > 0);
  assert.ok(typeof result.mechanism.scientificBasis === 'string' && result.mechanism.scientificBasis.length > 0);
});

test('dry-run returns differentiationPoints array with at least one point', async () => {
  const result = await generateUniqueMechanism({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.differentiationPoints));
  assert.ok(result.differentiationPoints.length > 0);
  for (const point of result.differentiationPoints) {
    assert.ok(typeof point === 'string' && point.length > 0);
  }
});

test('dry-run returns adCopy with correct structure', async () => {
  const result = await generateUniqueMechanism({ ...validInput, dryRun: true });
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.headline === 'string' && result.adCopy.headline.length > 0);
  assert.ok(typeof result.adCopy.body === 'string' && result.adCopy.body.length > 0);
  assert.ok(typeof result.adCopy.cta === 'string' && result.adCopy.cta.length > 0);
});

test('dry-run returns proofElements array with at least one element', async () => {
  const result = await generateUniqueMechanism({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.proofElements));
  assert.ok(result.proofElements.length > 0);
  for (const proof of result.proofElements) {
    assert.ok(typeof proof === 'string' && proof.length > 0);
  }
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateUniqueMechanism({ ...validInput, dryRun: true });
  const b = await generateUniqueMechanism({ ...validInput, dryRun: true });
  assert.equal(a.mechanism.name, b.mechanism.name);
  assert.equal(a.differentiationPoints.length, b.differentiationPoints.length);
  assert.equal(a.adCopy.headline, b.adCopy.headline);
});

test('generateUniqueMechanism rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateUniqueMechanism({ ...validInput, productOrBrand: '' } as AdCreativeUniqueMechanismDesignerInput),
    /invalid_ad_creative_unique_mechanism_designer_input/,
  );
});

test('generateUniqueMechanism rejects missing productDescription in dry-run mode', async () => {
  await assert.rejects(
    () => generateUniqueMechanism({ ...validInput, productDescription: '', dryRun: true } as AdCreativeUniqueMechanismDesignerInput),
    /invalid_ad_creative_unique_mechanism_designer_input/,
  );
});

test('generateUniqueMechanism rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateUniqueMechanism({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeUniqueMechanismDesignerInput),
    /invalid_ad_creative_unique_mechanism_designer_input/,
  );
});

test('dry-run mechanism references the brand or audience', async () => {
  const result = await generateUniqueMechanism({ ...validInput, dryRun: true });
  const allText = [
    result.mechanism.name,
    result.mechanism.description,
    result.adCopy.headline,
  ].join(' ').toLowerCase();
  assert.ok(
    allText.includes('brand') || allText.includes('audience'),
    'mechanism should reference the brand or audience',
  );
});
