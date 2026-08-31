import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Trend Adapter engine (AI-powered trend adaptation
 * for creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_TREND_ADAPTER_CREDIT_COST,
  validateCreativeTrendAdapterInput,
  adaptToTrends,
  VALID_PLATFORMS,
  VALID_TREND_CATEGORIES,
  VALID_RISK_LEVELS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeTrendAdapterInput,
} from '@/lib/creative/creative-trend-adapter';

// ── Credit cost ──

test('CREATIVE_TREND_ADAPTER_CREDIT_COST is 3', () => {
  assert.equal(CREATIVE_TREND_ADAPTER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_TREND_CATEGORIES contains the five categories', () => {
  assert.ok(VALID_TREND_CATEGORIES.includes('viral'));
  assert.ok(VALID_TREND_CATEGORIES.includes('seasonal'));
  assert.ok(VALID_TREND_CATEGORIES.includes('cultural'));
  assert.ok(VALID_TREND_CATEGORIES.includes('industry'));
  assert.ok(VALID_TREND_CATEGORIES.includes('aesthetic'));
  assert.equal(VALID_TREND_CATEGORIES.length, 5);
});

test('VALID_RISK_LEVELS contains the three levels', () => {
  assert.ok(VALID_RISK_LEVELS.includes('low'));
  assert.ok(VALID_RISK_LEVELS.includes('medium'));
  assert.ok(VALID_RISK_LEVELS.includes('high'));
  assert.equal(VALID_RISK_LEVELS.length, 3);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeTrendAdapterInput = {
  content: 'Check out our new vitamin C serum for glowing skin',
  productOrBrand: 'GlowUp Skincare',
  platform: 'tiktok',
  trendCategory: 'viral',
};

test('validateCreativeTrendAdapterInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeTrendAdapterInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeTrendAdapterInput rejects missing content', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeTrendAdapterInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeTrendAdapterInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeTrendAdapterInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeTrendAdapterInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeTrendAdapterInput rejects invalid trendCategory', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    trendCategory: 'random' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('trend_category_invalid'));
});

test('validateCreativeTrendAdapterInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeTrendAdapterInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeTrendAdapterInput({
    content: 'A new fitness app launch',
    productOrBrand: 'FitLife',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run adaptToTrends with dryRun: true so no real LLM calls
// are made — deterministic heuristic adaptation is returned instead.

test('dry-run returns a TrendAdapterResult with adaptation', async () => {
  const result = await adaptToTrends({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.adaptation);
  assert.equal(result.dryRun, true);
});

test('dry-run returns adaptation with correct structure', async () => {
  const result = await adaptToTrends({ ...validInput, dryRun: true });
  const a = result.adaptation;
  assert.ok(typeof a.adaptedContent === 'string' && a.adaptedContent.length > 0);
  assert.ok(Array.isArray(a.identifiedTrends) && a.identifiedTrends.length > 0);
  assert.ok(typeof a.trendRelevance === 'number');
  assert.ok(a.trendRelevance >= 1 && a.trendRelevance <= 10);
  assert.ok(typeof a.timingAdvice === 'string' && a.timingAdvice.length > 0);
  assert.ok(Array.isArray(a.suggestedHashtags) && a.suggestedHashtags.length > 0);
  assert.ok(VALID_RISK_LEVELS.includes(a.riskOfDatedness));
  assert.ok(typeof a.longevityScore === 'number');
  assert.ok(a.longevityScore >= 1 && a.longevityScore <= 10);
  assert.ok(Array.isArray(a.recommendations) && a.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await adaptToTrends({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.adaptation.adaptedContent.length > 0, `${platform} should produce adapted content`);
  }
});

test('dry-run works for all five trend categories', async () => {
  for (const category of VALID_TREND_CATEGORIES) {
    const result = await adaptToTrends({
      ...validInput,
      trendCategory: category,
      dryRun: true,
    });
    assert.ok(result.adaptation.identifiedTrends.length > 0, `${category} should identify trends`);
  }
});

test('adaptToTrends rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => adaptToTrends({ ...validInput, content: '' } as CreativeTrendAdapterInput),
    /invalid_creative_trend_adapter_input/,
  );
});

test('adaptToTrends rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => adaptToTrends({ ...validInput, productOrBrand: '' } as CreativeTrendAdapterInput),
    /invalid_creative_trend_adapter_input/,
  );
});
