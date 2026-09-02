import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Emotion Analyzer engine (AI-powered emotional impact
 * analysis of ad content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_EMOTION_ANALYZER_CREDIT_COST,
  validateAdEmotionAnalyzerInput,
  analyzeEmotions,
  VALID_PLATFORMS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdEmotionAnalyzerInput,
} from '@/lib/creative/ad-emotion-analyzer';

// ── Credit cost ──

test('AD_EMOTION_ANALYZER_CREDIT_COST is 3', () => {
  assert.equal(AD_EMOTION_ANALYZER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdEmotionAnalyzerInput = {
  adContent: 'When I first tried this serum, I was skeptical. But after two weeks, my skin was glowing!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
};

test('validateAdEmotionAnalyzerInput accepts a valid input', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdEmotionAnalyzerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdEmotionAnalyzerInput rejects missing adContent', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    ...validInput,
    adContent: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('ad_content_required'));
});

test('validateAdEmotionAnalyzerInput rejects adContent over 2000 chars', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    ...validInput,
    adContent: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('ad_content_too_long'));
});

test('validateAdEmotionAnalyzerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdEmotionAnalyzerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdEmotionAnalyzerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdEmotionAnalyzerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdEmotionAnalyzerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdEmotionAnalyzerInput({
    adContent: 'An amazing product that changed my life!',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run analyzeEmotions with dryRun: true so no real LLM calls are
// made — deterministic heuristic analysis is returned instead.

test('dry-run returns an EmotionAnalyzerResult with analysis', async () => {
  const result = await analyzeEmotions({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.analysis);
  assert.equal(result.dryRun, true);
});

test('dry-run returns analysis with correct structure', async () => {
  const result = await analyzeEmotions({ ...validInput, dryRun: true });
  const a = result.analysis;
  assert.ok(typeof a.overallEmotionalImpact === 'number');
  assert.ok(a.overallEmotionalImpact >= 0 && a.overallEmotionalImpact <= 100);
  assert.ok(Array.isArray(a.dominantEmotions) && a.dominantEmotions.length > 0);
  assert.ok(typeof a.emotionScores === 'object' && Object.keys(a.emotionScores).length > 0);
  assert.ok(typeof a.emotionalJourney === 'string' && a.emotionalJourney.length > 0);
  assert.ok(typeof a.audienceResonance === 'number' && a.audienceResonance >= 1 && a.audienceResonance <= 10);
  assert.ok(typeof a.authenticity === 'number' && a.authenticity >= 1 && a.authenticity <= 10);
  assert.ok(Array.isArray(a.recommendations) && a.recommendations.length > 0);
});

test('dry-run emotion scores are all 0-100', async () => {
  const result = await analyzeEmotions({ ...validInput, dryRun: true });
  for (const score of Object.values(result.analysis.emotionScores)) {
    assert.ok(typeof score === 'number' && score >= 0 && score <= 100);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await analyzeEmotions({
      adContent: 'An amazing product that changed my life!',
      productOrBrand: 'A fitness app',
      platform,
      dryRun: true,
    });
    assert.ok(result.analysis.overallEmotionalImpact >= 0 && result.analysis.overallEmotionalImpact <= 100, `${platform} should produce a valid score`);
  }
});

test('dry-run works without platform', async () => {
  const result = await analyzeEmotions({
    adContent: 'An amazing product that changed my life!',
    productOrBrand: 'A fitness app',
    dryRun: true,
  });
  assert.ok(result.analysis.overallEmotionalImpact >= 0 && result.analysis.overallEmotionalImpact <= 100);
});

test('analyzeEmotions rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => analyzeEmotions({ ...validInput, adContent: '' } as AdEmotionAnalyzerInput),
    /invalid_ad_emotion_analyzer_input/,
  );
});

test('analyzeEmotions rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => analyzeEmotions({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdEmotionAnalyzerInput),
    /invalid_ad_emotion_analyzer_input/,
  );
});
