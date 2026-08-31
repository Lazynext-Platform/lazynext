import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Burnout Detector engine (AI-powered creative
 * burnout/fatigue detection before performance impact).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST,
  validateAdCreativeBurnoutDetectorInput,
  generateBurnoutAnalysis,
  VALID_PLATFORMS,
  VALID_BURNOUT_LEVELS,
  VALID_REFRESH_PRIORITIES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_DAYS,
  type AdCreativeBurnoutDetectorInput,
} from '@/lib/creative/ad-creative-burnout-detector';

// ── Credit cost ──

test('AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_BURNOUT_DETECTOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_BURNOUT_LEVELS contains the four burnout levels', () => {
  assert.ok(VALID_BURNOUT_LEVELS.includes('healthy'));
  assert.ok(VALID_BURNOUT_LEVELS.includes('warning'));
  assert.ok(VALID_BURNOUT_LEVELS.includes('elevated'));
  assert.ok(VALID_BURNOUT_LEVELS.includes('critical'));
  assert.equal(VALID_BURNOUT_LEVELS.length, 4);
});

test('VALID_REFRESH_PRIORITIES contains the three priorities', () => {
  assert.ok(VALID_REFRESH_PRIORITIES.includes('low'));
  assert.ok(VALID_REFRESH_PRIORITIES.includes('medium'));
  assert.ok(VALID_REFRESH_PRIORITIES.includes('high'));
  assert.equal(VALID_REFRESH_PRIORITIES.length, 3);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_DAYS is 365', () => {
  assert.equal(MAX_DAYS, 365);
});

// ── Input validation tests ──

const validInput: AdCreativeBurnoutDetectorInput = {
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  daysRunning: 14,
  platform: 'tiktok',
};

test('validateAdCreativeBurnoutDetectorInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeBurnoutDetectorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects whitespace-only content', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeBurnoutDetectorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects whitespace-only productOrBrand', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeBurnoutDetectorInput rejects missing daysRunning (undefined)', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: undefined as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects missing daysRunning (null)', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: null as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_required'));
});

test('validateAdCreativeBurnoutDetectorInput rejects non-finite daysRunning', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: Number.NaN,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_invalid'));
});

test('validateAdCreativeBurnoutDetectorInput rejects non-number daysRunning', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: '14' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_invalid'));
});

test('validateAdCreativeBurnoutDetectorInput rejects negative daysRunning', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: -1,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_negative'));
});

test('validateAdCreativeBurnoutDetectorInput rejects daysRunning over MAX_DAYS', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: MAX_DAYS + 1,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_too_large'));
});

test('validateAdCreativeBurnoutDetectorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeBurnoutDetectorInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeBurnoutDetectorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeBurnoutDetectorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
    daysRunning: 7,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBurnoutDetectorInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBurnoutDetectorInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
    daysRunning: 7,
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBurnoutDetectorInput accepts daysRunning of 0', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: 0,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBurnoutDetectorInput accepts daysRunning at MAX_DAYS', () => {
  const { valid, errors } = validateAdCreativeBurnoutDetectorInput({
    ...validInput,
    daysRunning: MAX_DAYS,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateBurnoutAnalysis with dryRun: true so no real LLM
// calls are made — deterministic heuristic burnout analysis is returned.

test('dry-run returns a BurnoutDetectorResult with analysis', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.analysis);
  assert.equal(result.dryRun, true);
});

test('dry-run returns riskScore in 0-100 range', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(
    result.analysis.riskScore >= 0 && result.analysis.riskScore <= 100,
    `riskScore out of range: ${result.analysis.riskScore}`,
  );
});

test('dry-run returns a valid burnoutLevel', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(VALID_BURNOUT_LEVELS.includes(result.analysis.burnoutLevel));
});

test('dry-run returns fatigueIndicators with correct structure', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.fatigueIndicators));
  assert.ok(result.analysis.fatigueIndicators.length > 0);
  for (const f of result.analysis.fatigueIndicators) {
    assert.ok(typeof f.indicator === 'string' && f.indicator.length > 0);
    assert.ok(typeof f.severity === 'number' && f.severity >= 0 && f.severity <= 100);
    assert.ok(typeof f.description === 'string' && f.description.length > 0);
    assert.ok(typeof f.detected === 'boolean');
  }
});

test('dry-run returns declinePredictions with correct structure', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.declinePredictions));
  assert.ok(result.analysis.declinePredictions.length > 0);
  for (const d of result.analysis.declinePredictions) {
    assert.ok(typeof d.metric === 'string' && d.metric.length > 0);
    assert.ok(typeof d.currentTrend === 'string' && d.currentTrend.length > 0);
    assert.ok(typeof d.predictedDecline === 'number' && d.predictedDecline >= 0);
    assert.ok(typeof d.timeframe === 'string' && d.timeframe.length > 0);
  }
});

test('dry-run returns refreshRecommendations with correct structure', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.refreshRecommendations));
  assert.ok(result.analysis.refreshRecommendations.length > 0);
  for (const r of result.analysis.refreshRecommendations) {
    assert.ok(typeof r.type === 'string' && r.type.length > 0);
    assert.ok(VALID_REFRESH_PRIORITIES.includes(r.priority));
    assert.ok(typeof r.description === 'string' && r.description.length > 0);
    assert.ok(typeof r.expectedLift === 'number' && r.expectedLift >= 0);
  }
});

test('dry-run returns optimalRefreshTiming as a non-empty string', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(typeof result.analysis.optimalRefreshTiming === 'string');
  assert.ok(result.analysis.optimalRefreshTiming.length > 0);
});

test('dry-run returns recommendations as a non-empty array', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.recommendations));
  assert.ok(result.analysis.recommendations.length > 0);
  for (const rec of result.analysis.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateBurnoutAnalysis({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(
      result.analysis.fatigueIndicators.length > 0,
      `${platform} should produce fatigueIndicators`,
    );
    assert.ok(
      result.analysis.refreshRecommendations.length > 0,
      `${platform} should produce refreshRecommendations`,
    );
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateBurnoutAnalysis({
    content: validInput.content,
    productOrBrand: validInput.productOrBrand,
    daysRunning: validInput.daysRunning,
    dryRun: true,
  });
  assert.ok(result.analysis.fatigueIndicators.length > 0);
  assert.ok(result.analysis.refreshRecommendations.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run is deterministic (same input yields same output)', async () => {
  const a = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  const b = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run riskScore increases with longer daysRunning', async () => {
  const shortRun = await generateBurnoutAnalysis({
    ...validInput,
    daysRunning: 1,
    dryRun: true,
  });
  const longRun = await generateBurnoutAnalysis({
    ...validInput,
    daysRunning: 200,
    dryRun: true,
  });
  assert.ok(
    longRun.analysis.riskScore >= shortRun.analysis.riskScore,
    `long-run risk (${longRun.analysis.riskScore}) should be >= short-run risk (${shortRun.analysis.riskScore})`,
  );
});

test('dry-run produces seven fatigue indicators', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.equal(result.analysis.fatigueIndicators.length, 7);
});

test('dry-run produces three decline predictions', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.equal(result.analysis.declinePredictions.length, 3);
});

test('dry-run produces three refresh recommendations', async () => {
  const result = await generateBurnoutAnalysis({ ...validInput, dryRun: true });
  assert.equal(result.analysis.refreshRecommendations.length, 3);
});

test('generateBurnoutAnalysis rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateBurnoutAnalysis({ ...validInput, content: '' } as AdCreativeBurnoutDetectorInput),
    /invalid_ad_creative_burnout_detector_input/,
  );
});

test('generateBurnoutAnalysis rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateBurnoutAnalysis({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeBurnoutDetectorInput),
    /invalid_ad_creative_burnout_detector_input/,
  );
});

test('generateBurnoutAnalysis rejects negative daysRunning in dry-run mode', async () => {
  await assert.rejects(
    () => generateBurnoutAnalysis({ ...validInput, daysRunning: -5, dryRun: true } as AdCreativeBurnoutDetectorInput),
    /invalid_ad_creative_burnout_detector_input/,
  );
});

test('generateBurnoutAnalysis rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateBurnoutAnalysis({ ...validInput, platform: 'snapchat', dryRun: true } as AdCreativeBurnoutDetectorInput),
    /invalid_ad_creative_burnout_detector_input/,
  );
});
