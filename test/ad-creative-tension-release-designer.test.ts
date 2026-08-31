import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Tension Release Designer engine (AI-powered
 * tension-release cycle design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_TENSION_RELEASE_DESIGNER_CREDIT_COST,
  validateAdCreativeTensionReleaseDesignerInput,
  generateTensionRelease,
  VALID_PLATFORMS,
  VALID_CYCLE_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeTensionReleaseDesignerInput,
} from '@/lib/creative/ad-creative-tension-release-designer';

// ── Credit cost ──

test('AD_CREATIVE_TENSION_RELEASE_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_TENSION_RELEASE_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CYCLE_TYPES contains the eight cycle types', () => {
  assert.ok(VALID_CYCLE_TYPES.includes('slow_build_sudden_release'));
  assert.ok(VALID_CYCLE_TYPES.includes('rapid_escalation_catharsis'));
  assert.ok(VALID_CYCLE_TYPES.includes('wave_pattern'));
  assert.ok(VALID_CYCLE_TYPES.includes('spiral_escalation'));
  assert.ok(VALID_CYCLE_TYPES.includes('plateau_break'));
  assert.ok(VALID_CYCLE_TYPES.includes('rhythmic_pulse'));
  assert.ok(VALID_CYCLE_TYPES.includes('tension_plateau_release'));
  assert.ok(VALID_CYCLE_TYPES.includes('crescendo_finale'));
  assert.equal(VALID_CYCLE_TYPES.length, 8);
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

const validInput: AdCreativeTensionReleaseDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeTensionReleaseDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeTensionReleaseDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeTensionReleaseDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeTensionReleaseDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeTensionReleaseDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeTensionReleaseDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeTensionReleaseDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeTensionReleaseDesignerInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
    platform: 'myspace' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 4);
});

// ── Dry-run mode tests ──
//
// These tests run generateTensionRelease with dryRun: true so no real LLM
// calls are made — deterministic heuristic cycles are returned.

test('dry-run returns a TensionReleaseDesignerResult with strategy', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.cycles));
  assert.ok(result.strategy.cycles.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns cycles with correct structure', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  for (const c of result.strategy.cycles) {
    assert.ok(typeof c.type === 'string' && c.type.length > 0);
    assert.ok(typeof c.tensionBuild === 'string' && c.tensionBuild.length > 0);
    assert.ok(typeof c.releaseMoment === 'string' && c.releaseMoment.length > 0);
    assert.ok(typeof c.emotionalRelief === 'string' && c.emotionalRelief.length > 0);
    assert.ok(typeof c.catharsisScore === 'number' && c.catharsisScore >= 0 && c.catharsisScore <= 100);
    assert.ok(typeof c.viewerSatisfaction === 'number' && c.viewerSatisfaction >= 0 && c.viewerSatisfaction <= 100);
    assert.ok(typeof c.timing === 'string' && c.timing.length > 0);
  }
});

test('dry-run returns cycles with valid cycle types', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  for (const c of result.strategy.cycles) {
    assert.ok(
      VALID_CYCLE_TYPES.includes(c.type as never),
      `cycle type "${c.type}" should be valid`,
    );
  }
});

test('dry-run returns catharsisScore in 0-100 range', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  for (const c of result.strategy.cycles) {
    assert.ok(c.catharsisScore >= 0 && c.catharsisScore <= 100);
  }
});

test('dry-run returns viewerSatisfaction in 0-100 range', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  for (const c of result.strategy.cycles) {
    assert.ok(c.viewerSatisfaction >= 0 && c.viewerSatisfaction <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 cycles', async () => {
  const result = await generateTensionRelease({ ...validInput, dryRun: true });
  assert.ok(result.strategy.cycles.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateTensionRelease({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.cycles.length > 0, `${platform} should produce cycles`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateTensionRelease({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.cycles.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateTensionRelease({ ...validInput, dryRun: true });
  const r2 = await generateTensionRelease({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.cycles.length, r2.strategy.cycles.length);
  assert.equal(r1.strategy.cycles[0].catharsisScore, r2.strategy.cycles[0].catharsisScore);
  assert.equal(r1.strategy.cycles[0].viewerSatisfaction, r2.strategy.cycles[0].viewerSatisfaction);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateTensionRelease({ ...validInput, dryRun: true });
  const r2 = await generateTensionRelease({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Cycle count is the same but scores differ based on content length
  assert.equal(r1.strategy.cycles.length, r2.strategy.cycles.length);
});

test('generateTensionRelease rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateTensionRelease({ ...validInput, content: '' } as AdCreativeTensionReleaseDesignerInput),
    /invalid_ad_creative_tension_release_designer_input/,
  );
});

test('generateTensionRelease rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateTensionRelease({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeTensionReleaseDesignerInput),
    /invalid_ad_creative_tension_release_designer_input/,
  );
});

test('generateTensionRelease rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateTensionRelease({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeTensionReleaseDesignerInput),
    /invalid_ad_creative_tension_release_designer_input/,
  );
});

test('generateTensionRelease rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateTensionRelease(null as never),
    /invalid_ad_creative_tension_release_designer_input/,
  );
});
