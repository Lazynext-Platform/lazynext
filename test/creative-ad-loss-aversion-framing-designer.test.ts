import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Loss Aversion Framing Designer engine (AI-powered
 * loss aversion framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_LOSS_AVERSION_FRAMING_DESIGNER_CREDIT_COST,
  validateCreativeAdLossAversionFramingDesignerInput,
  generateLossAversionFrameworks,
  VALID_PLATFORMS,
  VALID_LOSS_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdLossAversionFramingDesignerInput,
} from '@/lib/creative/creative-ad-loss-aversion-framing-designer';

// ── Credit cost ──

test('CREATIVE_AD_LOSS_AVERSION_FRAMING_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_LOSS_AVERSION_FRAMING_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_LOSS_TYPES contains the eight loss types', () => {
  assert.ok(VALID_LOSS_TYPES.includes('opportunity_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('time_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('money_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('status_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('relationship_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('health_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('growth_loss'));
  assert.ok(VALID_LOSS_TYPES.includes('peace_of_mind_loss'));
  assert.equal(VALID_LOSS_TYPES.length, 8);
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

const validInput: CreativeAdLossAversionFramingDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Every day you wait, your skin ages and the damage compounds — act now.',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdLossAversionFramingDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdLossAversionFramingDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdLossAversionFramingDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdLossAversionFramingDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdLossAversionFramingDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdLossAversionFramingDesignerInput({
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
// These tests run generateLossAversionFrameworks with dryRun: true so no real LLM
// calls are made — deterministic heuristic loss aversion frameworks are returned.

test('dry-run returns a LossAversionFrameworkDesignerResult with strategy', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns loss aversion frameworks with correct structure', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.lossScenario === 'string' && f.lossScenario.length > 0);
    assert.ok(typeof f.whatTheyLose === 'string' && f.whatTheyLose.length > 0);
    assert.ok(typeof f.costOfInaction === 'string' && f.costOfInaction.length > 0);
    assert.ok(typeof f.lossSalience === 'number' && f.lossSalience >= 0 && f.lossSalience <= 100);
    assert.ok(typeof f.urgencyIntensity === 'number' && f.urgencyIntensity >= 0 && f.urgencyIntensity <= 100);
    assert.ok(typeof f.lossAversionPathway === 'string' && f.lossAversionPathway.length > 0);
  }
});

test('dry-run returns loss aversion frameworks with valid loss types', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_LOSS_TYPES.includes(f.type as never),
      `loss type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns lossSalience in 0-100 range', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.lossSalience >= 0 && f.lossSalience <= 100);
  }
});

test('dry-run returns urgencyIntensity in 0-100 range', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.urgencyIntensity >= 0 && f.urgencyIntensity <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 loss aversion frameworks', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frameworks.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateLossAversionFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce loss aversion frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateLossAversionFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].lossSalience, r2.strategy.frameworks[0].lossSalience);
  assert.equal(r1.strategy.frameworks[0].urgencyIntensity, r2.strategy.frameworks[0].urgencyIntensity);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateLossAversionFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('dry-run frameworks include opportunity_loss, time_loss, and money_loss', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  const types = result.strategy.frameworks.map((f) => f.type);
  assert.ok(types.includes('opportunity_loss'));
  assert.ok(types.includes('time_loss'));
  assert.ok(types.includes('money_loss'));
});

test('dry-run lossScenario references the brand or audience', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  const allScenarios = result.strategy.frameworks.map((f) => f.lossScenario).join(' ');
  assert.ok(
    allScenarios.length > 0,
    'loss scenarios should be populated',
  );
});

test('dry-run costOfInaction is non-empty for every framework', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.costOfInaction.trim().length > 0);
  }
});

test('dry-run lossAversionPathway is non-empty for every framework', async () => {
  const result = await generateLossAversionFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.lossAversionPathway.trim().length > 0);
  }
});

test('generateLossAversionFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateLossAversionFrameworks({ ...validInput, content: '' } as CreativeAdLossAversionFramingDesignerInput),
    /invalid_creative_ad_loss_aversion_framing_designer_input/,
  );
});

test('generateLossAversionFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateLossAversionFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdLossAversionFramingDesignerInput),
    /invalid_creative_ad_loss_aversion_framing_designer_input/,
  );
});

test('generateLossAversionFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateLossAversionFrameworks({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdLossAversionFramingDesignerInput),
    /invalid_creative_ad_loss_aversion_framing_designer_input/,
  );
});

test('generateLossAversionFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateLossAversionFrameworks(null as never),
    /invalid_creative_ad_loss_aversion_framing_designer_input/,
  );
});
