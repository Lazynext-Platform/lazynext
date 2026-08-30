import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_PERFORMANCE_PREDICTOR_CREDIT_COST,
  validateAdPerformancePredictorInput,
  predictPerformance,
  calculatePerformanceGrade,
  type AdPerformancePredictorInput,
} from '../src/lib/creative/ad-performance-predictor.ts';

function makeValidInput(overrides: Partial<AdPerformancePredictorInput> = {}): AdPerformancePredictorInput {
  return {
    briefOrConcept: 'TikTok ad for eco-friendly water bottle targeting fitness enthusiasts. Hook: Stop scrolling. CTA: Shop Now. Visual: product on gym background.',
    platform: 'tiktok',
    ...overrides,
  };
}

describe('ad-performance-predictor', () => {
  describe('validation', () => {
    test('rejects missing briefOrConcept', () => {
      const result = validateAdPerformancePredictorInput({ briefOrConcept: '', platform: 'tiktok' });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateAdPerformancePredictorInput(null as unknown as AdPerformancePredictorInput);
      assert.equal(result.valid, false);
    });

    test('rejects missing platform', () => {
      const result = validateAdPerformancePredictorInput({ briefOrConcept: 'test', platform: '' });
      assert.equal(result.valid, false);
    });

    test('rejects invalid platform', () => {
      const result = validateAdPerformancePredictorInput({ briefOrConcept: 'test', platform: 'myspace' });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateAdPerformancePredictorInput(makeValidInput());
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(AD_PERFORMANCE_PREDICTOR_CREDIT_COST > 0);
    });

    test('equals 5', () => {
      assert.equal(AD_PERFORMANCE_PREDICTOR_CREDIT_COST, 5);
    });
  });

  describe('calculatePerformanceGrade', () => {
    test('returns F for score 0', () => {
      assert.equal(calculatePerformanceGrade(0), 'F');
    });

    test('returns A+ for score 100', () => {
      assert.equal(calculatePerformanceGrade(100), 'A+');
    });

    test('returns A+ for score 90', () => {
      assert.equal(calculatePerformanceGrade(90), 'A+');
    });

    test('returns A for score 85', () => {
      assert.equal(calculatePerformanceGrade(85), 'A');
    });

    test('returns B for score 75', () => {
      assert.equal(calculatePerformanceGrade(75), 'B');
    });
  });

  describe('dry-run mode', () => {
    test('returns prediction with correct structure', async () => {
      const result = await predictPerformance(makeValidInput({ dryRun: true }), 'free');
      assert.ok(result.prediction);
      assert.ok(typeof result.prediction.overallScore === 'number');
      assert.ok(result.prediction.overallScore >= 0 && result.prediction.overallScore <= 100);
      assert.ok(typeof result.prediction.grade === 'string');
      assert.ok(typeof result.prediction.predictedCTR === 'string');
      assert.ok(typeof result.prediction.predictedEngagement === 'string');
      assert.ok(typeof result.prediction.conversionLikelihood === 'string');
      assert.ok(typeof result.prediction.viralityScore === 'number');
      assert.ok(Array.isArray(result.prediction.metrics));
      assert.ok(Array.isArray(result.prediction.factors));
      assert.ok(Array.isArray(result.prediction.strengths));
      assert.ok(Array.isArray(result.prediction.risks));
      assert.ok(Array.isArray(result.prediction.recommendations));
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () => predictPerformance({ briefOrConcept: '', platform: 'tiktok', dryRun: true } as AdPerformancePredictorInput, 'free'),
      );
    });
  });
});
