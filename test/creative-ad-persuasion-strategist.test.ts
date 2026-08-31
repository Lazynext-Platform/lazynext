import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Persuasion Strategist engine (AI-powered
 * persuasion strategy development using Cialdini's principles).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode
 * (no real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST,
  validateCreativeAdPersuasionStrategistInput,
  generatePersuasionStrategy,
  VALID_PLATFORMS,
  VALID_PRINCIPLES,
  VALID_STRENGTHS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_CONTENT_LENGTH,
  type CreativeAdPersuasionStrategistInput,
} from '@/lib/creative/creative-ad-persuasion-strategist';

// ── Credit cost ──

test('CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_PERSUASION_STRATEGIST_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_PRINCIPLES contains the seven Cialdini principles', () => {
  assert.ok(VALID_PRINCIPLES.includes('reciprocity'));
  assert.ok(VALID_PRINCIPLES.includes('scarcity'));
  assert.ok(VALID_PRINCIPLES.includes('authority'));
  assert.ok(VALID_PRINCIPLES.includes('consistency'));
  assert.ok(VALID_PRINCIPLES.includes('liking'));
  assert.ok(VALID_PRINCIPLES.includes('social_proof'));
  assert.ok(VALID_PRINCIPLES.includes('unity'));
  assert.equal(VALID_PRINCIPLES.length, 7);
});

test('VALID_STRENGTHS contains the three strength levels', () => {
  assert.ok(VALID_STRENGTHS.includes('low'));
  assert.ok(VALID_STRENGTHS.includes('medium'));
  assert.ok(VALID_STRENGTHS.includes('high'));
  assert.equal(VALID_STRENGTHS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdPersuasionStrategistInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-40 interested in clean beauty',
  content: 'Promote a 7-day glow challenge with a limited-time discount and customer testimonials.',
  platform: 'tiktok',
};

test('validateCreativeAdPersuasionStrategistInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdPersuasionStrategistInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdPersuasionStrategistInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdPersuasionStrategistInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdPersuasionStrategistInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdPersuasionStrategistInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdPersuasionStrategistInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdPersuasionStrategistInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdPersuasionStrategistInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdPersuasionStrategistInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdPersuasionStrategistInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals 30-45',
    content: 'Drive signups for a 30-day challenge',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPersuasionStrategistInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPersuasionStrategistInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals 30-45',
    content: 'Drive signups for a 30-day challenge',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPersuasionStrategistInput accepts dryRun boolean', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPersuasionStrategistInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdPersuasionStrategistInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdPersuasionStrategistInput({
    productOrBrand: '',
    targetAudience: '',
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.length >= 3);
});

// ── Dry-run mode tests ──
//
// These tests run generatePersuasionStrategy with dryRun: true so no real
// LLM calls are made — deterministic heuristic strategy is returned.

test('dry-run returns a PersuasionStrategistResult with strategy', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.principles));
  assert.ok(result.strategy.principles.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns principles with correct structure', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  for (const p of result.strategy.principles) {
    assert.ok(typeof p.principle === 'string' && p.principle.length > 0);
    assert.ok(typeof p.relevance === 'number' && p.relevance >= 0 && p.relevance <= 100);
    assert.ok(typeof p.application === 'string' && p.application.length > 0);
    assert.ok(typeof p.expectedEffect === 'string' && p.expectedEffect.length > 0);
  }
});

test('dry-run returns seven principles (Cialdini set)', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.equal(result.strategy.principles.length, 7);
});

test('dry-run returns techniques with correct structure', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.techniques));
  assert.ok(result.strategy.techniques.length > 0);
  for (const tech of result.strategy.techniques) {
    assert.ok(typeof tech.technique === 'string' && tech.technique.length > 0);
    assert.ok(typeof tech.principle === 'string' && tech.principle.length > 0);
    assert.ok(typeof tech.implementation === 'string' && tech.implementation.length > 0);
    assert.ok(VALID_STRENGTHS.includes(tech.strength));
  }
});

test('dry-run returns triggers with correct structure', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.triggers));
  assert.ok(result.strategy.triggers.length > 0);
  for (const tr of result.strategy.triggers) {
    assert.ok(typeof tr.trigger === 'string' && tr.trigger.length > 0);
    assert.ok(typeof tr.description === 'string' && tr.description.length > 0);
    assert.ok(typeof tr.timing === 'string' && tr.timing.length > 0);
    assert.ok(typeof tr.intensity === 'number' && tr.intensity >= 0 && tr.intensity <= 100);
  }
});

test('dry-run returns ethicalConsiderations', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.ethicalConsiderations));
  assert.ok(result.strategy.ethicalConsiderations.length > 0);
  for (const e of result.strategy.ethicalConsiderations) {
    assert.ok(typeof e === 'string' && e.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePersuasionStrategy({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.principles.length > 0, `${platform} should produce principles`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePersuasionStrategy({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals 30-45',
    content: 'Drive signups for a 30-day challenge',
    dryRun: true,
  });
  assert.ok(result.strategy.principles.length > 0);
});

test('dry-run relevance values are in 0-100 range', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  for (const p of result.strategy.principles) {
    assert.ok(p.relevance >= 0 && p.relevance <= 100);
  }
});

test('dry-run intensity values are in 0-100 range', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  for (const tr of result.strategy.triggers) {
    assert.ok(tr.intensity >= 0 && tr.intensity <= 100);
  }
});

test('dry-run technique strengths are valid', async () => {
  const result = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  for (const tech of result.strategy.techniques) {
    assert.ok(VALID_STRENGTHS.includes(tech.strength));
  }
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  const b = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run output varies with different content', async () => {
  const a = await generatePersuasionStrategy({ ...validInput, dryRun: true });
  const b = await generatePersuasionStrategy({
    ...validInput,
    content: 'A completely different campaign goal about sustainability and eco-friendly packaging.',
    dryRun: true,
  });
  // Relevance values derive from content length, so they should differ.
  assert.notDeepEqual(a.strategy.principles, b.strategy.principles);
});

test('generatePersuasionStrategy rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePersuasionStrategy({ ...validInput, content: '' } as CreativeAdPersuasionStrategistInput),
    /invalid_creative_ad_persuasion_strategist_input/,
  );
});

test('generatePersuasionStrategy rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generatePersuasionStrategy({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdPersuasionStrategistInput),
    /invalid_creative_ad_persuasion_strategist_input/,
  );
});

test('generatePersuasionStrategy rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePersuasionStrategy({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdPersuasionStrategistInput),
    /invalid_creative_ad_persuasion_strategist_input/,
  );
});

test('generatePersuasionStrategy rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generatePersuasionStrategy({ ...validInput, platform: 'snapchat', dryRun: true } as CreativeAdPersuasionStrategistInput),
    /invalid_creative_ad_persuasion_strategist_input/,
  );
});

test('generatePersuasionStrategy error message includes error codes', async () => {
  try {
    await generatePersuasionStrategy({ ...validInput, content: '' } as CreativeAdPersuasionStrategistInput);
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof Error);
    assert.ok((e as Error).message.includes('content_required'));
  }
});
