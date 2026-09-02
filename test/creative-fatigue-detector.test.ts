import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Fatigue Detector engine (AI-powered creative fatigue
 * detection from performance metrics).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_FATIGUE_DETECTOR_CREDIT_COST,
  validateCreativeFatigueDetectorInput,
  detectFatigue,
  VALID_PLATFORMS,
  VALID_FATIGUE_LEVELS,
  VALID_RECOMMENDATIONS,
  VALID_URGENCIES,
  MAX_DESCRIPTION_LENGTH,
  type CreativeFatigueDetectorInput,
} from '@/lib/creative/creative-fatigue-detector';

// ── Credit cost ──

test('CREATIVE_FATIGUE_DETECTOR_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_FATIGUE_DETECTOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_FATIGUE_LEVELS contains the five levels', () => {
  assert.ok(VALID_FATIGUE_LEVELS.includes('none'));
  assert.ok(VALID_FATIGUE_LEVELS.includes('mild'));
  assert.ok(VALID_FATIGUE_LEVELS.includes('moderate'));
  assert.ok(VALID_FATIGUE_LEVELS.includes('severe'));
  assert.ok(VALID_FATIGUE_LEVELS.includes('critical'));
  assert.equal(VALID_FATIGUE_LEVELS.length, 5);
});

test('VALID_RECOMMENDATIONS contains refresh, monitor, keep', () => {
  assert.deepEqual(VALID_RECOMMENDATIONS, ['refresh', 'monitor', 'keep']);
});

test('VALID_URGENCIES contains the four urgencies', () => {
  assert.ok(VALID_URGENCIES.includes('immediate'));
  assert.ok(VALID_URGENCIES.includes('within-week'));
  assert.ok(VALID_URGENCIES.includes('within-month'));
  assert.ok(VALID_URGENCIES.includes('no-rush'));
});

test('MAX_DESCRIPTION_LENGTH is 5000', () => {
  assert.equal(MAX_DESCRIPTION_LENGTH, 5000);
});

// ── Input validation tests ──

const validInput: CreativeFatigueDetectorInput = {
  creativeDescription: 'UGC-style TikTok ad showing a skincare routine with a curiosity hook',
  platform: 'tiktok',
  daysRunning: 12,
  currentCTR: 1.2,
  previousCTR: 2.5,
  impressions: 150000,
};

test('validateCreativeFatigueDetectorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeFatigueDetectorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeFatigueDetectorInput rejects missing creativeDescription', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    creativeDescription: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_description_required'));
});

test('validateCreativeFatigueDetectorInput rejects creativeDescription over MAX_DESCRIPTION_LENGTH', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    creativeDescription: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_description_too_long'));
});

test('validateCreativeFatigueDetectorInput rejects missing platform', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateCreativeFatigueDetectorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid daysRunning (zero)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    daysRunning: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid daysRunning (negative)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    daysRunning: -5,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid daysRunning (non-number)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    daysRunning: 'twelve' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('days_running_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects currentCTR out of range (negative)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    currentCTR: -1,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('current_ctr_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects currentCTR out of range (over 100)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    currentCTR: 101,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('current_ctr_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid currentCTR (non-number)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    currentCTR: 'high' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('current_ctr_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid previousCTR (negative)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    previousCTR: -0.5,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('previous_ctr_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid previousCTR (over 100)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    previousCTR: 150,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('previous_ctr_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid impressions (zero)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    impressions: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('impressions_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid impressions (negative)', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    impressions: -100,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('impressions_invalid'));
});

test('validateCreativeFatigueDetectorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeFatigueDetectorInput accepts input without previousCTR', () => {
  const { valid, errors } = validateCreativeFatigueDetectorInput({
    creativeDescription: 'A Facebook carousel ad for a shoe brand',
    platform: 'facebook',
    daysRunning: 20,
    currentCTR: 0.8,
    impressions: 50000,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run detectFatigue with dryRun: true so no real LLM calls are
// made — deterministic heuristic analysis is returned instead.

test('dry-run returns a CreativeFatigueDetectorResult', async () => {
  const result = await detectFatigue({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
  assert.ok(typeof result.fatigueScore === 'number');
  assert.ok(result.fatigueScore >= 0 && result.fatigueScore <= 100);
  assert.ok(VALID_FATIGUE_LEVELS.includes(result.fatigueLevel));
  assert.ok(VALID_RECOMMENDATIONS.includes(result.recommendation));
  assert.ok(VALID_URGENCIES.includes(result.estimatedRefreshUrgency));
});

test('dry-run returns factors with correct structure', async () => {
  const result = await detectFatigue({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.factors));
  assert.ok(result.factors.length > 0);
  for (const f of result.factors) {
    assert.ok(typeof f.name === 'string' && f.name.length > 0);
    assert.ok(typeof f.impact === 'number');
    assert.ok(f.impact >= 0 && f.impact <= 100);
    assert.ok(typeof f.detail === 'string' && f.detail.length > 0);
  }
});

test('dry-run returns suggestedActions as a string array', async () => {
  const result = await detectFatigue({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.suggestedActions));
  assert.ok(result.suggestedActions.length > 0);
  for (const a of result.suggestedActions) {
    assert.ok(typeof a === 'string' && a.length > 0);
  }
});

test('dry-run high fatigue (long running + CTR decline) recommends refresh', async () => {
  const result = await detectFatigue({
    ...validInput,
    daysRunning: 30,
    currentCTR: 0.5,
    previousCTR: 3.0,
    impressions: 500000,
    dryRun: true,
  });
  assert.ok(result.fatigueScore >= 60, `score should be high, got ${result.fatigueScore}`);
  assert.ok(
    result.recommendation === 'refresh',
    `should recommend refresh, got ${result.recommendation}`,
  );
});

test('dry-run low fatigue (fresh creative) recommends keep', async () => {
  const result = await detectFatigue({
    creativeDescription: 'A brand new TikTok ad launched yesterday',
    platform: 'tiktok',
    daysRunning: 1,
    currentCTR: 2.5,
    impressions: 5000,
    dryRun: true,
  });
  assert.ok(result.fatigueScore < 40, `score should be low, got ${result.fatigueScore}`);
  assert.ok(
    result.recommendation === 'keep' || result.recommendation === 'monitor',
    `should recommend keep or monitor, got ${result.recommendation}`,
  );
});

test('detectFatigue rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => detectFatigue({ ...validInput, creativeDescription: '' } as CreativeFatigueDetectorInput),
    /invalid_creative_fatigue_detector_input/,
  );
});

test('detectFatigue rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => detectFatigue({ ...validInput, platform: 'snapchat' as never, dryRun: true } as CreativeFatigueDetectorInput),
    /invalid_creative_fatigue_detector_input/,
  );
});

test('detectFatigue rejects invalid daysRunning in dry-run mode', async () => {
  await assert.rejects(
    () => detectFatigue({ ...validInput, daysRunning: 0, dryRun: true } as CreativeFatigueDetectorInput),
    /invalid_creative_fatigue_detector_input/,
  );
});
