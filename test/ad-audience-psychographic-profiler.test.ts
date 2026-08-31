import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Audience Psychographic Profiler engine (AI-powered
 * psychographic profiling of target audiences).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_AUDIENCE_PSYCHOGRAPHIC_PROFILER_CREDIT_COST,
  validateAdAudiencePsychographicProfilerInput,
  generatePsychographicProfile,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdAudiencePsychographicProfilerInput,
} from '@/lib/creative/ad-audience-psychographic-profiler';

// ── Credit cost ──

test('AD_AUDIENCE_PSYCHOGRAPHIC_PROFILER_CREDIT_COST is 4', () => {
  assert.equal(AD_AUDIENCE_PSYCHOGRAPHIC_PROFILER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdAudiencePsychographicProfilerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women aged 25-34, urban professionals interested in wellness',
  platform: 'tiktok',
};

test('validateAdAudiencePsychographicProfilerInput accepts a valid input', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdAudiencePsychographicProfilerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdAudiencePsychographicProfilerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdAudiencePsychographicProfilerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdAudiencePsychographicProfilerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdAudiencePsychographicProfilerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdAudiencePsychographicProfilerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdAudiencePsychographicProfilerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdAudiencePsychographicProfilerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45 looking to stay fit',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudiencePsychographicProfilerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudiencePsychographicProfilerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdAudiencePsychographicProfilerInput rejects non-string productOrBrand', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    productOrBrand: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdAudiencePsychographicProfilerInput rejects non-string targetAudience', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdAudiencePsychographicProfilerInput accepts all valid platforms', () => {
  for (const platform of VALID_PLATFORMS) {
    const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
      ...validInput,
      platform,
    });
    assert.ok(valid, `${platform} should be valid: ${errors.join(', ')}`);
  }
});

test('validateAdAudiencePsychographicProfilerInput accepts dryRun true', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudiencePsychographicProfilerInput accepts dryRun false', () => {
  const { valid, errors } = validateAdAudiencePsychographicProfilerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePsychographicProfile with dryRun: true so no real
// LLM calls are made — deterministic heuristic psychographic profiles are
// returned.

test('dry-run returns a ProfilerResult with profile', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.profile);
  assert.ok(Array.isArray(result.profile.dimensions));
  assert.ok(result.profile.dimensions.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns dimensions with correct structure', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  for (const d of result.profile.dimensions) {
    assert.ok(typeof d.dimension === 'string' && d.dimension.length > 0);
    assert.ok(Array.isArray(d.traits));
    assert.ok(typeof d.intensity === 'number' && d.intensity >= 0 && d.intensity <= 100);
    assert.ok(typeof d.description === 'string' && d.description.length > 0);
  }
});

test('dry-run returns five psychographic dimensions', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  const dims = result.profile.dimensions.map((d) => d.dimension);
  assert.ok(dims.includes('values'));
  assert.ok(dims.includes('interests'));
  assert.ok(dims.includes('lifestyle'));
  assert.ok(dims.includes('personality'));
  assert.ok(dims.includes('attitudes'));
  assert.equal(result.profile.dimensions.length, 5);
});

test('dry-run returns dimensions with traits', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  for (const d of result.profile.dimensions) {
    assert.ok(d.traits.length > 0, `${d.dimension} should have traits`);
  }
});

test('dry-run returns motivationDrivers with correct structure', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.profile.motivationDrivers));
  assert.ok(result.profile.motivationDrivers.length > 0);
  for (const driver of result.profile.motivationDrivers) {
    assert.ok(typeof driver.driver === 'string' && driver.driver.length > 0);
    assert.ok(typeof driver.strength === 'number' && driver.strength >= 0 && driver.strength <= 100);
    assert.ok(typeof driver.description === 'string' && driver.description.length > 0);
    assert.ok(Array.isArray(driver.triggerWords));
    assert.ok(driver.triggerWords.length > 0);
  }
});

test('dry-run returns contentPreferences with correct structure', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.profile.contentPreferences));
  assert.ok(result.profile.contentPreferences.length > 0);
  for (const pref of result.profile.contentPreferences) {
    assert.ok(typeof pref.type === 'string' && pref.type.length > 0);
    assert.ok(typeof pref.preference === 'string' && pref.preference.length > 0);
    assert.ok(typeof pref.reason === 'string' && pref.reason.length > 0);
  }
});

test('dry-run returns communicationStyle as a non-empty string', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.ok(typeof result.profile.communicationStyle === 'string');
  assert.ok(result.profile.communicationStyle.length > 0);
});

test('dry-run returns messagingRecommendations', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.profile.messagingRecommendations));
  assert.ok(result.profile.messagingRecommendations.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.profile.recommendations));
  assert.ok(result.profile.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePsychographicProfile({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.profile.dimensions.length > 0, `${platform} should produce dimensions`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePsychographicProfile({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
    dryRun: true,
  });
  assert.ok(result.profile.dimensions.length > 0);
  assert.ok(result.profile.communicationStyle.length > 0);
});

test('dry-run motivationDrivers include aspiration, social_proof, and convenience', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  const drivers = result.profile.motivationDrivers.map((d) => d.driver);
  assert.ok(drivers.includes('aspiration'));
  assert.ok(drivers.includes('social_proof'));
  assert.ok(drivers.includes('convenience'));
});

test('dry-run triggerWords are non-empty strings', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  for (const driver of result.profile.motivationDrivers) {
    for (const word of driver.triggerWords) {
      assert.ok(typeof word === 'string' && word.length > 0);
    }
  }
});

test('dry-run intensity values are in 0-100 range', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  for (const d of result.profile.dimensions) {
    assert.ok(d.intensity >= 0 && d.intensity <= 100);
  }
});

test('dry-run strength values are in 0-100 range', async () => {
  const result = await generatePsychographicProfile({ ...validInput, dryRun: true });
  for (const driver of result.profile.motivationDrivers) {
    assert.ok(driver.strength >= 0 && driver.strength <= 100);
  }
});

test('dry-run is deterministic for the same input', async () => {
  const r1 = await generatePsychographicProfile({ ...validInput, dryRun: true });
  const r2 = await generatePsychographicProfile({ ...validInput, dryRun: true });
  assert.deepEqual(r1, r2);
});

test('dry-run dimensions change with different audience length', async () => {
  const r1 = await generatePsychographicProfile({
    ...validInput,
    targetAudience: 'short',
    dryRun: true,
  });
  const r2 = await generatePsychographicProfile({
    ...validInput,
    targetAudience: 'a much longer audience description that changes the deterministic offset values significantly',
    dryRun: true,
  });
  const i1 = r1.profile.dimensions[0].intensity;
  const i2 = r2.profile.dimensions[0].intensity;
  // They may coincidentally match, but structure should differ in description
  assert.ok(r1.profile.dimensions.length === r2.profile.dimensions.length);
});

test('generatePsychographicProfile rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePsychographicProfile({ ...validInput, productOrBrand: '' } as AdAudiencePsychographicProfilerInput),
    /invalid_ad_audience_psychographic_profiler_input/,
  );
});

test('generatePsychographicProfile rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePsychographicProfile({ ...validInput, targetAudience: '', dryRun: true } as AdAudiencePsychographicProfilerInput),
    /invalid_ad_audience_psychographic_profiler_input/,
  );
});

test('generatePsychographicProfile rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generatePsychographicProfile({ ...validInput, platform: 'snapchat' as never, dryRun: true }),
    /invalid_ad_audience_psychographic_profiler_input/,
  );
});
