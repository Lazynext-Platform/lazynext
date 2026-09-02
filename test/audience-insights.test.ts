import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIENCE_INSIGHTS_COST,
  getAudienceSegments,
  getInterestCategories,
  getBehaviorPatterns,
  getDemographicFields,
  calculateOverlap,
  calculateAudienceFitScore,
  calculateLookalikePotential,
  validateAudienceInsightsRequest,
  type AudienceSegment,
  type InterestCategory,
  type BehaviorPattern,
  type DemographicField,
  type PurchaseIntent,
} from '../src/lib/creative/audience-insights.ts';

describe('audience-insights', () => {
  describe('type completeness', () => {
    test('AudienceSegment has 6 segments', () => {
      const segments: AudienceSegment[] = ['primary', 'secondary', 'lookalike', 'retargeting', 'cold_prospect', 'warm_lead'];
      assert.equal(segments.length, 6);
    });

    test('InterestCategory has 15 categories', () => {
      const cats: InterestCategory[] = ['lifestyle', 'technology', 'fashion', 'health', 'finance', 'entertainment', 'food', 'travel', 'sports', 'beauty', 'home', 'automotive', 'parenting', 'gaming', 'business'];
      assert.equal(cats.length, 15);
    });

    test('BehaviorPattern has 6 patterns', () => {
      const patterns: BehaviorPattern[] = ['browsing', 'purchase', 'engagement', 'research', 'comparison', 'abandonment'];
      assert.equal(patterns.length, 6);
    });

    test('DemographicField has 6 fields', () => {
      const fields: DemographicField[] = ['age_range', 'gender', 'location', 'income_level', 'education', 'occupation'];
      assert.equal(fields.length, 6);
    });

    test('PurchaseIntent has 4 levels', () => {
      const levels: PurchaseIntent[] = ['high', 'medium', 'low', 'unknown'];
      assert.equal(levels.length, 4);
    });

    test('getAudienceSegments returns 6', () => { assert.equal(getAudienceSegments().length, 6); });
    test('getInterestCategories returns 15', () => { assert.equal(getInterestCategories().length, 15); });
    test('getBehaviorPatterns returns 6', () => { assert.equal(getBehaviorPatterns().length, 6); });
    test('getDemographicFields returns 6', () => { assert.equal(getDemographicFields().length, 6); });
  });

  describe('calculateOverlap', () => {
    test('returns 0-100', () => {
      const segA = { segment: 'primary' as AudienceSegment, name: 'A', size: 40, demographics: {} as any, topInterests: [{ category: 'lifestyle' as InterestCategory, specificInterests: [], affinityScore: 70 }], behaviors: [], purchaseIntent: 'high' as PurchaseIntent, purchaseIntentScore: 75, bestMessagingAngles: ['meta'], bestChannels: ['meta'], estimatedCpa: 10, estimatedCtr: 2 };
      const segB = { segment: 'secondary' as AudienceSegment, name: 'B', size: 30, demographics: {} as any, topInterests: [{ category: 'lifestyle' as InterestCategory, specificInterests: [], affinityScore: 65 }], behaviors: [], purchaseIntent: 'medium' as PurchaseIntent, purchaseIntentScore: 55, bestMessagingAngles: ['meta'], bestChannels: ['meta'], estimatedCpa: 15, estimatedCtr: 1.5 };
      const o = calculateOverlap(segA, segB);
      assert.ok(o >= 0 && o <= 100);
    });
  });

  describe('calculateAudienceFitScore', () => {
    test('returns 0-100', () => {
      const segments = [
        { segment: 'primary' as AudienceSegment, name: 'A', size: 50, demographics: {} as any, topInterests: [], behaviors: [], purchaseIntent: 'high' as PurchaseIntent, purchaseIntentScore: 80, bestMessagingAngles: [], bestChannels: [], estimatedCpa: 10, estimatedCtr: 2 },
      ];
      const s = calculateAudienceFitScore(segments);
      assert.ok(s >= 0 && s <= 100);
    });
    test('empty returns 0', () => {
      assert.equal(calculateAudienceFitScore([]), 0);
    });
  });

  describe('calculateLookalikePotential', () => {
    test('returns 0-100', () => {
      const segments = [
        { segment: 'primary' as AudienceSegment, name: 'A', size: 50, demographics: {} as any, topInterests: [], behaviors: [], purchaseIntent: 'high' as PurchaseIntent, purchaseIntentScore: 80, bestMessagingAngles: [], bestChannels: [], estimatedCpa: 10, estimatedCtr: 3 },
      ];
      const p = calculateLookalikePotential(segments);
      assert.ok(p >= 0 && p <= 100);
    });
  });

  describe('validateAudienceInsightsRequest', () => {
    test('empty description fails', () => {
      const r = validateAudienceInsightsRequest({ productDescription: '' });
      assert.ok(!r.valid);
    });
    test('valid passes', () => {
      const r = validateAudienceInsightsRequest({ productDescription: 'A great product' });
      assert.ok(r.valid);
    });
  });

  describe('AUDIENCE_INSIGHTS_COST', () => {
    test('cost is 7', () => { assert.equal(AUDIENCE_INSIGHTS_COST, 7); });
  });
});
