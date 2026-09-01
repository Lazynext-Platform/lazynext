import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Intelligence-layer smoke tests for creative libraries.
 *
 * intelligence.ts (src/lib/creative/intelligence.ts) is the shared creative
 * engine whose functions all invoke the Atlas LLM directly with no dry-run
 * fallback. Because the Node test runner has no Atlas API key and no Cloudflare
 * context, the generation functions cannot be invoked here without throwing.
 * These tests therefore assert that every documented public export exists and
 * is callable — a smoke-test sweep that guards against accidental removal or
 * rename of the engine's public surface.
 *
 * director.ts and learning.ts are already covered by test/creative-director.test.ts
 * and test/creative-learning.test.ts respectively; their main exports are also
 * smoke-tested here for completeness.
 */

// ── Creative Intelligence engine ──
import {
  generateBrief,
  generateHooks,
  generateAngles,
  generateScript,
  generateStoryboard,
  scoreCreative,
  generateVariants,
  refineCreative,
  remixFromReference,
  analyzeReferenceCreative,
  analyzeReferenceDeep,
  CREATIVE_COSTS,
} from '@/lib/creative/intelligence';

test('Creative Intelligence: CREATIVE_COSTS is a populated object', () => {
  assert.ok(CREATIVE_COSTS && typeof CREATIVE_COSTS === 'object');
  assert.ok(Object.keys(CREATIVE_COSTS).length > 0);
});

test('Creative Intelligence: generateBrief is a function', () => {
  assert.equal(typeof generateBrief, 'function');
});

test('Creative Intelligence: generateHooks is a function', () => {
  assert.equal(typeof generateHooks, 'function');
});

test('Creative Intelligence: generateAngles is a function', () => {
  assert.equal(typeof generateAngles, 'function');
});

test('Creative Intelligence: generateScript is a function', () => {
  assert.equal(typeof generateScript, 'function');
});

test('Creative Intelligence: generateStoryboard is a function', () => {
  assert.equal(typeof generateStoryboard, 'function');
});

test('Creative Intelligence: scoreCreative is a function', () => {
  assert.equal(typeof scoreCreative, 'function');
});

test('Creative Intelligence: generateVariants is a function', () => {
  assert.equal(typeof generateVariants, 'function');
});

test('Creative Intelligence: refineCreative is a function', () => {
  assert.equal(typeof refineCreative, 'function');
});

test('Creative Intelligence: remixFromReference is a function', () => {
  assert.equal(typeof remixFromReference, 'function');
});

test('Creative Intelligence: analyzeReferenceCreative is a function', () => {
  assert.equal(typeof analyzeReferenceCreative, 'function');
});

test('Creative Intelligence: analyzeReferenceDeep is a function', () => {
  assert.equal(typeof analyzeReferenceDeep, 'function');
});

// ── Creative Director (full pipeline behavior covered by creative-director.test.ts) ──
import { runCreativeDirector } from '@/lib/creative/director';

test('Creative Director: runCreativeDirector is a function', () => {
  assert.equal(typeof runCreativeDirector, 'function');
});

// ── Performance Learning (aggregation logic covered by creative-learning.test.ts) ──
import { getPerformanceSummary, getLearningsContext } from '@/lib/creative/learning';

test('Performance Learning: getPerformanceSummary is a function', () => {
  assert.equal(typeof getPerformanceSummary, 'function');
});

test('Performance Learning: getLearningsContext is a function', () => {
  assert.equal(typeof getLearningsContext, 'function');
});
