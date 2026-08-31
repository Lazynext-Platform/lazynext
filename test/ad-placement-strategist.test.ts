import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Placement Strategist engine (AI-powered cross-platform ad
 * placement strategy generation).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_PLACEMENT_STRATEGIST_CREDIT_COST,
  validateAdPlacementStrategistInput,
  generatePlacementStrategy,
  VALID_BUDGETS,
  VALID_GOALS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  DEFAULT_BUDGET,
  type AdPlacementStrategistInput,
} from '@/lib/creative/ad-placement-strategist';

// ── Credit cost ──

test('AD_PLACEMENT_STRATEGIST_CREDIT_COST is 5', () => {
  assert.equal(AD_PLACEMENT_STRATEGIST_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_BUDGETS contains the three levels', () => {
  assert.ok(VALID_BUDGETS.includes('low'));
  assert.ok(VALID_BUDGETS.includes('medium'));
  assert.ok(VALID_BUDGETS.includes('high'));
  assert.equal(VALID_BUDGETS.length, 3);
});

test('VALID_GOALS contains the five goals', () => {
  assert.ok(VALID_GOALS.includes('awareness'));
  assert.ok(VALID_GOALS.includes('engagement'));
  assert.ok(VALID_GOALS.includes('conversions'));
  assert.ok(VALID_GOALS.includes('traffic'));
  assert.ok(VALID_GOALS.includes('app_installs'));
  assert.equal(VALID_GOALS.length, 5);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 1000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

test('DEFAULT_BUDGET is medium', () => {
  assert.equal(DEFAULT_BUDGET, 'medium');
});

// ── Input validation tests ──

const validInput: AdPlacementStrategistInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'millennial women aged 25-35 interested in skincare',
  budget: 'medium',
  goals: ['awareness', 'engagement'],
};

test('validateAdPlacementStrategistInput accepts a valid input', () => {
  const { valid, errors } = validateAdPlacementStrategistInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdPlacementStrategistInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdPlacementStrategistInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdPlacementStrategistInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdPlacementStrategistInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdPlacementStrategistInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdPlacementStrategistInput rejects targetAudience over 1000 chars', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdPlacementStrategistInput rejects invalid budget', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    budget: 'huge' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('budget_invalid'));
});

test('validateAdPlacementStrategistInput rejects invalid goals (non-array)', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    goals: 'awareness' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('goals_invalid'));
});

test('validateAdPlacementStrategistInput rejects invalid goal value', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    goals: ['awareness', 'brand_lift' as never],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('goals_invalid'));
});

test('validateAdPlacementStrategistInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdPlacementStrategistInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdPlacementStrategistInput({
    productOrBrand: 'A new fitness app',
    targetAudience: 'fitness enthusiasts aged 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePlacementStrategy with dryRun: true so no real LLM
// calls are made — deterministic heuristic strategies are returned.

test('dry-run returns an AdPlacementStrategistResult with a strategy', async () => {
  const result = await generatePlacementStrategy({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a strategy with correct structure', async () => {
  const result = await generatePlacementStrategy({ ...validInput, dryRun: true });
  const strategy = result.strategy;
  assert.ok(typeof strategy.summary === 'string' && strategy.summary.length > 0);
  assert.ok(Array.isArray(strategy.placements) && strategy.placements.length > 0);
  assert.ok(typeof strategy.budgetAllocation === 'string' && strategy.budgetAllocation.length > 0);
  assert.ok(typeof strategy.timeline === 'string' && strategy.timeline.length > 0);
  assert.ok(Array.isArray(strategy.risks) && strategy.risks.length > 0);
  for (const p of strategy.placements) {
    assert.ok(typeof p.platform === 'string' && p.platform.length > 0);
    assert.ok(typeof p.placementType === 'string' && p.placementType.length > 0);
    assert.ok(typeof p.format === 'string' && p.format.length > 0);
    assert.ok(typeof p.audienceFit === 'number' && p.audienceFit >= 1 && p.audienceFit <= 10);
    assert.ok(typeof p.estimatedCPM === 'string' && p.estimatedCPM.length > 0);
    assert.ok(typeof p.estimatedReach === 'string' && p.estimatedReach.length > 0);
    assert.ok(typeof p.expectedPerformance === 'string' && p.expectedPerformance.length > 0);
    assert.ok(['high', 'medium', 'low'].includes(p.priority));
  }
});

test('dry-run works for all three budget levels', async () => {
  for (const budget of VALID_BUDGETS) {
    const result = await generatePlacementStrategy({
      productOrBrand: 'A fitness app',
      targetAudience: 'fitness enthusiasts',
      budget,
      dryRun: true,
    });
    assert.ok(result.strategy.placements.length > 0, `${budget} budget should produce placements`);
  }
});

test('dry-run low budget produces fewer placements than high budget', async () => {
  const lowResult = await generatePlacementStrategy({
    ...validInput,
    budget: 'low',
    dryRun: true,
  });
  const highResult = await generatePlacementStrategy({
    ...validInput,
    budget: 'high',
    dryRun: true,
  });
  assert.ok(lowResult.strategy.placements.length <= highResult.strategy.placements.length,
    'low budget should have fewer or equal placements than high budget');
});

test('dry-run works with goals', async () => {
  const result = await generatePlacementStrategy({
    ...validInput,
    goals: ['conversions', 'traffic'],
    dryRun: true,
  });
  assert.ok(result.strategy.summary.includes('conversions'));
});

test('dry-run works without optional fields', async () => {
  const result = await generatePlacementStrategy({
    productOrBrand: 'A coffee subscription',
    targetAudience: 'coffee lovers',
    dryRun: true,
  });
  assert.ok(result.strategy.placements.length > 0);
});

test('generatePlacementStrategy rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePlacementStrategy({ ...validInput, productOrBrand: '' } as AdPlacementStrategistInput),
    /invalid_ad_placement_strategist_input/,
  );
});

test('generatePlacementStrategy rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePlacementStrategy({ ...validInput, targetAudience: '', dryRun: true } as AdPlacementStrategistInput),
    /invalid_ad_placement_strategist_input/,
  );
});

test('generatePlacementStrategy rejects invalid budget in dry-run mode', async () => {
  await assert.rejects(
    () => generatePlacementStrategy({ ...validInput, budget: 'huge' as never, dryRun: true } as AdPlacementStrategistInput),
    /invalid_ad_placement_strategist_input/,
  );
});
