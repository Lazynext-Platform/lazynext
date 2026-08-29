import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_CONCEPTS_COST,
  getEmotionalTriggers,
  getSourceTypes,
  calculateDiversityScore,
  calculateConceptScore,
  recommendConcept,
  generateCrossConceptInsights,
  validateBrandConceptsRequest,
  type EmotionalTrigger,
  type SourceType,
  type AdConcept,
  type BrandExtraction,
} from '../src/lib/creative/brand-concepts.ts';

function makeConcept(overrides: Partial<AdConcept> = {}): AdConcept {
  return {
    id: overrides.id || 'concept-1',
    name: overrides.name || 'Test Concept',
    angle: overrides.angle || 'A unique angle for testing',
    emotionalTrigger: overrides.emotionalTrigger || 'curiosity',
    hook: overrides.hook || 'Did you know this surprising fact?',
    script: overrides.script || 'This is a test script for the ad concept.',
    storyboard: overrides.storyboard || [
      { frameNumber: 1, timestamp: '0:00', visual: 'Opening shot', audio: 'Music starts', text: '' },
      { frameNumber: 2, timestamp: '0:03', visual: 'Product reveal', audio: 'Voiceover', text: 'Buy now' },
    ],
    estimatedDuration: overrides.estimatedDuration || '15s',
    targetEmotion: overrides.targetEmotion || 'intrigued',
    cta: overrides.cta || 'Shop Now',
    platformFit: overrides.platformFit || { meta: 80, tiktok: 70, youtube: 60 },
  };
}

function makeBrand(overrides: Partial<BrandExtraction> = {}): BrandExtraction {
  return {
    brandName: overrides.brandName || 'TestBrand',
    category: overrides.category || 'Electronics',
    valueProps: overrides.valueProps || ['Quality', 'Affordability'],
    targetAudience: overrides.targetAudience || 'Young professionals',
    tone: overrides.tone || 'Professional',
    keyDifferentiators: overrides.keyDifferentiators || ['Best in class'],
  };
}

describe('brand-concepts', () => {
  describe('types', () => {
    test('EmotionalTrigger has 10 types', () => {
      const triggers: EmotionalTrigger[] = ['fear', 'aspiration', 'humor', 'urgency', 'curiosity', 'social_proof', 'transformation', 'comparison', 'nostalgia', 'empowerment'];
      assert.equal(triggers.length, 10);
    });

    test('SourceType has 2 types', () => {
      const types: SourceType[] = ['url', 'description'];
      assert.equal(types.length, 2);
    });
  });

  describe('getEmotionalTriggers', () => {
    test('returns 10 triggers', () => {
      const triggers = getEmotionalTriggers();
      assert.equal(triggers.length, 10);
    });

    test('each trigger has name and description', () => {
      const triggers = getEmotionalTriggers();
      for (const t of triggers) {
        assert.ok(t.trigger);
        assert.ok(t.name);
        assert.ok(t.description);
      }
    });
  });

  describe('getSourceTypes', () => {
    test('returns 2 source types', () => {
      const types = getSourceTypes();
      assert.equal(types.length, 2);
      assert.equal(types[0].type, 'url');
      assert.equal(types[1].type, 'description');
    });
  });

  describe('calculateDiversityScore', () => {
    test('returns 0 for single concept', () => {
      const score = calculateDiversityScore([makeConcept()]);
      assert.equal(score, 0);
    });

    test('returns 0 for empty array', () => {
      const score = calculateDiversityScore([]);
      assert.equal(score, 0);
    });

    test('returns high score for diverse concepts', () => {
      const concepts = [
        makeConcept({ id: '1', emotionalTrigger: 'fear', angle: 'Loss aversion strategy', hook: 'You are losing money every day' }),
        makeConcept({ id: '2', emotionalTrigger: 'humor', angle: 'Comedy sketch approach', hook: 'This funny thing happened' }),
        makeConcept({ id: '3', emotionalTrigger: 'aspiration', angle: 'Dream lifestyle vision', hook: 'Imagine your future self' }),
      ];
      const score = calculateDiversityScore(concepts);
      assert.ok(score > 50, `Expected diversity > 50, got ${score}`);
    });

    test('returns lower score for similar concepts', () => {
      const concepts = [
        makeConcept({ id: '1', emotionalTrigger: 'fear', angle: 'Fear based approach for testing', hook: 'Fear based hook for testing' }),
        makeConcept({ id: '2', emotionalTrigger: 'fear', angle: 'Fear based approach for testing', hook: 'Fear based hook for testing' }),
      ];
      const score = calculateDiversityScore(concepts);
      assert.ok(score < 50, `Expected diversity < 50, got ${score}`);
    });

    test('score is bounded 0-100', () => {
      const concepts = [
        makeConcept({ id: '1', emotionalTrigger: 'fear', angle: 'a', hook: 'b' }),
        makeConcept({ id: '2', emotionalTrigger: 'humor', angle: 'c', hook: 'd' }),
      ];
      const score = calculateDiversityScore(concepts);
      assert.ok(score >= 0 && score <= 100);
    });
  });

  describe('calculateConceptScore', () => {
    test('returns score between 0 and 100', () => {
      const score = calculateConceptScore(makeConcept());
      assert.ok(score >= 0 && score <= 100);
    });

    test('higher platform fit gives higher score', () => {
      const lowFit = makeConcept({ platformFit: { meta: 30 } });
      const highFit = makeConcept({ platformFit: { meta: 90 } });
      assert.ok(calculateConceptScore(highFit, 'meta') > calculateConceptScore(lowFit, 'meta'));
    });
  });

  describe('recommendConcept', () => {
    test('returns empty for no concepts', () => {
      const result = recommendConcept([]);
      assert.equal(result.conceptId, '');
    });

    test('returns the only concept for single concept', () => {
      const result = recommendConcept([makeConcept({ id: 'only' })]);
      assert.equal(result.conceptId, 'only');
    });

    test('returns highest scoring concept', () => {
      const concepts = [
        makeConcept({ id: 'low', platformFit: { meta: 30 }, storyboard: [{ frameNumber: 1, timestamp: '0:00', visual: 'a', audio: 'b', text: '' }] }),
        makeConcept({ id: 'high', platformFit: { meta: 90 }, storyboard: [
          { frameNumber: 1, timestamp: '0:00', visual: 'a', audio: 'b', text: '' },
          { frameNumber: 2, timestamp: '0:03', visual: 'c', audio: 'd', text: '' },
          { frameNumber: 3, timestamp: '0:06', visual: 'e', audio: 'f', text: '' },
        ] }),
      ];
      const result = recommendConcept(concepts, 'meta');
      assert.equal(result.conceptId, 'high');
    });

    test('includes a reason string', () => {
      const result = recommendConcept([makeConcept({ id: 'test' })]);
      assert.ok(result.reason.length > 0);
    });
  });

  describe('generateCrossConceptInsights', () => {
    test('returns insights for multiple concepts', () => {
      const concepts = [
        makeConcept({ id: '1', emotionalTrigger: 'fear', angle: 'Loss aversion strategy', cta: 'Buy Now' }),
        makeConcept({ id: '2', emotionalTrigger: 'humor', angle: 'Comedy approach method', cta: 'Learn More' }),
      ];
      const insights = generateCrossConceptInsights(concepts, makeBrand());
      assert.ok(insights.length > 0);
    });

    test('includes trigger distribution insight', () => {
      const concepts = [
        makeConcept({ id: '1', emotionalTrigger: 'fear' }),
        makeConcept({ id: '2', emotionalTrigger: 'humor' }),
      ];
      const insights = generateCrossConceptInsights(concepts, makeBrand());
      const triggerInsight = insights.find((i) => i.includes('Emotional trigger distribution'));
      assert.ok(triggerInsight);
    });

    test('includes CTA diversity insight', () => {
      const concepts = [
        makeConcept({ id: '1', cta: 'Buy Now' }),
        makeConcept({ id: '2', cta: 'Learn More' }),
      ];
      const insights = generateCrossConceptInsights(concepts, makeBrand());
      const ctaInsight = insights.find((i) => i.includes('CTA'));
      assert.ok(ctaInsight);
    });
  });

  describe('validateBrandConceptsRequest', () => {
    test('validates valid request', () => {
      const result = validateBrandConceptsRequest({ sourceContent: 'A product description', sourceType: 'description' });
      assert.equal(result.valid, true);
    });

    test('rejects empty sourceContent', () => {
      const result = validateBrandConceptsRequest({ sourceContent: '', sourceType: 'description' });
      assert.equal(result.valid, false);
    });

    test('rejects invalid sourceType', () => {
      const result = validateBrandConceptsRequest({ sourceContent: 'test', sourceType: 'invalid' });
      assert.equal(result.valid, false);
    });

    test('rejects conceptCount out of range', () => {
      const result = validateBrandConceptsRequest({ sourceContent: 'test', sourceType: 'description', conceptCount: 10 });
      assert.equal(result.valid, false);
    });
  });

  describe('BRAND_CONCEPTS_COST', () => {
    test('cost is 10 credits', () => {
      assert.equal(BRAND_CONCEPTS_COST, 10);
    });
  });
});
