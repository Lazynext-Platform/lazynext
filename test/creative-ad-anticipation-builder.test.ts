import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Anticipation Builder engine (AI-powered
 * anticipation and suspense element generation for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_ANTICIPATION_BUILDER_CREDIT_COST,
  validateCreativeAdAnticipationBuilderInput,
  generateAnticipation,
  VALID_PLATFORMS,
  VALID_INTENSITIES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdAnticipationBuilderInput,
} from '@/lib/creative/creative-ad-anticipation-builder';

// ── Credit cost ──

test('CREATIVE_AD_ANTICIPATION_BUILDER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_ANTICIPATION_BUILDER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_INTENSITIES contains the three intensities', () => {
  assert.ok(VALID_INTENSITIES.includes('low'));
  assert.ok(VALID_INTENSITIES.includes('medium'));
  assert.ok(VALID_INTENSITIES.includes('high'));
  assert.equal(VALID_INTENSITIES.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdAnticipationBuilderInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and self-care',
  platform: 'tiktok',
};

test('validateCreativeAdAnticipationBuilderInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdAnticipationBuilderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdAnticipationBuilderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdAnticipationBuilderInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdAnticipationBuilderInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdAnticipationBuilderInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdAnticipationBuilderInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdAnticipationBuilderInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdAnticipationBuilderInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdAnticipationBuilderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdAnticipationBuilderInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdAnticipationBuilderInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdAnticipationBuilderInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdAnticipationBuilderInput accepts dryRun boolean', () => {
  const { valid, errors } = validateCreativeAdAnticipationBuilderInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateAnticipation with dryRun: true so no real LLM
// calls are made — deterministic heuristic anticipation plans are returned.

test('dry-run returns an AnticipationBuilderResult with plan', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.plan);
  assert.ok(typeof result.plan.anticipationScore === 'number');
  assert.equal(result.dryRun, true);
});

test('dry-run returns anticipationScore in 0-100 range', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(result.plan.anticipationScore >= 0 && result.plan.anticipationScore <= 100);
});

test('dry-run returns hooks with correct structure', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.plan.hooks));
  assert.ok(result.plan.hooks.length > 0);
  for (const h of result.plan.hooks) {
    assert.ok(typeof h.text === 'string' && h.text.length > 0);
    assert.ok(typeof h.timing === 'string' && h.timing.length > 0);
    assert.ok(VALID_INTENSITIES.includes(h.intensity));
    assert.ok(typeof h.type === 'string' && h.type.length > 0);
  }
});

test('dry-run returns techniques with correct structure', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.plan.techniques));
  assert.ok(result.plan.techniques.length > 0);
  for (const tech of result.plan.techniques) {
    assert.ok(typeof tech.name === 'string' && tech.name.length > 0);
    assert.ok(typeof tech.description === 'string' && tech.description.length > 0);
    assert.ok(typeof tech.application === 'string' && tech.application.length > 0);
    assert.ok(typeof tech.effectiveness === 'number' && tech.effectiveness >= 0 && tech.effectiveness <= 100);
  }
});

test('dry-run returns revealStrategies with correct structure', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.plan.revealStrategies));
  assert.ok(result.plan.revealStrategies.length > 0);
  for (const r of result.plan.revealStrategies) {
    assert.ok(typeof r.strategy === 'string' && r.strategy.length > 0);
    assert.ok(typeof r.timing === 'string' && r.timing.length > 0);
    assert.ok(typeof r.buildup === 'string' && r.buildup.length > 0);
    assert.ok(typeof r.payoff === 'string' && r.payoff.length > 0);
  }
});

test('dry-run returns tensionCurve with phases', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(result.plan.tensionCurve);
  assert.ok(Array.isArray(result.plan.tensionCurve.phases));
  assert.ok(result.plan.tensionCurve.phases.length > 0);
  for (const p of result.plan.tensionCurve.phases) {
    assert.ok(typeof p.phase === 'string' && p.phase.length > 0);
    assert.ok(typeof p.intensity === 'number' && p.intensity >= 0 && p.intensity <= 100);
    assert.ok(typeof p.duration === 'string' && p.duration.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.plan.recommendations));
  assert.ok(result.plan.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAnticipation({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.plan.hooks.length > 0, `${platform} should produce hooks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateAnticipation({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
    dryRun: true,
  });
  assert.ok(result.plan.hooks.length > 0);
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generateAnticipation({ ...validInput, dryRun: true });
  const b = await generateAnticipation({ ...validInput, dryRun: true });
  assert.equal(a.plan.anticipationScore, b.plan.anticipationScore);
  assert.equal(a.plan.hooks.length, b.plan.hooks.length);
  assert.equal(a.plan.techniques.length, b.plan.techniques.length);
});

test('dry-run anticipationScore varies with content length', async () => {
  const short = await generateAnticipation({
    ...validInput,
    content: 'short',
    dryRun: true,
  });
  const long = await generateAnticipation({
    ...validInput,
    content: 'x'.repeat(500),
    dryRun: true,
  });
  // Longer content should produce a different (higher) score.
  assert.ok(long.plan.anticipationScore >= short.plan.anticipationScore);
});

test('generateAnticipation rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAnticipation({ ...validInput, content: '' } as CreativeAdAnticipationBuilderInput),
    /invalid_creative_ad_anticipation_builder_input/,
  );
});

test('generateAnticipation rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateAnticipation({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdAnticipationBuilderInput),
    /invalid_creative_ad_anticipation_builder_input/,
  );
});

test('generateAnticipation rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateAnticipation({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdAnticipationBuilderInput),
    /invalid_creative_ad_anticipation_builder_input/,
  );
});

test('generateAnticipation rejects over-length content', async () => {
  await assert.rejects(
    () =>
      generateAnticipation({
        ...validInput,
        content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
        dryRun: true,
      } as CreativeAdAnticipationBuilderInput),
    /invalid_creative_ad_anticipation_builder_input/,
  );
});

test('generateAnticipation rejects over-length productOrBrand', async () => {
  await assert.rejects(
    () =>
      generateAnticipation({
        ...validInput,
        productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
        dryRun: true,
      } as CreativeAdAnticipationBuilderInput),
    /invalid_creative_ad_anticipation_builder_input/,
  );
});

test('generateAnticipation rejects over-length targetAudience', async () => {
  await assert.rejects(
    () =>
      generateAnticipation({
        ...validInput,
        targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
        dryRun: true,
      } as CreativeAdAnticipationBuilderInput),
    /invalid_creative_ad_anticipation_builder_input/,
  );
});

test('dry-run tension curve phases are ordered setup→resolution', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  const phases = result.plan.tensionCurve.phases.map((p) => p.phase);
  assert.equal(phases[0], 'setup');
  assert.equal(phases[phases.length - 1], 'resolution');
});

test('dry-run peak phase has the highest intensity', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  const peak = result.plan.tensionCurve.phases.find((p) => p.phase === 'peak');
  assert.ok(peak);
  const max = Math.max(...result.plan.tensionCurve.phases.map((p) => p.intensity));
  assert.equal(peak!.intensity, max);
});

test('dry-run technique effectiveness is in 0-100 range', async () => {
  const result = await generateAnticipation({ ...validInput, dryRun: true });
  for (const tech of result.plan.techniques) {
    assert.ok(tech.effectiveness >= 0 && tech.effectiveness <= 100);
  }
});
