import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateJobId,
  determineWinner,
  calculateSignificance,
  summarizeJob,
  buildAutomationMetadata,
  parseAutomationMetadata,
  type AutomationJob,
  type AutomationVariant,
} from '../src/lib/creative/ab-automation.ts';

describe('ab-automation', () => {
  describe('generateJobId', () => {
    test('generates unique IDs', () => {
      const id1 = generateJobId();
      const id2 = generateJobId();
      assert.notEqual(id1, id2);
    });

    test('starts with "auto-"', () => {
      const id = generateJobId();
      assert.ok(id.startsWith('auto-'));
    });
  });

  describe('calculateSignificance', () => {
    test('returns 0 for identical conversion rates', () => {
      const sig = calculateSignificance(
        { impressions: 1000, conversions: 50 },
        { impressions: 1000, conversions: 50 },
      );
      assert.equal(sig, 0);
    });

    test('returns high significance for large difference', () => {
      const sig = calculateSignificance(
        { impressions: 10000, conversions: 500 },
        { impressions: 10000, conversions: 100 },
      );
      assert.ok(sig > 0.95, `expected > 0.95, got ${sig}`);
    });

    test('returns low significance for small difference with small sample', () => {
      const sig = calculateSignificance(
        { impressions: 100, conversions: 5 },
        { impressions: 100, conversions: 3 },
      );
      assert.ok(sig < 0.6, `expected < 0.6, got ${sig}`);
    });
  });

  describe('determineWinner', () => {
    const makeVariant = (label: string, imps: number, conv: number, roas = 1): AutomationVariant => ({
      creationId: `id-${label}`,
      label,
      impressions: imps,
      clicks: conv * 2,
      conversions: conv,
      spend: 100,
      revenue: 100 * roas,
      ctr: imps > 0 ? (conv * 2 / imps) * 100 : 0,
      cvr: conv * 2 > 0 ? (conv / (conv * 2)) * 100 : 0,
      roas,
    });

    test('returns null when fewer than 2 variants', () => {
      assert.equal(determineWinner([makeVariant('A', 2000, 100)], 'roas'), null);
    });

    test('returns null when impressions below minimum', () => {
      const variants = [makeVariant('A', 500, 50), makeVariant('B', 500, 30)];
      assert.equal(determineWinner(variants, 'roas'), null);
    });

    test('returns winner when significance is high enough', () => {
      const variants = [
        makeVariant('A', 10000, 500, 3),
        makeVariant('B', 10000, 100, 1),
      ];
      const winner = determineWinner(variants, 'roas');
      assert.ok(winner !== null);
      assert.equal(winner, 'id-A');
    });

    test('returns null when significance is too low', () => {
      const variants = [
        makeVariant('A', 1500, 75, 1.5),
        makeVariant('B', 1500, 73, 1.4),
      ];
      const winner = determineWinner(variants, 'roas');
      assert.equal(winner, null);
    });
  });

  describe('summarizeJob', () => {
    test('summarizes completed job', () => {
      const job: AutomationJob = {
        jobId: 'test-1',
        status: 'completed',
        testName: 'Test',
        platform: 'meta',
        primaryMetric: 'roas',
        variants: [
          { creationId: 'a', label: 'A', impressions: 5000, clicks: 200, conversions: 50, spend: 100, revenue: 300, ctr: 4, cvr: 25, roas: 3 },
          { creationId: 'b', label: 'B', impressions: 5000, clicks: 100, conversions: 10, spend: 100, revenue: 50, ctr: 2, cvr: 10, roas: 0.5 },
        ],
        winner: 'a',
        confidenceLevel: 0.95,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      const summary = summarizeJob(job);
      assert.ok(summary.includes('Winner'));
      assert.ok(summary.includes('Variant A'));
    });

    test('summarizes monitoring job', () => {
      const job: AutomationJob = {
        jobId: 'test-2',
        status: 'monitoring',
        testName: 'Test',
        platform: 'meta',
        primaryMetric: 'roas',
        variants: [],
        confidenceLevel: 0.9,
        startedAt: new Date().toISOString(),
      };
      const summary = summarizeJob(job);
      assert.ok(summary.includes('Testing'));
    });
  });

  describe('metadata serialization', () => {
    test('build and parse round-trips', () => {
      const job = { jobId: 'test-123', status: 'monitoring' as const };
      const meta = buildAutomationMetadata(job);
      const parsed = parseAutomationMetadata(meta);
      assert.ok(parsed);
      assert.equal(parsed?.jobId, 'test-123');
    });

    test('returns null for non-automation metadata', () => {
      assert.equal(parseAutomationMetadata({ impressions: 100 }), null);
      assert.equal(parseAutomationMetadata(null), null);
      assert.equal(parseAutomationMetadata(undefined), null);
    });
  });
});
