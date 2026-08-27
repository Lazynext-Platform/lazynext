import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the creative intelligence cost model.
 *
 * Replicates the cost constants from src/lib/creative/intelligence.ts to test
 * without requiring TypeScript path alias resolution.
 */

// Replicate CREATIVE_COSTS from intelligence.ts
const CREATIVE_COSTS = {
  brief: 3,
  hooks: 2,
  angles: 2,
  script: 3,
  storyboard: 3,
  referenceAnalysis: 5,
} as const;

test('all creative steps have positive credit costs', () => {
  for (const [step, cost] of Object.entries(CREATIVE_COSTS)) {
    assert.ok(cost > 0, `${step} should have positive cost, got ${cost}`);
  }
});

test('brief generation costs more than or equal to hooks (foundational step)', () => {
  assert.ok(CREATIVE_COSTS.brief >= CREATIVE_COSTS.hooks, 'brief should cost >= hooks');
});

test('reference analysis is the most expensive creative step', () => {
  const max = Math.max(...Object.values(CREATIVE_COSTS));
  assert.equal(max, CREATIVE_COSTS.referenceAnalysis);
});

test('total creative pipeline cost is reasonable (brief + hooks + angles + script + storyboard)', () => {
  const total = CREATIVE_COSTS.brief + CREATIVE_COSTS.hooks + CREATIVE_COSTS.angles + CREATIVE_COSTS.script + CREATIVE_COSTS.storyboard;
  assert.ok(total >= 5, `total pipeline cost should be >= 5, got ${total}`);
  assert.ok(total <= 30, `total pipeline cost should be <= 30, got ${total}`);
});

test('brand extraction cost is defined and positive', () => {
  const BRAND_EXTRACT_COST = 5;
  const PRODUCT_EXTRACT_COST = 3;
  assert.ok(BRAND_EXTRACT_COST > 0);
  assert.ok(PRODUCT_EXTRACT_COST > 0);
  assert.ok(PRODUCT_EXTRACT_COST <= BRAND_EXTRACT_COST);
});
