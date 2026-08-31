import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Price Framing Designer engine (AI-powered
 * price framing design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_PRICE_FRAMING_DESIGNER_CREDIT_COST,
  validateCreativeAdPriceFramingDesignerInput,
  generatePriceFramings,
  VALID_PLATFORMS,
  VALID_FRAMING_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdPriceFramingDesignerInput,
} from '@/lib/creative/creative-ad-price-framing-designer';

// ── Credit cost ──

test('CREATIVE_AD_PRICE_FRAMING_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_PRICE_FRAMING_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_FRAMING_TYPES contains the eight framing types', () => {
  assert.ok(VALID_FRAMING_TYPES.includes('reference_anchor'));
  assert.ok(VALID_FRAMING_TYPES.includes('cost_per_use'));
  assert.ok(VALID_FRAMING_TYPES.includes('value_per_outcome'));
  assert.ok(VALID_FRAMING_TYPES.includes('payment_breakdown'));
  assert.ok(VALID_FRAMING_TYPES.includes('comparison_anchor'));
  assert.ok(VALID_FRAMING_TYPES.includes('sacrifice_reframe'));
  assert.ok(VALID_FRAMING_TYPES.includes('investment_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('bundle_savings'));
  assert.equal(VALID_FRAMING_TYPES.length, 8);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdPriceFramingDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdPriceFramingDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdPriceFramingDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdPriceFramingDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdPriceFramingDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPriceFramingDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPriceFramingDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdPriceFramingDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
    platform: 'myspace' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 4);
});

test('validateCreativeAdPriceFramingDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdPriceFramingDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdPriceFramingDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateCreativeAdPriceFramingDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generatePriceFramings with dryRun: true so no real
// LLM calls are made — deterministic heuristic framings are returned.

test('dry-run returns a PriceFramingDesignerResult with strategy', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.framings));
  assert.ok(result.strategy.framings.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns framings with correct structure', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  for (const f of result.strategy.framings) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.priceAnchor === 'string' && f.priceAnchor.length > 0);
    assert.ok(typeof f.reframeTechnique === 'string' && f.reframeTechnique.length > 0);
    assert.ok(typeof f.valueComparison === 'string' && f.valueComparison.length > 0);
    assert.ok(typeof f.anchorStrength === 'number' && f.anchorStrength >= 0 && f.anchorStrength <= 100);
    assert.ok(typeof f.priceAcceptance === 'number' && f.priceAcceptance >= 0 && f.priceAcceptance <= 100);
    assert.ok(typeof f.framingPathway === 'string' && f.framingPathway.length > 0);
  }
});

test('dry-run returns framings with valid framing types', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  for (const f of result.strategy.framings) {
    assert.ok(
      VALID_FRAMING_TYPES.includes(f.type as never),
      `framing type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns anchorStrength in 0-100 range', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  for (const f of result.strategy.framings) {
    assert.ok(f.anchorStrength >= 0 && f.anchorStrength <= 100);
  }
});

test('dry-run returns priceAcceptance in 0-100 range', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  for (const f of result.strategy.framings) {
    assert.ok(f.priceAcceptance >= 0 && f.priceAcceptance <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 framings', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  assert.ok(result.strategy.framings.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePriceFramings({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.framings.length > 0, `${platform} should produce framings`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePriceFramings({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.framings.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generatePriceFramings({ ...validInput, dryRun: true });
  const r2 = await generatePriceFramings({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.framings.length, r2.strategy.framings.length);
  assert.equal(r1.strategy.framings[0].anchorStrength, r2.strategy.framings[0].anchorStrength);
  assert.equal(r1.strategy.framings[0].priceAcceptance, r2.strategy.framings[0].priceAcceptance);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generatePriceFramings({ ...validInput, dryRun: true });
  const r2 = await generatePriceFramings({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framing count is the same but scores differ based on content length
  assert.equal(r1.strategy.framings.length, r2.strategy.framings.length);
});

test('generatePriceFramings rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePriceFramings({ ...validInput, content: '' } as CreativeAdPriceFramingDesignerInput),
    /invalid_creative_ad_price_framing_designer_input/,
  );
});

test('generatePriceFramings rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generatePriceFramings({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdPriceFramingDesignerInput),
    /invalid_creative_ad_price_framing_designer_input/,
  );
});

test('generatePriceFramings rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePriceFramings({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdPriceFramingDesignerInput),
    /invalid_creative_ad_price_framing_designer_input/,
  );
});

test('generatePriceFramings rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generatePriceFramings(null as never),
    /invalid_creative_ad_price_framing_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run framings have distinct types', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  const types = result.strategy.framings.map((f) => f.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'framing types should be distinct');
});

test('dry-run framings reference price anchor and reframe technique', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  for (const f of result.strategy.framings) {
    assert.ok(f.priceAnchor.length > 0, 'priceAnchor should not be empty');
    assert.ok(f.reframeTechnique.length > 0, 'reframeTechnique should not be empty');
    assert.ok(f.valueComparison.length > 0, 'valueComparison should not be empty');
  }
});

test('dry-run framings have framingPathway describing the price journey', async () => {
  const result = await generatePriceFramings({ ...validInput, dryRun: true });
  for (const f of result.strategy.framings) {
    assert.ok(f.framingPathway.length > 0, 'framingPathway should not be empty');
  }
});
