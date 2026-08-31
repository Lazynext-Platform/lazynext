import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Performance Forecaster engine (AI-powered creative
 * performance forecasting with confidence intervals).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST,
  validateCreativePerformanceForecasterInput,
  generatePerformanceForecast,
  VALID_PLATFORMS,
  VALID_CAMPAIGN_GOALS,
  VALID_BUDGET_TIERS,
  VALID_GRADES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativePerformanceForecasterInput,
} from '@/lib/creative/creative-performance-forecaster';

// ── Credit cost ──

test('CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_PERFORMANCE_FORECASTER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CAMPAIGN_GOALS contains the five goals', () => {
  assert.ok(VALID_CAMPAIGN_GOALS.includes('awareness'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('engagement'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('conversions'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('traffic'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('app_installs'));
  assert.equal(VALID_CAMPAIGN_GOALS.length, 5);
});

test('VALID_BUDGET_TIERS contains the three tiers', () => {
  assert.ok(VALID_BUDGET_TIERS.includes('small'));
  assert.ok(VALID_BUDGET_TIERS.includes('medium'));
  assert.ok(VALID_BUDGET_TIERS.includes('large'));
  assert.equal(VALID_BUDGET_TIERS.length, 3);
});

test('VALID_GRADES contains the six grades', () => {
  assert.ok(VALID_GRADES.includes('F'));
  assert.ok(VALID_GRADES.includes('D'));
  assert.ok(VALID_GRADES.includes('C'));
  assert.ok(VALID_GRADES.includes('B'));
  assert.ok(VALID_GRADES.includes('A'));
  assert.ok(VALID_GRADES.includes('A+'));
  assert.equal(VALID_GRADES.length, 6);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativePerformanceForecasterInput = {
  creativeContent: 'A 15-second TikTok showing a before/after of someone using our vitamin C serum, with a hook in the first 3 seconds and a CTA to shop now',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
};

test('validateCreativePerformanceForecasterInput accepts a valid input', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativePerformanceForecasterInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativePerformanceForecasterInput rejects missing creativeContent', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    creativeContent: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_content_required'));
});

test('validateCreativePerformanceForecasterInput rejects creativeContent over 2000 chars', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    creativeContent: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_content_too_long'));
});

test('validateCreativePerformanceForecasterInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativePerformanceForecasterInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativePerformanceForecasterInput rejects missing platform', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateCreativePerformanceForecasterInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativePerformanceForecasterInput rejects invalid campaignGoal', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    campaignGoal: 'branding' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_invalid'));
});

test('validateCreativePerformanceForecasterInput rejects invalid budgetTier', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    budgetTier: 'huge' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('budget_tier_invalid'));
});

test('validateCreativePerformanceForecasterInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativePerformanceForecasterInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    creativeContent: 'A short product demo video',
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativePerformanceForecasterInput accepts input with all optional fields', () => {
  const { valid, errors } = validateCreativePerformanceForecasterInput({
    ...validInput,
    campaignGoal: 'engagement',
    budgetTier: 'medium',
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePerformanceForecast with dryRun: true so no real LLM
// calls are made — deterministic heuristic forecasts are returned instead.

test('dry-run returns a PerformanceForecasterResult with forecast', async () => {
  const result = await generatePerformanceForecast({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.forecast);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a forecast with correct structure', async () => {
  const result = await generatePerformanceForecast({ ...validInput, dryRun: true });
  const f = result.forecast;
  // Metric ranges
  for (const range of [f.predictedCTR, f.predictedEngagement, f.predictedConversion, f.predictedReach]) {
    assert.ok(typeof range.low === 'number');
    assert.ok(typeof range.mid === 'number');
    assert.ok(typeof range.high === 'number');
    assert.ok(range.low <= range.mid, 'low should be <= mid');
    assert.ok(range.mid <= range.high, 'mid should be <= high');
  }
  // Score, grade, confidence
  assert.ok(typeof f.overallScore === 'number');
  assert.ok(f.overallScore >= 0 && f.overallScore <= 100);
  assert.ok(VALID_GRADES.includes(f.grade));
  assert.ok(typeof f.confidence === 'number');
  assert.ok(f.confidence >= 0 && f.confidence <= 100);
  // Strings and arrays
  assert.ok(typeof f.riskAssessment === 'string' && f.riskAssessment.length > 0);
  assert.ok(Array.isArray(f.keyDrivers) && f.keyDrivers.length > 0);
  assert.ok(Array.isArray(f.optimizationSuggestions) && f.optimizationSuggestions.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePerformanceForecast({
      creativeContent: 'A short product demo video',
      productOrBrand: 'A fitness app',
      platform,
      dryRun: true,
    });
    assert.ok(result.forecast, `${platform} should produce a forecast`);
    assert.ok(result.forecast.keyDrivers.length > 0, `${platform} should have key drivers`);
  }
});

test('dry-run adjusts reach based on budget tier', async () => {
  const small = await generatePerformanceForecast({ ...validInput, budgetTier: 'small', dryRun: true });
  const large = await generatePerformanceForecast({ ...validInput, budgetTier: 'large', dryRun: true });
  assert.ok(
    large.forecast.predictedReach.mid > small.forecast.predictedReach.mid,
    'large budget should have higher reach than small',
  );
});

test('dry-run defaults budget tier to medium when not provided', async () => {
  const result = await generatePerformanceForecast({ ...validInput, dryRun: true });
  // medium budget confidence is 70
  assert.equal(result.forecast.confidence, 70);
});

test('generatePerformanceForecast rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePerformanceForecast({ ...validInput, creativeContent: '' } as CreativePerformanceForecasterInput),
    /invalid_creative_performance_forecaster_input/,
  );
});

test('generatePerformanceForecast rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generatePerformanceForecast({ ...validInput, platform: 'snapchat' as never, dryRun: true } as CreativePerformanceForecasterInput),
    /invalid_creative_performance_forecaster_input/,
  );
});

test('generatePerformanceForecast rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generatePerformanceForecast({ ...validInput, productOrBrand: '', dryRun: true } as CreativePerformanceForecasterInput),
    /invalid_creative_performance_forecaster_input/,
  );
});
