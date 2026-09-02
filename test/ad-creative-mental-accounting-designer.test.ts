import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Mental Accounting Designer engine (AI-powered
 * price reframe design for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST,
  validateAdCreativeMentalAccountingDesignerInput,
  generateMentalAccountingReframes,
  VALID_REFRAME_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_PRICE_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeMentalAccountingDesignerInput,
} from '@/lib/creative/ad-creative-mental-accounting-designer';

// ── Credit cost ──

test('AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_REFRAME_TYPES contains the four reframe types', () => {
  assert.ok(VALID_REFRAME_TYPES.includes('cost_per_use'));
  assert.ok(VALID_REFRAME_TYPES.includes('daily_equivalent'));
  assert.ok(VALID_REFRAME_TYPES.includes('category_comparison'));
  assert.ok(VALID_REFRAME_TYPES.includes('subscription_equivalent'));
  assert.equal(VALID_REFRAME_TYPES.length, 4);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_PRICE_LENGTH is 200', () => {
  assert.equal(MAX_PRICE_LENGTH, 200);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeMentalAccountingDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  price: '$49',
  targetAudience: 'Women 25-34 interested in clean beauty',
};

test('validateAdCreativeMentalAccountingDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeMentalAccountingDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects missing price', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    price: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('price_required'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects price over 200 chars', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    price: 'x'.repeat(MAX_PRICE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('price_too_long'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeMentalAccountingDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeMentalAccountingDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeMentalAccountingDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativeMentalAccountingDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateMentalAccountingReframes with dryRun: true so no
// real LLM calls are made — deterministic heuristic reframes are returned.

test('dry-run returns a MentalAccountingDesignerResult', async () => {
  const result = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
});

test('dry-run returns reframes array with at least 4 reframes', async () => {
  const result = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.reframes));
  assert.ok(result.reframes.length >= 4);
});

test('dry-run returns reframes with correct structure', async () => {
  const result = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  for (const reframe of result.reframes) {
    assert.ok(typeof reframe.type === 'string' && reframe.type.length > 0);
    assert.ok(VALID_REFRAME_TYPES.includes(reframe.type as never));
    assert.ok(typeof reframe.frame === 'string' && reframe.frame.length > 0);
    assert.ok(typeof reframe.calculation === 'string' && reframe.calculation.length > 0);
    assert.ok(typeof reframe.psychologicalEffect === 'string' && reframe.psychologicalEffect.length > 0);
  }
});

test('dry-run returns a bestReframe string', async () => {
  const result = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  assert.ok(typeof result.bestReframe === 'string' && result.bestReframe.length > 0);
});

test('dry-run returns adCopy with correct structure', async () => {
  const result = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.headline === 'string' && result.adCopy.headline.length > 0);
  assert.ok(typeof result.adCopy.body === 'string' && result.adCopy.body.length > 0);
  assert.ok(typeof result.adCopy.cta === 'string' && result.adCopy.cta.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  const b = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  assert.equal(a.reframes.length, b.reframes.length);
  assert.equal(a.reframes[0].type, b.reframes[0].type);
  assert.equal(a.bestReframe, b.bestReframe);
});

test('generateMentalAccountingReframes rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMentalAccountingReframes({ ...validInput, productOrBrand: '' } as AdCreativeMentalAccountingDesignerInput),
    /invalid_ad_creative_mental_accounting_designer_input/,
  );
});

test('generateMentalAccountingReframes rejects missing price in dry-run mode', async () => {
  await assert.rejects(
    () => generateMentalAccountingReframes({ ...validInput, price: '', dryRun: true } as AdCreativeMentalAccountingDesignerInput),
    /invalid_ad_creative_mental_accounting_designer_input/,
  );
});

test('generateMentalAccountingReframes rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateMentalAccountingReframes({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeMentalAccountingDesignerInput),
    /invalid_ad_creative_mental_accounting_designer_input/,
  );
});

test('dry-run reframes reference the brand or audience', async () => {
  const result = await generateMentalAccountingReframes({ ...validInput, dryRun: true });
  const allText = result.reframes.map((r) => r.frame).join(' ').toLowerCase();
  assert.ok(
    allText.includes('brand') || allText.includes('audience'),
    'reframes should reference the brand or audience',
  );
});
