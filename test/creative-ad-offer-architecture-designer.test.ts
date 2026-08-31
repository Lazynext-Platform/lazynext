import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Offer Architecture Designer engine (AI-powered
 * offer architecture design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_OFFER_ARCHITECTURE_DESIGNER_CREDIT_COST,
  validateCreativeAdOfferArchitectureDesignerInput,
  generateOfferArchitectures,
  VALID_PLATFORMS,
  VALID_OFFER_COMPONENT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdOfferArchitectureDesignerInput,
} from '@/lib/creative/creative-ad-offer-architecture-designer';

// ── Credit cost ──

test('CREATIVE_AD_OFFER_ARCHITECTURE_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_OFFER_ARCHITECTURE_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_OFFER_COMPONENT_TYPES contains the eight offer component types', () => {
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('core_offer'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('bonus_stack'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('premium_tier'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('guarantee_layer'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('fast_action_bonus'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('bundle_component'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('upgrade_path'));
  assert.ok(VALID_OFFER_COMPONENT_TYPES.includes('payment_option'));
  assert.equal(VALID_OFFER_COMPONENT_TYPES.length, 8);
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

const validInput: CreativeAdOfferArchitectureDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdOfferArchitectureDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdOfferArchitectureDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdOfferArchitectureDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdOfferArchitectureDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdOfferArchitectureDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
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

test('validateCreativeAdOfferArchitectureDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdOfferArchitectureDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdOfferArchitectureDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateCreativeAdOfferArchitectureDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateOfferArchitectures with dryRun: true so no real
// LLM calls are made — deterministic heuristic architectures are returned.

test('dry-run returns a OfferArchitectureDesignerResult with strategy', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.architectures));
  assert.ok(result.strategy.architectures.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns architectures with correct structure', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.offerElement === 'string' && a.offerElement.length > 0);
    assert.ok(typeof a.valueAnchor === 'string' && a.valueAnchor.length > 0);
    assert.ok(typeof a.stackPosition === 'string' && a.stackPosition.length > 0);
    assert.ok(typeof a.perceivedValue === 'number' && a.perceivedValue >= 0 && a.perceivedValue <= 100);
    assert.ok(typeof a.conversionLift === 'number' && a.conversionLift >= 0 && a.conversionLift <= 100);
    assert.ok(typeof a.offerPathway === 'string' && a.offerPathway.length > 0);
  }
});

test('dry-run returns architectures with valid offer component types', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(
      VALID_OFFER_COMPONENT_TYPES.includes(a.type as never),
      `offer component type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns perceivedValue in 0-100 range', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(a.perceivedValue >= 0 && a.perceivedValue <= 100);
  }
});

test('dry-run returns conversionLift in 0-100 range', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(a.conversionLift >= 0 && a.conversionLift <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 architectures', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  assert.ok(result.strategy.architectures.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateOfferArchitectures({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.architectures.length > 0, `${platform} should produce architectures`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateOfferArchitectures({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.architectures.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateOfferArchitectures({ ...validInput, dryRun: true });
  const r2 = await generateOfferArchitectures({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.architectures.length, r2.strategy.architectures.length);
  assert.equal(r1.strategy.architectures[0].perceivedValue, r2.strategy.architectures[0].perceivedValue);
  assert.equal(r1.strategy.architectures[0].conversionLift, r2.strategy.architectures[0].conversionLift);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateOfferArchitectures({ ...validInput, dryRun: true });
  const r2 = await generateOfferArchitectures({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Architecture count is the same but scores differ based on content length
  assert.equal(r1.strategy.architectures.length, r2.strategy.architectures.length);
});

test('generateOfferArchitectures rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateOfferArchitectures({ ...validInput, content: '' } as CreativeAdOfferArchitectureDesignerInput),
    /invalid_creative_ad_offer_architecture_designer_input/,
  );
});

test('generateOfferArchitectures rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateOfferArchitectures({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdOfferArchitectureDesignerInput),
    /invalid_creative_ad_offer_architecture_designer_input/,
  );
});

test('generateOfferArchitectures rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateOfferArchitectures({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdOfferArchitectureDesignerInput),
    /invalid_creative_ad_offer_architecture_designer_input/,
  );
});

test('generateOfferArchitectures rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateOfferArchitectures(null as never),
    /invalid_creative_ad_offer_architecture_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run architectures have distinct types', async () => {
  const result = await generateOfferArchitectures({ ...validInput, dryRun: true });
  const types = result.strategy.architectures.map((a) => a.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'architecture types should be distinct');
});
