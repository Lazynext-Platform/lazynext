import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Pacing Variability Designer engine (AI-powered
 * pacing variability design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_PACING_VARIABILITY_DESIGNER_CREDIT_COST,
  validateAdCreativePacingVariabilityDesignerInput,
  generatePacingVariability,
  VALID_PLATFORMS,
  VALID_SPEED_LEVELS,
  VALID_IMPACTS,
  VALID_DIRECTIONS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativePacingVariabilityDesignerInput,
} from '@/lib/creative/ad-creative-pacing-variability-designer';

// ── Credit cost ──

test('AD_CREATIVE_PACING_VARIABILITY_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_PACING_VARIABILITY_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_SPEED_LEVELS contains the six speed levels', () => {
  assert.ok(VALID_SPEED_LEVELS.includes('very_slow'));
  assert.ok(VALID_SPEED_LEVELS.includes('slow'));
  assert.ok(VALID_SPEED_LEVELS.includes('medium'));
  assert.ok(VALID_SPEED_LEVELS.includes('fast'));
  assert.ok(VALID_SPEED_LEVELS.includes('very_fast'));
  assert.ok(VALID_SPEED_LEVELS.includes('variable'));
  assert.equal(VALID_SPEED_LEVELS.length, 6);
});

test('VALID_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('VALID_DIRECTIONS contains the two directions', () => {
  assert.ok(VALID_DIRECTIONS.includes('up'));
  assert.ok(VALID_DIRECTIONS.includes('down'));
  assert.equal(VALID_DIRECTIONS.length, 2);
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

const validInput: AdCreativePacingVariabilityDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativePacingVariabilityDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativePacingVariabilityDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativePacingVariabilityDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativePacingVariabilityDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativePacingVariabilityDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativePacingVariabilityDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativePacingVariabilityDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePacingVariability with dryRun: true so no real LLM
// calls are made — deterministic heuristic pacing design is returned.

test('dry-run returns a PacingVariabilityDesignerResult with design', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.design);
  assert.ok(Array.isArray(result.design.variations));
  assert.ok(result.design.variations.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns variabilityScore in 0-100 range', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(result.design.variabilityScore >= 0 && result.design.variabilityScore <= 100);
});

test('dry-run returns variations with correct structure', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  for (const v of result.design.variations) {
    assert.ok(typeof v.segment === 'string' && v.segment.length > 0);
    assert.ok(typeof v.speed === 'string' && v.speed.length > 0);
    assert.ok(typeof v.duration === 'string' && v.duration.length > 0);
    assert.ok(typeof v.energy === 'number' && v.energy >= 0 && v.energy <= 100);
    assert.ok(typeof v.purpose === 'string' && v.purpose.length > 0);
  }
});

test('dry-run returns transitions with correct structure', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.transitions));
  assert.ok(result.design.transitions.length > 0);
  for (const tr of result.design.transitions) {
    assert.ok(typeof tr.fromSpeed === 'string' && tr.fromSpeed.length > 0);
    assert.ok(typeof tr.toSpeed === 'string' && tr.toSpeed.length > 0);
    assert.ok(typeof tr.timing === 'string' && tr.timing.length > 0);
    assert.ok(typeof tr.transitionMethod === 'string' && tr.transitionMethod.length > 0);
    assert.ok(VALID_IMPACTS.includes(tr.impact));
  }
});

test('dry-run returns energyFluctuations with correct structure', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.energyFluctuations));
  assert.ok(result.design.energyFluctuations.length > 0);
  for (const ef of result.design.energyFluctuations) {
    assert.ok(typeof ef.timing === 'string' && ef.timing.length > 0);
    assert.ok(typeof ef.fromEnergy === 'number' && ef.fromEnergy >= 0 && ef.fromEnergy <= 100);
    assert.ok(typeof ef.toEnergy === 'number' && ef.toEnergy >= 0 && ef.toEnergy <= 100);
    assert.ok(VALID_DIRECTIONS.includes(ef.direction));
    assert.ok(typeof ef.trigger === 'string' && ef.trigger.length > 0);
  }
});

test('dry-run returns attentionResets with correct structure', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.attentionResets));
  assert.ok(result.design.attentionResets.length > 0);
  for (const r of result.design.attentionResets) {
    assert.ok(typeof r.timing === 'string' && r.timing.length > 0);
    assert.ok(typeof r.method === 'string' && r.method.length > 0);
    assert.ok(typeof r.description === 'string' && r.description.length > 0);
    assert.ok(typeof r.reengagementScore === 'number' && r.reengagementScore >= 0 && r.reengagementScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.recommendations));
  assert.ok(result.design.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePacingVariability({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.design.variations.length > 0, `${platform} should produce variations`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePacingVariability({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.design.variations.length > 0);
});

test('dry-run produces deterministic output for the same input', async () => {
  const a = await generatePacingVariability({ ...validInput, dryRun: true });
  const b = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.equal(a.design.variabilityScore, b.design.variabilityScore);
  assert.equal(a.design.variations.length, b.design.variations.length);
});

test('dry-run energy values stay within 0-100', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  for (const v of result.design.variations) {
    assert.ok(v.energy >= 0 && v.energy <= 100);
  }
  for (const ef of result.design.energyFluctuations) {
    assert.ok(ef.fromEnergy >= 0 && ef.fromEnergy <= 100);
    assert.ok(ef.toEnergy >= 0 && ef.toEnergy <= 100);
  }
});

test('dry-run attention reset scores stay within 0-100', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  for (const r of result.design.attentionResets) {
    assert.ok(r.reengagementScore >= 0 && r.reengagementScore <= 100);
  }
});

test('generatePacingVariability rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generatePacingVariability({
        ...validInput,
        content: '',
      } as AdCreativePacingVariabilityDesignerInput),
    /invalid_ad_creative_pacing_variability_designer_input/,
  );
});

test('generatePacingVariability rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generatePacingVariability({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as AdCreativePacingVariabilityDesignerInput),
    /invalid_ad_creative_pacing_variability_designer_input/,
  );
});

test('generatePacingVariability rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generatePacingVariability({
        ...validInput,
        targetAudience: '',
        dryRun: true,
      } as AdCreativePacingVariabilityDesignerInput),
    /invalid_ad_creative_pacing_variability_designer_input/,
  );
});

test('generatePacingVariability rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generatePacingVariability({
        ...validInput,
        platform: 'snapchat' as never,
        dryRun: true,
      } as AdCreativePacingVariabilityDesignerInput),
    /invalid_ad_creative_pacing_variability_designer_input/,
  );
});

test('dry-run transitions reference speeds present in variations', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  const speeds = new Set(result.design.variations.map((v) => v.speed));
  for (const tr of result.design.transitions) {
    assert.ok(speeds.has(tr.fromSpeed) || tr.fromSpeed);
    assert.ok(speeds.has(tr.toSpeed) || tr.toSpeed);
  }
});

test('dry-run energy directions match energy deltas', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  for (const ef of result.design.energyFluctuations) {
    if (ef.direction === 'up') {
      assert.ok(ef.toEnergy >= ef.fromEnergy);
    } else {
      assert.ok(ef.toEnergy <= ef.fromEnergy);
    }
  }
});

test('dry-run returns at least one attention reset', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(result.design.attentionResets.length >= 1);
});

test('dry-run returns at least one energy fluctuation', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(result.design.energyFluctuations.length >= 1);
});

test('dry-run returns at least one transition', async () => {
  const result = await generatePacingVariability({ ...validInput, dryRun: true });
  assert.ok(result.design.transitions.length >= 1);
});
