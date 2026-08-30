import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AB_TEST_PLANNER_CREDIT_COST,
  validateABTestPlannerInput,
  planABTest,
  type ABTestPlannerInput,
} from '../src/lib/creative/ab-test-planner.ts';

function makeValidInput(overrides: Partial<ABTestPlannerInput> = {}): ABTestPlannerInput {
  return {
    baseCreative: 'TikTok ad for eco-friendly water bottle. Hook: "Stop scrolling." CTA: Shop Now. Visual: product on gym background.',
    platform: 'tiktok',
    goal: 'Increase CTR by 20%',
    ...overrides,
  };
}

describe('ab-test-planner', () => {
  describe('validation', () => {
    test('rejects missing baseCreative', () => {
      const result = validateABTestPlannerInput({ baseCreative: '', platform: 'tiktok', goal: 'x' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('base_creative_required'));
    });

    test('rejects missing platform', () => {
      const result = validateABTestPlannerInput({ baseCreative: 'test', platform: '', goal: 'x' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('platform_required'));
    });

    test('rejects missing goal', () => {
      const result = validateABTestPlannerInput({ baseCreative: 'test', platform: 'tiktok', goal: '' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('goal_required'));
    });

    test('rejects non-object input', () => {
      const result = validateABTestPlannerInput(null as unknown as ABTestPlannerInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('accepts valid input', () => {
      const result = validateABTestPlannerInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('accepts valid input with optional fields', () => {
      const result = validateABTestPlannerInput(makeValidInput({ audienceSize: 50000, currentCTR: 1.5, budget: 500 }));
      assert.equal(result.valid, true);
    });

    test('rejects invalid audienceSize', () => {
      const result = validateABTestPlannerInput(makeValidInput({ audienceSize: -1 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('audience_size_invalid'));
    });

    test('rejects invalid currentCTR', () => {
      const result = validateABTestPlannerInput(makeValidInput({ currentCTR: 150 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('current_ctr_invalid'));
    });

    test('rejects invalid budget', () => {
      const result = validateABTestPlannerInput(makeValidInput({ budget: -10 }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('budget_invalid'));
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(AB_TEST_PLANNER_CREDIT_COST > 0);
    });

    test('equals 4', () => {
      assert.equal(AB_TEST_PLANNER_CREDIT_COST, 4);
    });
  });

  describe('dry-run mode', () => {
    test('returns plan with correct structure', async () => {
      const result = await planABTest(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.plan);
      assert.equal(result.dryRun, true);
      assert.ok(typeof result.plan.testName === 'string');
      assert.ok(result.plan.testName.length > 0);
      assert.ok(typeof result.plan.hypothesis === 'string');
      assert.ok(Array.isArray(result.plan.variants));
      assert.ok(result.plan.variants.length >= 2);
      assert.ok(Array.isArray(result.plan.metrics));
      assert.ok(result.plan.metrics.length >= 1);
      assert.ok(typeof result.plan.sampleSizePerVariant === 'number');
      assert.ok(result.plan.sampleSizePerVariant > 0);
      assert.ok(typeof result.plan.estimatedDurationDays === 'number');
      assert.ok(result.plan.estimatedDurationDays > 0);
      assert.ok(typeof result.plan.confidenceLevel === 'number');
      assert.ok(typeof result.plan.statisticalPower === 'number');
      assert.ok(Array.isArray(result.plan.successCriteria));
      assert.ok(Array.isArray(result.plan.failureCriteria));
      assert.ok(Array.isArray(result.plan.segmentRecommendations));
      assert.ok(Array.isArray(result.plan.notes));
    });

    test('variants have required fields', async () => {
      const result = await planABTest(makeValidInput({ dryRun: true }), 'free');
      for (const v of result.plan.variants) {
        assert.ok(typeof v.id === 'string');
        assert.ok(typeof v.name === 'string');
        assert.ok(typeof v.description === 'string');
        assert.ok(Array.isArray(v.changes));
        assert.ok(typeof v.hypothesis === 'string');
      }
    });

    test('metrics have required fields', async () => {
      const result = await planABTest(makeValidInput({ dryRun: true }), 'free');
      for (const m of result.plan.metrics) {
        assert.ok(typeof m.name === 'string');
        assert.ok(typeof m.primary === 'boolean');
        assert.ok(typeof m.target === 'string');
        assert.ok(typeof m.minimumDetectableEffect === 'string');
      }
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () => planABTest({ baseCreative: '', platform: 'tiktok', goal: 'x', dryRun: true } as ABTestPlannerInput, 'free'),
      );
    });
  });
});
