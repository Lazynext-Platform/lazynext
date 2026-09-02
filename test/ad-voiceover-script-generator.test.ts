import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Voiceover Script Generator engine (AI-powered voiceover
 * script generation with pacing, tone directions, and pronunciation guides).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST,
  validateAdVoiceoverScriptGeneratorInput,
  generateVoiceoverScript,
  VALID_PLATFORMS,
  VALID_TONES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_DURATION,
  MAX_DURATION,
  DEFAULT_DURATION,
  type AdVoiceoverScriptGeneratorInput,
} from '@/lib/creative/ad-voiceover-script-generator';

// ── Credit cost ──

test('AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST is 4', () => {
  assert.equal(AD_VOICEOVER_SCRIPT_GENERATOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_TONES contains the six tones', () => {
  assert.ok(VALID_TONES.includes('friendly'));
  assert.ok(VALID_TONES.includes('professional'));
  assert.ok(VALID_TONES.includes('energetic'));
  assert.ok(VALID_TONES.includes('calm'));
  assert.ok(VALID_TONES.includes('authoritative'));
  assert.ok(VALID_TONES.includes('conversational'));
  assert.equal(VALID_TONES.length, 6);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 1000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

test('duration bounds are 10-120 with default 30', () => {
  assert.equal(MIN_DURATION, 10);
  assert.equal(MAX_DURATION, 120);
  assert.equal(DEFAULT_DURATION, 30);
});

// ── Input validation tests ──

const validInput: AdVoiceoverScriptGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  tone: 'energetic',
  duration: 30,
  targetAudience: 'millennial skincare enthusiasts',
};

test('validateAdVoiceoverScriptGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdVoiceoverScriptGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects invalid tone', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    tone: 'sarcastic' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('tone_invalid'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects duration below 10', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    duration: 5,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_out_of_range'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects duration above 120', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    duration: 121,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_out_of_range'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects targetAudience over 1000 chars', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdVoiceoverScriptGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdVoiceoverScriptGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdVoiceoverScriptGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateVoiceoverScript with dryRun: true so no real LLM
// calls are made — deterministic heuristic scripts are returned.

test('dry-run returns an AdVoiceoverScriptGeneratorResult with a script', async () => {
  const result = await generateVoiceoverScript({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.script);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a script with correct structure', async () => {
  const result = await generateVoiceoverScript({ ...validInput, dryRun: true });
  const script = result.script;
  assert.ok(typeof script.title === 'string' && script.title.length > 0);
  assert.ok(typeof script.fullScript === 'string' && script.fullScript.length > 0);
  assert.ok(Array.isArray(script.segments) && script.segments.length > 0);
  assert.ok(typeof script.totalDuration === 'number' && script.totalDuration > 0);
  assert.ok(typeof script.wordsPerMinute === 'number' && script.wordsPerMinute > 0);
  assert.ok(typeof script.toneNotes === 'string' && script.toneNotes.length > 0);
  for (const seg of script.segments) {
    assert.ok(typeof seg.segmentNumber === 'number' && seg.segmentNumber >= 1);
    assert.ok(typeof seg.text === 'string' && seg.text.length > 0);
    assert.ok(typeof seg.timing === 'number' && seg.timing > 0);
    assert.ok(typeof seg.direction === 'string' && seg.direction.length > 0);
    assert.ok(Array.isArray(seg.emphasis));
    assert.ok(typeof seg.pauseAfter === 'number' && seg.pauseAfter >= 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateVoiceoverScript({
      productOrBrand: 'A fitness app',
      platform,
      dryRun: true,
    });
    assert.ok(result.script.segments.length > 0, `${platform} should produce script segments`);
  }
});

test('dry-run respects requested duration', async () => {
  const result = await generateVoiceoverScript({
    ...validInput,
    duration: 60,
    dryRun: true,
  });
  assert.ok(result.script.totalDuration >= 40, 'total duration should reflect the 60s request');
});

test('generateVoiceoverScript rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateVoiceoverScript({ ...validInput, productOrBrand: '' } as AdVoiceoverScriptGeneratorInput),
    /invalid_ad_voiceover_script_generator_input/,
  );
});

test('generateVoiceoverScript rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateVoiceoverScript({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdVoiceoverScriptGeneratorInput),
    /invalid_ad_voiceover_script_generator_input/,
  );
});

test('generateVoiceoverScript rejects invalid duration in dry-run mode', async () => {
  await assert.rejects(
    () => generateVoiceoverScript({ ...validInput, duration: 200, dryRun: true } as AdVoiceoverScriptGeneratorInput),
    /invalid_ad_voiceover_script_generator_input/,
  );
});
