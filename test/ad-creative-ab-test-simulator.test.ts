import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative A/B Test Simulator engine (AI-powered A/B test
 * outcome simulation between two creative variants).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST,
  validateAdCreativeAbTestSimulatorInput,
  generateAbTestSimulation,
  VALID_PLATFORMS,
  VALID_OBJECTIVES,
  DEFAULT_OBJECTIVE,
  MAX_VARIANT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeAbTestSimulatorInput,
} from '@/lib/creative/ad-creative-ab-test-simulator';

// ── Credit cost ──

test('AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_AB_TEST_SIMULATOR_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_OBJECTIVES contains the five test objectives', () => {
  assert.ok(VALID_OBJECTIVES.includes('ctr'));
  assert.ok(VALID_OBJECTIVES.includes('engagement'));
  assert.ok(VALID_OBJECTIVES.includes('conversion'));
  assert.ok(VALID_OBJECTIVES.includes('brand_awareness'));
  assert.ok(VALID_OBJECTIVES.includes('retention'));
  assert.equal(VALID_OBJECTIVES.length, 5);
});

test('DEFAULT_OBJECTIVE is ctr', () => {
  assert.equal(DEFAULT_OBJECTIVE, 'ctr');
});

test('MAX_VARIANT_LENGTH is 2000', () => {
  assert.equal(MAX_VARIANT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeAbTestSimulatorInput = {
  variantA: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  variantB: 'Glow up in 7 days. Our clinically-proven vitamin C serum brightens skin fast. Order now!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  testObjective: 'ctr',
  platform: 'tiktok',
};

test('validateAdCreativeAbTestSimulatorInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeAbTestSimulatorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeAbTestSimulatorInput rejects missing variantA', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    variantA: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_a_required'));
});

test('validateAdCreativeAbTestSimulatorInput rejects variantA over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    variantA: 'x'.repeat(MAX_VARIANT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_a_too_long'));
});

test('validateAdCreativeAbTestSimulatorInput rejects missing variantB', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    variantB: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_b_required'));
});

test('validateAdCreativeAbTestSimulatorInput rejects variantB over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    variantB: 'x'.repeat(MAX_VARIANT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_b_too_long'));
});

test('validateAdCreativeAbTestSimulatorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeAbTestSimulatorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeAbTestSimulatorInput rejects invalid testObjective', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    testObjective: 'clicks' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('test_objective_invalid'));
});

test('validateAdCreativeAbTestSimulatorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeAbTestSimulatorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeAbTestSimulatorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    variantA: 'A great ad variant A',
    variantB: 'A great ad variant B',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAbTestSimulatorInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAbTestSimulatorInput accepts empty testObjective string', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    testObjective: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAbTestSimulatorInput rejects both missing variants', () => {
  const { valid, errors } = validateAdCreativeAbTestSimulatorInput({
    ...validInput,
    variantA: '',
    variantB: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variant_a_required'));
  assert.ok(errors.includes('variant_b_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateAbTestSimulation with dryRun: true so no real LLM
// calls are made — deterministic heuristic predictions are returned.

test('dry-run returns an AbTestSimulatorResult with simulation', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.simulation);
  assert.ok(typeof result.simulation.predictedWinner === 'string');
  assert.ok(typeof result.simulation.confidenceScore === 'number');
  assert.ok(result.simulation.variantA);
  assert.ok(result.simulation.variantB);
  assert.equal(result.dryRun, true);
});

test('dry-run returns predictedWinner as A, B, or tie', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(['A', 'B', 'tie'].includes(result.simulation.predictedWinner));
});

test('dry-run returns confidenceScore in 0-100 range', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(
    result.simulation.confidenceScore >= 0 && result.simulation.confidenceScore <= 100,
  );
});

test('dry-run returns variantA with correct structure', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  const v = result.simulation.variantA;
  assert.ok(Array.isArray(v.metrics));
  assert.ok(v.metrics.length > 0);
  assert.ok(Array.isArray(v.strengths));
  assert.ok(Array.isArray(v.weaknesses));
  assert.ok(typeof v.predictedScore === 'number');
  assert.ok(v.predictedScore >= 0 && v.predictedScore <= 100);
});

test('dry-run returns variantB with correct structure', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  const v = result.simulation.variantB;
  assert.ok(Array.isArray(v.metrics));
  assert.ok(v.metrics.length > 0);
  assert.ok(Array.isArray(v.strengths));
  assert.ok(Array.isArray(v.weaknesses));
  assert.ok(typeof v.predictedScore === 'number');
  assert.ok(v.predictedScore >= 0 && v.predictedScore <= 100);
});

test('dry-run returns metrics with correct structure', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  for (const m of result.simulation.variantA.metrics) {
    assert.ok(typeof m.metric === 'string' && m.metric.length > 0);
    assert.ok(typeof m.value === 'number');
    assert.ok(typeof m.unit === 'string');
    assert.ok(typeof m.confidence === 'number');
    assert.ok(m.confidence >= 0 && m.confidence <= 100);
  }
});

test('dry-run returns strengths and weaknesses', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(result.simulation.variantA.strengths.length > 0);
  assert.ok(result.simulation.variantA.weaknesses.length > 0);
  assert.ok(result.simulation.variantB.strengths.length > 0);
  assert.ok(result.simulation.variantB.weaknesses.length > 0);
});

test('dry-run returns significanceEstimate as a string', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(typeof result.simulation.significanceEstimate === 'string');
  assert.ok(result.simulation.significanceEstimate.length > 0);
});

test('dry-run returns keyDifferences as an array', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.simulation.keyDifferences));
  assert.ok(result.simulation.keyDifferences.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.simulation.recommendations));
  assert.ok(result.simulation.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAbTestSimulation({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.simulation.variantA.metrics.length > 0, `${platform} should produce metrics`);
  }
});

test('dry-run works for all test objectives', async () => {
  for (const objective of VALID_OBJECTIVES) {
    const result = await generateAbTestSimulation({
      ...validInput,
      testObjective: objective,
      dryRun: true,
    });
    assert.ok(result.simulation.variantA.metrics.length > 0, `${objective} should produce metrics`);
  }
});

test('dry-run predicts A as winner when variantA is longer', async () => {
  const result = await generateAbTestSimulation({
    ...validInput,
    variantA: 'x'.repeat(500),
    variantB: 'y'.repeat(100),
    dryRun: true,
  });
  assert.equal(result.simulation.predictedWinner, 'A');
});

test('dry-run predicts B as winner when variantB is longer', async () => {
  const result = await generateAbTestSimulation({
    ...validInput,
    variantA: 'x'.repeat(100),
    variantB: 'y'.repeat(500),
    dryRun: true,
  });
  assert.equal(result.simulation.predictedWinner, 'B');
});

test('dry-run predicts tie when variants are equal length', async () => {
  const result = await generateAbTestSimulation({
    ...validInput,
    variantA: 'x'.repeat(300),
    variantB: 'y'.repeat(300),
    dryRun: true,
  });
  assert.equal(result.simulation.predictedWinner, 'tie');
});

test('dry-run is deterministic for the same input', async () => {
  const r1 = await generateAbTestSimulation({ ...validInput, dryRun: true });
  const r2 = await generateAbTestSimulation({ ...validInput, dryRun: true });
  assert.equal(r1.simulation.predictedWinner, r2.simulation.predictedWinner);
  assert.equal(r1.simulation.confidenceScore, r2.simulation.confidenceScore);
  assert.equal(r1.simulation.variantA.predictedScore, r2.simulation.variantA.predictedScore);
});

test('generateAbTestSimulation rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAbTestSimulation({ ...validInput, variantA: '' } as AdCreativeAbTestSimulatorInput),
    /invalid_ad_creative_ab_test_simulator_input/,
  );
});

test('generateAbTestSimulation rejects missing variantB in dry-run mode', async () => {
  await assert.rejects(
    () => generateAbTestSimulation({ ...validInput, variantB: '', dryRun: true } as AdCreativeAbTestSimulatorInput),
    /invalid_ad_creative_ab_test_simulator_input/,
  );
});

test('generateAbTestSimulation rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateAbTestSimulation({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeAbTestSimulatorInput),
    /invalid_ad_creative_ab_test_simulator_input/,
  );
});

test('dry-run includes ctr, engagement_rate, and conversion_rate metrics', async () => {
  const result = await generateAbTestSimulation({ ...validInput, dryRun: true });
  const metricNames = result.simulation.variantA.metrics.map((m) => m.metric);
  assert.ok(metricNames.includes('ctr'));
  assert.ok(metricNames.includes('engagement_rate'));
  assert.ok(metricNames.includes('conversion_rate'));
});
