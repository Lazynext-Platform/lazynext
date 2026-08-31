import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Rhythm Pacing Optimizer engine (AI-powered
 * rhythm and pacing optimization for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode
 * (no real LLM calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_RHYTHM_PACING_OPTIMIZER_CREDIT_COST,
  validateAdCreativeRhythmPacingOptimizerInput,
  generateRhythmOptimization,
  VALID_PLATFORMS,
  VALID_TEMPOS,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeRhythmPacingOptimizerInput,
} from '@/lib/creative/ad-creative-rhythm-pacing-optimizer';

// ── Credit cost ──

test('AD_CREATIVE_RHYTHM_PACING_OPTIMIZER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_RHYTHM_PACING_OPTIMIZER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_TEMPOS contains the six tempos', () => {
  assert.ok(VALID_TEMPOS.includes('slow'));
  assert.ok(VALID_TEMPOS.includes('medium'));
  assert.ok(VALID_TEMPOS.includes('fast'));
  assert.ok(VALID_TEMPOS.includes('accelerating'));
  assert.ok(VALID_TEMPOS.includes('decelerating'));
  assert.ok(VALID_TEMPOS.includes('variable'));
  assert.equal(VALID_TEMPOS.length, 6);
});

test('VALID_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
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

const validInput: AdCreativeRhythmPacingOptimizerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeRhythmPacingOptimizerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeRhythmPacingOptimizerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeRhythmPacingOptimizerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeRhythmPacingOptimizerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeRhythmPacingOptimizerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeRhythmPacingOptimizerInput accepts undefined dryRun', () => {
  const { valid, errors } = validateAdCreativeRhythmPacingOptimizerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
    dryRun: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateRhythmOptimization with dryRun: true so no real
// LLM calls are made — deterministic heuristic optimization is returned.

test('dry-run returns a RhythmPacingOptimizerResult with optimization', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.optimization);
  assert.ok(typeof result.optimization.rhythmScore === 'number');
  assert.ok(Array.isArray(result.optimization.patterns));
  assert.ok(result.optimization.patterns.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns rhythmScore in 0-100 range', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(result.optimization.rhythmScore >= 0 && result.optimization.rhythmScore <= 100);
});

test('dry-run returns patterns with correct structure', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(result.optimization.patterns.length > 0);
  for (const p of result.optimization.patterns) {
    assert.ok(typeof p.name === 'string' && p.name.length > 0);
    assert.ok(typeof p.description === 'string' && p.description.length > 0);
    assert.ok(typeof p.bpm === 'number' && p.bpm >= 0);
    assert.ok(typeof p.energy === 'number' && p.energy >= 0 && p.energy <= 100);
    assert.ok(typeof p.duration === 'string' && p.duration.length > 0);
  }
});

test('dry-run returns segments with correct structure', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(result.optimization.segments.length > 0);
  for (const s of result.optimization.segments) {
    assert.ok(typeof s.startTime === 'string' && s.startTime.length > 0);
    assert.ok(typeof s.endTime === 'string' && s.endTime.length > 0);
    assert.ok(typeof s.tempo === 'string' && s.tempo.length > 0);
    assert.ok(typeof s.energy === 'number' && s.energy >= 0 && s.energy <= 100);
    assert.ok(typeof s.purpose === 'string' && s.purpose.length > 0);
  }
});

test('dry-run returns beatDrops with correct structure', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(result.optimization.beatDrops.length > 0);
  for (const b of result.optimization.beatDrops) {
    assert.ok(typeof b.timing === 'string' && b.timing.length > 0);
    assert.ok(typeof b.buildup === 'string' && b.buildup.length > 0);
    assert.ok(typeof b.drop === 'string' && b.drop.length > 0);
    assert.ok(VALID_IMPACTS.includes(b.impact));
  }
});

test('dry-run returns tempoChanges with correct structure', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(result.optimization.tempoChanges.length > 0);
  for (const tc of result.optimization.tempoChanges) {
    assert.ok(typeof tc.fromTempo === 'string' && tc.fromTempo.length > 0);
    assert.ok(typeof tc.toTempo === 'string' && tc.toTempo.length > 0);
    assert.ok(typeof tc.timing === 'string' && tc.timing.length > 0);
    assert.ok(typeof tc.transition === 'string' && tc.transition.length > 0);
    assert.ok(typeof tc.reason === 'string' && tc.reason.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.optimization.recommendations));
  assert.ok(result.optimization.recommendations.length > 0);
  for (const rec of result.optimization.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateRhythmOptimization({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.optimization.patterns.length > 0, `${platform} should produce patterns`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateRhythmOptimization({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.optimization.patterns.length > 0);
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generateRhythmOptimization({ ...validInput, dryRun: true });
  const b = await generateRhythmOptimization({ ...validInput, dryRun: true });
  assert.equal(a.optimization.rhythmScore, b.optimization.rhythmScore);
  assert.equal(a.optimization.patterns.length, b.optimization.patterns.length);
});

test('dry-run energy values are within 0-100', async () => {
  const result = await generateRhythmOptimization({ ...validInput, dryRun: true });
  for (const p of result.optimization.patterns) {
    assert.ok(p.energy >= 0 && p.energy <= 100);
  }
  for (const s of result.optimization.segments) {
    assert.ok(s.energy >= 0 && s.energy <= 100);
  }
});

test('generateRhythmOptimization rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, content: '' } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects over-length productOrBrand', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1), dryRun: true } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects over-length content', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, content: 'x'.repeat(MAX_CONTENT_LENGTH + 1), dryRun: true } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects over-length targetAudience', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1), dryRun: true } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects invalid platform', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, platform: 'snapchat', dryRun: true } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});

test('generateRhythmOptimization rejects invalid dryRun type', async () => {
  await assert.rejects(
    () => generateRhythmOptimization({ ...validInput, dryRun: 'yes' as never } as AdCreativeRhythmPacingOptimizerInput),
    /invalid_ad_creative_rhythm_pacing_optimizer_input/,
  );
});
