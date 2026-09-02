import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERFORMANCE_LOOP_CREDIT_COST,
  validatePerformanceLoopInput,
  generatePerformanceLoop,
  type PerformanceLoopInput,
  type CreativeLearning,
  type ImprovedBrief,
  type PerformanceLoopOutput,
} from '../src/lib/creative/performance-loop.ts';

function makeValidInput(overrides: Partial<PerformanceLoopInput> = {}): PerformanceLoopInput {
  return {
    productName: 'Acme Noise-Cancelling Headphones',
    audience: 'remote workers',
    platform: 'tiktok',
    ...overrides,
  };
}

describe('performance-loop', () => {
  describe('validation', () => {
    test('rejects missing productName', () => {
      const result = validatePerformanceLoopInput({ productName: '' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('product_name_required'));
    });

    test('rejects non-object input', () => {
      const result = validatePerformanceLoopInput(null as unknown as PerformanceLoopInput);
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('input_required'));
    });

    test('accepts a valid minimal input', () => {
      const result = validatePerformanceLoopInput(makeValidInput());
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('rejects invalid productUrl', () => {
      const result = validatePerformanceLoopInput(makeValidInput({ productUrl: 'not-a-url' }));
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('product_url_invalid'));
    });

    test('accepts a valid productUrl', () => {
      const result = validatePerformanceLoopInput(
        makeValidInput({ productUrl: 'https://acme.com/headphones' }),
      );
      assert.equal(result.valid, true);
    });

    test('rejects non-boolean dryRun', () => {
      const result = validatePerformanceLoopInput(
        makeValidInput({ dryRun: 'yes' as unknown as boolean }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('dry_run_invalid'));
    });

    test('accepts a boolean dryRun', () => {
      const result = validatePerformanceLoopInput(makeValidInput({ dryRun: true }));
      assert.equal(result.valid, true);
    });

    test('rejects overly long productName', () => {
      const result = validatePerformanceLoopInput(
        makeValidInput({ productName: 'x'.repeat(2001) }),
      );
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('product_name_too_long'));
    });
  });

  describe('credit cost', () => {
    test('PERFORMANCE_LOOP_CREDIT_COST is positive', () => {
      assert.ok(PERFORMANCE_LOOP_CREDIT_COST > 0);
    });

    test('PERFORMANCE_LOOP_CREDIT_COST is 5', () => {
      assert.equal(PERFORMANCE_LOOP_CREDIT_COST, 5);
    });
  });

  describe('generatePerformanceLoop (dry-run)', () => {
    // Force dry-run mode for deterministic local tests.
    const origBase = process.env.ATLASCLOUD_BASE;
    const origKey = process.env.ATLASCLOUD_API_KEY;

    test('returns deterministic placeholder when dryRun flag is set', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generatePerformanceLoop(makeValidInput({ dryRun: true }), 'user-1');
        assert.ok(out, 'expected output');
        assert.ok(Array.isArray(out.learnings));
        assert.ok(Array.isArray(out.improvedBriefs));
        assert.ok(out.summary);
        assert.ok(Array.isArray(out.topPerformingPatterns));
        assert.ok(Array.isArray(out.underperformingPatterns));
        assert.ok(Array.isArray(out.recommendedNextSteps));
        assert.ok(out.generationPrompt);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('dry-run output has empty learnings and at least one improved brief', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generatePerformanceLoop(makeValidInput({ dryRun: true }), 'user-1');
        assert.equal(out.learnings.length, 0);
        assert.ok(out.improvedBriefs.length >= 1);
        const brief = out.improvedBriefs[0];
        assert.ok(brief.improvedAngle);
        assert.ok(brief.adjustedScriptOutline);
        assert.ok(brief.adjustedCta);
        assert.ok(Array.isArray(brief.adjustedHooks));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('dry-run recommendedNextSteps are present', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generatePerformanceLoop(makeValidInput({ dryRun: true }), 'user-1');
        assert.ok(out.recommendedNextSteps.length > 0);
        for (const s of out.recommendedNextSteps) {
          assert.ok(typeof s === 'string' && s.length > 0);
        }
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('dry-run generationPrompt is a non-empty string', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        const out = await generatePerformanceLoop(makeValidInput({ dryRun: true }), 'user-1');
        assert.equal(typeof out.generationPrompt, 'string');
        assert.ok(out.generationPrompt.length > 0);
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });

    test('throws on invalid input', async () => {
      process.env.ATLASCLOUD_BASE = 'http://localhost:3099/api/v1';
      try {
        await assert.rejects(() => generatePerformanceLoop({ productName: '' }, 'user-1'));
      } finally {
        process.env.ATLASCLOUD_BASE = origBase;
        process.env.ATLASCLOUD_API_KEY = origKey;
      }
    });
  });

  describe('types', () => {
    test('CreativeLearning has required fields', () => {
      const learning: CreativeLearning = {
        dimension: 'hookType',
        insight: 'Question hooks outperform',
        confidence: 0.82,
        sampleSize: 42,
        recommendedAction: 'Lead with question hooks',
      };
      assert.equal(learning.dimension, 'hookType');
      assert.equal(learning.confidence, 0.82);
      assert.equal(learning.sampleSize, 42);
    });

    test('ImprovedBrief has required fields', () => {
      const brief: ImprovedBrief = {
        originalAngle: 'Generic benefit',
        improvedAngle: 'Benefit + proof',
        improvementReason: 'Adds social proof',
        expectedLift: '15% CTR',
        adjustedHooks: ['Why everyone is switching'],
        adjustedScriptOutline: 'Hook, proof, benefit, CTA',
        adjustedCta: 'Try Now',
      };
      assert.equal(brief.originalAngle, 'Generic benefit');
      assert.equal(brief.improvedAngle, 'Benefit + proof');
      assert.ok(brief.adjustedHooks.length > 0);
    });

    test('PerformanceLoopOutput has all required fields', () => {
      const out: PerformanceLoopOutput = {
        learnings: [],
        improvedBriefs: [],
        summary: 'No data yet',
        topPerformingPatterns: [],
        underperformingPatterns: [],
        recommendedNextSteps: [],
        generationPrompt: 'Generate an ad',
      };
      assert.ok(Array.isArray(out.learnings));
      assert.ok(Array.isArray(out.improvedBriefs));
      assert.equal(typeof out.summary, 'string');
      assert.equal(typeof out.generationPrompt, 'string');
    });
  });
});
