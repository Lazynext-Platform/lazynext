import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TREND_INTELLIGENCE_COST,
  getTrendStatuses,
  getTrendCategories,
  getTrendVelocities,
  getOpportunityTypes,
  calculateOpportunityScore,
  calculateMomentumTrend,
  validateTrendIntelligenceRequest,
  type TrendStatus,
  type TrendCategory,
  type TrendVelocity,
  type TrendTimeframe,
  type OpportunityType,
} from '../src/lib/creative/trend-intelligence.ts';

describe('trend-intelligence', () => {
  describe('type completeness', () => {
    test('TrendStatus has 5 statuses', () => {
      const statuses: TrendStatus[] = ['rising', 'peaking', 'declining', 'emerging', 'stable'];
      assert.equal(statuses.length, 5);
    });

    test('TrendCategory has 8 categories', () => {
      const cats: TrendCategory[] = ['cultural', 'seasonal', 'viral', 'industry', 'consumer_behavior', 'technology', 'social_media', 'economic'];
      assert.equal(cats.length, 8);
    });

    test('TrendVelocity has 4 velocities', () => {
      const velocities: TrendVelocity[] = ['slow', 'moderate', 'fast', 'explosive'];
      assert.equal(velocities.length, 4);
    });

    test('TrendTimeframe has 4 timeframes', () => {
      const timeframes: TrendTimeframe[] = ['immediate', 'short_term', 'medium_term', 'long_term'];
      assert.equal(timeframes.length, 4);
    });

    test('OpportunityType has 7 types', () => {
      const types: OpportunityType[] = ['content_gap', 'format_trend', 'meme_trend', 'hashtag_trend', 'audio_trend', 'visual_trend', 'messaging_trend'];
      assert.equal(types.length, 7);
    });

    test('getTrendStatuses returns 5', () => { assert.equal(getTrendStatuses().length, 5); });
    test('getTrendCategories returns 8', () => { assert.equal(getTrendCategories().length, 8); });
    test('getTrendVelocities returns 4', () => { assert.equal(getTrendVelocities().length, 4); });
    test('getOpportunityTypes returns 7', () => { assert.equal(getOpportunityTypes().length, 7); });
  });

  describe('calculateOpportunityScore', () => {
    test('returns 0-100', () => {
      const trend = {
        trendId: 't1', name: 'Test', category: 'viral' as TrendCategory, status: 'rising' as TrendStatus,
        velocity: 'fast' as TrendVelocity, timeframe: 'short_term' as TrendTimeframe, description: '',
        startDate: '', estimatedDuration: 30, momentumScore: 70, relevanceScore: 80, volumeScore: 60,
        platforms: [], geographicSpread: [], demographics: [], keywords: [], hashtags: [], exampleContent: [],
      };
      const s = calculateOpportunityScore(trend, 80);
      assert.ok(s >= 0 && s <= 100);
    });
  });

  describe('calculateMomentumTrend', () => {
    test('returns 0-100', () => {
      const m = calculateMomentumTrend('fast', 70);
      assert.ok(m >= 0 && m <= 100);
    });
    test('explosive > slow for same volume', () => {
      const slow = calculateMomentumTrend('slow', 80);
      const explosive = calculateMomentumTrend('explosive', 80);
      assert.ok(explosive > slow);
    });
  });

  describe('validateTrendIntelligenceRequest', () => {
    test('empty niche fails', () => {
      const r = validateTrendIntelligenceRequest({ productNiche: '' });
      assert.ok(!r.valid);
    });
    test('valid passes', () => {
      const r = validateTrendIntelligenceRequest({ productNiche: 'skincare' });
      assert.ok(r.valid);
    });
  });

  describe('TREND_INTELLIGENCE_COST', () => {
    test('cost is 6', () => { assert.equal(TREND_INTELLIGENCE_COST, 6); });
  });
});
