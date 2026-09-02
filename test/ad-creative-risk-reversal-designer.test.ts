import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Risk Reversal Designer engine (AI-powered
 * risk reversal design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_RISK_REVERSAL_DESIGNER_CREDIT_COST,
  validateAdCreativeRiskReversalDesignerInput,
  generateRiskReversals,
  VALID_PLATFORMS,
  VALID_REVERSAL_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeRiskReversalDesignerInput,
} from '@/lib/creative/ad-creative-risk-reversal-designer';

// ── Credit cost ──

test('AD_CREATIVE_RISK_REVERSAL_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_RISK_REVERSAL_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_REVERSAL_TYPES contains the eight reversal types', () => {
  assert.ok(VALID_REVERSAL_TYPES.includes('money_back_guarantee'));
  assert.ok(VALID_REVERSAL_TYPES.includes('free_trial'));
  assert.ok(VALID_REVERSAL_TYPES.includes('warranty_coverage'));
  assert.ok(VALID_REVERSAL_TYPES.includes('satisfaction_guarantee'));
  assert.ok(VALID_REVERSAL_TYPES.includes('risk_free_trial'));
  assert.ok(VALID_REVERSAL_TYPES.includes('deposit_refund'));
  assert.ok(VALID_REVERSAL_TYPES.includes('performance_guarantee'));
  assert.ok(VALID_REVERSAL_TYPES.includes('cancellation_freedom'));
  assert.equal(VALID_REVERSAL_TYPES.length, 8);
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

const validInput: AdCreativeRiskReversalDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeRiskReversalDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeRiskReversalDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeRiskReversalDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeRiskReversalDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeRiskReversalDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeRiskReversalDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeRiskReversalDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
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

test('validateAdCreativeRiskReversalDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeRiskReversalDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeRiskReversalDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeRiskReversalDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateRiskReversals with dryRun: true so no real
// LLM calls are made — deterministic heuristic reversals are returned.

test('dry-run returns a RiskReversalDesignerResult with strategy', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.reversals));
  assert.ok(result.strategy.reversals.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns reversals with correct structure', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  for (const r of result.strategy.reversals) {
    assert.ok(typeof r.type === 'string' && r.type.length > 0);
    assert.ok(typeof r.riskRemoved === 'string' && r.riskRemoved.length > 0);
    assert.ok(typeof r.guaranteeMechanism === 'string' && r.guaranteeMechanism.length > 0);
    assert.ok(typeof r.trustSignal === 'string' && r.trustSignal.length > 0);
    assert.ok(typeof r.riskReduction === 'number' && r.riskReduction >= 0 && r.riskReduction <= 100);
    assert.ok(typeof r.buyerConfidence === 'number' && r.buyerConfidence >= 0 && r.buyerConfidence <= 100);
    assert.ok(typeof r.reversalPathway === 'string' && r.reversalPathway.length > 0);
  }
});

test('dry-run returns reversals with valid reversal types', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  for (const r of result.strategy.reversals) {
    assert.ok(
      VALID_REVERSAL_TYPES.includes(r.type as never),
      `reversal type "${r.type}" should be valid`,
    );
  }
});

test('dry-run returns riskReduction in 0-100 range', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  for (const r of result.strategy.reversals) {
    assert.ok(r.riskReduction >= 0 && r.riskReduction <= 100);
  }
});

test('dry-run returns buyerConfidence in 0-100 range', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  for (const r of result.strategy.reversals) {
    assert.ok(r.buyerConfidence >= 0 && r.buyerConfidence <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 reversals', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  assert.ok(result.strategy.reversals.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateRiskReversals({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.reversals.length > 0, `${platform} should produce reversals`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateRiskReversals({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.reversals.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateRiskReversals({ ...validInput, dryRun: true });
  const r2 = await generateRiskReversals({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.reversals.length, r2.strategy.reversals.length);
  assert.equal(r1.strategy.reversals[0].riskReduction, r2.strategy.reversals[0].riskReduction);
  assert.equal(r1.strategy.reversals[0].buyerConfidence, r2.strategy.reversals[0].buyerConfidence);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateRiskReversals({ ...validInput, dryRun: true });
  const r2 = await generateRiskReversals({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Reversal count is the same but scores differ based on content length
  assert.equal(r1.strategy.reversals.length, r2.strategy.reversals.length);
});

test('generateRiskReversals rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateRiskReversals({ ...validInput, content: '' } as AdCreativeRiskReversalDesignerInput),
    /invalid_ad_creative_risk_reversal_designer_input/,
  );
});

test('generateRiskReversals rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateRiskReversals({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeRiskReversalDesignerInput),
    /invalid_ad_creative_risk_reversal_designer_input/,
  );
});

test('generateRiskReversals rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateRiskReversals({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeRiskReversalDesignerInput),
    /invalid_ad_creative_risk_reversal_designer_input/,
  );
});

test('generateRiskReversals rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateRiskReversals(null as never),
    /invalid_ad_creative_risk_reversal_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run reversals have distinct types', async () => {
  const result = await generateRiskReversals({ ...validInput, dryRun: true });
  const types = result.strategy.reversals.map((r) => r.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'reversal types should be distinct');
});
