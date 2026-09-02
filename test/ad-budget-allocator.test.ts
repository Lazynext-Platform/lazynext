import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Budget Allocator engine (AI-powered ad budget allocation
 * across platforms and campaigns).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_BUDGET_ALLOCATOR_CREDIT_COST,
  validateAdBudgetAllocatorInput,
  allocateBudget,
  VALID_PLATFORMS,
  VALID_GOALS,
  MAX_PRODUCT_LENGTH,
  MAX_BUDGET_LENGTH,
  type AdBudgetAllocatorInput,
} from '@/lib/creative/ad-budget-allocator';

// ── Credit cost ──

test('AD_BUDGET_ALLOCATOR_CREDIT_COST is 4', () => {
  assert.equal(AD_BUDGET_ALLOCATOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_GOALS contains the five campaign goals', () => {
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

test('MAX_BUDGET_LENGTH is 100', () => {
  assert.equal(MAX_BUDGET_LENGTH, 100);
});

// ── Input validation tests ──

const validInput: AdBudgetAllocatorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  totalBudget: '$10,000',
  campaignGoal: 'awareness',
  platforms: ['tiktok', 'instagram'],
};

test('validateAdBudgetAllocatorInput accepts a valid input', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdBudgetAllocatorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdBudgetAllocatorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdBudgetAllocatorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdBudgetAllocatorInput rejects missing totalBudget', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    totalBudget: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('total_budget_required'));
});

test('validateAdBudgetAllocatorInput rejects invalid totalBudget', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    totalBudget: 'not a number',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('total_budget_invalid'));
});

test('validateAdBudgetAllocatorInput rejects totalBudget over 100 chars', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    totalBudget: '$' + '1'.repeat(MAX_BUDGET_LENGTH),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('total_budget_too_long'));
});

test('validateAdBudgetAllocatorInput rejects missing campaignGoal', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    campaignGoal: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_required'));
});

test('validateAdBudgetAllocatorInput rejects invalid campaignGoal', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    campaignGoal: 'branding' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_invalid'));
});

test('validateAdBudgetAllocatorInput rejects invalid platforms array', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    platforms: 'tiktok' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platforms_invalid'));
});

test('validateAdBudgetAllocatorInput rejects invalid platform in array', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    platforms: ['tiktok', 'snapchat'],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platforms_invalid'));
});

test('validateAdBudgetAllocatorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdBudgetAllocatorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdBudgetAllocatorInput({
    productOrBrand: 'A fitness app',
    totalBudget: '$5,000',
    campaignGoal: 'conversions',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run allocateBudget with dryRun: true so no real LLM calls are
// made — deterministic heuristic allocation is returned instead.

test('dry-run returns a BudgetAllocatorResult with allocation', async () => {
  const result = await allocateBudget({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.allocation);
  assert.equal(result.dryRun, true);
});

test('dry-run returns allocation with correct structure', async () => {
  const result = await allocateBudget({ ...validInput, dryRun: true });
  const a = result.allocation;
  assert.ok(typeof a.totalBudget === 'string' && a.totalBudget.length > 0);
  assert.ok(Array.isArray(a.platformAllocations) && a.platformAllocations.length > 0);
  assert.ok(typeof a.recommendedSplit === 'string' && a.recommendedSplit.length > 0);
  assert.ok(Array.isArray(a.optimizationNotes) && a.optimizationNotes.length > 0);
  assert.ok(Array.isArray(a.riskFactors) && a.riskFactors.length > 0);
});

test('dry-run platform allocations have correct structure', async () => {
  const result = await allocateBudget({ ...validInput, dryRun: true });
  for (const alloc of result.allocation.platformAllocations) {
    assert.ok(typeof alloc.platform === 'string' && alloc.platform.length > 0);
    assert.ok(typeof alloc.percentage === 'number' && alloc.percentage > 0 && alloc.percentage <= 100);
    assert.ok(typeof alloc.amount === 'string' && alloc.amount.length > 0);
    assert.ok(typeof alloc.expectedReach === 'string' && alloc.expectedReach.length > 0);
    assert.ok(typeof alloc.expectedClicks === 'string' && alloc.expectedClicks.length > 0);
    assert.ok(typeof alloc.expectedConversions === 'string' && alloc.expectedConversions.length > 0);
    assert.ok(typeof alloc.rationale === 'string' && alloc.rationale.length > 0);
  }
});

test('dry-run percentages sum to 100', async () => {
  const result = await allocateBudget({ ...validInput, dryRun: true });
  const sum = result.allocation.platformAllocations.reduce((acc, a) => acc + a.percentage, 0);
  assert.equal(sum, 100);
});

test('dry-run works for all campaign goals', async () => {
  for (const goal of VALID_GOALS) {
    const result = await allocateBudget({
      productOrBrand: 'A fitness app',
      totalBudget: '$5,000',
      campaignGoal: goal,
      dryRun: true,
    });
    assert.ok(result.allocation.platformAllocations.length > 0, `${goal} should produce allocations`);
  }
});

test('dry-run works with specific platforms', async () => {
  const result = await allocateBudget({
    productOrBrand: 'A fitness app',
    totalBudget: '$5,000',
    campaignGoal: 'engagement',
    platforms: ['tiktok', 'instagram'],
    dryRun: true,
  });
  const platforms = result.allocation.platformAllocations.map((a) => a.platform);
  assert.ok(platforms.includes('tiktok'));
  assert.ok(platforms.includes('instagram'));
  assert.ok(!platforms.includes('youtube'));
  assert.ok(!platforms.includes('facebook'));
});

test('dry-run works without platforms (defaults to all)', async () => {
  const result = await allocateBudget({
    productOrBrand: 'A fitness app',
    totalBudget: '$5,000',
    campaignGoal: 'traffic',
    dryRun: true,
  });
  assert.ok(result.allocation.platformAllocations.length >= 2);
});

test('allocateBudget rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => allocateBudget({ ...validInput, productOrBrand: '' } as AdBudgetAllocatorInput),
    /invalid_ad_budget_allocator_input/,
  );
});

test('allocateBudget rejects invalid campaignGoal in dry-run mode', async () => {
  await assert.rejects(
    () => allocateBudget({ ...validInput, campaignGoal: 'branding' as never, dryRun: true } as AdBudgetAllocatorInput),
    /invalid_ad_budget_allocator_input/,
  );
});
