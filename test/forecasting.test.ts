import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORECAST_COST,
  getForecastHorizons,
  getForecastMetrics,
  getScenarioTypes,
  getAudienceFitFactors,
  linearRegression,
  calculateConfidenceInterval,
  determineConfidenceLevel,
  validateForecastRequest,
  type ForecastHorizon,
  type ForecastMetric,
  type ScenarioType,
  type AudienceFitFactor,
  type ConfidenceLevel,
} from '../src/lib/creative/forecasting.ts';

describe('forecasting', () => {
  describe('type completeness', () => {
    test('ForecastHorizon has 5 horizons', () => {
      const horizons: ForecastHorizon[] = ['7d', '14d', '30d', '60d', '90d'];
      assert.equal(horizons.length, 5);
    });

    test('ForecastMetric has 10 metrics', () => {
      const metrics: ForecastMetric[] = ['impressions', 'clicks', 'ctr', 'conversions', 'cvr', 'roas', 'cpa', 'revenue', 'spend', 'engagement'];
      assert.equal(metrics.length, 10);
    });

    test('ScenarioType has 4 scenarios', () => {
      const scenarios: ScenarioType[] = ['conservative', 'realistic', 'optimistic', 'worst_case'];
      assert.equal(scenarios.length, 4);
    });

    test('AudienceFitFactor has 6 factors', () => {
      const factors: AudienceFitFactor[] = ['demographic_match', 'interest_alignment', 'behavioral_match', 'channel_fit', 'timing_fit', 'creative_relevance'];
      assert.equal(factors.length, 6);
    });

    test('ConfidenceLevel has 4 levels', () => {
      const levels: ConfidenceLevel[] = ['low', 'medium', 'high', 'very_high'];
      assert.equal(levels.length, 4);
    });

    test('getForecastHorizons returns 5 horizons', () => {
      assert.equal(getForecastHorizons().length, 5);
    });

    test('getForecastMetrics returns 10 metrics', () => {
      assert.equal(getForecastMetrics().length, 10);
    });

    test('getScenarioTypes returns 4 scenarios', () => {
      assert.equal(getScenarioTypes().length, 4);
    });

    test('getAudienceFitFactors returns 6 factors', () => {
      assert.equal(getAudienceFitFactors().length, 6);
    });
  });

  describe('linearRegression', () => {
    test('returns slope, intercept, and rSquared', () => {
      const data = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }];
      const result = linearRegression(data);
      assert.ok(typeof result.slope === 'number');
      assert.ok(typeof result.intercept === 'number');
      assert.ok(typeof result.rSquared === 'number');
      assert.ok(result.rSquared >= 0 && result.rSquared <= 1);
    });

    test('perfect linear data has rSquared = 1', () => {
      const data = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
      const result = linearRegression(data);
      assert.ok(result.rSquared > 0.99);
    });
  });

  describe('calculateConfidenceInterval', () => {
    test('returns lower and upper bounds', () => {
      const ci = calculateConfidenceInterval(100, 10, 0.95);
      assert.ok(ci.lower < 100);
      assert.ok(ci.upper > 100);
    });
  });

  describe('determineConfidenceLevel', () => {
    test('large sample with low variance returns high confidence', () => {
      const level = determineConfidenceLevel(100, 0.1);
      assert.ok(['high', 'very_high'].includes(level));
    });

    test('small sample returns low confidence', () => {
      const level = determineConfidenceLevel(3, 10);
      assert.ok(['low', 'medium'].includes(level));
    });
  });

  describe('validateForecastRequest', () => {
    test('missing creativeDescription fails', () => {
      const r = validateForecastRequest({ productName: 'Test' });
      assert.ok(!r.valid);
    });

    test('valid request passes', () => {
      const r = validateForecastRequest({ creativeDescription: 'A great ad' });
      assert.ok(r.valid);
    });
  });

  describe('FORECAST_COST', () => {
    test('cost is 7', () => {
      assert.equal(FORECAST_COST, 7);
    });
  });
});
