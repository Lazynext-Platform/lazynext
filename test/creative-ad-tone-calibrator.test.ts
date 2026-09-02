import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Tone Calibrator engine (AI-powered tone calibration
 * for ad creative content to match brand and audience expectations).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST,
  validateCreativeAdToneCalibratorInput,
  generateToneCalibration,
  VALID_PLATFORMS,
  VALID_TONES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeAdToneCalibratorInput,
} from '@/lib/creative/creative-ad-tone-calibrator';

// ── Credit cost ──

test('CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST is 3', () => {
  assert.equal(CREATIVE_AD_TONE_CALIBRATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_TONES contains the eight supported tones', () => {
  assert.ok(VALID_TONES.includes('professional'));
  assert.ok(VALID_TONES.includes('casual'));
  assert.ok(VALID_TONES.includes('playful'));
  assert.ok(VALID_TONES.includes('authoritative'));
  assert.ok(VALID_TONES.includes('empathetic'));
  assert.ok(VALID_TONES.includes('urgent'));
  assert.ok(VALID_TONES.includes('inspirational'));
  assert.ok(VALID_TONES.includes('humorous'));
  assert.equal(VALID_TONES.length, 8);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdToneCalibratorInput = {
  content: 'Buy our amazing vitamin C serum today and see results in just 7 days!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  desiredTone: 'professional',
  platform: 'tiktok',
};

test('validateCreativeAdToneCalibratorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdToneCalibratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdToneCalibratorInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdToneCalibratorInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdToneCalibratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdToneCalibratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdToneCalibratorInput rejects missing desiredTone', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    desiredTone: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_tone_required'));
});

test('validateCreativeAdToneCalibratorInput rejects invalid desiredTone', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    desiredTone: 'sarcastic' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_tone_invalid'));
});

test('validateCreativeAdToneCalibratorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdToneCalibratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdToneCalibratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
    desiredTone: 'casual',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdToneCalibratorInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdToneCalibratorInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdToneCalibratorInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
    desiredTone: 'playful',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateToneCalibration with dryRun: true so no real LLM
// calls are made — deterministic heuristic tone calibration is returned.

test('dry-run returns a ToneCalibratorResult with calibration', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.calibration);
  assert.equal(result.dryRun, true);
});

test('dry-run returns currentTone as an array with correct structure', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.calibration.currentTone));
  assert.ok(result.calibration.currentTone.length > 0);
  for (const d of result.calibration.currentTone) {
    assert.ok(typeof d.dimension === 'string' && d.dimension.length > 0);
    assert.ok(typeof d.currentScore === 'number' && d.currentScore >= 0 && d.currentScore <= 100);
    assert.ok(typeof d.desiredScore === 'number' && d.desiredScore >= 0 && d.desiredScore <= 100);
    assert.ok(typeof d.gap === 'number');
    assert.equal(d.gap, d.desiredScore - d.currentScore);
  }
});

test('dry-run returns alignmentScore in 0-100 range', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(
    result.calibration.alignmentScore >= 0 && result.calibration.alignmentScore <= 100,
    `alignmentScore out of range: ${result.calibration.alignmentScore}`,
  );
});

test('dry-run returns desiredTone matching input', async () => {
  const result = await generateToneCalibration({ ...validInput, desiredTone: 'empathetic', dryRun: true });
  assert.equal(result.calibration.desiredTone, 'empathetic');
});

test('dry-run returns toneAdjustments with correct structure', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.calibration.toneAdjustments));
  assert.ok(result.calibration.toneAdjustments.length > 0);
  for (const adj of result.calibration.toneAdjustments) {
    assert.ok(typeof adj.area === 'string' && adj.area.length > 0);
    assert.ok(typeof adj.current === 'string' && adj.current.length > 0);
    assert.ok(typeof adj.suggested === 'string' && adj.suggested.length > 0);
    assert.ok(typeof adj.impact === 'number' && adj.impact >= 0 && adj.impact <= 100);
  }
});

test('dry-run returns wordReplacements with correct structure', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.calibration.wordReplacements));
  assert.ok(result.calibration.wordReplacements.length > 0);
  for (const w of result.calibration.wordReplacements) {
    assert.ok(typeof w.original === 'string' && w.original.length > 0);
    assert.ok(typeof w.replacement === 'string' && w.replacement.length > 0);
    assert.ok(typeof w.reason === 'string' && w.reason.length > 0);
  }
});

test('dry-run returns calibratedContent as a non-empty string', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(typeof result.calibration.calibratedContent === 'string');
  assert.ok(result.calibration.calibratedContent.length > 0);
});

test('dry-run returns recommendations as a non-empty array', async () => {
  const result = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.calibration.recommendations));
  assert.ok(result.calibration.recommendations.length > 0);
  for (const rec of result.calibration.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateToneCalibration({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.calibration.currentTone.length > 0, `${platform} should produce currentTone`);
    assert.ok(result.calibration.recommendations.length > 0, `${platform} should produce recommendations`);
  }
});

test('dry-run works for all eight tones', async () => {
  for (const tone of VALID_TONES) {
    const result = await generateToneCalibration({
      ...validInput,
      desiredTone: tone,
      dryRun: true,
    });
    assert.equal(result.calibration.desiredTone, tone);
    assert.ok(result.calibration.currentTone.length > 0, `${tone} should produce currentTone`);
    assert.ok(result.calibration.wordReplacements.length > 0, `${tone} should produce wordReplacements`);
  }
});

test('dry-run is deterministic (same input → same output)', async () => {
  const a = await generateToneCalibration({ ...validInput, dryRun: true });
  const b = await generateToneCalibration({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run calibratedContent applies word replacements', async () => {
  const inputWithBuy = {
    ...validInput,
    content: 'Buy this amazing product now!',
    dryRun: true,
  };
  const result = await generateToneCalibration(inputWithBuy);
  // The word "buy" should be replaced and "amazing" should be replaced.
  assert.ok(!/\bbuy\b/i.test(result.calibration.calibratedContent), 'buy should be replaced');
  assert.ok(!/\bamazing\b/i.test(result.calibration.calibratedContent), 'amazing should be replaced');
});

test('generateToneCalibration rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateToneCalibration({ ...validInput, content: '' } as CreativeAdToneCalibratorInput),
    /invalid_creative_ad_tone_calibrator_input/,
  );
});

test('generateToneCalibration rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateToneCalibration({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdToneCalibratorInput),
    /invalid_creative_ad_tone_calibrator_input/,
  );
});

test('generateToneCalibration rejects invalid desiredTone in dry-run mode', async () => {
  await assert.rejects(
    () => generateToneCalibration({ ...validInput, desiredTone: 'sarcastic' as never, dryRun: true }),
    /invalid_creative_ad_tone_calibrator_input/,
  );
});

test('generateToneCalibration rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateToneCalibration({ ...validInput, platform: 'snapchat' as never, dryRun: true }),
    /invalid_creative_ad_tone_calibrator_input/,
  );
});
