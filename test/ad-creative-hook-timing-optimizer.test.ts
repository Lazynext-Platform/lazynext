import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Hook Timing Optimizer engine (AI-powered hook
 * timing optimization for maximum engagement).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST,
  validateAdCreativeHookTimingOptimizerInput,
  generateHookTimingOptimization,
  VALID_PLATFORMS,
  VALID_HOOK_TYPES,
  VALID_RETENTION_RISKS,
  DEFAULT_HOOK_TYPE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeHookTimingOptimizerInput,
} from '@/lib/creative/ad-creative-hook-timing-optimizer';

// ── Credit cost ──

test('AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_HOOK_TIMING_OPTIMIZER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_HOOK_TYPES contains the eight hook types', () => {
  assert.ok(VALID_HOOK_TYPES.includes('question'));
  assert.ok(VALID_HOOK_TYPES.includes('statistic'));
  assert.ok(VALID_HOOK_TYPES.includes('story'));
  assert.ok(VALID_HOOK_TYPES.includes('shock'));
  assert.ok(VALID_HOOK_TYPES.includes('curiosity'));
  assert.ok(VALID_HOOK_TYPES.includes('bold_claim'));
  assert.ok(VALID_HOOK_TYPES.includes('problem'));
  assert.ok(VALID_HOOK_TYPES.includes('transformation'));
  assert.equal(VALID_HOOK_TYPES.length, 8);
});

test('VALID_RETENTION_RISKS contains the three risks', () => {
  assert.ok(VALID_RETENTION_RISKS.includes('low'));
  assert.ok(VALID_RETENTION_RISKS.includes('medium'));
  assert.ok(VALID_RETENTION_RISKS.includes('high'));
  assert.equal(VALID_RETENTION_RISKS.length, 3);
});

test('DEFAULT_HOOK_TYPE is curiosity', () => {
  assert.equal(DEFAULT_HOOK_TYPE, 'curiosity');
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeHookTimingOptimizerInput = {
  content: 'Did you know 90% of people quit their fitness goals by February? Here is how to stay in the 10%.',
  productOrBrand: 'DTC fitness app selling a habit-tracking subscription',
  hookType: 'statistic',
  platform: 'tiktok',
};

test('validateAdCreativeHookTimingOptimizerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeHookTimingOptimizerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects invalid hookType', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    hookType: 'mystery' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('hook_type_invalid'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeHookTimingOptimizerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeHookTimingOptimizerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHookTimingOptimizerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHookTimingOptimizerInput accepts empty hookType string', () => {
  const { valid, errors } = validateAdCreativeHookTimingOptimizerInput({
    ...validInput,
    hookType: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHookTimingOptimization with dryRun: true so no
// real LLM calls are made — deterministic heuristic output is returned.

test('dry-run returns a HookTimingOptimizerResult with timing', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.timing);
  assert.ok(typeof result.timing.effectivenessScore === 'number');
  assert.ok(Array.isArray(result.timing.engagementPredictions));
  assert.ok(result.timing.engagementPredictions.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns effectivenessScore in 0-100 range', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.ok(
    result.timing.effectivenessScore >= 0 && result.timing.effectivenessScore <= 100,
    `score ${result.timing.effectivenessScore} out of range`,
  );
});

test('dry-run returns a valid retentionRisk', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.ok(VALID_RETENTION_RISKS.includes(result.timing.timingAnalysis.retentionRisk));
});

test('dry-run returns timingAnalysis with correct structure', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  const ta = result.timing.timingAnalysis;
  assert.ok(typeof ta.currentPlacement === 'string' && ta.currentPlacement.length > 0);
  assert.ok(typeof ta.optimalWindow === 'string' && ta.optimalWindow.length > 0);
  assert.ok(typeof ta.attentionCurve === 'string' && ta.attentionCurve.length > 0);
  assert.ok(typeof ta.reasoning === 'string' && ta.reasoning.length > 0);
});

test('dry-run returns engagementPredictions with correct structure', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  for (const p of result.timing.engagementPredictions) {
    assert.ok(typeof p.timestamp === 'string' && p.timestamp.length > 0);
    assert.ok(typeof p.predictedEngagement === 'number' && p.predictedEngagement >= 0 && p.predictedEngagement <= 100);
    assert.ok(typeof p.audienceRetention === 'number' && p.audienceRetention >= 0 && p.audienceRetention <= 100);
    assert.ok(typeof p.note === 'string' && p.note.length > 0);
  }
});

test('dry-run returns optimalPlacement as a non-empty string', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.ok(typeof result.timing.optimalPlacement === 'string' && result.timing.optimalPlacement.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.timing.recommendations));
  assert.ok(result.timing.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateHookTimingOptimization({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.timing.engagementPredictions.length > 0, `${platform} should produce predictions`);
  }
});

test('dry-run works for all hook types', async () => {
  for (const ht of VALID_HOOK_TYPES) {
    const result = await generateHookTimingOptimization({
      ...validInput,
      hookType: ht,
      dryRun: true,
    });
    assert.ok(result.timing.engagementPredictions.length > 0, `${ht} should produce predictions`);
  }
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  const b = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.equal(a.timing.effectivenessScore, b.timing.effectivenessScore);
  assert.equal(a.timing.optimalPlacement, b.timing.optimalPlacement);
  assert.equal(a.timing.engagementPredictions.length, b.timing.engagementPredictions.length);
});

test('dry-run produces 5 engagement predictions (timestamps 0s-15s)', async () => {
  const result = await generateHookTimingOptimization({ ...validInput, dryRun: true });
  assert.equal(result.timing.engagementPredictions.length, 5);
  assert.equal(result.timing.engagementPredictions[0].timestamp, '0s');
});

test('dry-run retentionRisk is low when effectivenessScore >= 70', async () => {
  // Use a long content with a high-boost hook type to push score up.
  const result = await generateHookTimingOptimization({
    content: 'x'.repeat(500),
    productOrBrand: 'brand',
    hookType: 'shock',
    dryRun: true,
  });
  if (result.timing.effectivenessScore >= 70) {
    assert.equal(result.timing.timingAnalysis.retentionRisk, 'low');
  }
});

test('generateHookTimingOptimization rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookTimingOptimization({ ...validInput, content: '' } as AdCreativeHookTimingOptimizerInput),
    /invalid_ad_creative_hook_timing_optimizer_input/,
  );
});

test('generateHookTimingOptimization rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookTimingOptimization({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeHookTimingOptimizerInput),
    /invalid_ad_creative_hook_timing_optimizer_input/,
  );
});

test('generateHookTimingOptimization rejects invalid hookType', async () => {
  await assert.rejects(
    () =>
      generateHookTimingOptimization({
        ...validInput,
        hookType: 'mystery',
        dryRun: true,
      } as AdCreativeHookTimingOptimizerInput),
    /invalid_ad_creative_hook_timing_optimizer_input/,
  );
});

test('generateHookTimingOptimization rejects invalid platform', async () => {
  await assert.rejects(
    () =>
      generateHookTimingOptimization({
        ...validInput,
        platform: 'snapchat',
        dryRun: true,
      } as AdCreativeHookTimingOptimizerInput),
    /invalid_ad_creative_hook_timing_optimizer_input/,
  );
});

test('dry-run works without platform (defaults to generic window)', async () => {
  const result = await generateHookTimingOptimization({
    content: 'A great hook here for our new product',
    productOrBrand: 'A brand',
    hookType: 'question',
    dryRun: true,
  });
  assert.ok(result.timing.optimalPlacement.length > 0);
  assert.ok(result.timing.timingAnalysis.optimalWindow.length > 0);
});

test('dry-run works without hookType (defaults to curiosity)', async () => {
  const result = await generateHookTimingOptimization({
    content: 'A great hook here for our new product',
    productOrBrand: 'A brand',
    dryRun: true,
  });
  assert.ok(result.timing.effectivenessScore >= 0);
  assert.ok(result.timing.engagementPredictions.length > 0);
});
