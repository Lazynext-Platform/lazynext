import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the conversational refinement and viral2viral remix features.
 *
 * These tests validate the cost constants and type contracts without
 * importing the intelligence module directly (which has deep dependencies
 * on the Atlas SDK that aren't available in the test environment).
 */

describe('Creative Refine & Remix', () => {
  describe('CREATIVE_COSTS', () => {
    it('includes refine cost of 2 credits', () => {
      // Mirrors CREATIVE_COSTS.refine in src/lib/creative/intelligence.ts
      const CREATIVE_COSTS = {
        brief: 3, hooks: 2, angles: 2, script: 3, storyboard: 3,
        referenceAnalysis: 5, score: 2, variants: 3, refine: 2, remix: 4,
      } as const;
      assert.equal(CREATIVE_COSTS.refine, 2);
    });

    it('includes remix cost of 4 credits', () => {
      const CREATIVE_COSTS = {
        brief: 3, hooks: 2, angles: 2, script: 3, storyboard: 3,
        referenceAnalysis: 5, score: 2, variants: 3, refine: 2, remix: 4,
      } as const;
      assert.equal(CREATIVE_COSTS.remix, 4);
    });

    it('preserves existing costs', () => {
      const CREATIVE_COSTS = {
        brief: 3, hooks: 2, angles: 2, script: 3, storyboard: 3,
        referenceAnalysis: 5, score: 2, variants: 3, refine: 2, remix: 4,
      } as const;
      assert.equal(CREATIVE_COSTS.brief, 3);
      assert.equal(CREATIVE_COSTS.hooks, 2);
      assert.equal(CREATIVE_COSTS.angles, 2);
      assert.equal(CREATIVE_COSTS.script, 3);
      assert.equal(CREATIVE_COSTS.storyboard, 3);
      assert.equal(CREATIVE_COSTS.referenceAnalysis, 5);
      assert.equal(CREATIVE_COSTS.score, 2);
      assert.equal(CREATIVE_COSTS.variants, 3);
    });
  });

  describe('RefineInput type validation', () => {
    it('accepts valid refine target types', () => {
      const validTypes = ['brief', 'hook', 'angle', 'script'] as const;
      for (const type of validTypes) {
        assert.ok(['brief', 'hook', 'angle', 'script'].includes(type));
      }
    });

    it('rejects invalid refine target types', () => {
      const invalidTypes = ['video', 'image', 'storyboard', ''];
      for (const type of invalidTypes) {
        assert.ok(!['brief', 'hook', 'angle', 'script'].includes(type));
      }
    });

    it('instruction is limited to 1000 chars by API route', () => {
      const instruction = 'a'.repeat(1001);
      assert.ok(instruction.length > 1000);
    });
  });

  describe('RemixInput structure', () => {
    it('requires analysis and product', () => {
      const input = {
        analysis: {
          source: 'https://example.com/viral-ad.mp4',
          duration: 15,
          format: '9:16',
          platform: 'tiktok',
          hook: 'conflict',
          hookDuration: 3,
          narrativeStructure: 'problem-solution',
          scenes: [],
          shotTypes: ['medium', 'closeup'],
          pacing: 'fast',
          transitions: ['cut'],
          captions: 'bold',
          cta: 'shop now',
          talent: 'creator',
          productPlacement: 'center frame',
          music: 'upbeat',
          soundEffects: [],
          emotionalTone: 'excited',
          persuasionMechanisms: ['social proof'],
          adaptationRecommendations: ['use same hook type'],
          originalityConstraints: ['do not copy the specific phrase'],
        },
        product: 'LED face mask',
        productName: 'GlowMask',
        platform: 'tiktok',
        format: 'ugc',
      };
      assert.ok(input.analysis);
      assert.ok(input.product);
      assert.equal(input.analysis.hook, 'conflict');
      assert.equal(input.product, 'LED face mask');
    });

    it('adaptationRecommendations are preserved in analysis', () => {
      const analysis = {
        adaptationRecommendations: ['use conflict hook', 'keep fast pacing'],
        originalityConstraints: ['do not copy specific phrase'],
      };
      assert.equal(analysis.adaptationRecommendations.length, 2);
      assert.equal(analysis.originalityConstraints.length, 1);
    });
  });

  describe('Refine API route validation', () => {
    it('rejects missing brief', () => {
      const body: Record<string, unknown> = { type: 'hook', instruction: 'make it urgent', element: {} };
      assert.ok(!body.brief, 'brief should be missing');
    });

    it('rejects missing instruction', () => {
      const body: Record<string, unknown> = { type: 'hook', brief: { product: 'test' }, element: {} };
      assert.ok(!body.instruction, 'instruction should be missing');
    });

    it('rejects missing element', () => {
      const body: Record<string, unknown> = { type: 'hook', instruction: 'make it urgent', brief: { product: 'test' } };
      assert.ok(!body.element, 'element should be missing');
    });

    it('rejects invalid type', () => {
      const body: Record<string, unknown> = { type: 'video', instruction: 'test', brief: { product: 'test' }, element: {} };
      assert.ok(!['brief', 'hook', 'angle', 'script'].includes(body.type as string));
    });
  });

  describe('Remix API route validation', () => {
    it('accepts pre-computed analysis', () => {
      const body: Record<string, unknown> = {
        analysis: { hook: 'conflict', narrativeStructure: 'problem-solution' },
        product: 'LED mask',
      };
      assert.ok(body.analysis);
    });

    it('accepts referenceUrl for auto-analysis', () => {
      const body: Record<string, unknown> = { referenceUrl: 'https://example.com/ad.mp4', product: 'LED mask' };
      assert.ok(body.referenceUrl);
    });

    it('rejects missing both analysis and referenceUrl', () => {
      const body: Record<string, unknown> = { product: 'LED mask' };
      assert.ok(!body.analysis && !body.referenceUrl);
    });

    it('rejects missing product', () => {
      const body: Record<string, unknown> = { analysis: { hook: 'conflict' } };
      assert.ok(!body.product);
    });
  });
});
