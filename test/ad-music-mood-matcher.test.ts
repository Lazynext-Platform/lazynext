import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Music Mood Matcher engine (AI-powered music genre/mood
 * matching for ad content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_MUSIC_MOOD_MATCHER_CREDIT_COST,
  validateAdMusicMoodMatcherInput,
  generateMusicRecommendations,
  VALID_PLATFORMS,
  VALID_AD_MOODS,
  MAX_PRODUCT_LENGTH,
  MIN_DURATION,
  MAX_DURATION,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdMusicMoodMatcherInput,
} from '@/lib/creative/ad-music-mood-matcher';

// ── Credit cost ──

test('AD_MUSIC_MOOD_MATCHER_CREDIT_COST is 3', () => {
  assert.equal(AD_MUSIC_MOOD_MATCHER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_AD_MOODS contains the seven moods', () => {
  assert.ok(VALID_AD_MOODS.includes('energetic'));
  assert.ok(VALID_AD_MOODS.includes('calm'));
  assert.ok(VALID_AD_MOODS.includes('inspirational'));
  assert.ok(VALID_AD_MOODS.includes('dramatic'));
  assert.ok(VALID_AD_MOODS.includes('playful'));
  assert.ok(VALID_AD_MOODS.includes('romantic'));
  assert.ok(VALID_AD_MOODS.includes('mysterious'));
  assert.equal(VALID_AD_MOODS.length, 7);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('duration bounds are 5-120', () => {
  assert.equal(MIN_DURATION, 5);
  assert.equal(MAX_DURATION, 120);
});

test('count bounds are 1-6 with default 3', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 6);
  assert.equal(DEFAULT_COUNT, 3);
});

// ── Input validation tests ──

const validInput: AdMusicMoodMatcherInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  adMood: 'energetic',
  duration: 30,
  count: 3,
};

test('validateAdMusicMoodMatcherInput accepts a valid input', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdMusicMoodMatcherInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdMusicMoodMatcherInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdMusicMoodMatcherInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdMusicMoodMatcherInput rejects missing platform', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdMusicMoodMatcherInput rejects invalid platform', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdMusicMoodMatcherInput rejects invalid adMood', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    adMood: 'angry' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('ad_mood_invalid'));
});

test('validateAdMusicMoodMatcherInput rejects duration below 5', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    duration: 4,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_out_of_range'));
});

test('validateAdMusicMoodMatcherInput rejects duration above 120', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    duration: 121,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_out_of_range'));
});

test('validateAdMusicMoodMatcherInput rejects count below 1', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdMusicMoodMatcherInput rejects count above 6', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    count: 7,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdMusicMoodMatcherInput rejects invalid count type', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    count: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdMusicMoodMatcherInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdMusicMoodMatcherInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdMusicMoodMatcherInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateMusicRecommendations with dryRun: true so no real
// LLM calls are made — deterministic heuristic recommendations are returned.

test('dry-run returns an AdMusicMoodMatcherResult with recommendations', async () => {
  const result = await generateMusicRecommendations({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.recommendations));
  assert.ok(result.recommendations.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns recommendations with correct structure', async () => {
  const result = await generateMusicRecommendations({ ...validInput, dryRun: true });
  for (const rec of result.recommendations) {
    assert.ok(typeof rec.genre === 'string' && rec.genre.length > 0);
    assert.ok(typeof rec.subGenre === 'string' && rec.subGenre.length > 0);
    assert.ok(typeof rec.mood === 'string' && rec.mood.length > 0);
    assert.ok(typeof rec.tempoBPM === 'number' && rec.tempoBPM > 0);
    assert.ok(typeof rec.energyLevel === 'number' && rec.energyLevel >= 1 && rec.energyLevel <= 10);
    assert.ok(Array.isArray(rec.instruments) && rec.instruments.length > 0);
    assert.ok(typeof rec.description === 'string' && rec.description.length > 0);
    assert.ok(typeof rec.bestForScene === 'string' && rec.bestForScene.length > 0);
    assert.ok(typeof rec.licenseType === 'string' && rec.licenseType.length > 0);
  }
});

test('dry-run returns the requested count of recommendations', async () => {
  const result = await generateMusicRecommendations({ ...validInput, count: 6, dryRun: true });
  assert.equal(result.recommendations.length, 6);
});

test('dry-run defaults to 3 recommendations when count not provided', async () => {
  const result = await generateMusicRecommendations({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.recommendations.length, DEFAULT_COUNT);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateMusicRecommendations({
      productOrBrand: 'A fitness app',
      platform,
      dryRun: true,
    });
    assert.ok(result.recommendations.length > 0, `${platform} should produce recommendations`);
  }
});

test('generateMusicRecommendations rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMusicRecommendations({ ...validInput, productOrBrand: '' } as AdMusicMoodMatcherInput),
    /invalid_ad_music_mood_matcher_input/,
  );
});

test('generateMusicRecommendations rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateMusicRecommendations({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdMusicMoodMatcherInput),
    /invalid_ad_music_mood_matcher_input/,
  );
});

test('generateMusicRecommendations rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => generateMusicRecommendations({ ...validInput, count: 100, dryRun: true } as AdMusicMoodMatcherInput),
    /invalid_ad_music_mood_matcher_input/,
  );
});
