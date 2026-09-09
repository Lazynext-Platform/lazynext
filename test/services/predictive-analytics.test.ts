import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PredictiveAnalytics } from '@/lib/services/predictive-analytics';

// ─────────────────────────────────────────────────────────────────────────────
// PredictiveAnalytics
// ─────────────────────────────────────────────────────────────────────────────

describe('PredictiveAnalytics', () => {
  describe('linearRegression', () => {
    it('computes slope and intercept for a linear series', () => {
      const points = [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
      ];
      const result = PredictiveAnalytics.linearRegression(points);
      assert.equal(result.slope, 2);
      assert.equal(result.intercept, 1);
      assert.ok(result.rSquared > 0.99);
    });

    it('returns zero slope for fewer than 2 points', () => {
      const result = PredictiveAnalytics.linearRegression([{ x: 0, y: 5 }]);
      assert.equal(result.slope, 0);
      assert.equal(result.intercept, 5);
    });

    it('returns rSquared of 1 for perfect linear fit', () => {
      const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
      const result = PredictiveAnalytics.linearRegression(points);
      assert.equal(result.rSquared, 1);
    });
  });

  describe('forecast', () => {
    it('forecasts future values using linear regression', () => {
      const historical = [1, 3, 5, 7];
      const result = PredictiveAnalytics.forecast(historical, 3);
      assert.equal(result.forecast.length, 3);
      // slope=2, intercept=1; x=4 -> 9, x=5 -> 11, x=6 -> 13
      assert.equal(result.forecast[0], 9);
      assert.equal(result.forecast[1], 11);
      assert.equal(result.forecast[2], 13);
    });

    it('returns confidence bands with lower and upper', () => {
      const result = PredictiveAnalytics.forecast([1, 2, 3, 4], 2);
      assert.equal(result.confidence.lower.length, 2);
      assert.equal(result.confidence.upper.length, 2);
      assert.ok(result.confidence.lower[0] <= result.forecast[0]);
      assert.ok(result.confidence.upper[0] >= result.forecast[0]);
    });

    it('returns empty arrays for zero periods', () => {
      const result = PredictiveAnalytics.forecast([1, 2, 3], 0);
      assert.deepEqual(result.forecast, []);
      assert.deepEqual(result.confidence.lower, []);
    });
  });

  describe('movingAverage', () => {
    it('computes moving average over a window', () => {
      const result = PredictiveAnalytics.movingAverage([1, 2, 3, 4, 5], 3);
      assert.equal(result.length, 3);
      assert.equal(result[0], 2);
      assert.equal(result[1], 3);
      assert.equal(result[2], 4);
    });

    it('returns single average when window exceeds data length', () => {
      const result = PredictiveAnalytics.movingAverage([1, 2, 3], 10);
      assert.equal(result.length, 1);
      assert.equal(result[0], 2);
    });

    it('returns empty for empty input', () => {
      assert.deepEqual(PredictiveAnalytics.movingAverage([], 3), []);
    });
  });

  describe('exponentialSmoothing', () => {
    it('smooths data with alpha=1 (no smoothing)', () => {
      const result = PredictiveAnalytics.exponentialSmoothing([1, 2, 3], 1);
      assert.deepEqual(result, [1, 2, 3]);
    });

    it('smooths data with alpha between 0 and 1', () => {
      const result = PredictiveAnalytics.exponentialSmoothing([10, 20, 30], 0.5);
      assert.equal(result[0], 10);
      assert.ok(result[1] > 10 && result[1] < 20);
      assert.ok(result[2] > 20 && result[2] < 30);
    });
  });

  describe('detectAnomalies', () => {
    it('detects outliers using z-score', () => {
      const data = [1, 1, 1, 1, 1, 100];
      const anomalies = PredictiveAnalytics.detectAnomalies(data, 2.0);
      assert.ok(anomalies.includes(5));
    });

    it('returns empty when all values are the same (std=0)', () => {
      const anomalies = PredictiveAnalytics.detectAnomalies([5, 5, 5, 5], 2.0);
      assert.deepEqual(anomalies, []);
    });

    it('returns empty for fewer than 2 points', () => {
      assert.deepEqual(PredictiveAnalytics.detectAnomalies([5], 2.0), []);
    });
  });

  describe('correlation', () => {
    it('returns 1 for perfectly correlated series', () => {
      const result = PredictiveAnalytics.correlation([1, 2, 3, 4], [2, 4, 6, 8]);
      assert.equal(result, 1);
    });

    it('returns -1 for perfectly anti-correlated series', () => {
      const result = PredictiveAnalytics.correlation([1, 2, 3, 4], [8, 6, 4, 2]);
      assert.equal(result, -1);
    });

    it('returns 0 for fewer than 2 points', () => {
      assert.equal(PredictiveAnalytics.correlation([1], [2]), 0);
    });
  });

  describe('trendDirection', () => {
    it('returns up for increasing series', () => {
      assert.equal(PredictiveAnalytics.trendDirection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'up');
    });

    it('returns down for decreasing series', () => {
      assert.equal(PredictiveAnalytics.trendDirection([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]), 'down');
    });

    it('returns flat for stable series', () => {
      assert.equal(PredictiveAnalytics.trendDirection([5, 5, 5, 5, 5]), 'flat');
    });

    it('returns flat for fewer than 2 points', () => {
      assert.equal(PredictiveAnalytics.trendDirection([5]), 'flat');
    });
  });
});
