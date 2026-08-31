import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Tension Release Strategist engine (AI-powered
 * tension buildup and release cycle strategy for emotional catharsis).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_TENSION_RELEASE_STRATEGIST_CREDIT_COST,
  validateCreativeAdTensionReleaseStrategistInput,
  generateTensionStrategy,
  VALID_PLATFORMS,
  VALID_RELIEF_LEVELS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdTensionReleaseStrategistInput,
} from '@/lib/creative/creative-ad-tension-release-strategist';

// ── Credit cost ──

test('CREATIVE_AD_TENSION_RELEASE_STRATEGIST_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_TENSION_RELEASE_STRATEGIST_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_RELIEF_LEVELS contains the three relief levels', () => {
  assert.ok(VALID_RELIEF_LEVELS.includes('partial'));
  assert.ok(VALID_RELIEF_LEVELS.includes('full'));
  assert.ok(VALID_RELIEF_LEVELS.includes('cathartic'));
  assert.equal(VALID_RELIEF_LEVELS.length, 3);
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

const validInput: CreativeAdTensionReleaseStrategistInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 concerned about skin aging',
  platform: 'tiktok',
};

test('validateCreativeAdTensionReleaseStrategistInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdTensionReleaseStrategistInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdTensionReleaseStrategistInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdTensionReleaseStrategistInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdTensionReleaseStrategistInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdTensionReleaseStrategistInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdTensionReleaseStrategistInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdTensionReleaseStrategistInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

// ── Dry-run mode tests ──
//
// These tests run generateTensionStrategy with dryRun: true so no real LLM
// calls are made — deterministic heuristic tension strategy is returned.

test('dry-run returns a TensionReleaseResult with strategy', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(typeof result.strategy.rhythmScore === 'number');
  assert.ok(Array.isArray(result.strategy.cycles));
  assert.ok(result.strategy.cycles.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns rhythmScore in 0-100 range', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  assert.ok(result.strategy.rhythmScore >= 0 && result.strategy.rhythmScore <= 100);
});

test('dry-run returns cycles with correct structure', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  for (const c of result.strategy.cycles) {
    assert.ok(typeof c.phase === 'string' && c.phase.length > 0);
    assert.ok(typeof c.buildup === 'string' && c.buildup.length > 0);
    assert.ok(typeof c.peak === 'string' && c.peak.length > 0);
    assert.ok(typeof c.release === 'string' && c.release.length > 0);
    assert.ok(typeof c.intensity === 'number' && c.intensity >= 0 && c.intensity <= 100);
    assert.ok(typeof c.duration === 'string' && c.duration.length > 0);
  }
});

test('dry-run returns releasePoints with correct structure', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.releasePoints));
  assert.ok(result.strategy.releasePoints.length > 0);
  for (const rp of result.strategy.releasePoints) {
    assert.ok(typeof rp.timing === 'string' && rp.timing.length > 0);
    assert.ok(typeof rp.technique === 'string' && rp.technique.length > 0);
    assert.ok(typeof rp.description === 'string' && rp.description.length > 0);
    assert.ok(VALID_RELIEF_LEVELS.includes(rp.reliefLevel));
  }
});

test('dry-run returns catharsisMoments with correct structure', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.catharsisMoments));
  assert.ok(result.strategy.catharsisMoments.length > 0);
  for (const cm of result.strategy.catharsisMoments) {
    assert.ok(typeof cm.timing === 'string' && cm.timing.length > 0);
    assert.ok(typeof cm.trigger === 'string' && cm.trigger.length > 0);
    assert.ok(typeof cm.emotionalRelease === 'string' && cm.emotionalRelease.length > 0);
    assert.ok(typeof cm.impact === 'number' && cm.impact >= 0 && cm.impact <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateTensionStrategy({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.cycles.length > 0, `${platform} should produce cycles`);
  }
});

test('dry-run works without platform', async () => {
  const result = await generateTensionStrategy({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.strategy.cycles.length > 0);
  assert.ok(result.strategy.releasePoints.length > 0);
});

test('dry-run is deterministic for same input', async () => {
  const r1 = await generateTensionStrategy({ ...validInput, dryRun: true });
  const r2 = await generateTensionStrategy({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.rhythmScore, r2.strategy.rhythmScore);
  assert.equal(r1.strategy.cycles.length, r2.strategy.cycles.length);
  assert.equal(r1.strategy.releasePoints.length, r2.strategy.releasePoints.length);
});

test('dry-run cycles include setup, escalation, climax, and resolution phases', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  const phases = result.strategy.cycles.map((c) => c.phase);
  assert.ok(phases.includes('setup'));
  assert.ok(phases.includes('escalation'));
  assert.ok(phases.includes('climax'));
  assert.ok(phases.includes('resolution'));
});

test('dry-run releasePoints include partial, full, and cathartic relief levels', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  const levels = result.strategy.releasePoints.map((rp) => rp.reliefLevel);
  assert.ok(levels.includes('partial'));
  assert.ok(levels.includes('full'));
  assert.ok(levels.includes('cathartic'));
});

test('dry-run catharsisMoments have impact in 0-100 range', async () => {
  const result = await generateTensionStrategy({ ...validInput, dryRun: true });
  for (const cm of result.strategy.catharsisMoments) {
    assert.ok(cm.impact >= 0 && cm.impact <= 100);
  }
});

test('generateTensionStrategy rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateTensionStrategy({ ...validInput, content: '' } as CreativeAdTensionReleaseStrategistInput),
    /invalid_creative_ad_tension_release_strategist_input/,
  );
});

test('generateTensionStrategy rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateTensionStrategy({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdTensionReleaseStrategistInput),
    /invalid_creative_ad_tension_release_strategist_input/,
  );
});

test('generateTensionStrategy rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateTensionStrategy({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdTensionReleaseStrategistInput),
    /invalid_creative_ad_tension_release_strategist_input/,
  );
});

test('generateTensionStrategy rejects over-length content', async () => {
  await assert.rejects(
    () =>
      generateTensionStrategy({
        ...validInput,
        content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
        dryRun: true,
      } as CreativeAdTensionReleaseStrategistInput),
    /invalid_creative_ad_tension_release_strategist_input/,
  );
});

test('generateTensionStrategy rejects over-length targetAudience', async () => {
  await assert.rejects(
    () =>
      generateTensionStrategy({
        ...validInput,
        targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
        dryRun: true,
      } as CreativeAdTensionReleaseStrategistInput),
    /invalid_creative_ad_tension_release_strategist_input/,
  );
});
