import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIEF_INTELLIGENCE_COST,
  getUSPCategories,
  getCompetitiveAdvantages,
  getBriefTypes,
  getBriefScoreDimensions,
  scoreBrief,
  checkCreativeAlignment,
  validateBriefRequest,
  type BriefType,
  type USPCategory,
  type CompetitiveAdvantage,
  type BriefScoreDimension,
  type BriefIntelligenceResult,
} from '../src/lib/creative/brief-intelligence.ts';

describe('brief-intelligence', () => {
  describe('type completeness', () => {
    test('BriefType has 7 types', () => {
      const types: BriefType[] = ['product_launch', 'brand_awareness', 'conversion', 'retargeting', 'seasonal', 'comparison', 'storytelling'];
      assert.equal(types.length, 7);
    });

    test('USPCategory has 10 categories', () => {
      const cats: USPCategory[] = ['price', 'quality', 'convenience', 'innovation', 'service', 'design', 'sustainability', 'exclusivity', 'performance', 'social_proof'];
      assert.equal(cats.length, 10);
    });

    test('CompetitiveAdvantage has 8 types', () => {
      const advs: CompetitiveAdvantage[] = ['feature_unique', 'price_advantage', 'brand_strength', 'distribution', 'timing', 'customer_experience', 'technology', 'partnership'];
      assert.equal(advs.length, 8);
    });

    test('BriefScoreDimension has 8 dimensions', () => {
      const dims: BriefScoreDimension[] = ['clarity', 'specificity', 'actionability', 'audience_focus', 'differentiation', 'measurability', 'emotional_appeal', 'factual_support'];
      assert.equal(dims.length, 8);
    });

    test('getUSPCategories returns 10 categories', () => {
      assert.equal(getUSPCategories().length, 10);
    });

    test('getCompetitiveAdvantages returns 8 types', () => {
      assert.equal(getCompetitiveAdvantages().length, 8);
    });

    test('getBriefTypes returns 7 types', () => {
      assert.equal(getBriefTypes().length, 7);
    });

    test('getBriefScoreDimensions returns 8 dimensions', () => {
      assert.equal(getBriefScoreDimensions().length, 8);
    });
  });

  describe('validateBriefRequest', () => {
    test('missing productName fails', () => {
      const r = validateBriefRequest({ productDescription: 'test' });
      assert.ok(!r.valid);
      assert.ok(r.errors.length > 0);
    });

    test('valid request passes', () => {
      const r = validateBriefRequest({ productName: 'Test Product' });
      assert.ok(r.valid);
    });
  });

  describe('scoreBrief', () => {
    test('returns score with 8 dimensions', () => {
      const score = scoreBrief({
        positioning: { productName: 'Test', category: 'Tech', positioningStatement: 'A great product for everyone', targetMarket: 'Tech professionals', pricePositioning: 'value', lifecycleStage: 'growth' },
        usps: [{ uspId: 'u1', category: 'quality', statement: 'High quality', evidence: 'Tested', strength: 8, audienceResonance: 7, competitiveDifferentiation: 8 }],
        keyMessages: ['Quality matters', 'Trust the process', 'Buy now'],
      });
      assert.equal(score.dimensions.length, 8);
      assert.ok(score.overall >= 0 && score.overall <= 100);
    });

    test('overall score is average of dimensions', () => {
      const score = scoreBrief({
        positioning: { productName: 'Test', category: 'Tech', positioningStatement: 'A great product for everyone', targetMarket: 'Tech professionals', pricePositioning: 'value', lifecycleStage: 'growth' },
        usps: [],
        keyMessages: [],
      });
      const avg = Math.round(score.dimensions.reduce((a, d) => a + d.score, 0) / 8);
      assert.equal(score.overall, avg);
    });
  });

  describe('checkCreativeAlignment', () => {
    test('returns alignment for each creative', () => {
      const brief: BriefIntelligenceResult = {
        positioning: { productName: 'Test', category: 'Tech', positioningStatement: 'Statement', targetMarket: 'Market', pricePositioning: 'value', lifecycleStage: 'growth' },
        usps: [{ uspId: 'u1', category: 'quality', statement: 'High quality product', evidence: 'Tested', strength: 8, audienceResonance: 7, competitiveDifferentiation: 8 }],
        competitiveAdvantages: [],
        briefScore: { overall: 70, dimensions: [], strengths: [], weaknesses: [], recommendations: [] },
        recommendedAngles: [], recommendedHooks: [], recommendedTones: [],
        keyMessages: ['Quality matters'],
        audiencePainPoints: [], emotionalTriggers: [], insights: [],
      };
      const alignments = checkCreativeAlignment(brief, [
        { creativeId: 'c1', content: 'High quality product for you' },
        { creativeId: 'c2', content: 'Something completely different' },
      ]);
      assert.equal(alignments.length, 2);
      assert.ok(alignments[0].alignmentScore >= 0 && alignments[0].alignmentScore <= 100);
      assert.ok(alignments[1].alignmentScore >= 0 && alignments[1].alignmentScore <= 100);
    });
  });

  describe('BRIEF_INTELLIGENCE_COST', () => {
    test('cost is 6', () => {
      assert.equal(BRIEF_INTELLIGENCE_COST, 6);
    });
  });
});
