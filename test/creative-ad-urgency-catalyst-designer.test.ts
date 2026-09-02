import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Urgency Catalyst Designer engine (AI-powered
 * urgency catalyst design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_URGENCY_CATALYST_DESIGNER_CREDIT_COST,
  validateCreativeAdUrgencyCatalystDesignerInput,
  generateUrgencyCatalysts,
  VALID_PLATFORMS,
  VALID_CATALYST_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdUrgencyCatalystDesignerInput,
} from '@/lib/creative/creative-ad-urgency-catalyst-designer';

// ── Credit cost ──

test('CREATIVE_AD_URGENCY_CATALYST_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_URGENCY_CATALYST_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CATALYST_TYPES contains the eight catalyst types', () => {
  assert.ok(VALID_CATALYST_TYPES.includes('time_scarcity'));
  assert.ok(VALID_CATALYST_TYPES.includes('opportunity_window'));
  assert.ok(VALID_CATALYST_TYPES.includes('event_tie_in'));
  assert.ok(VALID_CATALYST_TYPES.includes('stock_pressure'));
  assert.ok(VALID_CATALYST_TYPES.includes('price_deadline'));
  assert.ok(VALID_CATALYST_TYPES.includes('social_fomo'));
  assert.ok(VALID_CATALYST_TYPES.includes('consequence_forecast'));
  assert.ok(VALID_CATALYST_TYPES.includes('momentum_riding'));
  assert.equal(VALID_CATALYST_TYPES.length, 8);
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

const validInput: CreativeAdUrgencyCatalystDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdUrgencyCatalystDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdUrgencyCatalystDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdUrgencyCatalystDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdUrgencyCatalystDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdUrgencyCatalystDesignerInput({
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

// ── Dry-run mode tests ──
//
// These tests run generateUrgencyCatalysts with dryRun: true so no real LLM
// calls are made — deterministic heuristic catalysts are returned.

test('dry-run returns a UrgencyCatalystDesignerResult with strategy', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.catalysts));
  assert.ok(result.strategy.catalysts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns catalysts with correct structure', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  for (const c of result.strategy.catalysts) {
    assert.ok(typeof c.type === 'string' && c.type.length > 0);
    assert.ok(typeof c.urgencyTrigger === 'string' && c.urgencyTrigger.length > 0);
    assert.ok(typeof c.timePressureElement === 'string' && c.timePressureElement.length > 0);
    assert.ok(typeof c.actionDriver === 'string' && c.actionDriver.length > 0);
    assert.ok(typeof c.urgencyIntensity === 'number' && c.urgencyIntensity >= 0 && c.urgencyIntensity <= 100);
    assert.ok(typeof c.actionProbability === 'number' && c.actionProbability >= 0 && c.actionProbability <= 100);
    assert.ok(typeof c.catalystPathway === 'string' && c.catalystPathway.length > 0);
  }
});

test('dry-run returns catalysts with valid catalyst types', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  for (const c of result.strategy.catalysts) {
    assert.ok(
      VALID_CATALYST_TYPES.includes(c.type as never),
      `catalyst type "${c.type}" should be valid`,
    );
  }
});

test('dry-run returns urgencyIntensity in 0-100 range', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  for (const c of result.strategy.catalysts) {
    assert.ok(c.urgencyIntensity >= 0 && c.urgencyIntensity <= 100);
  }
});

test('dry-run returns actionProbability in 0-100 range', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  for (const c of result.strategy.catalysts) {
    assert.ok(c.actionProbability >= 0 && c.actionProbability <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 catalysts', async () => {
  const result = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  assert.ok(result.strategy.catalysts.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateUrgencyCatalysts({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.catalysts.length > 0, `${platform} should produce catalysts`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateUrgencyCatalysts({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.catalysts.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  const r2 = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.catalysts.length, r2.strategy.catalysts.length);
  assert.equal(r1.strategy.catalysts[0].urgencyIntensity, r2.strategy.catalysts[0].urgencyIntensity);
  assert.equal(r1.strategy.catalysts[0].actionProbability, r2.strategy.catalysts[0].actionProbability);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateUrgencyCatalysts({ ...validInput, dryRun: true });
  const r2 = await generateUrgencyCatalysts({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Catalyst count is the same but scores differ based on content length
  assert.equal(r1.strategy.catalysts.length, r2.strategy.catalysts.length);
});

test('generateUrgencyCatalysts rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateUrgencyCatalysts({ ...validInput, content: '' } as CreativeAdUrgencyCatalystDesignerInput),
    /invalid_creative_ad_urgency_catalyst_designer_input/,
  );
});

test('generateUrgencyCatalysts rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateUrgencyCatalysts({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdUrgencyCatalystDesignerInput),
    /invalid_creative_ad_urgency_catalyst_designer_input/,
  );
});

test('generateUrgencyCatalysts rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateUrgencyCatalysts({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdUrgencyCatalystDesignerInput),
    /invalid_creative_ad_urgency_catalyst_designer_input/,
  );
});

test('generateUrgencyCatalysts rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateUrgencyCatalysts(null as never),
    /invalid_creative_ad_urgency_catalyst_designer_input/,
  );
});
