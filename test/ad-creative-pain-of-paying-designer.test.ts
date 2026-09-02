import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Pain-of-Paying Designer engine (AI-powered
 * payment-friction reduction for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST,
  validateAdCreativePainOfPayingDesignerInput,
  generatePainOfPayingStrategies,
  VALID_STRATEGY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_PRICE_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_FRICTION_LENGTH,
  type AdCreativePainOfPayingDesignerInput,
} from '@/lib/creative/ad-creative-pain-of-paying-designer';

// ── Credit cost ──

test('AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_STRATEGY_TYPES contains the five strategy types', () => {
  assert.ok(VALID_STRATEGY_TYPES.includes('installment'));
  assert.ok(VALID_STRATEGY_TYPES.includes('trial'));
  assert.ok(VALID_STRATEGY_TYPES.includes('bundle'));
  assert.ok(VALID_STRATEGY_TYPES.includes('subscription'));
  assert.ok(VALID_STRATEGY_TYPES.includes('risk_reversal'));
  assert.equal(VALID_STRATEGY_TYPES.length, 5);
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

test('MAX_FRICTION_LENGTH is 4000', () => {
  assert.equal(MAX_FRICTION_LENGTH, 4000);
});

// ── Input validation tests ──

const validInput: AdCreativePainOfPayingDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  price: '$49',
  targetAudience: 'Women 25-34 interested in clean beauty',
  paymentFrictionPoints: 'High upfront cost, fear of wasting money, no trial available.',
};

test('validateAdCreativePainOfPayingDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativePainOfPayingDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects missing price', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    price: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('price_required'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects price over 200 chars', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    price: 'x'.repeat(MAX_PRICE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('price_too_long'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects missing paymentFrictionPoints', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    paymentFrictionPoints: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('payment_friction_points_required'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects paymentFrictionPoints over 4000 chars', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    paymentFrictionPoints: 'x'.repeat(MAX_FRICTION_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('payment_friction_points_too_long'));
});

test('validateAdCreativePainOfPayingDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativePainOfPayingDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativePainOfPayingDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativePainOfPayingDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePainOfPayingStrategies with dryRun: true so no
// real LLM calls are made — deterministic heuristic strategies are returned.

test('dry-run returns a PainOfPayingDesignerResult', async () => {
  const result = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
});

test('dry-run returns strategies array with at least 4 strategies', async () => {
  const result = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategies));
  assert.ok(result.strategies.length >= 4);
});

test('dry-run returns strategies with correct structure', async () => {
  const result = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  for (const strategy of result.strategies) {
    assert.ok(typeof strategy.type === 'string' && strategy.type.length > 0);
    assert.ok(VALID_STRATEGY_TYPES.includes(strategy.type as never));
    assert.ok(typeof strategy.description === 'string' && strategy.description.length > 0);
    assert.ok(typeof strategy.copy === 'string' && strategy.copy.length > 0);
    assert.ok(typeof strategy.psychologicalPrinciple === 'string' && strategy.psychologicalPrinciple.length > 0);
  }
});

test('dry-run returns a bestStrategy string', async () => {
  const result = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  assert.ok(typeof result.bestStrategy === 'string' && result.bestStrategy.length > 0);
});

test('dry-run returns adCopy with correct structure', async () => {
  const result = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.headline === 'string' && result.adCopy.headline.length > 0);
  assert.ok(typeof result.adCopy.body === 'string' && result.adCopy.body.length > 0);
  assert.ok(typeof result.adCopy.cta === 'string' && result.adCopy.cta.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  const b = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  assert.equal(a.strategies.length, b.strategies.length);
  assert.equal(a.strategies[0].type, b.strategies[0].type);
  assert.equal(a.bestStrategy, b.bestStrategy);
});

test('generatePainOfPayingStrategies rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePainOfPayingStrategies({ ...validInput, productOrBrand: '' } as AdCreativePainOfPayingDesignerInput),
    /invalid_ad_creative_pain_of_paying_designer_input/,
  );
});

test('generatePainOfPayingStrategies rejects missing price in dry-run mode', async () => {
  await assert.rejects(
    () => generatePainOfPayingStrategies({ ...validInput, price: '', dryRun: true } as AdCreativePainOfPayingDesignerInput),
    /invalid_ad_creative_pain_of_paying_designer_input/,
  );
});

test('generatePainOfPayingStrategies rejects missing paymentFrictionPoints in dry-run mode', async () => {
  await assert.rejects(
    () => generatePainOfPayingStrategies({ ...validInput, paymentFrictionPoints: '', dryRun: true } as AdCreativePainOfPayingDesignerInput),
    /invalid_ad_creative_pain_of_paying_designer_input/,
  );
});

test('dry-run strategies reference the brand or audience', async () => {
  const result = await generatePainOfPayingStrategies({ ...validInput, dryRun: true });
  const allText = result.strategies.map((s) => s.description).join(' ').toLowerCase();
  assert.ok(
    allText.includes('brand') || allText.includes('audience'),
    'strategies should reference the brand or audience',
  );
});
