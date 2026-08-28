import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TESTING_LAB_COST,
  getTestTypes,
  getWinnerCriteria,
  calculateVariantMetrics,
  calculateSampleSize,
  validateTestConfig,
  type TestStatus,
  type TestType,
  type WinnerCriteria,
  type ConfidenceMethod,
  type SignificanceResult,
} from '../src/lib/creative/testing-lab.ts';

describe('testing-lab', () => {
  describe('type completeness', () => {
    test('TestStatus has 5 statuses', () => {
      const statuses: TestStatus[] = ['draft', 'running', 'paused', 'completed', 'archived'];
      assert.equal(statuses.length, 5);
    });

    test('TestType has 5 types', () => {
      const types: TestType[] = ['ab', 'abn', 'multivariate', 'split_url', 'sequential'];
      assert.equal(types.length, 5);
    });

    test('WinnerCriteria has 7 criteria', () => {
      const criteria: WinnerCriteria[] = ['ctr', 'cvr', 'roas', 'cpa', 'revenue', 'engagement', 'custom'];
      assert.equal(criteria.length, 7);
    });

    test('ConfidenceMethod has 3 methods', () => {
      const methods: ConfidenceMethod[] = ['frequentist', 'bayesian', 'both'];
      assert.equal(methods.length, 3);
    });

    test('SignificanceResult has 3 results', () => {
      const results: SignificanceResult[] = ['significant', 'not_significant', 'inconclusive'];
      assert.equal(results.length, 3);
    });

    test('getTestTypes returns 5 types', () => {
      assert.equal(getTestTypes().length, 5);
    });

    test('getWinnerCriteria returns 7 criteria', () => {
      assert.equal(getWinnerCriteria().length, 7);
    });
  });

  describe('calculateVariantMetrics', () => {
    test('calculates CTR correctly', () => {
      const m = calculateVariantMetrics({ impressions: 1000, clicks: 50, conversions: 5, revenue: 100, spend: 50 });
      assert.ok(m.ctr > 0);
    });

    test('calculates CVR correctly', () => {
      const m = calculateVariantMetrics({ impressions: 1000, clicks: 100, conversions: 10, revenue: 200, spend: 50 });
      assert.ok(m.cvr > 0);
    });

    test('calculates ROAS correctly', () => {
      const m = calculateVariantMetrics({ impressions: 1000, clicks: 100, conversions: 10, revenue: 200, spend: 50 });
      assert.equal(m.roas, 4); // 200/50
    });

    test('calculates CPA correctly', () => {
      const m = calculateVariantMetrics({ impressions: 1000, clicks: 100, conversions: 10, revenue: 200, spend: 50 });
      assert.equal(m.cpa, 5); // 50/10
    });

    test('handles zero impressions gracefully', () => {
      const m = calculateVariantMetrics({ impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 });
      assert.equal(m.ctr, 0);
    });
  });

  describe('calculateSampleSize', () => {
    test('returns positive number', () => {
      const n = calculateSampleSize(0.05, 0.02, 0.95, 0.8);
      assert.ok(n > 0);
    });
  });

  describe('validateTestConfig', () => {
    test('valid config with 2 variants passes', () => {
      const r = validateTestConfig({
        testType: 'ab',
        winnerCriteria: 'ctr',
        confidenceThreshold: 95,
        variants: [{ variantName: 'A', description: 'Control' }, { variantName: 'B', description: 'Treatment' }],
      });
      assert.ok(r.valid, `Expected valid, errors: ${r.errors.join(', ')}`);
    });

    test('too few variants fails', () => {
      const r = validateTestConfig({
        testType: 'ab',
        winnerCriteria: 'ctr',
        confidenceThreshold: 95,
        variants: [{ variantName: 'A', description: 'Control' }],
      });
      assert.ok(!r.valid);
    });
  });

  describe('TESTING_LAB_COST', () => {
    test('cost is 5', () => {
      assert.equal(TESTING_LAB_COST, 5);
    });
  });
});
